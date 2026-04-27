import { Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

type HoverTipProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
};

export const HoverTip = ({
  label,
  children,
  disabled,
}: HoverTipProps) => {
  return (
    <Tooltip
      position="bottom"
      events={{ hover: true, focus: false, touch: true }}
      label={label}
      disabled={disabled}
    >
      {children}
    </Tooltip>
  );
};
