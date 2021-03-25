import type { Integer } from '@skypilot/common-types';
import { includeIf } from '@skypilot/sugarbowl';
import { serializeError } from 'serialize-error';
import type { SetOptional } from 'type-fest';

import type { Dict, Fragment, Interim } from 'src/lib/types';
import { Logger } from 'src/logger/Logger';
import { Step } from './Step';
import type { StepParams } from './Step';

export interface ExcludeSteps {
  excludeSteps?: string[]; includeSteps?: undefined;
}

export interface IncludeSteps {
  excludeSteps?: undefined; includeSteps?: string[];
}

interface SliceSteps {
  slice?: [Integer] | [Integer, Integer];
}

export interface CorePipelineRunOptions {
  verbose?: boolean;
}

export type PipelineRunOptions = CorePipelineRunOptions & StepFilter;

export interface PipelineOptions {
  logDir?: string;
  logFileName?: string;
}

export type StepFilter = (ExcludeSteps | IncludeSteps) & SliceSteps;

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export class Pipeline<I extends Dict, A extends Dict> {
  readonly logger: Logger;
  steps: Step<I, A>[] = [];

  private _context: Interim<I, A> = {};

  constructor(initialContext: I, options?: PipelineOptions);
  constructor(initialContext?: undefined);
  constructor(initialContext = {}, options: PipelineOptions = {}) {
    const { logDir, logFileName } = options;

    this.logger = new Logger({ logDir, logFileName });
    this.updateContext(initialContext);
  }

  get context(): Interim<I, A> {
    return this._context;
  }

  // TODO: Allow steps to be grouped into stages
  addStep(step: Step<I, A>): this;
  addStep(stepParams: SetOptional<StepParams<I, A>, 'name'>): this;
  addStep(stepParams: Step<I, A> | SetOptional<StepParams<I, A>, 'name'>): this {
    const stepInstance = stepParams instanceof Step
      ? ((): Step<I, A> => {
        /* TODO: Possibly allow `Step` instances to be created independently. For now, this safeguard is in
         * place to help TypeScript infer typings. */
        if (stepParams.pipeline !== this) {
          throw new Error('The step was created in a different pipeline');
        }
        return stepParams;
      })()
      : ((): Step<I, A> => {
        const { name = `step-${this.steps.length}` } = stepParams;
        if (this.steps.find(step => step.name === name)) {
          throw new Error(`Step name '${name}' is already in use`);
        }
        return this.createStep({ ...stepParams, name });
      })();

    if (this.steps.find(({ name }) => name === stepInstance.name)) {
      throw new Error(`Step name '${name}' is already in use`);
    }

    this.steps.push(stepInstance);
    return this;
  }

  // Create & return a step without adding it to the pipeline
  createStep(stepParams: StepParams<I, A>): Step<I, A> {
    return new Step({ ...stepParams, pipeline: this });
  }

  filterSteps(stepFilter: StepFilter = {}): Step<I, A>[] {
    const { excludeSteps, includeSteps, slice = [0] } = stepFilter;

    const [sliceStart, sliceEnd] = slice;
    const sliceParams = [sliceStart, ...includeIf(sliceEnd)];

    const filter = (() => {
      if (excludeSteps) {
        return ({ name }: { name: string }) => !excludeSteps.includes(name);
      } else if (includeSteps) {
        return ({ name }: { name: string }) => includeSteps.includes(name);
      } else {
        return () => true;
      }
    })();

    return this.steps.slice(...sliceParams).filter(filter);
  }

  async run(options: PipelineRunOptions = {}): Promise<Interim<I, A>> {
    const { verbose = false, ...stepFilter } = options;

    this.logger.verbose = verbose;
    this.addIntroToLog(options);

    {
      const validationResult = this.validate(stepFilter);
      if (validationResult.errors.length > 0) {
        this.logger.add(validationResult, { prefix: 'Validation result' });
        this.logger.add('Pipeline run aborted', { prependTimestamp: true });
        throw new Error(`Pipeline run aborted: ${validationResult.errors.join(', ')}`);
      }
    }

    this.logger.add('Started run', { prependTimestamp: true, sectionBreakAfter: true });

    const filteredSteps = this.filterSteps(stepFilter);
    for (const step of filteredSteps) {
      this.logger.add(
        `Started step ${filteredSteps.indexOf(step) + 1}: ${step.name}`,
        { prependTimestamp: true, sectionBreakBefore: true, sectionBreakAfter: true }
      );
      await step.run(this.context, { logger: this.logger })
        .catch(error => {
          // Save the error to the log and write the log, so that existing log entries aren't lost
          // const { stack, ...errorRest } = error;
          const serializedError = serializeError(error);
          const { stack, ...otherProps } = serializedError;
          this.logger.add({ ...otherProps, stack: stack.split('\n') }, { prefix: 'Error' });
          this.logger.write();

          // TODO: Build in optional error handling with "skip" and "stop" options
          throw error;
        });
    }
    this.logger.write();
    return this._context;
  }

  updateContext<C extends Fragment<I, A>>(partialContext: C): Interim<I, A> {
    const mergedContext = {
      ...this._context,
      ...partialContext,
    };
    this._context = mergedContext;
    return mergedContext;
  }

  validate(stepFilter: StepFilter = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const filteredSteps = this.filterSteps(stepFilter);

    const dependents = filteredSteps.filter(( { dependsOn }) => dependsOn.length);
    for (const dependent of dependents) {
      const indexOfDependent = filteredSteps.indexOf(dependent);
      for (const dependencyName of dependent.dependsOn) {
        const indexOfDependency = filteredSteps.findIndex(step => step.name === dependencyName);
        if (indexOfDependency < 0) {
          errors.push(`Step '${dependencyName}' required by '${dependent.name}' is not in the pipeline`);
        } else if (indexOfDependency > indexOfDependent) {
          errors.push(`Step '${dependent.name}' occurs before its dependency '${dependencyName}'`);
        }
      }
    }
    return { errors, warnings };
  }

  private addIntroToLog(pipelineRunOptions: PipelineRunOptions): void {
    const filteredSteps = this.filterSteps(pipelineRunOptions);
    const annotateInactive = filteredSteps.length !== this.steps.length;

    if (this.steps.length) {
      this.logger.add([
        'Steps in the pipeline', ...includeIf(annotateInactive, '(● = active, ○ = inactive)'),
      ].join(' ') + ':');
      this.logger.add(this.steps.map(
        (step, index) => [
          ...includeIf(annotateInactive, filteredSteps.includes(step) ? '●' : '○'),
          `${(index + 1)}.`,
          step.name,
        ].join(' ')
      ).join('\n'), { sectionBreakAfter: true });
    }
    this.logger.add(pipelineRunOptions, { prefix: 'pipelineRunOptions', sectionBreakAfter: true });
  }
}
