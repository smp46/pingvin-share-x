import { Button, Group, Text, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { FormattedMessage } from "react-intl";
import { useIsHydrated } from "../../hooks/useIsHydrated.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import { generateShareId } from "../../utils/share.util";

interface CustomUrlInputProps {
  form: UseFormReturnType<any>;
  fieldName?: string;
  shareIdLength: number;
  appUrl: string;
  defaultAppUrl: string;
  pathPrefix?: string;
}

const CustomUrlInput = ({
  form,
  fieldName = "link",
  shareIdLength,
  appUrl,
  defaultAppUrl,
  pathPrefix = "/s/",
}: CustomUrlInputProps) => {
  const t = useTranslate();
  const fieldValue = form.values[fieldName] || "";
  const hasError = !!form.errors[fieldName];

  // window is only there after hydration, and the server rendered without it
  const isHydrated = useIsHydrated();

  const baseUrl =
    appUrl !== defaultAppUrl ? appUrl : isHydrated ? window.location.origin : "";

  return (
    <>
      <Group align={hasError ? "center" : "flex-end"} noWrap>
        <TextInput
          style={{ flex: "1" }}
          variant="filled"
          label={t("upload.modal.link.label")}
          placeholder="myAwesomeShare"
          {...form.getInputProps(fieldName)}
        />
        <Button
          style={{ flex: "0 0 auto" }}
          variant="outline"
          onClick={() =>
            form.setFieldValue(fieldName, generateShareId(shareIdLength))
          }
        >
          <FormattedMessage id="common.button.generate" />
        </Button>
      </Group>

      <Text
        italic
        size="xs"
        sx={(theme) => ({
          color: theme.colors.gray[6],
          wordBreak: "break-all",
        })}
      >
        {`${baseUrl}${pathPrefix}${fieldValue}`}
      </Text>
    </>
  );
};

export default CustomUrlInput;
