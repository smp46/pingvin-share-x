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

  return (
    <img
      src={logoSrc}
      alt="RV Files"
      height={height}
      width={width}
      onError={() => {
        if (logoSrc === darkLogoSrc) setLogoSrc(defaultLogoSrc);
        else if (logoSrc === defaultLogoSrc) setLogoSrc(fallbackLogoSrc);
      }}
    />
  );
};

export default Logo;
