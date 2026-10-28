import {
  ActionIcon,
  Container,
  Flex,
  Modal,
  PasswordInput,
  PasswordInputProps,
} from "@mantine/core";
import { PasswordGeneratorConfig } from "../../types/password.type";
import { HoverTip } from "../core/HoverTip";
import { TbRefresh } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import { useDisclosure } from "@mantine/hooks";
import PasswordGenerator from "../core/PasswordGenerator";

type PasswordFieldWithGeneratorModalProps = PasswordInputProps & {
  generatorConfig?: PasswordGeneratorConfig;
  handlePasswordGenerate: (password: string) => void;
};

const PasswordFieldWithGeneratorModal = (
  props: PasswordFieldWithGeneratorModalProps,
) => {
  const t = useTranslate();
  const [
    passwordModalOpened,
    { open: passwordModalOpen, close: passwordModalClose },
  ] = useDisclosure(false);

  return (
    <>
      <PasswordInput
        {...props}
        inputContainer={(children) => {
          return (
            <Flex justify={"space-between"} align={"center"} gap={"xs"}>
              <Container style={{ width: "100%", padding: 0, margin: 0 }}>
                {children}
              </Container>
              <HoverTip label={t("common.password-generator.button.label")}>
                <ActionIcon onClick={passwordModalOpen}>
                  <TbRefresh />
                </ActionIcon>
              </HoverTip>
            </Flex>
          );
        }}
      />
      <Modal
        title={t("common.password-generator.button.label")}
        zIndex={1000}
        opened={passwordModalOpened}
        onClose={passwordModalClose}
      >
        <PasswordGenerator
          callback={(password) => {
            props.handlePasswordGenerate(password);
            passwordModalClose();
          }}
        />
      </Modal>
    </>
  );
};

export default PasswordFieldWithGeneratorModal;
