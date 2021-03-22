import type { Integer } from '@skypilot/common-types';
import { includeIf, inflectQuantity } from '@skypilot/sugarbowl';

import type { Dict } from 'src/lib/types';
import { Logger } from 'src/logger/Logger';
import { Step } from './Step';
import type { StepParams } from './Step';

interface ExcludeSteps {
  excludeSteps?: string[]; includeSteps?: undefined;
}

interface IncludeSteps {
  excludeSteps?: undefined; includeSteps?: string[];
}

interface CorePipelineRunOptions {
  slice?: Slice;
  verbose?: boolean;
}

export type PipelineRunOptions = CorePipelineRunOptions & (ExcludeSteps | IncludeSteps);

export interface PipelineOptions {
  logDir?: string;
  logFileName?: string;
}

type Slice = [Integer] | [Integer, Integer];

export class Pipeline<Context extends Dict> {
  readonly logger: Logger;

  private _context: Partial<Context> = {};
  private steps: Step<Context>[] = [];

  constructor(context: Partial<Context> = {}, options: PipelineOptions = {}) {
    const { logDir, logFileName } = options;

    this.logger = new Logger({ logDir, logFileName });
    this.updateContext(context);
  }

  get context(): Partial<Context> {
    return this._context;
  }

  // TODO: Allow steps to be grouped into stages
  // TODO: Enforce unique names
  addStep(stepParams: StepParams<Context>): this {
    this.steps.push(new Step({ ...stepParams, index: this.steps.length, pipeline: this }));
    return this;
  }

  filterSteps(options: PipelineRunOptions): Step<Context>[] {
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

  async run(options: PipelineRunOptions = {}): Promise<Partial<Context>> {
    const { verbose = false, ...filterOptions } = options;

    this.logger.verbose = verbose;
    this.addIntroToLog(options);

    const filteredSteps = this.filterSteps(filterOptions);
    for (const step of filteredSteps) {
      await step.run(this.context, { logger: this.logger })
        .catch(error => {
          // Save the error to the log and write the log, so that existing log entries aren't lost
          const { name, message, stack, ...otherProps } = error;
          this.logger.add({
            ...otherProps,
            name,
            message,
            stack: error.stack.split('\n'),
          }, { prefix: 'Error' });
          this.logger.write();

          // TODO: Build in optional error handling with "skip" and "stop" options
          throw error;
        });
    }
    this.logger.write();
    return this._context;
  }

  updateContext<C extends Partial<Context>>(partialContext: C): Partial<Context> & C {
    const mergedContext = {
      ...this._context,
      ...partialContext,
    };
    this._context = mergedContext;
    return mergedContext;
  }

  addIntroToLog(options: PipelineRunOptions): void {
    const filteredSteps = this.filterSteps(options);

    function describeSteps<S extends { name: string }>(steps: S[]): string {
      if (!steps.length) {
        return 'none';
      }
      return steps.map(step => step.name).join(', ');
    }

    this.logger.add(
      `${inflectQuantity(this.steps.length, 'defined step')}: ${describeSteps(this.steps)}`
    );
    this.logger.add(
      `${inflectQuantity(filteredSteps.length, 'active step')}: ${describeSteps(filteredSteps)}`,
    );
    this.logger.add(options, { prefix: 'Options', sectionBreakAfter: true });
  }
}
