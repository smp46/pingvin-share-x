// Integration suite. Unlike the unit tests these talk to a running instance
// over HTTP, so they are kept out of the default jest run and out of CI.
//
//   npm run test:integration
//   INTEGRATION_BASE_URL=https://host/api npm run test:integration
//
// Admin cases additionally need INTEGRATION_ADMIN_EMAIL and
// INTEGRATION_ADMIN_PASSWORD, otherwise they are skipped.
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.integration\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(nanoid)/)"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  // uploads, scans and the antivirus polling are all slower than a unit test
  testTimeout: 120_000,
  // the server keeps per IP rate limits, parallel files would trip them
  maxWorkers: 1,
};
