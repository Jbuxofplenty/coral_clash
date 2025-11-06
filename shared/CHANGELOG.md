## [1.3.1](https://github.com/Jbuxofplenty/coral_clash/compare/v1.3.0...v1.3.1) (2025-11-06)


### Bug Fixes

* **ci:** commit package.json files along with lockfiles in update-dependencies job ([5fc720e](https://github.com/Jbuxofplenty/coral_clash/commit/5fc720eb743f33218a9a691205626dcc77ed17df))
* **ci:** update CocoaPods specs repo before installing iOS dependencies ([16b5765](https://github.com/Jbuxofplenty/coral_clash/commit/16b5765a41f8d00ee44f6de4ec40b2e085111ccb))

# [1.3.0](https://github.com/Jbuxofplenty/coral_clash/compare/v1.2.2...v1.3.0) (2025-11-06)


### Bug Fixes

* **ci:** explicitly configure GPG for semantic-release in shared directory ([6f52eef](https://github.com/Jbuxofplenty/coral_clash/commit/6f52eef4e9ed3b3e3d80ef393e99452a307205a9))
* **ci:** re-enable sync-to-main now that GPG signing is configured ([9dadab4](https://github.com/Jbuxofplenty/coral_clash/commit/9dadab485bccd344745d42de9cc54feb287756ef))


### Features

* **ci:** add branch verification and push validation to update-dependencies job ([ab5095a](https://github.com/Jbuxofplenty/coral_clash/commit/ab5095a886f190f7071ed8ee2d72c59cc46bddeb))
* **ci:** update and commit all three lockfiles (root, functions, shared) ([b82a04a](https://github.com/Jbuxofplenty/coral_clash/commit/b82a04a6aa567e787b2b84191e8e0b6f1b33e5f2))

## [1.2.2](https://github.com/Jbuxofplenty/coral_clash/compare/v1.2.1...v1.2.2) (2025-11-06)


### Bug Fixes

* **ci:** ensure update-dependencies checks out latest develop branch ([54f7542](https://github.com/Jbuxofplenty/coral_clash/commit/54f7542850ccf8b0440dcac6fdd01eed28366e9c))

## [1.2.1](https://github.com/Jbuxofplenty/coral_clash/compare/v1.2.0...v1.2.1) (2025-11-06)


### Bug Fixes

* **ci:** use --autostash for lockfile updates to handle concurrent pushes ([5eec8f6](https://github.com/Jbuxofplenty/coral_clash/commit/5eec8f609de27ccff13d26c910855c701362f77d))

# [1.2.0](https://github.com/Jbuxofplenty/coral_clash/compare/v1.1.1...v1.2.0) (2025-11-06)


### Bug Fixes

* **shared:** use build-time version injection instead of runtime import ([daab3c3](https://github.com/Jbuxofplenty/coral_clash/commit/daab3c3d0590f3a4a9d1b59fc93f530554613862))


### Features

* **ci:** auto-sync develop to main after successful deployment ([21e394e](https://github.com/Jbuxofplenty/coral_clash/commit/21e394e5862c59b581bf3b0ed1eedd03fb0f9a66))

## [1.1.1](https://github.com/Jbuxofplenty/coral_clash/compare/v1.1.0...v1.1.1) (2025-11-06)


### Bug Fixes

* **ci:** update lockfiles after releasing shared package ([5bf8beb](https://github.com/Jbuxofplenty/coral_clash/commit/5bf8bebc030fa8a0a00bb4d43ccb0ad417a935d1))

# [1.1.0](https://github.com/Jbuxofplenty/coral_clash/compare/v1.0.0...v1.1.0) (2025-11-06)


### Bug Fixes

* **ci:** use published package for app builds instead of yarn link ([820ef0c](https://github.com/Jbuxofplenty/coral_clash/commit/820ef0c8546d33c4f984e079e3bc7a3c201e4e22))
* **shared:** correct types path to dist/game/index.d.ts ([9bcd832](https://github.com/Jbuxofplenty/coral_clash/commit/9bcd83218956c61919418f85ffe51db032f523eb))


### Features

* **ci:** enable GPG signing for semantic-release commits ([284abbe](https://github.com/Jbuxofplenty/coral_clash/commit/284abbe4e1b7680933f478c22b0fa05cac34764a))
* **ci:** skip release workflow when no shared package changes ([3ea3b57](https://github.com/Jbuxofplenty/coral_clash/commit/3ea3b57d8dcfeb20327d95d6aa08858f0df71e99))

# 1.0.0 (2025-11-06)


### Bug Fixes

* Android style, undo computer bug fix ([6e47466](https://github.com/Jbuxofplenty/coral_clash/commit/6e47466563706d2b8d9220903034ee2c266ce1eb))
* **android:** add package_name to Play Store upload ([5257e9d](https://github.com/Jbuxofplenty/coral_clash/commit/5257e9d9267aea7a3e4d66534e725354b892479f))
* **android:** check all Play Store tracks for version code ([4b0a5dd](https://github.com/Jbuxofplenty/coral_clash/commit/4b0a5dde953f9e763e18c98cb0a332b1c32306e6))
* **android:** fetch and increment version code from Play Store ([8047cfc](https://github.com/Jbuxofplenty/coral_clash/commit/8047cfc8897adc84298781fa264d6f3e8585dd81))
* **android:** increment version code before build ([5fc72cd](https://github.com/Jbuxofplenty/coral_clash/commit/5fc72cde05f2fb48cb640f8ccf593b44bbfecad0))
* **android:** set explicit runtime version for bare workflow ([b0a23be](https://github.com/Jbuxofplenty/coral_clash/commit/b0a23bec6e95c38d22a71bc04f247af98a6e90fa))
* **android:** update native runtime version and add build scripts ([d4e94df](https://github.com/Jbuxofplenty/coral_clash/commit/d4e94dfdc0d546170e815ef989cd2924ed807d6b))
* **animation:** improve whale orientation and undo animations ([127c959](https://github.com/Jbuxofplenty/coral_clash/commit/127c95903be8cf228ff155026b651adaa8a57677))
* **animation:** simplify whale animation to render as single cell during diagonal moves ([1810d8c](https://github.com/Jbuxofplenty/coral_clash/commit/1810d8c0fa7091e520c9101c9c4722db33f69683))
* **auth:** add Google Sign-In URL scheme for iOS ([79f4868](https://github.com/Jbuxofplenty/coral_clash/commit/79f486898c8f07f556583ec55e358147edb20cb2))
* **auth:** add native redirect URI for Android OAuth too ([75d7e46](https://github.com/Jbuxofplenty/coral_clash/commit/75d7e464dfdb87a7686c66ead920e763b90a4f8f))
* **auth:** extract full client ID for OAuth redirect URI, not just first segment ([fc6a231](https://github.com/Jbuxofplenty/coral_clash/commit/fc6a231bb6d184122689db8efd6ce4349759600d))
* **auth:** handle Google Sign-In cancellation gracefully ([4c0fde6](https://github.com/Jbuxofplenty/coral_clash/commit/4c0fde69c484ab449a6c2472c2c514c8f3f79d9c))
* **auth:** use native iOS redirect URI for Google OAuth ([1f4857b](https://github.com/Jbuxofplenty/coral_clash/commit/1f4857b25f349a31cf12ab749f6d8ec7618fe676))
* **ci:** add --platform ios flag to expo export:embed ([07be11b](https://github.com/Jbuxofplenty/coral_clash/commit/07be11b3b0e35f0625c3a33f15424d2cd7c6f969))
* **ci:** add expo export:embed for Android builds too ([6a9051a](https://github.com/Jbuxofplenty/coral_clash/commit/6a9051a0280db5d788b361a41cf8f15dcb67ca9f))
* **ci:** add GitHub Packages authentication for published package ([50b6ab6](https://github.com/Jbuxofplenty/coral_clash/commit/50b6ab6ca19b76eebc68f16cbc0f32b882dab2f5))
* **ci:** configure git to use basic auth for match repo ([a866f2d](https://github.com/Jbuxofplenty/coral_clash/commit/a866f2d6ee8319ca869e079e6621f4e6e0185269))
* **ci:** copy bundle to ios/CoralClash/ to include in .ipa ([4025679](https://github.com/Jbuxofplenty/coral_clash/commit/4025679c9153c01b070c97acf92bf7f51ed6aa66))
* **ci:** correct deploy-staging job dependencies ([9aabfe3](https://github.com/Jbuxofplenty/coral_clash/commit/9aabfe3f99513e9e6920b4b72ce40aef61421cec))
* **ci:** correct jq command for .env to JSON conversion ([565accc](https://github.com/Jbuxofplenty/coral_clash/commit/565accc93895fe6081a39ebba83196b597b453b2))
* **ci:** create .env file for Metro bundler to properly bake environment variables ([b6fefbe](https://github.com/Jbuxofplenty/coral_clash/commit/b6fefbe33ceadbf821f61d9d39ee5361fa07654d))
* **ci:** deploy Firebase functions after staging build completes ([8292c81](https://github.com/Jbuxofplenty/coral_clash/commit/8292c81b1a8a96a851cdc0372c2a80e5e03c1c50))
* **ci:** ensure node binary is available for Xcode bundling phase ([162a1d9](https://github.com/Jbuxofplenty/coral_clash/commit/162a1d9b5825d26b244766d03ffb222f288c683a))
* **ci:** explicitly run expo export:embed before iOS build ([29cf698](https://github.com/Jbuxofplenty/coral_clash/commit/29cf6982842f80066a96e2fd3bd3f98780c10a90))
* **ci:** filter comments and empty lines from .env files before upload ([5daff07](https://github.com/Jbuxofplenty/coral_clash/commit/5daff077748092a450e781eb19a8280511830a0a))
* **ci:** grant packages:write permission to deploy-staging ([32d4f42](https://github.com/Jbuxofplenty/coral_clash/commit/32d4f42e8e0df4620e2fa4fbe432678197a5a28d))
* **ci:** handle existing staging tags in deploy workflow ([407bc7f](https://github.com/Jbuxofplenty/coral_clash/commit/407bc7f7b446e6832d0df567e16d955c622b7d97))
* **ci:** improve JSON generation with proper jq parsing ([2994fdb](https://github.com/Jbuxofplenty/coral_clash/commit/2994fdb0e687c138d7566555f381c6c22b06ae49))
* **ci:** increase Gradle JVM memory after prebuild ([aa34eb2](https://github.com/Jbuxofplenty/coral_clash/commit/aa34eb218baf5484607f5105d58e0a5c6439d24e))
* **ci:** lockfile ([86f5d18](https://github.com/Jbuxofplenty/coral_clash/commit/86f5d180d06f3e21b7c1b54196e753f28e413753))
* **ci:** lockfile ([1f3069b](https://github.com/Jbuxofplenty/coral_clash/commit/1f3069bf9207f2db450429bbdaa33b89f0c29ca6))
* **ci:** properly detect git auth failures ([6e36928](https://github.com/Jbuxofplenty/coral_clash/commit/6e369285412ece42eba8f56010109015fd5465aa))
* **ci:** remove --frozen-lockfile when using yarn link ([c05a450](https://github.com/Jbuxofplenty/coral_clash/commit/c05a45033a4cdfd75a2f242a5a36e5b60113bf89))
* **ci:** run tests before releasing shared package ([70ecc65](https://github.com/Jbuxofplenty/coral_clash/commit/70ecc65a458e8aa5e09055ddddc9f0ba6a37f8e5))
* **ci:** set environment variables at job level for all build steps ([b6a52fb](https://github.com/Jbuxofplenty/coral_clash/commit/b6a52fbee81fb916d24a60f8b5b13ab0b85d2fe0))
* **ci:** update workflows to use local yarn link for @jbuxofplenty/coral-clash ([245c6ce](https://github.com/Jbuxofplenty/coral_clash/commit/245c6ce40bd1ad55dd262628c0511364066ca438))
* **ci:** use dotenv action instead of manual source command ([153bf27](https://github.com/Jbuxofplenty/coral_clash/commit/153bf27d012c1ff194b1d4a2239a9eeab0beebff))
* **ci:** use expo export to generate SDK 52 bundle format ([f63c57e](https://github.com/Jbuxofplenty/coral_clash/commit/f63c57e0c26e081fd297e95d115512605477f9f5))
* **ci:** use GITHUB_ENV directly instead of dotenv action ([b2bc163](https://github.com/Jbuxofplenty/coral_clash/commit/b2bc16355a33850366a8db4e66a066afdc3d634a))
* **ci:** use heredoc for writing multiline .env file from secrets ([907691e](https://github.com/Jbuxofplenty/coral_clash/commit/907691e1ece7ab025a59bc4006530c7bc064060b))
* **ci:** use heredoc to avoid shell expansion issues with JSON secrets ([7ed998b](https://github.com/Jbuxofplenty/coral_clash/commit/7ed998b46c655d645b4148d802b18423aeaf0dbf))
* **ci:** use printf instead of heredoc for writing multiline .env files ([49021dc](https://github.com/Jbuxofplenty/coral_clash/commit/49021dcbe04c52522bbe2d5a43e571c90e751aff))
* **ci:** use standard React Native bundling instead of relying on Xcode ([eb5f0de](https://github.com/Jbuxofplenty/coral_clash/commit/eb5f0de0980a3c1d7bad353cae1b8503541e11ae))
* **ci:** use temp file for secret upload to preserve newlines ([23b543c](https://github.com/Jbuxofplenty/coral_clash/commit/23b543cb6770cf191f011d6919619fa45bc06820))
* **config:** add shared URI scheme for dev client ([5114ba0](https://github.com/Jbuxofplenty/coral_clash/commit/5114ba0242309f6a8275158f75f41cbe972f840d))
* **deps:** align dependencies with Expo SDK 54 and fix auto-update workflow ([ef93746](https://github.com/Jbuxofplenty/coral_clash/commit/ef93746ae7d63090aa3ceece8c380c011e31b431))
* Double Jeopardy Whale Fix in Commit Before this ([e367215](https://github.com/Jbuxofplenty/coral_clash/commit/e36721522cdec57adaaddba1c731f003b61e24ba))
* **eas:** revert incorrect encryption config syntax ([bb582ec](https://github.com/Jbuxofplenty/coral_clash/commit/bb582ec5f96c9c2eac11ec0e35ae4a86cea2edc0))
* **fastlane:** use HTTPS for match repo to support basic auth ([9abef0c](https://github.com/Jbuxofplenty/coral_clash/commit/9abef0ccea6515b3f2392a06a88e11f6e21d3a93))
* **game-engine:** remove redundant _disableValidation flag ([505a205](https://github.com/Jbuxofplenty/coral_clash/commit/505a2051205576792fde519adccb223a116766f4))
* **game-engine:** separate skipValidation and skipFenValidation flags ([1d17f1d](https://github.com/Jbuxofplenty/coral_clash/commit/1d17f1d737d3facf92c902391aee391aed4bd74d))
* **game:** fix whale double capture causing pieces to disappear ([7dd4f00](https://github.com/Jbuxofplenty/coral_clash/commit/7dd4f0063b9d832aff00fba2e36955c7a89bff44))
* **game:** inverse black's rank 7 piece roles and update coral comments ([d1defe4](https://github.com/Jbuxofplenty/coral_clash/commit/d1defe4f6d1ac9e5433490e3b0ae86d27e418db7))
* **game:** prevent whale parallel slide attack through own pieces ([c90e3ab](https://github.com/Jbuxofplenty/coral_clash/commit/c90e3ab6d49319c86a62723743784295395fb3f0))
* **game:** whale captures now delete all enemy pieces at destination squares ([db1ac01](https://github.com/Jbuxofplenty/coral_clash/commit/db1ac0182197cb221bd09181c6632f7b34b89c53))
* **game:** whale check validation with coral and cache optimization ([21023ab](https://github.com/Jbuxofplenty/coral_clash/commit/21023ab2ef155e3f1c8b6f27b56b7ff482e12f7b))
* **game:** whale coral removal and state restoration improvements ([134504e](https://github.com/Jbuxofplenty/coral_clash/commit/134504ee174de0157414eb9fabd46f10d9d769b6))
* **header:** remove grey bar and border below header ([cee5982](https://github.com/Jbuxofplenty/coral_clash/commit/cee5982342340abb9dac8f8d5d4b3a3d28a5946d))
* **ios:** add coralclash URL scheme for OAuth redirects ([4e74829](https://github.com/Jbuxofplenty/coral_clash/commit/4e748296eddcdfe1b91bbc3397ad4f76b6876fc9))
* **ios:** add encryption exemption to Info.plist ([ac49dcb](https://github.com/Jbuxofplenty/coral_clash/commit/ac49dcbe34474f056becece388b256666c90761b))
* **ios:** center header title text ([02810be](https://github.com/Jbuxofplenty/coral_clash/commit/02810bea80900a7251990a8034c37b967823094a))
* **ios:** configure manual code signing after expo prebuild ([006b4af](https://github.com/Jbuxofplenty/coral_clash/commit/006b4afe2e5ff3c29f8d0a33cc170e29d61202ac))
* **ios:** configure provisioning profile after Match sync ([fdc57dc](https://github.com/Jbuxofplenty/coral_clash/commit/fdc57dc579c747ec9763f0f6faa944d8f2d2768d))
* **ios:** correct bundle loading for Expo SDK 52+ production builds ([bd37057](https://github.com/Jbuxofplenty/coral_clash/commit/bd37057f21ff0c28b31021164e02271eb692442a))
* **ios:** correct regex to include closing brace in bundle URL replacement ([6b2bdaa](https://github.com/Jbuxofplenty/coral_clash/commit/6b2bdaaacbd6ec89dfd9019ef528704cc0b930e2))
* **ios:** fetch and increment build number from App Store Connect ([7e3f03f](https://github.com/Jbuxofplenty/coral_clash/commit/7e3f03f03112126a7407aac5e5690b0cb12bca1f))
* **ios:** improve bundle path resolution for Expo SDK 52 ([7b302a4](https://github.com/Jbuxofplenty/coral_clash/commit/7b302a461e76d1fb429a3da995546b5c4925e449))
* **ios:** use fastlane to configure manual code signing ([0cd8e51](https://github.com/Jbuxofplenty/coral_clash/commit/0cd8e517763281d6ccb954f1e642454eaee4066a))
* Random bug fixes ([44bc6e2](https://github.com/Jbuxofplenty/coral_clash/commit/44bc6e234ccf35ecca4d30b761e0a729c5947399))
* **shared:** correct module paths for dist compilation ([d3b66f2](https://github.com/Jbuxofplenty/coral_clash/commit/d3b66f22ea2546cb1e9e7b498cfaa1992fbcf1be))
* **shared:** encode specific squares in whale coral removal PGN notation ([c0e4bc4](https://github.com/Jbuxofplenty/coral_clash/commit/c0e4bc45fe3dfd73daf2afe19f510b649ed1522a))
* **tutorials:** correct scenario moves and add comprehensive tests ([f360999](https://github.com/Jbuxofplenty/coral_clash/commit/f3609990ef486f86e280739289d2ebfd69e87009))
* **ui:** correct game history card win/loss display for computer games ([8d36ba1](https://github.com/Jbuxofplenty/coral_clash/commit/8d36ba1cde41037d0099693d50f0d8c6ae29907f))
* **undo:** always hide piece at 'from' square during reverse animations ([cf8dc37](https://github.com/Jbuxofplenty/coral_clash/commit/cf8dc378f65651ac583bb22be9ff558b2d7bccec))
* **undo:** prevent re-animation of previous move after undo ([f95b874](https://github.com/Jbuxofplenty/coral_clash/commit/f95b87492b3a9aed806acd3e6683b0575b2245ce))
* **undo:** prevent wrong move animation after undo for online games ([0643929](https://github.com/Jbuxofplenty/coral_clash/commit/0643929cc56bcb338923612bfa1858907021700f))
* **undo:** set pendingUndoRef before animation state for correct square hiding ([0439519](https://github.com/Jbuxofplenty/coral_clash/commit/043951955a79f42a357092bf888565b02530445a))
* **undo:** simplify animation logic to match history pattern ([17a53a0](https://github.com/Jbuxofplenty/coral_clash/commit/17a53a0c5486122ed7cc271d29d419c380e68d97))
* Whale Remove Coral ([be61fe5](https://github.com/Jbuxofplenty/coral_clash/commit/be61fe5e8fcbffdf8aae63800776d829cc72b267))


### Code Refactoring

* **ci:** simplify env management by storing .env as plain text ([efd5037](https://github.com/Jbuxofplenty/coral_clash/commit/efd50373939ad13babfa6ee47867b0221ef59fe2))
* **ci:** use expo export:embed with individual env var secrets ([fa9f2dc](https://github.com/Jbuxofplenty/coral_clash/commit/fa9f2dc8e62232c88e3e3dce44ebdc6a2a8c80fb))


### Features

* Account deletion ([f57cfd1](https://github.com/Jbuxofplenty/coral_clash/commit/f57cfd148bb05bd942f72300e48229f53fe48d83))
* **active-games:** add resign button for PvP games ([92e68a6](https://github.com/Jbuxofplenty/coral_clash/commit/92e68a6690c05fb4353fa7511cabe6f66473000d))
* Active/Game History Cards ([ae1b2b9](https://github.com/Jbuxofplenty/coral_clash/commit/ae1b2b9c8b06cb4c03720711be5b31724d6ae5de))
* Android warns ([af364a6](https://github.com/Jbuxofplenty/coral_clash/commit/af364a6572785a725ad156f0f845affe937a75c3))
* Android warns ([1d456bb](https://github.com/Jbuxofplenty/coral_clash/commit/1d456bbd0d0b20772df94dacce4c474ddc16f354))
* **animation:** add smooth scale animation for whale size transitions ([e23e579](https://github.com/Jbuxofplenty/coral_clash/commit/e23e5792daf788a50553f291a2e1a3c5e02b0ff8))
* **animations:** add coral placement/removal animations and fix undo animation ([57c6393](https://github.com/Jbuxofplenty/coral_clash/commit/57c63935063551d42fc4ba4d80f65aa4531ceaa3))
* API Key secret ([4367dfb](https://github.com/Jbuxofplenty/coral_clash/commit/4367dfb64b82e7c89fdfd966af036da720ebbc97))
* App splash ([501e9f2](https://github.com/Jbuxofplenty/coral_clash/commit/501e9f2eead4f89789cbb2a67ac269ba1e7e5124))
* **auth:** migrate to @react-native-google-signin/google-signin with Firebase config ([42ef39f](https://github.com/Jbuxofplenty/coral_clash/commit/42ef39f943bd833497828c42dd1e8e97673f8e56))
* Board updates ([6aa2c15](https://github.com/Jbuxofplenty/coral_clash/commit/6aa2c15685c6aae34cf1cede69a48577ea288dfb))
* Bug fix for coral victory ([31f8edb](https://github.com/Jbuxofplenty/coral_clash/commit/31f8edbaae7559ba5f69e87fd8103a449a85614a))
* Bug fixes, almost V1 tested ([9e208ee](https://github.com/Jbuxofplenty/coral_clash/commit/9e208ee37c4efebc1cd1bceea008963e6b0c3b27))
* CI Fix ([a78fd63](https://github.com/Jbuxofplenty/coral_clash/commit/a78fd638fe1add61b83b74cc1fa83c1ba477fd06))
* CI Improvements ([3d91295](https://github.com/Jbuxofplenty/coral_clash/commit/3d9129520bea5e027d2290cae73e2ff5a26fb944))
* **ci:** add automated environment variable management with JSON secrets ([c171486](https://github.com/Jbuxofplenty/coral_clash/commit/c1714866587046db92e827a7b44b65cb5a484dda))
* **ci:** add diagnostic logging for env vars and Firebase init ([e6f2b11](https://github.com/Jbuxofplenty/coral_clash/commit/e6f2b118e512e2d2bbc4a14851c951144fb4ec15))
* **ci:** always deploy all platforms to production ([d0fe9bb](https://github.com/Jbuxofplenty/coral_clash/commit/d0fe9bb841d7c28281a8038193c230e8939aeb9f))
* Computer Game Functioning ([e45d79d](https://github.com/Jbuxofplenty/coral_clash/commit/e45d79d06d193d24064955e2d96eb3c5bfe0fe39))
* Coral victory when octopus/crab gets to the edge of board ([b01a7d1](https://github.com/Jbuxofplenty/coral_clash/commit/b01a7d18383e018cf88735a7369b6482c1da95bd))
* Crab check fix ([ba14004](https://github.com/Jbuxofplenty/coral_clash/commit/ba14004c41cc426285e26edf27938b8c6f8fd528))
* Critical whale undo bug fix (capturing multiple pieces where one is a whale) ([f111f03](https://github.com/Jbuxofplenty/coral_clash/commit/f111f03b5368646a60c4a64793e846e923b609ed))
* Critical whale undo bug fix and whale orientation selection game status notification ([824a1a9](https://github.com/Jbuxofplenty/coral_clash/commit/824a1a93952fbdada77f404528aa02d0c1cc3848))
* Debug build ([e3b813c](https://github.com/Jbuxofplenty/coral_clash/commit/e3b813c5074ae09487f2101a834515289f59e429))
* Debug build ([30c3464](https://github.com/Jbuxofplenty/coral_clash/commit/30c3464a87ede06051d530f68dc52543a753a5b0))
* Deployment Workflow ([38532da](https://github.com/Jbuxofplenty/coral_clash/commit/38532daef5a2f95d38b4753d6e226cc4bd05a829))
* Draw by Repetition Verbiage ([cc098f2](https://github.com/Jbuxofplenty/coral_clash/commit/cc098f2274f4d1542f4dfa7bb9aebe251a391360))
* Dynamic Rules ([57fd773](https://github.com/Jbuxofplenty/coral_clash/commit/57fd7730a6d5ddddc0dca0dc22843f83955e98ed))
* Enable android deploy/submit ([1059bfc](https://github.com/Jbuxofplenty/coral_clash/commit/1059bfc089b3f1404b4a69550687edfe4a0a2820))
* ESNext Refactor ([920018e](https://github.com/Jbuxofplenty/coral_clash/commit/920018e3b3c69e6de9da7788efff1620a67a4745))
* ESNext Refactor follow-up ([b1b3c7e](https://github.com/Jbuxofplenty/coral_clash/commit/b1b3c7e1f23560d3c0974adf59ee332822e20e09))
* Expo Preview to show friend ([0daa1a6](https://github.com/Jbuxofplenty/coral_clash/commit/0daa1a6cd429e348205ce6b27098153375cd01a5))
* Extra Error Logging ([c9de5df](https://github.com/Jbuxofplenty/coral_clash/commit/c9de5dfa02db3ff2f92d2b0005bca6dee09e3fa1))
* Firebase deploy GH Action ([f4377a1](https://github.com/Jbuxofplenty/coral_clash/commit/f4377a184aeb88c9ae75be1d5da36234ff322f92))
* Firebase Deployment Fix ([9e6076f](https://github.com/Jbuxofplenty/coral_clash/commit/9e6076f93ac22bcf2e6b50edc82766c6d216930d))
* Firebase Integration ([e61be38](https://github.com/Jbuxofplenty/coral_clash/commit/e61be38c44b1db96db912296ee08b55335fc628d))
* Fix CI ([f788600](https://github.com/Jbuxofplenty/coral_clash/commit/f788600473bc5a778b8e8b9d2f0970f5f3f48ad7))
* Fix CI ([2a90650](https://github.com/Jbuxofplenty/coral_clash/commit/2a90650ce4c229ebecec99baf99db4fc230f9f97))
* Fix CI ([6e3d0f2](https://github.com/Jbuxofplenty/coral_clash/commit/6e3d0f2b712d943177923076a2e4d646837d4efa))
* Fix CI ([48faa28](https://github.com/Jbuxofplenty/coral_clash/commit/48faa284ec8667aa90cbca7a615984100bd1d2c6))
* Fix CI ([21e4b52](https://github.com/Jbuxofplenty/coral_clash/commit/21e4b52aed26a93b572b584b224748cc294c4c45))
* Fix CI ([9f26697](https://github.com/Jbuxofplenty/coral_clash/commit/9f266970720388035191378c3ad4302346236d94))
* Fix Google Play Store Deployment ([72e9d6b](https://github.com/Jbuxofplenty/coral_clash/commit/72e9d6b9ebedb53cb359aa5cf05e9bf4ee97e4e8))
* Fix Google Play Store Deployment docs ([499191c](https://github.com/Jbuxofplenty/coral_clash/commit/499191cb56c1cd39f503d189d922b00aada7db7f))
* Fix package.json ([3a522a8](https://github.com/Jbuxofplenty/coral_clash/commit/3a522a87aafe2e4a7fe365862a19926bfa8f419e))
* Fix stg tag issue in prod deploy ([b043bd7](https://github.com/Jbuxofplenty/coral_clash/commit/b043bd727e34bfcf516b62e0556cdefd1fffd059))
* Fix tests ([2ef27e7](https://github.com/Jbuxofplenty/coral_clash/commit/2ef27e7a145f5cd08d03ff3b4d293105bd450392))
* Fix tests ([142593b](https://github.com/Jbuxofplenty/coral_clash/commit/142593ba5be87ba32946f25d5d7a845adc99634f))
* Fix tests ([9a77977](https://github.com/Jbuxofplenty/coral_clash/commit/9a779777d0e20d8b24b9f32a18b5618d57407d09))
* Fix tests ([e9a330f](https://github.com/Jbuxofplenty/coral_clash/commit/e9a330f0c72ed0116aaffea6077553e0e7eaf65d))
* Fixing UI issues on physical phone ([262b1ec](https://github.com/Jbuxofplenty/coral_clash/commit/262b1ecdc3c51e92f89f66bc95a2792ac442db05))
* Game State Bug ([2267a9c](https://github.com/Jbuxofplenty/coral_clash/commit/2267a9c2a479e4ab0d2498bf917dc16bef89c4ba))
* **game:** add cloud tasks timeout system with zombie task prevention ([904571b](https://github.com/Jbuxofplenty/coral_clash/commit/904571b6c9e72c89a7f7b7bbf1bb0c20604161d2))
* **game:** add comprehensive piece move animations ([78664df](https://github.com/Jbuxofplenty/coral_clash/commit/78664dff665e0522957f2fb55687189087c93901))
* **game:** add pass-and-play local multiplayer mode ([d7814e8](https://github.com/Jbuxofplenty/coral_clash/commit/d7814e834c9f4dcdab18dc184585608d8153cd4c))
* Generalize Deployment Scripts for Next App ([591b2f8](https://github.com/Jbuxofplenty/coral_clash/commit/591b2f862f6388052d8f352bf2e1987a68e36cd9))
* Google Play Store Deployment ([a38f9c8](https://github.com/Jbuxofplenty/coral_clash/commit/a38f9c8e409697276c7c0980d5eb1e21e95c5a98))
* **header:** make avatar clickable to navigate to settings ([d1f0106](https://github.com/Jbuxofplenty/coral_clash/commit/d1f01067704b972d95d1af42cde0a752b6ce8c12))
* Hide Available Moves When Move is Made ([47748da](https://github.com/Jbuxofplenty/coral_clash/commit/47748da2879dcba56229c0379ad14ca5395fd4fb))
* **home:** add play with friend card and avatar loading state ([07bc5c6](https://github.com/Jbuxofplenty/coral_clash/commit/07bc5c64b3824443222df42eb18bfc0f11d22f9d))
* **home:** add sign-up prompt card for logged-out users ([15ed641](https://github.com/Jbuxofplenty/coral_clash/commit/15ed6412e89982bdaa60823d7f4277a6cc8e99b1))
* **hooks:** add useDevFeatures hook with internalUser support ([4afd4d4](https://github.com/Jbuxofplenty/coral_clash/commit/4afd4d4941bf6df833e24c1dd5298b892d947e6c))
* How-To Improvements ([3048b12](https://github.com/Jbuxofplenty/coral_clash/commit/3048b1241139ee3400d4b2e6d4c25c646aabbfc1))
* How-To Play Improvements ([e9f024d](https://github.com/Jbuxofplenty/coral_clash/commit/e9f024db5cb45ef2c53441269698f8637004eee9))
* How-to screen revamp (links) ([42e906e](https://github.com/Jbuxofplenty/coral_clash/commit/42e906e746a1d44eba4f6f8e7775b62f5c99cf34))
* How-to style updates ([6491f46](https://github.com/Jbuxofplenty/coral_clash/commit/6491f4651efcf69ed7bd6ea4e6973f2e8821ec92))
* In-Game Notifications ([d7a6dc4](https://github.com/Jbuxofplenty/coral_clash/commit/d7a6dc410f453f681269d0e89c4b15decd7569d1))
* Internal Distribution ([9ddefdd](https://github.com/Jbuxofplenty/coral_clash/commit/9ddefddeca1b418943f85b31949dad4f1288bd5f))
* **ios:** add logging for build number increment ([8683379](https://github.com/Jbuxofplenty/coral_clash/commit/8683379a9f0d87fb798ffd240b37883cab617f07))
* Lint ([0a294a9](https://github.com/Jbuxofplenty/coral_clash/commit/0a294a95e4e1810957ea747d2fe8c12ec20a6e1d))
* Lint ([5d2b297](https://github.com/Jbuxofplenty/coral_clash/commit/5d2b2970aac188ee8db5f9362b0af9b4c2c2c0e6))
* Lint fix ([85f035b](https://github.com/Jbuxofplenty/coral_clash/commit/85f035bbccde0e08a0f6f74a88c6895b13585f95))
* Load fixtures in dev for testing ([5737980](https://github.com/Jbuxofplenty/coral_clash/commit/573798016828c25426472836c2ca8a95512807c9))
* Loading Indicator on Network Calls ([a9e9124](https://github.com/Jbuxofplenty/coral_clash/commit/a9e9124affe981e6c5ff6634171fb4f6e7c2014c))
* Lock app to portrait mode ([3265fac](https://github.com/Jbuxofplenty/coral_clash/commit/3265facd7b85b006975e2d9cc4cc6a7d57a3203d))
* Matchmaking indicator ([94e162b](https://github.com/Jbuxofplenty/coral_clash/commit/94e162b363560a73c59ebd10764e1a1277872fad))
* Matchmaking System ([8a6e2a7](https://github.com/Jbuxofplenty/coral_clash/commit/8a6e2a75ca6f1fea211c8853ed2df89697d35d02))
* **matchmaking:** allow users to join queue with active games ([cbc7474](https://github.com/Jbuxofplenty/coral_clash/commit/cbc747457bd36b12b599e0668e6963f5d74190d8))
* Merge develop ([aea9163](https://github.com/Jbuxofplenty/coral_clash/commit/aea91639a367215ef77660291258c3bebe5fb6cd))
* Minor Animation Improvements ([fd96ffc](https://github.com/Jbuxofplenty/coral_clash/commit/fd96ffcffcb3e55088cc5d89e12cce02a5a9c02f))
* Minor UI Improvements ([31d6626](https://github.com/Jbuxofplenty/coral_clash/commit/31d66264f146c0b5f4a5f2685ab4c4aed2f456d7))
* Minor UI Updates ([f6a46ca](https://github.com/Jbuxofplenty/coral_clash/commit/f6a46cac85b5e977e96fd3d126b39fc709145cdd))
* Misc warnings ([15ae3a6](https://github.com/Jbuxofplenty/coral_clash/commit/15ae3a6df900c684bcccb3fbd85941f0fed3f4ed))
* More caching in CI ([f042920](https://github.com/Jbuxofplenty/coral_clash/commit/f0429204685cd7cba2182b8ed8b206cfb1017a42))
* More rules updates ([d03746c](https://github.com/Jbuxofplenty/coral_clash/commit/d03746c849995787d9fc60716acbbfb0c7da1a9b))
* More whale validation ([0406d6e](https://github.com/Jbuxofplenty/coral_clash/commit/0406d6e9e21c2759a4d2b40fed582fe0275bd682))
* More whale validation ([b1e56c2](https://github.com/Jbuxofplenty/coral_clash/commit/b1e56c2623d81510184cd14f8a62948af47313b4))
* Move history and Undo/Reset Game ([61b471c](https://github.com/Jbuxofplenty/coral_clash/commit/61b471c7e41a3e35642e44d571b92bbca1917a41))
* Nasty bugs ([b48f68c](https://github.com/Jbuxofplenty/coral_clash/commit/b48f68cfdbe29881e687de843e1a564b7eafb147))
* Need to revamp coral clash script ([3b2ac0a](https://github.com/Jbuxofplenty/coral_clash/commit/3b2ac0a190207d4e9e7f6cdd576b2d79bf8de2ab))
* Notifications ([baf2b15](https://github.com/Jbuxofplenty/coral_clash/commit/baf2b150a98171b0e590aad27497578dfae708b2))
* Offline mode ([521cb7b](https://github.com/Jbuxofplenty/coral_clash/commit/521cb7b6d6a0a997acd279654bb349aa57f0650a))
* Optimizations ([ce5e543](https://github.com/Jbuxofplenty/coral_clash/commit/ce5e543fb33bed3001f5580478b13a72153dfc43))
* **pass-and-play:** delay board flip until animation completes ([6bcf272](https://github.com/Jbuxofplenty/coral_clash/commit/6bcf272c8d1aef64b7028295d181f31875244498))
* Progress ([c58ec6f](https://github.com/Jbuxofplenty/coral_clash/commit/c58ec6f83030c3e16f8f60d558bcd18300e60f95))
* PvP Game Updates ([f63663f](https://github.com/Jbuxofplenty/coral_clash/commit/f63663fd9808a505fa2a1f6bf3bcb972ccf3cd7a))
* Random bug fixes ([ad2868a](https://github.com/Jbuxofplenty/coral_clash/commit/ad2868a43e8287b715bc4a751a14011d95eb2471))
* Random bug fixes ([60b1674](https://github.com/Jbuxofplenty/coral_clash/commit/60b1674f25975bb0f7ba482725e60c5a3aa6e08d))
* Random bug fixes ([969011a](https://github.com/Jbuxofplenty/coral_clash/commit/969011a83e95e4d6988570dd9e19e92c050b64bb))
* Re-org and more tests to CI ([9f602a3](https://github.com/Jbuxofplenty/coral_clash/commit/9f602a3d4631f46be4737efb7760ce4701e4eb52))
* Readme updates ([c96db80](https://github.com/Jbuxofplenty/coral_clash/commit/c96db806b9a1de727f2967a1b6b0c1f1fbed918d))
* README.md updates ([d09c327](https://github.com/Jbuxofplenty/coral_clash/commit/d09c327d4929ebc11486bf3f9bc78a4399431259))
* Real-time Updates ([9da242d](https://github.com/Jbuxofplenty/coral_clash/commit/9da242d38130ea92038a0d9ee001f807809f8726))
* Remove deploy on push to main ([84ccee1](https://github.com/Jbuxofplenty/coral_clash/commit/84ccee1fbce4b440581acff997b16ccd5ff5f57e))
* Remove EAS Dependency ([aa25046](https://github.com/Jbuxofplenty/coral_clash/commit/aa25046757a807e24a83cbc4795de35f2a750186))
* Remove EXPO_TOKEN ([6d9c75f](https://github.com/Jbuxofplenty/coral_clash/commit/6d9c75f2c275eb6adfdfd0e9c9919f25f043ded7))
* Remove manual build version check of 10 ([7d0836f](https://github.com/Jbuxofplenty/coral_clash/commit/7d0836fb06ce73c4327745dc27545666bb634cf3))
* Remove outdated file ([2374a36](https://github.com/Jbuxofplenty/coral_clash/commit/2374a364773eeb81394cf2b49df7163eed312131))
* Rename test ([c1c2f77](https://github.com/Jbuxofplenty/coral_clash/commit/c1c2f777fa9a80b8474d8646b4e082203c5e25ae))
* Revert Internal Distribution ([9acfe3e](https://github.com/Jbuxofplenty/coral_clash/commit/9acfe3e0a914f02042f922b96f241f5db7e09b2a))
* Saving progress ([d4aafa2](https://github.com/Jbuxofplenty/coral_clash/commit/d4aafa2ab93bde8a4367c4770afd47781ab18a6c))
* Saving progress (need to fix undo button state bug and coral state bug) ([ab8c5b2](https://github.com/Jbuxofplenty/coral_clash/commit/ab8c5b2f397200ec6287474d2a13a947a71bec32))
* Secrets ([d66925d](https://github.com/Jbuxofplenty/coral_clash/commit/d66925d651331694df8a8106689cf1866d975e3c))
* **security:** add Firebase App Check with environment variable toggle ([5e01ba0](https://github.com/Jbuxofplenty/coral_clash/commit/5e01ba0ddc2f4804877a8f4690586ad38e908a92))
* Sensitive vs secret ([cabe977](https://github.com/Jbuxofplenty/coral_clash/commit/cabe977af9c16c8ca0cbe695802a8096cf96e46b))
* **shared:** setup semantic versioning and GitHub Packages ([23e4ffd](https://github.com/Jbuxofplenty/coral_clash/commit/23e4ffd6d9605fbe05ea06520e7bc9a6779ad87a))
* Simple bug fix ([c829fee](https://github.com/Jbuxofplenty/coral_clash/commit/c829fee9b920a75724a7ad82d43e37f1407a1356))
* Small bug fix ([e4f5ed2](https://github.com/Jbuxofplenty/coral_clash/commit/e4f5ed208c968816949505cb90e46400f10a1e70))
* Small bug fixes ([4e87267](https://github.com/Jbuxofplenty/coral_clash/commit/4e872678ad66a14d4a92ea804159967c22d2de86))
* Some Improvements ([3e06e14](https://github.com/Jbuxofplenty/coral_clash/commit/3e06e1415c842d4dbbf0cae429ec9670d5694d17))
* Splash ([73a7d52](https://github.com/Jbuxofplenty/coral_clash/commit/73a7d52ca992b986ed40a309f65792092c62a6b2))
* Static Rules ([1cfb146](https://github.com/Jbuxofplenty/coral_clash/commit/1cfb1462e3d56c9b6c2e260f1f086608dafebf1e))
* Stats screen ([8e511af](https://github.com/Jbuxofplenty/coral_clash/commit/8e511afe7d8299be0fb96bd193aed31d9d64b992))
* Tablet responsiveness (not great, needs improvement) ([59cc38f](https://github.com/Jbuxofplenty/coral_clash/commit/59cc38f1b8ad1effde71e9995c3ffba5c71024f5))
* Theme handling ([ec8700f](https://github.com/Jbuxofplenty/coral_clash/commit/ec8700f262a4abeb145adf2fa022fd0670149d1d))
* Themed alerts ([6b4257e](https://github.com/Jbuxofplenty/coral_clash/commit/6b4257e2282ed53c7713c8da5bb71e3b2eb99d85))
* Turn Fix ([eca9d66](https://github.com/Jbuxofplenty/coral_clash/commit/eca9d6674ff90f04c213e88bf0da21832e6d5115))
* Two More Whale Check Scenarios ([62f3c1c](https://github.com/Jbuxofplenty/coral_clash/commit/62f3c1c404ddd046301379321c78afba09ba7c14))
* Two More Whale Check Scenarios ([1a487d8](https://github.com/Jbuxofplenty/coral_clash/commit/1a487d8a2d46ab770a804940f0673a0eeffd3715))
* Two small bug fixes ([6ebafbf](https://github.com/Jbuxofplenty/coral_clash/commit/6ebafbf1692b0aac69d73de8c095b7cde3fdf019))
* **ui:** add compact mode to request banners and fix text overflow ([e02acf8](https://github.com/Jbuxofplenty/coral_clash/commit/e02acf84391c872e7ae526b3402567f295b9996b))
* **ui:** add coral under control display to player status bar ([1a7dcac](https://github.com/Jbuxofplenty/coral_clash/commit/1a7dcac44aa5ce59e6a372c670961c46251b3a63))
* **ui:** add horizontal layout option to GameModeCard ([071e33a](https://github.com/Jbuxofplenty/coral_clash/commit/071e33a2329c69b435a53cce8a2702057dbd1b66))
* Update Deps Fix ([7be87f0](https://github.com/Jbuxofplenty/coral_clash/commit/7be87f013385c5a05d7d642f16c4d39f7bb6c2be))
* Update deps GH action fix ([6ae991f](https://github.com/Jbuxofplenty/coral_clash/commit/6ae991f1236c968e9031db5f4534af433c0faf46))
* Update deps GH action fix v2 ([1e052d4](https://github.com/Jbuxofplenty/coral_clash/commit/1e052d4dfc9af613c58055baa25a2e97119342eb))
* Update Domain JSON with New SHA ([c0bd3e5](https://github.com/Jbuxofplenty/coral_clash/commit/c0bd3e5f63899410f9b173c4a875b85f435322e5))
* Update expo ([84e34ef](https://github.com/Jbuxofplenty/coral_clash/commit/84e34eff49ff8c729ceff00a9e354535857335d4))
* Update README.md ([50a475a](https://github.com/Jbuxofplenty/coral_clash/commit/50a475a5af11aa499eed97d6101edcc78e0b89eb))
* Upload images ([f7ca94b](https://github.com/Jbuxofplenty/coral_clash/commit/f7ca94bc0675d18440eab62563ad0f620f39f766))
* V1 gameboard almost setup properly ([67e6ff2](https://github.com/Jbuxofplenty/coral_clash/commit/67e6ff29ad0554f5c0b4d36eaf8247869fc349dc))
* V1, just need a how-to guide now ([bab45c7](https://github.com/Jbuxofplenty/coral_clash/commit/bab45c7535b6d1d16274c46699cd23cb071b5335))
* View enemy moves ([ec2f921](https://github.com/Jbuxofplenty/coral_clash/commit/ec2f921c49aea9752dd266a21234c8803b147401))
* Website Improvements ([4395463](https://github.com/Jbuxofplenty/coral_clash/commit/439546356e5a9e42ef580afe321cd9a1b5c054bf))
* Whale Bugs ([5974cb2](https://github.com/Jbuxofplenty/coral_clash/commit/5974cb2d679f913b44314d2b5544b01f361f6c5b))
* Whale Bugs ([26cbe67](https://github.com/Jbuxofplenty/coral_clash/commit/26cbe670e9cdce16c8087f211cd52fc3302dd5d1))
* Whale capture bug fix ([fcabe0b](https://github.com/Jbuxofplenty/coral_clash/commit/fcabe0bc53108ee25250f2d14521e07547ad65ac))
* Whale Coral Removal Progress ([448607c](https://github.com/Jbuxofplenty/coral_clash/commit/448607c7145aa33b821936d3a0b2dbefce5ba966))
* Whale diagonally moving ([cb5aad1](https://github.com/Jbuxofplenty/coral_clash/commit/cb5aad1579daf95db3772670bc0e112cd35c4778))


### Reverts

* **ci:** remove release-shared from deploy-staging workflow ([e4cbed2](https://github.com/Jbuxofplenty/coral_clash/commit/e4cbed230e637b14100f1a4bd4f7b13c9ea635c3))
* **undo:** remove undo animation - restore immediate undo behavior ([82879af](https://github.com/Jbuxofplenty/coral_clash/commit/82879af30606c42d00ad62987adfd7f99db6eb2f))
* **undo:** remove undo flip delay in pass-and-play ([1a10318](https://github.com/Jbuxofplenty/coral_clash/commit/1a10318c793953d3ca5c11a548db264ec658ab08))


### BREAKING CHANGES

* **ci:** - Old STAGING_CLIENT_ENV / PRODUCTION_CLIENT_ENV secrets no longer used
- Run ./scripts/setup-individual-secrets.sh to upload new secrets
* **ci:** Old *_CLIENT_ENV_JSON secrets no longer used
