import Config from "../types/config.type";

export function getDefaultConfig(): Config[] {
  return [
    {
      key: "general.appName",
      value: "Pingvin Share X",
      defaultValue: "Pingvin Share X",
      type: "string",
    },
    {
      key: "general.showHomePage",
      value: "true",
      defaultValue: "true",
      type: "boolean",
    },
    {
      key: "share.allowRegistration",
      value: "false",
      defaultValue: "false",
      type: "boolean",
    },
    {
      key: "share.allowUnauthenticatedShares",
      value: "false",
      defaultValue: "false",
      type: "boolean",
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
