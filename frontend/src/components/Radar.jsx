import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

/** Neon radar for 0–100 metrics ([{ metric, value }]), drawn in SVG like the prototype's player card. */
export function MiniRadar({ data, height = 170 }) {
  if (!data?.length) return <p className="text-xs text-slate-500">Nessuna statistica</p>;
  const n = data.length;
  const at = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [70 + r * Math.cos(a), 72 + r * Math.sin(a)]; };
  const poly = (vals) => vals.map((v, i) => at(i, (v / 100) * 52).map((x) => x.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox="-6 0 152 146" style={{ width: "100%", height, overflow: "visible" }} role="img" aria-label="Statistiche">
      {[1, 0.66, 0.33].map((f) => <polygon key={f} points={poly(data.map(() => 100 * f))} fill="none" stroke="rgba(255,255,255,.1)" />)}
      <polygon points={poly(data.map((d) => d.value))} fill="rgba(255,107,26,.25)" stroke="#ff9a52" strokeWidth="1.5"
        style={{ filter: "drop-shadow(0 0 6px rgba(255,107,26,.6))", transition: "all 300ms" }} />
      {data.map((d, i) => {
        const [x, y] = at(i, 64);
        return <text key={d.metric} x={x} y={y + 2} textAnchor="middle" fontSize="7" fill="#a59fba" fontFamily="Urbanist" fontWeight="700">{d.metric}</text>;
      })}
    </svg>
  );
}

export function CompareRadar({ metrics, nameA, nameB }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={metrics} outerRadius="72%">
        <PolarGrid stroke="#3a2e27" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#c9c2d6", fontSize: 11 }} />
        <Radar name={nameA} dataKey="a" stroke="#ff6b1a" fill="#ff6b1a" fillOpacity={0.3} />
        <Radar name={nameB} dataKey="b" stroke="#ffb547" fill="#ffb547" fillOpacity={0.3} />
        <Legend />
        <Tooltip contentStyle={{ background: "#16110f", border: "1px solid #3a2e27" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
