import { TbLink, TbRefresh, TbSettings, TbUsers } from "react-icons/tb";
import useTranslate from "./useTranslate.hook";
import { useEffect, useState } from "react";
import configService from "../services/config.service";

const useAdminNavLinks = () => {
  const t = useTranslate();

  const [links, setLinks] = useState([
    {
      title: t("admin.button.users"),
      icon: TbUsers,
      route: "/admin/users",
    },
    {
      title: t("admin.button.shares"),
      icon: TbLink,
      route: "/admin/shares",
    },
    {
      title: t("admin.button.config"),
      icon: TbSettings,
      route: "/admin/config/general",
    },
  ]);

  useEffect(() => {
    configService
      .isNewReleaseAvailable()
      .then((isNewReleaseAvailable) => {
        if (isNewReleaseAvailable) {
          setLinks([
            ...links,
            {
              title: t("admin.button.update"),
              icon: TbRefresh,
              route: "https://github.com/smp46/pingvin-share-x/releases/latest",
            },
          ]);
        }
      })
      .catch();
  }, []);

  return links;
};

export default useAdminNavLinks;
