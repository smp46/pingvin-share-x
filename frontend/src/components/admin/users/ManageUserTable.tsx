import { ActionIcon, Badge, Box, Group, Skeleton, Table } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { TbCheck, TbEdit, TbTrash } from "react-icons/tb";
import User from "../../../types/user.type";
import showUpdateUserModal from "./showUpdateUserModal";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../../hooks/useTranslate.hook";
import { HoverTip } from "../../core/HoverTip";
import { byteToHumanSizeString } from "../../../utils/fileSize.util";
import { CustomPasswordPolicy } from "../../../types/config.type";

const ManageUserTable = ({
  users,
  getUsers,
  deleteUser,
  isLoading,
  customPasswordPolicy,
}: {
  users: User[];
  getUsers: () => void;
  deleteUser: (user: User) => void;
  isLoading: boolean;
  customPasswordPolicy: CustomPasswordPolicy;
}) => {
  const modals = useModals();
  const t = useTranslate();

  const showStorageQuota = users.some((user) => !!user.storageQuotaLimit);
  const showMaxShareSize = users.some((user) => !!user.shareSizeLimit);

  return (
    <Box sx={{ display: "block", overflowX: "auto" }}>
      <Table verticalSpacing="sm">
        <thead>
          <tr>
            <th>
              <FormattedMessage id="admin.users.table.username" />
            </th>
            <th>
              <FormattedMessage id="admin.users.table.email" />
            </th>
            <th>
              <FormattedMessage id="admin.users.table.admin" />
            </th>
            {showStorageQuota && (
              <th>
                <FormattedMessage id="admin.users.table.storageQuota" />
              </th>
            )}
            {showMaxShareSize && (
              <th>
                <FormattedMessage id="admin.users.table.maxShareSize" />
              </th>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? getSkeletonRows(showStorageQuota, showMaxShareSize)
            : users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.username}{" "}
                    {user.isLdap ? (
                      <Badge style={{ marginLeft: "1em" }}>LDAP</Badge>
                    ) : null}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.isAdmin && <TbCheck />}</td>
                  {showStorageQuota && (
                    <td>
                      {user.storageQuotaLimit
                        ? byteToHumanSizeString(
                            parseInt(user.storageQuotaLimit),
                          )
                        : "-"}
                    </td>
                  )}
                  {showMaxShareSize && (
                    <td>
                      {user.shareSizeLimit
                        ? byteToHumanSizeString(parseInt(user.shareSizeLimit))
                        : "-"}
                    </td>
                  )}
                  <td>
                    <Group position="right">
                      {user.isLdap ? null : (
                        <HoverTip label={t("common.button.edit")}>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size={25}
                            onClick={() =>
                              showUpdateUserModal(modals, user, getUsers, customPasswordPolicy)
                            }
                          >
                            <TbEdit />
                          </ActionIcon>
                        </HoverTip>
                      )}
                      <HoverTip label={t("common.button.delete")}>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size={25}
                          onClick={() => deleteUser(user)}
                        >
                          <TbTrash />
                        </ActionIcon>
                      </HoverTip>
                    </Group>
                  </td>
                </tr>
              ))}
        </tbody>
      </Table>
    </Box>
  );
};

const getSkeletonRows = (
  showStorageQuota: boolean,
  showMaxShareSize: boolean,
) =>
  [...Array(10)].map((v, i) => (
    <tr key={i}>
      <td>
        <Skeleton key={i} height={20} />
      </td>
      <td>
        <Skeleton key={i} height={20} />
      </td>
      <td>
        <Skeleton key={i} height={20} />
      </td>
      {showStorageQuota && (
        <td>
          <Skeleton key={i} height={20} />
        </td>
      )}
      {showMaxShareSize && (
        <td>
          <Skeleton key={i} height={20} />
        </td>
      )}
      <td>
        <Skeleton key={i} height={20} />
      </td>
    </tr>
  ));

export default ManageUserTable;
