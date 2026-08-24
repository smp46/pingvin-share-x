import * as fs from "fs";
import * as path from "path";
import configService from "../services/config.service";
import { getDefaultConfig } from "./defaultConfig.util";

// getDefaultConfig stands in for the real config while the backend is
// unreachable, and configService.get throws on a key it cannot find. Since
// components call it while rendering, a key missing from here is not a setting
// falling back to its default, it is a page that does not render.
//
// The two lists drifted apart and nothing said so until production logs filled
// with "Config variable share.enableUserRecipients not found". This reads the
// source and compares, so the next key added to a component fails here instead.

const SRC = path.resolve(__dirname, "..");

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });

const keysReadFromComponents = (): string[] => {
  const keys = new Set<string>();
  for (const file of walk(SRC)) {
    const source = fs.readFileSync(file, "utf8");
    for (const [, key] of source.matchAll(
      /\bconfig(?:Service)?\.get\(\s*"([a-zA-Z]+\.[a-zA-Z0-9]+)"/g,
    ))
      keys.add(key);
  }
  return [...keys].sort();
};

describe("getDefaultConfig", () => {
  const defaults = getDefaultConfig();
  const covered = new Set(defaults.map((c) => c.key));

  it("finds keys to check, so the scan itself cannot silently pass", () => {
    const keys = keysReadFromComponents();
    expect(keys.length).toBeGreaterThan(20);
    expect(keys).toContain("share.enableUserRecipients");
  });

  it("covers every key the app reads through config.get", () => {
    const missing = keysReadFromComponents().filter((k) => !covered.has(k));
    expect(missing).toEqual([]);
  });

  it("lets config.get read every one of its own entries without throwing", () => {
    for (const entry of defaults) {
      expect(() => configService.get(entry.key, defaults)).not.toThrow();
    }
  });

  it("has no duplicate keys", () => {
    const keys = defaults.map((c) => c.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  // the header reads this one during render, which is how the startup window
  // turned into an error on every request
  it("answers for share.enableUserRecipients", () => {
    expect(configService.get("share.enableUserRecipients", defaults)).toBe(
      false,
    );
  });

  // an instance whose config we cannot read should not be accepting signups
  it("keeps registration closed while the real config is unknown", () => {
    expect(configService.get("security.allowRegistration", defaults)).toBe(
      false,
    );
  });
});
