import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export function MiniRadar({ data, height = 160 }) {
  if (!data?.length) return <p className="text-xs text-slate-500">Nessuna statistica</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#33276f" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#a59fba", fontSize: 9 }} />
        <Radar dataKey="value" stroke="#3dbfeb" fill="#3dbfeb" fillOpacity={0.35} isAnimationActive={false} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CompareRadar({ metrics, nameA, nameB }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={metrics} outerRadius="72%">
        <PolarGrid stroke="#33276f" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#c9c2d6", fontSize: 11 }} />
        <Radar name={nameA} dataKey="a" stroke="#3dbfeb" fill="#3dbfeb" fillOpacity={0.3} />
        <Radar name={nameB} dataKey="b" stroke="#e0a43a" fill="#e0a43a" fillOpacity={0.3} />
        <Legend />
        <Tooltip contentStyle={{ background: "#120f2e", border: "1px solid #33276f" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
