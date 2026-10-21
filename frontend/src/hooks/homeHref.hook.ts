import useConfig from "./config.hook";
import useUser from "./user.hook";

/**
 * Returns the target of "go home" links (logo, buttons, ...).
 * According to the configuration and user state, it can be:
 * - /upload if the user is logged in or unauthenticated shares are allowed
 * - / (home page) if the user is not logged in and the home page is enabled
 * - /auth/signIn if the user is not logged in and the home page is disabled
 *
 * If config cannot be loaded, it defaults to / (home page).
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
