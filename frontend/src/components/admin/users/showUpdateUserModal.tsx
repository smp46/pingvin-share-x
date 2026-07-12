import {
  Accordion,
  Button,
  Group,
  PasswordInput,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import useTranslate, {
  translateOutsideContext,
} from "../../../hooks/useTranslate.hook";
import userService from "../../../services/user.service";
import User from "../../../types/user.type";
import toast from "../../../utils/toast.util";
import FileSizeInput from "../../core/FileSizeInput";

const showUpdateUserModal = (
  modals: ModalsContextProps,
  user: User,
  getUsers: () => void,
) => {
  const t = translateOutsideContext();
  return modals.openModal({
    title: t("admin.users.edit.update.title", { username: user.username }),
    children: <Body user={user} modals={modals} getUsers={getUsers} />,
  });
};

const Body = ({
  user,
  modals,
  getUsers,
}: {
  modals: ModalsContextProps;
  user: User;
  getUsers: () => void;
}) => {
  const t = useTranslate();

  const accountForm = useForm({
    initialValues: {
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActivated: user.isActivated,
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
          .min(8, t("common.error.too-short", { length: 8 })),
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
            {...accountForm.getInputProps("isActivated", { type: "checkbox" })}
            disabled={user.isActivated}
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
              label={t("admin.users.edit.update.custom-storage-quota-limit")}
              value={accountForm.values.storageQuotaLimit}
              onChange={(val) =>
                accountForm.setFieldValue("storageQuotaLimit", val)
              }
            />
          )}
        </Stack>
      </form>
      <Accordion>
        <Accordion.Item sx={{ borderBottom: "none" }} value="changePassword">
          <Accordion.Control px={0}>
            <FormattedMessage id="admin.users.edit.update.change-password.title" />
          </Accordion.Control>
          <Accordion.Panel>
            <form
              onSubmit={passwordForm.onSubmit(async (values) => {
                userService
                  .update(user.id, {
                    password: values.password,
                  })
                  .then(() =>
                    toast.success(
                      t("admin.users.edit.update.notify.password.success"),
                    ),
                  )
                  .catch(toast.axiosError);
              })}
            >
              <Stack>
                <PasswordInput
                  label={t("admin.users.edit.update.change-password.field")}
                  {...passwordForm.getInputProps("password")}
                />
                <Button variant="light" type="submit">
                  <FormattedMessage id="admin.users.edit.update.change-password.button" />
                </Button>
              </Stack>
            </form>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Group position="right">
        <Button type="submit" form="accountForm">
          <FormattedMessage id="common.button.save" />
        </Button>
      </Group>
    </Stack>
  );
};

export default showUpdateUserModal;
