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
import { useEffect, useMemo, useState } from "react";
import {
  PasswordGeneratorConfig,
  PasswordGeneratorValidationRules,
} from "../../types/password.type";
import useCopyToClipboard from "../../hooks/useCopyToClipboard";
import { TbCheck, TbCopy, TbRefresh } from "react-icons/tb";
import * as yup from "yup";
import useTranslate from "../../hooks/useTranslate.hook";
import { generatePassword } from "../../utils/crypto.util";

const DefaultConfig: PasswordGeneratorConfig = {
  length: 14,
  includeLowercase: true,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: true,
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
  const { checkState, copyContentToClipboard } = useCopyToClipboard({
    toastMessage: t("password-generator.copy.message"),
  });

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

  const submitPassword = () => {
    callback(generatedPassword, passwordForm.values);
    copyContentToClipboard(generatedPassword);
  };

  const hasFormErrors = useMemo(() => {
    return Object.keys(passwordForm.errors).length > 0 || !generatedPassword;
  }, [passwordForm.errors, generatedPassword]);

  const handleRefreshClick = () => {
    setGeneratedPassword(generatePassword(passwordForm.values));
  };

  useEffect(() => {
    setGeneratedPassword(generatePassword(passwordForm.values));
  }, [passwordForm.values]);

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
            <ActionIcon onClick={handleRefreshClick}>
              <TbRefresh style={{ cursor: "pointer" }} />
            </ActionIcon>
            <ActionIcon
              onClick={() => copyContentToClipboard(generatedPassword)}
            >
              {checkState ? <TbCheck /> : <TbCopy />}
            </ActionIcon>
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
            label={t("password-generator.rule.lowercase.text")}
            checked={passwordForm.getInputProps("includeLowercase").value}
            {...passwordForm.getInputProps("includeLowercase")}
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
