import {
  Button,
  Checkbox,
  Collapse,
  Divider,
  Flex,
  Group,
  NumberInput,
  PasswordInput,
  Progress,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import moment from "moment";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import { translateOutsideContext } from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";
import { MyShare, UpdateShare } from "../../types/share.type";
import { Timespan } from "../../types/timespan.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";
import CopyTextField from "../upload/CopyTextField";
import QRCode from "./QRCode";
import { useState } from "react";

const showShareInformationsModal = (
  modals: ModalsContextProps,
  share: MyShare,
  maxShareSize: number,
  appUrl: string,
  defaultAppUrl: string,
  maxExpiration?: Timespan,
  onShareUpdated?: (share: MyShare) => void,
  initiallyEditing = false,
) => {
  const t = translateOutsideContext();

  return modals.openModal({
    title: t("account.shares.modal.share-informations"),
    children: (
      <Body
        share={share}
        maxShareSize={maxShareSize}
        appUrl={appUrl}
        defaultAppUrl={defaultAppUrl}
        maxExpiration={maxExpiration}
        onShareUpdated={onShareUpdated}
        initiallyEditing={initiallyEditing}
      />
    ),
  });
};

const Body = ({
  share,
  maxShareSize,
  appUrl,
  defaultAppUrl,
  maxExpiration,
  onShareUpdated,
  initiallyEditing,
}: {
  share: MyShare;
  maxShareSize: number;
  appUrl: string;
  defaultAppUrl: string;
  maxExpiration?: Timespan;
  onShareUpdated?: (share: MyShare) => void;
  initiallyEditing: boolean;
}) => {
  const t = translateOutsideContext();
  const [currentShare, setCurrentShare] = useState(share);
  const [showQR, setShowQR] = useState(false);
  const [isEditing, setIsEditing] = useState(initiallyEditing);

  const handleToggleQR = () => {
    setShowQR(!showQR);
  };

  const link = `${appUrl !== defaultAppUrl ? appUrl : window.location.origin}/s/${currentShare.id}`;

  const formattedShareSize = byteToHumanSizeString(currentShare.size);
  const formattedMaxShareSize = byteToHumanSizeString(maxShareSize);
  const shareSizeProgress = (currentShare.size / maxShareSize) * 100;

  const formattedCreatedAt = moment(currentShare.createdAt).format("LLL");
  const formattedExpiration =
    moment(currentShare.expiration).unix() === 0
      ? "Never"
      : moment(currentShare.expiration).format("LLL");

  if (isEditing) {
    return (
      <EditShareBody
        share={currentShare}
        maxExpiration={maxExpiration}
        onCancel={() => setIsEditing(false)}
        onShareUpdated={(updatedShare) => {
          setCurrentShare(updatedShare);
          onShareUpdated?.(updatedShare);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <Stack align="stretch" spacing="md">
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.id" />:{" "}
        </b>
        {currentShare.id}
      </Text>
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.name" />:{" "}
        </b>
        {currentShare.name || "-"}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.description" />:{" "}
        </b>
        {currentShare.description || "-"}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.createdAt" />:{" "}
        </b>
        {formattedCreatedAt}
      </Text>

      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.expiresAt" />:{" "}
        </b>
        {formattedExpiration}
      </Text>
      <Divider />
      <CopyTextField link={link} toggleQR={handleToggleQR} />
      <Collapse in={showQR}>
        <QRCode link={link} />
      </Collapse>
      <Divider />
      <Text size="sm">
        <b>
          <FormattedMessage id="account.shares.table.size" />:{" "}
        </b>
        {formattedShareSize} / {formattedMaxShareSize} (
        {shareSizeProgress.toFixed(1)}%)
      </Text>

      <Flex align="center" justify="center">
        {currentShare.size / maxShareSize < 0.1 && (
          <Text size="xs" style={{ marginRight: "4px" }}>
            {formattedShareSize}
          </Text>
        )}
        <Progress
          value={shareSizeProgress}
          label={
            currentShare.size / maxShareSize >= 0.1 ? formattedShareSize : ""
          }
          style={{
            width: currentShare.size / maxShareSize < 0.1 ? "70%" : "80%",
          }}
          size="xl"
          radius="xl"
        />
        <Text size="xs" style={{ marginLeft: "4px" }}>
          {formattedMaxShareSize}
        </Text>
      </Flex>
      <Button variant="light" onClick={() => setIsEditing(true)}>
        {t("common.button.edit")}
      </Button>
    </Stack>
  );
};

const formatDateTimeLocal = (date: Date) => {
  return moment(date).format("YYYY-MM-DDTHH:mm");
};

const EditShareBody = ({
  share,
  maxExpiration,
  onCancel,
  onShareUpdated,
}: {
  share: MyShare;
  maxExpiration?: Timespan;
  onCancel: () => void;
  onShareUpdated: (share: MyShare) => void;
}) => {
  const t = translateOutsideContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPermanentShare = moment(share.expiration).unix() === 0;
  const security = share.security ?? {
    passwordProtected: false,
    maxViews: undefined,
  };

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .transform((value) => value || undefined)
      .min(3, t("common.error.too-short", { length: 3 }))
      .max(30, t("common.error.too-long", { length: 30 })),
    description: yup
      .string()
      .transform((value) => value || undefined)
      .max(512, t("common.error.too-long", { length: 512 })),
    password: yup
      .string()
      .transform((value) => value || undefined)
      .min(3, t("common.error.too-short", { length: 3 }))
      .max(30, t("common.error.too-long", { length: 30 })),
    maxViews: yup
      .number()
      .nullable()
      .transform((value) => value || undefined)
      .min(1, t("common.error.number-too-small", { min: 1 })),
  });

  const form = useForm({
    initialValues: {
      name: share.name || "",
      description: share.description || "",
      expiration: isPermanentShare
        ? formatDateTimeLocal(moment().add(1, "day").toDate())
        : formatDateTimeLocal(share.expiration),
      never_expires: isPermanentShare,
      password: "",
      removePassword: false,
      maxViews: security.maxViews || undefined,
    },
    validate: yupResolver(validationSchema),
  });

  const onSubmit = form.onSubmit(async (values) => {
    const expirationDate = moment(values.expiration);

    if (!values.never_expires && !expirationDate.isValid()) {
      form.setFieldError("expiration", t("common.error.field-required"));
      return;
    }

    if (
      !values.never_expires &&
      maxExpiration &&
      maxExpiration.value !== 0 &&
      expirationDate.isAfter(
        moment().add(maxExpiration.value, maxExpiration.unit),
      )
    ) {
      form.setFieldError(
        "expiration",
        t("upload.modal.expires.error.too-long", {
          max: moment
            .duration(maxExpiration.value, maxExpiration.unit)
            .humanize(),
        }),
      );
      return;
    }

    const updateShare: UpdateShare = {
      name: values.name || null,
      description: values.description || null,
      expiration: values.never_expires ? "never" : expirationDate.toISOString(),
      security: {
        password: values.password || undefined,
        removePassword: values.removePassword,
        maxViews: values.maxViews || null,
      },
    };

    setIsSubmitting(true);
    try {
      const updatedShare = await shareService.update(share.id, updateShare);
      toast.success(t("share.edit.notify.save-success"));
      onShareUpdated(updatedShare);
    } catch (e) {
      toast.axiosError(e);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack align="stretch">
        <TextInput
          variant="filled"
          label={t("account.shares.table.name")}
          placeholder={t(
            "upload.modal.accordion.name-and-description.name.placeholder",
          )}
          {...form.getInputProps("name")}
        />
        <Textarea
          variant="filled"
          label={t("account.shares.table.description")}
          placeholder={t(
            "upload.modal.accordion.name-and-description.description.placeholder",
          )}
          {...form.getInputProps("description")}
        />
        <TextInput
          variant="filled"
          type="datetime-local"
          label={t("account.shares.table.expiresAt")}
          disabled={form.values.never_expires}
          {...form.getInputProps("expiration")}
        />
        {(!maxExpiration || maxExpiration.value === 0) && (
          <Checkbox
            label={t("upload.modal.expires.never-long")}
            {...form.getInputProps("never_expires", { type: "checkbox" })}
          />
        )}
        <Divider />
        <PasswordInput
          variant="filled"
          label={t("upload.modal.accordion.security.password.label")}
          placeholder={
            security.passwordProtected
              ? t("account.shares.modal.edit.password.keep")
              : t("upload.modal.accordion.security.password.placeholder")
          }
          autoComplete="new-password"
          disabled={form.values.removePassword}
          {...form.getInputProps("password")}
        />
        {security.passwordProtected && (
          <Checkbox
            label={t("account.shares.modal.edit.password.remove")}
            {...form.getInputProps("removePassword", { type: "checkbox" })}
          />
        )}
        <NumberInput
          min={1}
          type="number"
          variant="filled"
          placeholder={t(
            "upload.modal.accordion.security.max-views.placeholder",
          )}
          label={t("upload.modal.accordion.security.max-views.label")}
          {...form.getInputProps("maxViews")}
        />
        <Group position="right">
          <Button variant="default" onClick={onCancel}>
            {t("common.button.cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t("common.button.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export default showShareInformationsModal;
