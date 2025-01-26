# KhulnaSoft Duo Workflow Webview

## Summary

The KhulnaSoft Duo Workflow Webview package is a crucial component of the KhulnaSoft VSCode extension that implements the Duo Workflow interface. This package provides a Vue.js-based web application that renders the interactive Duo Workflow interface within VSCode. It enables developers to review, manage, and interact with Duo Workflow features directly from their development environment.

The package is built using Vue 2, integrates with the KhulnaSoft UI component library, and provides a seamless bridge between VSCode's extension system and KhulnaSoft's Duo Workflow functionality.

## Getting Started

First, start by reading through the [prerequesites of Duo Workflow](https://docs.khulnasoft.com/ee/user/duo_workflow/#prerequisites) to make sure you have correct setup and permissions.

Then to start developping locally with Duo Workflow webview, you'll need to:

1. Clone the [VSCode extension](https://gitlab.com/gitlab-org/gitlab-vscode-extension) repository and the [KhulnaSoft Language Server](https://github.com/khulnasoft/khulnasoft-lsp) repository side by side:

   ```bash
   parent-directory/
   ├── vscode-gitlab-workflow/    # VSCode extension
   └── khulnasoft-lsp/               # Language server
   ```

1. Ensure you have Node.js and npm installed on your system.

1. Install dependencies in both repositories by running `npm install` in their respective root directories.

### Development Setup

1. In the Language Server directory (`khulnasoft-lsp`), start the Duo Workflow development server:

   ```bash
   npm run duo:workflow
   ```

   This command will build and watch for changes in the `webview-duo-workflow` and the `workflow-api` packages.

1. In VSCode:
   - Open the VSCode extension project
   - Click **Run and Debug**, choose **Run Extension** in the dropdown and select **Play**.
   - This will launch a new VSCode instance with the extension running in development mode.
   - A new host window will appear if the script copmpiles successfully.

The development setup enables hot-reloading of the webview components. To view your changes, simply run the VsCode command (CMD + SHIFT + P) `Developer: Reload Webviews`.

## Code Structure

The codebase is organized into two main directories under `src/`:

### Plugin Directory (`src/plugin/`)

The plugin directory contains code that interfaces with the VSCode extension system:

- `controllers/`: Handles communication between the webview and VSCode extension
- `utils/`: Helper functions for the plugin layer
- `index.ts`: Main entry point for the plugin integration

This layer acts as a bridge between the VSCode extension and the web application, handling message passing and state management.

### App Directory (`src/app/`)

The app directory contains the Vue.js application that renders the Duo Workflow interface:

- `duo_chat/`: Components and logic for the chat interface. This is a vendored version of Duo Chat so that it can be modified inside the LSP project for Duo Workflow.
- `pages/`: Vue components for different views
- `stores/`: Pinia stores for state management
- `router/`: Vue Router configuration
- `graphql/`: GraphQL queries and mutations
- `styles.scss`: Global styles for the application

This layer handles the user interface, state management, and business logic of the Duo Workflow feature.

## Troubleshooting

### Hot reloading not working

If your changes are not reflected in the VSCode host window when you are updating the `language-server` codebase,
consider the following.

1. Are your directories siblings? This means they are in the same parent directory. If they aren't, you need to pass the VSCode **relative** path of your machine to the command defined above.

1. When running the `language-server` watch script, are there any errors? Try running `npm run compile` to make sure there are no TypeScript errors.

1. In the `language-server` and `VSCode extension` projects, did you pull the latest `main` branches and run `npm install` in both?

1. Once VSCode host has started, show the `output` window (`CMD + SHIFT + U` on MacOS) and from the dropdown on the right, select `KhulnaSoft Language Server`. Are there any errors?

1. Open the Developper tools (`CMD + OPTION + I` on MacOS). Then click on the console tab and check if there are any errors

## Additional Resources

For more information about KhulnaSoft Duo Workflow, refer to the following documentation:

- [KhulnaSoft Duo Workflow User Guide](https://docs.khulnasoft.com/ee/user/duo_workflow/)
- [KhulnaSoft Duo Workflow Development Guide](https://docs.khulnasoft.com/ee/development/duo_workflow/)
