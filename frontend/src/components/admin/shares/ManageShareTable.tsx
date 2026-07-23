import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  MediaQuery,
  Skeleton,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import moment from "moment";
import { useMemo, useState } from "react";
import { TbInfoCircle, TbLink, TbSearch, TbTrash } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useConfig from "../../../hooks/config.hook";
import useTranslate from "../../../hooks/useTranslate.hook";
import { MyShare } from "../../../types/share.type";
import { byteToHumanSizeString } from "../../../utils/fileSize.util";
import toast from "../../../utils/toast.util";
import showShareInformationsModal from "../../share/showShareInformationsModal";
import showShareLinkModal from "../../account/showShareLinkModal";
import { HoverTip } from "../../core/HoverTip";

const ManageShareTable = ({
  shares,
  updateShare,
  deleteShare,
  deleteShares,
  isLoading,
}: {
  shares: MyShare[];
  updateShare: (share: MyShare) => void;
  deleteShare: (share: MyShare) => void;
  deleteShares: (shares: MyShare[]) => void;
  isLoading: boolean;
}) => {
  const modals = useModals();
  const clipboard = useClipboard();
  const config = useConfig();
  const t = useTranslate();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ column: string; asc: boolean }>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Check if file retention is enabled
  const fileRetentionPeriod = config.get("share.fileRetentionPeriod");
  const fileRetentionEnabled = fileRetentionPeriod.value !== 0 ? true : false;

  const visibleShares = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = shares.filter(
      (share) =>
        share.id.toLowerCase().includes(needle) ||
        (share.name ?? "").toLowerCase().includes(needle) ||
        (share.creator?.username ?? "").toLowerCase().includes(needle),
    );
    if (sort) {
      filtered.sort((a, b) => {
        const va = sortValue(a, sort.column);
        const vb = sortValue(b, sort.column);
        const order = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.asc ? order : -order;
      });
    }
    return filtered;
  }, [shares, search, sort]);

  const toggleSort = (column: string) => {
    setSort(
      sort?.column === column
        ? { column, asc: !sort.asc }
        : { column, asc: true },
    );
  };

  const selectedShares = shares.filter((share) => selectedIds.has(share.id));
  const allVisibleSelected =
    visibleShares.length > 0 &&
    visibleShares.every((share) => selectedIds.has(share.id));

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleShares.forEach((share) => next.delete(share.id));
    } else {
      visibleShares.forEach((share) => next.add(share.id));
    }
    setSelectedIds(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const sortableTh = (column: string, messageId: string) => (
    <th style={{ cursor: "pointer" }} onClick={() => toggleSort(column)}>
      <FormattedMessage id={messageId} />
      {sort?.column === column && (sort.asc ? " ▲" : " ▼")}
    </th>
  );

  return (
    <Box sx={{ display: "block", overflowX: "auto" }}>
      <Group position="apart" mb="md">
        <TextInput
          placeholder={t("admin.shares.search")}
          icon={<TbSearch />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        {selectedShares.length > 0 && (
          <Button
            variant="light"
            color="red"
            leftIcon={<TbTrash />}
            onClick={() => deleteShares(selectedShares)}
          >
            {t("admin.shares.button.delete-selected", {
              count: selectedShares.length,
            })}
          </Button>
        )}
      </Group>
      <Table verticalSpacing="sm">
        <thead>
          <tr>
            <th style={{ width: 30 }}>
              <Checkbox checked={allVisibleSelected} onChange={toggleAll} />
            </th>
            {sortableTh("id", "account.shares.table.id")}
            {sortableTh("name", "account.shares.table.name")}
            {sortableTh("username", "admin.shares.table.username")}
            {sortableTh("views", "account.shares.table.visitors")}
            {sortableTh("size", "account.shares.table.size")}
            {sortableTh("expiration", "account.shares.table.expiresAt")}
            {fileRetentionEnabled ? (
              <th>
                <FormattedMessage id="admin.shares.table.deletes" />
              </th>
            ) : (
              <></>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? skeletonRows
            : visibleShares.map((share) => (
                <tr key={share.id}>
                  <td>
                    <Checkbox
                      checked={selectedIds.has(share.id)}
                      onChange={() => toggleRow(share.id)}
                    />
                  </td>
                  <td>{share.id}</td>
                  <td>{share.name}</td>
                  <td>
                    {share.creator ? (
                      share.creator.username
                    ) : (
                      <Text color="dimmed">Anonymous</Text>
                    )}
                  </td>
                  <td>{share.views}</td>
                  <td>{byteToHumanSizeString(share.size)}</td>
                  <td>
                    {moment(share.expiration).unix() === 0
                      ? "Never"
                      : moment(share.expiration).format("LLL")}
                  </td>
                  {fileRetentionEnabled ? (
                    <td>
                      {moment(share.expiration).unix() === 0 ||
                      fileRetentionPeriod.value === -1
                        ? "Never"
                        : moment(share.expiration)
                            .add(
                              fileRetentionPeriod.value,
                              fileRetentionPeriod.unit,
                            )
                            .format("LLL")}
                    </td>
                  ) : (
                    <></>
                  )}
                  <td>
                    <Group position="right">
                      <HoverTip label={t("common.button.info")}>
                        <ActionIcon
                          color="blue"
                          variant="light"
                          size={25}
                          onClick={() => {
                            showShareInformationsModal(
                              modals,
                              share,
                              parseInt(config.get("share.maxSize")),
                              config.get("general.appUrl"),
                              config.get("general.appUrl", true),
                              { value: 0, unit: "days" },
                              updateShare,
                            );
                          }}
                        >
                          <TbInfoCircle />
                        </ActionIcon>
                      </HoverTip>
                      <HoverTip label={t("common.button.copy-link")}>
                        <ActionIcon
                          color="victoria"
                          variant="light"
                          size={25}
                          onClick={() => {
                            if (window.isSecureContext) {
                              clipboard.copy(
                                `${config.get("general.appUrl") !== config.get("general.appUrl", true) ? config.get("general.appUrl") : window.location.origin}/s/${share.id}`,
                              );
                              toast.success(t("common.notify.copied-link"));
                            } else {
                              showShareLinkModal(
                                modals,
                                share.id,
                                config.get("general.appUrl"),
                                config.get("general.appUrl", true),
                              );
                            }
                          }}
                        >
                          <TbLink />
                        </ActionIcon>
                      </HoverTip>
                      <HoverTip label={t("common.button.delete")}>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size={25}
                          onClick={() => deleteShare(share)}
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

const sortValue = (share: MyShare, column: string) => {
  if (column == "views") return share.views;
  if (column == "size") return share.size;
  if (column == "expiration") return moment(share.expiration).unix();
  if (column == "username") return share.creator?.username.toLowerCase() ?? "";
  if (column == "name") return (share.name ?? "").toLowerCase();
  return share.id.toLowerCase();
};

const skeletonRows = [...Array(10)].map((v, i) => (
  <tr key={i}>
    <td>
      <Skeleton key={i} height={20} />
    </td>
    <MediaQuery smallerThan="md" styles={{ display: "none" }}>
      <td>
        <Skeleton key={i} height={20} />
      </td>
    </MediaQuery>
    <td>
      <Skeleton key={i} height={20} />
    </td>
    <td>
      <Skeleton key={i} height={20} />
    </td>
    <td>
      <Skeleton key={i} height={20} />
    </td>
    <td>
      <Skeleton key={i} height={20} />
    </td>
  </tr>
));

export default ManageShareTable;
