import {
  Box,
  Button,
  Center,
  Group,
  Space,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import CenterLoader from "../../components/core/CenterLoader";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import shareService from "../../services/share.service";

const ReceivedShares = () => {
  const t = useTranslate();
  const router = useRouter();
  const config = useConfig();
  const [receivedShares, setReceivedShares] = useState<any[]>();

  useEffect(() => {
    if (!config.get("share.enableUserRecipients")) {
      router.replace("/");
      return;
    }
    shareService.getReceivedShares().then((data) => setReceivedShares(data));
  }, []);

  if (!receivedShares) return <CenterLoader />;

  return (
    <>
      <Meta title={t("account.received-shares.title")} />
      <Title mb={30} order={3}>
        <FormattedMessage id="account.received-shares.title" />
      </Title>
      {receivedShares.length === 0 ? (
        <Center style={{ height: "70vh" }}>
          <Stack align="center" spacing={10}>
            <Title order={3}>
              <FormattedMessage id="account.received-shares.title.empty" />
            </Title>
            <Text>
              <FormattedMessage id="account.received-shares.description.empty" />
            </Text>
            <Space h={5} />
          </Stack>
        </Center>
      ) : (
        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="account.shares.table.id" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.name" />
                </th>
                <th>
                  <FormattedMessage id="account.received-shares.table.from" />
                </th>
                <th>
                  <FormattedMessage id="account.shares.table.expiresAt" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receivedShares.map(({ share }) => (
                <tr key={share.id}>
                  <td>{share.id}</td>
                  <td>{share.name}</td>
                  <td>{share.creator?.username ?? "—"}</td>
                  <td>
                    {moment(share.expiration).unix() === 0 ? (
                      <FormattedMessage id="account.shares.table.expiry-never" />
                    ) : (
                      moment(share.expiration).format("LLL")
                    )}
                  </td>
                  <td>
                    <Group position="right">
                      <Button
                        component={Link}
                        href={`/share/${share.id}`}
                        variant="light"
                        size="xs"
                        color="victoria"
                      >
                        <FormattedMessage id="account.received-shares.button.open" />
                      </Button>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      )}
    </>
  );
};

export default ReceivedShares;