/** Simplified Summoner's Rift drawn in code (no copyrighted assets). viewBox 0-100. */
export default function RiftMap() {
  const camps = [[22, 58], [27, 70], [42, 78], [52, 88], [78, 42], [73, 30], [58, 22], [48, 12], [30, 45], [70, 55]];
  const towers = [
    [8, 60], [8, 35], [40, 92], [65, 92], [26, 74], [35, 65], // blue
    [92, 40], [92, 65], [60, 8], [35, 8], [74, 26], [65, 35], // red
  ];
  return (
    <g>
      <rect width="100" height="100" fill="#10261c" />
      {/* jungle texture */}
      <rect width="100" height="100" fill="url(#rift-grid)" opacity="0.4" />
      {/* river: top-left to bottom-right */}
      <path d="M0,0 L14,4 C35,22 45,40 50,50 C55,60 65,78 96,86 L100,100 L86,96 C65,78 55,60 50,50 C45,40 35,22 4,14 Z" fill="#1d4f6e" opacity="0.8" />
      {/* lanes */}
      <g stroke="#6b5d3f" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M8,92 L8,8 L92,8" />
        <path d="M8,92 L92,92 L92,8" />
        <path d="M11,89 L89,11" />
      </g>
      {/* objectives */}
      <circle cx="31" cy="30" r="4" fill="#4c1d95" stroke="#a78bfa" strokeWidth="0.6" />
      <text x="31" y="31.2" fontSize="2.8" textAnchor="middle" fill="#ddd6fe">Baron</text>
      <circle cx="69" cy="70" r="4" fill="#7c2d12" stroke="#fb923c" strokeWidth="0.6" />
      <text x="69" y="71.2" fontSize="2.8" textAnchor="middle" fill="#fed7aa">Drago</text>
      {camps.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="#365314" stroke="#84cc16" strokeWidth="0.3" />)}
      {towers.map(([x, y], i) => <rect key={i} x={x - 1} y={y - 1} width="2" height="2" fill={i < 6 ? "#38bdf8" : "#f87171"} />)}
      {/* bases */}
      <path d="M0,100 L0,80 A20,20 0 0 0 20,100 Z" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.6" />
      <path d="M100,0 L100,20 A20,20 0 0 1 80,0 Z" fill="#7f1d1d" stroke="#f87171" strokeWidth="0.6" />
    </g>
  );
}
