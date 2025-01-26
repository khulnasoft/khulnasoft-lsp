import { AIContextProviderType, AIContextPolicyResponse } from '@khulnasoft/ai-context';
import { log } from '../log';
import {
  DuoFeature,
  DuoFeatureAccessService,
} from '../services/duo_access/duo_feature_access_service';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { AbstractAIContextProvider } from './ai_context_provider';
import type { OpenTabAIContextItem } from './context_providers/open_tabs/open_tabs_provider';
import { ANOTHER_OPEN_TAB_FILE, INVALID_SUBTYPE_ITEM, OPEN_TAB_FILE } from './test_utils/mock_data';

jest.mock('../log');

let onContextItemAddedMock: jest.Mock;
let onBeforeContextItemRemovedMock: jest.Mock;
let onBeforeAllContextItemsRemovedMock: jest.Mock;
let canBeAddedMock: jest.Mock;

class MockProviderClass extends AbstractAIContextProvider<OpenTabAIContextItem> {
  protected readonly duoRequiredFeature?: DuoFeature;

  constructor(
    type: AIContextProviderType,
    duoFeatureAccessService: DuoFeatureAccessService,
    duoRequiredFeature?: DuoFeature,
  ) {
    super(type, duoFeatureAccessService);
    this.duoRequiredFeature = duoRequiredFeature;
    this.onContextItemAdded = onContextItemAddedMock;
    this.onBeforeContextItemRemoved = onBeforeContextItemRemovedMock;
    this.onBeforeAllContextItemsRemoved = onBeforeAllContextItemsRemovedMock;
  }

  canItemBeAdded = canBeAddedMock;

  searchContextItems = jest.fn().mockResolvedValue([]);

  retrieveSelectedContextItemsWithContent = jest.fn().mockResolvedValue({
    ...Promise.resolve(OPEN_TAB_FILE),
    content: '',
  });

  getItemWithContent = jest.fn();
}

describe('AIContextProvider', () => {
  let provider: AbstractAIContextProvider<OpenTabAIContextItem>;
  let mockDuoFeatureAccessService: DuoFeatureAccessService;

  beforeEach(() => {
    onContextItemAddedMock = jest.fn();
    onBeforeContextItemRemovedMock = jest.fn();
    onBeforeAllContextItemsRemovedMock = jest.fn();
    canBeAddedMock = jest.fn().mockResolvedValue(true);
    mockDuoFeatureAccessService = createFakePartial<DuoFeatureAccessService>({
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
    });
    provider = new MockProviderClass('open_tab', mockDuoFeatureAccessService);
  });

  it('correctly creates a provider instance with the specified type', () => {
    expect(provider).toBeInstanceOf(MockProviderClass);
    expect(provider.type).toBe('open_tab');
  });

  describe('addSelectedContextItem', () => {
    it('correctly adds a context entry', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      expect(await provider.getSelectedContextItems()).toEqual([OPEN_TAB_FILE]);
    });

    it('correctly supports multiple context entries of the same type', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      await provider.addSelectedContextItem(ANOTHER_OPEN_TAB_FILE);
      expect(await provider.getSelectedContextItems()).toEqual([
        OPEN_TAB_FILE,
        ANOTHER_OPEN_TAB_FILE,
      ]);
    });

    it('logs an error when adding a context item of different subType', async () => {
      await provider.addSelectedContextItem(INVALID_SUBTYPE_ITEM);
      expect(log.error).toHaveBeenCalledWith(
        'Context item type "invalid:subtype" does not match context provider type "open_tab"',
      );
      expect(await provider.getSelectedContextItems()).toEqual([]);
    });

    it('logs an error when adding a context item with already-existing ID', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      expect(log.error).toHaveBeenCalledWith(
        `Context item with ID "${OPEN_TAB_FILE.id}" already exists`,
      );
      expect(await provider.getSelectedContextItems()).toHaveLength(1);
    });

    it('triggers correct handler when a context item is added', async () => {
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      expect(onContextItemAddedMock).toHaveBeenCalledWith(OPEN_TAB_FILE);
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
    });

    it('does not add item if it is not allowed by policy', async () => {
      canBeAddedMock = jest.fn().mockResolvedValue(false);
      provider = new MockProviderClass('open_tab', mockDuoFeatureAccessService);
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      expect(log.error).toHaveBeenCalledWith(
        `Context item is not allowed by context policies: ${JSON.stringify(OPEN_TAB_FILE)}`,
      );
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(await provider.getSelectedContextItems()).toEqual([]);
    });
  });

  describe('removeSelectedContextItem', () => {
    beforeEach(async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
    });

    it('removes the context entry by id', async () => {
      expect(await provider.getSelectedContextItems()).toEqual([OPEN_TAB_FILE]);
      await provider.removeSelectedContextItem(OPEN_TAB_FILE.id);
      expect(await provider.getSelectedContextItems()).toEqual([]);
    });

    it('throws an error if there is no entry with the passed id', async () => {
      expect(provider.removeSelectedContextItem('non-existent-id')).rejects.toThrow(
        'Item with id non-existent-id not found in context items.',
      );
    });

    it('triggers correct handler before a context item is removed', async () => {
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      jest.resetAllMocks();
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
      await provider.removeSelectedContextItem(OPEN_TAB_FILE.id);
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onBeforeContextItemRemovedMock).toHaveBeenCalledWith(OPEN_TAB_FILE);
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
    });
  });

  describe('clearSelectedContextItems', () => {
    it('removes all context entries', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      await provider.addSelectedContextItem(ANOTHER_OPEN_TAB_FILE);
      await provider.clearSelectedContextItems();
      expect(await provider.getSelectedContextItems()).toEqual([]);
    });

    it('triggers correct handler before all context items are removed', async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
      await provider.addSelectedContextItem(ANOTHER_OPEN_TAB_FILE);
      jest.resetAllMocks();
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
      await provider.clearSelectedContextItems();
      expect(onContextItemAddedMock).not.toHaveBeenCalled();
      expect(onBeforeContextItemRemovedMock).not.toHaveBeenCalled();
      expect(onBeforeAllContextItemsRemovedMock).toHaveBeenCalledTimes(1);
    });

    it('does nothing if there are no entries', async () => {
      await provider.clearSelectedContextItems();
      expect(await provider.getSelectedContextItems()).toEqual([]);
      expect(onBeforeAllContextItemsRemovedMock).not.toHaveBeenCalled();
    });
  });

  describe('replaceSelectedContextItem', () => {
    beforeEach(async () => {
      await provider.addSelectedContextItem(OPEN_TAB_FILE);
    });

    it('replaces an existing context item', async () => {
      const updatedItem = { ...OPEN_TAB_FILE, content: 'Updated content' };
      await provider.replaceSelectedContextItem(OPEN_TAB_FILE, updatedItem);
      expect(await provider.getSelectedContextItems()).toEqual([updatedItem]);
    });

    it('throws an error if the old item does not exist', async () => {
      expect(
        provider.replaceSelectedContextItem(ANOTHER_OPEN_TAB_FILE, OPEN_TAB_FILE),
      ).rejects.toThrow(`Item with id ${ANOTHER_OPEN_TAB_FILE.id} not found in context items.`);
    });
  });

  describe('isAvailable', () => {
    it('is enabled when the provider does not require any feature', async () => {
      const requiredFeature = undefined;
      provider = new MockProviderClass('open_tab', mockDuoFeatureAccessService, requiredFeature);

      const result = await provider.isAvailable();

      expect(result).toEqual({
        enabled: true,
      });
    });

    it.each([
      { enabled: true },
      { enabled: false, disabledReasons: ['Feature "include_file_context" is not enabled'] },
    ] as AIContextPolicyResponse[])(
      'returns the expected policy result when provider requires a feature',
      async (policyResult) => {
        const requiredFeature = DuoFeature.IncludeFileContext;
        provider = new MockProviderClass('open_tab', mockDuoFeatureAccessService, requiredFeature);
        jest.mocked(mockDuoFeatureAccessService.isFeatureEnabled).mockResolvedValue(policyResult);

        const result = await provider.isAvailable();

        expect(mockDuoFeatureAccessService.isFeatureEnabled).toHaveBeenCalledWith(
          DuoFeature.IncludeFileContext,
        );
        expect(result).toEqual(policyResult);
      },
    );
  });
});
