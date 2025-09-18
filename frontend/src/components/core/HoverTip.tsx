import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

type HoverTipProps = {
  width?: number;
  label: string;
  children: ReactNode;
  disabled?: boolean;
};

export const HoverTip = ({
  width,
  label,
  children,
  disabled,
}: HoverTipProps) => {
  return (
    <Tooltip
      position="bottom"
      multiline
      events={{ hover: true, focus: false, touch: true }}
      width={width}
      label={label}
      disabled={disabled}
    >
      {children}
    </Tooltip>
  );
};
