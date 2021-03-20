import type { Dict } from 'src/lib/types';
import type { Pipeline } from './Pipeline';

type Handler<Context> = ((context?: Partial<Context>) => Partial<Context> | void);

export interface StepParams<Context> {
  handle: Handler<Context>;
  pipeline: Pipeline<Context>;
}

export class Step<Context extends Dict> {
  private readonly handle: Handler<Context>;
  private readonly pipeline: Pipeline<Context>;

  constructor(stepParams: StepParams<Context>) {
    const { pipeline, handle } = stepParams;

    this.handle = handle || (context => context);
    this.pipeline = pipeline;
  }

  async run(): Promise<void> {
    const result = this.handle(this.pipeline.context);
    if (result) {
      this.pipeline.updateContext(result);
    }
  }
}
