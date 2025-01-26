# [19.6.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.5.0...v19.6.0) (2024-07-15)


### Features

* **config:** add TypeScript configuration ([5f7c042](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/5f7c0427f60c9778bdf799c2a883d083e5ec08de))

# [19.5.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.4.0...v19.5.0) (2024-03-27)


### Features

* **require-valid-i18n-helpers:** lint against string interpolation ([268d858](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/268d858f8bd02cab06ea74f2c6844166489d0d89))

# [19.4.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.3.0...v19.4.0) (2024-01-10)


### Features

* **vtu-no-wrapper-vm:** Improve reporting with $nextTick ([0cb92b8](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/0cb92b870feeea8d889ceec68bb30145b584c823))
* **vtu-no-wrapper-vm:** Prevent saving off a reference to wrapper.vm ([96a59b0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/96a59b066bed3cca5bc62dcfaeb7c26160eda92a))

# [19.3.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.2.0...v19.3.0) (2023-12-05)


### Features

* enable unicorn/no-array-callback-reference rule ([36d228a](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/36d228aeed9f0c9fb07147dd72725339c82e4c76))

# [19.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.1.0...v19.2.0) (2023-10-12)


### Features

* Update ECMAscript 2015 => 2020 ([aea91d7](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/aea91d749de560c4d4b8d6f7699dc26bfb56a6e7))

# [19.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.0.1...v19.1.0) (2023-09-21)


### Features

* 🎸 update eslint-plugin-vue to 9.17.0 ([9fd5bea](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/9fd5beae04bc9df2a0aa3a1fcd350e9aef9322ac))

## [19.0.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v19.0.0...v19.0.1) (2023-08-16)


### Performance Improvements

* Update eslint-plugin-import to improve performance ([1221a64](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/1221a64789616ca6c43c3c45678fcf382521a152)), closes [/github.com/import-js/eslint-plugin-import/blob/main/CHANGELOG.md#2280---2023-07-27](https://gitlab.com//github.com/import-js/eslint-plugin-import/blob/main/CHANGELOG.md/issues/2280---2023-07-27)

# [19.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.3.2...v19.0.0) (2023-04-19)


### Features

* Remove `eslint-plugin-babel` and `@babel/eslint-plugin` ([c27955b](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/c27955b0ad9078925547b9ddc48137752e51afde))


### Performance Improvements

* Switch parser from babel to espree ([b53f2a4](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/b53f2a487d73afbc23bfdd922ce13aa2beac79eb))


### BREAKING CHANGES

* Remove `eslint-plugin-babel` dependency
* Remove `@babel/eslint-plugin` dependency
* Switch parser from `@babel/eslint-parser` to `espree`

## [18.3.2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.3.1...v18.3.2) (2023-04-11)


### Performance Improvements

* Force newer version of jest plugin ([f865af6](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f865af6834e12c89dd0a7ee49c6197ec328cc1c6))

## [18.3.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.3.0...v18.3.1) (2023-04-11)


### Performance Improvements

* isCssSelector performance ([4fb2697](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/4fb2697fe97f15fa7ebb4c2835a99e1c39fb118a))
* isKebabCase selector ([fba327b](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/fba327b793bdebe50dc0983dc34fc68e4f4f51fa))

# [18.3.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.2.1...v18.3.0) (2023-03-23)


### Features

* **i18n:** lint against namespaces in gettext ([f3f3579](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f3f35799f85be89ac31b8785036d9f28b97c60e9))
* **i18n:** require matching namespaces in n_gettext ([63fcbb5](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/63fcbb5483cda54e85244ecd716b1fea94e8ae11))

## [18.2.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.2.0...v18.2.1) (2023-03-22)


### Bug Fixes

* disable no-restricted-syntax rules ([cf65279](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/cf652794d8d8a87a775af5bf0805f5194a599e75)), closes [/github.com/airbnb/javascript/blob/eslint-config-airbnb-v15.0.0/packages/eslint-config-airbnb-base/rules/style.js#L257-L275](https://gitlab.com//github.com/airbnb/javascript/blob/eslint-config-airbnb-v15.0.0/packages/eslint-config-airbnb-base/rules/style.js/issues/L257-L275)

# [18.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.1.0...v18.2.0) (2023-03-03)


### Features

* Implement no explicit wrapper destroy rule ([afae3a8](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/afae3a8f5fe3e68e5680774bbbf4fdb52f21dc4f))

# [18.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v18.0.0...v18.1.0) (2022-09-26)


### Features

* **jest:** restrict usage of toBeTruthy or toBeFalsy ([43fa628](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/43fa6283a94b1ba2f04408f60dc3b7bcc800a3a5))

# [18.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v17.0.0...v18.0.0) (2022-09-21)


### Features

* **jest:** disable no-conditional-export rule ([89014fb](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/89014fb2cd84b0e4083070aa85424ed7c7a4761f))
* **jest:** do not check type of describe name in titles ([3be8823](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/3be8823baddf8a8b90e3003afbeddc552c537654))
* update jest plugin from 23.8.2 to 27.0.4 ([3817754](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/3817754e260e8f4e86a1419274f444e05a33e928)), closes [/github.com/jest-community/eslint-plugin-jest/blob/main/CHANGELOG.md#2400-2020-09-04](https://gitlab.com//github.com/jest-community/eslint-plugin-jest/blob/main/CHANGELOG.md/issues/2400-2020-09-04)


### BREAKING CHANGES

* See eslint-plugin-jest for full
list of breaking changes:

# [17.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v16.0.0...v17.0.0) (2022-08-24)


### Features

* Enforce component name casing ([a0fb136](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/a0fb1363a1a1089b93d76bfb96e6f30bc578585f))


### BREAKING CHANGES

* Component names in templates are now required to be
kebab-case, while component names in `components` options are now
required to be PascalCase.

# [16.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v15.0.0...v16.0.0) (2022-08-12)


### Features

* **deps:** update vue plugins ([712c0ca](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/712c0cafee95be4ec00a5ed6a4a5c231cbfc3edb))


### BREAKING CHANGES

* **deps:** New rules in vue/essential. See
https://github.com/vuejs/eslint-plugin-vue/releases/tag/v9.0.0.

# [15.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v14.0.0...v15.0.0) (2022-07-29)


### Features

* Prefer $scopedSlots by default ([c6a5be9](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/c6a5be943f63871784aef5df0ae98c776466bec0))


### BREAKING CHANGES

* The `@khulnasoft/vue-prefer-dollar-scopedslots` rule is now
enabled by default.

# [14.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v13.1.0...v14.0.0) (2022-07-12)


### Features

* update eslint to 8 ([09a0b36](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/09a0b363082124809825cb3b11c6c803710b86a5))


### BREAKING CHANGES

* Check the ESLint 8 release notes
for more information.
https://eslint.org/docs/8.0.0/user-guide/migrating-to-8.0.0

# [13.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v13.0.0...v13.1.0) (2022-07-08)


### Features

* Add vue-prefer-dollar-scopedslots rule ([93682d9](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/93682d9450aa4389c7b606abf56ead32e302ad33))

# [13.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.3.0...v13.0.0) (2022-07-05)


### Features

* Disallow Composition API ([9fe6ffa](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/9fe6ffac9e1ae59c48aed619997e380d1f5b9115))


### BREAKING CHANGES

* This disallows the Composition API. Since we're still
using Vue 2.6 which doesn't support it anyway, this should have no
effect. Once we upgrade to Vue 2.7, we can consider relaxing this rule
as we develop guidelines around its usage.

See https://gitlab.com/gitlab-org/frontend/eslint-plugin/-/issues/52.

# [12.3.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.2.1...v12.3.0) (2022-05-20)


### Features

* Enable no-dynamic-require rule to prevent import expressions ([c260068](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/c260068542710f5a7417603d4ea0eddefdbb88a4))

## [12.2.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.2.0...v12.2.1) (2022-05-20)


### Bug Fixes

* Loosen new inherited rules ([08cacf8](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/08cacf812534b830f9aa90b9f7c6b90ea2698a56)), closes [/github.com/airbnb/javascript/blob/366bfa66380c08304101c6add46355696e90b348/packages/eslint-config-airbnb-base/rules/es6.js#L67-L68](https://gitlab.com//github.com/airbnb/javascript/blob/366bfa66380c08304101c6add46355696e90b348/packages/eslint-config-airbnb-base/rules/es6.js/issues/L67-L68)

# [12.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.1.0...v12.2.0) (2022-04-21)


### Features

* Update eslint-config-airbnb-base to be eslint@8 compatible ([d006b5b](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/d006b5b9bdcbb70d6f8ddf0a89c7c37d59dd6507))
* Update eslint-plugin-import to have eslint@8 support ([c03cffd](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/c03cffd795fe516cb8c9d3d4f152b53c2de91d57))

# [12.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.0.1...v12.1.0) (2022-04-07)


### Features

* update eslint-plugin-vue to 8.5.0 ([37ac645](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/37ac645f4421ce06b083625c53356e9f6c7c5679))

## [12.0.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v12.0.0...v12.0.1) (2022-03-28)


### Bug Fixes

* remove duplicate rule camelcase ([9f0523a](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/9f0523a5cc6d0d94c8df9618e567c4a4a847287e))

# [12.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v11.0.0...v12.0.0) (2022-03-28)


### Features

* migrate to @babel/eslint-parser ([cbaa880](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/cbaa8803dfdd9295bf0334868fe0a0100806aa33))
* replace plugin-filenames with plugin-unicorn ([1e4df68](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/1e4df689311ccdc4c46e6d9889069133a109255a))


### BREAKING CHANGES

* - `babel/camelcase` rule is builtin in ESLint now as `camelcase`.
- The minimum required Node.js version is 14.

# [11.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v10.0.2...v11.0.0) (2022-02-22)


### Features

* remove unused rule vue-emit-events-with-two-args ([f9a4ddc](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f9a4ddc967f163bd6aa9503b5c0cf86be28617dc))


### BREAKING CHANGES

* rule 'vue-emit-events-with-two-args' was removed.

## [10.0.2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v10.0.1...v10.0.2) (2022-01-12)


### Bug Fixes

* rule require-i18n-strings reports mailto false positive ([5b3397e](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/5b3397e929e6693be507e84742e1b35563ff87aa))

## [10.0.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v10.0.0...v10.0.1) (2022-01-10)


### Bug Fixes

* **ci:** Generate GraphQL schema before running integration test ([d5e6d88](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/d5e6d88e5bb2e06d1ea923a95f7b1a425e5b09d0))

# [10.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.4.0...v10.0.0) (2021-11-03)


### Features

* lint against missing translation namespaces ([db00d87](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/db00d87e3877fa0fe538775280a54fd820c89572))


### BREAKING CHANGES

* require-string-literal-i18n-helpers and
vue-require-string-literal-i18n-helpers rules have been renamed to
require-valid-i18n-helpers and vue-require-valid-i18n-helpers
respectively.

# [9.4.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.3.0...v9.4.0) (2021-09-21)


### Features

* Ignore import path order ([9391f9c](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/9391f9c83fd016a8d6ea10e6eae6f44e79907c14))

# [9.3.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.2.0...v9.3.0) (2021-09-06)


### Features

* add vue-require-string-literal-i18n-helpers rule ([34fd19d](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/34fd19df7d14f5d1c62b6795927e0ff15e3aaf44))

# [9.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.1.0...v9.2.0) (2021-08-30)


### Features

* enable require-string-literal-i18n-helpers ([04b6dee](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/04b6dee2ac4efa8e9fe0941f96ad48c179b0a2ca))

# [9.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.0.3...v9.1.0) (2021-08-26)


### Features

* add require-string-literal-i18n-helpers rule ([8b40853](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/8b4085353162baa3626507bf28ad0b069e2b86d7))

## [9.0.3](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.0.2...v9.0.3) (2021-08-25)


### Bug Fixes

* 🐛 Never allow sequences (comma operator) ([edc87fb](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/edc87fb2d689ff3499146d74be8128d81e3c43a5))

## [9.0.2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.0.1...v9.0.2) (2021-07-05)


### Bug Fixes

* replace deprecated asserts methods ([7e339cf](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/7e339cf607c06a2682f82b4bc2baf366c7db8e6e))

## [9.0.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v9.0.0...v9.0.1) (2021-07-05)


### Bug Fixes

* Add version range to lodash ([999e804](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/999e80431c40f0ad6216e388cd9c7d4075438bfe))

# [9.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v8.4.0...v9.0.0) (2021-06-28)


### Features

* 🎸 Add rules to help migrating to Vue 3 ([8ed1497](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/8ed14979d066b65cb1a6bfddee24477968f2b61a))


### BREAKING CHANGES

* Several new rules are now enabled that prevent
    deprecated APIs from being used when there are reasonable alternatives
    available in Vue 2:

    - vue/no-deprecated-data-object-declaration
    - vue/no-deprecated-filter
    - vue/no-deprecated-functional-template
    - vue/no-deprecated-inline-template
    - vue/no-deprecated-props-default-this
    - vue/no-deprecated-scope-attribute
    - vue/no-deprecated-slot-attribute
    - vue/no-deprecated-slot-scope-attribute

    See https://eslint.vuejs.org/rules/ for more detail about these rules.

# [8.4.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v8.3.0...v8.4.0) (2021-05-13)


### Features

* Add vue-no-new-non-primitive-in-template rule ([3b7a7e3](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/3b7a7e3f4cfe15640306e7f7d9d2c4aa464a58e5))

# [8.3.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v8.2.0...v8.3.0) (2021-04-28)


### Features

* Add vue-no-data-toggle rule ([16d5e2d](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/16d5e2daa304828c1bdce3f80ec3e3243df46687))

# [8.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v8.1.0...v8.2.0) (2021-03-24)


### Features

* Disallow deprecated Vue events API ([e8359e0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/e8359e0254b66f0aa01240dbfbabe626b14b74e1))

# [8.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v8.0.0...v8.1.0) (2021-02-16)


### Features

* enable alphabetical order for imports ([76fd4eb](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/76fd4eb4702d51688f54708b09366ebcd73307f7))

# [8.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v7.0.3...v8.0.0) (2021-02-04)


### Bug Fixes

* **require-i18n-strings:** fix tests ([1c2c5e6](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/1c2c5e69d94eef5ec71f8bd6e7e9ece5bb645515))


### Features

* Update to new major version eslint@7 ([8e4caad](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/8e4caadd2c842fcdf3e3e3622beda48d5044f277))


### BREAKING CHANGES

* New major version

## [7.0.3](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v7.0.2...v7.0.3) (2021-02-03)


### Bug Fixes

* Set import/order groups explicitly ([ae05b29](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/ae05b29d22293f0173021ddb60f285c8c4b3d9ac))

## [7.0.2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v7.0.1...v7.0.2) (2021-01-28)


### Bug Fixes

* no-runtime-template-compiler false positives ([2a894d5](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/2a894d541bc44c249260ac517bf4ba60d84d90b2)), closes [#26](https://gitlab.com/gitlab-org/frontend/eslint-plugin/issues/26)

## [7.0.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v7.0.0...v7.0.1) (2021-01-27)


### Bug Fixes

* 🐛 Handle multiple Vue definitions/instances ([fa79757](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/fa7975706ad705fedc645d4c99cbbfa9465d7eba)), closes [#25](https://gitlab.com/gitlab-org/frontend/eslint-plugin/issues/25)

# [7.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v6.0.0...v7.0.0) (2021-01-20)


### Features

* 🎸 Add no-runtime-template-compiler rule ([70e91d1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/70e91d124f048bda4ed64696b6f2c2d91a3f92d6))


### BREAKING CHANGES

* 🧨 This adds the new rule to the default configuration.

To opt out of it, you can disable the rule on a per-file basis or
globally in your `.eslintrc.*` file.

✅ Closes: https://gitlab.com/gitlab-org/frontend/eslint-plugin/-/issues/24

# [6.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v5.0.0...v6.0.0) (2021-01-07)


### Features

* improve vue linting ([781a627](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/781a62786719d3424d4a542af28db1891845e850))


### BREAKING CHANGES

* This bumps eslint-plugin-vue one major version from
6 to 7. This upgrade includes a number of additional rules and
improvements to existing rules, which we inherit via the vue/recommended
rule set.

These additions can be seen in the [v7 release annountment][1].

The most notable addition is the vue/no-mutating-props rule, which can
help to prevent subtle runtime bugs.

Finally, this is also a step towards adopting Vue 3.

Addresses https://gitlab.com/gitlab-org/frontend/eslint-plugin/-/issues/23.

[1]: https://github.com/vuejs/eslint-plugin-vue/releases/tag/v7.0.0.

# [5.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v4.1.0...v5.0.0) (2020-11-12)


### Features

* Add new vue-slot-name-casing rule ([d4710b0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/d4710b07c92596aa544ccef72e5fbb3a1f0ea7ea))


### BREAKING CHANGES

* This marks slot not defined in kebab-case
As invalid.
Note that this impacts only slot definition but does not
Enforce any styling on consumed slot, thus leaving us free
To use libraries that use slots names not in kebab-case

Co-authored-by: Lukas Eipert <leipert@khulnasoft.com>

# [4.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v4.0.0...v4.1.0) (2020-10-02)


### Features

* Add rule to disallow calling `emit` with more than 2 args ([d247e4b](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/d247e4bfc9a5cdd795472f200f2b908905c60960))

# [4.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v3.2.0...v4.0.0) (2020-08-17)


### Features

* Prefer named exports ([4dac48d](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/4dac48d25e2e0076f84485a76c187293ea726517))


### BREAKING CHANGES

* This disables the `import/prefer-default-export` rule
set by `airbnb-base`, and enables the `import/no-default-export` rule.

Note that Vue single-file-components (SFCs) are exempted from the
`import/no-default-export` rule, since [default exports are required by
design][2].

This is done to align with the consensus reached in our [RFC on
exports][1].

In order to ease the transition, you can keep the old behaviour by
adding the following to your project's `.eslintrc.yml` (or equivalent):

    rules:
      import/prefer-named-export: error
      import/no-default-export: off

Alternatively, you can exempt a subset of files, e.g.:

    overrides:
      - files:
        - '**/*foo.js'
        rules:
          'import/no-default-export': error

[1]: https://gitlab.com/gitlab-org/frontend/rfcs/-/issues/20
[2]: https://vue-loader.vuejs.org/spec.html#script

# [3.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v3.1.0...v3.2.0) (2020-08-17)


### Features

* **jest config:** Disallow test usage in defining tests ([bc56dc4](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/bc56dc45529e87bddb6fb1e71807c4e2654054d0))

# [3.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v3.0.0...v3.1.0) (2020-05-12)


### Features

* **default config:** Enable v-slot-style shorthand rule for components tags ([01dfa60](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/01dfa60f302e9acc4e5186c665d817dd52b9b480))

# [3.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v2.2.1...v3.0.0) (2020-04-29)


### Features

* 🎸 Introduce configuration for Jest ([112921c](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/112921c018862afc87c5cff1d06942d951c1ad66))


### BREAKING CHANGES

* 🧨 New ESLint rules for Jest

## [2.2.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v2.2.0...v2.2.1) (2020-04-17)


### Bug Fixes

* fix restricted globals import ([da823a3](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/da823a36d4b805603fd467d3ff61d73e1e571b69))

# [2.2.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v2.1.1...v2.2.0) (2020-04-16)


### Features

* **default config:** Disallow deprecated usage of escape and unescape ([3ffcbab](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/3ffcbaba0dd7d3779ab8d288a1c6a76e1b097c58))

## [2.1.1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v2.1.0...v2.1.1) (2020-04-16)


### Bug Fixes

* Remove redundant whitespaces from updateFiles ([72a5328](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/72a5328f808e3dd9b530f269250f08e5ff531764))

# [2.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v2.0.0...v2.1.0) (2020-04-14)


### Features

* 🎸 Enable vue/component-tags-order rule by default ([91195b5](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/91195b5ecaa22db1e9690cf389cb8aef3c19932a)), closes [#1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/issues/1)

# [2.0.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v1.1.0...v2.0.0) (2020-03-17)


### Bug Fixes

* remove eslint-plugin-no-jquery ([5a9104c](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/5a9104cdc7e2c1aa39c06820069ef25c8f4c9a55))
* **deps:** move required dependencies out of devDependencies ([20b5d39](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/20b5d391b409b078b6e661c8e2ab9319ecd6584e))
* Add MIT License ([bc19421](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/bc19421751c16e5d329bae55d5e67643b5ff5714))
* Remove superfluous no-mixed-operators rule ([bf0e21c](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/bf0e21c9be565caacde30729504350f45f3c2720)), closes [/github.com/prettier/eslint-config-prettier/blob/master/index.js#L12](https://gitlab.com//github.com/prettier/eslint-config-prettier/blob/master/index.js/issues/L12)
* yarn install semantic release ([1647dbe](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/1647dbeb9c4786c3cf679f9126d4256c9d1399b6))


### Features

* Add `no-implicit-coercion` rule ([ff9c0fa](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/ff9c0faf4041a841d9ca08f1647536393f442f25))
* Add config for our i18n rules ([b065283](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/b06528338c7615b1d789b3bdcc75577d17d1f101))
* add eslint shared config ([3a2f8bd](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/3a2f8bdf63910295ae9e2ec528c1bab41ffee68b))
* Add former @khulnasoft/eslint-config to our plugin ([eaf86e1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/eaf86e1e183bb2320a54364d9211cf70a755bc63))
* add semantic release ([d584a8a](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/d584a8a9ac9e74c80e40c6ab9f79fab993937b86))
* Bump version number and publish ([a9bcb01](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/a9bcb01a48f98afea5273ab004440073bd9c42ff))
* Disable PascalCase enforcement in vue templates ([ca6ae53](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/ca6ae53949289052b614b127f06e85b655a6bef0))
* Disable rules which conflict with prettier 1.15 ([6218cb5](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/6218cb579b26298e8b9d61e0c562f84055a59114))
* Force update of dependencies ([e38a02d](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/e38a02d83ddfe088c9f14b8817a68324fb488bd9))
* Resolve "Update dependencies to reflect recent changes in KhulnaSoft CE" ([a59a5c4](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/a59a5c4791472ec5518a3e9810d8e14e95808cb6))
* update some rule dependencies ([f1aee46](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f1aee467d1e597b6162faaf46f38ba51cc0d18ca))
* Update to new major version eslint@6 ([ff65efc](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/ff65efc7d4505baff2dcbdf94e9343affea87006))


* Merge branch 'update-eslint-plugin-import-to-2.18.2' into 'master' ([4ce71d1](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/4ce71d14ec2c99bf50e9634b932e8f2b3e734c96))


### BREAKING CHANGES

* New major version
* Update eslint-plugin-import from 2.16.0 to 2.18.2

See merge request gitlab-org/gitlab-eslint-config!16

# [1.1.0](https://gitlab.com/gitlab-org/frontend/eslint-plugin/compare/v1.0.0...v1.1.0) (2020-03-11)


### Features

* 🎸 Add eslint-plugin-vue to consume their util ([f7d9ad6](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f7d9ad6e53e563607d12a7ca9905e3ef7dda92ca))

# 1.0.0 (2020-03-11)


### Bug Fixes

* 🐛 Add rules key to main package export ([1c16499](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/1c1649974bb48161abd718224808d32fd943dde3))


### chore

* Rename package to @khulnasoft/eslint-plugin ([daafee6](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/daafee67bde9b67c659ea0ce277b0ae2f910abc9))


### Features

* **dependencies:** Update vue-eslint-parser to v7 ([f977d90](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f977d9035dbe6b8739503eeb280f5e16caa3da85))
* **rules:** Merge in @khulnasoft/eslint-plugin-i18n ([352574c](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/352574c77511be6184db4fba04495f94d45da404))
* 🎸 Added no bare strings rule ([398b3b2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/398b3b28d2f5f4118ed36fd2a493a13f628195d2))
* 🎸 Added no-bare-attribute-strings rule ([653ebf2](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/653ebf2721cb4822e15d8ea5e4212ff584075a0c))
* 🎸 Enable no-bare-attribute-strings rule ([f24119a](https://gitlab.com/gitlab-org/frontend/eslint-plugin/commit/f24119a387a4dad37d296329f7ebc6361dcd0a47))


### BREAKING CHANGES

* Package has been renamed, so rule paths have to be adjusted
* **dependencies:** Dropping node 6 support
