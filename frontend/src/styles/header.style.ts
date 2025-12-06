import { createStyles } from "@mantine/emotion";

export default createStyles((theme) => ({
  root: {
    position: "relative",
    zIndex: 1,
  },

  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 0,
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopWidth: 0,
    overflow: "hidden",

    "@media (min-width: 48em)": {
      display: "none",
    },
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
  },

  links: {
    "@media (max-width: 48em)": {
      display: "none",
    },
  },

  burger: {
    "@media (min-width: 48em)": {
      display: "none",
    },
  },

  link: {
    display: "block",
    lineHeight: 1,
    padding: "8px 12px",
    borderRadius: theme.radius.sm,
    textDecoration: "none",
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    // Use CSS variables for light/dark mode
    "@media (prefers-color-scheme: light)": {
      color: theme.colors.gray[7],
      "&:hover": {
        backgroundColor: theme.colors.gray[0],
      },
    },

    "@media (prefers-color-scheme: dark)": {
      color: theme.colors.dark[0],
      "&:hover": {
        backgroundColor: theme.colors.dark[6],
      },
    },

    "[data-mantine-color-scheme='light'] &": {
      color: theme.colors.gray[7],
      "&:hover": {
        backgroundColor: theme.colors.gray[0],
      },
    },

    "[data-mantine-color-scheme='dark'] &": {
      color: theme.colors.dark[0],
      "&:hover": {
        backgroundColor: theme.colors.dark[6],
      },
    },

    "@media (max-width: 48em)": {
      borderRadius: 0,
      padding: theme.spacing.md,
    },
  },

  linkActive: {
    "[data-mantine-color-scheme='light'] &, [data-mantine-color-scheme='light'] &:hover":
      {
        backgroundColor: theme.colors[theme.primaryColor][0],
        color: theme.colors[theme.primaryColor][7],
      },

    "[data-mantine-color-scheme='dark'] &, [data-mantine-color-scheme='dark'] &:hover":
      {
        backgroundColor: theme.colors[theme.primaryColor][9],
        color: theme.colors[theme.primaryColor][2],
      },
  },
}));
