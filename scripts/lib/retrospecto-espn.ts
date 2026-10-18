// Jogos de temporadas passadas da Série A (ESPN, sem chave) entre os clubes da Série A atual,
// para o retrospecto de cada confronto. Temporada passada não muda: só baixa os anos que faltam.

import { clubePorNomeApi } from "../../config/clubes";

import type { JogoAntigo } from "../../src/modelo/retrospecto";
export type { JogoAntigo };

interface EventoAntigo {
  id: string;
  date: string;
  season?: { slug?: string };
  status: { type: { completed?: boolean; name: string } };
  competitions: { competitors: { homeAway: "home" | "away"; score?: string; team: { displayName: string } }[] }[];
}

export function lerTemporada(ano: number, eventos: EventoAntigo[]): JogoAntigo[] {
  const vistos = new Set<string>();
  const out: JogoAntigo[] = [];
  for (const e of eventos) {
    if (vistos.has(e.id)) continue;
    vistos.add(e.id);
    if (e.season?.slug && !/serie-a/.test(e.season.slug)) continue;
    if (!(e.status.type.completed || /FULL_TIME|FINAL/.test(e.status.type.name))) continue;
    const cs = e.competitions?.[0]?.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home"),
      a = cs.find((c) => c.homeAway === "away");
    // "América Mineiro" não é o Atlético-MG (que é reconhecido pela palavra "mineiro")
    const nome = (n?: string) => (n && !/am[eé]rica/i.test(n) ? clubePorNomeApi(n)?.nome : undefined);
    const m = nome(h?.team.displayName),
      v = nome(a?.team.displayName);
    if (!m || !v) continue;
    out.push([ano, e.date, m, v, Number(h!.score ?? 0), Number(a!.score ?? 0)]);
  }
  return out.sort((x, y) => x[1].localeCompare(y[1]));
}

export async function buscarTemporada(ano: number): Promise<JogoAntigo[]> {
  const eventos: EventoAntigo[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${ano}${String(m).padStart(2, "0")}&limit=500`, {
      headers: { "User-Agent": "brasileirao-2026-site" },
    });
    if (!r.ok) throw new Error(`ESPN ${ano}, mês ${m}: HTTP ${r.status}`);
    eventos.push(...(((await r.json()) as { events?: EventoAntigo[] }).events ?? []));
  }
  const jogos = lerTemporada(ano, eventos);
  if (jogos.length < 30) throw new Error(`só ${jogos.length} jogos de ${ano}`);
  return jogos;
}
