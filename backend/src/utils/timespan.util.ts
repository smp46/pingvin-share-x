// A timespan config value is stored as "<number> <unit>" and parsed by
// stringToTimespan, which does no checking: parseInt of a word gives NaN and
// an unknown unit is passed to moment as is.
//
// Nothing downstream notices. moment quietly ignores both, so a retention
// period of "banana" produces a threshold of "now", which turns the grace
// period before an expired share is deleted into zero. A negative one moves
// the threshold into the future, which selects shares that have not expired
// yet. The admin ui cannot produce either, since it offers a number field and
// a list of units, but the api takes whatever it is handed.
//
// So this states what the ui already assumes, on the side that is reachable.

export const TIMESPAN_UNITS = [
  "minutes",
  "hours",
  "days",
  "weeks",
  "months",
  "years",
] as const;

// share.fileRetentionPeriod reads -1 as "never delete anything", checked
// explicitly by the expiry job. No other timespan gives it a meaning.
const DISABLED = -1;

export function isValidTimespan(value: string, allowDisabled = false): boolean {
  if (typeof value !== "string") return false;

  const parts = value.split(" ");
  if (parts.length !== 2) return false;

  const [amount, unit] = parts;
  if (!(TIMESPAN_UNITS as readonly string[]).includes(unit)) return false;

  // parseInt would accept "7abc", and the whole string has to be the number
  if (!/^-?\d+$/.test(amount)) return false;

  const parsed = Number(amount);
  if (parsed === DISABLED) return allowDisabled;

  return parsed >= 0;
}
