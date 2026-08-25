import { deleteCookie, getCookie } from "cookies-next";
import * as jose from "jose";
import api from "./api.service";

const signIn = async (emailOrUsername: string, password: string) => {
  const emailOrUsernameBody = emailOrUsername.includes("@")
    ? { email: emailOrUsername }
    : { username: emailOrUsername };

  const response = await api.post("auth/signIn", {
    ...emailOrUsernameBody,
    password,
  });

  return response;
};

const signInTotp = (totp: string, loginToken: string) => {
  return api.post("auth/signIn/totp", {
    totp,
    loginToken,
  });
};

const signUp = async (email: string, username: string, password: string) => {
  const response = await api.post("auth/signUp", { email, username, password });

  return response;
};

const signOut = async () => {
  const response = await api.post("/auth/signOut");

  if (URL.canParse(response.data?.redirectURI))
    window.location.href = response.data.redirectURI;
  else window.location.reload();
};

// A refused refresh means the session behind these cookies is gone: the
// refresh token was deleted, expired, or belongs to a database this server no
// longer has. Holding on to the access token after that leaves the tab in a
// state it cannot leave, because the middleware reads the token to decide
// where someone may go and only decodes it, while the server verifies it and
// refuses. So the page loads and every request on it fails.
//
// Dropping the cookies puts the tab back to signed out, which the sign in
// flow already knows how to handle.
const clearSession = () => {
  for (const name of ["access_token", "refresh_token"])
    deleteCookie(name, { path: "/" });
};

const refreshAccessToken = async () => {
  const accessToken = getCookie("access_token") as string;
  if (!accessToken) return;

  let expiresSoon: boolean;
  try {
    expiresSoon =
      (jose.decodeJwt(accessToken).exp ?? 0) * 1000 <
      Date.now() + 2 * 60 * 1000;
  } catch {
    // not a token this app issued, so there is nothing to refresh
    clearSession();
    return;
  }

  if (!expiresSoon) return;

  try {
    await api.post("/auth/token");
  } catch (e: any) {
    const status = e?.response?.status;

    // 401 is the server saying the session is over. Anything else, a network
    // blip or the server being restarted, is worth retrying on the next tick
    // rather than signing someone out over.
    if (status === 401 || status === 403) clearSession();
  }
};

const requestResetPassword = async (email: string) => {
  await api.post(`/auth/resetPassword/${email}`);
};

const resetPassword = async (token: string, password: string) => {
  await api.post("/auth/resetPassword", { token, password });
};

const verifyAccount = async (token: string) => {
  await api.post(`/auth/verify`, { token });
};

const resendVerification = async (email: string) => {
  await api.post("/auth/verify/resend", { email });
};

const updatePassword = async (oldPassword: string, password: string) => {
  await api.patch("/auth/password", { oldPassword, password });
};

const enableTOTP = async (password: string) => {
  const { data } = await api.post("/auth/totp/enable", { password });

  return {
    totpAuthUrl: data.totpAuthUrl,
    totpSecret: data.totpSecret,
    qrCode: data.qrCode,
  };
};

const verifyTOTP = async (totpCode: string, password: string) => {
  await api.post("/auth/totp/verify", {
    code: totpCode,
    password,
  });
};

const disableTOTP = async (totpCode: string, password: string) => {
  await api.post("/auth/totp/disable", {
    code: totpCode,
    password,
  });
};

const getAvailableOAuth = async () => {
  return api.get("/oauth/available");
};

const getOAuthStatus = () => {
  return api.get("/oauth/status");
};

export default {
  signIn,
  signInTotp,
  signUp,
  signOut,
  refreshAccessToken,
  updatePassword,
  requestResetPassword,
  resetPassword,
  verifyAccount,
  resendVerification,
  enableTOTP,
  verifyTOTP,
  disableTOTP,
  getAvailableOAuth,
  getOAuthStatus,
};
