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
import { generatePassword } from "../../utils/crypto.util";
import { getDefaultPasswordConfig } from "../../utils/defaultConfig.util";
import useCopyToClipboard from "../../hooks/useCopyToClipboard";
import { FormattedMessage } from "react-intl";

type PasswordFieldWithGenerateButtonProps = PasswordInputProps & {
  generatorConfig?: PasswordGeneratorConfig;
  handlePasswordGenerate: (password: string) => void;
};

const PasswordFieldWithGenerateButton = ({
  handlePasswordGenerate,
  generatorConfig,
  ...passwordInputProps
}: PasswordFieldWithGenerateButtonProps) => {
  const t = useTranslate();
  const { copyContentToClipboard } = useCopyToClipboard({
    toastMessage: t("password-generator.copy.message"),
  });

  function handleGeneratePasswordButtonClick() {
    const password = generatePassword(
      generatorConfig ?? getDefaultPasswordConfig(),
    );
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
