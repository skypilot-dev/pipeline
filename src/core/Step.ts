import type { Integer } from '@skypilot/common-types';

import type { Dict, MaybePromise } from 'src/lib/types';
import type { Pipeline } from './Pipeline';

type Handler<Context> = ((context?: Partial<Context>) => MaybePromise<Partial<Context> | void>);

interface PipelineStepParams<Context> {
  index: Integer;
  pipeline: Pipeline<Context>;
}

export interface StepParams<Context> {
  handle: Handler<Context>;
  name?: string;
}

export class Step<Context extends Dict> {
  index: Integer; // index in the parent's array of steps
  name: string;

  private readonly handle: Handler<Context>;
  private readonly pipeline: Pipeline<Context>;

  constructor(stepParams: StepParams<Context> & PipelineStepParams<Context>) {
    const { pipeline, handle, index, name = index.toString() } = stepParams;

    this.handle = handle || (context => context);
    this.index = index;
    this.name = name;
    this.pipeline = pipeline;
  }

  async run(): Promise<void> {
    const result = await this.handle(this.pipeline.context);
    if (result) {
      this.pipeline.updateContext(result);
    }
  }
}
