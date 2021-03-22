import type { Integer } from '@skypilot/common-types';

import type { Dict, MaybePromise } from 'src/lib/types';
import type { Logger } from 'src/logger/Logger';
import type { Pipeline } from './Pipeline';

export interface Handles {
  logger: Logger;
}

export type Handler<Context> = (context: Partial<Context>, handles: Handles) => MaybePromise<Partial<Context> | void>;

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
    const { pipeline, handle, index, name = `unnamed-${(index + 1).toString()}` } = stepParams;

    this.handle = handle || (context => context);
    this.index = index;
    this.name = name;
    this.pipeline = pipeline;
  }

  async run(context: Partial<Context>, handles: Handles): Promise<void> {
    const result = await this.handle(context, handles);
    if (result) {
      this.pipeline.updateContext(result);
    }
  }
}
