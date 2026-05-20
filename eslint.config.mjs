export default [
  {
    ignores: [
      "backend/**",
      "frontend/**",
      "docs/**",
      "scripts/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
    ],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
