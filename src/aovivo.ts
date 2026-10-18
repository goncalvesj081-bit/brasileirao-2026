// Placar ao vivo direto da ESPN, no navegador, de minuto em minuto enquanto houver jogo perto da hora.
// Não depende da atualização do GitHub (que pode atrasar): jogo que termina já entra na tabela e nas
// chances, como resultado provisório, até a próxima atualização oficial.

import { clubePorNomeApi } from "../config/clubes";
import { restantes } from "./dados";

export interface PlacarEspn {
  mandante: string;
  visitante: string;
  gm: number;
  gv: number;
  fim: boolean;
  /** "63'", "Intervalo"… */
  minuto: string;
}

interface EventoEspn {
  status: { displayClock?: string; type: { name: string; completed?: boolean } };
  competitions: { competitors: { homeAway: "home" | "away"; score?: string; team: { displayName: string } }[] }[];
}

/** Só os jogos já começados (em andamento ou encerrados) de clubes da Série A. */
export function lerPlacares(json: { events?: EventoEspn[] }): PlacarEspn[] {
  const out: PlacarEspn[] = [];
  for (const e of json.events ?? []) {
    const st = e.status.type.name;
    if (/SCHEDULED|POSTPONED|CANCELED|CANCELLED|DELAYED|SUSPENDED/.test(st)) continue;
    const cs = e.competitions?.[0]?.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home"),
      a = cs.find((c) => c.homeAway === "away");
    const m = clubePorNomeApi(h?.team.displayName)?.nome,
      v = clubePorNomeApi(a?.team.displayName)?.nome;
    if (!m || !v) continue;
    const fim = e.status.type.completed === true || /FULL_TIME|FINAL/.test(st);
    const minuto = /HALFTIME/.test(st) ? "Intervalo" : (e.status.displayClock ?? "");
    out.push({ mandante: m, visitante: v, gm: Number(h!.score ?? 0), gv: Number(a!.score ?? 0), fim, minuto });
  }
  return out;
}

const diaBR = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).replace(/-/g, "");

/** Algum jogo começou há menos de 3 horas ou começa nos próximos 15 minutos. */
export function haJogoPerto(agora = Date.now()): boolean {
  return restantes.some((g) => g.aoVivo || (g.data && Date.parse(g.data) - agora < 15 * 60_000 && agora - Date.parse(g.data) < 3 * 3600_000));
}

export let ultimaBusca: Date | null = null;

export function iniciarAoVivo(aplicar: (ps: PlacarEspn[]) => void) {
  const passo = async () => {
    if (document.visibilityState === "visible" && haJogoPerto()) {
      try {
        // jogos que passam da meia-noite: pega também o dia anterior
        const dias = [...new Set([diaBR(Date.now()), diaBR(Date.now() - 4 * 3600_000)])];
        const todos: PlacarEspn[] = [];
        for (const d of dias) {
          const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${d}`, { cache: "no-store" });
          if (r.ok) todos.push(...lerPlacares(await r.json()));
        }
        ultimaBusca = new Date();
        aplicar(todos);
      } catch {
        /* sem internet ou ESPN fora do ar: tenta de novo no próximo minuto */
      }
    }
    setTimeout(passo, haJogoPerto() ? 60_000 : 5 * 60_000);
  };
  void passo();
  // voltou para a aba: confere na hora
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && haJogoPerto()) void passo();
  });
}
