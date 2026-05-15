import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import useUser from "../../hooks/user.hook";
import authService from "../../services/auth.service";
import toast from "../../utils/toast.util";

const SignUpForm = () => {
  const config = useConfig();
  const router = useRouter();
  const t = useTranslate();
  const { refreshUser } = useUser();
  const [verifyEmail, setVerifyEmail] = useState<boolean>(false);
  const [emailVerificationEnabled, setEmailVerificationEnabled] =
    useState<boolean>(false);

  const validationSchema = yup.object().shape({
    email: yup.string().email(t("common.error.invalid-email")).required(),
    username: yup
      .string()
      .min(3, t("common.error.too-short", { length: 3 }))
      .required(t("common.error.field-required")),
    password: yup
      .string()
      .min(8, t("common.error.too-short", { length: 8 }))
      .required(t("common.error.field-required")),
  });

  const form = useForm({
    initialValues: {
      email: "",
      username: "",
      password: "",
    },
    validate: yupResolver(validationSchema),
  });

  const signUp = async (email: string, username: string, password: string) => {
    await authService
      .signUp(email.trim(), username.trim(), password.trim())
      .then(async () => {
        const user = await refreshUser();
        if (emailVerificationEnabled) {
          if (config.get("email.requireEmailVerification")) {
            setEmailVerificationEnabled(true);
          }
          setVerifyEmail(true);
        } else {
          if (user?.isAdmin) {
            router.replace("/admin/intro");
          } else {
            router.replace("/upload");
          }
        }
      })
      .catch(toast.axiosError);
  };

  return verifyEmail ? (
    <Container size={420} my={40}>
      <Title order={2} align="center" weight={900}>
        <FormattedMessage id="signup.verifyEmail.title" />
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        <FormattedMessage id="signup.verifyEmail.description" />{" "}
      </Text>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md"></Paper>
    </Container>
  ) : (
    <Container size={420} my={40}>
      <Title order={2} align="center" weight={900}>
        <FormattedMessage id="signup.title" />
      </Title>
      {config.get("share.allowRegistration") && (
        <Text color="dimmed" size="sm" align="center" mt={5}>
          <FormattedMessage id="signup.description" />{" "}
          <Anchor component={Link} href={"signIn"} size="sm">
            <FormattedMessage id="signup.button.signin" />
          </Anchor>
        </Text>
      )}
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form
          onSubmit={form.onSubmit((values) =>
            signUp(values.email, values.username, values.password),
          )}
        >
          <TextInput
            label={t("signup.input.username")}
            placeholder={t("signup.input.username.placeholder")}
            {...form.getInputProps("username")}
          />
          <TextInput
            label={t("signup.input.email")}
            placeholder={t("signup.input.email.placeholder")}
            mt="md"
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label={t("signin.input.password")}
            placeholder={t("signin.input.password.placeholder")}
            mt="md"
            {...form.getInputProps("password")}
          />
          <Button fullWidth mt="xl" type="submit">
            <FormattedMessage id="signup.button.submit" />
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default SignUpForm;
