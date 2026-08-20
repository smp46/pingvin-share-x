import { LOCALES } from "../i18n/locales";
import i18nUtil from "./i18n.util";

const detect = (header?: string) =>
  i18nUtil.getLanguageFromAcceptHeader(header);

describe("getLanguageFromAcceptHeader", () => {
  it("matches a full language code", () => {
    expect(detect("pl-PL")).toBe("pl-PL");
    expect(detect("de-DE")).toBe("de-DE");
    expect(detect("ja-JP")).toBe("ja-JP");
  });

  // someone on Austrian German should still get the German translation
  it("falls back to the same language in another region", () => {
    expect(detect("de-AT")).toBe("de-DE");
    expect(detect("de-CH")).toBe("de-DE");
    expect(detect("fr-CA")).toBe("fr-FR");
    expect(detect("pt-PT")).toBe("pt-BR");
  });

  it("accepts a bare language code without a region", () => {
    expect(detect("pl")).toBe("pl-PL");
    expect(detect("de")).toBe("de-DE");
  });

  it("walks the list until it finds something translated", () => {
    // hebrew and romanian are not translated, polish is
    expect(detect("he-IL,ro-RO;q=0.9,pl-PL;q=0.8,en;q=0.7")).toBe("pl-PL");
    // a slovak speaker with czech as a second choice gets czech, not english
    expect(detect("sk-SK,cs-CZ;q=0.9")).toBe("cs-CZ");
  });

  // a space after the comma is legal and some clients send it
  it("copes with spaces in the header", () => {
    expect(detect("he-IL, pl-PL;q=0.9")).toBe("pl-PL");
    expect(detect("de-AT, de;q=0.9")).toBe("de-DE");
  });

  it("falls back to english for languages we do not translate", () => {
    for (const header of ["he-IL", "hi-IN", "ro-RO", "sk-SK", "is-IS"]) {
      expect(detect(header)).toBe(LOCALES.ENGLISH.code);
    }
  });

  it("falls back to english when the header is missing or empty", () => {
    expect(detect(undefined)).toBe(LOCALES.ENGLISH.code);
    expect(detect("")).toBe(LOCALES.ENGLISH.code);
  });

  // whatever comes back has to be a code the app can actually load
  it("always returns a code the app knows", () => {
    const known = Object.values(LOCALES).map((l) => l.code);
    for (const header of ["pl-PL", "de-AT", "he-IL", "zh-TW", "", undefined]) {
      expect(known).toContain(detect(header));
    }
  });
});

describe("getLocaleByCode", () => {
  it("finds a known locale", () => {
    expect(i18nUtil.getLocaleByCode("pl-PL").code).toBe("pl-PL");
  });

  it("falls back to english for anything else", () => {
    expect(i18nUtil.getLocaleByCode("xx-XX").code).toBe(LOCALES.ENGLISH.code);
  });
});

describe("isLanguageSupported", () => {
  it("knows which codes are translated", () => {
    expect(i18nUtil.isLanguageSupported("pl-PL")).toBe(true);
    expect(i18nUtil.isLanguageSupported("de-DE")).toBe(true);
    expect(i18nUtil.isLanguageSupported("he-IL")).toBe(false);
    expect(i18nUtil.isLanguageSupported("de")).toBe(false);
  });
});
