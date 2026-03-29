import { useState } from "react";
import { Button, Group, Box, useMantineTheme } from "@mantine/core";
import dynamic from "next/dynamic";
import { commands } from "@uiw/react-md-editor";
import { FormattedMessage } from "react-intl";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false },
);

const TextEditor = ({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState<string | undefined>(initialText);
  const { colorScheme } = useMantineTheme();

  return (
    <Box>
      <Box
        data-color-mode={colorScheme}
        // Custom styles to make the toolbar usable on mobile
        sx={(theme) => ({
          ".w-md-editor-toolbar": {
            flexWrap: "wrap",
            height: "auto",
            minHeight: "auto",
            padding: "8px",
          },
          ".w-md-editor-toolbar li > button": {
            [theme.fn.smallerThan("sm")]: {
              padding: "8px",
              minWidth: "36px",
              minHeight: "36px",
            },
          },
          ".w-md-editor-toolbar li > button svg": {
            [theme.fn.smallerThan("sm")]: {
              width: "18px",
              height: "18px",
            },
          },
        })}
      >
        <MDEditor
          value={text}
          onChange={setText}
          height={400}
          preview="live"
          extraCommands={[
            commands.codeEdit,
            commands.codeLive,
            commands.codePreview,
          ]}
        />
      </Box>
      <Group position="right" mt="md">
        <Button variant="default" onClick={onCancel}>
          <FormattedMessage id="common.button.cancel" />
        </Button>
        <Button onClick={() => onSave(text || "")}>
          <FormattedMessage id="common.button.save" />
        </Button>
      </Group>
    </Box>
  );
};

export default TextEditor;
