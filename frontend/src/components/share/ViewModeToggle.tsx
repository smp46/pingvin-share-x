import { ActionIcon, useMantineTheme } from "@mantine/core";
import { TbLayoutGrid, TbList } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import { HoverTip } from "../core/HoverTip";
import { ICON_SIZE } from "../core/FileTree";

export type ShareViewMode = "list" | "gallery";

const ViewModeToggle = ({
  viewMode,
  onToggle,
}: {
  viewMode: ShareViewMode;
  onToggle: () => void;
}) => {
  const theme = useMantineTheme();
  const t = useTranslate();

  const label = t(
    viewMode === "list"
      ? "common.button.gallery-view"
      : "common.button.list-view",
  );

  return (
    <HoverTip label={label} touch={false}>
      <ActionIcon
        color={theme.primaryColor}
        variant="subtle"
        size={ICON_SIZE}
        aria-label={label}
        onClick={onToggle}
      >
        {viewMode === "list" ? <TbLayoutGrid /> : <TbList />}
      </ActionIcon>
    </HoverTip>
  );
};

export default ViewModeToggle;
