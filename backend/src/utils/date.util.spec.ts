import {
  parseRelativeDateToAbsolute,
  stringToTimespan,
  timespanToString,
} from "./date.util";

describe("parseRelativeDateToAbsolute", () => {
  // guards compare an expiration against moment(0) to mean "no expiry",
  // so this has to stay exactly the epoch
  it("maps never to the epoch", () => {
    expect(parseRelativeDateToAbsolute("never").getTime()).toBe(0);
  });

  it("adds the given amount of time to now", () => {
    const before = Date.now();
    const result = parseRelativeDateToAbsolute("1-days").getTime();
    const expected = before + 24 * 60 * 60 * 1000;
    expect(Math.abs(result - expected)).toBeLessThan(5000);
  });

  it("understands the units used by the share form", () => {
    const now = Date.now();
    const hour = parseRelativeDateToAbsolute("2-hours").getTime();
    const week = parseRelativeDateToAbsolute("1-weeks").getTime();

    expect(Math.abs(hour - (now + 2 * 60 * 60 * 1000))).toBeLessThan(5000);
    expect(Math.abs(week - (now + 7 * 24 * 60 * 60 * 1000))).toBeLessThan(5000);
  });

  it("always returns a future date for a positive span", () => {
    expect(parseRelativeDateToAbsolute("1-minutes").getTime()).toBeGreaterThan(
      Date.now(),
    );
  });
});

describe("timespan parsing", () => {
  it("splits a config value into a number and a unit", () => {
    expect(stringToTimespan("7 days")).toEqual({ value: 7, unit: "days" });
    expect(stringToTimespan("0 days")).toEqual({ value: 0, unit: "days" });
    expect(stringToTimespan("3 months")).toEqual({ value: 3, unit: "months" });
  });

  it("round trips back to the same string", () => {
    for (const value of ["7 days", "1 hours", "12 months"]) {
      expect(timespanToString(stringToTimespan(value))).toBe(value);
    }
  });
});
