// Pre-migration checks. These run against a throwaway SQLite file built from
// the real migrations, so they need no server and no docker stack, but they do
// shell out to `prisma migrate deploy` first, which makes them slower than the
// plain unit tests. Kept in their own config for that reason.
//
//   npm run test:db
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.db\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(nanoid)/)"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  globalSetup: "<rootDir>/test/prisma/setup.ts",
  globalTeardown: "<rootDir>/test/prisma/teardown.ts",
  testTimeout: 60_000,
  // one sqlite file, one writer
  maxWorkers: 1,
};
