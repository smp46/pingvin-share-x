import { motion, useReducedMotion } from "framer-motion";
import moment from "moment";

// Ticket-stub rendering of a share link: the ID on the main part, expiry and
// remaining views on the perforated stub.
const ShareTicket = ({
  shareId,
  link,
  expiration,
  maxViews,
  views = 0,
}: {
  shareId: string;
  link: string;
  expiration?: Date | string | null;
  maxViews?: number | null;
  views?: number;
}) => {
  const reduceMotion = useReducedMotion();
  const never = !expiration || moment(expiration).unix() === 0;
  const viewsLeft =
    maxViews === undefined || maxViews === null
      ? "NO LIMIT"
      : String(Math.max(0, maxViews - views));

  // Print: the ticket slides out of the slot, then the stub tears along the
  // perforation and settles slightly askew.
  return (
    <div className="rv-ticket-slot">
      <div className="rv-ticket-clip">
        <motion.div
          className="rv-ticket"
          initial={reduceMotion ? false : { y: "-105%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.75, ease: [0.2, 0.7, 0.25, 1] }}
        >
          <div className="rv-ticket__main">
            <div className="rv-label">Share ticket · checked</div>
            <span className="rv-ticket__id" data-testid="ticket-id">
              {shareId}
            </span>
            <div
              className="rv-mono"
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "var(--rv-muted)",
                overflowWrap: "anywhere",
              }}
            >
              {link.replace(/^https?:\/\//, "")}
            </div>
          </div>
          <motion.div
            className="rv-ticket__stub"
            animate={
              reduceMotion
                ? {}
                : { x: [0, 0, 7, 5], y: [0, 0, 3, 2], rotate: [0, 0, 3.2, 2.4] }
            }
            transition={{
              delay: 0.85,
              duration: 0.55,
              times: [0, 0.15, 0.7, 1],
              ease: "easeOut",
            }}
          >
            <div className="rv-ticket__field">
              <span className="rv-label">Expires</span>
              <strong suppressHydrationWarning>
                {never ? "NEVER" : moment(expiration).format("DD MMM HH:mm")}
              </strong>
            </div>
            <div className="rv-ticket__field">
              <span className="rv-label">Views left</span>
              <strong>{viewsLeft}</strong>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ShareTicket;
