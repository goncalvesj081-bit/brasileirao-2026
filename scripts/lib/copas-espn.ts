// Situação das copas (Copa do Brasil, Libertadores, Sul-Americana) pela API pública da ESPN, sem chave.
// Monta o mesmo formato de data/copas.json. Se algo der errado, quem chama mantém o arquivo anterior.

import { clubePorNomeApi } from "../../config/clubes";
import type { Confronto, Copa, Copas, Mando } from "../../src/modelo/copas";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export const LIGAS = {
  copaDoBrasil: { slug: "bra.copa_do_brazil", nome: "Copa do Brasil" },
  libertadores: { slug: "conmebol.libertadores", nome: "Libertadores" },
  sulAmericana: { slug: "conmebol.sudamericana", nome: "Sul-Americana" },
} as const;

/** Fases de mata-mata, da primeira à última. */
const FASES = ["round-of-32", "round-of-16", "quarterfinals", "semifinals", "final"];

export interface EspnEvento {
  date: string;
  season?: { slug?: string };
  status: { type: { name: string; completed?: boolean } };
  competitions: {
    competitors: {
      homeAway: "home" | "away";
      score?: string;
      advance?: boolean | null;
      winner?: boolean;
      shootoutScore?: number | null;
      team: { displayName: string };
    }[];
  }[];
}

/** Nome do site para clubes da Série A; os de fora ficam como vêm. */
const nome = (n: string) => clubePorNomeApi(n)?.nome ?? n;
const TBD = /^TBD\b/i;

interface Jogo {
  casa: string;
  fora: string;
  gc: number;
  gf: number;
  acabou: boolean;
  passou: string | null;
  data: string;
}

function lerJogo(e: EspnEvento): Jogo | null {
  const cs = e.competitions?.[0]?.competitors ?? [];
  const h = cs.find((c) => c.homeAway === "home"),
    a = cs.find((c) => c.homeAway === "away");
  if (!h || !a || TBD.test(h.team.displayName) || TBD.test(a.team.displayName)) return null;
  const acabou = e.status.type.completed === true || /FULL_TIME|FINAL/.test(e.status.type.name);
  // a ESPN marca `advance` em quem passou, no último jogo do confronto (inclusive nos pênaltis)
  const passou = !acabou ? null : h.advance ? nome(h.team.displayName) : a.advance ? nome(a.team.displayName) : null;
  return {
    casa: nome(h.team.displayName),
    fora: nome(a.team.displayName),
    gc: Number(h.score ?? 0),
    gf: Number(a.score ?? 0),
    acabou,
    passou,
    data: e.date,
  };
}

/** Transforma os jogos de uma copa no estado atual: fase em andamento, saldo de cada confronto e o que falta. */
export function montarCopa(eventos: EspnEvento[], nomeCopa: string): Copa | null {
  const porFase = new Map<string, Jogo[]>();
  for (const e of eventos) {
    const fase = e.season?.slug ?? "";
    if (!FASES.includes(fase)) continue;
    const j = lerJogo(e);
    if (!j) continue;
    if (!porFase.has(fase)) porFase.set(fase, []);
    porFase.get(fase)!.push(j);
  }
  const fase = [...FASES].reverse().find((f) => porFase.get(f)?.length);
  if (!fase) return null;
  const jogos = porFase.get(fase)!.sort((x, y) => x.data.localeCompare(y.data));
  const unica = fase === "final" && jogos.length === 1;

  // agrupa ida e volta pelo par de times; a ordem dos confrontos segue a data do primeiro jogo
  const confrontos = new Map<string, Jogo[]>();
  for (const j of jogos) {
    const k = [j.casa, j.fora].sort().join("|");
    if (!confrontos.has(k)) confrontos.set(k, []);
    confrontos.get(k)!.push(j);
  }

  const lista: Confronto[] = [...confrontos.values()].map((js) => {
    // "a" é o mandante do primeiro jogo; na Copa do Brasil e nas copas da Conmebol a volta é na casa do outro
    const a = js[0].casa,
      b = js[0].fora;
    let saldoA = 0;
    const faltam: Mando[] = [];
    let vencedor: string | undefined;
    for (const j of js) {
      if (j.acabou) {
        saldoA += j.casa === a ? j.gc - j.gf : j.gf - j.gc;
        if (j.passou) vencedor = j.passou;
      } else faltam.push(unica ? "neutro" : j.casa === a ? "a" : "b");
    }
    // mata-mata de ida e volta em que a volta ainda não aparece na API: falta o jogo na casa de "b"
    if (!unica && js.length === 1 && !vencedor) faltam.push("b");
    // tudo jogado e a ESPN não marcou quem passou: decide pelo saldo (empate fica para o sorteio)
    if (!faltam.length && !vencedor && saldoA !== 0) vencedor = saldoA > 0 ? a : b;
    const c: Confronto = { a, b, saldoA, faltam };
    if (vencedor) c.vencedor = vencedor;
    return c;
  });

  const copa: Copa = { nome: nomeCopa, finalUnica: true, confrontos: lista };
  if (fase === "final" && lista.length === 1 && lista[0].vencedor) {
    const c = lista[0];
    copa.campeao = c.vencedor;
    copa.vice = c.vencedor === c.a ? c.b : c.a;
  }
  return copa;
}

async function eventos(slug: string, meses: string[]): Promise<EspnEvento[]> {
  const todos: EspnEvento[] = [];
  for (const m of meses) {
    const r = await fetch(`${BASE}/${slug}/scoreboard?dates=${m}`, { headers: { "User-Agent": "brasileirao-2026-site" } });
    if (!r.ok) throw new Error(`${slug} ${m}: HTTP ${r.status}`);
    const j = (await r.json()) as { events?: EspnEvento[] };
    todos.push(...(j.events ?? []));
  }
  return todos;
}

/** Meses de julho a dezembro do ano: cobre as fases de mata-mata das três copas. */
const meses = (ano: number) => ["07", "08", "09", "10", "11", "12"].map((m) => `${ano}${m}`);

/** Datas dos jogos de mata-mata ainda não encerrados (inclusive finais com times a definir). */
export function datasPendentes(eventos: EspnEvento[]): string[] {
  return eventos
    .filter((e) => FASES.includes(e.season?.slug ?? "") && !(e.status.type.completed === true || /FULL_TIME|FINAL/.test(e.status.type.name)))
    .map((e) => e.date);
}

export async function buscarCopas(ano: number, agora = new Date()): Promise<Copas> {
  const copas = {} as Record<keyof typeof LIGAS, Copa>;
  const datas: string[] = [];
  for (const [k, l] of Object.entries(LIGAS) as [keyof typeof LIGAS, (typeof LIGAS)[keyof typeof LIGAS]][]) {
    const evs = await eventos(l.slug, meses(ano));
    const copa = montarCopa(evs, l.nome);
    if (!copa) throw new Error(`${l.nome}: nenhum jogo de mata-mata encontrado.`);
    copas[k] = copa;
    datas.push(...datasPendentes(evs));
  }
  return { atualizado: agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), jogos: [...new Set(datas)].sort(), ...copas };
}
