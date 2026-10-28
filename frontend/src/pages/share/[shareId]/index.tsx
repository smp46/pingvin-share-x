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
    return (
      <>
        <Meta title={t(error.title)} />
        <Center style={{ minHeight: "70vh", padding: 24 }}>
          <Stack
            align="center"
            spacing="md"
            style={{ maxWidth: 520 }}
            role="alert"
          >
            <Title order={2} align="center">
              {t(error.title)}
            </Title>
            <Text
              color="dimmed"
              align="center"
              style={{ overflowWrap: "anywhere" }}
            >
              {error.message ?? (error.description ? t(error.description) : "")}
            </Text>
            <Button component={Link} href="/">
              {t("common.button.go-home")}
            </Button>
          </Stack>
        </Center>
      </>
    );
  }

  if (isRestricted) {
    return (
      <Center style={{ height: "70vh" }}>
        <Stack align="center" spacing="md">
          <Title order={3}>
            <FormattedMessage id="share.error.restricted.title" />
          </Title>
          <Text color="dimmed" align="center">
            <FormattedMessage id="share.error.restricted.description" />
          </Text>
          <Button
            component={Link}
            href={`/auth/signIn?redirect=/share/${shareId}`}
          >
            <FormattedMessage id="share.error.restricted.button" />
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <Meta
        title={t("share.title", { shareId: share?.name || shareId })}
        description={t("share.description")}
      />

      <Group position="apart" mb="lg">
        <Box style={{ maxWidth: "70%" }}>
          <Title order={3}>{share?.name || share?.id}</Title>
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
                <ActionIcon variant="light" color="orange" size="lg">
                  <TbPlusMinus />
                </ActionIcon>
              </Link>
            </HoverTip>
          )}
          {isOwnerOrAdmin && (
            <HoverTip label={t("common.button.edit")}>
              <ActionIcon
                variant="light"
                color="blue"
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
