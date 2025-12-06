import {
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createStyles } from "@mantine/emotion";
import { useForm, yupResolver } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { TbInfoCircle } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import useConfig from "../../hooks/config.hook";
import useUser from "../../hooks/user.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import authService from "../../services/auth.service";
import { getOAuthIcon, getOAuthUrl } from "../../utils/oauth.util";
import { safeRedirectPath } from "../../utils/router.util";
import toast from "../../utils/toast.util";

const useStyles = createStyles((theme) => ({
  signInWith: {
    fontWeight: 500,
    "&:before": {
      content: "''",
      flex: 1,
      display: "block",
    },
    "&:after": {
      content: "''",
      flex: 1,
      display: "block",
    },
  },
  or: {
    "&:before": {
      content: "''",
      flex: 1,
      display: "block",
      borderTopWidth: 1,
      borderTopStyle: "solid",
      borderColor: "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))",
    },
    "&:after": {
      content: "''",
      flex: 1,
      display: "block",
      borderTopWidth: 1,
      borderTopStyle: "solid",
      borderColor: "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))",
    },
  },
}));

const SignInForm = ({ redirectPath }: { redirectPath: string }) => {
  const config = useConfig();
  const router = useRouter();
  const t = useTranslate();
  const { refreshUser } = useUser();
  const { classes } = useStyles();

  const [oauthProviders, setOauthProviders] = useState<string[] | null>(null);
  const [isRedirectingToOauthProvider, setIsRedirectingToOauthProvider] =
    useState(false);

  const validationSchema = yup.object().shape({
    emailOrUsername: yup.string().required(t("common.error.field-required")),
    password: yup.string().required(t("common.error.field-required")),
  });

  const form = useForm({
    initialValues: {
      emailOrUsername: "",
      password: "",
    },
    validate: yupResolver(validationSchema),
  });

  const signIn = async (email: string, password: string) => {
    await authService
      .signIn(email.trim(), password.trim())
      .then(async (response) => {
        if (response.data["loginToken"]) {
          // Prompt the user to enter their totp code
          showNotification({
            icon: <TbInfoCircle />,
            color: "blue",
            radius: "md",
            title: t("signIn.notify.totp-required.title"),
            message: t("signIn.notify.totp-required.description"),
          });
          router.push(
            `/auth/totp/${
              response.data["loginToken"]
            }?redirect=${encodeURIComponent(redirectPath)}`,
          );
        } else {
          await refreshUser();
          router.replace(safeRedirectPath(redirectPath));
        }
      })
      .catch(toast.axiosError);
  };

  useEffect(() => {
    authService
      .getAvailableOAuth()
      .then((providers) => {
        setOauthProviders(providers.data);
        if (
          providers.data.length === 1 &&
          config.get("oauth.disablePassword")
        ) {
          setIsRedirectingToOauthProvider(true);
          router.push(getOAuthUrl(window.location.origin, providers.data[0]));
        }
      })
      .catch(toast.axiosError);
  }, []);

  if (!oauthProviders) return null;

  if (isRedirectingToOauthProvider)
    return (
      <Group align="center" justify="center">
        <Loader size="sm" />
        <Text ta="center">
          <FormattedMessage id="common.text.redirecting" />
        </Text>
      </Group>
    );

  return (
    <Container size={420} my={40}>
      <Title order={2} ta="center" fw={900}>
        <FormattedMessage id="signin.title" />
      </Title>
      {config.get("share.allowRegistration") && (
        <Text color="dimmed" size="sm" ta="center" mt={5}>
          <FormattedMessage id="signin.description" />{" "}
          <Anchor component={Link} href={"signUp"} size="sm">
            <FormattedMessage id="signin.button.signup" />
          </Anchor>
        </Text>
      )}
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {config.get("oauth.disablePassword") || (
          <form
            onSubmit={form.onSubmit((values) => {
              signIn(values.emailOrUsername, values.password);
            })}
          >
            <TextInput
              label={t("signin.input.email-or-username")}
              placeholder={t("signin.input.email-or-username.placeholder")}
              {...form.getInputProps("emailOrUsername")}
            />
            <PasswordInput
              label={t("signin.input.password")}
              placeholder={t("signin.input.password.placeholder")}
              mt="md"
              {...form.getInputProps("password")}
            />
            {config.get("smtp.enabled") && (
              <Group justify="right" mt="xs">
                <Anchor component={Link} href="/auth/resetPassword" size="xs">
                  <FormattedMessage id="resetPassword.title" />
                </Anchor>
              </Group>
            )}
            <Button fullWidth mt="xl" type="submit">
              <FormattedMessage id="signin.button.submit" />
            </Button>
          </form>
        )}
        {oauthProviders.length > 0 && (
          <Stack mt={config.get("oauth.disablePassword") ? undefined : "xl"}>
            {config.get("oauth.disablePassword") ? (
              <Group align="center" className={classes.signInWith}>
                <Text>{t("signIn.oauth.signInWith")}</Text>
              </Group>
            ) : (
              <Group align="center" className={classes.or}>
                <Text>{t("signIn.oauth.or")}</Text>
              </Group>
            )}
            <Group justify="center">
              {oauthProviders.map((provider) => (
                <Button
                  key={provider}
                  component="a"
                  title={t(`signIn.oauth.${provider}`)}
                  href={getOAuthUrl(window.location.origin, provider)}
                  variant="light"
                  fullWidth
                >
                  {getOAuthIcon(provider)}
                  {"\u2002" + t(`signIn.oauth.${provider}`)}
                </Button>
              ))}
            </Group>
          </Stack>
        )}
      </Paper>
    </Container>
  );
};

export default SignInForm;
