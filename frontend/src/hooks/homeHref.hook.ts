import useConfig from "./config.hook";
import useUser from "./user.hook";

/**
 * Returns the target of "go home" links (logo, buttons, ...).
 * Links must point directly to the final destination, otherwise the client
 * side navigation renders the landing page for a moment before the
 * middleware redirect takes effect.
 */
const useHomeHref = (): string => {
  const config = useConfig();
  const { user } = useUser();

  if (user) return "/upload";
  if (config.get("general.showHomePage")) return "/";
  if (config.get("security.allowUnauthenticatedShares")) return "/upload";
  return "/auth/signIn";
};

export default useHomeHref;
