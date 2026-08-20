import { BadRequestException, ExecutionContext } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { IdValidation } from "./shareIdValidation.guard";

const contextFor = (request: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe("IdValidation", () => {
  let guard: IdValidation;

  beforeEach(() => {
    const i18n = { t: jest.fn().mockReturnValue("invalid id") };
    guard = new IdValidation(i18n as unknown as I18nService);
  });

  const accepts = (id: string) =>
    guard.canActivate(contextFor({ params: { id } }));

  it("accepts plain ids", () => {
    expect(accepts("abc123")).toBe(true);
    expect(accepts("ABCdef789")).toBe(true);
  });

  // shares created with these characters used to fail validation, which
  // meant they could not even be deleted
  it("accepts underscores and hyphens", () => {
    expect(accepts("my_share")).toBe(true);
    expect(accepts("my-share")).toBe(true);
    expect(accepts("mix_of-both123")).toBe(true);
  });

  it("accepts base64 padding", () => {
    expect(accepts("abc=")).toBe(true);
    expect(accepts("abc==")).toBe(true);
  });

  it("rejects characters outside the allowed set", () => {
    for (const bad of ["abc$", "with space", "../etc/passwd", "drop;table"]) {
      expect(() => accepts(bad)).toThrow(BadRequestException);
    }
  });

  it("rejects more padding than base64 allows", () => {
    expect(() => accepts("abc===")).toThrow(BadRequestException);
  });

  it("passes through when no id is present", () => {
    expect(guard.canActivate(contextFor({ params: {} }))).toBe(true);
  });

  it("falls back to the shareId param", () => {
    const ctx = contextFor({ params: { shareId: "valid_id" } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("checks ids coming from the query and body too", () => {
    expect(guard.canActivate(contextFor({ query: { id: "ok_id" } }))).toBe(true);
    expect(() =>
      guard.canActivate(contextFor({ body: { id: "bad id" } })),
    ).toThrow(BadRequestException);
  });
});
