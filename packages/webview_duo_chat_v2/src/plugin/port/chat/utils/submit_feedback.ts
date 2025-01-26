// import * as vscode from 'vscode';
// import { Snowplow } from '../../snowplow/snowplow';

// const KHULNASOFT_STANDARD_SCHEMA_URL = 'iglu:com.gitlab/gitlab_standard/jsonschema/1-0-9';
// const IDE_EXTENSION_VERSION_SCHEMA_URL = 'iglu:com.gitlab/ide_extension_version/jsonschema/1-0-0';

// function buildStandardContext(
//   extendedTextFeedback: string | null,
//   gitlabEnvironment: KhulnaSoftEnvironment,
// ) {
//   return {
//     schema: KHULNASOFT_STANDARD_SCHEMA_URL,
//     data: {
//       source: 'gitlab-vscode',
//       extra: {
//         extended_feedback: extendedTextFeedback,
//       },
//       environment: gitlabEnvironment,
//     },
//   };
// }

// function buildIdeExtensionContext() {
//   // const extension = vscode.extensions.getExtension('Gitlab.gitlab-workflow');

//   return {
//     schema: IDE_EXTENSION_VERSION_SCHEMA_URL,
//     data: {
//       ide_name: 'Visual Studio Code',
//       ide_vendor: 'Microsoft Corporation',
//       // ide_version: vscode.version,
//       extension_name: 'KhulnaSoft Workflow',
//       // extension_version: extension?.packageJSON?.version,
//     },
//   };
// }

export type SubmitFeedbackParams = {
  extendedTextFeedback: string | null;
  feedbackChoices: string[] | null;
  // gitlabEnvironment: KhulnaSoftEnvironment;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const submitFeedback = async (_: SubmitFeedbackParams) => {
  // const hasFeedback = Boolean(extendedTextFeedback?.length) || Boolean(feedbackChoices?.length);
  // if (!hasFeedback) {
  //   return;
  // }
  // const standardContext = buildStandardContext(extendedTextFeedback, gitlabEnvironment);
  // const ideExtensionVersion = buildIdeExtensionContext();
  // await Snowplow.getInstance().trackStructEvent(
  //   {
  //     category: 'ask_gitlab_chat',
  //     action: 'click_button',
  //     label: 'response_feedback',
  //     property: feedbackChoices?.join(','),
  //   },
  //   [standardContext, ideExtensionVersion],
  // );
};
