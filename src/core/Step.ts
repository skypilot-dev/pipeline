import type { Dict, MaybePromise } from 'src/lib/types';
import type { Pipeline } from './Pipeline';

type Handler<Context> = ((context?: Partial<Context>) => MaybePromise<Partial<Context> | void>);

interface PipelineStepParams<Context> {
  pipeline: Pipeline<Context>;
}

export interface StepParams<Context> {
  handle: Handler<Context>;
  name?: string;
}

export class Step<Context extends Dict> {
  private readonly handle: Handler<Context>;
  private readonly pipeline: Pipeline<Context>;

  constructor(stepParams: StepParams<Context> & PipelineStepParams<Context>) {
    const { pipeline, handle } = stepParams;

    this.handle = handle || (context => context);
    this.pipeline = pipeline;
  }

  async run(): Promise<void> {
    const result = await this.handle(this.pipeline.context);
    if (result) {
      this.pipeline.updateContext(result);
    }
  }
}
