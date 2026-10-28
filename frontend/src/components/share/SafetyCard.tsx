import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
import { TbCheck, TbShieldCheck } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import { ShareSafety } from "../../types/share.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import ExpiryRing from "./ExpiryRing";

const SafetyCard = ({
  safety,
  files,
  createdAt,
}: {
  safety: ShareSafety;
  files: { name: string; size: string }[];
  createdAt?: string;
}) => {
  const t = useTranslate();
  const checks = [
    t("share.safety.blocked-list", { count: safety.blockedExtensions.length }),
    t("share.safety.attachment"),
    t("share.safety.unguessable"),
  ];
  return (
    <Box
      component="section"
      mb="xl"
      p="lg"
      aria-label={t("share.safety.title")}
      sx={(theme) => ({
        border: `1px solid ${theme.colorScheme === "dark" ? "#304149" : "#cbdedb"}`,
        borderRadius: 18,
        background:
          theme.colorScheme === "dark"
            ? "linear-gradient(120deg, #10242b, #19212b)"
            : "linear-gradient(120deg, #effaf7, #f4f6fb)",
      })}
    >
      <Stack spacing="lg">
        <Group position="apart">
          <div>
            <Group spacing="xs">
              <TbShieldCheck aria-hidden="true" />
              <Title order={4}>{t("share.safety.title")}</Title>
            </Group>
            <Text size="sm" mt={5}>
              {t("share.safety.shared-by", {
                sharedBy:
                  safety.sharedBy?.trim() || t("share.safety.anonymous"),
              })}
            </Text>
          </div>
          <Badge variant="light" color={safety.hasPassword ? "teal" : "gray"}>
            {t(
              safety.hasPassword
                ? "share.safety.password"
                : "share.safety.no-password",
            )}
          </Badge>
        </Group>
        <div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {files.map((file, index) => {
              const name = file.name.split(/[\\/]/).pop() || file.name;
              const dot = name.lastIndexOf(".");
              const extension =
                dot > 0
                  ? name
                      .slice(dot + 1)
                      .trim()
                      .toUpperCase()
                  : "";
              const bytes = Number(file.size);
              return (
                <li
                  key={`${file.name}-${index}`}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: "4px 16px",
                  }}
                >
                  <Text
                    size="sm"
                    weight={500}
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {file.name}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {byteToHumanSizeString(
                      Number.isFinite(bytes) && bytes >= 0 ? bytes : 0,
                    )}{" "}
                    · {extension || t("share.safety.unknown-type")}
                  </Text>
                </li>
              );
            })}
          </ul>
          <Text size="xs" color="dimmed" mt="xs">
            {t("share.safety.extension-note")}
          </Text>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {checks.map((check) => (
            <li
              key={check}
              style={{ display: "flex", alignItems: "baseline", gap: 8 }}
            >
              <TbCheck
                aria-hidden="true"
                style={{ flexShrink: 0, color: "#2dba9b" }}
              />
              <Text size="sm">{check}</Text>
            </li>
          ))}
        </ul>
        <Group position="apart">
          <Text size="sm" weight={500}>
            {safety.maxViews === null
              ? t("share.safety.unlimited-views")
              : t("share.safety.views", {
                  views: safety.views,
                  maxViews: safety.maxViews,
                })}
          </Text>
          <ExpiryRing expiresAt={safety.expiresAt} createdAt={createdAt} />
        </Group>
      </Stack>
    </Box>
  );
};
export default SafetyCard;
