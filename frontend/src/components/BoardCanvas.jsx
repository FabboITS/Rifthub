import { useRef } from "react";
import { useChampions } from "../lib/hooks";
import { SIDE_COLOR } from "../lib/tactics";
import RiftMap from "./RiftMap";

function Token({ el, icon }) {
  const x = el.x * 100, y = el.y * 100, color = SIDE_COLOR[el.team_side] || "#e2e8f0";
  const clip = `clip-${el.id || `${el.champion}-${el.team_side}`}`.replace(/[^\w-]/g, "");
  return (
    <g>
      <circle cx={x} cy={y} r="3.3" fill={color} />
      <text x={x} y={y + 1.2} fontSize="3.4" textAnchor="middle" fontWeight="bold" fill="#0f172a">{(el.champion || "?")[0]}</text>
      {icon && (
        <>
          <clipPath id={clip}><circle cx={x} cy={y} r="2.8" /></clipPath>
          <image href={icon} x={x - 2.8} y={y - 2.8} width="5.6" height="5.6" clipPath={`url(#${clip})`} />
        </>
      )}
      <circle cx={x} cy={y} r="3.1" fill="none" stroke={color} strokeWidth="0.6" />
    </g>
  );
}

function Element({ el, icon }) {
  const x = el.x * 100, y = el.y * 100;
  const color = el.color || SIDE_COLOR[el.team_side] || "#e2e8f0";
  switch (el.type) {
    case "CHAMPION_TOKEN":
      return <Token el={el} icon={icon} />;
    case "WARD":
      return (
        <g>
          <circle cx={x} cy={y} r="7" fill={color} opacity="0.08" />
          <path d={`M${x},${y - 1.6} L${x + 1.2},${y} L${x},${y + 1.6} L${x - 1.2},${y} Z`} fill={color} stroke="#0f172a" strokeWidth="0.3" />
        </g>
      );
    case "ARROW":
    case "PATH":
      return <line x1={x} y1={y} x2={(el.x2 ?? el.x) * 100} y2={(el.y2 ?? el.y) * 100} stroke={color} strokeWidth="0.8"
        strokeDasharray={el.type === "PATH" ? "2 1.2" : undefined} markerEnd="url(#arrowhead)" />;
    case "CIRCLE": {
      const r = el.x2 != null ? Math.hypot((el.x2 - el.x) * 100, (el.y2 - el.y) * 100) : 5;
      return <circle cx={x} cy={y} r={Math.max(r, 1)} fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.6" />;
    }
    case "TEXT":
      return <text x={x} y={y} fontSize="3" fill={color} textAnchor="middle" paintOrder="stroke" stroke="#0f172a" strokeWidth="0.6">{el.text}</text>;
    default:
      return null;
  }
}

/**
 * Renders the map and elements. Coordinates are normalised 0..1.
 * onMapPointerDown(point, event) fires on empty map; onElementPointerDown(index, point, event) on elements.
 */
export default function BoardCanvas({ elements, onMapPointerDown, onElementPointerDown, onPointerMove, onPointerUp, preview }) {
  const ref = useRef(null);
  const { data } = useChampions();
  const icons = Object.fromEntries((data?.champions || []).map((c) => [c.id, c.icon]));
  const point = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  return (
    <svg ref={ref} viewBox="0 0 100 100" className="aspect-square w-full touch-none select-none rounded-xl border border-gold/30"
      data-testid="board-canvas"
      onPointerDown={(e) => onMapPointerDown?.(point(e), e)}
      onPointerMove={(e) => onPointerMove?.(point(e), e)}
      onPointerUp={(e) => onPointerUp?.(point(e), e)}>
      <defs>
        <pattern id="rift-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M4,0 L0,0 0,4" fill="none" stroke="#1f3b2d" strokeWidth="0.3" />
        </pattern>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="#e2e8f0" />
        </marker>
      </defs>
      <RiftMap />
      {elements.map((el, i) => (
        <g key={el.id || i} className={onElementPointerDown ? "cursor-pointer" : ""}
          onPointerDown={onElementPointerDown ? (e) => { e.stopPropagation(); onElementPointerDown(i, point(e), e); } : undefined}>
          <Element el={el} icon={icons[el.champion]} />
        </g>
      ))}
      {preview && <g opacity="0.6"><Element el={preview} /></g>}
    </svg>
  );
}
