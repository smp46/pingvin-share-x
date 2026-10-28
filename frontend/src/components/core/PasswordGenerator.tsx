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
import { useForm } from "@mantine/form";
import { useCallback, useEffect, useState } from "react";
import { PasswordGeneratorConfig } from "../../types/password.type";
import CopyButtonIcon from "../icon/CopyButtonIcon";
import { TbRefresh } from "react-icons/tb";

const DefaultConfig: PasswordGeneratorConfig = {
  length: 14,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: false,
};

const PasswordGenerator = ({
  config,
  callback,
}: {
  config?: PasswordGeneratorConfig;
  callback: (password: string) => void;
}) => {
  const [generatedPassword, setGeneratedPassword] = useState("");
  const passwordForm = useForm<PasswordGeneratorConfig>({
    initialValues: config || DefaultConfig,
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
            <ActionIcon>
              <TbRefresh
                style={{ cursor: "pointer" }}
                onClick={generatePassword}
              />
            </ActionIcon>
            <CopyButtonIcon
              content={generatedPassword}
              toastMessage="Passowrd has been copied to clipboard"
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
            label="Length"
            type="number"
            {...passwordForm.getInputProps("length")}
          />
          <Checkbox
            label="Include Uppercase"
            checked={passwordForm.getInputProps("includeUppercase").value}
            {...passwordForm.getInputProps("includeUppercase")}
          />
          <Checkbox
            label="Include Numbers"
            checked={passwordForm.getInputProps("includeNumbers").value}
            {...passwordForm.getInputProps("includeNumbers")}
          />
          <Checkbox
            label="Include Symbols"
            checked={passwordForm.getInputProps("includeSymbols").value}
            {...passwordForm.getInputProps("includeSymbols")}
          />
        </Stack>

        <Divider />

        <Button type="button" onClick={() => callback(generatedPassword)}>
          Use this password
        </Button>
      </Stack>
    </Container>
  );
};

export default PasswordGenerator;
