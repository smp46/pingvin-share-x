import { useClipboard } from "@mantine/hooks";
import toast from "../utils/toast.util";

interface UseCopyTextOptions {
  toastMessage: string;
  clipboardTimeout?: number;
}

const useCopyToClipboard = ({
  toastMessage,
  clipboardTimeout,
}: UseCopyTextOptions) => {
  const clipboard = useClipboard({ timeout: clipboardTimeout || 1500 });

  const copyContentToClipboard = (content: string) => {
    clipboard.copy(content);
    toast.success(toastMessage);
  };

  return {
    copyContentToClipboard,
    checkState: clipboard.copied,
  };
};

export default useCopyToClipboard;
