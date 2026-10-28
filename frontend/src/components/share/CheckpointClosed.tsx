import { Button } from "@mantine/core";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

// Full-page "checkpoint closed" notice for links that can no longer be opened.
const CheckpointClosed = ({
  code,
  title,
  text,
  hazard = false,
  actionLabel,
  actionHref,
}: {
  code: string;
  title: ReactNode;
  text: ReactNode;
  hazard?: boolean;
  actionLabel: ReactNode;
  actionHref: string;
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className="rv-closed"
      role="alert"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Barrier arm swings down from its post and bounces into place. */}
      <span className="rv-closed__post" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        className={`rv-closed__band ${hazard ? "" : "rv-closed__band--calm"}`}
        initial={reduceMotion ? false : { rotate: -78 }}
        animate={{ rotate: 0 }}
        transition={{
          delay: 0.25,
          type: "spring",
          stiffness: 260,
          damping: 13,
          mass: 0.9,
        }}
      />
      <div className="rv-closed__body">
        <span
          className={`rv-pill ${hazard ? "rv-pill--tripwire" : "rv-pill--revoked"}`}
        >
          Checkpoint closed · {code}
        </span>
        <h1 className="rv-closed__title">{title}</h1>
        <p className="rv-closed__text">{text}</p>
        <Button component={Link} href={actionHref} size="md">
          {actionLabel}
        </Button>
      </div>
    </motion.section>
  );
};

export default CheckpointClosed;
