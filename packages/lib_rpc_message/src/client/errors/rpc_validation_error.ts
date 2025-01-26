export class RpcValidationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = 'RpcValidationError';
    this.details = details;
  }
}
