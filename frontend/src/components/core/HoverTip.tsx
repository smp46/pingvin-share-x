import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

type HoverTipProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  touch?: boolean;
};

export const HoverTip = ({
  label,
  children,
  disabled,
  touch = true,
}: HoverTipProps) => {
  return (
    <Tooltip
      position="bottom"
      withinPortal
      events={{ hover: true, focus: false, touch }}
      label={label}
      disabled={disabled}
    >
      {children}
    </Tooltip>
  );
};
