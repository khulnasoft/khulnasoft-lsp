import { ApiReconfiguredData } from '@khulnasoft/core';
import { KhulnaSoftApiClient } from '../../api';
import { createFakePartial } from '../../test_utils/create_fake_partial';
import { DefaultUserService } from './user_service';

const mockUserResponse = {
  currentUser: {
    id: 'gid://gitlab/User/12345',
    username: 'test-user',
    name: 'Test User',
  },
};

describe('UserService', () => {
  let apiClient: KhulnaSoftApiClient;
  let service: DefaultUserService;
  let listener: (data: ApiReconfiguredData) => void | Promise<void>;

  beforeEach(() => {
    apiClient = createFakePartial<KhulnaSoftApiClient>({
      fetchFromApi: jest.fn(),
      onApiReconfigured: (l) => {
        listener = l;
        return { dispose: () => {} };
      },
    });
    service = new DefaultUserService(apiClient);
  });
  it('fetches the user from API', async () => {
    jest.mocked(apiClient.fetchFromApi).mockResolvedValue(mockUserResponse);

    await listener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));

    expect(service.user).toEqual({
      gqlId: 'gid://gitlab/User/12345',
      restId: 12345,
      username: 'test-user',
      name: 'Test User',
    });
  });

  describe('with user already present', () => {
    beforeEach(async () => {
      jest.mocked(apiClient.fetchFromApi).mockResolvedValue(mockUserResponse);
      await listener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));
    });

    it('clears user when the API is not in valid state', async () => {
      await listener({ isInValidState: false, validationMessage: 'error' });

      expect(service.user).toBeUndefined();
    });

    it('clears user when the API call fails', async () => {
      jest.mocked(apiClient.fetchFromApi).mockRejectedValue(new Error('test error'));
      await listener(createFakePartial<ApiReconfiguredData>({ isInValidState: true }));

      expect(service.user).toBeUndefined();
    });
  });
});
