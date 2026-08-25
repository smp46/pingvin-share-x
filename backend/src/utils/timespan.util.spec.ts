import { isValidTimespan } from "./timespan.util";

describe("isValidTimespan", () => {
  it("accepts an amount and a unit it knows", () => {
    for (const value of ["7 days", "0 days", "3 months", "90 minutes", "1 years"])
      expect(isValidTimespan(value)).toBe(true);
  });

  // moment ignores a unit it does not recognise, which silently makes the
  // threshold "now"
  it("rejects a unit it does not know", () => {
    expect(isValidTimespan("7 bananas")).toBe(false);
    expect(isValidTimespan("7 day")).toBe(false);
    expect(isValidTimespan("7 DAYS")).toBe(false);
  });

  it("rejects anything that is not a number and a unit", () => {
    for (const value of ["banana", "", "7", "days", "7 days extra", "7  days"])
      expect(isValidTimespan(value)).toBe(false);
  });

  // parseInt("7abc") is 7, so checking the whole string matters
  it("rejects an amount with something stuck to it", () => {
    expect(isValidTimespan("7abc days")).toBe(false);
    expect(isValidTimespan("7.5 days")).toBe(false);
    expect(isValidTimespan("1e3 days")).toBe(false);
  });

  // a negative threshold lands in the future and selects shares that are
  // still valid, which is how shares get deleted early
  it("rejects a negative amount", () => {
    expect(isValidTimespan("-5 days")).toBe(false);
    expect(isValidTimespan("-1 days")).toBe(false);
  });

  // except for the one variable where -1 is the documented way to switch
  // retention off, which the expiry job checks for by name
  it("accepts -1 only where it means disabled", () => {
    expect(isValidTimespan("-1 days", true)).toBe(true);
    expect(isValidTimespan("-2 days", true)).toBe(false);
    expect(isValidTimespan("0 days", true)).toBe(true);
  });

  it("rejects a value that is not a string at all", () => {
    expect(isValidTimespan(null as unknown as string)).toBe(false);
    expect(isValidTimespan(7 as unknown as string)).toBe(false);
  });
});
