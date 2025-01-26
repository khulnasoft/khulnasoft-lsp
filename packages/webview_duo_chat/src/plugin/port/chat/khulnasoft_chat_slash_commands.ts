export interface GitlabChatSlashCommand {
  name: string;
  description: string;
  shouldSubmit?: boolean;
}

const ResetCommand: GitlabChatSlashCommand = {
  name: '/reset',
  description: 'Reset conversation and ignore the previous messages.',
  shouldSubmit: true,
};

const CleanCommand: GitlabChatSlashCommand = {
  name: '/clear',
  description: 'Delete all messages in this conversation.',
};

const TestsCommand: GitlabChatSlashCommand = {
  name: '/tests',
  description: 'Write tests for the selected snippet.',
};

const RefactorCommand: GitlabChatSlashCommand = {
  name: '/refactor',
  description: 'Refactor the selected snippet.',
};

const ExplainCommand: GitlabChatSlashCommand = {
  name: '/explain',
  description: 'Explain the selected snippet.',
};

export const defaultSlashCommands: GitlabChatSlashCommand[] = [
  ResetCommand,
  CleanCommand,
  TestsCommand,
  RefactorCommand,
  ExplainCommand,
];
