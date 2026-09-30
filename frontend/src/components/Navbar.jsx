import {
  Bot, Brain, ClipboardList, ExternalLink, Heart, LayoutDashboard, LogOut, Map, Menu, Swords, Trophy, Users, Video,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const FANTALOL_URL = "https://fantalol.win";

const LINKS = [
  ["/", "Dashboard", LayoutDashboard],
  ["/teams", "Team", Users],
  ["/scrims", "Scrim", Swords],
  ["/tournaments", "Tornei", Trophy],
  ["/scouting", "Scouting", Heart],
  ["/tactics", "Tattiche", Map],
  ["/vod", "VOD", Video],
  ["/coaching", "Coaching", ClipboardList],
  ["/ai", "Assistente AI", Bot],
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-hex/15 text-hex" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-gold/20 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <NavLink to="/" className="flex items-center gap-2 font-display text-xl font-bold text-gold-light">
          <Brain className="h-6 w-6 text-hex" /> RiftHub
        </NavLink>
        <button className="btn-ghost ml-auto lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-gold/20 bg-slate-950 p-3 lg:static lg:ml-4 lg:flex lg:flex-1 lg:flex-row lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0`}>
          {LINKS.map(([to, text, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"} className={link} onClick={() => setOpen(false)}>
              <Icon className="h-4 w-4" /> {text}
            </NavLink>
          ))}
          <a href={FANTALOL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10">
            FantaLol <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-2 lg:ml-auto">
            <span className="text-xs text-slate-400">
              {user?.display_name || user?.email} · <span className="text-gold">{user?.role}</span>
            </span>
            <button className="btn-ghost" onClick={logout} aria-label="Esci"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </nav>
  );
}
