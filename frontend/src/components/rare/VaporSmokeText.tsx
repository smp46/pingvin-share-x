// Adapted from RareUI; see ATTRIBUTION.md and LICENSE in this directory.
import { motion, useReducedMotion, Variants } from "framer-motion";

export function VaporSmokeText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const container: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.035, delayChildren: 0.1 },
    },
  };
  const child: Variants = {
    hidden: { opacity: 0, filter: "blur(12px)", y: 20, scale: 1.1, rotate: 3 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", damping: 18, stiffness: 100 },
    },
  };
  return (
    <motion.span
      className={className}
      aria-label={text}
      variants={container}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      {text.split(" ").map((word, wordIndex) => (
        <span
          key={wordIndex}
          aria-hidden="true"
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {word.split("").map((letter, index) => (
            <motion.span
              key={index}
              variants={child}
              style={{ display: "inline-block", transformOrigin: "bottom" }}
            >
              {letter}
            </motion.span>
          ))}{" "}
        </span>
      ))}
    </motion.span>
  );
}
