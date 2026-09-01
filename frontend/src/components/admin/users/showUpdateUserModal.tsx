import {
  Accordion,
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
import useTranslate, {
  translateOutsideContext,
} from "../../../hooks/useTranslate.hook";
import userService from "../../../services/user.service";
import User from "../../../types/user.type";
import toast from "../../../utils/toast.util";
import FileSizeInput from "../../core/FileSizeInput";
import { CustomPasswordPolicy } from "../../../types/config.type";

const showUpdateUserModal = (
  modals: ModalsContextProps,
  user: User,
  getUsers: () => void,
  customPasswordPolicy: CustomPasswordPolicy,
) => {
  const t = translateOutsideContext();
  return modals.openModal({
    title: t("admin.users.edit.update.title", { username: user.username }),
    children: (
      <Body
        user={user}
        modals={modals}
        getUsers={getUsers}
        customPasswordPolicy={customPasswordPolicy}
      />
    ),
  });
};

const Body = ({
  user,
  modals,
  getUsers,
  customPasswordPolicy,
}: {
  modals: ModalsContextProps;
  user: User;
  getUsers: () => void;
  customPasswordPolicy: CustomPasswordPolicy;
}) => {
  const t = useTranslate();

  const accountForm = useForm({
    initialValues: {
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActivated: user.isActivated,
      allowShare: user.allowShare ?? true,
      allowCreateReverseShares: user.allowCreateReverseShares ?? true,
      hasCustomMaxShares: user.maxShares != null && user.maxShares > 0,
      maxShares: user.maxShares ?? 10,
      hasCustomMaxReverseShares:
        user.maxReverseShares != null && user.maxReverseShares > 0,
      maxReverseShares: user.maxReverseShares ?? 5,
      hasCustomShareSizeLimit: !!user.shareSizeLimit,
      shareSizeLimit: user.shareSizeLimit
        ? parseInt(user.shareSizeLimit)
        : 104857600,
      hasCustomStorageQuotaLimit: !!user.storageQuotaLimit,
      storageQuotaLimit: user.storageQuotaLimit
        ? parseInt(user.storageQuotaLimit)
        : 21474836480,
    },
    validate: yupResolver(
      yup.object().shape({
        email: yup.string().email(t("common.error.invalid-email")),
        username: yup
          .string()
          .min(3, t("common.error.too-short", { length: 3 })),
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

  const passwordForm = useForm({
    initialValues: {
      password: "",
    },
    validate: yupResolver(
      yup.object().shape({
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
          .required(t("common.error.field-required")),
      }),
    ),
  });

  return (
    <Stack>
      <form
        id="accountForm"
        onSubmit={accountForm.onSubmit(async (values) => {
          userService
            .update(user.id, {
              username: values.username,
              email: values.email,
              isAdmin: values.isAdmin,
              isActivated: values.isActivated,
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
                label={t("admin.users.table.username")}
                {...accountForm.getInputProps("username")}
              />
              <TextInput
                label={t("admin.users.table.email")}
                {...accountForm.getInputProps("email")}
              />
              <Switch
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.update.admin-privileges")}
                {...accountForm.getInputProps("isAdmin", { type: "checkbox" })}
              />
              <Switch
                mt="xs"
                labelPosition="left"
                label={t("admin.users.edit.update.email-verified")}
                {...accountForm.getInputProps("isActivated", {
                  type: "checkbox",
                })}
                disabled={user.isActivated}
              />
              <Accordion mt="md">
                <Accordion.Item
                  sx={{ borderBottom: "none" }}
                  value="changePassword"
                >
                  <Accordion.Control px={0}>
                    <FormattedMessage id="admin.users.edit.update.change-password.title" />
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack>
                      <PasswordInput
                        label={t(
                          "admin.users.edit.update.change-password.field",
                        )}
                        {...passwordForm.getInputProps("password")}
                      />
                      <Button
                        variant="light"
                        type="button"
                        onClick={() => {
                          passwordForm.onSubmit(async (values) => {
                            userService
                              .update(user.id, {
                                password: values.password,
                              })
                              .then(() =>
                                toast.success(
                                  t(
                                    "admin.users.edit.update.notify.password.success",
                                  ),
                                ),
                              )
                              .catch(toast.axiosError);
                          })();
                        }}
                      >
                        <FormattedMessage id="admin.users.edit.update.change-password.button" />
                      </Button>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
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
                {...accountForm.getInputProps("allowShare", {
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
                {...accountForm.getInputProps("allowCreateReverseShares", {
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
                {...accountForm.getInputProps("hasCustomMaxShares", {
                  type: "checkbox",
                })}
              />
              {accountForm.values.hasCustomMaxShares && (
                <NumberInput
                  label={t("admin.users.edit.permissions.custom-max-shares")}
                  min={1}
                  step={1}
                  {...accountForm.getInputProps("maxShares")}
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
                {...accountForm.getInputProps("hasCustomMaxReverseShares", {
                  type: "checkbox",
                })}
              />
              {accountForm.values.hasCustomMaxReverseShares && (
                <NumberInput
                  label={t(
                    "admin.users.edit.permissions.custom-max-reverse-shares",
                  )}
                  min={1}
                  step={1}
                  {...accountForm.getInputProps("maxReverseShares")}
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
                {...accountForm.getInputProps("hasCustomShareSizeLimit", {
                  type: "checkbox",
                })}
              />
              {accountForm.values.hasCustomShareSizeLimit && (
                <FileSizeInput
                  label={t("admin.users.edit.update.custom-share-size-limit")}
                  value={accountForm.values.shareSizeLimit}
                  onChange={(val) =>
                    accountForm.setFieldValue("shareSizeLimit", val)
                  }
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
                {...accountForm.getInputProps("hasCustomStorageQuotaLimit", {
                  type: "checkbox",
                })}
              />
              {accountForm.values.hasCustomStorageQuotaLimit && (
                <FileSizeInput
                  label={t(
                    "admin.users.edit.update.custom-storage-quota-limit",
                  )}
                  value={accountForm.values.storageQuotaLimit}
                  onChange={(val) =>
                    accountForm.setFieldValue("storageQuotaLimit", val)
                  }
                />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </form>
      <Group position="right">
        <Button type="submit" form="accountForm">
          <FormattedMessage id="common.button.save" />
        </Button>
      </Group>
    </Stack>
  );
};

export default showUpdateUserModal;
