import {
  Center,
  Col,
  createStyles,
  Grid,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import useTranslate from "../../hooks/useTranslate.hook";
import useAdminNavLinks from "../../hooks/useAdminNavLinks.hook";

const useStyles = createStyles((theme) => ({
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    height: 90,
    "&:hover": {
      boxShadow: `${theme.shadows.sm} !important`,
      transform: "scale(1.01)",
    },
  },
}));

const Admin = () => {
  const { classes, theme } = useStyles();
  const t = useTranslate();
  const managementOptions = useAdminNavLinks();

  return (
    <>
      <Meta title={t("admin.title")} />
      <Title mb={30} order={3}>
        <FormattedMessage id="admin.title" />
      </Title>
      <Stack justify="space-between" style={{ height: "calc(100vh - 180px)" }}>
        <Paper withBorder p={40}>
          <Grid>
            {managementOptions.map((item) => {
              return (
                <Col xs={6} key={item.route}>
                  <Paper
                    withBorder
                    component={Link}
                    href={item.route}
                    key={item.title}
                    className={classes.item}
                  >
                    <item.icon
                      color={
                        theme.colors[theme.primaryColor][
                          theme.colorScheme === "dark" ? 3 : 7
                        ]
                      }
                      size={35}
                    />
                    <Text mt={7}>{item.title}</Text>
                  </Paper>
                </Col>
              );
            })}
          </Grid>
        </Paper>

        <Center>
          <Text size="xs" color="dimmed">
            <FormattedMessage id="admin.version" /> {process.env.VERSION}
          </Text>
        </Center>
      </Stack>
    </>
  );
};

export default Admin;
