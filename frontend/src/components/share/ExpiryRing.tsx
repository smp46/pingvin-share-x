import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import useTranslate from "../../hooks/useTranslate.hook";

const ExpiryRing = ({
  expiresAt,
  createdAt,
}: {
  expiresAt: string | null;
  createdAt?: string;
}) => {
  const t = useTranslate();
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState(now);
  useEffect(() => {
    const start = Date.now();
    setNow(start);
    setStartedAt(start);
    if (expiresAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const deadline = expiresAt === null ? null : Date.parse(expiresAt);
  const seconds =
    deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const origin = createdAt ? Date.parse(createdAt) : startedAt;
  const duration = deadline === null ? 0 : Math.max(1, deadline - origin);
  const progress =
    deadline === null
      ? 1
      : Math.max(0, Math.min(1, (deadline - now) / duration));
  const days = seconds === null ? 0 : Math.floor(seconds / 86400);
  const hours = seconds === null ? 0 : Math.floor((seconds % 86400) / 3600);
  const minutes = seconds === null ? 0 : Math.floor((seconds % 3600) / 60);
  const pad = (value: number) => String(value).padStart(2, "0");
  const expired = seconds !== null && (seconds <= 0 || !Number.isFinite(seconds));
  const label =
    seconds === null
      ? t("share.expiry.no-expiry")
      : expired
        ? t("share.expiry.expired")
        : `${days ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
  const urgent = seconds !== null && !expired && seconds < 3600;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: urgent ? "var(--rv-signal)" : "var(--rv-ink)",
      }}
    >
      <svg
        width="52"
        height="52"
        viewBox="0 0 56 56"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx="28"
          cy="28"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeDasharray="2 2.5"
          opacity="0.25"
        />
        <motion.circle
          cx="28"
          cy="28"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          pathLength="1"
          strokeDasharray="1"
          transform="rotate(-90 28 28)"
          initial={false}
          animate={{
            strokeDashoffset: 1 - (Number.isFinite(progress) ? progress : 0),
          }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: "linear" }}
        />
      </svg>
      <div>
        <div className="rv-label">{t("share.expiry.remaining")}</div>
        <span
          className="rv-timer"
          suppressHydrationWarning
          role="timer"
          aria-live="off"
        >
          {label}
        </span>
      </div>
    </div>
  );
};

export default ExpiryRing;
