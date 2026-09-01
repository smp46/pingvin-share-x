import {
  Button,
  Group,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Tabs,
  TextInput,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { FormattedMessage } from "react-intl";
import { TbLock, TbUser } from "react-icons/tb";
import * as yup from "yup";
import useTranslate from "../../../hooks/useTranslate.hook";
import userService from "../../../services/user.service";
import toast from "../../../utils/toast.util";
import FileSizeInput from "../../core/FileSizeInput";
import { CustomPasswordPolicy } from "../../../types/config.type";

const showCreateUserModal = (
  modals: ModalsContextProps,
  smtpEnabled: boolean,
  getUsers: () => void,
  customPasswordPolicy: CustomPasswordPolicy,
) => {
  return modals.openModal({
    title: "Create user",
    children: (
      <Body
        modals={modals}
        smtpEnabled={smtpEnabled}
        getUsers={getUsers}
        customPasswordPolicy={customPasswordPolicy}
      />
    ),
  });
};

const Body = ({
  modals,
  smtpEnabled,
  getUsers,
  customPasswordPolicy,
}: {
  modals: ModalsContextProps;
  smtpEnabled: boolean;
  getUsers: () => void;
  customPasswordPolicy: CustomPasswordPolicy;
}) => {
  const t = useTranslate();

  const form = useForm({
    initialValues: {
      username: "",
      email: "",
      password: undefined,
      isAdmin: false,
      setPasswordManually: false,
      allowShare: true,
      allowCreateReverseShares: true,
      hasCustomMaxShares: false,
      maxShares: 10,
      hasCustomMaxReverseShares: false,
      maxReverseShares: 5,
      hasCustomShareSizeLimit: false,
      shareSizeLimit: 104857600,
      hasCustomStorageQuotaLimit: false,
      storageQuotaLimit: 21474836480,
    },
    validate: yupResolver(
      yup.object().shape({
        email: yup.string().email(t("common.error.invalid-email")),
        username: yup
          .string()
          .min(3, t("common.error.too-short", { length: 3 })),
        password: yup
          .string()
          .min(
            customPasswordPolicy.minLength,
            t("common.error.too-short", {
              length: customPasswordPolicy.minLength,
            }),
          )
          .matches(
            customPasswordPolicy.requireLowercase ? /[a-z]/ : /.*/,
            t("common.error.password.lowercase"),
          )
          .matches(
            customPasswordPolicy.requireUppercase ? /[A-Z]/ : /.*/,
            t("common.error.password.uppercase"),
          )
          .matches(
            customPasswordPolicy.requireNumber ? /[0-9]/ : /.*/,
            t("common.error.password.number"),
          )
          .matches(
            customPasswordPolicy.requireSpecialCharacter
              ? /[^a-zA-Z0-9]/
              : /.*/,
            t("common.error.password.special"),
          )
          .required(t("common.error.field-required"))
          .optional(),
        maxShares: yup
          .number()
          .test(
            "max-shares-positive",
            "Max active shares must be at least 1",
            function (value) {
              if (!this.parent.hasCustomMaxShares) return true;
              return (value ?? 0) >= 1;
            },
          ),
        maxReverseShares: yup
          .number()
          .test(
            "max-reverse-shares-positive",
            "Max active reverse shares must be at least 1",
            function (value) {
              if (!this.parent.hasCustomMaxReverseShares) return true;
              return (value ?? 0) >= 1;
            },
          ),
        storageQuotaLimit: yup
          .number()
          .test(
            "storage-quota-positive",
            "Storage quota must be greater than 0",
            function (value) {
              if (!this.parent.hasCustomStorageQuotaLimit) return true;
              return (value ?? 0) > 0;
            },
          ),
      }),
    ),
  });

  return (
    <Stack>
      <form
        id="createUserForm"
        onSubmit={form.onSubmit(async (values) => {
          userService
            .create({
              username: values.username,
              email: values.email,
              password: values.password,
              isAdmin: values.isAdmin,
              allowShare: values.allowShare,
              allowCreateReverseShares: values.allowCreateReverseShares,
              maxShares: values.hasCustomMaxShares ? values.maxShares : null,
              maxReverseShares: values.hasCustomMaxReverseShares
                ? values.maxReverseShares
                : null,
              shareSizeLimit: values.hasCustomShareSizeLimit
                ? values.shareSizeLimit.toString()
                : null,
              storageQuotaLimit: values.hasCustomStorageQuotaLimit
                ? values.storageQuotaLimit.toString()
                : null,
            })
            .then(() => {
              getUsers();
              modals.closeAll();
            })
            .catch(toast.axiosError);
        })}
      >
        <Tabs defaultValue="general">
          <Tabs.List mb="md">
            <Tabs.Tab value="general" icon={<TbUser size={16} />}>
              <FormattedMessage id="admin.users.edit.tabs.general" />
            </Tabs.Tab>
            <Tabs.Tab value="permissions" icon={<TbLock size={16} />}>
              <FormattedMessage id="admin.users.edit.tabs.permissions" />
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general">
            <Stack>
              <TextInput
                label={t("admin.users.modal.create.username")}
                {...form.getInputProps("username")}
              />
              <TextInput
                label={t("admin.users.modal.create.email")}
                {...form.getInputProps("email")}
              />
              {smtpEnabled && (
                <Switch
                  mt="xs"
                  labelPosition="left"
                  label={t("admin.users.modal.create.manual-password")}
                  description={t(
                    "admin.users.modal.create.manual-password.description",
                  )}
                  {...form.getInputProps("setPasswordManually", {
                    type: "checkbox",
                  })}
                />
              )}
              {(form.values.setPasswordManually || !smtpEnabled) && (
                <PasswordInput
                  label={t("admin.users.modal.create.password")}
                  {...form.getInputProps("password")}
                />
              )}
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t("admin.users.modal.create.admin")}
                description={t("admin.users.modal.create.admin.description")}
                {...form.getInputProps("isAdmin", { type: "checkbox" })}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="permissions">
            <Stack>
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                labelPosition="left"
                label={t("admin.users.edit.permissions.allow-share")}
                description={t(
                  "admin.users.edit.permissions.allow-share.description",
                )}
                {...form.getInputProps("allowShare", {
                  type: "checkbox",
                })}
              />
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.permissions.allow-reverse-share")}
                description={t(
                  "admin.users.edit.permissions.allow-reverse-share.description",
                )}
                {...form.getInputProps("allowCreateReverseShares", {
                  type: "checkbox",
                })}
              />
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.permissions.custom-max-shares")}
                description={t(
                  "admin.users.edit.permissions.custom-max-shares.description",
                )}
                {...form.getInputProps("hasCustomMaxShares", {
                  type: "checkbox",
                })}
              />
              {form.values.hasCustomMaxShares && (
                <NumberInput
                  label={t("admin.users.edit.permissions.custom-max-shares")}
                  min={1}
                  step={1}
                  {...form.getInputProps("maxShares")}
                />
              )}
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t(
                  "admin.users.edit.permissions.custom-max-reverse-shares",
                )}
                description={t(
                  "admin.users.edit.permissions.custom-max-reverse-shares.description",
                )}
                {...form.getInputProps("hasCustomMaxReverseShares", {
                  type: "checkbox",
                })}
              />
              {form.values.hasCustomMaxReverseShares && (
                <NumberInput
                  label={t(
                    "admin.users.edit.permissions.custom-max-reverse-shares",
                  )}
                  min={1}
                  step={1}
                  {...form.getInputProps("maxReverseShares")}
                />
              )}
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.update.custom-share-size-limit")}
                description={t(
                  "admin.users.edit.update.custom-share-size-limit.description",
                )}
                {...form.getInputProps("hasCustomShareSizeLimit", {
                  type: "checkbox",
                })}
              />
              {form.values.hasCustomShareSizeLimit && (
                <FileSizeInput
                  label={t("admin.users.edit.update.custom-share-size-limit")}
                  value={form.values.shareSizeLimit}
                  onChange={(val) => form.setFieldValue("shareSizeLimit", val)}
                />
              )}
              <Switch
                styles={{
                  body: {
                    display: "flex",
                    justifyContent: "space-between",
                  },
                }}
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.update.custom-storage-quota-limit")}
                description={t(
                  "admin.users.edit.update.custom-storage-quota-limit.description",
                )}
                {...form.getInputProps("hasCustomStorageQuotaLimit", {
                  type: "checkbox",
                })}
              />
              {form.values.hasCustomStorageQuotaLimit && (
                <FileSizeInput
                  label={t(
                    "admin.users.edit.update.custom-storage-quota-limit",
                  )}
                  value={form.values.storageQuotaLimit}
                  onChange={(val) =>
                    form.setFieldValue("storageQuotaLimit", val)
                  }
                />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </form>
      <Group position="right">
        <Button type="submit" form="createUserForm">
          <FormattedMessage id="common.button.create" />
        </Button>
      </Group>
    </Stack>
  );
};

export default showCreateUserModal;
