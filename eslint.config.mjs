/* eslint-disable */
// @ts-check

import { getEslintConfig } from "@ezez/eslint";

/** @type {import("eslint").Linter.FlatConfig} */
const config = {
    rules: {
        "@typescript-eslint/no-shadow": "off",
        "func-style": "off",
        "no-undef": "off",
        "no-useless-assignment": "off",
        "@typescript-eslint/parameter-properties": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@stylistic/brace-style": [
            "error",
            "1tbs",
            {
                allowSingleLine: true,
            },
        ],
        "max-statements": ["error", 70],
        "max-lines-per-function": "off",
        "@stylistic/max-len": "off",
        "max-lines": "off",
        "no-param-reassign": [
            "error",
            {
                props: false,
            },
        ],
        // max dependencies is off because this is a library
        // and so it's not a problem to have many dependencies
        "import/max-dependencies": "off",
    },
};

const eslintConfig = getEslintConfig();

eslintConfig.push(config);

export default eslintConfig;
