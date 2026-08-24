import QRCodeGenerator from "qrcode";
import { useEffect, useState } from "react";
import CenterLoader from "../core/CenterLoader";

const QRCode = ({ link }: { link: string }) => {
  // Keeping the link the code was generated for, rather than the code alone,
  // is what makes "we do not have one for this link yet" something that can be
  // worked out while rendering. Clearing it from the effect meant the previous
  // link's code stayed on screen for a render before the loader replaced it,
  // and an answer arriving late for a link since navigated away from would
  // have been shown as if it were the current one.
  const [generated, setGenerated] = useState<{
    link: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    QRCodeGenerator.toDataURL(link, { margin: 2, width: 400 })
      .then((url) => setGenerated({ link, url }))
      .catch((_) => {
        // Ignore errors
      });
  }, [link]);

  const qrCodeUrl = generated?.link === link ? generated.url : undefined;

  if (!qrCodeUrl) {
    return (
      <div
        style={{
          width: 400,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CenterLoader />
      </div>
    );
  }

  return (
    <img alt="qrcode" src={qrCodeUrl} style={{ width: 400, height: 400 }} />
  );
};

export default QRCode;
