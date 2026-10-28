import {
  Button,
  Center,
  createStyles,
  Group,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { motion, useReducedMotion } from "framer-motion";
import { Dropzone as MantineDropzone } from "@mantine/dropzone";
import React, { ForwardedRef, useEffect, useRef, useState } from "react";
import { TbCloudUpload, TbFolder } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useClipboardPaste from "../../hooks/useClipboardPaste.hook";
import { FileUpload } from "../../types/File.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";
import { getFilesFromEvent } from "../../utils/file.util";
import { filterBlockedFiles } from "../../utils/blockedFiles.util";
import en from "../../i18n/translations/en-US";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    marginBottom: 30,
  },

  dropzone: {
    borderWidth: 1,
    padding: "42px 20px 54px",
    borderStyle: "dashed",
    borderColor: theme.colorScheme === "dark" ? "#65558d" : "#c6b7ed",
    background:
      theme.colorScheme === "dark"
        ? "linear-gradient(135deg, #252037, #171d2c)"
        : "linear-gradient(135deg, #faf8ff, #f0f5ff)",
    transition: "border-color 180ms ease, background 180ms ease",
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },

  control: {
    position: "absolute",
    bottom: -20,
  },

  mobileDescription: {
    display: "none",
    "@media (pointer: coarse)": {
      display: "inline",
    },
  },

  desktopDescription: {
    display: "inline",
    "@media (pointer: coarse)": {
      display: "none",
    },
  },
}));

const Dropzone = ({
  title,
  isUploading,
  maxShareSize,
  currentFilesSize = 0,
  onFilesChanged,
}: {
  title?: string;
  isUploading: boolean;
  maxShareSize: number;
  currentFilesSize?: number;
  onFilesChanged: (files: FileUpload[]) => void;
}) => {
  const { classes } = useStyles();

  const [isDragging, setIsDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  // All ingress routes share the same policy: picker, drop, folder and paste.
  const acceptFiles = (incomingFiles: FileUpload[]) => {
    if (isUploading) return;
    const files = filterBlockedFiles(incomingFiles, (name) => {
      toast.error(
        <FormattedMessage
          id="upload.dropzone.notify.blocked-file"
          defaultMessage={en["upload.dropzone.notify.blocked-file"]}
          values={{ name }}
        />,
      );
    }).map((file) => {
      file.uploadingProgress = 0;
      return file;
    });
    if (files.length) onFilesChanged(files);
  };

  useClipboardPaste({
    onFiles: acceptFiles,
    disabled: isUploading,
  });
  const openRef = useRef<() => void>();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === "dark";

  useEffect(() => {
    setIsMounted(true);
    setIsMac(/Macintosh|Mac OS X/.test(navigator.userAgent));
    setIsFirefox(/Firefox/.test(navigator.userAgent));
  }, []);

  const isFolderUploadSupported =
    isMounted &&
    typeof HTMLInputElement !== "undefined" &&
    "webkitdirectory" in HTMLInputElement.prototype;

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files;
    if (!filesList) return;
    const filesArray = Array.from(filesList) as FileUpload[];

    acceptFiles(filesArray);
    event.target.value = "";
  };

  function dropzoneMessageId(mobile: boolean) {
    if (mobile) {
      return !isFolderUploadSupported
        ? "upload.dropzone.description.desktop.no-folder"
        : "upload.dropzone.description.desktop";
    } else if (isFirefox) {
      return !isFolderUploadSupported
        ? "upload.dropzone.description.desktop.firefox.no-folder"
        : "upload.dropzone.description.desktop.firefox";
    }
    return !isFolderUploadSupported
      ? "upload.dropzone.description.desktop.no-folder"
      : "upload.dropzone.description.desktop";
  }

  return (
    <motion.div
      className={classes.wrapper}
      animate={{
        scale: isDragging && !reduceMotion ? 1.015 : 1,
        boxShadow: isDragging
          ? "0 0 32px rgba(139, 92, 246, 0.24)"
          : "0 0 0px rgba(139, 92, 246, 0)",
      }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      style={{ borderRadius: 16 }}
    >
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: "none" }}
        {...({
          webkitdirectory: "",
          directory: "",
        } as any)}
        multiple
        onChange={handleFolderSelect}
      />
      <MantineDropzone
        onReject={(e) => {
          setIsDragging(false);
          if (e[0]?.errors[0]) toast.error(e[0].errors[0].message);
        }}
        onDragEnter={() => !isUploading && setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        disabled={isUploading}
        openRef={openRef as ForwardedRef<() => void>}
        getFilesFromEvent={getFilesFromEvent}
        onDrop={(files: FileUpload[]) => {
          setIsDragging(false);
          acceptFiles(files);
        }}
        className={classes.dropzone}
        radius="md"
      >
        <div style={{ pointerEvents: "none" }}>
          <Group position="center">
            <TbCloudUpload size={50} />
          </Group>
          <Text align="center" weight={700} size="lg" mt="xl">
            {title || <FormattedMessage id="upload.dropzone.title" />}
          </Text>
          <Text align="center" size="sm" mt="xs" color="dimmed">
            <span className={classes.mobileDescription}>
              <FormattedMessage
                id={
                  isMounted
                    ? dropzoneMessageId(true)
                    : "upload.dropzone.description.mobile"
                }
                values={{
                  maxSize: byteToHumanSizeString(maxShareSize),
                }}
              />
            </span>
            <span className={classes.desktopDescription}>
              <FormattedMessage
                id={
                  isMounted
                    ? dropzoneMessageId(false)
                    : "upload.dropzone.description.desktop"
                }
                values={{
                  maxSize: byteToHumanSizeString(maxShareSize),
                  shortcut: isMac ? "⌘+V" : "Ctrl+V",
                }}
              />
            </span>
          </Text>
          <Text align="center" size="xs" mt="md" color="dimmed">
            <FormattedMessage
              id="upload.dropzone.quota-hint"
              defaultMessage={en["upload.dropzone.quota-hint"]}
            />
          </Text>
        </div>
      </MantineDropzone>
      <Center>
        {isFolderUploadSupported && (
          <Button
            className={classes.control}
            variant={dark ? "filled" : "light"}
            size="sm"
            radius="xl"
            disabled={isUploading}
            onClick={() => folderInputRef.current?.click()}
          >
            <TbFolder style={{ marginRight: 6 }} />
            <FormattedMessage
              id={
                currentFilesSize > 0
                  ? "upload.button.folder.append"
                  : "upload.button.folder"
              }
            />
          </Button>
        )}
      </Center>
    </motion.div>
  );
};
export default Dropzone;
