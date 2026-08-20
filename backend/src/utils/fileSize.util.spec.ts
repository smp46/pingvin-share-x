import { byteToHumanSizeString } from "./fileSize.util";

describe("byteToHumanSizeString", () => {
  it("has a special case for nothing at all", () => {
    expect(byteToHumanSizeString(0)).toBe("0 Byte");
  });

  it("keeps small values in bytes", () => {
    expect(byteToHumanSizeString(1)).toBe("1.0 B");
    expect(byteToHumanSizeString(999)).toBe("999.0 B");
  });

  it("steps up a unit every factor of 1000", () => {
    expect(byteToHumanSizeString(1000)).toBe("1.0 KB");
    expect(byteToHumanSizeString(1_000_000)).toBe("1.0 MB");
    expect(byteToHumanSizeString(1_000_000_000)).toBe("1.0 GB");
    expect(byteToHumanSizeString(1_000_000_000_000)).toBe("1.0 TB");
  });

  it("keeps one decimal place", () => {
    expect(byteToHumanSizeString(1500)).toBe("1.5 KB");
    expect(byteToHumanSizeString(2_500_000)).toBe("2.5 MB");
  });

  // the default share.maxSize, worth pinning since it shows up in the ui
  it("formats the default max share size", () => {
    expect(byteToHumanSizeString(1_000_000_000)).toBe("1.0 GB");
  });
});
