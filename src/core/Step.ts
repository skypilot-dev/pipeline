// IMPORTS
import { ValidationResult } from '@skypilot/sugarbowl';
import { has } from 'dot-prop';

import { ValidationError  } from 'src/lib/classes/ValidationError';
import type { Dict, Fragment, Interim, MaybePromise } from 'src/lib/types';
import type { Logger } from 'src/logger/Logger';

import type { Pipeline } from './Pipeline';


// TYPES
// TODO: Possibly remove the `logger` and expect the pipeline to provide it if needed (like any other handle)
export interface Handles {
  logger?: Logger;
}

export type Handler<I, A> = (context: Interim<I, A>, handles: Handles) => MaybePromise<Fragment<I, A> | void>;

export interface InputOptions {
  required?: boolean;
  type?: string;
}

export interface StepParams<I, A> {
  dependsOn?: string[];
  excludeByDefault?: boolean;
  handle: Handler<I, A>;
  inputs?: Dict<InputOptions>;
  name: string;
}

// CLASS
export class Step<I, A> {
  dependsOn: string[]; // names of steps that must be run before this step
  excludeByDefault: boolean; // if true, don't include unless the step is explicitly named in the run options
  inputs: Dict<InputOptions>;
  name: string;
  pipeline?: Pipeline<I, A>;

  private readonly handle: Handler<I, A>;

  // TODO: When typings are correctly handled, allow the `Step` to be created independently of a `Pipeline`
  constructor(stepParams: StepParams<I, A> & { pipeline?: Pipeline<I, A> }) {
    const { dependsOn = [], excludeByDefault = false, handle, inputs = {}, name, pipeline } = stepParams;

    this.dependsOn = dependsOn;
    this.excludeByDefault = excludeByDefault;
    this.handle = handle || (context => context);
    this.inputs = inputs;
    this.name = name;
    this.pipeline = pipeline;
  }

  async run(context: Interim<I, A> = {}, handles: Handles = {}): Promise<Interim<I, A>> {
    if (!this.isInputValid(context)) {
      throw new ValidationError('Invalid input', this.validateInputs(context).messages);
    }
    const result = await this.handle(context, handles);
    if (result) {
      this.pipeline?.updateContext(result);
      return result;
    }
    return {};
  }

  isInputValid(context: Interim<I, A>): boolean {
    return this.validateInputs(context).success;
  }

  validateInputs(context: Interim<I, A>): ValidationResult {
    const validationResult = new ValidationResult();
    for (const [path, options] of Object.entries(this.inputs)) {
      const { required } = options;

      if (required && !has(context, path)) {
        validationResult.add(
          'error',
          `Missing required context path '${path}'`,
          { id: path },
        );
      }
    }
    return validationResult;
  }
}
