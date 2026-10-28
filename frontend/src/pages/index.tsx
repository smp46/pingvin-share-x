import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  TbArrowUpRight,
  TbCheck,
  TbFileText,
  TbFingerprint,
  TbLink,
  TbLock,
  TbShieldCheck,
} from "react-icons/tb";
import { useIntl } from "react-intl";
import Meta from "../components/Meta";
import InteractiveBackground from "../components/rare/InteractiveBackground";
import { GlassShimmerButton } from "../components/rare/GlassShimmerButton";
import { VaporSmokeText } from "../components/rare/VaporSmokeText";
import useUser from "../hooks/user.hook";
import useConfig from "../hooks/config.hook";
import useHomeHref from "../hooks/homeHref.hook";
import en from "../i18n/translations/en-US";
import styles from "../styles/home.module.css";

export default function Home() {
  const { refreshUser } = useUser();
  const router = useRouter();
  const config = useConfig();
  const homeHref = useHomeHref();
  const intl = useIntl();
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

  const features = [
    {
      icon: TbFingerprint,
      title: "home.rv.feature.links.title",
      text: "home.rv.feature.links.text",
    },
    {
      icon: TbShieldCheck,
      title: "home.rv.feature.tripwire.title",
      text: "home.rv.feature.tripwire.text",
    },
    {
      icon: TbFileText,
      title: "home.rv.feature.card.title",
      text: "home.rv.feature.card.text",
    },
  ] as const;

  return (
    <>
      <Meta title={t("home.rv.meta")} />
      <InteractiveBackground className={styles.surface}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.copy}>
            <div className={styles.eyebrow}>
              <span />
              {t("home.rv.eyebrow")}
            </div>
            <h1
              id="home-title"
              className={styles.title}
              aria-label={t("home.rv.title")}
            >
              <VaporSmokeText text={t("home.rv.title.first")} />
              <VaporSmokeText
                text={t("home.rv.title.second")}
                className={styles.gradient}
              />
            </h1>
            <p className={styles.description}>{t("home.rv.description")}</p>
            <div className={styles.actions}>
              <GlassShimmerButton href="/upload">
                {t("home.rv.cta")}
                <TbArrowUpRight size={20} aria-hidden="true" />
              </GlassShimmerButton>
              {signupEnabled && (
                <Link href="/auth/signUp" className={styles.secondary}>
                  {t("home.rv.account")}
                  <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
            <p className={styles.limits}>
              <TbCheck size={16} aria-hidden="true" />
              {t("upload.dropzone.quota-hint")}
            </p>
          </div>
          <div
            className={styles.visual}
            aria-label={t("home.rv.preview.label")}
          >
            <div className={styles.orbit} aria-hidden="true" />
            <div className={styles.preview}>
              <div className={styles.previewTop}>
                <span className={styles.brand}>
                  RV<span> / </span>Files
                </span>
                <TbLock size={18} aria-hidden="true" />
              </div>
              <div className={styles.fileRow}>
                <div className={styles.fileIcon}>
                  <TbFileText size={28} aria-hidden="true" />
                </div>
                <div>
                  <strong>{t("home.rv.preview.file")}</strong>
                  <small>{t("home.rv.preview.ready")}</small>
                </div>
                <TbCheck
                  className={styles.check}
                  size={20}
                  aria-hidden="true"
                />
              </div>
              <div className={styles.linkRow}>
                <TbLink size={16} aria-hidden="true" />
                <span>{t("home.rv.preview.link")}</span>
                <TbLock size={14} aria-hidden="true" />
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.statusDot} />
                {t("home.rv.preview.protection")}
                <span className={styles.previewPill}>
                  {t("home.rv.preview.expiry")}
                </span>
              </div>
            </div>
            <div className={styles.safetyBadge}>
              <TbShieldCheck size={22} aria-hidden="true" />
              <div>
                <strong>{t("home.rv.preview.badge")}</strong>
                <small>{t("home.rv.preview.badge.text")}</small>
              </div>
            </div>
          </div>
        </section>
        <section
          className={styles.features}
          aria-label={t("home.rv.features.label")}
        >
          {features.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className={styles.feature}>
              <div className={styles.featureTop}>
                <Icon size={24} aria-hidden="true" />
                <span>0{index + 1}</span>
              </div>
              <h2>{t(title)}</h2>
              <p>{t(text)}</p>
            </article>
          ))}
        </section>
        <div className={styles.bottomLine}>
          <span>{t("home.rv.bottom")}</span>
          <span>
            RV FILES <span aria-hidden="true">↗</span>
          </span>
        </div>
      </InteractiveBackground>
    </>
  );
}
