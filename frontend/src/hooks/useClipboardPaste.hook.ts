import { useEffect, useRef } from "react";
import { useModals } from "@mantine/modals";
import { FileUpload } from "../types/File.type";
import { getFilesFromEvent } from "../utils/file.util";

interface UseClipboardPasteOptions {
  onFiles: (files: FileUpload[]) => void;
  disabled?: boolean;
}

const useClipboardPaste = ({
  onFiles,
  disabled = false,
}: UseClipboardPasteOptions) => {
  const modals = useModals();
  const isModalOpen = modals.modals.length > 0;

  const stateRef = useRef({ onFiles, disabled, isModalOpen });
  stateRef.current = { onFiles, disabled, isModalOpen };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (stateRef.current.disabled || stateRef.current.isModalOpen) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      let filesToUpload: FileUpload[] = [];
      const hasFiles = Array.from(clipboardData.items ?? []).some(
        (item) => item.kind === "file",
      );

      if (hasFiles) {
        e.preventDefault();

        const pastedFiles = (await getFilesFromEvent(e)) as FileUpload[];
        if (stateRef.current.disabled || stateRef.current.isModalOpen) return;

        filesToUpload = pastedFiles.map((file) => {
          // Screenshots are all named image.png, so give each a unique name.
          const isScreenshot =
            file.name === "image.png" && !file.webkitRelativePath;
          const readyFile = (
            isScreenshot
              ? new File([file], `image_${Date.now()}.png`, {
                  type: file.type,
                  lastModified: file.lastModified,
                })
              : file
          ) as FileUpload;

          readyFile.uploadingProgress = 0;
          return readyFile;
        });
      } else {
        const pastedText = clipboardData.getData("text/plain");
        if (!pastedText) return;

        const safeName = pastedText
          .substring(0, 50)
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim();
        const fileName = `${safeName || "clipboard_paste"}.txt`;

        const fileUpload = new File([pastedText], fileName, {
          type: "text/plain",
        }) as FileUpload;
        fileUpload.uploadingProgress = 0;
        filesToUpload.push(fileUpload);
      }

      if (filesToUpload.length > 0) {
        e.preventDefault();
        stateRef.current.onFiles(filesToUpload);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);
};

export default useClipboardPaste;
