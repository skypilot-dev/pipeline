import type { Integer } from '@skypilot/common-types';
import { includeIf } from '@skypilot/sugarbowl';

import type { Dict } from 'src/lib/types';
import { Step } from './Step';
import type { StepParams } from './Step';

interface ExcludeSteps {
  excludeSteps?: string[]; includeSteps?: undefined;
}

interface IncludeSteps {
  excludeSteps?: undefined; includeSteps?: string[];
}

interface CorePipelineRunOptions {
  slice?: [Integer] | [Integer, Integer];
}

export type PipelineRunOptions = CorePipelineRunOptions & (ExcludeSteps | IncludeSteps);

export class Pipeline<Context extends Dict> {
  private _context: Partial<Context> = {};
  private steps: Step<Context>[] = [];

  constructor(context: Partial<Context> = {}) {
    this.updateContext(context);
  }

  get context(): Partial<Context> {
    return this._context;
  }

  // TODO: Allow steps to be grouped into stages
  // TODO: Enforce unique names
  addStep(stepParams: StepParams<Context>): this {
    this.steps.push(new Step({ ...stepParams, index: this.steps.length - 1, pipeline: this }));
    return this;
  }

  async run(options: PipelineRunOptions = {}): Promise<Partial<Context>> {
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

    const filteredSteps = this.steps.slice(...sliceParams).filter(filter);
    for (const step of filteredSteps) {
      await step.run();
    }
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
}
