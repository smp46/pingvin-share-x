import {
  Box,
  Button,
  Group,
  PasswordInput,
  PasswordInputProps,
} from "@mantine/core";
import { TbEye, TbEyeOff } from "react-icons/tb";
import { HoverTip } from "../core/HoverTip";
import { PasswordGeneratorConfig } from "../../types/password.type";
import useTranslate from "../../hooks/useTranslate.hook";
import { useState } from "react";
import { generatePassword } from "../../utils/crypto.util";
import { getDefaultPasswordConfig } from "../../utils/defaultConfig.util";
import useCopyToClipboard from "../../hooks/useCopyToClipboard";
import { FormattedMessage } from "react-intl";

type PasswordFieldWithGenerateButtonProps = PasswordInputProps & {
  generatorConfig?: PasswordGeneratorConfig;
  handlePasswordGenerate: (password: string) => void;
};

function normalizeConfig(
  config?: PasswordGeneratorConfig,
): PasswordGeneratorConfig {
  const defaults = getDefaultPasswordConfig();
  const base = config ?? defaults;

  const hasCharset =
    base.includeLowercase ||
    base.includeUppercase ||
    base.includeNumbers ||
    base.includeSymbols;

  return {
    ...(hasCharset ? base : defaults),
    length: base.length > 0 ? base.length : defaults.length,
  };
}

const PasswordFieldWithGenerateButton = ({
  handlePasswordGenerate,
  generatorConfig,
  ...passwordInputProps
}: PasswordFieldWithGenerateButtonProps) => {
  const t = useTranslate();
  const { copyContentToClipboard } = useCopyToClipboard({
    toastMessage: t("password-generator.copy.message"),
  });
  const [config, setConfig] = useState(() => normalizeConfig(generatorConfig));

  function handleGeneratePasswordButtonClick() {
    const password = generatePassword(config);
    handlePasswordGenerate(password);
    copyContentToClipboard(password);
  }

  return (
    <Group align={passwordInputProps.error ? "center" : "flex-end"} noWrap>
      <PasswordInput
        {...passwordInputProps}
        style={{ flex: 1, ...passwordInputProps.style }}
        visibilityToggleIcon={({ reveal, size }) => (
          <HoverTip
            label={
              reveal
                ? t("common.button.hide-password")
                : t("common.button.show-password")
            }
          >
            <Box component="span" sx={{ display: "flex" }}>
              {reveal ? <TbEyeOff size={size} /> : <TbEye size={size} />}
            </Box>
          </HoverTip>
        )}
      />
      <Button
        style={{ flex: "0 0 auto" }}
        variant="outline"
        disabled={passwordInputProps.disabled}
        onClick={handleGeneratePasswordButtonClick}
      >
        <FormattedMessage id="common.button.generate" />
      </Button>
    </Group>
  );
};

export default PasswordFieldWithGenerateButton;
