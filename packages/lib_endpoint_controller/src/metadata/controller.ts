import { createMetadataKey, getMetadata, setMetadata } from './store';

export type ControllerOptions = {
  route?: string;
};

const CONTROLLER_METADATA = createMetadataKey<ControllerOptions>('controller');

export function setControllerMetadata(target: object, options: ControllerOptions): void {
  setMetadata(target, CONTROLLER_METADATA, options);
}

export function getControllerMetadata(target: object): ControllerOptions | undefined {
  return getMetadata(target, CONTROLLER_METADATA);
}
