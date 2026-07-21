import { Button, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { useModals } from "@mantine/modals";
import { FormattedMessage } from "react-intl";
import { translateOutsideContext } from "../../../hooks/useTranslate.hook";
import shareService from "../../../services/share.service";
import { MyShare } from "../../../types/share.type";
import toast from "../../../utils/toast.util";

const showMoveShareModal = (
  modals: ModalsContextProps,
  share: MyShare,
  onMoved: (share: MyShare) => void,
) => {
  const t = translateOutsideContext();

  return modals.openModal({
    title: t("admin.shares.move.title"),
    children: <MoveShareBody share={share} onMoved={onMoved} />,
  });
};

const MoveShareBody = ({
  share,
  onMoved,
}: {
  share: MyShare;
  onMoved: (share: MyShare) => void;
}) => {
  const t = translateOutsideContext();
  const modals = useModals();
  const form = useForm({
    initialValues: {
      destination: share.storagePath || "",
    },
  });

  return (
    <Stack>
      <Text size="sm" color="dimmed">
        <FormattedMessage id="admin.shares.move.description" />
      </Text>
      {share.filesystemLocation && (
        <Text size="xs" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {share.filesystemLocation}
        </Text>
      )}
      <TextInput
        label={t("admin.shares.move.destination")}
        placeholder={t("admin.shares.move.destination.placeholder")}
        {...form.getInputProps("destination")}
      />
      <Button
        onClick={async () => {
          try {
            const updated = await shareService.moveShare(
              share.id,
              form.values.destination,
            );
            toast.success(t("admin.shares.move.success"));
            onMoved(updated);
            modals.closeAll();
          } catch {
            // api interceptor handles toast
          }
        }}
      >
        <FormattedMessage id="admin.shares.move" />
      </Button>
    </Stack>
  );
};

export default showMoveShareModal;
