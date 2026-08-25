import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "./config.service";

// The timespan type is deliberately skipped by the type check in update, since
// it arrives as a string whatever it holds, so validateConfigVariable is the
// only thing standing between the api and a value the expiry job will act on.

const variables = [
  { category: "share", name: "fileRetentionPeriod", type: "timespan" },
  { category: "share", name: "defaultExpiration", type: "timespan" },
  { category: "share", name: "shareIdLength", type: "number" },
] as any[];

const service = () => new ConfigService(variables, {} as any);

const rejects = (key: string, value: unknown) =>
  expect(() =>
    service().validateConfigVariable(key, value as string),
  ).toThrow(BadRequestException);

const accepts = (key: string, value: unknown) =>
  expect(() =>
    service().validateConfigVariable(key, value as string),
  ).not.toThrow();

describe("validateConfigVariable, timespan", () => {
  it("accepts a whole number and a known unit", () => {
    accepts("share.defaultExpiration", "7 days");
    accepts("share.fileRetentionPeriod", "3 months");
  });

  // each of these parses to a threshold of now, which turns the retention
  // grace period into zero without anything saying so
  it("rejects the values that silently mean now", () => {
    rejects("share.fileRetentionPeriod", "banana");
    rejects("share.fileRetentionPeriod", "7");
    rejects("share.fileRetentionPeriod", "7 bananas");
  });

  // this one moves the threshold into the future and selects shares that have
  // not expired yet
  it("rejects a negative amount", () => {
    rejects("share.defaultExpiration", "-5 days");
  });

  it("keeps -1 working where it means retention is off", () => {
    accepts("share.fileRetentionPeriod", "-1 days");
  });

  it("does not let -1 through anywhere else", () => {
    rejects("share.defaultExpiration", "-1 days");
  });

  // clearing a value falls back to the default and is not a timespan
  it("allows null, which clears the setting", () => {
    accepts("share.fileRetentionPeriod", null);
  });

  it("leaves other types to the checks that already existed", () => {
    accepts("share.shareIdLength", 8);
    rejects("share.shareIdLength", 1);
  });
});
