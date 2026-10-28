import { Button, PasswordInput, Stack, Text } from "@mantine/core";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import useTranslate, {
  translateOutsideContext,
} from "../../hooks/useTranslate.hook";

const showEnterPasswordModal = (
  modals: ModalsContextProps,
  submitCallback: (password: string) => Promise<void>,
  initialWrong = false,
) => {
  const t = translateOutsideContext();
  return modals.openModal({
    closeOnClickOutside: false,
    withCloseButton: false,
    closeOnEscape: false,
    title: t("share.modal.password.title"),
    children: (
      <PasswordModalBody
        submitCallback={submitCallback}
        initialWrong={initialWrong}
      />
    ),
  });
};

export const PasswordModalBody = ({
  submitCallback,
  initialWrong = false,
}: {
  submitCallback: (password: string) => Promise<void>;
  initialWrong?: boolean;
}) => {
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(
    initialWrong ? "share.modal.error.invalid-password" : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslate();
  return (
    <Stack align="stretch">
      <Text size="sm">
        <FormattedMessage id="share.modal.password.description" />
      </Text>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSubmitting) return;
          setIsSubmitting(true);
          setPasswordError("");
          try {
            await submitCallback(password);
          } catch (failure) {
            const code = (
              failure as { response?: { data?: { error?: string } } }
            )?.response?.data?.error;
            setPasswordError(
              code === "wrong_password"
                ? "share.modal.error.invalid-password"
                : "common.error.unknown",
            );
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Stack>
          <PasswordInput
            variant="filled"
            placeholder={t("share.modal.password")}
            error={passwordError ? t(passwordError) : undefined}
            aria-label={t("share.modal.password")}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            value={password}
          />
          <Button type="submit" loading={isSubmitting}>
            <FormattedMessage id="common.button.submit" />
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

export default showEnterPasswordModal;
