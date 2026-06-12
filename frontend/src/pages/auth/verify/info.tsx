import { Container, Title, Text, Button, Paper, Stack } from "@mantine/core";
import { useRouter } from "next/router";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../../hooks/useTranslate.hook";
import Meta from "../../../components/Meta";

export default function VerificationInfo() {
  const router = useRouter();
  const t = useTranslate();

  return (
    <>
      <Meta title={t("verify.info.title")} />
      <Container size={420} my={40}>
        <Title order={2} align="center" weight={900}>
          <FormattedMessage id="verify.info.title" />
        </Title>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack align="center">
            <Text align="center">
              <FormattedMessage
                id="verify.info.description"
              />
            </Text>
            <Text align="center" size="sm" color="dimmed">
              <FormattedMessage
                id="verify.info.note"
              />
            </Text>
            <Button fullWidth mt="xl" onClick={() => router.replace("/auth/signIn")}>
              <FormattedMessage id="verify.button.signin" />
            </Button>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
