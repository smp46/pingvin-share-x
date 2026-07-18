import { Button, Center, createStyles, Group, Text, Menu } from "@mantine/core";
import { Dropzone as MantineDropzone } from "@mantine/dropzone";
import React, { ForwardedRef, useRef } from "react";
import { TbCloudUpload, TbUpload, TbFolder } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { FileUpload } from "../../types/File.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    marginBottom: 30,
  },

  dropzone: {
    borderWidth: 1,
    paddingBottom: 50,
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
}));

const traverseDirectory = async (entry: any, path = ""): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => {
        const relativePath = path ? `${path}/${file.name}` : file.name;
        Object.defineProperty(file, "webkitRelativePath", {
          value: relativePath,
          writable: true,
          configurable: true,
        });
        resolve([file]);
      });
    });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readEntries = (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(
          (entries: any[]) => resolve(entries),
          () => resolve([]),
        );
      });
    };

    let entries: any[] = [];
    let readBatch = await readEntries();
    while (readBatch.length > 0) {
      entries = entries.concat(readBatch);
      readBatch = await readEntries();
    }

    const promises = entries.map((e) =>
      traverseDirectory(e, path ? `${path}/${entry.name}` : entry.name)
    );
    const results = await Promise.all(promises);
    return results.flat();
  }
  return [];
};

const getFilesFromEvent = async (event: any): Promise<any[]> => {
  const items = event.dataTransfer ? event.dataTransfer.items : event.target.files;
  if (!items) return [];

  const filePromises: Promise<File[]>[] = [];

  if (event.dataTransfer) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          filePromises.push(traverseDirectory(entry));
        } else {
          const file = item.getAsFile();
          if (file) {
            filePromises.push(Promise.resolve([file]));
          }
        }
      }
    }
    const fileArrays = await Promise.all(filePromises);
    return fileArrays.flat();
  } else {
    return Array.from(items) as File[];
  }
};

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
  const t = useTranslate();
  const { classes } = useStyles();
  const openRef = useRef<() => void>();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isFolderUploadSupported =
    typeof window !== "undefined" &&
    typeof HTMLInputElement !== "undefined" &&
    "webkitdirectory" in HTMLInputElement.prototype;

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files;
    if (!filesList) return;
    const filesArray = Array.from(filesList) as FileUpload[];

    const files = filesArray.map((newFile) => {
      newFile.uploadingProgress = 0;
      return newFile;
    });

    const fileSizeSum = files.reduce((n, { size }) => n + size, 0);

    if (fileSizeSum + currentFilesSize > maxShareSize) {
      toast.error(
        t("upload.dropzone.notify.file-too-big", {
          maxSize: byteToHumanSizeString(maxShareSize),
        }),
      );
    } else {
      onFilesChanged(files);
    }

    event.target.value = "";
  };

  return (
    <div className={classes.wrapper}>
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
          toast.error(e[0].errors[0].message);
        }}
        disabled={isUploading}
        openRef={openRef as ForwardedRef<() => void>}
        getFilesFromEvent={getFilesFromEvent}
        onDrop={(files: FileUpload[]) => {
          const fileSizeSum = files.reduce((n, { size }) => n + size, 0);

          if (fileSizeSum + currentFilesSize > maxShareSize) {
            toast.error(
              t("upload.dropzone.notify.file-too-big", {
                maxSize: byteToHumanSizeString(maxShareSize),
              }),
            );
          } else {
            files = files.map((newFile) => {
              newFile.uploadingProgress = 0;
              return newFile;
            });
            onFilesChanged(files);
          }
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
            <FormattedMessage
              id="upload.dropzone.description"
              values={{ maxSize: byteToHumanSizeString(maxShareSize) }}
            />
          </Text>
        </div>
      </MantineDropzone>
      <Center>
        {isFolderUploadSupported && (
          <Button
            className={classes.control}
            variant="light"
            size="sm"
            radius="xl"
            disabled={isUploading}
            onClick={() => folderInputRef.current?.click()}
          >
            <TbFolder style={{ marginRight: 6 }} />
            <FormattedMessage
              id={currentFilesSize > 0 ? "upload.button.folder.append" : "upload.button.folder"}
            />
          </Button>
        )}
      </Center>
    </div>
  );
};
export default Dropzone;
