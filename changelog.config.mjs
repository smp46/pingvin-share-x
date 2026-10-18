import { readFileSync } from "fs";
import semver from "semver";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const isCurrentBeta = Boolean(semver.prerelease(pkg.version));

export default {
  tags: {
    skipUnstable: !isCurrentBeta,
  },
  writer: {
    generateOn: (commit) => {
      const version = semver.valid(commit.version);
      if (!version) return false;
      if (isCurrentBeta) {
        return true;
      }
      return semver.prerelease(version) === null;
    },
  },
};
