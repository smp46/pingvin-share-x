import moment from "moment";
import {
  getExpirationPreview,
  stringToTimespan,
  timespanToString,
} from "./date.util";

// The frontend keeps its own copy of these, separate from the backend's. This
// copy is what the admin settings read a stored timespan through and what the
// upload form shows someone before they create a share, so it is worth pinning
// on its own rather than leaning on the backend's tests.

describe("stringToTimespan", () => {
  it("splits a stored value into the number and unit", () => {
    expect(stringToTimespan("7 days")).toEqual({ value: 7, unit: "days" });
    expect(stringToTimespan("90 minutes")).toEqual({
      value: 90,
      unit: "minutes",
    });
  });

  it("keeps zero, which is a value settings use", () => {
    expect(stringToTimespan("0 days")).toEqual({ value: 0, unit: "days" });
  });

  // -1 is how file retention is switched off
  it("keeps a negative number", () => {
    expect(stringToTimespan("-1 days")).toEqual({ value: -1, unit: "days" });
  });

  // parseInt of a word is NaN and the unit comes back undefined. The server
  // rejects values like this now, so this records what the parser does rather
  // than something a stored setting can be.
  it("gives NaN and no unit for something that is not a timespan", () => {
    expect(stringToTimespan("banana")).toEqual({
      value: NaN,
      unit: undefined,
    });
    expect(stringToTimespan("7")).toEqual({ value: 7, unit: undefined });
  });
});

describe("timespanToString", () => {
  it("puts the pair back together the way it is stored", () => {
    expect(timespanToString({ value: 7, unit: "days" } as any)).toBe("7 days");
  });

  // the settings form reads a value, edits it and writes it back, so the two
  // have to agree exactly or saving without changing anything would alter it
  it("round trips with stringToTimespan", () => {
    for (const value of [
      "7 days",
      "0 days",
      "-1 days",
      "3 months",
      "90 minutes",
    ])
      expect(timespanToString(stringToTimespan(value))).toBe(value);
  });
});

describe("getExpirationPreview", () => {
  const messages = {
    neverExpires: "This share will never expire",
    expiresOn: "This share will expire on {expiration}",
  };

  const form = (values: Record<string, unknown>) =>
    ({ values }) as unknown as Parameters<typeof getExpirationPreview>[1];

  it("says so when the share never expires", () => {
    expect(
      getExpirationPreview(
        messages,
        form({
          never_expires: true,
          expiration_num: 7,
          expiration_unit: "-days",
        }),
      ),
    ).toBe(messages.neverExpires);
  });

  it("fills the date into the message rather than leaving the placeholder", () => {
    const preview = getExpirationPreview(
      messages,
      form({
        never_expires: false,
        expiration_num: 7,
        expiration_unit: "-days",
      }),
    );

    expect(preview).not.toContain("{expiration}");
    expect(preview).toContain("This share will expire on ");
  });

  it("puts the date where the number and unit say", () => {
    const preview = getExpirationPreview(
      messages,
      form({
        never_expires: false,
        expiration_num: 7,
        expiration_unit: "-days",
      }),
    );

    const shown = preview.replace("This share will expire on ", "");
    const expected = moment().add(7, "days");

    expect(moment(shown, "LLL").isSame(expected, "day")).toBe(true);
  });

  it("moves the date when the unit changes", () => {
    const hour = getExpirationPreview(
      messages,
      form({ expiration_num: 1, expiration_unit: "-hours" }),
    );
    const month = getExpirationPreview(
      messages,
      form({ expiration_num: 1, expiration_unit: "-months" }),
    );

    expect(hour).not.toBe(month);
  });

  // never_expires is optional on the form, so an absent one is the normal case
  it("treats a missing never_expires as expiring", () => {
    expect(
      getExpirationPreview(
        messages,
        form({ expiration_num: 2, expiration_unit: "-days" }),
      ),
    ).not.toBe(messages.neverExpires);
  });
});
