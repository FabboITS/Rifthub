import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./Brand";
import { Icon, IconButton } from "./ds";

export const FANTALOL_URL = "https://fantalol.win";

export const LINKS = [
  ["/dashboard", "Dashboard", "layout-dashboard"],
  ["/teams", "Team", "users"],
  ["/scrims", "Scrim", "swords"],
  ["/tournaments", "Tornei", "trophy"],
  ["/scouting", "Scouting", "heart"],
  ["/tactics", "Tattiche", "map"],
  ["/draft", "Draft", "crosshair"],
  ["/vod", "VOD", "video"],
  ["/coaching", "Coaching", "clipboard-list"],
  ["/ai", "Assistente", "bot"],
];

const ROLE_LABEL = { ADMIN: "Admin", MANAGER: "Manager", COACH: "Coach", PLAYER: "Player", SCOUT: "Scout" };

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const active = LINKS.find(([to]) => pathname === to || pathname.startsWith(to + "/"))?.[0];

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="sticky top-0 z-40" style={{ background: "linear-gradient(180deg, rgba(3,2,2,.92), rgba(3,2,2,.72))", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-5">
          <NavLink to="/" aria-label="RiftHub, torna alla home" className="flex-none !text-[color:var(--bone)]"><Brand size={28} /></NavLink>

          <div className="rh-nav hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex">
            {LINKS.map(([to, text]) => {
              const on = to === active;
              return (
                <NavLink key={to} to={to} className="relative flex h-16 items-center px-3 transition-colors"
                  style={{ font: "700 18px/1 var(--font-display)", letterSpacing: ".02em", color: on ? "var(--bone)" : "var(--smoke)" }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = "var(--bone)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = "var(--smoke)"; }}>
                  {text}
                  {on && (
                    <motion.span layoutId="nav-active" className="absolute bottom-0 left-2 right-2 h-[3px]"
                      style={{ background: "var(--forge)", boxShadow: "0 -4px 18px rgba(255,107,26,.8)", borderRadius: "3px 3px 0 0" }}
                      transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                  )}
                </NavLink>
              );
            })}
            <a href={FANTALOL_URL} target="_blank" rel="noopener noreferrer" className="flex h-16 items-center gap-1.5 px-3"
              style={{ font: "700 18px/1 var(--font-display)", color: "var(--molten)" }}>
              FantaLol <Icon name="arrow-up-right" size={15} />
            </a>
          </div>

          <div className="ml-auto flex flex-none items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-[6px]" style={{ background: "var(--forge-dim)", color: "var(--molten)", font: "800 15px var(--font-display)" }}>
                {(user?.display_name || user?.email || "?")[0].toUpperCase()}
              </span>
              <span className="flex flex-col leading-tight">
                <span style={{ font: "600 14px var(--font-body)", color: "var(--bone)" }}>{user?.display_name || user?.email}</span>
                <span style={{ font: "500 12px var(--font-body)", color: "var(--smoke)" }}>{ROLE_LABEL[user?.role] || user?.role}</span>
              </span>
            </div>
            <IconButton icon="log-out" size={36} variant="ghost" label="Esci" onClick={logout} />
            <IconButton icon={open ? "x" : "menu"} size={38} label={open ? "Chiudi menu" : "Apri menu"} onClick={() => setOpen((o) => !o)} className="xl:!hidden" />
          </div>
        </div>
      </nav>

      {/* menu a tutto schermo per schermi stretti */}
      <AnimatePresence>
        {open && (
          <motion.div key="menu" className="fixed inset-0 z-30 overflow-y-auto pt-20 xl:hidden"
            initial={{ clipPath: "polygon(0 0, 0 0, 0 0)" }} animate={{ clipPath: "polygon(0 0, 250% 0, 0 250%)" }}
            exit={{ clipPath: "polygon(0 0, 0 0, 0 0)" }} transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            style={{ background: "rgba(3,2,2,.97)" }}>
            <ul className="mx-auto flex max-w-[640px] flex-col px-6 pb-10">
              {[...LINKS, [FANTALOL_URL, "FantaLol", "gamepad-2"]].map(([to, text, icon], i) => {
                const ext = to.startsWith("http");
                const on = to === active;
                const inner = (
                  <span className="flex items-center gap-4 border-b py-3.5" style={{ borderColor: "var(--border-subtle)" }}>
                    <Icon name={icon} size={20} color={on ? "var(--forge)" : "var(--smoke)"} />
                    <span style={{ font: "800 clamp(28px,7vw,40px)/1 var(--font-display)", color: on ? "var(--forge)" : "var(--bone)" }}>{text}</span>
                  </span>
                );
                return (
                  <motion.li key={to} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                    {ext ? <a href={to} target="_blank" rel="noopener noreferrer">{inner}</a> : <NavLink to={to}>{inner}</NavLink>}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
