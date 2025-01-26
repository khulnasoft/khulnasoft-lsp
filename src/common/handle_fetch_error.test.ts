import { handleFetchError } from './handle_fetch_error';
import { createFakeResponse } from './test_utils/create_fake_response';

const TEST_URL = 'https://example.com/api/v4/project';
const TEST_RESOURCE_NAME = 'project';

describe('handleFetchError', () => {
  it('throws when response not ok', async () => {
    const response = createFakeResponse({
      url: TEST_URL,
      status: 400,
      text: 'Bad Request',
    });

    await expect(handleFetchError(response, TEST_RESOURCE_NAME)).rejects.toThrow(
      `Fetching ${TEST_RESOURCE_NAME} from ${TEST_URL} failed`,
    );
  });

  it('does nothing when response is ok', async () => {
    const response = createFakeResponse({
      url: TEST_URL,
      status: 200,
      text: 'OK',
    });

    await expect(handleFetchError(response, TEST_RESOURCE_NAME)).resolves.toBeUndefined();
  });

  it('throws when response not ok and resolving text fails', async () => {
    const response = createFakeResponse({
      url: TEST_URL,
      status: 400,
    });
    response.text = () => Promise.reject(new Error('Reading body failed'));

    await expect(handleFetchError(response, TEST_RESOURCE_NAME)).rejects.toThrow(
      `Fetching ${TEST_RESOURCE_NAME} from ${TEST_URL} failed`,
    );
  });
});
