import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useState } from "react";

const defaultLogoSrc = "/img/logo.png";
const darkLogoSrc = "/img/logo-dark.png";
const fallbackLogoSrc = "/img/logo.svg";

const Logo = ({ height, width }: { height: number; width: number }) => {
  const { colorScheme } = useMantineColorScheme();
  const preferredLogoSrc =
    colorScheme === "dark" ? darkLogoSrc : defaultLogoSrc;
  const [logoSrc, setLogoSrc] = useState(preferredLogoSrc);

  useEffect(() => {
    setLogoSrc(preferredLogoSrc);
  }, [preferredLogoSrc]);

  // Round the backing only; rounding the image would clip source/custom corners.
  return (
    <span
      style={{
        display: "inline-flex",
        height,
        width,
        backgroundColor: "#fff",
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "visible",
      }}
    >
      <img
        src={logoSrc}
        alt="RV Files"
        height={height}
        width={width}
        style={{ objectFit: "contain", flexShrink: 0 }}
        onError={() => {
          if (logoSrc === darkLogoSrc) setLogoSrc(defaultLogoSrc);
          else if (logoSrc === defaultLogoSrc) setLogoSrc(fallbackLogoSrc);
        }}
      />
    </span>
  );
};

export default Logo;
