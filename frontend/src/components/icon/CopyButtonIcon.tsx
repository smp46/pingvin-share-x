import { ActionIcon, ActionIconProps } from "@mantine/core";
import { TbCheck, TbCopy } from "react-icons/tb";
import useCopyText from "../../hooks/useCopyToClipboard";

type CopyButtonIconProps = ActionIconProps & {
  content: string;
  toastMessage: string;
  callback?: () => void;
};

const CopyButtonIcon = (props: CopyButtonIconProps) => {
  const { checkState, copyContentToClipboard } = useCopyText({
    toastMessage: props.toastMessage,
  });

  return (
    <ActionIcon
      {...props}
      onClick={() => copyContentToClipboard(props.content)}
    >
      {checkState ? <TbCheck /> : <TbCopy />}
    </ActionIcon>
  );
};

export default CopyButtonIcon;
