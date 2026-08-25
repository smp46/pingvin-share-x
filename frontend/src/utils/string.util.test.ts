import { camelToKebab, capitalizeFirstLetter } from "./string.util";

// camelToKebab builds translation keys: admin.config.${camelToKebab(key)}.
// Get it wrong and the settings page shows a raw message id where a label
// should be, for every setting whose name it mangles.

describe("camelToKebab", () => {
  it("splits words on the capital that starts them", () => {
    expect(camelToKebab("enableUserRecipients")).toBe("enable-user-recipients");
  });

  it("leaves a single lowercase word alone", () => {
    expect(camelToKebab("appearance")).toBe("appearance");
  });

  it("keeps the dot in a config key, since the whole key is converted", () => {
    expect(camelToKebab("share.enableUserRecipients")).toBe(
      "share.enable-user-recipients",
    );
    expect(camelToKebab("general.appUrl")).toBe("general.app-url");
  });

  // a run of capitals is one word, because a dash is only inserted where a
  // lowercase letter meets an uppercase one
  it("treats a run of capitals as a single word", () => {
    expect(camelToKebab("enableSMTP")).toBe("enable-smtp");
    expect(camelToKebab("s3.bucketName")).toBe("s3.bucket-name");
  });

  // the leading capital is not preceded by a lowercase letter, so it only
  // gets lowercased rather than starting a new word
  it("lowercases a leading capital without splitting on it", () => {
    expect(camelToKebab("AppName")).toBe("app-name");
    expect(camelToKebab("Appearance")).toBe("appearance");
  });

  it("has nothing to do with an empty string", () => {
    expect(camelToKebab("")).toBe("");
  });
});

describe("capitalizeFirstLetter", () => {
  it("raises the first letter and leaves the rest", () => {
    expect(capitalizeFirstLetter("share")).toBe("Share");
    expect(capitalizeFirstLetter("openID")).toBe("OpenID");
  });

  it("leaves a string that already starts with a capital", () => {
    expect(capitalizeFirstLetter("Share")).toBe("Share");
  });

  it("copes with a single character and with none", () => {
    expect(capitalizeFirstLetter("a")).toBe("A");
    expect(capitalizeFirstLetter("")).toBe("");
  });

  it("leaves a leading character that has no capital form", () => {
    expect(capitalizeFirstLetter("3 days")).toBe("3 days");
  });
});
