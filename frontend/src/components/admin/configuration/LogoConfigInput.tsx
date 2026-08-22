import { Box, FileInput, Group, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Dispatch, SetStateAction } from "react";
import { TbUpload } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../../hooks/useTranslate.hook";

const LogoConfigInput = ({
  logo,
  setLogo,
  darkLogo,
  setDarkLogo,
}: {
  logo: File | null;
  setLogo: Dispatch<SetStateAction<File | null>>;
  darkLogo: File | null;
  setDarkLogo: Dispatch<SetStateAction<File | null>>;
}) => {
  const isMobile = useMediaQuery("(max-width: 560px)");
  const t = useTranslate();

  return (
    <>
      <Group position="apart">
        <Stack style={{ maxWidth: isMobile ? "100%" : "40%" }} spacing={0}>
          <Title order={6}>
            <FormattedMessage id="admin.config.appearance.logo" />
          </Title>
          <Text color="dimmed" size="sm" mb="xs">
            <FormattedMessage id="admin.config.appearance.logo.description" />
          </Text>
        </Stack>
        <Stack></Stack>
        <Box style={{ width: isMobile ? "100%" : "50%" }}>
          <FileInput
            clearable
            icon={<TbUpload size={14} />}
            value={logo}
            onChange={(v) => setLogo(v)}
            accept=".png"
            // @ts-ignore (https://github.com/mantinedev/mantine/issues/5401)
            placeholder={t("admin.config.appearance.logo.placeholder")}
          />
        </Box>
      </Group>
      <Group position="apart">
        <Stack style={{ maxWidth: isMobile ? "100%" : "40%" }} spacing={0}>
          <Title order={6}>
            <FormattedMessage id="admin.config.appearance.logo-dark" />
          </Title>
          <Text color="dimmed" size="sm" mb="xs">
            <FormattedMessage id="admin.config.appearance.logo-dark.description" />
          </Text>
        </Stack>
        <Stack></Stack>
        <Box style={{ width: isMobile ? "100%" : "50%" }}>
          <FileInput
            clearable
            icon={<TbUpload size={14} />}
            value={darkLogo}
            onChange={(v) => setDarkLogo(v)}
            accept=".png"
            // @ts-ignore (https://github.com/mantinedev/mantine/issues/5401)
            placeholder={t("admin.config.appearance.logo.placeholder")}
          />
        </Box>
      </Group>
    </>
  );
};

export default LogoConfigInput;
