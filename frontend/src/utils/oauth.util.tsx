import {
  SiDiscord,
  SiGithub,
  SiGoogle,
  SiOpenid,
} from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import React from "react";
import api from "../services/api.service";

const getOAuthUrl = (appUrl: string, provider: string) => {
  return `${appUrl}/api/oauth/auth/${provider}`;
};

const getOAuthIcon = (provider: string) => {
  return {
    google: <SiGoogle />,
    microsoft: <FaMicrosoft />,
    github: <SiGithub />,
    discord: <SiDiscord />,
    oidc: <SiOpenid />,
  }[provider];
};

const unlinkOAuth = (provider: string) => {
  return api.post(`/oauth/unlink/${provider}`);
};

export { getOAuthUrl, getOAuthIcon, unlinkOAuth };
