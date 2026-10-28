import {
  ActionIcon,
  Box,
  Button,
  Center,
  useMantineTheme,
  Group,
  Space,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useModals } from "@mantine/modals";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TbPlusMinus,
  TbActivity,
  TbBan,
  TbInfoCircle,
  TbLink,
  TbLock,
  TbTrash,
  TbUsers,
} from "react-icons/tb";
import { FaUserLock } from "react-icons/fa";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import showShareInformationsModal from "../../components/share/showShareInformationsModal";
import showShareLinkModal from "../../components/account/showShareLinkModal";
import { HoverTip } from "../../components/core/HoverTip";
import CenterLoader from "../../components/core/CenterLoader";
import useConfig from "../../hooks/config.hook";
import useUser from "../../hooks/user.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { MyShare } from "../../types/share.type";
import toast from "../../utils/toast.util";

const browserName = (ua: string | null) => {
  if (!ua) return null;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/curl\//.test(ua)) return "curl";
  return null;
};

const shareStatus = (share: MyShare) => {
  if (share.removedReason?.startsWith("Auto-revoked")) return "tripwire";
  if (share.removedReason) return "revoked";
  const expiry = moment(share.expiration);
  if (expiry.unix() !== 0 && expiry.isBefore(moment())) return "expired";
  return "active";
};

const MyShares = () => {
  const modals = useModals();
  const clipboard = useClipboard();
  const config = useConfig();
  const { user } = useUser();
  const t = useTranslate();
  const theme = useMantineTheme();

  const [shares, setShares] = useState<MyShare[]>();
  const [voiding, setVoiding] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const showActivity = async (shareId: string) => {
    let events: Awaited<ReturnType<typeof shareService.getActivity>> = [];
    try {
      events = await shareService.getActivity(shareId);
    } catch {
      toast.error(t("common.error.unknown"));
      return;
    }
    modals.openModal({
      title: t("account.shares.modal.activity.title", { share: shareId }),
      children: events.length ? (
        <Stack spacing={6}>
          {events.map((e, i) => (
            <Text size="sm" key={i}>
              {t(`account.shares.activity.${e.type}`)} ·{" "}
              {moment(e.createdAt).fromNow()} ·{" "}
              {browserName(e.userAgent) ??
                t("account.shares.activity.unknown-browser")}
            </Text>
          ))}
        </Stack>
      ) : (
        <Text size="sm">
          <FormattedMessage id="account.shares.modal.activity.empty" />
        </Text>
      ),
    });
  };

  useEffect(() => {
    shareService.getMyShares().then((shares) => setShares(shares));
  }, []);

  if (!shares) return <CenterLoader />;

  return (
    <>
      <Meta title={t("account.shares.title")} />
      <div className="rv-label" style={{ marginTop: 16 }}>
        Owner dashboard · {shares.length} share{shares.length === 1 ? "" : "s"}
      </div>
      <Title mb={24} mt={4} order={2}>
        <FormattedMessage id="account.shares.title" />
      </Title>
      {shares.length == 0 ? (
        <Center style={{ height: "70vh" }}>
          <Stack align="center" spacing={10}>
            <Title order={3}>
              <FormattedMessage id="account.shares.title.empty" />
            </Title>
            <Text>
              <FormattedMessage id="account.shares.description.empty" />
            </Text>
            {user?.allowShare !== false && (
              <>
                <Space h={5} />
                <Button component={Link} href="/upload" variant="light">
                  <FormattedMessage id="account.shares.button.create" />
                </Button>
              </>
            )}
          </Stack>
        </Center>
      ) : (
        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>Status</th>
                <th>
                  <FormattedMessage id="account.shares.table.id" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.name" />
                </th>

                <th>
                  <FormattedMessage id="account.shares.table.visitors" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.downloads" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.expiresAt" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shares.map((share) => {
                return (
                  <tr key={share.id}>
                    <td>
                      {share.removedReason ? (
                        <HoverTip label={share.removedReason}>
                          <span
                            className={`rv-pill rv-pill--${shareStatus(share)}`}
                          >
                            {shareStatus(share)}
                          </span>
                        </HoverTip>
                      ) : (
                        <span
                          className={`rv-pill rv-pill--${shareStatus(share)}`}
                        >
                          {shareStatus(share)}
                        </span>
                      )}
                    </td>
                    <td style={{ position: "relative" }}>
                      <AnimatePresence>
                        {voiding === share.id && (
                          <motion.span
                            className="rv-void"
                            aria-hidden="true"
                            initial={
                              reduceMotion
                                ? { x: "-50%", y: "-50%", rotate: -8 }
                                : {
                                    x: "-50%",
                                    y: "-50%",
                                    scale: 2.4,
                                    rotate: -18,
                                    opacity: 0,
                                  }
                            }
                            animate={{
                              x: "-50%",
                              y: "-50%",
                              scale: 1,
                              rotate: -8,
                              opacity: 1,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 650,
                              damping: 20,
                            }}
                          >
                            VOID
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <Group spacing="xs" noWrap>
                        <span className="rv-mono" style={{ fontSize: 13 }}>
                          {share.id}
                        </span>
                        {share.security?.passwordProtected && (
                          <HoverTip label="Password Protected">
                            <span style={{ display: "inline-flex" }}>
                              <TbLock
                                color="currentColor"
                                title={t(
                                  "account.shares.table.password-protected",
                                )}
                              />
                            </span>
                          </HoverTip>
                        )}
                        {config.get("share.enableUserRecipients") &&
                          (share.security?.restrictToRecipients ? (
                            <HoverTip label="Recipients Only">
                              <span style={{ display: "inline-flex" }}>
                                <FaUserLock
                                  color={theme.colors.gray[6]}
                                  title={t(
                                    "account.shares.table.restricted-to-recipients",
                                  )}
                                />
                              </span>
                            </HoverTip>
                          ) : share.recipients?.length ? (
                            <HoverTip label="Sent to Recipients">
                              <span style={{ display: "inline-flex" }}>
                                <TbUsers
                                  color={theme.colors.gray[6]}
                                  title={t(
                                    "account.shares.table.shared-with-recipients",
                                  )}
                                />
                              </span>
                            </HoverTip>
                          ) : null)}
                      </Group>
                    </td>
                    <td>
                      <Group spacing="xs">
                        {share.name}
                      </Group>
                    </td>
                    <td>
                      <span className="rv-counter">
                        {share.security?.maxViews
                          ? `${share.views}/${share.security.maxViews}`
                          : share.views}
                      </span>
                    </td>
                    <td>
                      <span className="rv-counter">{share.downloads}</span>
                    </td>
                    <td className="rv-mono" style={{ fontSize: 13 }}>
                      {moment(share.expiration).unix() === 0 ? (
                        <FormattedMessage id="account.shares.table.expiry-never" />
                      ) : (
                        moment(share.expiration).format("DD MMM YYYY HH:mm")
                      )}
                    </td>
                    <td>
                      <Group position="right" noWrap spacing={6}>
                        <Link href={`/share/${share.id}/edit`}>
                          <HoverTip label={t("account.shares.button.edit")}>
                            <ActionIcon
                              color="dark"
                              variant="subtle"
                              size={28}
                            >
                              <TbPlusMinus />
                            </ActionIcon>
                          </HoverTip>
                        </Link>
                        <HoverTip label={t("common.button.info")}>
                          <ActionIcon
                            color="dark"
                            variant="subtle"
                            size={28}
                            onClick={() => {
                              showShareInformationsModal(
                                modals,
                                share,
                                parseInt(config.get("share.maxSize")),
                                config.get("general.appUrl"),
                                config.get("general.appUrl", true),
                                user?.isAdmin
                                  ? { value: 0, unit: "days" }
                                  : config.get("share.maxExpiration"),
                                (updatedShare) =>
                                  setShares(
                                    shares.map((item) =>
                                      item.id === updatedShare.id
                                        ? updatedShare
                                        : item,
                                    ),
                                  ),
                              );
                            }}
                          >
                            <TbInfoCircle />
                          </ActionIcon>
                        </HoverTip>
                        <HoverTip label={t("common.button.copy-link")}>
                          <ActionIcon
                            color="dark"
                            variant="subtle"
                            size={28}
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
                                  {
                                    expiration: share.expiration,
                                    maxViews: share.security?.maxViews ?? null,
                                    views: share.views,
                                  },
                                );
                              }
                            }}
                          >
                            <TbLink />
                          </ActionIcon>
                        </HoverTip>
                        <HoverTip label={t("account.shares.button.activity")}>
                          <ActionIcon
                            color="dark"
                            variant="subtle"
                            size={28}
                            onClick={() => showActivity(share.id)}
                          >
                            <TbActivity />
                          </ActionIcon>
                        </HoverTip>
                        {!share.removedReason && (
                          <HoverTip label={t("account.shares.button.revoke")}>
                            <ActionIcon
                              color="orange"
                              variant="light"
                              size={28}
                              onClick={() => {
                                modals.openConfirmModal({
                                  title: t(
                                    "account.shares.modal.revoke.title",
                                    {
                                      share: share.id,
                                    },
                                  ),
                                  children: (
                                    <Text size="sm">
                                      <FormattedMessage id="account.shares.modal.revoke.description" />
                                    </Text>
                                  ),
                                  confirmProps: { color: "red" },
                                  labels: {
                                    confirm: t("account.shares.button.revoke"),
                                    cancel: t("common.button.cancel"),
                                  },
                                  onConfirm: async () => {
                                    await shareService.revoke(share.id);
                                    setVoiding(share.id);
                                    setTimeout(() => setVoiding(null), 1400);
                                    setShares(
                                      shares.map((item) =>
                                        item.id === share.id
                                          ? {
                                              ...item,
                                              removedReason: "Revoked by owner",
                                            }
                                          : item,
                                      ),
                                    );
                                  },
                                });
                              }}
                            >
                              <TbBan />
                            </ActionIcon>
                          </HoverTip>
                        )}
                        <HoverTip label={t("common.button.delete")}>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size={28}
                            onClick={() => {
                              modals.openConfirmModal({
                                title: t("account.shares.modal.delete.title", {
                                  share: share.id,
                                }),
                                children: (
                                  <Text size="sm">
                                    <FormattedMessage id="account.shares.modal.delete.description" />
                                  </Text>
                                ),
                                confirmProps: {
                                  color: "red",
                                },
                                labels: {
                                  confirm: t("common.button.delete"),
                                  cancel: t("common.button.cancel"),
                                },
                                onConfirm: () => {
                                  shareService.expire(share.id);
                                  setShares(
                                    shares.filter(
                                      (item) => item.id !== share.id,
                                    ),
                                  );
                                },
                              });
                            }}
                          >
                            <TbTrash />
                          </ActionIcon>
                        </HoverTip>
                      </Group>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Box>
      )}
    </>
  );
};

export default MyShares;
