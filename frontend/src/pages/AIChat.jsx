import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, ChevronDown, Send, Sparkles, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api/client";
import ChampionIcon from "../components/ChampionIcon";
import { Badge, Card, ErrorBox, Loading, PageHeader, Select } from "../components/ui";
import { useChampions } from "../lib/hooks";

const EXAMPLES = [
  "Cercami dei support almeno Diamond in EUW che cercano team",
  "Trova avversari per una scrim per il mio team",
  "Quali sono le prossime scrim del mio team?",
  "Mostrami le statistiche di Volt",
];

function ToolCalls({ calls }) {
  const [open, setOpen] = useState(false);
  if (!calls?.length) return null;
  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 text-xs">
      <button className="flex w-full items-center gap-2 px-2 py-1 text-slate-300" onClick={() => setOpen(!open)}>
        <Wrench className="h-3 w-3 text-gold" /> {calls.length} tool usati: {calls.map((c) => c.name).join(", ")}
        <ChevronDown className={`ml-auto h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && calls.map((c, i) => (
        <div key={i} className="border-t border-slate-700 px-2 py-1">
          <p><b className="text-hex">{c.name}</b>({JSON.stringify(c.args)})</p>
          <pre className="mt-1 whitespace-pre-wrap break-all text-slate-400">{c.result}</pre>
        </div>
      ))}
    </div>
  );
}

function DraftAdvisor() {
  const champs = useChampions();
  const [our, setOur] = useState([]);
  const [enemy, setEnemy] = useState([]);
  const [side, setSide] = useState("BLUE");
  const [pick, setPick] = useState({ our: "", enemy: "" });
  const advice = useMutation({ mutationFn: () => api.post("/ai/draft-advice/", { our_picks: our, enemy_picks: enemy, side }).then((r) => r.data) });
  const options = (champs.data?.champions || []).map((c) => [c.name, c.name]);
  const addPick = (key, list, setter) => { if (pick[key] && list.length < 5 && !list.includes(pick[key])) setter([...list, pick[key]]); };

  return (
    <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> Draft advisor</span>}>
      <div className="space-y-2">
        <Select value={side} onChange={setSide} options={[["BLUE", "Lato blu"], ["RED", "Lato rosso"]]} />
        {[["our", "I nostri pick", our, setOur], ["enemy", "Pick avversari", enemy, setEnemy]].map(([key, text, list, setter]) => (
          <div key={key}>
            <p className="label">{text}</p>
            <div className="flex gap-2">
              <Select value={pick[key]} onChange={(v) => setPick({ ...pick, [key]: v })} options={options} placeholder="Campione" />
              <button className="btn-ghost" onClick={() => addPick(key, list, setter)}>+</button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {list.map((c) => <button key={c} title="Rimuovi" onClick={() => setter(list.filter((x) => x !== c))}><ChampionIcon name={c} size={28} /></button>)}
            </div>
          </div>
        ))}
        <button className="btn-gold w-full" onClick={() => advice.mutate()} disabled={advice.isPending}>Consiglia ban e pick</button>
        {advice.isPending && <Loading label="Analisi draft..." />}
        {advice.isError && <ErrorBox error={errMsg(advice.error)} />}
        {advice.data && <div className="whitespace-pre-wrap rounded bg-slate-900/60 p-2 text-sm">{advice.data.output}</div>}
      </div>
    </Card>
  );
}

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [conversation, setConversation] = useState(null);
  const bottom = useRef(null);
  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => api.get("/ai/status/").then((r) => r.data) });
  const chat = useMutation({
    mutationFn: (message) => api.post("/ai/agent/chat/", { message, conversation_id: conversation }).then((r) => r.data),
    onSuccess: (d) => {
      setConversation(d.conversation_id);
      setMessages((m) => [...m, { role: "assistant", text: d.answer, tools: d.tool_calls, mode: d.mode }]);
    },
    onError: (e) => setMessages((m) => [...m, { role: "error", text: errMsg(e) + (e.response?.data?.error ? ` — ${e.response.data.error}` : "") }]),
  });
  useEffect(() => { bottom.current?.scrollIntoView?.({ behavior: "smooth" }); }, [messages, chat.isPending]);

  const send = (msg) => {
    if (!msg.trim() || chat.isPending) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setText("");
    chat.mutate(msg);
  };

  const s = status.data;
  return (
    <div>
      <PageHeader title="Assistente AI" subtitle="Agente con accesso ai dati reali di RiftHub tramite tool">
        {s && <Badge color={s.reachable && s.model_available !== false ? "green" : "amber"}>{s.provider} · {s.model} {!s.reachable ? "(non raggiungibile)" : s.model_available === false ? "(modello non ancora scaricato)" : ""}</Badge>}
        <button className="btn-ghost" onClick={() => { setMessages([]); setConversation(null); }}>Nuova chat</button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="flex h-[72vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {!messages.length && (
              <div className="p-4 text-sm text-slate-400">
                <Bot className="mb-2 h-8 w-8 text-hex" />
                Prova a chiedere:
                <ul className="mt-2 space-y-1">
                  {EXAMPLES.map((e) => <li key={e}><button className="text-left text-hex hover:underline" onClick={() => send(e)}>“{e}”</button></li>)}
                </ul>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-hex/20" : m.role === "error" ? "bg-rose-500/15 text-rose-200" : "bg-slate-700/50"}`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <ToolCalls calls={m.tools} />
                </div>
              </div>
            ))}
            {chat.isPending && <Loading label="L'agente sta ragionando e interrogando i tool..." />}
            <div ref={bottom} />
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Chiedi qualcosa su player, scrim o VOD..." />
            <button className="btn-primary" aria-label="Invia" disabled={chat.isPending}><Send className="h-4 w-4" /></button>
          </form>
        </Card>
        <DraftAdvisor />
      </div>
    </div>
  );
}
