import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useState } from "react";

const defaultLogoSrc = "/img/logo.png";
const darkLogoSrc = "/img/logo-dark.png";

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
      alt="logo"
      height={height}
      width={width}
      onError={() => {
        if (logoSrc !== defaultLogoSrc) setLogoSrc(defaultLogoSrc);
      }}
    />
  );
};
export default Logo;
