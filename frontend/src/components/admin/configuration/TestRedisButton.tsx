import { Button, Stack, Text, Textarea } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import configService from "../../../services/config.service";
import { getApiErrorMessage } from "../../../utils/error.util";
import useTranslate from "../../../hooks/useTranslate.hook";
import toast from "../../../utils/toast.util";

const TestRedisButton = ({
  configVariablesChanged,
  saveConfigVariables,
}: {
  configVariablesChanged: boolean;
  saveConfigVariables: () => Promise<void>;
}) => {
  const modals = useModals();
  const t = useTranslate();
  const [isLoading, setIsLoading] = useState(false);

  const testRedis = async () => {
    const result = await configService.testRedisConnection();
    if (!result.enabled) {
      toast.success(
        <FormattedMessage id="admin.config.cache.test-redis.success-disabled" />,
      );
    } else {
      toast.success(
        <FormattedMessage id="admin.config.cache.test-redis.success" />,
      );
    }
  };

  return (
    <Button
      loading={isLoading}
      variant="light"
      onClick={async () => {
        if (!configVariablesChanged) {
          setIsLoading(true);
          await testRedis()
            .catch((e) =>
              modals.openModal({
                title: (
                  <FormattedMessage id="admin.config.cache.test-redis.modal.error.title" />
                ),
                children: (
                  <Stack spacing="xs">
                    <Text size="sm">
                      <FormattedMessage id="admin.config.cache.test-redis.modal.error.description" />
                    </Text>
                    <Textarea
                      minRows={4}
                      readOnly
                      value={getApiErrorMessage(e) ?? t("common.error.unknown")}
                    />
                  </Stack>
                ),
              }),
            )
            .finally(() => setIsLoading(false));
        } else {
          modals.openConfirmModal({
            title: t("admin.config.cache.test-redis.modal.save.title"),
            children: (
              <Text size="sm">
                <FormattedMessage id="admin.config.cache.test-redis.modal.save.description" />
              </Text>
            ),
            labels: {
              confirm: t("admin.config.cache.test-redis.modal.save.confirm"),
              cancel: t("common.button.cancel"),
            },
            onConfirm: async () => {
              setIsLoading(true);
              await saveConfigVariables();
              await testRedis()
                .catch((e) =>
                  modals.openModal({
                    title: (
                      <FormattedMessage id="admin.config.cache.test-redis.modal.error.title" />
                    ),
                    children: (
                      <Stack spacing="xs">
                        <Text size="sm">
                          <FormattedMessage id="admin.config.cache.test-redis.modal.error.description" />
                        </Text>
                        <Textarea
                          minRows={4}
                          readOnly
                          value={
                            getApiErrorMessage(e) ?? t("common.error.unknown")
                          }
                        />
                      </Stack>
                    ),
                  }),
                )
                .finally(() => setIsLoading(false));
            },
          });
        }
      }}
    >
      <FormattedMessage id="admin.config.cache.button.test-redis" />
    </Button>
  );
};

export default TestRedisButton;

