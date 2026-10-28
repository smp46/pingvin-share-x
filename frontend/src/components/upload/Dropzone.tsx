import {
  Button,
  Center,
  createStyles,
  Group,
  Text,
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
    borderWidth: 2,
    padding: "40px 20px 56px",
    borderStyle: "dashed",
    borderColor: theme.colorScheme === "dark" ? theme.colors.dark[2] : theme.black,
    backgroundColor: "var(--rv-surface)",
    transition: "border-color 160ms ease, background-color 160ms ease",
    "&[data-accept], &:hover": {
      borderColor: theme.colors.victoria[5],
      backgroundColor:
        theme.colorScheme === "dark"
          ? "rgba(255,106,51,0.08)"
          : "rgba(255,90,31,0.06)",
    },
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
        scale: isDragging && !reduceMotion ? 1.01 : 1,
      }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
    >
      {isDragging && (
        <div className="rv-gate" aria-hidden="true">
          {!reduceMotion && (
            <motion.div
              className="rv-gate__beam"
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
            />
          )}
        </div>
      )}
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
          <div className="rv-label" style={{ textAlign: "center" }}>
            {isDragging ? "Release to inspect" : "Drop at the checkpoint"}
          </div>
          <Group position="center" mt="md">
            <TbCloudUpload size={40} strokeWidth={1.6} />
          </Group>
          <Text
            align="center"
            weight={700}
            mt="sm"
            className="rv-display"
            style={{ fontSize: 24 }}
          >
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
          <div className="rv-drop-limits" aria-label="Upload limits">
            <span>MAX {byteToHumanSizeString(maxShareSize).toUpperCase()} / SHARE</span>
            <span>50 MB / ACCOUNT</span>
            <span>NO .EXE .HTML .SVG .JS .SH …</span>
          </div>
          <span className="sr-only">
            <FormattedMessage
              id="upload.dropzone.quota-hint"
              defaultMessage={en["upload.dropzone.quota-hint"]}
            />
          </span>
        </div>
      </MantineDropzone>
      <Center>
        {isFolderUploadSupported && (
          <Button
            className={classes.control}
            variant="default"
            size="sm"
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
