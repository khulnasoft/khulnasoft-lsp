import { Cable } from '@anycable/core';
import { createFakePartial } from './create_fake_partial';

export const createFakeCable = () =>
  createFakePartial<Cable>({
    subscribe: jest.fn(),
    disconnect: jest.fn(),
  });
