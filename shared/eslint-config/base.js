/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  settings: {
    // Help eslint-plugin-tailwindcss to parse Tailwind classes outside of className
    tailwindcss: {
      config: "shared/ui/tailwind.config.ts",
      callees: ["cn", "cva"],
    },
  },
  ignorePatterns: [
    "!**/.server",
    "!**/.client",
    ".eslintrc.cjs",
    ".eslintrc.js",
    "dist",
    "build",
    "postcss.config.js",
  ],
  plugins: [
    "drizzle",
    // Node rules
    "n",
  ],

  // Base config
  extends: [
    "eslint:recommended",
    "plugin:drizzle/recommended",
    "plugin:tailwindcss/recommended",
  ],

  rules: {
    "n/no-process-exit": "error",
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    // drizzle
    "drizzle/enforce-delete-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "tx", "localDb", "serverDb"],
      },
    ],
    "drizzle/enforce-update-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "tx", "localDb", "serverDb"],
      },
    ],
  },

  overrides: [
    // React
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: ["react", "jsx-a11y"],
      parser: "@typescript-eslint/parser",
      extends: [
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
      ],
      settings: {
        react: {
          version: "detect",
        },
        formComponents: ["Form"],
        linkComponents: [
          { name: "Link", linkAttribute: "to" },
          { name: "NavLink", linkAttribute: "to" },
        ],
        "import/resolver": {
          typescript: {},
        },
      },
      rules: {
        "react/prop-types": "off",
        "react/no-unescaped-entities": "off",
        "tailwindcss/no-custom-classname": [
          "warn",
          {
            callees: ["cn", "cva"],
          },
        ],
      },
    },

    // Typescript
    {
      files: ["**/*.{ts,tsx}"],
      plugins: ["@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
      settings: {
        "import/internal-regex": "^~/",
        "import/resolver": {
          node: {
            extensions: [".ts", ".tsx"],
          },
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/ban-types": "warn",
        "prefer-const": "off",
        "import/no-unresolved": "off",
        // Note: you must disable the base rule as it can report incorrect errors
        "no-return-await": "off",
        "no-unused-vars": "off",
        "require-await": "off",
        "@typescript-eslint/return-await": ["error", "in-try-catch"],
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/no-import-type-side-effects": "error",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            // fixStyle: "inline-type-imports",
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "all",
            argsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            ignoreRestSiblings: false,
          },
        ],
        // "import/no-cycle": "error", TODO: move on a ci check
        "import/no-duplicates": "error",
        "import/order": [
          "warn",
          {
            groups: ["builtin", "external", "internal"],
            pathGroups: [
              {
                pattern: "react",
                group: "external",
                position: "before",
              },
            ],
            pathGroupsExcludedImportTypes: ["react"],
            "newlines-between": "always",
            alphabetize: {
              order: "asc",
              caseInsensitive: true,
            },
          },
        ],
      },
    },

    // Node
    {
      files: [".eslintrc.cjs"],
      env: {
        node: true,
      },
    },
  ],
};
