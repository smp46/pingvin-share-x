import {
  ActionIcon,
  Container,
  Flex,
  Modal,
  PasswordInput,
  PasswordInputProps,
} from "@mantine/core";
import {
  PasswordGeneratorConfig,
  PasswordGeneratorValidationRules,
} from "../../types/password.type";
import { HoverTip } from "../core/HoverTip";
import { TbRefresh } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import { useDisclosure } from "@mantine/hooks";
import PasswordGenerator from "../core/PasswordGenerator";

type PasswordFieldWithGeneratorModalProps = PasswordInputProps & {
  generatorConfig?: PasswordGeneratorConfig;
  validationRules?: PasswordGeneratorValidationRules;
  handlePasswordGenerate: (
    password: string,
    config: PasswordGeneratorConfig,
  ) => void;
};

const PasswordFieldWithGeneratorModal = ({
  handlePasswordGenerate,
  validationRules,
  generatorConfig,
  ...passwordInputProps
}: PasswordFieldWithGeneratorModalProps) => {
  const t = useTranslate();
  const [
    passwordModalOpened,
    { open: passwordModalOpen, close: passwordModalClose },
  ] = useDisclosure(false);

  return (
    <>
      <PasswordInput
        {...passwordInputProps}
        inputContainer={(children) => {
          return (
            <Flex justify={"space-between"} align={"center"} gap={"xs"}>
              <Container style={{ width: "100%", padding: 0, margin: 0 }}>
                {children}
              </Container>
              <HoverTip label={t("password-generator.button.label")}>
                <ActionIcon onClick={passwordModalOpen}>
                  <TbRefresh />
                </ActionIcon>
              </HoverTip>
            </Flex>
          );
        }}
      />
      <Modal
        title={t("password-generator.button.label")}
        zIndex={1000}
        opened={passwordModalOpened}
        onClose={passwordModalClose}
      >
        <PasswordGenerator
          config={generatorConfig}
          validationRules={validationRules}
          callback={(password, config) => {
            handlePasswordGenerate(password, config);
            passwordModalClose();
          }}
        />
      </Modal>
    </>
  );
};

export default PasswordFieldWithGeneratorModal;
