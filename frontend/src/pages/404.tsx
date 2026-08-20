import { Button, Container, createStyles, Group, Title } from "@mantine/core";
import Link from "next/link";
import { FormattedMessage } from "react-intl";
import ErrorTetris from "../components/error/ErrorTetris";
import Meta from "../components/Meta";

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: 40,
    paddingBottom: 60,
  },

  label: {
    textAlign: "center",
    fontWeight: 900,
    fontSize: 110,
    lineHeight: 1,
    marginBottom: 4,
    color: theme.colors.gray[2],

    [theme.fn.smallerThan("sm")]: {
      fontSize: 72,
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
        <Title align="center" order={3} mb="xl">
          <FormattedMessage id="404.description" />
        </Title>

        <ErrorTetris digits={["4", "0", "4"]} />

        <Group position="center" mt="xl">
          <Button component={Link} href="/" variant="light">
            <FormattedMessage id="404.button.home" />
          </Button>
        </Group>
      </Container>
    </>
  );
};
export default ErrorNotFound;
