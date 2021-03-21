import type { Integer } from '@skypilot/common-types';
import { includeIf } from '@skypilot/sugarbowl';

import type { Dict } from 'src/lib/types';
import { Step } from './Step';
import type { StepParams } from './Step';

interface PipelineRunOptions {
  slice?: [Integer] | [Integer, Integer];
}

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
  addStep(stepParams: Omit<StepParams<Context>, 'pipeline'>): this {
    this.steps.push(new Step({ ...stepParams, pipeline: this }));
    return this;
  }

  async run(options: PipelineRunOptions = {}): Promise<Partial<Context>> {
    const { slice = [0] } = options;
    const [sliceStart, sliceEnd] = slice;
    const sliceParams = [sliceStart, ...includeIf(sliceEnd)];

    for (const step of this.steps.slice(...sliceParams)) {
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
