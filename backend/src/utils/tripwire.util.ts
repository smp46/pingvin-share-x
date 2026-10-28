export type AccessEventLite = {
  type: "view" | "download" | "bad_password";
  ipHash: string;
  createdAt: Date;
};

export type TripwireConfig = {
  passwordLimit: number;
  downloadLimit: number;
  distinctIps: number;
  windowMinutes: number;
};

export function evaluateTripwire(
  events: AccessEventLite[],
  now: Date,
  cfg: TripwireConfig,
): string | null {
  const windowStart = now.getTime() - cfg.windowMinutes * 60 * 1000;
  const recentEvents = events.filter(
    (event) => event.createdAt.getTime() >= windowStart,
  );
  const badPasswords = recentEvents.filter(
    (event) => event.type === "bad_password",
  );
  if (badPasswords.length >= cfg.passwordLimit) {
    return "Auto-revoked: too many wrong passwords";
  }

  const downloads = recentEvents.filter((event) => event.type === "download");
  const distinctIps = new Set(downloads.map((event) => event.ipHash));
  if (
    downloads.length >= cfg.downloadLimit &&
    distinctIps.size >= cfg.distinctIps
  ) {
    return "Auto-revoked: unusual download activity";
  }

  return null;
}
