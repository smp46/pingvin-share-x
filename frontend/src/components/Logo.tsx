import { useMantineColorScheme } from "@mantine/core";
import { useState } from "react";

const defaultLogoSrc = "/img/logo.png";
const darkLogoSrc = "/img/logo-dark.png";

// Whether the preferred logo failed to load is per source: a missing dark logo
// says nothing about the light one. Keying on the source resets that as the
// colour scheme changes, so switching themes gives the preferred logo another
// try without an effect putting the state back in step afterwards.
const LogoImage = ({
  src,
  height,
  width,
}: {
  src: string;
  height: number;
  width: number;
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? defaultLogoSrc : src}
      alt="logo"
      height={height}
      width={width}
      onError={() => setFailed(true)}
    />
  );
};

const Logo = ({ height, width }: { height: number; width: number }) => {
  const { colorScheme } = useMantineColorScheme();
  const preferredLogoSrc =
    colorScheme === "dark" ? darkLogoSrc : defaultLogoSrc;

  return (
    <LogoImage
      key={preferredLogoSrc}
      src={preferredLogoSrc}
      height={height}
      width={width}
    />
  );
};
export default Logo;
