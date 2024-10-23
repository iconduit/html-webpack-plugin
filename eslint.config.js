const js = require("@eslint/js");
const nodePlugin = require("eslint-plugin-n");
const importPlugin = require("eslint-plugin-import");
const promisePlugin = require("eslint-plugin-promise");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      ".makefiles/**",
      "artifacts/**",
      "node_modules/**",
      "test/integration/**",
    ],
  },
  js.configs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  importPlugin.flatConfigs.recommended,
  promisePlugin.configs["flat/recommended"],
  prettierConfig,
  {
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          // allow unused args if they start with _
          argsIgnorePattern: "^_",
        },
      ],
      // handled by import/no-unresolved
      "n/no-missing-import": "off",
      // don't check for unsupported features - too much config to make this work
      "n/no-unsupported-features/es-builtins": "off",
      "n/no-unsupported-features/es-syntax": "off",
      "n/no-unsupported-features/node-builtins": "off",
    },
  },
];
