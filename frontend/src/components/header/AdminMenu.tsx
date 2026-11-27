import { ActionIcon, Menu, Text } from "@mantine/core";
import { HoverTip } from "../core/HoverTip";
import useTranslate from "../../hooks/useTranslate.hook";
import { TbSettings } from "react-icons/tb";
import { useState } from "react";
import Link from "next/link";
import useAdminNavLinks from "../../hooks/useAdminNavLinks.hook";

export default function AdminMenu() {
  const [menuOpened, setMenuOpened] = useState(false);
  const t = useTranslate();
  const adminLinks = useAdminNavLinks();

  return (
    <Menu position="bottom-start" withinPortal onChange={setMenuOpened}>
      <Menu.Target>
        <ActionIcon>
          <HoverTip label={t("navbar.avatar.admin")} disabled={menuOpened}>
            <div>
              <TbSettings size={19} />
            </div>
          </HoverTip>
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {adminLinks.map((adminLink) => {
          return (
            <Menu.Item
              key={adminLink.title}
              component={Link}
              href={adminLink.route}
              icon={<adminLink.icon size={14} />}
            >
              <Text>{adminLink.title}</Text>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
