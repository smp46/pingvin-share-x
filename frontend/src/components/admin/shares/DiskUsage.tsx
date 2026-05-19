import { Group, Progress, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import systemService, { SystemInfo } from "../../../services/system.service";
import { byteToHumanSizeString } from "../../../utils/fileSize.util";
import { FormattedMessage } from "react-intl";

const DiskUsage = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    systemService.getSystemInfo().then(setSystemInfo);
  }, []);

  if (!systemInfo) return null;

  const usedPercentage = (systemInfo.used / systemInfo.total) * 100;

  return (
    <Stack spacing={2} style={{ width: 200 }}>
      <Group position="apart">
        <Text size="xs" weight={500}>
          <FormattedMessage id="admin.shares.diskUsage" />
        </Text>
        <Text size="xs" color="dimmed">
          {byteToHumanSizeString(systemInfo.used)} /{" "}
          {byteToHumanSizeString(systemInfo.total)}
        </Text>
      </Group>
      <Progress
        value={usedPercentage}
        size="sm"
        radius="xl"
        color={
          usedPercentage > 90
            ? "red"
            : usedPercentage > 70
              ? "yellow"
              : undefined
        }
      />
    </Stack>
  );
};

export default DiskUsage;
