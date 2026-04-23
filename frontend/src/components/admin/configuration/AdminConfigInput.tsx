import {
  Box,
  Center,
  ColorInput,
  NumberInput,
  PasswordInput,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { TbDeviceLaptop, TbMoon, TbSun } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import { AdminConfig, UpdateConfig } from "../../../types/config.type";
import { stringToTimespan, timespanToString } from "../../../utils/date.util";
import FileSizeInput from "../../core/FileSizeInput";
import TimespanInput from "../../core/TimespanInput";

const AdminConfigInput = ({
  configVariable,
  updateConfigVariable,
  allConfigVariables,
  updatedConfigVariables,
}: {
  configVariable: AdminConfig;
  updateConfigVariable: (variable: UpdateConfig) => void;
  allConfigVariables?: AdminConfig[];
  updatedConfigVariables?: UpdateConfig[];
}) => {
  const isCustomCssConfig = configVariable.key === "appearance.customCss";
  const isThemePrimaryColorConfig =
    configVariable.key === "appearance.themePrimaryColor";
  const isThemePrimaryColorOverrideConfig =
    configVariable.key === "appearance.themePrimaryColorOverride";
  const isThemeRadiusConfig = configVariable.key === "appearance.themeRadius";
  const isThemeColorSchemeConfig =
    configVariable.key === "appearance.themeColorScheme";

  const getEffectiveConfigValue = (key: string): string | undefined => {
    const updatedValue = updatedConfigVariables?.find((item) => item.key === key);
    if (updatedValue) return updatedValue.value;

    const configVariable = allConfigVariables?.find((item) => item.key === key);
    return configVariable?.value ?? configVariable?.defaultValue;
  };

  const shouldShowPrimaryColorOverride =
    getEffectiveConfigValue("appearance.themePrimaryColor") === "custom";

  const form = useForm({
    initialValues: {
      stringValue: configVariable.value ?? configVariable.defaultValue,
      textValue: configVariable.value ?? configVariable.defaultValue,
      numberValue: parseInt(
        configVariable.value ?? configVariable.defaultValue,
      ),
      booleanValue:
        (configVariable.value ?? configVariable.defaultValue) == "true",
    },
  });

  const onValueChange = (configVariable: AdminConfig, value: any) => {
    form.setFieldValue(`${configVariable.type}Value`, value);
    updateConfigVariable({ key: configVariable.key, value: value });
  };

  return (
    <Stack align="end">
      {configVariable.type == "string" &&
        (configVariable.obscured ? (
          <PasswordInput
            autoComplete="new-password"
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            {...form.getInputProps("stringValue")}
            onChange={(e) => onValueChange(configVariable, e.target.value)}
          />
        ) : isCustomCssConfig ? (
          <Textarea
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            autosize
            minRows={8}
            {...form.getInputProps("stringValue")}
            placeholder={configVariable.defaultValue}
            onChange={(e) => onValueChange(configVariable, e.target.value)}
          />
        ) : isThemePrimaryColorConfig ? (
          <Select
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            data={[
              "victoria",
              "blue",
              "teal",
              "green",
              "cyan",
              "indigo",
              "violet",
              "grape",
              "pink",
              "red",
              "orange",
              "yellow",
              "lime",
              "gray",
              "dark",
              "custom",
            ]}
            value={form.values.stringValue}
            placeholder={configVariable.defaultValue}
            onChange={(value) => onValueChange(configVariable, value ?? "")}
            searchable
            allowDeselect={false}
          />
        ) : isThemePrimaryColorOverrideConfig ? (
          shouldShowPrimaryColorOverride ? (
            <ColorInput
              style={{
                width: "100%",
              }}
              disabled={!configVariable.allowEdit}
              value={form.values.stringValue}
              placeholder="#464379"
              format="hex"
              swatches={[
                "#464379",
                "#228be6",
                "#12b886",
                "#40c057",
                "#15aabf",
                "#4c6ef5",
                "#7950f2",
                "#be4bdb",
                "#e64980",
                "#fa5252",
                "#fd7e14",
                "#fab005",
                "#82c91e",
              ]}
              onChange={(value) => onValueChange(configVariable, value ?? "")}
            />
          ) : null
        ) : isThemeRadiusConfig ? (
          <Select
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            data={["xs", "sm", "md", "lg", "xl"]}
            value={form.values.stringValue}
            placeholder={configVariable.defaultValue}
            onChange={(value) => onValueChange(configVariable, value ?? "")}
            allowDeselect={false}
          />
        ) : isThemeColorSchemeConfig ? (
          <SegmentedControl
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            data={[
              {
                label: (
                  <Center>
                    <TbMoon size={16} />
                    <Box ml={10}>
                      <FormattedMessage id="account.theme.dark" />
                    </Box>
                  </Center>
                ),
                value: "dark",
              },
              {
                label: (
                  <Center>
                    <TbSun size={16} />
                    <Box ml={10}>
                      <FormattedMessage id="account.theme.light" />
                    </Box>
                  </Center>
                ),
                value: "light",
              },
              {
                label: (
                  <Center>
                    <TbDeviceLaptop size={16} />
                    <Box ml={10}>
                      <FormattedMessage id="account.theme.system" />
                    </Box>
                  </Center>
                ),
                value: "system",
              },
            ]}
            value={form.values.stringValue}
            onChange={(value) => onValueChange(configVariable, value)}
          />
        ) : (
          <TextInput
            style={{
              width: "100%",
            }}
            disabled={!configVariable.allowEdit}
            {...form.getInputProps("stringValue")}
            placeholder={configVariable.defaultValue}
            onChange={(e) => onValueChange(configVariable, e.target.value)}
          />
        ))}

      {configVariable.type == "text" && (
        <Textarea
          style={{
            width: "100%",
          }}
          disabled={!configVariable.allowEdit}
          autosize
          minRows={isCustomCssConfig ? 8 : undefined}
          {...form.getInputProps("textValue")}
          placeholder={configVariable.defaultValue}
          onChange={(e) => onValueChange(configVariable, e.target.value)}
        />
      )}
      {configVariable.type == "number" && (
        <NumberInput
          {...form.getInputProps("numberValue")}
          disabled={!configVariable.allowEdit}
          placeholder={configVariable.defaultValue}
          onChange={(number) => onValueChange(configVariable, number)}
          w={201}
        />
      )}
      {configVariable.type == "filesize" && (
        <FileSizeInput
          {...form.getInputProps("numberValue")}
          disabled={!configVariable.allowEdit}
          value={parseInt(configVariable.value ?? configVariable.defaultValue)}
          onChange={(bytes) => onValueChange(configVariable, bytes)}
          w={201}
        />
      )}
      {configVariable.type == "boolean" && (
        <>
          <Switch
            disabled={!configVariable.allowEdit}
            {...form.getInputProps("booleanValue", { type: "checkbox" })}
            onChange={(e) => onValueChange(configVariable, e.target.checked)}
          />
        </>
      )}
      {configVariable.type == "timespan" && (
        <TimespanInput
          value={stringToTimespan(configVariable.value)}
          disabled={!configVariable.allowEdit}
          onChange={(timespan) =>
            onValueChange(configVariable, timespanToString(timespan))
          }
          w={201}
        />
      )}
    </Stack>
  );
};

export default AdminConfigInput;
