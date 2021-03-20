import type { Dict } from 'src/lib/types';
import { Step } from './Step';
import type { StepParams } from './Step';

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

  async run(): Promise<Partial<Context>> {
    for (const step of this.steps) {
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
