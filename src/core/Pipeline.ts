import type { Integer } from '@skypilot/common-types';
import { includeIf } from '@skypilot/sugarbowl';
import { serializeError } from 'serialize-error';

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

export interface CorePipelineRunOptions {
  slice?: Slice;
  verbose?: boolean;
}

export type PipelineRunOptions = CorePipelineRunOptions & (ExcludeSteps | IncludeSteps);

export interface PipelineOptions {
  logDir?: string;
  logFileName?: string;
}

type Slice = [Integer] | [Integer, Integer];

export class Pipeline<I extends Dict, A extends Dict> {
  readonly logger: Logger;

  private _context: Interim<I, A> = {};
  private steps: Step<I, A>[] = [];

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
  // TODO: Enforce unique names
  addStep(stepParams: StepParams<I, A>): this {
    this.steps.push(new Step({ ...stepParams, index: this.steps.length, pipeline: this }));
    return this;
  }

  filterSteps(options: PipelineRunOptions): Step<I, A>[] {
    const { excludeSteps, includeSteps, slice = [0] } = options;

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
    const { verbose = false, ...filterOptions } = options;

    this.logger.verbose = verbose;
    this.addIntroToLog(options);
    this.logger.add('Started run', { prependTimestamp: true, sectionBreakAfter: true });

    const filteredSteps = this.filterSteps(filterOptions);
    for (const step of filteredSteps) {
      this.logger.add(
        `Started step ${step.index + 1}: ${step.name}`,
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

  private addIntroToLog(pipelineRunOptions: PipelineRunOptions): void {
    const filteredSteps = this.filterSteps(pipelineRunOptions);
    const annotateInactive = filteredSteps.length !== this.steps.length;

    if (this.steps.length) {
      this.logger.add([
        'Steps in the pipeline', ...includeIf(annotateInactive, '(● = active, ○ = inactive)'),
      ].join(' ') + ':');
      this.logger.add(this.steps.map(
        step => [
          ...includeIf(annotateInactive, filteredSteps.some(s => s.index === step.index) ? '●' : '○'),
          `${(step.index + 1).toString()}.`,
          step.name,
        ].join(' ')
      ).join('\n'), { sectionBreakAfter: true });
    }
    this.logger.add(pipelineRunOptions, { prefix: 'pipelineRunOptions', sectionBreakAfter: true });
  }
}
