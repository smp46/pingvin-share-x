import { ActionIcon, Avatar, Menu } from "@mantine/core";
import Link from "next/link";
import { TbDoorExit, TbSettings, TbUser, TbUserCircle } from "react-icons/tb";
import useUser from "../../hooks/user.hook";
import authService from "../../services/auth.service";
import { FormattedMessage, useIntl } from "react-intl";
import { HoverTip } from "../../components/core/HoverTip";
import useTranslate from "../../hooks/useTranslate.hook";
import { useState } from "react";

const ActionAvatar = () => {
  const { user } = useUser();
  const t = useTranslate();
  const [menuOpened, setMenuOpened] = useState(false);

  return (
    <Menu position="bottom-start" withinPortal onChange={setMenuOpened}>
      <Menu.Target>
        <ActionIcon>
          <HoverTip label={t("common.button.profile")} disabled={menuOpened}>
            <Avatar size={28} />
          </HoverTip>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} href="/account" icon={<TbUser size={14} />}>
          <FormattedMessage id="navbar.avatar.account" />
        </Menu.Item>
        {user!.isAdmin && (
          <Menu.Item
            component={Link}
            href="/admin"
            icon={<TbSettings size={14} />}
          >
            <FormattedMessage id="navbar.avatar.admin" />
          </Menu.Item>
        )}

        <Menu.Item
          onClick={async () => {
            await authService.signOut();
          }}
          icon={<TbDoorExit size={14} />}
        >
          <FormattedMessage id="navbar.avatar.signout" />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ActionAvatar;
