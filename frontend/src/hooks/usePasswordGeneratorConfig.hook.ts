import { PasswordGeneratorConfig } from "../types/password.type";
import { getDefaultPasswordConfig } from "../utils/defaultConfig.util";
import useConfig from "./config.hook";

const usePasswordGeneratorConfig = (): PasswordGeneratorConfig => {
  const config = useConfig();
  const defaultConfig = getDefaultPasswordConfig();

  const isCustomPasswordPolicyEnabled = config.get(
    "security.customPasswordPolicy",
  );

  return {
    length: isCustomPasswordPolicyEnabled
      ? config.get("security.minLength")
      : defaultConfig.length,
    includeLowercase: isCustomPasswordPolicyEnabled
      ? config.get("security.requireLowercase")
      : defaultConfig.includeLowercase,
    includeUppercase: isCustomPasswordPolicyEnabled
      ? config.get("security.requireUppercase")
      : defaultConfig.includeUppercase,
    includeNumbers: isCustomPasswordPolicyEnabled
      ? config.get("security.requireNumber")
      : defaultConfig.includeNumbers,
    includeSymbols: isCustomPasswordPolicyEnabled
      ? config.get("security.requireSpecialCharacter")
      : defaultConfig.includeSymbols,
  };
};

export default usePasswordGeneratorConfig;
