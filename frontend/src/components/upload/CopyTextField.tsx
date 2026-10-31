import { ActionIcon, TextInput, Tooltip } from "@mantine/core";
import { useState } from "react";
import { IoOpenOutline } from "react-icons/io5";
import { TbCheck, TbCopy, TbQrcode } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import useCopyText from "../../hooks/useCopyToClipboard";

function CopyTextField(props: { link: string; toggleQR?: () => void }) {
  const t = useTranslate();
  const { checkState, copyContentToClipboard } = useCopyText({
    toastMessage: t("common.notify.copied-link"),
  });
  const [textClicked, setTextClicked] = useState(false);

  const copyLink = () => {
    copyContentToClipboard(props.link);
  };

  return (
    <TextInput
      readOnly
      label={t("common.text.link")}
      variant="filled"
      value={props.link}
      onClick={() => {
        if (!textClicked) {
          copyLink();
          setTextClicked(true);
        }
      }}
      rightSectionWidth={90}
      rightSection={
        <div style={{ display: "flex", alignItems: "center" }}>
          <Tooltip
            label={t("common.text.navigate-to-link")}
            position="top"
            offset={-2}
            openDelay={200}
          >
            <a href={props.link}>
              <ActionIcon>
                <IoOpenOutline />
              </ActionIcon>
            </a>
          </Tooltip>

          {window.isSecureContext && (
            <>
              <Tooltip
                label={t("common.button.clickToCopy")}
                position="top"
                offset={-2}
                openDelay={200}
              >
                <ActionIcon onClick={copyLink}>
                  {checkState ? <TbCheck /> : <TbCopy />}
                </ActionIcon>
              </Tooltip>

              <Tooltip
                label={t("common.button.showQRCode")}
                position="top"
                offset={-2}
                openDelay={200}
              >
                <ActionIcon onClick={props.toggleQR}>
                  <TbQrcode />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </div>
      }
    />
  );
}

export default CopyTextField;
