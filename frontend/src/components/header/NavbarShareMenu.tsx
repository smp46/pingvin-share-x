import { ActionIcon, Menu } from "@mantine/core";
import Link from "next/link";
import { TbArrowLoopLeft, TbLink } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import { HoverTip } from "../../components/core/HoverTip";
import useTranslate from "../../hooks/useTranslate.hook";
import { useState } from "react";

const NavbarShareMneu = () => {
  const t = useTranslate();
  const [menuOpened, setMenuOpened] = useState(false);

  return (
    <Menu position="bottom-start" withinPortal onChange={setMenuOpened}>
      <Menu.Target>
        <ActionIcon>
          <HoverTip label={t("common.button.shares")} disabled={menuOpened}>
            <div>
              <TbLink />
            </div>
          </HoverTip>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} href="/account/shares" icon={<TbLink />}>
          <FormattedMessage id="navbar.links.shares" />
        </Menu.Item>
        <Menu.Item
          component={Link}
          href="/account/reverseShares"
          icon={<TbArrowLoopLeft />}
        >
          <FormattedMessage id="navbar.links.reverse" />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default NavbarShareMneu;
