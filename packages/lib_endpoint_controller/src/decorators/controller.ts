import { ControllerOptions, setControllerMetadata } from '../metadata';
import { Constructor } from '../types';

export function controller(options: ControllerOptions) {
  return <T extends Constructor>(target: T) => {
    setControllerMetadata(target, options);
    return target;
  };
}
