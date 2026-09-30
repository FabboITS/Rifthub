import { ExternalLink, Trophy } from "lucide-react";
import { FANTALOL_URL } from "../components/Navbar";
import { PageHeader } from "../components/ui";

export function FantaLolCard() {
  return (
    <div className="card border-gold/40 bg-gradient-to-br from-gold/10 to-slate-800/70">
      <div className="flex items-start gap-3">
        <Trophy className="h-8 w-8 shrink-0 text-gold" />
        <div>
          <h2 className="font-semibold">FantaLol</h2>
          <p className="mt-1 text-sm text-slate-300">
            Il fantacalcio del League of Legends competitivo: crea la tua squadra con i pro player e sfida gli amici.
          </p>
          <a href={FANTALOL_URL} target="_blank" rel="noopener noreferrer" className="btn-gold mt-3">
            Vai su FantaLol <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function FantaLol() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="FantaLol" subtitle="Collegamento esterno" />
      <FantaLolCard />
      <p className="mt-4 text-sm text-slate-400">
        FantaLol è un servizio esterno e indipendente: RiftHub non scambia dati con FantaLol, il link apre il sito
        in una nuova scheda.
      </p>
    </div>
  );
}
