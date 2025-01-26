import {
  KhulnaSoftPlatformForAccount,
  KhulnaSoftPlatformForProject,
  KhulnaSoftPlatformManager,
} from '../platform/gitlab_platform';
import { account, gitlabPlatformForAccount } from '../test_utils/entities';
import { Account } from '../platform/gitlab_account';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftProject } from '../platform/gitlab_project';
import { getChatSupport, ChatSupportResponseInterface } from './api/get_chat_support';
import {
  KhulnaSoftEnvironment,
  KhulnaSoftPlatformManagerForChat,
  KHULNASOFT_COM_URL,
  KHULNASOFT_ORG_URL,
  KHULNASOFT_DEVELOPMENT_URL,
  KHULNASOFT_STAGING_URL,
} from './get_platform_manager_for_chat';

// jest.mock('../utils/extension_configuration');
jest.mock('./api/get_chat_support', () => ({
  getChatSupport: jest.fn(),
}));

describe('KhulnaSoftPlatformManagerForChat', () => {
  let platformManagerForChat: KhulnaSoftPlatformManagerForChat;
  let gitlabPlatformManager: KhulnaSoftPlatformManager;

  const buildKhulnaSoftPlatformForAccount = (useAccount: Account): KhulnaSoftPlatformForAccount => ({
    ...gitlabPlatformForAccount,
    account: useAccount,
  });

  const firstGitlabPlatformForAccount: KhulnaSoftPlatformForAccount = buildKhulnaSoftPlatformForAccount({
    ...account,
    username: 'first-account',
  });
  const secondKhulnaSoftPlatformForAccount: KhulnaSoftPlatformForAccount = buildKhulnaSoftPlatformForAccount({
    ...account,
    username: 'second-account',
  });

  beforeEach(() => {
    gitlabPlatformManager = createFakePartial<KhulnaSoftPlatformManager>({
      getForActiveProject: jest.fn(),
      getForActiveAccount: jest.fn(),
      getForAllAccounts: jest.fn(),
      getForSaaSAccount: jest.fn(),
    });

    platformManagerForChat = new KhulnaSoftPlatformManagerForChat(gitlabPlatformManager);
  });

  afterEach(() => {
    // eslint-disable-next-line no-restricted-syntax
    jest.clearAllMocks();
  });

  describe('when no gitlab account is available', () => {
    beforeEach(() => {
      jest.mocked(gitlabPlatformManager.getForAllAccounts).mockResolvedValueOnce([]);
    });

    it('returns undefined', async () => {
      expect(await platformManagerForChat.getKhulnaSoftPlatform()).toBe(undefined);
    });
  });

  describe('when a single gitlab account is available', () => {
    let customGitlabPlatformForAccount: KhulnaSoftPlatformForAccount;

    beforeEach(() => {
      customGitlabPlatformForAccount = firstGitlabPlatformForAccount;

      jest
        .mocked(gitlabPlatformManager.getForAllAccounts)
        .mockResolvedValueOnce([customGitlabPlatformForAccount]);
    });

    it('returns undefined if the platform for the account does not have chat enabled', async () => {
      jest.mocked(getChatSupport).mockResolvedValue({ hasSupportForChat: false });
      expect(await platformManagerForChat.getKhulnaSoftPlatform()).toBeUndefined();
    });

    it('returns gitlab platform for that account if chat is available for the platform', async () => {
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftPlatform()).toBe(customGitlabPlatformForAccount);
    });
  });

  describe('when multiple gitlab accounts are available', () => {
    const firstPlatformWithChatEnabled: ChatSupportResponseInterface = {
      hasSupportForChat: true,
      platform: firstGitlabPlatformForAccount,
    };
    const secondPlatformWithChatEnabled: ChatSupportResponseInterface = {
      hasSupportForChat: true,
      platform: secondKhulnaSoftPlatformForAccount,
    };
    const platformWithoutChatEnabled: ChatSupportResponseInterface = { hasSupportForChat: false };

    beforeEach(() => {
      jest
        .mocked(gitlabPlatformManager.getForAllAccounts)
        .mockResolvedValueOnce([firstGitlabPlatformForAccount, secondKhulnaSoftPlatformForAccount]);
    });

    it.each`
      desc                | firstResolve                    | secondResolve                    | expectedPlatform
      ${'the first has'}  | ${firstPlatformWithChatEnabled} | ${platformWithoutChatEnabled}    | ${firstGitlabPlatformForAccount}
      ${'the second has'} | ${platformWithoutChatEnabled}   | ${secondPlatformWithChatEnabled} | ${secondKhulnaSoftPlatformForAccount}
      ${'several have'}   | ${firstPlatformWithChatEnabled} | ${secondPlatformWithChatEnabled} | ${firstGitlabPlatformForAccount}
    `(
      'returns the correct gitlab platform when $desc the chat enabled',
      async ({ firstResolve, secondResolve, expectedPlatform }) => {
        jest
          .mocked(getChatSupport)
          .mockResolvedValue(platformWithoutChatEnabled)
          .mockResolvedValueOnce(firstResolve)
          .mockResolvedValueOnce(secondResolve);
        expect(await platformManagerForChat.getKhulnaSoftPlatform()).toBe(expectedPlatform);
      },
    );

    it('correctly returns undefined if none of the platforms have chat enabled', async () => {
      jest.mocked(getChatSupport).mockResolvedValue(platformWithoutChatEnabled);
      expect(await platformManagerForChat.getKhulnaSoftPlatform()).toBe(undefined);
    });
  });

  describe('when getKhulnaSoftEnvironment should return the correct instance', () => {
    let customGitlabPlatformForAccount: KhulnaSoftPlatformForAccount;
    beforeEach(() => {
      customGitlabPlatformForAccount = firstGitlabPlatformForAccount;

      jest
        .mocked(gitlabPlatformManager.getForAllAccounts)
        .mockResolvedValueOnce([firstGitlabPlatformForAccount]);
    });

    it('should returns KHULNASOFT_COM for KHULNASOFT_COM_URL instance', async () => {
      customGitlabPlatformForAccount.account.instanceUrl = KHULNASOFT_COM_URL;
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftEnvironment()).toBe(
        KhulnaSoftEnvironment.KHULNASOFT_COM,
      );
    });

    it('should returns KHULNASOFT_ORG for KHULNASOFT_COM_URL instance', async () => {
      customGitlabPlatformForAccount.account.instanceUrl = KHULNASOFT_ORG_URL;
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftEnvironment()).toBe(
        KhulnaSoftEnvironment.KHULNASOFT_ORG,
      );
    });

    it('should returns KHULNASOFT_DEVELOPMENT for KHULNASOFT_DEVELOPMENT_URL instance', async () => {
      customGitlabPlatformForAccount.account.instanceUrl = KHULNASOFT_DEVELOPMENT_URL;
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftEnvironment()).toBe(
        KhulnaSoftEnvironment.KHULNASOFT_DEVELOPMENT,
      );
    });

    it('should returns KHULNASOFT_STAGING for KHULNASOFT_STAGING_URL instance', async () => {
      customGitlabPlatformForAccount.account.instanceUrl = KHULNASOFT_STAGING_URL;
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftEnvironment()).toBe(
        KhulnaSoftEnvironment.KHULNASOFT_STAGING,
      );
    });

    it('should returns KHULNASOFT_STAGING_URL for any other instanceUrl', async () => {
      customGitlabPlatformForAccount.account.instanceUrl = '';
      jest
        .mocked(getChatSupport)
        .mockResolvedValue({ hasSupportForChat: true, platform: customGitlabPlatformForAccount });
      expect(await platformManagerForChat.getKhulnaSoftEnvironment()).toBe(
        KhulnaSoftEnvironment.KHULNASOFT_SELF_MANAGED,
      );
    });
  });

  describe('getGqlProjectId', () => {
    it('should return a project when it exists', async () => {
      const projectGqlId = 'gid://gitlab/Project/123456';
      const createPartialKhulnaSoftPlatformForProject = () =>
        createFakePartial<KhulnaSoftPlatformForProject>({
          project: createFakePartial<KhulnaSoftProject>({
            gqlId: projectGqlId,
          }),
        });
      jest
        .mocked(gitlabPlatformManager.getForActiveProject)
        .mockResolvedValueOnce(createPartialKhulnaSoftPlatformForProject());

      const projectId = await platformManagerForChat.getProjectGqlId();

      expect(projectId).toBe(projectGqlId);
    });

    it(`should return undefined when a project doesn't exist`, async () => {
      jest.mocked(gitlabPlatformManager.getForActiveProject).mockResolvedValueOnce(undefined);

      const projectId = await platformManagerForChat.getProjectGqlId();

      expect(projectId).toBe(undefined);
    });
  });
});
