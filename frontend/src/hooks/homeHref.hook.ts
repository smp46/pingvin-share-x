import useConfig from "./config.hook";
import useUser from "./user.hook";

/**
 * Returns the target of "go home" links (logo, buttons, ...).
 * According to the configuration and user state, it can be (checked in order):
 * - /upload if the user is logged in
 * - / (home page) if the home page is enabled
 * - /upload if the home page is disabled and unauthenticated shares are allowed
 * - /auth/signIn otherwise
 *
 * If a config variable is missing, it defaults to / (home page).
 */
const useHomeHref = (): string => {
  const config = useConfig();
  const { user } = useUser();

  try {
    if (user) return "/upload";
    if (config.get("general.showHomePage")) return "/";
    if (config.get("security.allowUnauthenticatedShares")) return "/upload";
    return "/auth/signIn";
  } catch {
    return "/";
  }

};

export default useHomeHref;
