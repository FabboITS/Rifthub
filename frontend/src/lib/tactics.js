export const SIDE_COLOR = { BLUE: "#38bdf8", RED: "#f87171" };

const tokenKey = (e) => `${e.team_side}:${e.champion || e.text}`;

/** Interpolate champion tokens between two frames (t in 0..1); other elements come from frame A. */
export function interpolateFrames(a, b, t) {
  if (!b) return a.elements;
  const target = Object.fromEntries(b.elements.filter((e) => e.type === "CHAMPION_TOKEN").map((e) => [tokenKey(e), e]));
  return a.elements.map((e) => {
    const to = e.type === "CHAMPION_TOKEN" && target[tokenKey(e)];
    return to ? { ...e, x: e.x + (to.x - e.x) * t, y: e.y + (to.y - e.y) * t } : e;
  });
}

export const stripIds = (els) => els.map(({ id: _id, frame: _f, ...rest }) => rest);
