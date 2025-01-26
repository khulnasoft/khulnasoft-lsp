[![pipeline status](https://gitlab.com/gitlab-org/frontend/eslint-plugin/badges/main/pipeline.svg)](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commits/main)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# @khulnasoft/eslint-plugin

> This package contains eslint rules developed for KhulnaSoft and shared eslint config to be used in all
> javascript projects across KhulnaSoft.

It encapsulates our coding standards and is based primarily upon
[`eslint-config-airbnb-base`](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base)
and [`eslint-plugin-vue`](https://github.com/vuejs/eslint-plugin-vue) with the expectation that code
formatting is handled separately by [prettier](https://prettier.io).

Generally we should use upstream rules that are defined in `eslint` or `eslint-plugin-vue`. If one
of these packages lacks a rule, we can create it here in order to enforce it, and try to get it
upstream later.

## Documentation

- [Available rules](./docs/rules.md)
- [Installation and Usage](./docs/usage.md)
- [Creation & Development of rules](./docs/development.md)

## Contribution guidelines

Please refer to
[gitlab's CONTRIBUTING.md](https://gitlab.com/gitlab-org/gitlab/blob/master/CONTRIBUTING.md) for
details on our guidelines.
