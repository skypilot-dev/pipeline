import type { Integer } from '@skypilot/common-types';

import type { Fragment, Interim, MaybePromise } from 'src/lib/types';
import type { Logger } from 'src/logger/Logger';
import type { Pipeline } from './Pipeline';

export interface Handles {
  logger: Logger;
}

export type Handler<I, A> = (context: Interim<I, A>, handles: Handles) => MaybePromise<Fragment<I, A> | void>;

interface PipelineStepParams<I, A> {
  index: Integer;
  pipeline: Pipeline<I, A>;
}

export interface StepParams<I, A> {
  handle: Handler<I, A>;
  name?: string;
}

export class Step<I, A> {
  index: Integer; // index in the parent's array of steps
  name: string;

  private readonly handle: Handler<I, A>;
  private readonly pipeline: Pipeline<I, A>;

  constructor(stepParams: StepParams<I, A> & PipelineStepParams<I, A>) {
    const { pipeline, handle, index, name = `Unnamed step ${(index + 1).toString()}` } = stepParams;

    this.handle = handle || (context => context);
    this.index = index;
    this.name = name;
    this.pipeline = pipeline;
  }

  async run(context: Interim<I, A>, handles: Handles): Promise<void> {
    const result = await this.handle(context, handles);
    if (result) {
      this.pipeline.updateContext(result);
    }
  }
}
