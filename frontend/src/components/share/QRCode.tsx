import QRCodeGenerator from "qrcode";
import { useEffect, useState } from "react";
import CenterLoader from "../core/CenterLoader";

const QRCode = ({ link }: { link: string }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>();

  useEffect(() => {
    setQrCodeUrl(undefined);

    QRCodeGenerator.toDataURL(link, { margin: 2, width: 400 })
      .then(setQrCodeUrl)
      .catch((_) => {
        // Ignore errors
      });
  }, [link]);

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
