import { Button } from "@mantine/core";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  TbArrowRight,
  TbFileUpload,
  TbLockOpen,
  TbShieldCheck,
  TbTicket,
} from "react-icons/tb";
import { useIntl } from "react-intl";
import Meta from "../components/Meta";
import useUser from "../hooks/user.hook";
import useConfig from "../hooks/config.hook";
import useHomeHref from "../hooks/homeHref.hook";
import en from "../i18n/translations/en-US";
import styles from "../styles/home.module.css";

const stations = [
  { icon: TbFileUpload, label: "Upload", note: "Drop up to 10 MB" },
  { icon: TbShieldCheck, label: "Checked", note: "Type & size inspected" },
  { icon: TbTicket, label: "Ticket", note: "22-char unguessable ID" },
  { icon: TbLockOpen, label: "Opened safely", note: "Slip shown first" },
];

export default function Home() {
  const { refreshUser } = useUser();
  const router = useRouter();
  const config = useConfig();
  const homeHref = useHomeHref();
  const intl = useIntl();
  const reduceMotion = useReducedMotion();
  const t = (id: keyof typeof en) =>
    intl.formatMessage({ id, defaultMessage: en[id] });
  let signupEnabled = true;
  try {
    signupEnabled = config.get("security.allowRegistration") !== false;
  } catch {
    signupEnabled = true;
  }
  const redirectTarget = homeHref !== "/" ? homeHref : null;
  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
    else refreshUser();
  }, [redirectTarget, router]);
  if (redirectTarget) return null;

  const loop = {
    duration: 5.5,
    repeat: Infinity,
    repeatDelay: 1.2,
    ease: "easeInOut" as const,
  };

  const features = [
    {
      title: "home.rv.feature.links.title",
      text: "home.rv.feature.links.text",
      value: "128-bit",
      unit: "random share ID",
    },
    {
      title: "home.rv.feature.tripwire.title",
      text: "home.rv.feature.tripwire.text",
      value: "5 · 20",
      unit: "bad passwords · burst downloads",
    },
    {
      title: "home.rv.feature.card.title",
      text: "home.rv.feature.card.text",
      value: "3 checks",
      unit: "before first download",
    },
  ] as const;

  return (
    <>
      <Meta title={t("home.rv.meta")} />
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className="rv-label">
            RV Files <span className={styles.sep}>/</span>{" "}
            {t("home.rv.eyebrow")}
          </div>
          <h1
            id="home-title"
            className={styles.title}
            aria-label={t("home.rv.title")}
          >
            <span>{t("home.rv.title.first")}</span>
            <span className={styles.titleSecond}>
              {t("home.rv.title.second")}
            </span>
          </h1>
          <p className={styles.description}>{t("home.rv.description")}</p>
          <div className={styles.actions}>
            <Button
              component={Link}
              href="/upload"
              size="lg"
              rightIcon={<TbArrowRight size={20} aria-hidden="true" />}
            >
              {t("home.rv.cta")}
            </Button>
            {signupEnabled && (
              <Link href="/auth/signUp" className={styles.secondary}>
                {t("home.rv.account")}
              </Link>
            )}
          </div>
        </section>

        <section
          className={styles.flow}
          aria-label="How a share moves through the checkpoint"
        >
          <div className={styles.flowHead}>
            <span className="rv-label">Checkpoint flow · live</span>
            <span className="rv-label">
              MAX 10 MB / SHARE · 50 MB / ACCOUNT
            </span>
          </div>
          <div className={styles.flowBody}>
            <ol className={styles.stations}>
              {stations.map(({ icon: Icon, label, note }, index) => (
                <motion.li
                  key={label}
                  className={styles.station}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.1 + index * 0.12 }}
                >
                  <span className={styles.stationIndex}>0{index + 1}</span>
                  <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                  <strong>{label}</strong>
                  <small>{note}</small>
                  {index === 1 && (
                    <motion.span
                      className={`rv-stamp ${styles.flowStamp}`}
                      aria-hidden="true"
                      animate={
                        reduceMotion
                          ? { opacity: 1, scale: 1, rotate: -6 }
                          : {
                              opacity: [0, 0, 1, 1, 0],
                              scale: [2.2, 2.2, 1, 1, 1],
                              rotate: [-16, -16, -6, -6, -6],
                            }
                      }
                      transition={{
                        ...loop,
                        times: [0, 0.5, 0.54, 0.95, 1],
                        ease: "easeOut",
                      }}
                    >
                      CHECKED
                    </motion.span>
                  )}
                </motion.li>
              ))}
            </ol>
            {!reduceMotion && (
              <>
                {/* scanner sweep over station 02 */}
                <div className={styles.scanZone} aria-hidden="true">
                  <motion.div
                    className={styles.scanBeam}
                    animate={{
                      left: ["-30%", "-30%", "100%", "100%"],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ ...loop, times: [0, 0.3, 0.5, 0.52] }}
                  />
                </div>
                {/* the file travelling along the conveyor */}
                <div className={styles.conveyor} aria-hidden="true">
                  <motion.div
                    className={styles.chip}
                    animate={{
                      left: [
                        "12.5%",
                        "12.5%",
                        "37.5%",
                        "37.5%",
                        "62.5%",
                        "62.5%",
                        "87.5%",
                        "87.5%",
                      ],
                      opacity: [0, 1, 1, 1, 1, 1, 1, 0],
                    }}
                    transition={{
                      ...loop,
                      times: [0, 0.06, 0.28, 0.56, 0.68, 0.8, 0.9, 0.98],
                    }}
                  >
                    <motion.span
                      className={styles.chipFill}
                      animate={{ opacity: [0, 0, 1, 1] }}
                      transition={{ ...loop, times: [0, 0.6, 0.64, 1] }}
                    />
                    <motion.span
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ ...loop, times: [0, 0.6, 0.64, 1] }}
                    >
                      survey.pdf · 2.4 MB
                    </motion.span>
                    <motion.span
                      className={styles.chipAlt}
                      animate={{ opacity: [0, 0, 1, 1] }}
                      transition={{ ...loop, times: [0, 0.6, 0.64, 1] }}
                    >
                      /s/Rae9K3…GkhQ
                    </motion.span>
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </section>

        <section
          className={styles.form}
          aria-label={t("home.rv.features.label")}
        >
          <div className={styles.formHead}>
            <span className="rv-label">Inspection form RV-01</span>
            <span className="rv-label">3 fields · all mandatory</span>
          </div>
          {features.map(({ title, text, value, unit }, index) => (
            <article key={title} className={styles.field}>
              <span className={styles.fieldNo}>0{index + 1}</span>
              <div>
                <h2>{t(title)}</h2>
                <p>{t(text)}</p>
              </div>
              <div className={styles.fieldValue}>
                <strong>{value}</strong>
                <span className="rv-label">{unit}</span>
              </div>
            </article>
          ))}
        </section>

        <div className={styles.bottomLine}>
          <span className="rv-label">{t("home.rv.bottom")}</span>
          <span className="rv-label">RV FILES · CHECKPOINT 01</span>
        </div>
      </div>
    </>
  );
}
