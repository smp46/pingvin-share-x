import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useModals } from "@mantine/modals";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormattedMessage } from "react-intl";
import { TbEdit, TbPlusMinus } from "react-icons/tb";
import Meta from "../../../components/Meta";
import DownloadAllButton from "../../../components/share/DownloadAllButton";
import FileList from "../../../components/share/FileList";
import SafetyCard from "../../../components/share/SafetyCard";
import CheckpointClosed from "../../../components/share/CheckpointClosed";
import useShareAccess from "../../../hooks/shareAccess.hook";
import showShareInformationsModal from "../../../components/share/showShareInformationsModal";
import useConfig from "../../../hooks/config.hook";
import useTranslate from "../../../hooks/useTranslate.hook";
import useUser from "../../../hooks/user.hook";
import shareService from "../../../services/share.service";
import { MyShare } from "../../../types/share.type";
import toast from "../../../utils/toast.util";
import { byteToHumanSizeString } from "../../../utils/fileSize.util";
import { getQueryString } from "../../../utils/router.util";
import { HoverTip } from "../../../components/core/HoverTip";

export function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: { shareId: context.params!.shareId },
  };
}

const Share = ({ shareId }: { shareId: string }) => {
  const modals = useModals();
  const router = useRouter();
  const { share, setShare, isRestricted, error } = useShareAccess({
    shareId,
    modals,
  });
  const { user } = useUser();
  const config = useConfig();
  const t = useTranslate();

  const isOwner = !!user && !!share && share.creator?.id === user.id;

  const isOwnerOrAdmin =
    !!user && !!share && (share.creator?.id === user.id || user.isAdmin);
  const recipientId = getQueryString(router.query.recipient);

  const handleEditClick = async () => {
    try {
      const myShares = isOwner
        ? await shareService.getMyShares()
        : await shareService.list();
      const myShare = myShares.find((s) => s.id === shareId);
      if (!myShare) return;
      showShareInformationsModal(
        modals,
        myShare,
        parseInt(config.get("share.maxSize")),
        config.get("general.appUrl"),
        config.get("general.appUrl", true),
        user?.isAdmin
          ? { value: 0, unit: "days" }
          : config.get("share.maxExpiration"),
        (updatedShare: MyShare) => {
          setShare((prev) =>
            prev
              ? {
                  ...prev,
                  name: updatedShare.name,
                  description: updatedShare.description,
                  expiration: updatedShare.expiration,
                  hasPassword:
                    updatedShare.security?.passwordProtected ??
                    prev.hasPassword,
                }
              : prev,
          );
        },
        true,
      );
    } catch (e) {
      toast.axiosError(e);
    }
  };

  if (error) {
    const isTripwire =
      error.title === "share.error.removed.title" &&
      !!error.message?.startsWith("Auto-revoked");
    const codes: Record<string, string> = {
      "share.error.not-found.title": "NOT FOUND",
      "share.error.expired.title": "EXPIRED",
      "share.error.removed.title": isTripwire ? "TRIPWIRE" : "REVOKED",
      "share.error.visitor-limit-exceeded.title": "VIEW LIMIT",
      "share.error.access-denied.title": "PRIVATE",
    };
    const text = isTripwire
      ? `${error.message!.replace(/^Auto-revoked:\s*/i, "Locked automatically after ")}. Nothing was downloaded after the lock — ask the sender for a fresh link.`
      : (error.message ?? (error.description ? t(error.description) : ""));
    return (
      <>
        <Meta title={t(error.title)} />
        <CheckpointClosed
          code={codes[error.title] ?? "ERROR"}
          hazard={isTripwire}
          title={isTripwire ? "Tripwire triggered. Link locked." : t(error.title)}
          text={text}
          actionLabel={t("common.button.go-home")}
          actionHref="/"
        />
      </>
    );
  }

  if (isRestricted) {
    return (
      <CheckpointClosed
        code="RECIPIENTS ONLY"
        title={<FormattedMessage id="share.error.restricted.title" />}
        text={<FormattedMessage id="share.error.restricted.description" />}
        actionLabel={<FormattedMessage id="share.error.restricted.button" />}
        actionHref={`/auth/signIn?redirect=/share/${shareId}`}
      />
    );
  }

  return (
    <>
      <Meta
        title={t("share.title", { shareId: share?.name || shareId })}
        description={t("share.description")}
      />

      <Group position="apart" mb="lg">
        <Box style={{ maxWidth: "100%", minWidth: 0, flex: "1 1 260px" }}>
          <div className="rv-label">
            Share ·{" "}
            <span style={{ textTransform: "none", letterSpacing: "0.04em" }}>
              {shareId}
            </span>
          </div>
          <Title order={2} mt={4} style={{ overflowWrap: "anywhere" }}>
            {share?.name || share?.id}
          </Title>
          <Text size="sm">{share?.description}</Text>
          {share?.files?.length > 0 && (
            <Text size="sm" color="dimmed" mt={5}>
              <FormattedMessage
                id="share.fileCount"
                values={{
                  count: share?.files?.length || 0,
                  size: byteToHumanSizeString(
                    share?.files?.reduce(
                      (total: number, file: { size: string }) =>
                        total + parseInt(file.size),
                      0,
                    ) || 0,
                  ),
                }}
              />
            </Text>
          )}
        </Box>

        <Group spacing="xs">
          {isOwner && (
            <HoverTip label={t("account.shares.button.edit")}>
              <Link href={`/share/${shareId}/edit`}>
                <ActionIcon variant="outline" color="dark" size="lg">
                  <TbPlusMinus />
                </ActionIcon>
              </Link>
            </HoverTip>
          )}
          {isOwnerOrAdmin && (
            <HoverTip label={t("common.button.edit")}>
              <ActionIcon
                variant="outline"
                color="dark"
                size="lg"
                onClick={handleEditClick}
              >
                <TbEdit />
              </ActionIcon>
            </HoverTip>
          )}
          {share?.files.length > 1 && (
            <DownloadAllButton shareId={shareId} recipientId={recipientId} />
          )}
        </Group>
      </Group>

      {share?.safety && (
        <SafetyCard
          safety={share.safety}
          files={share.files}
          createdAt={share.createdAt}
        />
      )}

      <FileList
        files={share?.files}
        setShare={setShare}
        share={share!}
        isLoading={!share}
        recipientId={recipientId}
      />
    </>
  );
};

export default Share;
