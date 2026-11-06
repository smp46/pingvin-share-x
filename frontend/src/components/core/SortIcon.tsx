import { Group, UnstyledButton, createStyles } from "@mantine/core";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { TbChevronDown, TbChevronUp, TbSelector } from "react-icons/tb";

export type TableSort = {
  property?: string;
  direction: "asc" | "desc";
};

const useStyles = createStyles((theme) => ({
  button: {
    font: "inherit",
    color: "inherit",
    whiteSpace: "nowrap",
    borderRadius: theme.radius.sm,
    padding: "6px 8px",
    margin: "-6px -8px",
  },
  icon: {
    flexShrink: 0,
  },
  inactiveIcon: {
    flexShrink: 0,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
  },
}));

const SortableHeader = ({
  sort,
  setSort,
  property,
  children,
}: {
  sort: TableSort;
  setSort: Dispatch<SetStateAction<TableSort>>;
  property: string;
  children: ReactNode;
}) => {
  const { classes } = useStyles();
  const active = sort.property === property;

  const onClick = () =>
    setSort(
      active
        ? { property, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { property, direction: "desc" },
    );

  const Icon = !active
    ? TbSelector
    : sort.direction === "asc"
      ? TbChevronUp
      : TbChevronDown;

  return (
    <UnstyledButton className={classes.button} onClick={onClick}>
      <Group spacing={4} noWrap>
        <span>{children}</span>
        <Icon
          size={14}
          aria-hidden
          className={active ? classes.icon : classes.inactiveIcon}
        />
      </Group>
    </UnstyledButton>
  );
};

export default SortableHeader;
