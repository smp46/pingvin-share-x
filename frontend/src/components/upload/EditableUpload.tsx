import { Button, Group } from "@mantine/core";
import { hideNotification } from "@mantine/notifications";
import { AxiosError } from "axios";
import { useRouter } from "next/router";
import pLimit from "p-limit";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import Dropzone from "../../components/upload/Dropzone";
import FileList from "../../components/upload/FileList";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import useUser from "../../hooks/user.hook";
import shareService from "../../services/share.service";
import { FileListItem, FileMetaData, FileUpload } from "../../types/File.type";
import toast from "../../utils/toast.util";
import {
  getNormalizedFileName,
  validateAndFilterFiles,
} from "../../utils/file.util";
import { byteToHumanSizeString } from "../../utils/fileSize.util";

const promiseLimit = pLimit(3);
let errorToastShown = false;

const EditableUpload = ({
  maxShareSize,
  shareId,
  files: savedFiles = [],
}: {
  maxShareSize?: number;
  isReverseShare?: boolean;
  shareId: string;
  files?: FileMetaData[];
}) => {
  const t = useTranslate();
  const router = useRouter();
  const config = useConfig();
  const { user } = useUser();

  const chunkSize = useRef(parseInt(config.get("share.chunkSize")));

  const [existingFiles, setExistingFiles] =
    useState<Array<FileMetaData & { deleted?: boolean }>>(savedFiles);
  const [uploadingFiles, setUploadingFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const existingFilesRef = useRef(existingFiles);
  existingFilesRef.current = existingFiles;
  const uploadingFilesRef = useRef(uploadingFiles);
  uploadingFilesRef.current = uploadingFiles;

  const existingAndUploadedFiles: FileListItem[] = useMemo(
    () => [...uploadingFiles, ...existingFiles],
    [existingFiles, uploadingFiles],
  );
  const dirty = useMemo(() => {
    return (
      existingFiles.some((file) => !!file.deleted) || !!uploadingFiles.length
    );
  }, [existingFiles, uploadingFiles]);

  const setFiles = (files: FileListItem[]) => {
    const _uploadFiles = files.filter(
      (file) => "uploadingProgress" in file,
    ) as FileUpload[];
    const _existingFiles = files.filter(
      (file) => !("uploadingProgress" in file),
    ) as FileMetaData[];

    uploadingFilesRef.current = _uploadFiles;
    existingFilesRef.current = _existingFiles;
    setUploadingFiles(_uploadFiles);
    setExistingFiles(_existingFiles);
  };

  maxShareSize ??= user?.shareSizeLimit
    ? parseInt(user.shareSizeLimit)
    : parseInt(config.get("share.maxSize"));

  const currentFilesSize = useMemo(() => {
    return (
      existingFiles
        .filter((file) => !file.deleted)
        .reduce((acc, file) => acc + parseInt(file.size), 0) +
      uploadingFiles.reduce((acc, file) => acc + file.size, 0)
    );
  }, [existingFiles, uploadingFiles]);

  const uploadFiles = async (files: FileUpload[]) => {
    const fileUploadPromises = files.map(async (file) =>
      // Limit the number of concurrent uploads to 3
      promiseLimit(async () => {
        if (!uploadingFilesRef.current.includes(file)) return;

        let fileId: string | undefined;

        const setFileProgress = (progress: number) => {
          file.uploadingProgress = progress;
          setUploadingFiles((files) => [...files]);
        };

        setFileProgress(1);

        let chunks = Math.ceil(file.size / chunkSize.current);

        // If the file is 0 bytes, we still need to upload 1 chunk
        if (chunks == 0) chunks++;

        for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
          const from = chunkIndex * chunkSize.current;
          const to = from + chunkSize.current;
          const blob = file.slice(from, to);
          try {
            await shareService
              .uploadFile(
                shareId,
                blob,
                {
                  id: fileId,
                  name: getNormalizedFileName(file),
                },
                chunkIndex,
                chunks,
              )
              .then((response) => {
                fileId = response.id;
              });

            setFileProgress(((chunkIndex + 1) / chunks) * 100);
          } catch (e) {
            if (
              e instanceof AxiosError &&
              e.response?.data.error == "unexpected_chunk_index"
            ) {
              // Retry with the expected chunk index
              chunkIndex = e.response!.data!.expectedChunkIndex - 1;
              continue;
            } else {
              setFileProgress(-1);
              // Retry after 5 seconds
              await new Promise((resolve) => setTimeout(resolve, 5000));
              chunkIndex = -1;

              continue;
            }
          }
        }
      }),
    );

    await Promise.all(fileUploadPromises);
  };

  const removeFiles = async () => {
    const removedFiles = existingFilesRef.current.filter(
      (file) => !!file.deleted,
    );

    if (removedFiles.length > 0) {
      await Promise.all(
        removedFiles.map(async (file) => {
          await shareService.removeFile(shareId, file.id);
        }),
      );

      setExistingFiles(
        existingFilesRef.current.filter((file) => !file.deleted),
      );
    }
  };

  const revertComplete = async () => {
    await shareService.revertComplete(shareId).then();
  };

  const completeShare = async () => {
    return await shareService.completeShare(shareId);
  };

  const save = async () => {
    setIsUploading(true);

    try {
      await revertComplete();
      await uploadFiles(uploadingFiles);

      const hasFailed = uploadingFiles.some(
        (file) => file.uploadingProgress == -1,
      );

      if (!hasFailed) {
        await removeFiles();
      }

      await completeShare();

      if (!hasFailed) {
        toast.success(t("share.edit.notify.save-success"));
        router.back();
      }
    } catch {
      toast.error(t("share.edit.notify.generic-error"));
    } finally {
      setIsUploading(false);
    }
  };

  const appendFiles = (appendingFiles: FileUpload[]) => {
    const combinedExisting = [
      ...existingFilesRef.current,
      ...uploadingFilesRef.current,
    ];
    const filtered = validateAndFilterFiles(
      appendingFiles,
      combinedExisting,
      maxShareSize!,
      (normalizedName) =>
        toast.error(
          t("upload.notify.duplicate-skipped", { name: normalizedName }),
        ),
      () =>
        toast.error(
          t("upload.dropzone.notify.file-too-big", {
            maxSize: byteToHumanSizeString(maxShareSize!),
          }),
        ),
    );
    if (filtered.length === 0) return;

    const nextUploadingFiles = [...filtered, ...uploadingFilesRef.current];
    uploadingFilesRef.current = nextUploadingFiles;
    setUploadingFiles(nextUploadingFiles);
  };

  useEffect(() => {
    // Check if there are any files that failed to upload
    const fileErrorCount = uploadingFiles.filter(
      (file) => file.uploadingProgress == -1,
    ).length;

    if (fileErrorCount > 0) {
      if (!errorToastShown) {
        toast.error(
          t("upload.notify.count-failed", { count: fileErrorCount }),
          {
            id: "upload-failed",
            withCloseButton: false,
            autoClose: false,
          },
        );
      }
      errorToastShown = true;
    } else {
      if (errorToastShown) {
        hideNotification("upload-failed");
      }
      errorToastShown = false;
    }
  }, [uploadingFiles]);

  return (
    <>
      <Group position="right" mb={20}>
        <Button loading={isUploading} disabled={!dirty} onClick={() => save()}>
          <FormattedMessage id="common.button.save" />
        </Button>
      </Group>
      <Dropzone
        title={t("share.edit.append-upload")}
        maxShareSize={maxShareSize}
        currentFilesSize={currentFilesSize}
        onFilesChanged={appendFiles}
        isUploading={isUploading}
      />
      {existingAndUploadedFiles.length > 0 && (
        <FileList
          files={existingAndUploadedFiles}
          setFiles={setFiles}
          uploading={isUploading}
        />
      )}
    </>
  );
};
export default EditableUpload;
