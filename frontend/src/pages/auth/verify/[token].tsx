import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import authService from "../../../services/auth.service";
import toast from "../../../utils/toast.util";
import useTranslate from "../../../hooks/useTranslate.hook";
import Meta from "../../../components/Meta";

export default function VerifyAccount() {
  const router = useRouter();
  const { token } = router.query;
  const t = useTranslate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!token) return;

    authService
      .verifyAccount(token as string)
      .then(() => setStatus("success"))
      .catch((e) => {
        toast.axiosError(e);
        setStatus("error");
      });
  }, [token]);

  return (
    <>
      <Meta title={t("verify.title")} />
      <Container size={420} my={40}>
        <Title order={2} align="center" weight={900}>
          <FormattedMessage id="verify.title" />
        </Title>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack align="center">
            {status === "loading" && <Loader />}
            {status === "success" && (
              <>
                <Text align="center">
                  <FormattedMessage
                    id="verify.success"
                  />
                </Text>
                <Button
                  fullWidth
                  mt="xl"
                  onClick={() => router.replace("/auth/signIn")}
                >
                  <FormattedMessage
                    id="verify.button.signin"
                  />
                </Button>
              </>
            )}
            {status === "error" && (
              <>
                <Text align="center" color="red">
                  <FormattedMessage
                    id="verify.error"
                  />
                </Text>
                <Button
                  fullWidth
                  mt="xl"
                  variant="light"
                  onClick={() => router.replace("/auth/signIn")}
                >
                  <FormattedMessage
                    id="verify.button.signin"
                    defaultMessage="Go to Sign In"
                  />
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
