const ignoredPaths = [
  // We aren't interested in these git paths at this time
  'githooks',
  '.git/lfs',
  '.git/logs',
  '.git/objects',

  // Common build paths
  'node_modules',
  'dist',

  // Common IDE paths
  '.bundle',
  '.idea',
  '.vscode',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.tox',
  '.venv',
];

// Build the negated glob pattern using negative lookahead
export const COMMON_PATHS_PATTERN = `**/{${ignoredPaths.join(',')}}/**`;
