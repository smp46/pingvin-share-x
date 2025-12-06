import { Button, Container, Group, Title } from "@mantine/core";
import { createStyles } from "@mantine/emotion";
import Link from "next/link";
import { FormattedMessage } from "react-intl";
import Meta from "../components/Meta";

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: 80,
    paddingBottom: 80,
  },

  label: {
    textAlign: "center",
    fontWeight: 900,
    fontSize: 220,
    lineHeight: 1,
    marginBottom: 20,
    color: theme.colors.gray[2],

    "@media (max-width: 48em)": {
      fontSize: 120,
    },
  },
}));

const ErrorNotFound = () => {
  const { classes } = useStyles();

  return (
    <>
      <Meta title="Not found" />
      <Container className={classes.root}>
        <div className={classes.label}>404</div>
        <Title ta="center" order={3}>
          <FormattedMessage id="404.description" />
        </Title>
        <Group justify="center" mt={50}>
          <Button component={Link} href="/" variant="light">
            <FormattedMessage id="404.button.home" />
          </Button>
        </Group>
      </Container>
    </>
  );
};
export default ErrorNotFound;
