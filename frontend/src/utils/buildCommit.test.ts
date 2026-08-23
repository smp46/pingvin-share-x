import { shortCommit } from "./buildCommit";

describe("shortCommit", () => {
  it("shortens a full sha to the seven characters git shows", () => {
    expect(shortCommit("24aaf800c1e4b9f0a2d3e5c6b7a8901234567890")).toBe(
      "24aaf80",
    );
  });

  it("keeps a sha that is already short", () => {
    expect(shortCommit("24aaf80")).toBe("24aaf80");
  });

  it("lowercases so the same commit always reads the same", () => {
    expect(shortCommit("24AAF800C1E4B9F0A2D3E5C6B7A8901234567890")).toBe(
      "24aaf80",
    );
  });

  it("ignores whitespace around the value", () => {
    expect(shortCommit("  24aaf80\n")).toBe("24aaf80");
  });

  // an image built without the build argument
  it("gives nothing for an empty or missing value", () => {
    expect(shortCommit("")).toBe("");
    expect(shortCommit(undefined)).toBe("");
  });

  // better to show only the version than to show a trimmed placeholder as
  // though it were a real commit
  it("gives nothing for something that is not a sha", () => {
    expect(shortCommit("unknown")).toBe("");
    expect(shortCommit("v2.0.0-beta.0")).toBe("");
    expect(shortCommit("abc")).toBe("");
  });
});
