import { Message } from '@khulnasoft/rpc-message';
import { createMetadataKey, getMetadata, setMetadata } from './store';

const ENDPOINT_METADATA = createMetadataKey<Message>('endpoint');

export function setEndpointMetadata(target: object, metadata: Message): void {
  setMetadata(target, ENDPOINT_METADATA, metadata);
}

export function getEndpointMetadata(target: object): Message | undefined {
  return getMetadata(target, ENDPOINT_METADATA);
}
