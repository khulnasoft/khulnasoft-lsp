import { RpcMessageDefinition } from '@khulnasoft/rpc-message';
import { Injectable } from '@khulnasoft/di';
import { MessageValidationResult, MessageCollectionValidator } from '../types';

@Injectable(MessageCollectionValidator, [])
export class DuplicateMethodValidator implements MessageCollectionValidator {
  validate(messages: RpcMessageDefinition[]): MessageValidationResult {
    const seenMethods = new Set<string>();
    const errors: MessageValidationResult['errors'] = [];

    for (const message of messages) {
      if (seenMethods.has(message.methodName)) {
        errors.push({
          code: 'DUPLICATE_METHOD',
          message: `Duplicate method name: ${message.methodName}`,
          methodName: message.methodName,
        });
      }

      seenMethods.add(message.methodName);
    }

    return { errors, isValid: errors.length === 0 };
  }
}
