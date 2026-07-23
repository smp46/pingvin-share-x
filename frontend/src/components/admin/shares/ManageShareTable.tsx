import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Select,
  Skeleton,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import moment from "moment";
import { UIEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  TbInfoCircle,
  TbLink,
  TbRefresh,
  TbSearch,
  TbTrash,
} from "react-icons/tb";
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
  refreshShares,
  isLoading,
}: {
  shares: MyShare[];
  updateShare: (share: MyShare) => void;
  deleteShare: (share: MyShare) => void;
  deleteShares: (shares: MyShare[]) => void;
  refreshShares: () => void;
  isLoading: boolean;
}) => {
  const modals = useModals();
  const clipboard = useClipboard();
  const config = useConfig();
  const t = useTranslate();

  const [search, setSearch] = useState("");
  const [quickRange, setQuickRange] = useState<string | null>(null);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sort, setSort] = useState<{ column: string; asc: boolean }>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshInterval, setRefreshInterval] = useState<string | null>(null);

  // Check if file retention is enabled
  const fileRetentionPeriod = config.get("share.fileRetentionPeriod");
  const fileRetentionEnabled = fileRetentionPeriod.value !== 0 ? true : false;

  const visibleShares = useMemo(() => {
    const needle = search.toLowerCase();
    const preset = QUICK_RANGES.find((r) => r.value === quickRange);
    let after: moment.Moment | null = null;
    let before: moment.Moment | null = null;
    if (quickRange === OLDER_THAN_7D) {
      before = moment().subtract(7, "days");
    } else if (preset) {
      after = moment().subtract(preset.amount, preset.unit);
    } else {
      after = createdFrom ? moment(createdFrom).startOf("day") : null;
      before = createdTo ? moment(createdTo).endOf("day") : null;
    }

    const filtered = shares.filter((share) => {
      const matchesSearch =
        share.id.toLowerCase().includes(needle) ||
        (share.name ?? "").toLowerCase().includes(needle) ||
        (share.creator?.username ?? "").toLowerCase().includes(needle);
      const createdAt = moment(share.createdAt);
      const matchesFrom = !after || createdAt.isSameOrAfter(after);
      const matchesTo = !before || createdAt.isSameOrBefore(before);
      return matchesSearch && matchesFrom && matchesTo;
    });
    if (sort) {
      filtered.sort((a, b) => {
        const va = sortValue(a, sort.column);
        const vb = sortValue(b, sort.column);
        const order = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.asc ? order : -order;
      });
    }
    return filtered;
  }, [shares, search, quickRange, createdFrom, createdTo, sort]);

  const pageShares = visibleShares.slice(0, visibleCount);
  const scrollBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, quickRange, createdFrom, createdTo, sort]);

  const applyQuickRange = (value: string | null) => {
    setQuickRange(value);
    setCreatedFrom("");
    setCreatedTo("");
  };

  // tall windows can fit the whole batch without a scrollbar, keep loading until it appears
  useEffect(() => {
    const el = scrollBoxRef.current;
    if (
      el &&
      el.scrollHeight <= el.clientHeight &&
      visibleCount < visibleShares.length
    ) {
      setVisibleCount((count) =>
        Math.min(count + PAGE_SIZE, visibleShares.length),
      );
    }
  }, [visibleCount, visibleShares]);

  useEffect(() => {
    const interval = REFRESH_INTERVALS.find((r) => r.value === refreshInterval);
    if (!interval) return;
    const id = setInterval(refreshShares, interval.ms);
    return () => clearInterval(id);
  }, [refreshInterval, refreshShares]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount((count) =>
        Math.min(count + PAGE_SIZE, visibleShares.length),
      );
    }
  };

  const toggleSort = (column: string) => {
    setSort(
      sort?.column === column
        ? { column, asc: !sort.asc }
        : { column, asc: true },
    );
  };

  const selectedShares = shares.filter((share) => selectedIds.has(share.id));
  const allSelected =
    visibleShares.length > 0 &&
    visibleShares.every((share) => selectedIds.has(share.id));

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
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
      <Group position="apart" mb="md" align="flex-end">
        <Group align="flex-end">
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
        <Group align="flex-end" spacing="xs">
          <Select
            placeholder={t("admin.shares.filter.quickRange")}
            data={[
              ...QUICK_RANGES.map((r) => ({
                value: r.value,
                label: t(`admin.shares.filter.range.${r.value}`),
              })),
              {
                value: OLDER_THAN_7D,
                label: t("admin.shares.filter.range.older7d"),
              },
            ]}
            value={quickRange}
            onChange={applyQuickRange}
            clearable
            w={180}
          />
          <TextInput
            type="date"
            label={t("admin.shares.filter.createdFrom")}
            value={createdFrom}
            onChange={(e) => {
              setQuickRange(null);
              setCreatedFrom(e.currentTarget.value);
            }}
          />
          <TextInput
            type="date"
            label={t("admin.shares.filter.createdTo")}
            value={createdTo}
            onChange={(e) => {
              setQuickRange(null);
              setCreatedTo(e.currentTarget.value);
            }}
          />
          <Select
            placeholder={t("admin.shares.refresh")}
            icon={<TbRefresh />}
            data={REFRESH_INTERVALS.map((r) => ({
              value: r.value,
              label: r.value,
            }))}
            value={refreshInterval}
            onChange={setRefreshInterval}
            clearable
            w={120}
          />
          <HoverTip label={t("admin.shares.refresh.now")}>
            <ActionIcon variant="light" size={36} onClick={refreshShares}>
              <TbRefresh />
            </ActionIcon>
          </HoverTip>
        </Group>
      </Group>
      <Box
        ref={scrollBoxRef}
        sx={{
          maxHeight: "calc(100vh - 340px)",
          minHeight: 300,
          overflowY: "auto",
        }}
        onScroll={handleScroll}
      >
        <Table
          verticalSpacing="sm"
          sx={(theme) => ({
            thead: {
              position: "sticky",
              top: 0,
              zIndex: 1,
              background:
                theme.colorScheme === "dark"
                  ? theme.colors.dark[7]
                  : theme.white,
            },
          })}
        >
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
              {sortableTh("id", "account.shares.table.id")}
              {sortableTh("createdAt", "account.shares.table.createdAt")}
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
              ? skeletonRows(fileRetentionEnabled ? 10 : 9)
              : pageShares.map((share) => (
                  <tr key={share.id}>
                    <td>
                      <Checkbox
                        checked={selectedIds.has(share.id)}
                        onChange={() => toggleRow(share.id)}
                      />
                    </td>
                    <td>{share.id}</td>
                    <td>{moment(share.createdAt).format("LLL")}</td>
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
                      <Group position="right" noWrap>
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
    </Box>
  );
};

const PAGE_SIZE = 50;

const OLDER_THAN_7D = "older7d";

const REFRESH_INTERVALS: { value: string; ms: number }[] = [
  { value: "10s", ms: 10000 },
  { value: "30s", ms: 30000 },
  { value: "1m", ms: 60000 },
  { value: "5m", ms: 300000 },
];

const QUICK_RANGES: {
  value: string;
  amount: number;
  unit: moment.unitOfTime.DurationConstructor;
}[] = [
  { value: "15m", amount: 15, unit: "minutes" },
  { value: "1h", amount: 1, unit: "hours" },
  { value: "6h", amount: 6, unit: "hours" },
  { value: "12h", amount: 12, unit: "hours" },
  { value: "1d", amount: 1, unit: "days" },
  { value: "2d", amount: 2, unit: "days" },
  { value: "3d", amount: 3, unit: "days" },
  { value: "7d", amount: 7, unit: "days" },
];

const sortValue = (share: MyShare, column: string) => {
  if (column == "views") return share.views;
  if (column == "size") return share.size;
  if (column == "expiration") return moment(share.expiration).unix();
  if (column == "createdAt") return moment(share.createdAt).unix();
  if (column == "username") return share.creator?.username.toLowerCase() ?? "";
  if (column == "name") return (share.name ?? "").toLowerCase();
  return share.id.toLowerCase();
};

const skeletonRows = (columns: number) =>
  [...Array(10)].map((v, i) => (
    <tr key={i}>
      {[...Array(columns)].map((c, j) => (
        <td key={j}>
          <Skeleton height={20} />
        </td>
      ))}
    </tr>
  ));

export default ManageShareTable;
