import { useClipboard } from "@mantine/hooks";
import toast from "../utils/toast.util";

interface UseCopyTextOptions {
  toastMessage: string;
  clipboardTimeout?: number;
}

const useCopyToClipboard = ({
  toastMessage,
  clipboardTimeout = 1500,
}: UseCopyTextOptions) => {
  const clipboard = useClipboard({ timeout: clipboardTimeout });

  const copyContentToClipboard = (content: string) => {
    if (clipboard.copied) return;
    clipboard.copy(content);
    toast.success(toastMessage);
  };

  return {
    copyContentToClipboard,
    checkState: clipboard.copied,
  };
};

export default useCopyToClipboard;
