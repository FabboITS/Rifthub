import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const EASE_OUT = [0.16, 1, 0.3, 1];

/**
 * "Mid-lane wipe": a ogni cambio di rotta una lama nera bordata d'arancio attraversa lo schermo
 * lungo la diagonale della mid lane, dalla base blu (basso-sinistra) alla rossa (alto-destra).
 * Il contenuto cambia mentre la lama copre il centro dello schermo.
 */
export function RouteWipe() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const first = useRef(true);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!reduce) setRun((n) => n + 1);
  }, [pathname, reduce]);

  return (
    <AnimatePresence>
      {run > 0 && (
        <motion.div key={run} aria-hidden="true"
          className="pointer-events-none fixed z-[90]"
          style={{
            inset: "-60%",
            background: "linear-gradient(45deg, transparent 30%, rgba(255,181,71,.9) 33.5%, #ff6b1a 34.5%, #030202 36%, #030202 64%, #ff6b1a 65.5%, rgba(255,181,71,.9) 66.5%, transparent 70%)",
          }}
          initial={{ x: "-36%", y: "36%" }}
          animate={{ x: "55%", y: "-55%" }}
          transition={{ duration: 0.8, ease: [0.45, 0, 0.25, 1] }}
          onAnimationComplete={() => setRun(0)}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Entrata di pagina: dal basso con leggera sfocatura, sotto la lama del RouteWipe.
 * Niente AnimatePresence mode="wait": un'uscita rimasta appesa (navigazione durante l'exit,
 * StrictMode) lasciava la nuova pagina mai montata finché non si ricaricava con F5.
 */
export const pageVariants = {
  initial: { opacity: 0, y: 28, filter: "blur(6px)" },
  // transitionEnd rimuove filter/transform: altrimenti i figli position:fixed (modali) verrebbero "intrappolati".
  enter: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT, delay: 0.2 }, transitionEnd: { filter: "none", transform: "none" } },
};

/** Rimonta il sottoalbero a ogni cambio di chiave (es. pathname) con l'animazione d'entrata. */
export function PageTransition({ id, children }) {
  return (
    <motion.div key={id} variants={pageVariants} initial="initial" animate="enter">
      {children}
    </motion.div>
  );
}

/**
 * Scroll reveal: sale di 18px e appare quando entra nel viewport (una volta sola).
 * `as` sceglie il tag (motion.section, motion.li…); delay in ms come up() di ui.jsx.
 * transitionEnd toglie il transform per non intrappolare eventuali modali position:fixed.
 */
export function Reveal({ as = "div", delay = 0, y = 18, children, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag initial={{ opacity: 0, y }} viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: delay / 1000 }, transitionEnd: { transform: "none" } }}
      {...rest}>
      {children}
    </Tag>
  );
}
