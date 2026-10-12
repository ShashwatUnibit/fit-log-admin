import * as js from "@eslint/js";
import * as globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        ignores: ["build/**", "node_modules/**", "public/**", "eslint.config.mts", "*.config.js", "src/v1/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2023,
            },
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            // TypeScript specific
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/explicit-module-boundary-types": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-unnecessary-condition": "warn",
            "@typescript-eslint/prefer-nullish-coalescing": "warn",
            "@typescript-eslint/prefer-optional-chain": "warn",
            "@typescript-eslint/strict-boolean-expressions": "off",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-unsafe-enum-comparison": "error",
            "@typescript-eslint/no-base-to-string": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-empty-function": [
                "error",
                {
                    allow: ["constructors"],
                },
            ],
            "@typescript-eslint/require-await": "off",

            // Code quality
            "no-console": "off",
            "no-debugger": "error",
            "no-alert": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-arrow-callback": "error",
            "prefer-template": "error",
            "prefer-destructuring": [
                "error",
                {
                    array: true,
                    object: true,
                },
            ],
            "no-nested-ternary": "error",
            "no-unneeded-ternary": "error",
            "no-else-return": "error",

            // Complexity
            "complexity": "off",
            "max-depth": ["error", 3],
            "max-lines-per-function": ["error", { "max": 150 }],
            "max-params": ["error", 2],

            // Best practices
            "eqeqeq": ["error", "always"],
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-new-func": "error",
            "no-return-await": "error",
            "require-await": "off",
            "no-return-assign": "error",
            "no-useless-return": "error",
            "no-magic-numbers": "off",

            // Code style
            "arrow-body-style": ["error", "as-needed"],
            "curly": ["error", "all"],
            "dot-notation": "error",
            "no-lonely-if": "error",
            "object-shorthand": ["error", "always"],
            "prefer-object-spread": "error",
            "yoda": "error",
        },
    },
    {
        files: ["**/*.js", "**/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },
]);
