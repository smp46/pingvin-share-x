import Config from "../types/config.type";

// What the app falls back to when the backend cannot be reached, which in
// practice means the seconds after a container starts, while the frontend is
// already serving and the api is not yet listening.
//
// configService.get throws on a key it does not find, and components call it
// while rendering, so a gap here is not a missing setting but a page that
// fails to render at all. That happened: the header asked for
// share.enableUserRecipients during the startup window and every request threw
// until the backend came up.
//
// So this list has to cover every key read through config.get. There is a test
// that reads the source and checks exactly that, because the two drifted apart
// once already and nothing pointed it out.
//
// Values follow the backend seed, except where a safer answer exists for the
// case where we genuinely do not know: registration stays closed rather than
// open until the real config arrives.
export function getDefaultConfig(): Config[] {
  return [
    {
      key: "general.appName",
      value: "Pingvin Share X",
      defaultValue: "Pingvin Share X",
      type: "string",
    },
    {
      key: "general.appUrl",
      value: "http://localhost:3000",
      defaultValue: "http://localhost:3000",
      type: "string",
    },
    {
      key: "general.showHomePage",
      value: "true",
      defaultValue: "true",
      type: "boolean",
    },
    {
      key: "general.defaultLanguage",
      value: "en-US",
      defaultValue: "en-US",
      type: "string",
    },
    {
      key: "general.detectLanguageFromBrowser",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "appearance.uploadProgressStyle",
      value: "circle",
      defaultValue: "circle",
      type: "string",
    },
    // deliberately stricter than the seed, which defaults this to true: an
    // instance whose config we cannot read should not be accepting signups
    {
      key: "security.allowRegistration",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.allowUnauthenticatedShares",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.customPasswordPolicy",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.minLength",
      value: "8",
      defaultValue: "8",
      type: "number",
    },
    {
      key: "security.requireLowercase",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.requireUppercase",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.requireNumber",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "security.requireSpecialCharacter",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "oauth.disablePassword",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.autoOpenShareModal",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.chunkSize",
      value: "10000000",
      defaultValue: "10000000",
      type: "filesize",
    },
    {
      key: "share.defaultExpiration",
      value: "7 days",
      defaultValue: "7 days",
      type: "timespan",
    },
    {
      key: "share.enableShareEmailRecipients",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.enableUserRecipients",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.fileRetentionPeriod",
      value: "0 days",
      defaultValue: "0 days",
      type: "timespan",
    },
    {
      key: "share.maxExpiration",
      value: "0 days",
      defaultValue: "0 days",
      type: "timespan",
    },
    {
      key: "share.maxSize",
      value: "1000000000",
      defaultValue: "1000000000",
      type: "filesize",
    },
    {
      key: "share.reverseShareSimpleOnly",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.shareIdLength",
      value: "8",
      defaultValue: "8",
      type: "number",
    },
    {
      key: "smtp.enabled",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "legal.enabled",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    { key: "legal.imprintText", value: "", defaultValue: "", type: "text" },
    { key: "legal.imprintUrl", value: "", defaultValue: "", type: "string" },
    {
      key: "legal.privacyPolicyText",
      value: "",
      defaultValue: "",
      type: "text",
    },
    {
      key: "legal.privacyPolicyUrl",
      value: "",
      defaultValue: "",
      type: "string",
    },
  ];
}
