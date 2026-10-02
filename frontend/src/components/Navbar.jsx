import {
  Bot, ClipboardList, Crosshair, ExternalLink, Heart, LayoutDashboard, LogOut, Map, Menu, Swords, Trophy, Users, Video,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const FANTALOL_URL = "https://fantalol.win";

const LINKS = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/teams", "Team", Users],
  ["/scrims", "Scrim", Swords],
  ["/tournaments", "Tornei", Trophy],
  ["/scouting", "Scouting", Heart],
  ["/tactics", "Tattiche", Map],
  ["/draft", "Draft", Crosshair],
  ["/vod", "VOD", Video],
  ["/coaching", "Coaching", ClipboardList],
  ["/ai", "Assistente AI", Bot],
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }) =>
    `relative flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] transition ${
      isActive ? "text-white [text-shadow:var(--text-glow)] after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-hex after:shadow-[0_0_8px_#6fd6f6] [&>svg]:text-hex"
        : "text-slate-200/80 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <NavLink to="/" className="text-sm font-black tracking-[.14em] text-white">RIFTHUB</NavLink>
        <button className="btn-ghost ml-auto lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-white/10 bg-slate-950 p-3 lg:static lg:ml-4 lg:flex lg:flex-1 lg:flex-row lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0`}>
          {LINKS.map(([to, text, Icon]) => (
            <NavLink key={to} to={to} className={link} onClick={() => setOpen(false)}>
              <Icon className="h-4 w-4" /> {text}
            </NavLink>
          ))}
          <a href={FANTALOL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-magenta-light hover:bg-white/5">
            FantaLol <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-2 lg:ml-auto">
            <span className="h-8 w-8 rounded-full border border-hex" style={{ background: "var(--grad-tint-cyan)" }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-white">
              {user?.display_name || user?.email} <span className="text-hex">· {user?.role}</span>
            </span>
            <button className="btn-ghost" onClick={logout} aria-label="Esci"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </nav>
  );
}
