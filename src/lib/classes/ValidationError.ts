// WIP: A class that allows additional error messages to be attached
export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
  }
}
