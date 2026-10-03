import { useMutation } from "@tanstack/react-query";
import {
  Circle, Copy, Eraser, Hand, MoveUpRight, Pause, Play, Plus, Save, Trash2, Type, User, Eye,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api, { errMsg } from "../api/client";
import { mmss } from "../lib/format";
import { useChampions } from "../lib/hooks";
import { interpolateFrames, stripIds } from "../lib/tactics";
import BoardCanvas from "./BoardCanvas";
import { Confirm, Field, Modal, Select } from "./ui";

const TOOLS = [
  ["move", "Sposta", Hand], ["CHAMPION_TOKEN", "Campione", User], ["WARD", "Ward", Eye], ["ARROW", "Freccia", MoveUpRight],
  ["CIRCLE", "Cerchio", Circle], ["TEXT", "Testo", Type], ["erase", "Cancella", Eraser],
];
const COLORS = ["#5aa9ff", "#ff6b1a", "#ffb547", "#6fd99b", "#c9bcb0", "#f4ece3"];
const STEP_MS = 1500;

/**
 * Tactical board editor/viewer.
 * frameIndex/onFrameIndexChange make it controllable (shadow sessions); readOnly hides editing tools.
 */
export default function BoardEditor({ board, readOnly = false, frameIndex, onFrameIndexChange, onChanged }) {
  const [frames, setFrames] = useState(board.frames);
  const [dirty, setDirty] = useState(false);
  const [localIndex, setLocalIndex] = useState(0);
  const index = Math.min(frameIndex ?? localIndex, Math.max(frames.length - 1, 0));
  const setIndex = (i) => (onFrameIndexChange ? onFrameIndexChange(i) : setLocalIndex(i));
  const [tool, setTool] = useState("move");
  const [side, setSide] = useState("BLUE");
  const [color, setColor] = useState(COLORS[0]);
  const [champion, setChampion] = useState("Ahri");
  const [pending, setPending] = useState(null); // arrow/circle start point
  const [textAt, setTextAt] = useState(null); // { x, y, text } while the text popup is open
  const [ask, setAsk] = useState(null); // pending confirmation (see Confirm)
  const [hover, setHover] = useState(null);
  const dragging = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const champs = useChampions();

  // Server updates (save, polling) replace local state unless the user has unsaved edits.
  useEffect(() => { if (!dirty) setFrames(board.frames); }, [board, dirty]);

  // Playback: animate tokens from frame to frame.
  useEffect(() => {
    if (!playing) return undefined;
    let raf, last = performance.now();
    const tick = (now) => {
      setProgress((p) => {
        const next = p + (now - last) / STEP_MS;
        last = now;
        if (next >= frames.length - 1) { setPlaying(false); return frames.length - 1; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames.length]);

  const frame = frames[index];
  const shown = playing
    ? interpolateFrames(frames[Math.floor(progress)], frames[Math.floor(progress) + 1], progress % 1)
    : frame?.elements || [];

  const updateElements = (fn) => {
    setFrames((fs) => fs.map((f, i) => (i === index ? { ...f, elements: fn(f.elements) } : f)));
    setDirty(true);
  };

  const onMapDown = (p) => {
    if (readOnly || !frame || playing) return;
    const base = { team_side: side, color: "" };
    if (tool === "CHAMPION_TOKEN") updateElements((els) => [...els, { ...base, type: tool, champion, ...p }]);
    else if (tool === "WARD") updateElements((els) => [...els, { ...base, type: tool, color: side === "BLUE" ? "#ffb547" : "#ff6b1a", ...p }]);
    else if (tool === "TEXT") setTextAt({ ...p, text: "" });
    else if (tool === "ARROW" || tool === "CIRCLE") {
      if (!pending) setPending(p);
      else {
        updateElements((els) => [...els, { ...base, type: tool, color, x: pending.x, y: pending.y, x2: p.x, y2: p.y }]);
        setPending(null);
      }
    }
  };
  const onElementDown = (i, p) => {
    if (readOnly || playing) return;
    if (tool === "erase") updateElements((els) => els.filter((_, j) => j !== i));
    else if (tool === "move") dragging.current = { i, start: p, orig: frame.elements[i] };
    else onMapDown(p);
  };
  const onMove = (p) => {
    setHover(p);
    const d = dragging.current;
    if (!d) return;
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    updateElements((els) => els.map((e, j) => (j !== d.i ? e : {
      ...e, x: clamp(d.orig.x + dx), y: clamp(d.orig.y + dy),
      ...(d.orig.x2 != null ? { x2: clamp(d.orig.x2 + dx), y2: clamp(d.orig.y2 + dy) } : {}),
    })));
  };

  const run = (fn, ok) => ({ mutationFn: fn, onSuccess: async (res) => { if (ok) toast.success(ok); setDirty(false); await onChanged?.(); return res; }, onError: (e) => toast.error(errMsg(e)) });
  const save = useMutation(run(async () => {
    await api.put(`/tactic-frames/${frame.id}/elements/`, stripIds(frame.elements));
    await api.patch(`/tactic-frames/${frame.id}/`, { label: frame.label, game_time_seconds: frame.game_time_seconds, notes: frame.notes });
  }, "Frame salvato"));
  const addFrame = useMutation(run(() => api.post(`/tactic-boards/${board.id}/frames/`, {
    label: `Frame ${frames.length + 1}`, game_time_seconds: (frames.at(-1)?.game_time_seconds || 0) + 30,
  }), "Frame aggiunto"));
  const duplicate = useMutation(run(() => api.post(`/tactic-boards/${board.id}/duplicate-frame/`, { frame_id: frame.id }), "Frame duplicato"));
  const remove = useMutation(run(() => api.delete(`/tactic-frames/${frame.id}/`), "Frame eliminato"));

  const setFrameField = (k, v) => {
    setFrames((fs) => fs.map((f, i) => (i === index ? { ...f, [k]: v } : f)));
    setDirty(true);
  };

  const preview = pending && hover && { type: tool, x: pending.x, y: pending.y, x2: hover.x, y2: hover.y, color };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <BoardCanvas elements={shown} preview={preview}
          onMapPointerDown={onMapDown} onElementPointerDown={onElementDown}
          onPointerMove={onMove} onPointerUp={() => { dragging.current = null; }} />
        <Modal open={!!textAt} onClose={() => setTextAt(null)} title="Aggiungi testo" eyebrow="Lavagna">
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const { text, ...p } = textAt;
            if (text.trim()) updateElements((els) => [...els, { team_side: side, type: "TEXT", text: text.trim(), color, ...p }]);
            setTextAt(null);
          }}>
            <Field label="Testo">
              <input className="input" autoFocus maxLength={200} value={textAt?.text || ""} placeholder="es. Ward qui al minuto 3"
                onChange={(e) => setTextAt({ ...textAt, text: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setTextAt(null)}>Annulla</button>
              <button className="btn-primary flex-1" disabled={!textAt?.text.trim()}>Inserisci</button>
            </div>
          </form>
        </Modal>
        <Confirm ask={ask} onClose={() => setAsk(null)} />
        {/* timeline */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <button className="btn-gold shrink-0" aria-label={playing ? "Pausa" : "Play"} disabled={frames.length < 2}
            onClick={() => { if (!playing) setProgress(0); setPlaying(!playing); }}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          {frames.map((f, i) => (
            <button key={f.id} onClick={() => {
              setPlaying(false);
              const go = () => { setDirty(false); setIndex(i); };
              if (!dirty) go();
              else if (i !== index) setAsk({ title: "Cambiare frame?", body: "Le modifiche non salvate di questo frame andranno perse.", label: "Cambia frame", danger: true, run: go });
            }}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-left text-xs ${i === (playing ? Math.round(progress) : index) ? "border-hex bg-hex/15 text-hex" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>
              <span className="block font-semibold">{f.label || `Frame ${i + 1}`}</span>
              <span className="text-slate-500">{mmss(f.game_time_seconds)}</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="space-y-3">
        {frame && (
          <div className="card space-y-2">
            {readOnly ? (
              <>
                <p className="font-semibold">{frame.label}</p>
                <p className="text-xs text-slate-400">Minuto {mmss(frame.game_time_seconds)}</p>
                {frame.notes && <p className="text-sm">{frame.notes}</p>}
              </>
            ) : (
              <>
                <input className="input" value={frame.label} onChange={(e) => setFrameField("label", e.target.value)} aria-label="Etichetta frame" />
                <input className="input" type="number" min={0} value={frame.game_time_seconds} aria-label="Secondi di gioco"
                  onChange={(e) => setFrameField("game_time_seconds", +e.target.value)} />
                <textarea className="input" rows={2} placeholder="Note" value={frame.notes} onChange={(e) => setFrameField("notes", e.target.value)} />
              </>
            )}
          </div>
        )}
        {!readOnly && (
          <>
            <div className="card">
              <p className="label">Strumenti</p>
              <div className="grid grid-cols-4 gap-1">
                {TOOLS.map(([id, text, Icon]) => (
                  <button key={id} title={text} aria-label={text} onClick={() => { setTool(id); setPending(null); }}
                    className={`flex flex-col items-center rounded-lg p-2 text-[10px] ${tool === id ? "bg-hex/20 text-hex" : "text-slate-300 hover:bg-slate-700"}`}>
                    <Icon className="h-4 w-4" />{text}
                  </button>
                ))}
              </div>
              {pending && <p className="mt-2 text-xs text-amber-300">Clicca il punto finale.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Select value={side} onChange={setSide} options={[["BLUE", "Lato blu"], ["RED", "Lato rosso"]]} />
                <Select value={champion} onChange={setChampion} options={(champs.data?.champions || []).map((c) => [c.id, c.name])} />
              </div>
              <div className="mt-2 flex gap-1">
                {COLORS.map((c) => (
                  <button key={c} aria-label={`Colore ${c}`} onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="card grid grid-cols-2 gap-2">
              <button className="btn-primary col-span-2" onClick={() => save.mutate()} disabled={!frame || save.isPending || !dirty}>
                <Save className="h-4 w-4" /> {dirty ? "Salva frame" : "Salvato"}
              </button>
              <button className="btn-ghost" onClick={() => addFrame.mutate()}><Plus className="h-4 w-4" /> Nuovo</button>
              <button className="btn-ghost" onClick={() => duplicate.mutate()} disabled={!frame}><Copy className="h-4 w-4" /> Duplica</button>
              <button className="btn-ghost col-span-2 text-rose-300" disabled={!frame}
                onClick={() => setAsk({ title: "Eliminare il frame?", body: `${frame.label || `Frame ${index + 1}`} verrà eliminato definitivamente.`, label: "Elimina", danger: true, run: () => remove.mutate() })}>
                <Trash2 className="h-4 w-4" /> Elimina frame
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
