import { generateShareId } from "./share.util";

describe("generateShareId", () => {
  it("should generate an ID with the default length of 16", () => {
    const id = generateShareId();
    expect(id).toHaveLength(16);
  });

  it("should generate an ID with the specified length", () => {
    const id10 = generateShareId(10);
    expect(id10).toHaveLength(10);

    const id20 = generateShareId(20);
    expect(id20).toHaveLength(20);
  });

  it("should generate a minimum length of 3 if a smaller value is provided", () => {
    const id2 = generateShareId(2);
    expect(id2).toHaveLength(3);

    const id0 = generateShareId(0);
    expect(id0).toHaveLength(3);
  });

  it("should only contain valid characters (a-z, A-Z, 0-9)", () => {
    const id = generateShareId(100);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("should generate different IDs on successive calls (randomness check)", () => {
    const id1 = generateShareId();
    const id2 = generateShareId();
    expect(id1).not.toEqual(id2);
  });
});
