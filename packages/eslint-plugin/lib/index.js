/**
 * This file is GENERATED, please run `yarn update` after adding or renaming a rule
 */
module.exports = {
  rules: {
    'no-global-event-off': require('./rules/no-global-event-off.js'),
    'no-runtime-template-compiler': require('./rules/no-runtime-template-compiler.js'),
    'require-i18n-strings': require('./rules/require-i18n-strings.js'),
    'require-valid-i18n-helpers': require('./rules/require-valid-i18n-helpers.js'),
    'vtu-no-explicit-wrapper-destroy': require('./rules/vtu-no-explicit-wrapper-destroy.js'),
    'vtu-no-wrapper-vm': require('./rules/vtu-no-wrapper-vm.js'),
    'vue-no-data-toggle': require('./rules/vue-no-data-toggle.js'),
    'vue-no-new-non-primitive-in-template': require('./rules/vue-no-new-non-primitive-in-template.js'),
    'vue-prefer-dollar-scopedslots': require('./rules/vue-prefer-dollar-scopedslots.js'),
    'vue-require-i18n-attribute-strings': require('./rules/vue-require-i18n-attribute-strings.js'),
    'vue-require-i18n-strings': require('./rules/vue-require-i18n-strings.js'),
    'vue-require-required-key': require('./rules/vue-require-required-key.js'),
    'vue-require-valid-i18n-helpers': require('./rules/vue-require-valid-i18n-helpers.js'),
    'vue-slot-name-casing': require('./rules/vue-slot-name-casing.js'),
  },
  configs: {
    default: require('./configs/default.js'),
    typescript: require('./configs/typescript.js'),
    base: require('./configs/base.js'),
    vue: require('./configs/vue.js'),
    i18n: require('./configs/i18n.js'),
    jest: require('./configs/jest.js'),
  },
};
