import { Prisma } from "@prisma/client";
import { duplicatedField } from "./prismaError";

const withMeta = (meta: unknown) =>
  ({ code: "P2002", meta }) as unknown as Prisma.PrismaClientKnownRequestError;

describe("duplicatedField", () => {
  // what Prisma 7 reports through a driver adapter
  it("reads the constraint fields a driver adapter reports", () => {
    expect(
      duplicatedField(
        withMeta({
          modelName: "User",
          driverAdapterError: {
            name: "DriverAdapterError",
            cause: {
              kind: "UniqueConstraintViolation",
              constraint: { fields: ["email"] },
            },
          },
        }),
      ),
    ).toBe("email");
  });

  // what Prisma 6 reported, kept so the helper works either way
  it("still reads the old target array", () => {
    expect(duplicatedField(withMeta({ target: ["username"] }))).toBe("username");
  });

  it("accepts a bare string target", () => {
    expect(duplicatedField(withMeta({ target: "email" }))).toBe("email");
  });

  // the old code did meta.target[0] straight out and threw a TypeError here,
  // which surfaced as a 500 instead of a useful message
  it("returns undefined instead of throwing when nothing is there", () => {
    expect(duplicatedField(withMeta(undefined))).toBeUndefined();
    expect(duplicatedField(withMeta({}))).toBeUndefined();
    expect(duplicatedField(withMeta({ target: [] }))).toBeUndefined();
    expect(
      duplicatedField(withMeta({ driverAdapterError: { cause: {} } })),
    ).toBeUndefined();
  });

  it("prefers the adapter shape when both are present", () => {
    expect(
      duplicatedField(
        withMeta({
          target: ["old"],
          driverAdapterError: { cause: { constraint: { fields: ["new"] } } },
        }),
      ),
    ).toBe("new");
  });
});
