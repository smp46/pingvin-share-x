import {
  byteToHumanSizeString,
  byteToUnitAndSize,
  unitAndSizeToByte,
} from "./fileSize.util";

// The admin settings page shows a size as a number and a unit, and turns the
// pair back into bytes on save. So these two are a round trip over a value an
// administrator is editing, and what the round trip does to it matters.

describe("byteToHumanSizeString", () => {
  it("uses the largest unit the number fits", () => {
    expect(byteToHumanSizeString(999)).toBe("999.0 B");
    expect(byteToHumanSizeString(1000)).toBe("1.0 KB");
    expect(byteToHumanSizeString(1_500_000)).toBe("1.5 MB");
    expect(byteToHumanSizeString(2_000_000_000)).toBe("2.0 GB");
  });

  it("spells zero out rather than showing 0.0 B", () => {
    expect(byteToHumanSizeString(0)).toBe("0 Byte");
  });

  // powers of 1000, not 1024, so a "gigabyte" here is the decimal one
  it("counts in thousands", () => {
    expect(byteToHumanSizeString(1024)).toBe("1.0 KB");
  });
});

describe("byteToUnitAndSize", () => {
  it("splits a byte count into the number and unit shown in the form", () => {
    expect(byteToUnitAndSize(1_000_000)).toEqual({ size: 1, unit: "MB" });
    expect(byteToUnitAndSize(1_500_000)).toEqual({ size: 1.5, unit: "MB" });
    expect(byteToUnitAndSize(0)).toEqual({ size: 0, unit: "B" });
  });

  it("rounds to one decimal place", () => {
    expect(byteToUnitAndSize(1_234_567)).toEqual({ size: 1.2, unit: "MB" });
  });
});

describe("unitAndSizeToByte", () => {
  it("turns the pair back into bytes", () => {
    expect(unitAndSizeToByte("MB", 1)).toBe(1_000_000);
    expect(unitAndSizeToByte("GB", 2.5)).toBe(2_500_000_000);
    expect(unitAndSizeToByte("B", 512)).toBe(512);
  });

  // indexOf returns -1 for a unit it does not know, and 1000 to the power of
  // -1 is a thousandth, so the answer comes back near zero instead of failing.
  // The form only offers the five it knows, so this is a record of what would
  // happen rather than something that happens.
  it("returns a thousandth of the number for a unit it does not know", () => {
    expect(unitAndSizeToByte("XB", 5)).toBe(0.005);
  });
});

describe("the round trip an administrator saves through", () => {
  it("leaves a value that fits in one decimal place alone", () => {
    for (const bytes of [1_000_000, 999, 2_500_000_000, 0]) {
      const { unit, size } = byteToUnitAndSize(bytes);
      expect(unitAndSizeToByte(unit, size)).toBe(bytes);
    }
  });

  // Opening the settings page and saving without touching the field changes
  // the stored value, because the display rounds to one decimal and the save
  // reads the rounded number back. 5 GiB comes back 31 MB larger.
  it("changes a value that does not, which is worth knowing", () => {
    const fiveGiB = 5_368_709_120;
    const { unit, size } = byteToUnitAndSize(fiveGiB);

    expect({ unit, size }).toEqual({ unit: "GB", size: 5.4 });
    expect(unitAndSizeToByte(unit, size)).toBe(5_400_000_000);
    expect(unitAndSizeToByte(unit, size)).not.toBe(fiveGiB);
  });
});
