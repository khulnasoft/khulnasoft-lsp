# KhulnaSoft Language Server

The KhulnaSoft Language Server provides a common interface for other IDE extensions
to build out KhulnaSoft functionality. The language server supports:

- KhulnaSoft Duo Code Suggestions
- KhulnaSoft Duo Chat

For bugs and feature requests, open a
[new issue](https://github.com/khulnasoft/khulnasoft-lsp/-/issues/new).

[[_TOC_]]

## Introduction

LSP (Language Server Protocol) is a technology that provides an abstraction layer
between tools that provide analysis results (language servers) and the "consumer"
IDEs (language clients). It provides a generic interface to provide analysis results
in LSP-enabled IDEs. Implement the analysis one time, and all IDEs then benefit.

This project is an LSP-based language-server that serves
[KhulnaSoft AI Code Suggestions](https://docs.khulnasoft.com/ee/user/project/repository/code_suggestions/index.html)
to LSP-enabled IDEs.

The server supports [LSP protocol version `3.17`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/).

This language server leverages the
[`textDocument/completion`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion)
LSP method to serve code suggestions. For most editors, this hooks into the IntelliSense
feature, which you can invoke with the <kbd>Ctrl</kbd> + <kbd>space</kbd> <kbd>Ctrl</kbd> + <kbd>N</kbd> shortcuts.

## Run the LSP

The LSP client should be responsible for starting the server process and setting up
the connection. The LSP server supports multiple communication methods, and you
must provide one of them at startup:

- **IPC** - Only for communication with the Node process. The server should be a
  Node app. The server is not published as an NPM package, but you can
  use the `out/node/main.js` module if you've compiled the project locally for testing purposes.

  ```shell
  node 'out/node/main.js' --node-ipc
  ```

- **TCP Socket** - Provide a socket port when starting the server process. The client
  should be waiting on that port for the server to connect.

  ```shell
  /opt/khulnasoft-lsp --socket=6789
  ```

- **STDIO**

  ```shell
  /opt/khulnasoft-lsp --stdio
  ```

- **Named Pipes** - The Language Server listens as a named pipe server for the client to connect.

  ```shell
  /opt/khulnasoft-lsp --pipe=pipeName
  ```

[Check `main.ts`](https://github.com/microsoft/vscode-languageserver-node/blob/main/client/src/node/main.ts#L339)
to see how the `vscode-languageclient` Node JS library handles server startup.

## Use open tabs as context

For better results from KhulnaSoft Duo Code Suggestions, ensure that Open Tabs Context is enabled in your IDE settings.
This feature uses the contents of the files currently open in your IDE, to get more
accurate and relevant results from Code Suggestions. Like prompt engineering, these files
give KhulnaSoft Duo more information about the standards and practices in your code project.

To get the most benefit from using your open tabs as context, open the files relevant to the code
you want to create, including configuration files. When you start work in a new file,
Code Suggestions offers you suggestions in the new file.

Prerequisites:

- Requires KhulnaSoft 17.1 or later. Earlier KhulnaSoft versions that support Code Suggestions
  cannot weight the content of open tabs more heavily than other files in your project.
- Requires version 4.14.2 or later of the KhulnaSoft Workflow extension for Visual Studio Code.
- KhulnaSoft Duo Code Suggestions must be enabled for your project, and
  [configured in the KhulnaSoft Workflow plugin](https://gitlab.com/gitlab-org/gitlab-vscode-extension#set-up-code-suggestions).
- Requires a [supported code language](#advanced-context-supported-languages).

1. Download and install a supported version of the KhulnaSoft extension from the
   [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=KhulnaSoft.gitlab-workflow).
   For more about configuring the extension, see
   [its setup instructions](https://gitlab.com/gitlab-org/gitlab-vscode-extension#setup).
1. Open the files you want to provide for context. Advanced Context uses the most recently
   opened or changed files for context. If you don't want a file sent as additional context, close it.
1. To fine-tune your Code Generation results, add code comments to your file that explain
   what you want to build. Code Generation treats your code comments like chat. Your code comments
   update the `user_instruction`, and then improve the next results you receive.

As you work, KhulnaSoft Duo provides code suggestions that use your other open files
(within [truncation limits](https://docs.khulnasoft.com/ee/user/project/repository/code_suggestions/#truncation-of-file-content))
as extra context.

To learn about the code that builds the prompt, see these files:

- **Code Generation**:
  [`ee/lib/api/code_suggestions.rb`](https://gitlab.com/gitlab-org/gitlab/-/blob/master/ee/lib/api/code_suggestions.rb#L76)
  in the `gitlab` repository
- **Code Completion**:
  [`ai_gateway/code_suggestions/processing/completions.py`](https://gitlab.com/gitlab-org/modelops/applied-ml/code-suggestions/ai-assist/-/blob/fcb3f485a8f047a86a8166aad81f93b6d82106a7/ai_gateway/code_suggestions/processing/completions.py#L273)
  in the `modelops` repository

We'd love your feedback about the Advanced Context feature in
[issue 258](https://github.com/khulnasoft/khulnasoft-lsp/-/issues/258).

### Advanced Context supported languages

The Advanced Context feature supports these languages:

- Code Completion: all configured languages.
- Code Generation: Go, Java, JavaScript, Kotlin, Python, Ruby, Rust, TypeScript (`.ts` and `.tsx` files), Vue, and YAML.

## Install the language server client

To install the language server binary locally:

1. Download the language server binary from the
   [Package Registry page](https://github.com/khulnasoft/khulnasoft-lsp/-/packages).
   For every release you can download the binary that matches your OS and architecture.
   In the list of assets linked in the release, binaries end with the string `<os>-<arch>`.
1. Place the binary anywhere on your file system. The configuration in this documentation
   assumes you've placed the binary under `/opt/khulnasoft-lsp`.
1. The language server requires an access token to authenticate with the KhulnaSoft API.
   Create a personal access token (PAT) with the `api` scope, or
   OAuth token with the same scope. Provide this token to the server sending the
   [`didChangeConfiguration` notification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_didChangeConfigurationworkspace/didChangeConfiguration)
   from the client to the server after the server is started.
   [See the details here](docs/supported_messages.md#didchangeconfiguration).
1. In your terminal, make the binary executable with this command:

   ```shell
   chmod +x opt/khulnasoft-lsp
   ```

1. The client implementation depends on your text-editor or IDE. See the next section.

### Allow the binary to run on macOS

MacOS users might encounter a message in the terminal, saying the binary was killed
as soon as you started it. This happens because of a security feature called Gatekeeper.
To allow the binary to run, clear its extended attributes and ad-hoc sign it,
which establishes trust with Gatekeeper.

Run these commands in your terminal, and enter your password if prompted:

```shell
sudo xattr -c opt/khulnasoft-lsp
codesign --force -s - opt/khulnasoft-lsp
```

## Node version

We use the Node version defined in the
[`Microsoft/vscode` project](https://github.com/microsoft/vscode/blob/main/.nvmrc).
We must make sure to keep the *major* version the same as
what the `pkg-fetch` module supports.

The `pkg-fetch` module provides the node version used by `pkg` when packaging the
language server. Each version of `pkg-fetch` has a static set of node builds.
You can look up the versions on the
[`pkg-fetch` releases page](https://github.com/vercel/pkg-fetch/releases) of the GitHub project.

Prerequisites:

- Make sure the major version is the same for the `pkg` and the development versions.

To upgrade the version of Node in use:

1. Update `pkg` version, if there is a new one:
   1. Upgrade the `pkg-fetch` module by editing the `package.json` file's `overrides` section manually.
      - Note: To get the updated package, make sure to `rm -rf node_modules` and run `npm install`.
   1. Check the [`pkg-fetch` releases page](https://github.com/vercel/pkg-fetch/releases)
      for the Node version. Verify `macos-arm64` builds exist for the selected version.
   1. Update `.gitlab-ci.yml` (`test-pkg-node`) with the new version number.
1. Update the development/VS Code version:
   1. Update `.tool-versions` file with the new version number.
   1. Update `.gitlab-ci.yml` (`default`) with the new version number.
   1. Update `src/tests/int/node_version.test.ts` with the correct version number.
   1. Update `package.json` `scripts` section where we reference the target Node version, like this: `--target=node18.17`.
1. Add a changelog entry.

## Development setup

To debug or add new features to the language server:

1. Clone this repository.
1. Run `npm install`.
1. Compile the server code with `npm run compile` or `npm run watch` to
   compile when the changes are made.

### Watch mode

Watch mode rebuilds the project automatically with every file change. Optionally,
it can also update `khulnasoft-lsp` dependency in VS Code. For details, see the
[watch mode script](scripts/watcher/watch.ts).

This example uses VS Code. Run this command:

```shell
npm run watch -- --editor=vscode
```

Then, in VS Code, you can restart your extension development host, and it
receives the latest server changes.

The script will watch for changes in the following directories:

- `src`
- `scripts`
- `packages`
- `webviews`

#### Script parameters

These parameters are optional:

- `-e, --editor <type>` - Specify editor type (e.g., vscode). If set to 'vscode', the script will copy the build files to automatically update `khulnasoft-lsp` in your VS Code Extension.
  - **note**: You do not need to restart the extension development host if you wish to restart the server with your changes. Simply run the "Restart Language Server" command in the command palette.
- `-vp, --vscode-path <path>` - Path to VSCode extension
- `-p, --packages <packages...>` - Specify webviews or packages (eg `@webview/duo-chat`) to build. If not provided, all webviews and packages will be built. This is mainly used for limiting the build to a specific webview. The Language Server core (`src/`) will always be built.

Supported editors:

- vscode

Example usage:

```shell
npm run watch -- --editor vscode --vscode-path ../my-vscode-extension --packages package1 package2
```

This will watch for changes, build only the specified packages, and copy the results to the specified VS Code extension path.

### Start with another client, or without the client

To start the server separately, either:

- Run `npm run debug`.
- Run this command:

  ```shell
  node --inspect=6010 ./out/node/main.js --socket=6789
  ```

Your client should establish the socket connection, and wait on port `6789` for the server to connect.

### Debug the server

To debug the Language Server, you can:

- [Start the Language Server](#start-the-language-server).
- [Connect to the Language Server in the VS Code extension](#connect-to-ls-in-the-vs-code-extension).
- [Connect to the Language Server using Chrome Developer Tools](#connect-to-ls-with-chrome-developer-tools).

#### Start the Language Server

1. Open the project in VS Code.
1. Run the **Start server** launch task.

The launch task starts a Language Server that listens on port `6789` for a client connection,
and connects VS Code debugger to it.

#### Connect to LS in the VS Code extension

Prerequisites:

1. If you don't have `code` command available in your shell, add it: [Launching VS Code from the command line](https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line).
1. [Set up the extension project](https://gitlab.com/gitlab-org/gitlab-vscode-extension/blob/main/docs/developer/language-server.md)
   for LS development.
1. [Start the VS Code extension](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/CONTRIBUTING.md?ref_type=heads#step---4--running-the-extension-in-desktop-vs-code) in development mode.
1. Use the command line to open this project in VS Code, replacing the path with
   the path of your VS Code Extension project:

   ```shell
   KHULNASOFT_WORKFLOW_PATH=/Users/tomas/workspace/gitlab-vscode-extension code .
   ```

   This command is important. It maps the bundled sources in the extension with the source code in this project.

1. Run the **Attach to VS Code Extension** launch task.

#### Connect to LS with Chrome Developer Tools

Prerequisites:

- Your server must be a Node module, not an executable.

1. Either:
   - [Start the VS Code extension](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/CONTRIBUTING.md?ref_type=heads#step-4-running-the-extension-in-desktop-vs-code) in development mode, or
   - [Start the server](#start-with-another-client-or-without-the-client).
1. Open [`chrome://inspect`](chrome://inspect) in a Chrome browser. For more information and
   debugging tools, see [Inspector Clients](https://nodejs.org/en/docs/guides/debugging-getting-started#inspector-clients)
   in the Node.js documentation.
1. Select **Configure**, and ensure your target host and port are listed. Use `localhost:6010`.
1. Select **Open dedicated DevTools for Node**.
1. Either add the `debugger` statement, or add `console.log` in your server code.
1. Recompile after you change the code.

When you start the Language Server, the inspector pauses on the breakpoints.

### Integration Testing

To run integration tests with a fresh build, run:

```shell
npm run test:build:integration
```

To run integration tests without a fresh build, run:

```shell
npm run test:integration
```

To run Git related integration tests, set `TEST_GIT_INTEGRATION` environment variable:

```shell
export TEST_GIT_INTEGRATION=true
npm run test:integration:git
```

Note some tests require flags to be set in the environment.

- `VALIDATE_CI_AND_BUNDLE` - if set, the test validates that the bundle is correctly packaged. It also ensures node is compiled with the correct version.
- `TEST_GIT_INTEGRATION` - if set, the test runs Git related integration tests, eg `RepositoryService`.

Some tests are OS specific. For instance, we use `tinyproxy` on Linux to test proxy HTTP requests.

### Test changes in downstream project pipelines

You can install the artifact created by the `build_package_for_integration` job
in merge request pipelines in downstream projects. This allows you to run CI/CD
for the downstream project without waiting for a new Language Server version to
be published.

For instance, in the VS Code extension, you can run:

```shell
npm install <URL>
```

where `URL` is the URL reported in the job log. Then, you can commit the
`package*.json` changes and push them to a merge request.

### Lint documentation

This project follows the documentation guidelines of KhulnaSoft and uses `markdownlint`
and `vale` to improve the content added and make sure it adheres to our guidelines.
You can find information on
[installing the linters](https://docs.khulnasoft.com/ee/development/documentation/testing.html#install-linters) or
[integrating with your editor](https://docs.khulnasoft.com/ee/development/documentation/testing.html#configure-editors)
in the KhulnaSoft documentation.

## Bundling

We need to create a self-contained bundled JavaScript file that is started by
VS Code. We use `esbuild` to bundle all the dependencies into one file located in
`out/node/main-bundle.js`.

## Packaging

Run:

```shell
npm run package
```

Your binary is available in the `bin` folder of the project.

## Releases

Releases consist of deploying an NPM package and a corresponding generic package to
the [package registry](https://github.com/khulnasoft/khulnasoft-lsp/-/packages).

You must be a project maintainer to perform a release.

To release a new version of the packages:

1. Fetch the latest tags with `git fetch --tags`.
1. Switch to the latest commit on the `main` branch.
1. Create a new branch `git checkout -b 2023-11-06-release`
1. Determine whether it should be a `major/minor/patch` release, as defined by [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary).
   - If `git log --format='%B' $(git describe --abbrev=0 --tags HEAD)..HEAD | grep 'BREAKING CHANGE:\|!:'` returns anything, then it is likely to be a major version.
   - Otherwise if `git log --format='%B' $(git describe --abbrev=0 --tags HEAD)..HEAD | grep 'feat.*:'` returns anything, it should be a minor version.
   - Otherwise it should be a patch version.
1. Run `npm version major/minor/patch`.
   - This command creates a new version, updates the changelog, and tags the commit.
1. Push the branch and the tag. For example, if you created `v3.4.5`, run this command:

   ```shell
   git push && git push origin v3.4.5
   ```

1. Create a merge request from the `2023-11-06-release` branch:
   - Use the version number in the merge request name, like this: `Release LS version 3.4.5`.
   - Make sure the merge request **is NOT** set to squash, because squashing changes the release commit SHA.
1. No review is needed, as no code has changed.
1. Merge the `Release LS version 3.4.5` merge request.
1. Verify that the corresponding [tag pipeline](https://github.com/khulnasoft/khulnasoft-lsp/-/pipelines?scope=tags&page=1) succeeded.

### Communicate updates to downstream extensions

[Renovate](https://github.com/renovatebot/renovate) automatically creates upgrade MRs in downstream projects, so integration issues or epics are not strictly necessary.

Communicate the release by posting in the [`f_language_server`](https://gitlab.enterprise.slack.com/archives/C05B1PFHRPU) channel on Slack.

## Troubleshooting

## Advanced Context feature and memory

The Advanced Context feature stores file information in memory. If you
encounter memory errors, use fewer files to generate context, and close
any you don't need.
