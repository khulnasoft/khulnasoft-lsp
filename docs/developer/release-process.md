# Release process

KhulnaSoft Language Server is released to multiple destinations, as there are many build targets (see [packaging](packaging.md)).
NPM package is uploaded to the project's package registry as an NPM package.
Generated biaries are uploaded to the project's package registry as a generic package.
[NuGet package](nuget_packages.md) is uploaded to the project's package registry as a NuGet package.

We don't have a specific release cadance and release whenever it's needed for the clients. Typically we do several releases a month.

## Perform release

Perform the following steps to release a new version of the extension.

1. Anounce the release is about to be published in `#f_language_server`
1. Open a main branch pipeline on a commit you want to publish as a release. This commit has to be after any previous release commits.
1. Locate `publish-release::manual` job and start it. The version update, tagging, and creating the KhulnaSoft release will happen automatically. Afer the version bump is done, a release tag is pushed to the repository, which will trigger `publish` and `release-nuget`
1. Once `publish` and `release-nuget` finish, anounce the publishing was succesful in `#f_language_server`

## Release automation with Semantic Release

We use [semantic-release](https://github.com/semantic-release/semantic-release) plugin to automate the release process.

Semantic release offers a number of plugins that allow us to automate various steps of the release process.

| Plugin                                                                                                     | Description                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@semantic-release/commit-analyzer`](https://github.com/semantic-release/commit-analyzer)                 | analyses commits since the last release to identify which version bump to apply (patch, minor or major)                                            |
| [`@semantic-release/release-notes-generator`](https://github.com/semantic-release/release-notes-generator) | generates release notes based on the commit messages                                                                                               |
| [`@semantic-release/npm`](https://github.com/semantic-release/npm)                                         | writes the npm version. Can also be used to publish the package to an npm registry, but we rely on our own script                                                                 |
| [`@semantic-release/git`](https://github.com/semantic-release/git)                                         | commits file changes made during the release and pushes them to the repository                                                                     |
| [`@semantic-release/gitlab`](https://github.com/semantic-release/gitlab)                                   | creates a KhulnaSoft release and a Git tag associated wit it and uploades related release artifacts, such as the extension file. It also generates comments to issues resolved by this release                                                        |
