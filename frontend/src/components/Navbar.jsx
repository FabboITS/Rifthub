import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon, IconButton } from "./ds";

export const FANTALOL_URL = "https://fantalol.win";

const LINKS = [
  ["/dashboard", "Dashboard", "layout-dashboard"],
  ["/teams", "Team", "users"],
  ["/scrims", "Scrim", "swords"],
  ["/tournaments", "Tornei", "trophy"],
  ["/scouting", "Scouting", "heart"],
  ["/tactics", "Tattiche", "map"],
  ["/draft", "Draft", "crosshair"],
  ["/vod", "VOD", "video"],
  ["/coaching", "Coaching", "clipboard-list"],
  ["/ai", "Assistente AI", "bot"],
];

const pill = "relative flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[11px] font-extrabold uppercase tracking-[.14em] transition-colors";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const els = useRef({});
  const [ind, setInd] = useState({ l: 0, w: 0, o: 0 });
  const active = LINKS.find(([to]) => pathname === to || pathname.startsWith(to + "/"))?.[0];

  // Slide the glowing pill under the active link.
  useLayoutEffect(() => {
    const measure = () => {
      const el = els.current[active];
      setInd(el ? { l: el.offsetLeft, w: el.offsetWidth, o: 1 } : (i) => ({ ...i, o: 0 }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
      style={{ background: "rgba(11,9,32,.72)", animation: "rhDown calc(var(--rh-k) * 500ms) var(--ease-out) both" }}>
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-5 py-2">
        <NavLink to="/" className="flex-none text-sm font-black tracking-[.14em] !text-white">RIFTHUB</NavLink>
        <div className="rh-nav relative min-w-0 flex-1 overflow-x-auto">
          <div className="relative flex w-max gap-0.5 py-1">
            <span aria-hidden="true" className="pointer-events-none absolute top-1 h-9 rounded-full"
              style={{ left: ind.l, width: ind.w, opacity: ind.o, background: "rgba(61,191,235,.12)", border: "1px solid rgba(111,214,246,.4)", boxShadow: "0 0 18px rgba(61,191,235,.25)", transition: "left calc(var(--rh-k) * 450ms) var(--ease-out), width calc(var(--rh-k) * 450ms) var(--ease-out), opacity 200ms" }} />
            {LINKS.map(([to, text, icon]) => {
              const on = to === active;
              return (
                <NavLink key={to} to={to} ref={(el) => { els.current[to] = el; }}
                  className={`${pill} ${on ? "!text-white" : "!text-slate-200/80 hover:bg-white/5 hover:!text-white"}`}
                  style={{ textShadow: on ? "var(--text-glow)" : "none" }}>
                  <Icon name={icon} size={16} color={on ? "var(--cyan-400)" : "currentColor"} /> {text}
                </NavLink>
              );
            })}
            <a href={FANTALOL_URL} target="_blank" rel="noopener noreferrer" className={`${pill} !text-magenta-light hover:bg-white/5`}>
              FantaLol <Icon name="external-link" size={14} />
            </a>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <span className="h-8 w-8 rounded-full border border-hex" style={{ background: "var(--grad-tint-cyan)", boxShadow: "0 0 12px rgba(61,191,235,.35)" }} />
          <span className="hidden whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[.14em] text-white sm:inline">
            {user?.display_name || user?.email} <span className="text-hex">· {user?.role}</span>
          </span>
          <IconButton icon="log-out" size={36} variant="ghost" label="Esci" onClick={logout} />
        </div>
      </div>
    </nav>
  );
}
