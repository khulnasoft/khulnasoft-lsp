import { IDocContext } from '../../document_transformer_service';
import { AIContextItem } from '../..';

/**
 * Resolves additional (or advanced) context for a given `IDocContext`.
 * Each resolution strategy will have its own resolver, eg. Open Files (LRU),
 * Symbols, EcmaScript Imports, etc
 */
export abstract class AdvancedContextResolver {
  abstract buildContext({
    documentContext,
  }: {
    documentContext: IDocContext;
  }): AsyncGenerator<AIContextItem>;
}
