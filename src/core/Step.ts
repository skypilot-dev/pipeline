import type { Fragment, Interim, MaybePromise } from 'src/lib/types';
import type { Logger } from 'src/logger/Logger';
import type { Pipeline } from './Pipeline';

export interface Handles {
  logger: Logger;
}

export type Handler<I, A> = (context: Interim<I, A>, handles: Handles) => MaybePromise<Fragment<I, A> | void>;

export interface StepParams<I, A> {
  handle: Handler<I, A>;
  name: string;
}

export class Step<I, A> {
  name: string;
  pipeline: Pipeline<I, A>;

  private readonly handle: Handler<I, A>;

  // TODO: When typings are correctly handled, allow the `Step` to be created independently of a `Pipeline`
  constructor(stepParams: StepParams<I, A> & { pipeline: Pipeline<I, A> }) {
    const { pipeline, handle, name } = stepParams;

    this.handle = handle || (context => context);
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
