import { Group, Space, Text, Title } from "@mantine/core";
import { useModals } from "@mantine/modals";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import ManageShareTable from "../../components/admin/shares/ManageShareTable";
import DiskUsage from "../../components/admin/shares/DiskUsage";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { MyShare } from "../../types/share.type";
import toast from "../../utils/toast.util";

const Shares = () => {
  const [shares, setShares] = useState<MyShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const modals = useModals();
  const t = useTranslate();

  const loadShares = useCallback(
    () =>
      shareService.list().then((shares) => {
        setShares(shares);
        setIsLoading(false);
      }),
    [],
  );

  // shows the skeleton again, for a refresh someone asked for
  const getShares = () => {
    setIsLoading(true);
    return loadShares();
  };

  // refetch without the loading skeleton, used by auto refresh
  // stable reference so the auto refresh interval doesn't restart on every render
  const refreshShares = useCallback(() => {
    shareService.list().then(setShares).catch(toast.axiosError);
  }, []);

  const deleteShare = (share: MyShare) => {
    modals.openConfirmModal({
      title: t("admin.shares.edit.delete.title", {
        id: share.id,
      }),
      children: (
        <Text size="sm">
          <FormattedMessage id="admin.shares.edit.delete.description" />
        </Text>
      ),
      labels: {
        confirm: t("common.button.delete"),
        cancel: t("common.button.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        shareService
          .remove(share.id)
          .then(() => setShares((prev) => prev.filter((v) => v.id != share.id)))
          .catch(toast.axiosError);
      },
    });
  };

  const deleteShares = (toDelete: MyShare[]) => {
    modals.openConfirmModal({
      title: t("admin.shares.modal.delete-selected.title", {
        count: toDelete.length,
      }),
      children: (
        <Text size="sm">
          <FormattedMessage id="admin.shares.modal.delete-selected.description" />
        </Text>
      ),
      labels: {
        confirm: t("common.button.delete"),
        cancel: t("common.button.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        // one by one on purpose, sqlite has connection_limit=1 and Promise.all
        // would race, plus its fail-fast behaviour was masking partial results
        let failed = 0;
        for (const share of toDelete) {
          try {
            await shareService.remove(share.id);
          } catch (err: any) {
            // a 404 means someone (or clamav) already deleted it, that is fine
            if (err?.response?.status !== 404) failed++;
          }
        }
        getShares();
        if (failed > 0) {
          toast.error(
            t("admin.shares.notify.bulk-delete-failed", {
              failed,
              total: toDelete.length,
            }),
          );
        }
      },
    });
  };

  // isLoading already starts true, so the first fetch has no skeleton to turn
  // on and nothing here needs to touch state before the response arrives
  useEffect(() => {
    loadShares();
  }, [loadShares]);

  return (
    <>
      <Meta title={t("admin.shares.title")} />
      <Group position="apart" align="center" mb={20}>
        <Title mb={0} order={3}>
          <FormattedMessage id="admin.shares.title" />
        </Title>
        <DiskUsage />
      </Group>

      <ManageShareTable
        shares={shares}
        updateShare={(updatedShare) =>
          setShares((prev) =>
            prev.map((share) =>
              share.id === updatedShare.id ? updatedShare : share,
            ),
          )
        }
        deleteShare={deleteShare}
        deleteShares={deleteShares}
        refreshShares={refreshShares}
        isLoading={isLoading}
      />
      <Space h="xl" />
    </>
  );
};

export default Shares;
