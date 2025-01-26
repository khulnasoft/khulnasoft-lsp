export const AUTHENTICATION = 'authentication' as const;
export const CODE_SUGGESTIONS = 'code_suggestions' as const;
export const CHAT = 'chat' as const;
// export const WORKFLOW = 'workflow' as const;

export type Feature = typeof AUTHENTICATION | typeof CODE_SUGGESTIONS | typeof CHAT; // | typeof WORKFLOW;

export interface UnsupportedKhulnaSoftVersionCheckContext {
  version: string;
  baseUrl: string;
}

export const AUTHENTICATION_REQUIRED = 'authentication-required' as const;
export const INVALID_TOKEN = 'invalid-token' as const;
export const SUGGESTIONS_AUTHENTICATION_REQUIRED =
  'code-suggestions-authentication-required' as const;
export const SUGGESTIONS_NO_LICENSE = 'code-suggestions-no-license' as const;
export const CHAT_AUTHENTICATION_REQUIRED = 'chat-authentication-required' as const;
export const CHAT_NO_LICENSE = 'chat-no-license' as const;
export const DUO_DISABLED_FOR_PROJECT = 'duo-disabled-for-project' as const;
export const UNSUPPORTED_KHULNASOFT_VERSION = 'code-suggestions-unsupported-gitlab-version' as const;
export const UNSUPPORTED_LANGUAGE = 'code-suggestions-document-unsupported-language' as const;
export const DISABLED_LANGUAGE = 'code-suggestions-document-disabled-language' as const;
export const SUGGESTIONS_API_ERROR = 'code-suggestions-api-error' as const;
export const CHAT_DISABLED_BY_USER = 'chat-disabled-by-user' as const;
export const SUGGESTIONS_DISABLED_BY_USER = 'code-suggestions-disabled-by-user' as const;

export type StateCheckContextMap = {
  [UNSUPPORTED_KHULNASOFT_VERSION]: UnsupportedKhulnaSoftVersionCheckContext;
};

export type StateCheckId =
  | typeof AUTHENTICATION_REQUIRED
  | typeof SUGGESTIONS_AUTHENTICATION_REQUIRED
  | typeof CHAT_AUTHENTICATION_REQUIRED
  | typeof INVALID_TOKEN
  | typeof SUGGESTIONS_NO_LICENSE
  | typeof CHAT_NO_LICENSE
  | typeof DUO_DISABLED_FOR_PROJECT
  | typeof UNSUPPORTED_KHULNASOFT_VERSION
  | typeof UNSUPPORTED_LANGUAGE
  | typeof SUGGESTIONS_API_ERROR
  | typeof DISABLED_LANGUAGE
  | typeof CHAT_DISABLED_BY_USER
  | typeof SUGGESTIONS_DISABLED_BY_USER;

export type StateCheckContext<T extends StateCheckId> = T extends keyof StateCheckContextMap
  ? StateCheckContextMap[T]
  : never;

export interface FeatureStateCheck<T extends StateCheckId> {
  checkId: T;
  details?: string;
  context?: StateCheckContext<T>;
  engaged: boolean;
}

export interface FeatureState {
  featureId: Feature;
  // @deprecated this prop is deprecated. Use `allChecks` instead
  engagedChecks: FeatureStateCheck<StateCheckId>[];
  allChecks?: FeatureStateCheck<StateCheckId>[];
}

// the first item in the array will have the highest priority
export const AUTHENTICATION_CHECK_PRIORITY_ORDERED = [AUTHENTICATION_REQUIRED];

export const CODE_SUGGESTIONS_CHECKS_PRIORITY_ORDERED = [
  ...AUTHENTICATION_CHECK_PRIORITY_ORDERED,
  SUGGESTIONS_DISABLED_BY_USER,
  SUGGESTIONS_API_ERROR,
  UNSUPPORTED_KHULNASOFT_VERSION,
  SUGGESTIONS_NO_LICENSE,
  DUO_DISABLED_FOR_PROJECT,
  UNSUPPORTED_LANGUAGE,
  DISABLED_LANGUAGE,
];
export const CHAT_CHECKS_PRIORITY_ORDERED = [
  ...AUTHENTICATION_CHECK_PRIORITY_ORDERED,
  CHAT_DISABLED_BY_USER,
  CHAT_NO_LICENSE,
  DUO_DISABLED_FOR_PROJECT,
];

export const CHECKS_PER_FEATURE: { [key in Feature]: StateCheckId[] } = {
  [AUTHENTICATION]: AUTHENTICATION_CHECK_PRIORITY_ORDERED,
  [CODE_SUGGESTIONS]: CODE_SUGGESTIONS_CHECKS_PRIORITY_ORDERED,
  [CHAT]: CHAT_CHECKS_PRIORITY_ORDERED,
  // [WORKFLOW]: [],
};
