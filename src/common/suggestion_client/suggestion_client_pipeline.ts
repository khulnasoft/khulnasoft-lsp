import {
  SuggestionClient,
  SuggestionClientFn,
  SuggestionClientMiddleware,
  SuggestionContext,
  SuggestionResponse,
} from './suggestion_client';

export class SuggestionClientPipeline implements SuggestionClient {
  #middlewares: SuggestionClientMiddleware[];

  #pipeline: SuggestionClientFn;

  constructor(middlewares: SuggestionClientMiddleware[]) {
    this.#middlewares = [...middlewares];
    this.#pipeline = this.#buildPipeline();
  }

  use(middleware: SuggestionClientMiddleware) {
    this.#middlewares.push(middleware);
    this.#pipeline = this.#buildPipeline();
  }

  #buildPipeline() {
    return this.#middlewares.reduce<SuggestionClientFn>(
      (acc, middleware) => {
        return (x: SuggestionContext) => {
          return middleware(x, acc);
        };
      },
      () =>
        Promise.reject(
          new Error(`[SuggestionClientPipeline] Reached end of the pipeline without resolution!`),
        ),
    );
  }

  getSuggestions(context: SuggestionContext): Promise<SuggestionResponse | undefined> {
    return this.#pipeline(context);
  }
}
