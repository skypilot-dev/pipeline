// IMPORTS
import { isUndefined, ValidationResult } from '@skypilot/sugarbowl';
import type { LogLevel } from '@skypilot/sugarbowl';
import { has } from 'dot-prop';

import { ValidationError  } from 'src/lib/classes/ValidationError';
import type { Dict, Fragment, Interim, MaybePromise } from 'src/lib/types';
import type { Logger } from 'src/logger/Logger';

import type { Pipeline } from './Pipeline';


// TYPES
// TODO: Possibly remove the `logger` and expect the pipeline to provide it if needed (like any other handle)
export interface Handles<I, A> {
  logger?: Logger;
  pipeline?: Pipeline<I, A>;
}

export type Handler<I, A> = (context: Interim<I, A>, handles: Handles<I, A>) => MaybePromise<Fragment<I, A> | void>;

export interface InputOptions {
  required?: boolean;
  type?: string;
}

export interface ValidationOptions {
  logLevel?: LogLevel | null;
}

export interface StepParams<I, A> {
  dependsOn?: string[];
  excludeByDefault?: boolean;
  handle?: Handler<I, A>;
  inputs?: Dict<InputOptions>;
  logLevel?: LogLevel | null;
  name?: string;
}

// CLASS
export class Step<I, A> {
  dependsOn: string[]; // names of steps that must be run before this step
  excludeByDefault: boolean; // if true, don't include unless the step is explicitly named in the run options
  inputs: Dict<InputOptions>;
  logLevel: LogLevel | null;
  name: string;

  private readonly handle?: Handler<I, A>;

  constructor(stepParams: StepParams<I, A> & { pipeline?: Pipeline<I, A> }) {
    const {
      dependsOn = [],
      excludeByDefault = false,
      handle,
      logLevel = 'warn',
      inputs = {},
      name = 'unnamed',
    } = stepParams;

    this.dependsOn = dependsOn;
    this.excludeByDefault = excludeByDefault;
    this.handle = handle;
    this.logLevel = logLevel;
    this.inputs = inputs;
    this.name = name;
  }

  isInputValid(context: Interim<I, A>, options: ValidationOptions = {}): boolean {
    return this.validateInputs(context, options).success;
  }

  async run(context: Interim<I, A> = {}, handles: Handles<I, A> = {}): Promise<Interim<I, A>> {
    if (!this.isInputValid(context)) {
      throw new ValidationError(
        `Invalid input in step '${this.name}'`,
        this.validateInputs(context).messages
      );
    }
    const result = this.handle ? await this.handle(context, handles) : {};
    if (result) {
      handles.pipeline?.updateContext(result);
      return result;
    }
    return {};
  }

  validateInputs(context: Interim<I, A>, options: ValidationOptions = {}): ValidationResult {
    const { logLevel = this.logLevel } = options;

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
    const { highestLevel } = validationResult;
    if (
      !isUndefined(highestLevel)
      && ValidationResult.compareLevels(validationResult.highestLevel, logLevel) >= 0
    ) {
      // eslint-disable-next-line no-console
      console[highestLevel](validationResult);
    }
    return validationResult;
  }
}
