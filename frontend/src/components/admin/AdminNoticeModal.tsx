import {
  Modal,
  Text,
  Checkbox,
  Button,
  Group,
  Anchor,
  Stack,
  Badge,
} from "@mantine/core";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { TbAlertTriangle, TbExternalLink } from "react-icons/tb";

export interface AdminNotice {
  id: string;
  title: string;
  message: string;
  actionLink?: string;
}

interface Props {
  notice: AdminNotice | null;
  onDismiss: (id: string) => Promise<void>;
}

export default function AdminNoticeModal({ notice, onDismiss }: Props) {
  const intl = useIntl();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!notice) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onDismiss(notice.id);
      setConfirmed(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={!!notice}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title={
        <Group spacing="xs">
          <TbAlertTriangle color="red" size={24} />
          <Badge color="red" variant="filled">
            <FormattedMessage id="admin.notice.modal.headerTag" />
          </Badge>
        </Group>
      }
      centered
      size="lg"
    >
      <Stack spacing="md">
        <div>
          <Text weight={700} size="lg" mb={4}>
            {notice.title}
          </Text>
          <Text size="sm" color="dimmed">
            {notice.message}
          </Text>
        </div>

        {notice.actionLink && (
          <Anchor
            href={notice.actionLink}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            <Group spacing={4}>
              <FormattedMessage id="admin.notice.modal.docsLink" />
              <TbExternalLink size={14} />
            </Group>
          </Anchor>
        )}

        <Checkbox
          checked={confirmed}
          onChange={(e) => setConfirmed(e.currentTarget.checked)}
          label={intl.formatMessage({
            id: "admin.notice.modal.defaultCheckboxLabel",
          })}
          color="red"
        />

        <Text size="xs" color="dimmed" fs="italic">
          <FormattedMessage id="admin.notice.modal.globalNoticeFooter" />
        </Text>

        <Group position="right" mt="xs">
          <Button
            color="red"
            disabled={!confirmed}
            loading={submitting}
            onClick={handleConfirm}
          >
            {submitting ? (
              <FormattedMessage id="admin.notice.modal.button.acknowledging" />
            ) : (
              <FormattedMessage id="admin.notice.modal.button.acknowledge" />
            )}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
