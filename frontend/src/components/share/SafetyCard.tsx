import { motion, useReducedMotion } from "framer-motion";
import { TbCheck } from "react-icons/tb";
import useTranslate from "../../hooks/useTranslate.hook";
import { ShareSafety } from "../../types/share.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import ExpiryRing from "./ExpiryRing";

const fileType = (fileName: string) => {
  const name = fileName.split(/[\\/]/).pop() || fileName;
  const dot = name.lastIndexOf(".");
  return dot > 0
    ? name
        .slice(dot + 1)
        .trim()
        .toUpperCase()
    : "";
};

// Recipient-facing inspection slip: what was checked before this share opened.
const SafetyCard = ({
  safety,
  files,
  createdAt,
}: {
  safety: ShareSafety;
  files: { name: string; size: string }[];
  createdAt?: string;
}) => {
  const t = useTranslate();
  const reduceMotion = useReducedMotion();
  const checks = [
    t("share.safety.blocked-list", { count: safety.blockedExtensions.length }),
    t("share.safety.attachment"),
    t("share.safety.unguessable"),
  ];
  const types = Array.from(
    new Set(files.map((file) => fileType(file.name)).filter(Boolean)),
  );

  return (
    <section className="rv-slip" aria-label={t("share.safety.title")}>
      <div className="rv-slip__head">
        <div>
          <div className="rv-label">Inspection slip</div>
          <h2 className="rv-slip__title">{t("share.safety.title")}</h2>
        </div>
        <span
          className={`rv-pill ${safety.hasPassword ? "rv-pill--active" : "rv-pill--expired"}`}
        >
          {t(
            safety.hasPassword
              ? "share.safety.password"
              : "share.safety.no-password",
          )}
        </span>
      </div>

      <div className="rv-slip__grid">
        <div className="rv-slip__cell">
          <div className="rv-label">Shared by</div>
          <div className="rv-slip__value">
            {safety.sharedBy?.trim() || t("share.safety.anonymous")}
          </div>
        </div>
        <div className="rv-slip__cell">
          <div className="rv-label">File type</div>
          <div className="rv-slip__value rv-mono">
            {types.length ? types.join(" · ") : t("share.safety.unknown-type")}
          </div>
        </div>
      </div>

      <ul className="rv-slip__files" aria-label="Files">
        {files.map((file, index) => {
          const bytes = Number(file.size);
          return (
            <li key={`${file.name}-${index}`}>
              <span style={{ fontWeight: 500, overflowWrap: "anywhere" }}>
                {file.name}
              </span>
              <span className="rv-mono" style={{ color: "var(--rv-muted)" }}>
                {byteToHumanSizeString(
                  Number.isFinite(bytes) && bytes >= 0 ? bytes : 0,
                )}{" "}
                · {fileType(file.name) || "—"}
              </span>
            </li>
          );
        })}
      </ul>

      <ul className="rv-slip__checks">
        {checks.map((check, index) => {
          // Each check lands in sequence: box ticks, stamp slams, row jolts.
          const at = reduceMotion ? 0 : 0.35 + index * 0.45;
          return (
            <motion.li
              key={check}
                animate={reduceMotion ? {} : { x: [0, 0, -3, 3, -1, 0] }}
              transition={{
                delay: at + 0.12,
                duration: 0.32,
                times: [0, 0.05, 0.3, 0.55, 0.8, 1],
              }}
            >
              <span className="rv-check">
                <span
                  className="rv-check__box"
                  style={{
                    borderColor: "var(--rv-ok)",
                    background: "var(--rv-ok)",
                  }}
                >
                  <motion.span
                    style={{ display: "grid" }}
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: at,
                      type: "spring",
                      stiffness: 600,
                      damping: 18,
                    }}
                  >
                    <TbCheck size={12} strokeWidth={3.5} aria-hidden="true" />
                  </motion.span>
                </span>
                <span>{check}</span>
              </span>
              <motion.span
                className="rv-stamp"
                initial={
                  reduceMotion ? false : { scale: 2.2, opacity: 0, rotate: -14 }
                }
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                transition={{
                  delay: at + 0.08,
                  type: "spring",
                  stiffness: 700,
                  damping: 20,
                }}
              >
                CHECKED
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
      <p
        style={{
          margin: 0,
          padding: "0 18px 14px",
          fontSize: 13,
          color: "var(--rv-muted)",
        }}
      >
        {t("share.safety.extension-note")}
      </p>

      <div className="rv-slip__foot">
        <div>
          <div className="rv-label">Views</div>
          <div className="rv-mono" style={{ fontSize: 16, marginTop: 4 }}>
            {safety.maxViews === null
              ? t("share.safety.unlimited-views")
              : `${safety.views} / ${safety.maxViews}`}
          </div>
        </div>
        <ExpiryRing expiresAt={safety.expiresAt} createdAt={createdAt} />
      </div>
    </section>
  );
};
export default SafetyCard;
