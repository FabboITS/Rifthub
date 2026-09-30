import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export function MiniRadar({ data, height = 160 }) {
  if (!data?.length) return <p className="text-xs text-slate-500">Nessuna statistica</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 9 }} />
        <Radar dataKey="value" stroke="#0ac8b9" fill="#0ac8b9" fillOpacity={0.35} isAnimationActive={false} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CompareRadar({ metrics, nameA, nameB }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={metrics} outerRadius="72%">
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
        <Radar name={nameA} dataKey="a" stroke="#0ac8b9" fill="#0ac8b9" fillOpacity={0.3} />
        <Radar name={nameB} dataKey="b" stroke="#c8aa6e" fill="#c8aa6e" fillOpacity={0.3} />
        <Legend />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
