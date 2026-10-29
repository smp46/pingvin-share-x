import { ActionIcon, ActionIconProps } from "@mantine/core";
import { TbCheck, TbCopy } from "react-icons/tb";
import useCopyText from "../../hooks/useCopyToClipboard";

type CopyButtonIconProps = ActionIconProps & {
  content: string;
  toastMessage: string;
  callback?: () => void;
};

const CopyButtonIcon = ({ content, toastMessage, ...actionProps }: CopyButtonIconProps) => {
  const { checkState, copyContentToClipboard } = useCopyText({
    toastMessage: toastMessage,
  });

  return (
    <ActionIcon
      {...actionProps}
      onClick={() => copyContentToClipboard(content)}
    >
      {checkState ? <TbCheck /> : <TbCopy />}
    </ActionIcon>
  );
};

export default CopyButtonIcon;
