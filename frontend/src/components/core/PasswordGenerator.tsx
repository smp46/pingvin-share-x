import {
  ActionIcon,
  Button,
  Checkbox,
  Container,
  Divider,
  Flex,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PasswordGeneratorConfig,
  PasswordGeneratorValidationRules,
} from "../../types/password.type";
import CopyButtonIcon from "../icon/CopyButtonIcon";
import { TbRefresh } from "react-icons/tb";
import * as yup from "yup";
import useTranslate from "../../hooks/useTranslate.hook";

const DefaultConfig: PasswordGeneratorConfig = {
  length: 14,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: false,
};

const DefaultValidationRules: PasswordGeneratorValidationRules = {
  length: {
    min: 6,
    max: 9999,
  },
};

const PasswordGenerator = ({
  config = DefaultConfig,
  validationRules = DefaultValidationRules,
  callback,
}: {
  config?: PasswordGeneratorConfig;
  validationRules?: PasswordGeneratorValidationRules;
  callback: (password: string, config: PasswordGeneratorConfig) => void;
}) => {
  const t = useTranslate();
  const {
    length: { min: passwordMinLength, max: passwordMaxLength },
  } = validationRules;

  const [generatedPassword, setGeneratedPassword] = useState("");
  const validationSchema = yup.object().shape({
    length: yup
      .number()
      .required(t("common.error.field-required"))
      .min(
        passwordMinLength,
        t("common.error.too-short", { length: passwordMinLength }),
      )
      .max(
        passwordMaxLength,
        t("common.error.too-long", { length: passwordMaxLength }),
      )
      .transform((value) => value || undefined),
  });
  const passwordForm = useForm<PasswordGeneratorConfig>({
    initialValues: config,
    validate: yupResolver(validationSchema),
    validateInputOnChange: true,
  });

  const generatePassword = useCallback(() => {
    let charset = "abcdefghijklmnopqrstuvwxyz";
    if (passwordForm.values.includeUppercase)
      charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (passwordForm.values.includeNumbers) charset += "0123456789";
    if (passwordForm.values.includeSymbols)
      charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let generatedPassword = "";
    for (let i = 0; i < passwordForm.values.length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      generatedPassword += charset[randomIndex];
    }
    setGeneratedPassword(generatedPassword);
  }, [passwordForm.values]);

  const submitPassword = () => {
    callback(generatedPassword, passwordForm.values);
  };

  const hasFormErrors = useMemo(() => {
    return Object.keys(passwordForm.errors).length > 0;
  }, [passwordForm.errors]);

  useEffect(() => {
    generatePassword();
  }, [passwordForm.values]);

  useEffect(() => {
    generatePassword();
  }, []);

  return (
    <Container style={{ width: "100%", marginTop: "1rem" }}>
      <Stack align="stretch">
        <Flex
          justify={"space-between"}
          align={"center"}
          style={{ width: "100%" }}
          gap={"md"}
        >
          <Text style={{ overflowWrap: "break-word", minWidth: 0 }}>
            {generatedPassword}
          </Text>
          <Flex align={"center"} gap={"xs"}>
            <ActionIcon onClick={generatePassword}>
              <TbRefresh style={{ cursor: "pointer" }} />
            </ActionIcon>
            <CopyButtonIcon
              content={generatedPassword}
              toastMessage={t("password-generator.copy.message")}
            />
          </Flex>
        </Flex>

        <Divider />

        <Stack
          style={{
            width: "100%",
          }}
        >
          <Text>Options</Text>
          <NumberInput
            min={passwordMinLength}
            max={passwordMaxLength}
            label={t("password-generator.rule.length.text")}
            type="number"
            description={t("common.password-input.in-between", {
              min: passwordMinLength,
              max: passwordMaxLength,
            })}
            {...passwordForm.getInputProps("length")}
          />
          <Checkbox
            label={t("password-generator.rule.uppercase.text")}
            checked={passwordForm.getInputProps("includeUppercase").value}
            {...passwordForm.getInputProps("includeUppercase")}
          />
          <Checkbox
            label={t("password-generator.rule.number.text")}
            checked={passwordForm.getInputProps("includeNumbers").value}
            {...passwordForm.getInputProps("includeNumbers")}
          />
          <Checkbox
            label={t("password-generator.rule.symbol.text")}
            checked={passwordForm.getInputProps("includeSymbols").value}
            {...passwordForm.getInputProps("includeSymbols")}
          />
        </Stack>

        <Divider />

        <Button type="button" onClick={submitPassword} disabled={hasFormErrors}>
          {t("password-generator.use.button.label")}
        </Button>
      </Stack>
    </Container>
  );
};

export default PasswordGenerator;
