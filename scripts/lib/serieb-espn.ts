// Série B pela API pública da ESPN (sem chave): jogos, resultados e escudos.
// A ESPN não informa a rodada; ela é estimada pela ordem dos jogos de cada time.

import type { Jogo, Resultado } from "../../src/modelo/tipos";
import type { SerieB } from "../../src/modelo/serieb";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2";

export interface EspnEventoB {
  id: string;
  date: string;
  season?: { slug?: string };
  status: { type: { name: string; completed?: boolean } };
  competitions: {
    competitors: { homeAway: "home" | "away"; score?: string; team: { displayName: string; logo?: string } }[];
  }[];
}

const TBD = /^TBD\b/i;

/** Separa resultados e jogos que faltam; a rodada é a ordem do jogo para o time que já jogou mais. */
export function normalizarSerieB(eventos: EspnEventoB[]): Omit<SerieB, "atualizado"> & { aoVivo: boolean } {
  const vistos = new Set<string>();
  const brutos: { id: string; m: string; v: string; data: string; gm: number; gv: number; acabou: boolean; adiado: boolean }[] = [];
  const escudos: Record<string, string> = {};
  let aoVivo = false;
  for (const e of eventos) {
    if (vistos.has(e.id) || (e.season?.slug && !/serie-b/.test(e.season.slug))) continue;
    vistos.add(e.id);
    const cs = e.competitions?.[0]?.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home"),
      a = cs.find((c) => c.homeAway === "away");
    if (!h || !a || TBD.test(h.team.displayName) || TBD.test(a.team.displayName)) continue;
    const st = e.status.type.name;
    if (/CANCELED|CANCELLED/.test(st)) continue;
    const acabou = e.status.type.completed === true || /FULL_TIME|FINAL/.test(st);
    if (/IN_PROGRESS|HALFTIME|FIRST_HALF|SECOND_HALF/.test(st)) aoVivo = true;
    for (const c of [h, a]) if (c.team.logo?.startsWith("https://")) escudos[c.team.displayName] = c.team.logo;
    brutos.push({
      id: `b${e.id}`,
      m: h.team.displayName,
      v: a.team.displayName,
      data: e.date,
      gm: Number(h.score ?? 0),
      gv: Number(a.score ?? 0),
      acabou,
      adiado: /POSTPONED|DELAYED/.test(st),
    });
  }
  brutos.sort((x, y) => x.data.localeCompare(y.data) || x.m.localeCompare(y.m, "pt"));
  const nJogos = new Map<string, number>();
  const resultados: Resultado[] = [];
  const restantes: Jogo[] = [];
  for (const b of brutos) {
    const km = (nJogos.get(b.m) ?? 0) + 1,
      kv = (nJogos.get(b.v) ?? 0) + 1;
    nJogos.set(b.m, km);
    nJogos.set(b.v, kv);
    const base: Jogo = { id: b.id, rodada: Math.max(km, kv), mandante: b.m, visitante: b.v, data: b.adiado ? null : b.data };
    if (b.acabou) resultados.push({ ...base, data: b.data, gm: b.gm, gv: b.gv });
    else restantes.push(base);
  }
  const clubes = [...new Set(brutos.flatMap((b) => [b.m, b.v]))].sort((x, y) => x.localeCompare(y, "pt"));
  return { clubes, resultados, restantes, escudos, aoVivo };
}

/** Confere o básico: 20 clubes e 38 jogos para cada um (resultados + restantes). */
export function conferirSerieB(d: { clubes: string[]; resultados: Jogo[]; restantes: Jogo[] }): string[] {
  const erros: string[] = [];
  if (d.clubes.length !== 20) erros.push(`${d.clubes.length} clubes na Série B (esperado 20)`);
  const n = new Map<string, number>();
  for (const g of [...d.resultados, ...d.restantes]) for (const c of [g.mandante, g.visitante]) n.set(c, (n.get(c) ?? 0) + 1);
  const errados = d.clubes.filter((c) => n.get(c) !== 38);
  if (errados.length) erros.push(`clubes sem 38 jogos: ${errados.map((c) => `${c} (${n.get(c)})`).join(", ")}`);
  return erros;
}

/** Baixa a temporada mês a mês (a ESPN só devolve um intervalo curto por pedido). */
export async function buscarSerieB(ano: number): Promise<ReturnType<typeof normalizarSerieB>> {
  const eventos: EspnEventoB[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = await fetch(`${BASE}/scoreboard?dates=${ano}${String(m).padStart(2, "0")}&limit=500`, { headers: { "User-Agent": "brasileirao-2026-site" } });
    if (!r.ok) throw new Error(`ESPN Série B, mês ${m}: HTTP ${r.status}`);
    eventos.push(...(((await r.json()) as { events?: EspnEventoB[] }).events ?? []));
  }
  const d = normalizarSerieB(eventos);
  const erros = conferirSerieB(d);
  if (erros.length) throw new Error(erros.join("; "));
  return d;
}
