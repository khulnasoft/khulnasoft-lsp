import { createInterfaceId } from '@khulnasoft/di';
import { KhulnaSoftUser } from './types';

export interface UserService {
  readonly user?: KhulnaSoftUser;
}

export const UserService = createInterfaceId<UserService>('UserService');
