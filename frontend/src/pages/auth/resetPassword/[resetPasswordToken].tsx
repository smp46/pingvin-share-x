import {
  Button,
  Container,
  createStyles,
  Group,
  Paper,
  PasswordInput,
  Text,
  Title,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { useRouter } from "next/router";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import useTranslate from "../../../hooks/useTranslate.hook";
import authService from "../../../services/auth.service";
import toast from "../../../utils/toast.util";
import useConfig from "../../../hooks/config.hook";

const useStyles = createStyles((theme) => ({
  control: {
    [theme.fn.smallerThan("xs")]: {
      width: "100%",
    },
  },
}));

const ResetPassword = () => {
  const { classes } = useStyles();
  const router = useRouter();
  const config = useConfig();
  const t = useTranslate();

  let minLength = 8;
  let requireLowercase = false;
  let requireUppercase = false;
  let requireNumber = false;
  let requireSpecialCharacter = false;

  if (config.get("security.customPasswordPolicy")) {
    minLength = config.get("security.minLength");
    requireLowercase = config.get("security.requireLowercase");
    requireUppercase = config.get("security.requireUppercase");
    requireNumber = config.get("security.requireNumber");
    requireSpecialCharacter = config.get("security.requireSpecialCharacter");
  }

  const form = useForm({
    initialValues: {
      password: "",
    },
    validate: yupResolver(
      yup.object().shape({
        password: yup
          .string()
          .min(
            minLength,
            t("common.error.too-short", {
              length: minLength,
            }),
          )
          .matches(
            requireLowercase ? /[a-z]/ : /.*/,
            t("common.error.password.lowercase"),
          )
          .matches(
            requireUppercase ? /[A-Z]/ : /.*/,
            t("common.error.password.uppercase"),
          )
          .matches(
            requireNumber ? /[0-9]/ : /.*/,
            t("common.error.password.number"),
          )
          .matches(
            requireSpecialCharacter
              ? /[^a-zA-Z0-9]/
              : /.*/,
            t("common.error.password.special"),
          )
          .required(t("common.error.field-required")),
      }),
    ),
  });

  const resetPasswordToken = router.query.resetPasswordToken as string;

  return (
    <Container size={460} my={30}>
      <Title order={2} weight={900} align="center">
        <FormattedMessage id="resetPassword.text.resetPassword" />
      </Title>
      <Text color="dimmed" size="sm" align="center">
        <FormattedMessage id="resetPassword.text.enterNewPassword" />
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <form
          onSubmit={form.onSubmit((values) => {
            authService
              .resetPassword(resetPasswordToken, values.password)
              .then(() => {
                toast.success(t("resetPassword.notify.passwordReset"));

                router.push("/auth/signIn");
              })
              .catch(toast.axiosError);
          })}
        >
          <PasswordInput
            label={t("resetPassword.input.password")}
            placeholder="••••••••••"
            {...form.getInputProps("password")}
          />
          <Group position="right" mt="lg">
            <Button type="submit" className={classes.control}>
              <FormattedMessage id="resetPassword.text.resetPassword" />
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
