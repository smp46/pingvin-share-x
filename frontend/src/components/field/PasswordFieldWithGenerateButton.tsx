import {
  Button,
  Container,
  Flex,
  PasswordInput,
  PasswordInputProps,
} from "@mantine/core";
import { PasswordGeneratorConfig } from "../../types/password.type";
import useTranslate from "../../hooks/useTranslate.hook";
import { MouseEvent, useState } from "react";
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
  const { copyContentToClipboard, checkState } = useCopyToClipboard({
    toastMessage: t("password-generator.copy.message"),
    clipboardTimeout: 500,
  });
  const [config, setConfig] = useState(() => normalizeConfig(generatorConfig));

  function handleGeneratePasswordButtonClick(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (checkState) return;
    const password = generatePassword(config);
    handlePasswordGenerate(password);
    copyContentToClipboard(password);
  }

  return (
    <PasswordInput
      {...passwordInputProps}
      inputContainer={(children) => {
        return (
          <Flex justify={"space-between"} align={"center"} gap={"xs"}>
            <Container style={{ width: "100%", padding: 0, margin: 0 }}>
              {children}
            </Container>
            <Button
              variant="outline"
              onClick={handleGeneratePasswordButtonClick}
            >
              <FormattedMessage id="common.button.generate" />
            </Button>
          </Flex>
        );
      }}
    />
  );
};

export default PasswordFieldWithGenerateButton;
