import { CodeSuggestionResponse } from '../api';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { FallbackClient } from './fallback_client';
import { SuggestionClient, SuggestionContext } from './suggestion_client';

describe('FallbackClient', () => {
  const response1 = createFakePartial<CodeSuggestionResponse>({ error: '1' });
  const response2 = createFakePartial<CodeSuggestionResponse>({ error: '2' });
  const context = createFakePartial<SuggestionContext>({ intent: 'completion' });

  it('should return the first successful result from the clients', async () => {
    const client1 = createFakePartial<SuggestionClient>({
      getSuggestions: jest.fn().mockResolvedValue(response1),
    });
    const client2 = createFakePartial<SuggestionClient>({
      getSuggestions: jest.fn().mockResolvedValue(response2),
    });
    const fallbackClient = new FallbackClient(client1, client2);

    const result = await fallbackClient.getSuggestions(context);
    expect(result).toEqual(response1);
    expect(client1.getSuggestions).toHaveBeenCalledWith(context);
    expect(client2.getSuggestions).not.toHaveBeenCalled();
  });

  it('should call next client if previous does not return results', async () => {
    const client1 = createFakePartial<SuggestionClient>({
      getSuggestions: jest.fn().mockResolvedValue(undefined),
    });
    const client2 = createFakePartial<SuggestionClient>({
      getSuggestions: jest.fn().mockResolvedValue(response2),
    });
    const fallbackClient = new FallbackClient(client1, client2);

    const result = await fallbackClient.getSuggestions(context);
    expect(result).toEqual(response2);
    expect(client1.getSuggestions).toHaveBeenCalledWith(context);
    expect(client2.getSuggestions).toHaveBeenCalledWith(context);
  });
});
