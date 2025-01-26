# [7.9.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.8.0...v7.9.0) (2025-01-24)


### Bug Fixes

* rendering of HTML entries in Markdown ([df1b079](https://github.com/khulnasoft/khulnasoft-lsp/commit/df1b0797716a9f916f976e6832a714d6bb09e5f4))


### Features

* add polling to docker error state ([32f6e85](https://github.com/khulnasoft/khulnasoft-lsp/commit/32f6e85a5c4fce3d2c688ccfe87771c46a5e5a9f))
* Duo Workflow - UI refinements for index page ([04f16e6](https://github.com/khulnasoft/khulnasoft-lsp/commit/04f16e681bc864dd316bf1fffc4d67fe9ed3cfbc))



# [7.8.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.7.0...v7.8.0) (2025-01-23)


### Bug Fixes

* add user-agent header to direct connection requests ([82e33a6](https://github.com/khulnasoft/khulnasoft-lsp/commit/82e33a6c77b47da1eeda8ae3824b9e8af430c7c6))


### Features

* Duo Workflow - Update Duo WF Finished state to Complete ([3f0fac4](https://github.com/khulnasoft/khulnasoft-lsp/commit/3f0fac4d589675d931a955b28946f8b306c611c8))



# [7.7.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.6.1...v7.7.0) (2025-01-16)


### Bug Fixes

* Cannot run multiple workflows in parallel ([91ef4a1](https://github.com/khulnasoft/khulnasoft-lsp/commit/91ef4a1a4fc8f5e574daba9c84f0b8b7c4660a91))
* disable binary files in context search results ([5e70810](https://github.com/khulnasoft/khulnasoft-lsp/commit/5e70810e59ff65c67f7a921cf6d76540ea6bf08a))
* send information about failing CS API requests to clients ([1c59e51](https://github.com/khulnasoft/khulnasoft-lsp/commit/1c59e51a79fe88ec08f117bed142c68b571549b4))


### Features

* Duo Workflow - change intermediate to junior tasks ([73cbd13](https://github.com/khulnasoft/khulnasoft-lsp/commit/73cbd13d245cc4fa8e76720cc23b370459756370))
* Duo Workflow - Fix Workflow chat styling issues ([f2112e9](https://github.com/khulnasoft/khulnasoft-lsp/commit/f2112e9c18d05f4fee4451dca26d636e19a56e3d))
* fine-grained docker health checks ([dc451a9](https://github.com/khulnasoft/khulnasoft-lsp/commit/dc451a9ce7cb08a692a867b2a706b180b9318d8f))
* Update new workflow page with should haves ([113b93f](https://github.com/khulnasoft/khulnasoft-lsp/commit/113b93f5b147293f2d518b0e3a22a22d9b5cb945))



## [7.6.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.6.0...v7.6.1) (2025-01-13)



# [7.6.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.5.0...v7.6.0) (2025-01-13)


### Features

* use secondary color for tool messages ([517773a](https://github.com/khulnasoft/khulnasoft-lsp/commit/517773aded11837e88b917b893c6579d5adc387f))



# [7.5.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.4.0...v7.5.0) (2025-01-09)


### Bug Fixes

* don't apply code suggestions lang checks for duo chat ([d2ab717](https://github.com/khulnasoft/khulnasoft-lsp/commit/d2ab717baea3ea2e9570e4da9318bbdd3b1b04ec))
* get KhulnaSoft version when first validating version of configured url ([2b4caf4](https://github.com/khulnasoft/khulnasoft-lsp/commit/2b4caf4ac1175d70e6faefe6262927a0c8652d0d))
* Prevent double initialState notifications ([f6ab84a](https://github.com/khulnasoft/khulnasoft-lsp/commit/f6ab84aa3e07e780db4c996b78a7866a1a4f25e4))


### Features

* add docker health check ([d51ff3d](https://github.com/khulnasoft/khulnasoft-lsp/commit/d51ff3df41aa7789f3113efb6cc710ca315695cb))
* add scan error messages ([245a09b](https://github.com/khulnasoft/khulnasoft-lsp/commit/245a09b8b48c2a096f5e445a0447eac43415c26a))
* apply secret redaction to all ai context items ([1fd1eba](https://github.com/khulnasoft/khulnasoft-lsp/commit/1fd1ebaa855ee9acb1c86a19f7768f223b1c5f74))
* Code Generation Server Sent Events ([f73bd7b](https://github.com/khulnasoft/khulnasoft-lsp/commit/f73bd7b10a78a267e82715bf8d60e052fc194f44))
* Minimal UI for Duo Workflow ([e73640c](https://github.com/khulnasoft/khulnasoft-lsp/commit/e73640c6356684239b9bf5edc43a9ad31120fcab))
* style prose messages different from tool ([d823b8f](https://github.com/khulnasoft/khulnasoft-lsp/commit/d823b8fe9299ab70863c23da65d579231d293386))
* Update new workflow page with must haves ([ed0ed38](https://github.com/khulnasoft/khulnasoft-lsp/commit/ed0ed38cfeceba97a73bafe6d15afd59f6ee74c6))



# [7.4.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.3.0...v7.4.0) (2024-12-10)


### Bug Fixes

* correctly handle workspace changes ([2718020](https://github.com/khulnasoft/khulnasoft-lsp/commit/27180201b40cb34a7ff84dda77030b2f94577e56))
* event when stopping workflow ([0dc2455](https://github.com/khulnasoft/khulnasoft-lsp/commit/0dc245525085318749930d3f9c7f759777d54617))
* handle connection errors from docker ([aaf9d26](https://github.com/khulnasoft/khulnasoft-lsp/commit/aaf9d2641fc0b5af44631edc996309ebc99ca4c1))
* use safe operator on tool use ([9ca5fcd](https://github.com/khulnasoft/khulnasoft-lsp/commit/9ca5fcd0e4490a559832f59987f81254c3e25ddd))


### Features

* Add `stopped` duo workflow status ([b4bedaa](https://github.com/khulnasoft/khulnasoft-lsp/commit/b4bedaad710933776d31b459a002bf3c6a8bf69b))
* add new duo chat available features context policy ([a9b308f](https://github.com/khulnasoft/khulnasoft-lsp/commit/a9b308f973bc7d3642e7b61f06f9c2d2e655c76a))
* fail workflow if executor exits badly ([e659044](https://github.com/khulnasoft/khulnasoft-lsp/commit/e65904490b1426d679ea76019dea6c11301b1392))
* update vulnerability details webview styling ([aedcaaa](https://github.com/khulnasoft/khulnasoft-lsp/commit/aedcaaa054d7872d32799f8c263b35adca677f8b))



# [7.3.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.2.0...v7.3.0) (2024-12-04)


### Features

* **ai-context:** LocalGitContextProvider ([77ccaba](https://github.com/khulnasoft/khulnasoft-lsp/commit/77ccabad81b0a9929d5c83d2521ada8882e545df))
* create new webview for security vulnerability details ([fe7fabb](https://github.com/khulnasoft/khulnasoft-lsp/commit/fe7fabb383868480952f4e899c39ac18fc28dba1))



# [7.2.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.1.1...v7.2.0) (2024-12-03)


### Bug Fixes

* Add Duo Workflow components theming support ([c0272e4](https://github.com/khulnasoft/khulnasoft-lsp/commit/c0272e44354511761bd21f367d44fc107373294a))
* Fix workflow events ([407fe3d](https://github.com/khulnasoft/khulnasoft-lsp/commit/407fe3d55c5fddd7c1b499019bdb781f3cf7a8c1))


### Features

* Add Duo Workflow health checks ([f01f0cf](https://github.com/khulnasoft/khulnasoft-lsp/commit/f01f0cf328a618166c4b8499479b4f12e08797d2))
* Add exception handling for Workflow controllers ([1b2800b](https://github.com/khulnasoft/khulnasoft-lsp/commit/1b2800b692ed97f28e9b9aa03e900b7fa51f0198))
* display tool use messages instead workflow ([caaba7f](https://github.com/khulnasoft/khulnasoft-lsp/commit/caaba7fd2047f8960509fd2f778884b9e30690b5))
* Implement workflow stop message ([baea947](https://github.com/khulnasoft/khulnasoft-lsp/commit/baea9470e37879913122e8fcf85cd77d8f2c61ab))
* Improve Workflow empty state ([56815f9](https://github.com/khulnasoft/khulnasoft-lsp/commit/56815f91a223d91ab1a0a341edfa39f6fccc05c5))



## [7.1.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.1.0...v7.1.1) (2024-11-26)


### Bug Fixes

* increase max number of listeners to remove EventEmitter warning ([4256313](https://github.com/khulnasoft/khulnasoft-lsp/commit/4256313d6b35fa8e1787876539464c41695d12be))
* Log telemetry enabled/disabled only once in CS Snowplow tracker ([30475b4](https://github.com/khulnasoft/khulnasoft-lsp/commit/30475b4a48ae8292879a365bd354632018c3853b))



# [7.1.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v7.0.0...v7.1.0) (2024-11-22)


### Bug Fixes

* make sure initialization errors get logged ([a383159](https://github.com/khulnasoft/khulnasoft-lsp/commit/a383159145f24fbf0b9984cc46d20dc48a201274))
* remove false-positive additional languages warning logs ([1f29b7d](https://github.com/khulnasoft/khulnasoft-lsp/commit/1f29b7d7b02b300020c3542be2a5fea94067c438))
* Vue.use local error due to VueRouter ([c06f35a](https://github.com/khulnasoft/khulnasoft-lsp/commit/c06f35ac5a7bba82c95cf2c5ea9c507794adad59))


### Features

* Add KhulnaSoft's standard context builder ([e1838ff](https://github.com/khulnasoft/khulnasoft-lsp/commit/e1838ff03a82e5459f587622c394b856899b1e11))
* Quick chat telemetry ([dd9d117](https://github.com/khulnasoft/khulnasoft-lsp/commit/dd9d117fcafa5ca3f4b6be37c15a9bd4aed90ff2))
* Show only current project workflows ([f529d98](https://github.com/khulnasoft/khulnasoft-lsp/commit/f529d98360091a6fa40c06316f7f63251feeaf2c))



# [7.0.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.17.0...v7.0.0) (2024-11-18)


### Code Refactoring

*  Extract `telemetryNotificationHandler` to a separate class ([c082408](https://github.com/khulnasoft/khulnasoft-lsp/commit/c0824086e6c77ae7fca784a455ac2a5e4aec6773))


### BREAKING CHANGES

* Instead of exporting the constant with the telemetry notification method
We now export `TelemetryNotificationType` that will check the payload of the notification
for the type safety



# [6.17.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.16.0...v6.17.0) (2024-11-17)


### Features

* add authentication required check for Chat and Code Suggestions ([3c0ebe0](https://github.com/khulnasoft/khulnasoft-lsp/commit/3c0ebe027f38e0650d399125eca825329041dc76))
* Show workflow relative time instead of iso ([5539438](https://github.com/khulnasoft/khulnasoft-lsp/commit/553943846e9afee62350efd7da10c7aedd1d9b8e))



# [6.16.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.15.0...v6.16.0) (2024-11-15)


### Features

* add custom notification for remote security scan ([329b20c](https://github.com/khulnasoft/khulnasoft-lsp/commit/329b20c941d9d6bd27bc31f9bc4716ee2ad085a7))
* create new custom security scan response notification ([6e03c0c](https://github.com/khulnasoft/khulnasoft-lsp/commit/6e03c0c2fc177b3e1c6dcff7a225b0981d4f891d))
* Include all features in configuration validation response ([bcd3fd8](https://github.com/khulnasoft/khulnasoft-lsp/commit/bcd3fd8d9ae38fff5a363fbf99d093fcb3509359))
* validate Code Suggestions for unsaved configuration ([042a68b](https://github.com/khulnasoft/khulnasoft-lsp/commit/042a68b497c8646d508cc64b6776e7e185e0ba75))
* **workflow:** communicate initial state to webview ([db25c44](https://github.com/khulnasoft/khulnasoft-lsp/commit/db25c440d15ea7d8d8ce99f7b358b9998a391d71))



# [6.15.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.14.0...v6.15.0) (2024-11-13)


### Features

* add `issue` context provider ([5cfd460](https://github.com/khulnasoft/khulnasoft-lsp/commit/5cfd460eb05fae46c2469528efe4502ce04c7080))
* allow users to send messages to duo workflow ([4eccab0](https://github.com/khulnasoft/khulnasoft-lsp/commit/4eccab0b7523c96c12c751ab1deb816dd0edc1fd))
* Include project path in Code Suggestions streaming request ([ab72dcb](https://github.com/khulnasoft/khulnasoft-lsp/commit/ab72dcb27ebf9518367cd21b7691856a4358ee7e))
* Validate chat feature based on unsaved configuration ([d0252bb](https://github.com/khulnasoft/khulnasoft-lsp/commit/d0252bb7eec7ce782485d04e276fa1bbbccd6664))



# [6.14.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.13.0...v6.14.0) (2024-11-12)


### Bug Fixes

* directory path handling in RepositoryService ([c1490ca](https://github.com/khulnasoft/khulnasoft-lsp/commit/c1490ca078974f054794a7c8e739f0cca2f1f375))
* high CPU utilization in RepositoryService ([29dbf2b](https://github.com/khulnasoft/khulnasoft-lsp/commit/29dbf2b44bf5208e0e06d30a9b8295d1c4da17a3))
* local logs show error details ([461c406](https://github.com/khulnasoft/khulnasoft-lsp/commit/461c40661f5cf5ffd5a9ca260b862ba17a6a2483))
* Resolve "integration tests locally overrides global git config" ([178da28](https://github.com/khulnasoft/khulnasoft-lsp/commit/178da2855874da6c2dfbc35dfe4b8c4f403bdb5b))
* Simplify workflow legal alert ([1a0299a](https://github.com/khulnasoft/khulnasoft-lsp/commit/1a0299abdf17acf46c12ef20624762f2106a2e53))
* truncate MR data based on byte size instead of characters ([4d7adbf](https://github.com/khulnasoft/khulnasoft-lsp/commit/4d7adbf1414685117860e365a114998456f82fdf))
* **workflow:** fixed the router for inner routes ([010aec6](https://github.com/khulnasoft/khulnasoft-lsp/commit/010aec651cf8bf0ab623592c3755251b7f165a5e))


### Features

* Add action buttons to Workflow execution panel ([a4772de](https://github.com/khulnasoft/khulnasoft-lsp/commit/a4772de23717c664dd77a6b36f70f7d686d64440))
* Add chat disabled by user check ([1066251](https://github.com/khulnasoft/khulnasoft-lsp/commit/10662510bff23154254d4fe95193f7ffc50ef1ed))
* add instance and token info to the context ([04989e9](https://github.com/khulnasoft/khulnasoft-lsp/commit/04989e9a6290edf6c69c1be3ea3f6e400cee41a8))
* add merge_request context provider ([ea53391](https://github.com/khulnasoft/khulnasoft-lsp/commit/ea5339175f2a6a4a63d56baf3b7ff9fd5cd147e9))
* Add skeleton loader for execution section ([086acef](https://github.com/khulnasoft/khulnasoft-lsp/commit/086acefdaff9bbb0b11ea78d5febc4051b9fc18f))
* add system information to panic errors ([9cd60fa](https://github.com/khulnasoft/khulnasoft-lsp/commit/9cd60fa41bca551e7f274589614e4c878266e703))
* add user information to error context ([400c8ad](https://github.com/khulnasoft/khulnasoft-lsp/commit/400c8ad99b2bd1f0f9f3deba447ba62b8eacd263))
* align, dress up docker image loading message ([622e305](https://github.com/khulnasoft/khulnasoft-lsp/commit/622e305ece4fc1ca25593cb1f60460446fe893dd))
* Allow specifying baseUrl and token for api requests ([9e5f179](https://github.com/khulnasoft/khulnasoft-lsp/commit/9e5f1798d95b589fa17b469e74afad08b2150cd1))
* Implement confirmation modal for the workflow cancel action ([2c2b2a0](https://github.com/khulnasoft/khulnasoft-lsp/commit/2c2b2a038f67a20f62f0a4bf107ec713ff50ef8d))
* Support proxy authentication against HTTP proxies ([718b913](https://github.com/khulnasoft/khulnasoft-lsp/commit/718b913a24d3d70c8cd7e518dcca6f9413f54d03))
* use duo chat components for workflow chat ([0fbf509](https://github.com/khulnasoft/khulnasoft-lsp/commit/0fbf5096765ab2f61bdf32439ab88f386a147c26))
* use KhulnaSoft UI for breadcrumbs for workflow ([b434adf](https://github.com/khulnasoft/khulnasoft-lsp/commit/b434adf47e4af168d34c7ed80386069f3589cff7))
* **workflow:** handle setInitialState notification ([468a07c](https://github.com/khulnasoft/khulnasoft-lsp/commit/468a07c33bb3abd23a0b429b0e1b8afdfbb6799b))
* **workflow:** pick up theming from VSCode ([3482b60](https://github.com/khulnasoft/khulnasoft-lsp/commit/3482b6011e03ec351c77eed80b42e25afed781da))



# [6.13.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.12.0...v6.13.0) (2024-10-22)


### Bug Fixes

* Instance telemetry `suggestion_size` should not be tracked as 0 ([c6d6a3a](https://github.com/khulnasoft/khulnasoft-lsp/commit/c6d6a3af0bba6614e6d3d42b24b1aba5e3bb93d9))
* Update workflow goal help text and placeholder ([25a5187](https://github.com/khulnasoft/khulnasoft-lsp/commit/25a51874e22640d875789b475d211647e70f4a24))
* validate length of duo workflow prompt ([122f62d](https://github.com/khulnasoft/khulnasoft-lsp/commit/122f62dd1ca9ff18e9435c82a5b1015fd8bdf83e))


### Features

* Add code suggestions disabled by user check ([6964030](https://github.com/khulnasoft/khulnasoft-lsp/commit/6964030d771e4af70cde3e1129d0e5667bb46706))
* Add Duo Chat user license check ([d28c24d](https://github.com/khulnasoft/khulnasoft-lsp/commit/d28c24d8330eaf17d9b8fb7927da3213bf1869a4))
* Move feedback form to goal section ([29da5b8](https://github.com/khulnasoft/khulnasoft-lsp/commit/29da5b8ef6d5f360ac311c424be97e1f163ee2fb))
* Support validate configuration authentication ([c66890d](https://github.com/khulnasoft/khulnasoft-lsp/commit/c66890d4364f05ff14002b8bd6569c7e1263df70))
* Update Execution panel styling ([93b1dc0](https://github.com/khulnasoft/khulnasoft-lsp/commit/93b1dc06edfab21b5f41726944110032db82fc6d))
* Update the workflow goal panel ([8077fe4](https://github.com/khulnasoft/khulnasoft-lsp/commit/8077fe43a663136de37391da9fa259f665e3aed3))



# [6.12.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.11.0...v6.12.0) (2024-10-15)


### Bug Fixes

* Fix context loss when notification handler added ([f3f98dd](https://github.com/khulnasoft/khulnasoft-lsp/commit/f3f98dd1214c00d0dc0948fd9c7200bffca441ad))


### Features

* add dependency library context provider ([c5b7d92](https://github.com/khulnasoft/khulnasoft-lsp/commit/c5b7d9254371a53a50146b610d6a11d752be27fa))
* update workflow status after cancel ([2123c94](https://github.com/khulnasoft/khulnasoft-lsp/commit/2123c943f83803f276fe01357e2d9946761fc2d8))
* Workflow details - Collapse goal section when running workflow ([0669f34](https://github.com/khulnasoft/khulnasoft-lsp/commit/0669f34751389eb471fe770daa611d79da3d8a05))



# [6.11.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.10.0...v6.11.0) (2024-10-11)


### Bug Fixes

* make AIContextManager and AIContextProvider async ([af1333e](https://github.com/khulnasoft/khulnasoft-lsp/commit/af1333ec6a494498dd4520c2ea4cbbdbdfe50bb6))
* prevent incorrect async throttling of context providers ([22df6cb](https://github.com/khulnasoft/khulnasoft-lsp/commit/22df6cbf26c0affbaf6cd93e78356a58cdbcddd9))


### Features

* allow loading context item content ([c1f4f13](https://github.com/khulnasoft/khulnasoft-lsp/commit/c1f4f1390aa88d4ed2af6f7fa299d02481705dcd))
* cancel duo workflow by stopping container ([8922c76](https://github.com/khulnasoft/khulnasoft-lsp/commit/8922c769e930ccab5d9dd972f5179bfcae1b6894))
* **context:** introduced AI Context Policy ([bc2abb8](https://github.com/khulnasoft/khulnasoft-lsp/commit/bc2abb8c303a94ffaa3e8def5dfa80135467e149))
* Duo Workflow - Update default message ([18b8916](https://github.com/khulnasoft/khulnasoft-lsp/commit/18b8916b8822b1f4cb152063ce7c0c8db33ae7ac))
* **duochat:** Introduce syntax highlighting while streaming ([72557f7](https://github.com/khulnasoft/khulnasoft-lsp/commit/72557f764673be957316d754ed390a0172c8c07f))
* Show workflow goal on load ([68b9264](https://github.com/khulnasoft/khulnasoft-lsp/commit/68b926485b6ce276594b4a58931b031065adaa31))



# [6.10.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.9.1...v6.10.0) (2024-10-03)


### Bug Fixes

* ensure feature flags exist before initVirtualFilesystem ([e79b490](https://github.com/khulnasoft/khulnasoft-lsp/commit/e79b490588bfb7a96121f7720cdd00afd1089383))
* subscriptions not working on new workflows ([be4454d](https://github.com/khulnasoft/khulnasoft-lsp/commit/be4454d8e23eabe7dad06b37e892ea6d82585229))


### Features

* Code suggestions in unsaved files ([4377378](https://github.com/khulnasoft/khulnasoft-lsp/commit/4377378972afc66b84eb18c045cee263c66c8cf1))



## [6.9.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.9.0...v6.9.1) (2024-10-02)


### Bug Fixes

* move tree-sitter modules to optional dependencies ([53e9dca](https://github.com/khulnasoft/khulnasoft-lsp/commit/53e9dca8be7ed1a2925728b2b88520cdd33d81a9))
* workaround for config/FF race condition in repository init ([18c6d33](https://github.com/khulnasoft/khulnasoft-lsp/commit/18c6d33984223291fb919c91b4af5ab375b48ee4))



# [6.9.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.8.1...v6.9.0) (2024-10-01)


### Bug Fixes

* make VirtualFileSystemService use didChangeWatchedFiles ([fe4100b](https://github.com/khulnasoft/khulnasoft-lsp/commit/fe4100b3a476e9c552dd522a0a6ce022a28efbf0))
* Stop Workflow subscriptions when unused ([95d1be2](https://github.com/khulnasoft/khulnasoft-lsp/commit/95d1be21c1efda3c38c6fb48af55632f3019614d))
* support osx shortcuts ([067ce33](https://github.com/khulnasoft/khulnasoft-lsp/commit/067ce339efd76f1304a0ebff66f482717e6100ff))


### Features

* add ability to check API projects for Duo access ([30db7e1](https://github.com/khulnasoft/khulnasoft-lsp/commit/30db7e142a1f20bd309343655a799027e95f956a))
* add utilities for parsing/making GraphQL global IDs ([efdc45e](https://github.com/khulnasoft/khulnasoft-lsp/commit/efdc45ed57d7713746dc90313b46560399c33a83))
* **context:** notify when finished indexing ([d64fe7c](https://github.com/khulnasoft/khulnasoft-lsp/commit/d64fe7c5709cb964deac3cbb505a17b2f2fdfdc3))
* pass goal when creating workflow ([a981902](https://github.com/khulnasoft/khulnasoft-lsp/commit/a98190213363389f9b67c4b413554987e84a6050))
* pull Duo Workflow image before running ([e5b0e16](https://github.com/khulnasoft/khulnasoft-lsp/commit/e5b0e161372561b8561e1f2908e29183a92c1b11))
* use Workflow status instead of checkpoint ([c988838](https://github.com/khulnasoft/khulnasoft-lsp/commit/c9888388ddc41a1afee008025b75ac7638c9a35b))



## [6.8.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.8.0...v6.8.1) (2024-09-25)


### Bug Fixes

* add debounce to LocalFilesContextPovider ([52dbf13](https://github.com/khulnasoft/khulnasoft-lsp/commit/52dbf13ea66adb04b8d5c7a7d166ee7082b78857))



# [6.8.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.7.2...v6.8.0) (2024-09-23)


### Bug Fixes

* add feature flag to VirtualFileSystemService to disable chokidar ([06f64c5](https://github.com/khulnasoft/khulnasoft-lsp/commit/06f64c5484b054f7716b5440c8f307d691e2c3d5))
* Duo Workflow error alert not dismissable ([bdf1356](https://github.com/khulnasoft/khulnasoft-lsp/commit/bdf1356a498f574801224fb7190a261358c5280d))
* Re-subscribe to workflow events when loading ([a8d39a2](https://github.com/khulnasoft/khulnasoft-lsp/commit/a8d39a22fc49906d01e62d6cea4f34277e57d6ce))
* Update `non-gitlab-project` detection ([5df0255](https://github.com/khulnasoft/khulnasoft-lsp/commit/5df025570b64c9e53afc020f254b165e3d5ee21d))
* update disclaimer text ([c22163d](https://github.com/khulnasoft/khulnasoft-lsp/commit/c22163d3e72635df1a56f251ecf38c6e7959d107))


### Features

* invoking human events for Duo workflow ([215bd7c](https://github.com/khulnasoft/khulnasoft-lsp/commit/215bd7ce4cef1ffb9018fe373cdc78770dd1d54d))
* Update workflow checkpoint styling ([733381e](https://github.com/khulnasoft/khulnasoft-lsp/commit/733381e988be2b28a2f06a4661281233887b0871))



## [6.7.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.7.1...v6.7.2) (2024-09-19)


### Other

* Revert: Re-subscribe to workflow events when loading ([b0f6844](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/b0f68449f93aba6a5af31f6ac92e5a869e85ad87))



## [6.7.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.7.0...v6.7.1) (2024-09-18)


### Bug Fixes

* Re-subscribe to workflow events when loading ([4324da5](https://github.com/khulnasoft/khulnasoft-lsp/commit/4324da55033c4acdd6db2644b4a37b185038ae7c))
* windows fs/path fix ([ea447ef](https://github.com/khulnasoft/khulnasoft-lsp/commit/ea447ef48bda23fe5b44bd33b6d6aa94842c9b20))



# [6.7.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.6.1...v6.7.0) (2024-09-18)


### Bug Fixes

* specify fsevent.node binary directly ([0040151](https://github.com/khulnasoft/khulnasoft-lsp/commit/0040151ef5dcff184360e4b2e3e66e6e4412605c))


### Features

* add disclaimer to workflow ([60ff1ef](https://github.com/khulnasoft/khulnasoft-lsp/commit/60ff1efd0eade6a1e1bcb5c93e0ffc7e3b6e5f32))
* **ai-context:** Introduce the LocalFilesProvider - Injected Context ([a6e58e6](https://github.com/khulnasoft/khulnasoft-lsp/commit/a6e58e6d3dac13cd6b5e32b7b13e2b35b34dcc15))
* auto-scroll chat window ([b0f524e](https://github.com/khulnasoft/khulnasoft-lsp/commit/b0f524e73cc92c0ccbd09b548e62cecf04c1eacb))
* Move Duo Workflow feedback prompt to Execution section ([38abac6](https://github.com/khulnasoft/khulnasoft-lsp/commit/38abac657063f37b8d483f2b746957ddb6ca8a79))
* Workflow List: Show project fullpath instead of ID ([03247de](https://github.com/khulnasoft/khulnasoft-lsp/commit/03247ded94f2ff43567e25376479f404d8119fe3))



## [6.6.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.6.0...v6.6.1) (2024-09-17)



# [6.6.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.5.0...v6.6.0) (2024-09-12)


### Bug Fixes

* add model name and engine to cached suggestion telemetry ([db2cf8f](https://github.com/khulnasoft/khulnasoft-lsp/commit/db2cf8f6e28ba31c5a205d43c32c4e3eb76da4ab))
* Empty function detection for Vue files ([f14f9dd](https://github.com/khulnasoft/khulnasoft-lsp/commit/f14f9dd528e9242c1f0adb7651f1855efb52d81d))
* Move notifiers to `onInitialized` handler ([224c2ed](https://github.com/khulnasoft/khulnasoft-lsp/commit/224c2ed48bdbfb928ee1aacafa8dd17fe4a2b7ce))
* respect duo_additional_context feature flag ([5089d6c](https://github.com/khulnasoft/khulnasoft-lsp/commit/5089d6ca2f26a56065d5e4bb3b74e2d6d2387d2b))


### Features

* Add Duo Workflows page ([c7f82a9](https://github.com/khulnasoft/khulnasoft-lsp/commit/c7f82a9c7cd47fddfd4417e2248e57bc8a1962e4))
* **ai-context:** implement open tabs as provider ([a805c2d](https://github.com/khulnasoft/khulnasoft-lsp/commit/a805c2da93682b6fe702cbb5f1ebecae63147f0c))
* pass git arguments to workflow executor ([8be67fb](https://github.com/khulnasoft/khulnasoft-lsp/commit/8be67fb1d90cd11a6091df0a8f034e209cbd5841))



# [6.5.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.4.0...v6.5.0) (2024-09-10)


### Bug Fixes

* log the expected direct connection failures as info ([ce517ae](https://github.com/khulnasoft/khulnasoft-lsp/commit/ce517aec36034cefb73a9374c82d01f3c8cb871a))


### Features

* Add Code suggestions license check ([94b3b9f](https://github.com/khulnasoft/khulnasoft-lsp/commit/94b3b9f07717646eb242ab3082a8f0fd32973d37))
* Add Minimal KhulnaSoft instance version check for Code Suggestions ([bc9ccdf](https://github.com/khulnasoft/khulnasoft-lsp/commit/bc9ccdf12525d6b9675073b3de989b3ae963f5fc))
* adjust default duo workflow goal ([2b896d5](https://github.com/khulnasoft/khulnasoft-lsp/commit/2b896d563672b73615547eedcf67e26d1d237493))
* **ai-context:** Added getProviderCategories() to the manager ([00e2913](https://github.com/khulnasoft/khulnasoft-lsp/commit/00e2913f183a15b1f4c4e9c2679536f4417df003))
* show chat messages from duo workflow ([c712c64](https://github.com/khulnasoft/khulnasoft-lsp/commit/c712c642c40f876beb9039393fb57c3b5190f709))



# [6.4.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.3.0...v6.4.0) (2024-09-04)


### Bug Fixes

* Initialise notifiers only when connection is initialised ([97f385b](https://github.com/khulnasoft/khulnasoft-lsp/commit/97f385b82803e3c163b41ffb92d0a5be93092710))


### Features

* added AI Context Management ([a33e44e](https://github.com/khulnasoft/khulnasoft-lsp/commit/a33e44eb23aeebc99cf3059ac52519b20471e826))
* Detect "language" for telemetry event ([f5a24ce](https://github.com/khulnasoft/khulnasoft-lsp/commit/f5a24ce3f22b04a06b9994bb9dccbb57362efd25))
* show executing duo workflow steps ([75c3c59](https://github.com/khulnasoft/khulnasoft-lsp/commit/75c3c59a972de2f0e97dbb359af334780ca3c3ee))
* subscribe to do workflow events ([9e7bd53](https://github.com/khulnasoft/khulnasoft-lsp/commit/9e7bd5379e0bae31847c066faf13be622c0fcaf8))



# [6.3.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.2.0...v6.3.0) (2024-08-28)


### Features

* **security:** Post-process schema URLs in code suggestions ([d323d32](https://github.com/khulnasoft/khulnasoft-lsp/commit/d323d32d1a19f72f0d1da31f84f2a4c480b3ab69))



# [6.2.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.1.0...v6.2.0) (2024-08-27)

We renamed some notification types that temporarily break VS Code Extension build but otherwise aren't breaking changes [refactor: persistent streaming handler](https://github.com/khulnasoft/khulnasoft-lsp/-/merge_requests/698)

### Features

* Detect intent "generation" in empty functions in Python ([d590006](https://github.com/khulnasoft/khulnasoft-lsp/commit/d590006940cd94c4be80c5b536b84ddf9cb8c836))



# [6.1.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v6.0.0...v6.1.0) (2024-08-22)


### Bug Fixes

* Apply default sort on workflow checkpoints returned by GQL API ([31ddd94](https://github.com/khulnasoft/khulnasoft-lsp/commit/31ddd9428198ab0e87c01749c574311771023026))
* Check supported language only on `setDocumentActive` event ([e37c506](https://github.com/khulnasoft/khulnasoft-lsp/commit/e37c506edd2099300e5f718d86e70aac44e37984))


### Features

* add link to duo workflow feedback form ([43519ed](https://github.com/khulnasoft/khulnasoft-lsp/commit/43519eda98ef462561a7a312f94b77c3eb1a1069))
* add Duo disabled for project check([ec8061c](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/ec8061c8b59ce940dab91bb09bf06792ff45bd80))


# [6.0.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v5.0.0...v6.0.0) (2024-08-20)


### Bug Fixes

* only notify on actual changes to LanguagesService ([aeceee3](https://github.com/khulnasoft/khulnasoft-lsp/commit/aeceee3fb2cc23e3423ff40e964614715dfca7b6))


### Features

* add new state notification for disabled language ([04db755](https://github.com/khulnasoft/khulnasoft-lsp/commit/04db75521ac7017d358e5c6def04c0804e3eadf3))
* Duo Workflow fetch workflow token ([3ee23f9](https://github.com/khulnasoft/khulnasoft-lsp/commit/3ee23f9b0f5bee5c3ba39961c3df3cef103a837d))
* initial port of duo chat from vscode ([f9ce04e](https://github.com/khulnasoft/khulnasoft-lsp/commit/f9ce04e288196fc1cfceda7017b95d68240482f5))
* normalize invalid "additionalLanguages" identifiers ([3e327ea](https://github.com/khulnasoft/khulnasoft-lsp/commit/3e327ead55ef61611ab4d8e8460f07f88ad51bcd))
* reduce suggestion debounce from 300ms to 250ms ([bd098b3](https://github.com/khulnasoft/khulnasoft-lsp/commit/bd098b39fc8a50a72d60a976295627cb8b308d90))


### BREAKING CHANGES

* This adds a new possible value to the
`$/gitlab/featureStateChange` notification's first parameter:
`code-suggestions-document-disabled-language`.

Addresses
https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1430.



# [5.0.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.25.0...v5.0.0) (2024-08-16)


### BREAKING CHANGES

* We introduced Generic Features State Management ([4ecb109](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/4ecb109dfb5998431698a9b315c677bfe0543abb)) and removed support for the separate Code Suggestion State Management. This change resulted in modifications to the communication protocol between the Server and Client.
  * Removed `$/gitlab/codeSuggestions/stateChange` notification in favor of `$/gitlab/featureStateChange` [notification](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/4ecb109dfb5998431698a9b315c677bfe0543abb#6ddb0927a7a5641a4efb2ac4eb3a88ebf735ee4a_6_6).
  * The format of the payload sent in the notification is changed from [string value](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/4ecb109dfb5998431698a9b315c677bfe0543abb#6ddb0927a7a5641a4efb2ac4eb3a88ebf735ee4a_8_8) containing the identificator of the engaged check to the [array of objects]( https://github.com/khulnasoft/khulnasoft-lsp/-/commit/4ecb109dfb5998431698a9b315c677bfe0543abb#6ddb0927a7a5641a4efb2ac4eb3a88ebf735ee4a_9_8) of the [`FeatureState` type](https://github.com/khulnasoft/khulnasoft-lsp/-/commit/4ecb109dfb5998431698a9b315c677bfe0543abb#fd4ec37d4ecf1896c30e94088faeabfc25141235_0_22) each representing separate feature state.
    * For clients importing the `CodeSuggestionsLSState` type, the `CODE_SUGGESTION_STATE_CHANGE` constant, and the `CodeSuggestionAvailabilityStateChange` constant, these entities are no longer available.

# [4.25.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.24.0...v4.25.0) (2024-08-16)


### Bug Fixes

* send language server header for direct connection requests ([6d8a09e](https://github.com/khulnasoft/khulnasoft-lsp/commit/6d8a09e9f546d2e703b55beaecf05343c743b280))


### Features

* Setup duo workflow graphql service with polling ([7381a2e](https://github.com/khulnasoft/khulnasoft-lsp/commit/7381a2ee5c7dd57faf45a4786ebab5ed66872fe9))



# [4.24.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.23.2...v4.24.0) (2024-08-14)


### Features

* Add Workflow goal and execution component ([3cb5d60](https://github.com/khulnasoft/khulnasoft-lsp/commit/3cb5d60f3f39e9d686f11f2dede37437747e6284))
* switching between open tabs adds them to advanced context cache ([c00320a](https://github.com/khulnasoft/khulnasoft-lsp/commit/c00320a623eac03c6b97dc61d1c32fa6f3c916da))



## [4.23.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.23.1...v4.23.2) (2024-08-09)

* No functional changes, exposes additional arguments to language server ([!633](https://github.com/khulnasoft/khulnasoft-lsp/-/merge_requests/633))


## [4.23.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.23.0...v4.23.1) (2024-08-08)


### Bug Fixes

* include static webview assets in npm package ([b23797e](https://github.com/khulnasoft/khulnasoft-lsp/commit/b23797e759072133f18831fab48fccb54f6f9a6f))



# [4.23.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.22.0...v4.23.0) (2024-08-08)


### Bug Fixes

* intent detection within a block comment is now "completion" ([2b83e91](https://github.com/khulnasoft/khulnasoft-lsp/commit/2b83e9198918c8bc2616768ede9b3af5dc57fca1))


### Features

* add get webview info request handler ([682888a](https://github.com/khulnasoft/khulnasoft-lsp/commit/682888a0c53fc69d35520b1c371294befe980734))
* Add more  Tree Sitter parsers and queries ([2d34ae1](https://github.com/khulnasoft/khulnasoft-lsp/commit/2d34ae1665fbe265e2bef225c0291b098dd6eaae))
* Detect intent 'generation' for empty functions in Ruby ([50acd75](https://github.com/khulnasoft/khulnasoft-lsp/commit/50acd75640b086db88ed8ecf56539ba98ae69954))
* **workflow:** added Duo Workflow webview ([5ef08cf](https://github.com/khulnasoft/khulnasoft-lsp/commit/5ef08cf17bd1a1a720eab198f5708d744bb047d7))



# [4.22.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.21.1...v4.22.0) (2024-08-05)


### Bug Fixes

* reintroduce notifications export ([c839445](https://github.com/khulnasoft/khulnasoft-lsp/commit/c8394452ed5346b045b01e67584f97617eca8708))
* revert !592 ([34af686](https://github.com/khulnasoft/khulnasoft-lsp/commit/34af6861c0557e69046c3800f754facd2b4215a1))
* send completion intent when cursor is on an empty comment ([32ef6ab](https://github.com/khulnasoft/khulnasoft-lsp/commit/32ef6ab5119e7c5d9232a2d8fe9e21c1f48a19e8))


### Features

* add documents to advanced context when switching tabs ([7893f5f](https://github.com/khulnasoft/khulnasoft-lsp/commit/7893f5f9740d337296cf802c2d7259de7ff6b9e6))
* Add tree sitter parsers ([1befe4d](https://github.com/khulnasoft/khulnasoft-lsp/commit/1befe4d64490dc074bf5dc19abd3a2df8d91e4ac))
* call the create workflow API ([ba3dd60](https://github.com/khulnasoft/khulnasoft-lsp/commit/ba3dd600af85ad699ef942b18626e55ee54373e2))
* Track `gitlab_instance_version` in Snowplow telemetry ([5ac3029](https://github.com/khulnasoft/khulnasoft-lsp/commit/5ac3029e311e3f4547521b1d0b2b168753e0792c))



## [4.21.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.21.0...v4.21.1) (2024-07-26)

- fixing package.json dependencies definitions that were blocking upgrading LS in VS Code Extension

# [4.21.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.20.1...v4.21.0) (2024-07-26)


### Bug Fixes

* Cache `additionalContexts` to improve telemetry ([28de354](https://github.com/khulnasoft/khulnasoft-lsp/commit/28de35407db690f3753019c61603564ab184116c))


### Features

* allow server to specify model provider/name for direct connect ([1f3912b](https://github.com/khulnasoft/khulnasoft-lsp/commit/1f3912bd9f372add1f79b322a4bc270540e0255f))



## [4.20.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.20.0...v4.20.1) (2024-07-16)


### Bug Fixes

* graphql-request should inherit fetch options ([2a2928c](https://github.com/khulnasoft/khulnasoft-lsp/commit/2a2928c64e7263b92a79bc34618e356c91a4a44f))



# [4.20.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.19.0...v4.20.0) (2024-07-12)


### Bug Fixes

* **advanced-context:** adjust-byte-size-limit ([b706d0e](https://github.com/khulnasoft/khulnasoft-lsp/commit/b706d0e9851dd536c9f9c2f42b6db6fde2efbd17))


### Features

* Detect intent 'generation' for empty functions ([5eac811](https://github.com/khulnasoft/khulnasoft-lsp/commit/5eac8119fb2e022f4c293d7bbf2f93fee66d5abf))
* Send CS telemetry to KhulnaSoft instance ([67a8567](https://github.com/khulnasoft/khulnasoft-lsp/commit/67a85676b336a63339e8cdf3dc235effde60ad17))



# [4.19.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.18.1...v4.19.0) (2024-07-10)


### Features

* adding the ability to start a workflow ([a881b5f](https://github.com/khulnasoft/khulnasoft-lsp/commit/a881b5f40b9f0cd7f0e83443321423501af5dee3))
* create shared package for webview application utils ([2db367e](https://github.com/khulnasoft/khulnasoft-lsp/commit/2db367e68653450b9e5d6419df1183b863221316))



## [4.18.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.18.0...v4.18.1) (2024-07-09)


### Bug Fixes

* include language in telemetry for cached suggestions ([b5d5188](https://github.com/khulnasoft/khulnasoft-lsp/commit/b5d518863a1e8380a9bfa0ef5ee5f88de019cf48))



# [4.18.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.17.0...v4.18.0) (2024-07-08)


### Features

* **advancedcontext:** open tabs context editor setting ([802d007](https://github.com/khulnasoft/khulnasoft-lsp/commit/802d007b1c5bb2f8e0d9f69ab7f27da18944a290))
* support disabling of languages ([77a4164](https://github.com/khulnasoft/khulnasoft-lsp/commit/77a41643274aa2c974254c186846185d88533a6e))
* Track language server version in bundle ([0234506](https://github.com/khulnasoft/khulnasoft-lsp/commit/0234506247bface338623b655f85651c3a5b8c76))



# [4.17.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.16.0...v4.17.0) (2024-07-03)


### Bug Fixes

* Fix reporting telemetry events registered by the client ([efda0f2](https://github.com/khulnasoft/khulnasoft-lsp/commit/efda0f2887f999fead601c6bac11c5f16411cfb8))


### Features

* intent detection for small files ([042eaa8](https://github.com/khulnasoft/khulnasoft-lsp/commit/042eaa875e92472b69f94cb55a6f0d7f5e9c3e9c))



# [4.16.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.15.0...v4.16.0) (2024-06-27)


### Bug Fixes

* pin web-tree-sitter to 0.20.8 for now ([0ccb5df](https://github.com/khulnasoft/khulnasoft-lsp/commit/0ccb5df1c14459ec6438178fb5546c2375852b0c))
* registering static resources + graceful shutdown with socket.io ([69a1d95](https://github.com/khulnasoft/khulnasoft-lsp/commit/69a1d95066cd6b937c17bf2fac5ae6c70dc134b4))


### Features

* Advanced cool down for direct connection suggestion requests ([5de4d18](https://github.com/khulnasoft/khulnasoft-lsp/commit/5de4d18bafc42e0d9db2cecb12f09be10798f41f))
* swap MRU cache for LRU cache and add size limit ([a534b28](https://github.com/khulnasoft/khulnasoft-lsp/commit/a534b286557b9c5988e811a5d5f489e6e6393e36))



# [4.15.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.14.0...v4.15.0) (2024-06-25)


### Bug Fixes

* Disable telemetry logging when telemetry is OFF ([77481b8](https://github.com/khulnasoft/khulnasoft-lsp/commit/77481b8341427efb5ade11c826db0261cfddaa1e))
* user_instruction should be sent in code suggestions request ([91c755b](https://github.com/khulnasoft/khulnasoft-lsp/commit/91c755bb50bc4a97ac07297fab6c5ba07e731ebb))


### Features

* include useful stacktraces with all errors ([a8517cd](https://github.com/khulnasoft/khulnasoft-lsp/commit/a8517cdf8dcde4f9938e088d5a0fcd5fada7debf))
* use HTTP keep-alive for direct connections ([f2d4a86](https://github.com/khulnasoft/khulnasoft-lsp/commit/f2d4a86695b2a75f2f6833d96345b9417735d94e))



# [4.14.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.13.2...v4.14.0) (2024-06-17)


### Features

* enable telemetry for tracking direct connection ([835af87](https://github.com/khulnasoft/khulnasoft-lsp/commit/835af87feea79b8ea31ff9ae132ec846e4985fcf))
* setup webview http endpoints ([5d5ddc0](https://github.com/khulnasoft/khulnasoft-lsp/commit/5d5ddc077adc8d63f273ea03cb7d2add70cf1d16))



## [4.13.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.13.1...v4.13.2) (2024-06-13)


### Bug Fixes

* correct instance FF ([3d812c2](https://github.com/khulnasoft/khulnasoft-lsp/commit/3d812c2a753baddbb672136420eeee28cb56d5a9))



## [4.13.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.13.0...v4.13.1) (2024-06-13)

* introduces [IDE: Call Cloud Connector directly instead of going through the monolith first](https://github.com/khulnasoft/khulnasoft-lsp/-/issues/183) behind `gitlab.featureFlags.codeSuggestionsClientDirectToGateway` feature flag

# [4.13.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.12.0...v4.13.0) (2024-06-12)


### Bug Fixes

* windows DuoProjectAccessCache for open file tabs ([c9796e5](https://github.com/khulnasoft/khulnasoft-lsp/commit/c9796e52c87e32108287d185f7b1fc84bbef4002))


### Features

* introduce 15s default timeout for requests ([8acd932](https://github.com/khulnasoft/khulnasoft-lsp/commit/8acd932e3bb2282195d9e1991062cd905393f0cd))
* setup webview transports ([741007a](https://github.com/khulnasoft/khulnasoft-lsp/commit/741007ada75570071054786bfe6ee3804d568713))



# [4.12.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.11.0...v4.12.0) (2024-06-07)


### Features

* Add telemetry for advanced context usage ([67f90ab](https://github.com/khulnasoft/khulnasoft-lsp/commit/67f90abe2f44ddb52e94898f2edb79a94cfc62e1))



# [4.11.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.10.0...v4.11.0) (2024-06-06)


### Features

* Add an Intel-based MacOS binary distribution ([62c22c8](https://github.com/khulnasoft/khulnasoft-lsp/commit/62c22c88f65a73945abfa4ae24cc05b8dc300579))
* Add fastify HTTP server ([e20698c](https://github.com/khulnasoft/khulnasoft-lsp/commit/e20698c226449a97656c3f5111c3d37e3d7b826b))
* add webview plugin abstraction package ([542fec2](https://github.com/khulnasoft/khulnasoft-lsp/commit/542fec288cb0e7d5abc90cdffb7faee69bbe1841))
* open file tabs advanced context resolver ([aca258a](https://github.com/khulnasoft/khulnasoft-lsp/commit/aca258a58dcf97995999c967b3d4c3cdc96ac67b))
* open file tabs api call ([6cb31d6](https://github.com/khulnasoft/khulnasoft-lsp/commit/6cb31d6f9969f85b7c1094ee487c8dbded2c4cb2))
* open file tabs file resolvers ([020746e](https://github.com/khulnasoft/khulnasoft-lsp/commit/020746e23bfe21fd77a623eaf80c3a3d16647969))
* open file tabs gitlab remote parser ([c0ff53b](https://github.com/khulnasoft/khulnasoft-lsp/commit/c0ff53b88d1bf5e594edea408017346a713401e2))
* open file tabs mru cache ([23b531e](https://github.com/khulnasoft/khulnasoft-lsp/commit/23b531e9c2d0ec8d7f025a9e4104c74ba82b876d))



# [4.10.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.9.0...v4.10.0) (2024-05-28)


### Bug Fixes

* override default config array values with client config ([c554a31](https://github.com/khulnasoft/khulnasoft-lsp/commit/c554a314886812dca14db97e89bae5f5f569b67a))


### Features

* Telemetry for multiple code suggestions ([54b7b3b](https://github.com/khulnasoft/khulnasoft-lsp/commit/54b7b3bab9384cb0178a9e555ec62b076760f0a5))



# [4.9.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.8.1...v4.9.0) (2024-05-23)


### Features

* cycle through suggestions ([e83513f](https://github.com/khulnasoft/khulnasoft-lsp/commit/e83513f789b01d308bd04ddb65991d43961bb1f2))



## [4.8.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.8.0...v4.8.1) (2024-05-21)



# [4.8.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.7.0...v4.8.0) (2024-05-21)


### Bug Fixes

* only set intent when generation is detected ([65987e2](https://github.com/khulnasoft/khulnasoft-lsp/commit/65987e2c46dfa261bc8cf81a713ea316c6be59ba))


### Features

* Add additional attributes to code suggestions telemetry ([2853f70](https://github.com/khulnasoft/khulnasoft-lsp/commit/2853f708812eafe6e646cf7630656087ce6014a1))
* better comment detection ([990b08c](https://github.com/khulnasoft/khulnasoft-lsp/commit/990b08c83140f2ada640e314b6ba133791186136))



# [4.7.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.6.0...v4.7.0) (2024-05-13)


### Bug Fixes

* Handle malformed user language setting for CS ([c849aa7](https://github.com/khulnasoft/khulnasoft-lsp/commit/c849aa7995676a59f6db382c58e6faf644b39bd9))



# [4.6.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.5.0...v4.6.0) (2024-05-09)


### Bug Fixes

* allow http proxy options for streaming calls ([1356152](https://github.com/khulnasoft/khulnasoft-lsp/commit/135615216c3ae2edf0a738e1d7129920fd4e60ee))
* initialize proxy before first token check ([89a6ddb](https://github.com/khulnasoft/khulnasoft-lsp/commit/89a6ddb56cd32d1a45d6ba953f1acdcbb50b4611))


### Features

* Allow to expand the list of languages for Code Suggestions ([476b1de](https://github.com/khulnasoft/khulnasoft-lsp/commit/476b1debfa9d4c2c80167a94cbbdbf7dbf8e8f37))



# [4.5.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.4.1...v4.5.0) (2024-05-06)



## [4.4.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.4.0...v4.4.1) (2024-04-16)

### Features

* Add status code to streamed suggestions telemetry ERROR events ([b5c0196](https://github.com/khulnasoft/khulnasoft-lsp/commit/b5c0196918356798e2e497728f09cbad0e0352cb))

### Bug Fixes

* Track streamed suggestion `language` ([d6ce9ea](https://github.com/khulnasoft/khulnasoft-lsp/commit/d6ce9ea01634e51597f3ba2cfb7f0fd25fc39ba6))



# [4.4.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.2.2...v4.4.0) (2024-04-12)

NOT RELEASED

# [4.3.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.2.2...v4.3.0) (2024-03-20)


### Features

* Enable streaming of code generation for Java files ([0e26db6](https://github.com/khulnasoft/khulnasoft-lsp/commit/0e26db6e2c93668fb516ed0f4e6db619236f2bc4))
* Streaming telemetry ([9919259](https://github.com/khulnasoft/khulnasoft-lsp/commit/9919259352a7720347f51f6572774798b89cc162))
* Update the code suggestions context to v2.6.0 ([7819cac](https://github.com/khulnasoft/khulnasoft-lsp/commit/7819cac7e53b379e8672d1f0414dcd78db88a148))



## [4.2.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.2.1...v4.2.2) (2024-03-04)


### Bug Fixes

* improve streaming error logging ([c6bf219](https://github.com/khulnasoft/khulnasoft-lsp/commit/c6bf2195adef27da49cdd8d5b3a358b36bc0dcea))



## [4.2.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.2.0...v4.2.1) (2024-03-01)


### Bug Fixes

* Remove stacktrace from logs omitting an error object ([2b23022](https://github.com/khulnasoft/khulnasoft-lsp/commit/2b2302280341de906d8210308df7a122c37ca3ec))



# [4.2.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.1.0...v4.2.0) (2024-03-01)


### Features

* improve HTTP error reporting ([fee28f3](https://github.com/khulnasoft/khulnasoft-lsp/commit/fee28f3f8e47d40888deb71d2f5983b1cded701f))



# [4.1.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v4.0.0...v4.1.0) (2024-02-29)


### Features

* Support configuration of http agent certificate options ([f1a37f9](https://github.com/khulnasoft/khulnasoft-lsp/commit/f1a37f9ce3b0a114f1619325e1c812375327c7f7))



# [4.0.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.33.0...v4.0.0) (2024-02-07)


### chore

* remove support for deprecated code suggestion endpoints ([a23a164](https://github.com/khulnasoft/khulnasoft-lsp/commit/a23a16495e19a9010e2a3bb905d6f77382297f5e))


### Features

* Add circuit breaking to streaming ([8123e20](https://github.com/khulnasoft/khulnasoft-lsp/commit/8123e2037e1f5ea01a22d86b3b49fc4b5ae11eae))


### BREAKING CHANGES

* Previously we used a different api endpoint
for the code suggestions whereas configured instance version
was lower than 16.3. That endpoint will soon become unavailable
and the code suggestion will be supported only for the versions >= 16.8.0



# [3.33.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.32.0...v3.33.0) (2024-01-25)



# [3.32.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.31.0...v3.32.0) (2024-01-16)


### Bug Fixes

* Support ignoring certificate errors ([59400e8](https://github.com/khulnasoft/khulnasoft-lsp/commit/59400e83afcff80d57aff7fa32ae42effdcabb0d))



# [3.31.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.30.0...v3.31.0) (2024-01-11)


### Features

* Move streaming decision to the LS ([bd7ec64](https://github.com/khulnasoft/khulnasoft-lsp/commit/bd7ec646f88ee386d5ab118c78d35b124ffa56e5))



# [3.30.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.29.1...v3.30.0) (2024-01-09)


### Bug Fixes

* Improve generation intent detection ([11ee891](https://github.com/khulnasoft/khulnasoft-lsp/commit/11ee8917534c0599d540457ac48d44c4b84fc5b4))



## [3.29.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.29.0...v3.29.1) (2024-01-05)



# [3.29.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.28.0...v3.29.0) (2023-12-21)


### Features

* Support Web IDE and VSCode browser environments ([42a5ee9](https://github.com/khulnasoft/khulnasoft-lsp/commit/42a5ee9e8aaaf553bcdbf5de81a98ba4c242627e))



# [3.28.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.27.1...v3.28.0) (2023-12-20)


### Features

* streaming debouncing ([4d74e18](https://github.com/khulnasoft/khulnasoft-lsp/commit/4d74e18ae168d28d7eea012af9127739d15536d2))



## [3.27.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.27.0...v3.27.1) (2023-12-19)


### Bug Fixes

* Catch async errors in streaming handler ([c04a228](https://github.com/khulnasoft/khulnasoft-lsp/commit/c04a228702d92b12eed99c59ce92edfd26016f6f))


### Features

* Detect completion intent ([9727729](https://github.com/khulnasoft/khulnasoft-lsp/commit/972772963ce2c6510e32b8e3f25b259a401d95e6))
* improve completion for neovim ([84b8376](https://github.com/khulnasoft/khulnasoft-lsp/commit/84b83768dc500f8b10ac2a2ced482f97d3896e8f))



# [3.27.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.26.0...v3.27.0) (2023-12-19)


### Bug Fixes

* Abstract away platform specific parser initialization ([d2b36a1](https://github.com/khulnasoft/khulnasoft-lsp/commit/d2b36a190e7b3c3b01096c84c17fb8f89afd75bf))


### Features

* **code_suggestions:** Added streaming to code suggestions ([04771d6](https://github.com/khulnasoft/khulnasoft-lsp/commit/04771d6611c76ba71f28f43a87eacde8378ed1fc))



# [3.26.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.25.0...v3.26.0) (2023-12-18)



# [3.25.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.24.2...v3.25.0) (2023-12-18)


### Bug Fixes

* Fix misplaced anchor ([cd9eaff](https://github.com/khulnasoft/khulnasoft-lsp/commit/cd9eaffb860a02c359ab28c502c87aaea21efecb))
* Promote dayjs to dependency from dev dependencies ([beb7188](https://github.com/khulnasoft/khulnasoft-lsp/commit/beb718833a40731253ac8e7c89af57e36e330913))


### Features

* **tree-sitter:** Assume suggestion intent based on completion context ([82317eb](https://github.com/khulnasoft/khulnasoft-lsp/commit/82317eb2f8f714f73c054cee05f415de6e72ae34))



## [3.24.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.24.1...v3.24.2) (2023-12-14)

### Bug fixes

* Reverts [d411ae7](https://github.com/khulnasoft/khulnasoft-lsp/commit/d411ae7c3c04273427a73750520ee0e0950b8855) as it caused a cache issue. ([c1c9d7e](https://github.com/khulnasoft/khulnasoft-lsp/commit/c1c9d7e5eef40cb2b3bf0c76fa4dc0b10c0a58d3))

## [3.24.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.24.0...v3.24.1) (2023-12-13)


### Bug Fixes

* Send abort signal to api ([d411ae7](https://github.com/khulnasoft/khulnasoft-lsp/commit/d411ae7c3c04273427a73750520ee0e0950b8855))



# [3.24.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.23.0...v3.24.0) (2023-12-12)


### Features

* Include project path in code suggestion requests ([b3be3e2](https://github.com/khulnasoft/khulnasoft-lsp/commit/b3be3e29216cfcf3e485897c72a8d7d96f0b9267))



# [3.23.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.22.0...v3.23.0) (2023-12-12)


### Features

* Do not request suggestion with completion context text mismatch ([4ba34cd](https://github.com/khulnasoft/khulnasoft-lsp/commit/4ba34cd07951117d08aa27711beadadb7ec232f4))



# [3.22.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.21.0...v3.22.0) (2023-12-08)


### Features

* **cache:** discard cache entries upon second retrieval ([ed8d2d7](https://github.com/khulnasoft/khulnasoft-lsp/commit/ed8d2d74c9cd676a4ab93beb48d540081d7500c6))
* Enable the Code Suggestions cache be default ([af8795a](https://github.com/khulnasoft/khulnasoft-lsp/commit/af8795a73242682660c30410d8be342096823422))
* Support execution through npx ([6fbe9f8](https://github.com/khulnasoft/khulnasoft-lsp/commit/6fbe9f8c7f97663c5a11599a1007f852fb34d3ec))



# [3.21.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.20.1...v3.21.0) (2023-12-08)


### Bug Fixes

* improve token check logging behavior ([7dd7d5d](https://github.com/khulnasoft/khulnasoft-lsp/commit/7dd7d5d79ad237b6f58225f3d6e66d5d0b851da7))


### Features

* add telemetry for cache hits ([e15443c](https://github.com/khulnasoft/khulnasoft-lsp/commit/e15443c231edaa7e521b617373230c38fba870f5))
* add timestamped and formatted logger ([de06343](https://github.com/khulnasoft/khulnasoft-lsp/commit/de063432f51ba9d9221262541d361bf61df66ac4))
* assume token type by length heuristic during token check ([b679202](https://github.com/khulnasoft/khulnasoft-lsp/commit/b6792021765be3d8533fec5d7a54cc4a16d24b15))
* debug log all http fetches ([bfe5a9c](https://github.com/khulnasoft/khulnasoft-lsp/commit/bfe5a9c6e2dc7b40e84779f8364601fe1b256f20))
* make log levels filterable ([fc424fc](https://github.com/khulnasoft/khulnasoft-lsp/commit/fc424fc409033e09cbbe5ee6770c78d71ffe1e99))



## [3.20.2](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.20.1...v3.20.2) (2023-12-06)


### Bug Fixes

* improve token check logging behavior ([7dd7d5d](https://github.com/khulnasoft/khulnasoft-lsp/commit/7dd7d5d79ad237b6f58225f3d6e66d5d0b851da7))


### Features

* assume token type by length heuristic during token check ([b679202](https://github.com/khulnasoft/khulnasoft-lsp/commit/b6792021765be3d8533fec5d7a54cc4a16d24b15))



## [3.20.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.19.0...v3.20.1) (2023-12-06)

### Bug Fixes

- support non `glpat-` prefixed tokens ([aa37dc3](https://github.com/khulnasoft/khulnasoft-lsp/commit/aa37dc33ed03a39eedc3ce86639b390923e124a9))

### Features

- Use completion context in code suggestions ([0ce196a](https://github.com/khulnasoft/khulnasoft-lsp/commit/0ce196ada688b012c38467b276ceae38a91e87e4))

# [3.20.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.19.0...v3.20.0) (2023-12-04)

### Features

- add cache configuration ([63c4679](https://github.com/khulnasoft/khulnasoft-lsp/commit/63c46794a8cf7fa6fa96527a53d4e76d133b6522))
- add caching of code suggestions response ([a84428c](https://github.com/khulnasoft/khulnasoft-lsp/commit/a84428cbbdac54773867f4a196738d908cdedb80))

# [3.19.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.18.1...v3.19.0) (2023-12-03)

### Bug Fixes

- Revert Reject inline completions with intellisense ([614d895](https://github.com/khulnasoft/khulnasoft-lsp/commit/614d895fb0c4ecf589812759d32467802d079b10))

## [3.18.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.18.0...v3.18.1) (2023-12-01)

### Bug Fixes

- the LS only needs api scope, read_user is redundant ([ea4a9ee](https://github.com/khulnasoft/khulnasoft-lsp/commit/ea4a9ee71afedebd527ce4f9d3c7f573d5f3e042))

# [3.18.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.17.0...v3.18.0) (2023-11-30)

### Features

- Reject inline completions with intellisense context ([7726054](https://github.com/khulnasoft/khulnasoft-lsp/commit/7726054f9831001b9d090c3bb055953a59bb3b3c))

# [3.17.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.16.1...v3.17.0) (2023-11-29)

### Bug Fixes

- inline completion items missing range ([259b2c8](https://github.com/khulnasoft/khulnasoft-lsp/commit/259b2c895ff12a756404e1dcf677ab4f92bcafc5))

### Features

- add debouncing and cancellation to LS ([93a33c5](https://github.com/khulnasoft/khulnasoft-lsp/commit/93a33c5903fb0de10a59e3ef1392da00cf32f112))
- **telemetry:** only autoreject if client sends accepted events ([9e0d8cf](https://github.com/khulnasoft/khulnasoft-lsp/commit/9e0d8cf0aa911afd95a0399f8e2498af251c5ba6))

## [3.16.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.16.0...v3.16.1) (2023-11-24)

- Exports check token notification type for the VS Code Extension

# [3.16.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.15.0...v3.16.0) (2023-11-24)

### Bug Fixes

- Fix browser build ([f9f65d9](https://github.com/khulnasoft/khulnasoft-lsp/commit/f9f65d9ab2231faa3d94b47641c3cddb8dca1ec1))
- remove hello notification ([015304d](https://github.com/khulnasoft/khulnasoft-lsp/commit/015304db38bc85944889f73dee68fbe3899a7551))

### Features

- Add Circuit Breaker ([f933c55](https://github.com/khulnasoft/khulnasoft-lsp/commit/f933c55adf9fe8946ffbc1a4e35b8378ef053825))
- Notify Clients about API error/recovery ([34027eb](https://github.com/khulnasoft/khulnasoft-lsp/commit/34027ebe6b98489554503f252aa452e84095ea2f))
- remove unnecessary console log ([83f16be](https://github.com/khulnasoft/khulnasoft-lsp/commit/83f16bea76d3cf4ae91979616405d7dd12a29c58))
- **telemetry:** Implement "suggestion rejected" logic ([5d7815f](https://github.com/khulnasoft/khulnasoft-lsp/commit/5d7815f752e705b7cc12ca77b99aedaa8a0b8d3f))

# [3.15.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.14.0...v3.15.0) (2023-11-13)

### Bug Fixes

- Restore missing ajv dependency ([208a6ad](https://github.com/khulnasoft/khulnasoft-lsp/commit/208a6ad24b38deb30a6a3d1f91491e99d241bcc7))

### Features

- Handle empty suggestion text on the LS side ([e1162f2](https://github.com/khulnasoft/khulnasoft-lsp/commit/e1162f2f6cdd11422de7359ef7eeaf983dd849e7))

# [3.14.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.13.0...v3.14.0) (2023-11-10)

### Features

- add accept suggestion command ([a2b3e7c](https://github.com/khulnasoft/khulnasoft-lsp/commit/a2b3e7c2ab7919fb5a1977c06fea2b1210c761cf))

# [3.13.0](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.12.1...v3.13.0) (2023-11-09)

- Swap a node dependency that would prevent web contexts from using the bundle (!94)

## [3.12.1](https://github.com/khulnasoft/khulnasoft-lsp/compare/v3.12.0...v3.12.1) (2023-11-06)

- No functional changes, only testing the new release process (!81)

## v3.12.0

- Allow clients to track `suggestion_not_provided` (!83)

## v3.11.0

- Track `language_server_version` with telemetry events (!78)

## v3.10.0

- Support `textDocument/inlineCompletion` message (!75)

## v3.9.0

- Only provide suggestions when cursor is at or near end of a line. (!61)
- Validate Snowplow events against the schema before tracking (!55)

## v3.8.0

- Fix issue where partial config updates used wrong values (!65) (also refactors LS configuration)

## v3.7.0

- Support using an HTTP proxy for connections (!35)
- Fix duplicated Snowplow events (!67)

## v3.6.0

- Bundle whole LS into one JS file to be used in VS Code (!62)

## v3.5.0

- Update Snowplow event `code_suggestions_context` schema to v2-1-0 (!64)
- Make Secret redaction respect the config setting, also enable it in the browser build (!57)

## v3.4.0

- Handle better error response from the Code Suggestions server (!56)

## v3.3.0

- Don't make suggestions for short content (!30)
- asdf `.tool-versions` file added for nodejs v18.16.0 (!47)

## v3.2.0

- Send all console messages to STDERR (!45)
- Disable snowplow events when host cannot be resolved (!45)
- Update `code_suggestions_context` schema to `v2-0-1` (!43)

## v3.1.0

- Add `suggestion_not_provided` telemetry event when suggestions are returned empty (!38)
- Allow Client to detect the `suggestion_shown` event (!38)

## v3.0.0

- Use custom `ide` and `extension` initialization parameters for telemetry (!32)

## v2.2.1

- Rely on `model.lang` value in the response from Code Suggestions server to set `language` property for the Code Suggestions telemetry context (!34)

## v2.2.0

- Enable Code Suggestions telemetry by default (!41)

## v2.1.0

- Send the relative file path to the Code suggestions server (!29)
- Update `appId` for Snowplow tracking (!36)

## v2.0.0

- Add Snowplow tracking library (!25)
- Add Code Suggestions telemetry (!27)
- Move all Client settings handling to the `DidChangeConfiguration` notification handler (!27)

## v1.0.0

- Update `token/check` notification to `$/gitlab/token/check` (!17)
- Document required and optional messages for server & client (!17)
- Document initialize capabilities (!17)
- Check that `completion` is supported by the client (!17)

## v0.0.8

- Bumping version to keep packages in sync (!22)

## v0.0.7

- Revert `re2` usage as it was causing issues with some platforms (!20)

## v0.0.6

- Fix npm package publishing
- Refactor TS build to accommodate WebWorker LSP

## v0.0.5

- Start publishing an npm package

## v0.0.4

- Add new code suggestions endpoint (!12)
- Add token check (!13)
- Subscribe to document sync events and publish diagnostics (empty for now) (!15)
- Use `re2` to work with Gitleaks regex (!16)

## v0.0.3

- Documenting server startup configuration and capabilities (!8)
- Bug fix for the code suggestions (!8)

## v0.0.2

- Easier build and publish (!10)
- Refactor for browser entrypoint (!6)
- Add secrets redaction (!7)

## v0.0.1

- Base version
