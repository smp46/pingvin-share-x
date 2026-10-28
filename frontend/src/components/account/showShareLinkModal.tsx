import { Stack, TextInput } from "@mantine/core";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { translateOutsideContext } from "../../hooks/useTranslate.hook";
import ShareTicket from "../share/ShareTicket";

const showShareLinkModal = (
  modals: ModalsContextProps,
  shareId: string,
  appUrl: string,
  defaultAppUrl: string,
  details?: {
    expiration?: Date | string | null;
    maxViews?: number | null;
    views?: number;
  },
) => {
  const t = translateOutsideContext();
  const link = `${appUrl !== defaultAppUrl ? appUrl : window.location.origin}/s/${shareId}`;
  return modals.openModal({
    title: t("account.shares.modal.share-link"),
    children: (
      <Stack align="stretch">
        <ShareTicket
          shareId={shareId}
          link={link}
          expiration={details?.expiration}
          maxViews={details?.maxViews}
          views={details?.views}
        />
        <TextInput variant="filled" value={link} />
      </Stack>
    ),
  });
};

export default showShareLinkModal;
