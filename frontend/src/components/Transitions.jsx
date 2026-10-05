import { motion } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1];

/**
 * Entrata di pagina: dal basso con leggera sfocatura.
 * Niente AnimatePresence mode="wait": un'uscita rimasta appesa (navigazione durante l'exit,
 * StrictMode) lasciava la nuova pagina mai montata finché non si ricaricava con F5.
 */
export const pageVariants = {
  initial: { opacity: 0, y: 28, filter: "blur(6px)" },
  // transitionEnd rimuove filter/transform: altrimenti i figli position:fixed (modali) verrebbero "intrappolati".
  enter: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT }, transitionEnd: { filter: "none", transform: "none" } },
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
