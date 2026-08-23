// Next 16 removed `next lint`, so eslint is run directly and needs eslint 9,
// which reads this file instead of .eslintrc.json. Same rules as before, in
// the format eslint 9 understands.
import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
  ...next,
  prettier,
  {
    rules: {
      quotes: ["warn", "double", { allowTemplateLiterals: true }],
      "react-hooks/exhaustive-deps": ["off"],
      "import/no-anonymous-default-export": ["off"],
      "no-unused-vars": ["off"],
      "@typescript-eslint/no-unused-vars": ["off"],
      "react/no-unescaped-entities": ["off"],
      "@next/next/no-img-element": ["off"],

      // New in eslint-config-next 16, from the React Compiler rule set. They
      // flag patterns that predate this upgrade, 21 of them across ten files,
      // and each fix is a real change to how a component holds state. Kept
      // visible as warnings so they can be worked through deliberately rather
      // than rushed into the version bump that surfaced them.
      "react-hooks/set-state-in-effect": ["warn"],
      "react-hooks/immutability": ["warn"],
      "react-hooks/refs": ["warn"],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly",
      },
    },
  },
];
