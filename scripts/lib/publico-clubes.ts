// Público dos jogos em casa de cada clube na Série A, pelas páginas de temporada dos clubes na
// Wikipédia em inglês ("2026 CR Flamengo season"), que trazem o público de cada partida.
// Nem todo clube tem a página ou o público preenchido: quem não tiver fica sem média.

import { CLUBES, clubePorNomeApi } from "../../config/clubes";
import { dividirTopo, limpar } from "./pessoas-auto";

/** [data (texto da página), mandante, visitante, público] */
export type JogoPublico = [string, string, string, number];

const LIGA = /s[ée]rie a|brasileir[aã]o|campeonato brasileiro/i;
const OUTRAS = /copa|cup|libertadores|sudamericana|sul-americana|paulista|carioca|mineiro|ga[uú]cho|baiano|paranaense|catarinense|pernambucano|paraense|state|estadual|friendl/i;

/** Blocos {{football box…}} com o título de seção mais próximo antes deles. */
function caixas(wikitext: string): { secao: string; corpo: string }[] {
  const out: { secao: string; corpo: string }[] = [];
  const re = /\{\{\s*football box/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext))) {
    let prof = 0,
      fim = m.index;
    for (let i = m.index; i < wikitext.length - 1; i++) {
      const d = wikitext.slice(i, i + 2);
      if (d === "{{") {
        prof++;
        i++;
      } else if (d === "}}") {
        prof--;
        i++;
        if (prof === 0) {
          fim = i + 1;
          break;
        }
      }
    }
    const antes = wikitext.slice(0, m.index);
    const titulos = [...antes.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)];
    // a seção mais específica que fala de competição
    const secao = [...titulos].reverse().find((t) => LIGA.test(t[2]) || OUTRAS.test(t[2]))?.[2] ?? "";
    out.push({ secao, corpo: wikitext.slice(m.index + 2, fim - 2) });
  }
  return out;
}

export function lerPublicoDoClube(clube: string, wikitext: string): JogoPublico[] {
  const out: JogoPublico[] = [];
  for (const { secao, corpo } of caixas(wikitext)) {
    if (!LIGA.test(secao) || OUTRAS.test(secao)) continue;
    const params: Record<string, string> = {};
    for (const p of dividirTopo(corpo, "|").slice(1)) {
      const k = p.indexOf("=");
      if (k > 0) params[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim();
    }
    const m = clubePorNomeApi(limpar(params.team1 ?? ""))?.nome,
      v = clubePorNomeApi(limpar(params.team2 ?? ""))?.nome;
    const pub = Number(limpar(params.attendance ?? "").replace(/\D/g, ""));
    if (m === clube && v && pub > 0) out.push([limpar(params.date ?? ""), m, v, pub]);
  }
  return out;
}

const UA = { "User-Agent": "brasileirao-2026 (https://github.com/goncalvesj081-bit/brasileirao-2026)" };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function buscarPublicoClubes(ano: number): Promise<Record<string, JogoPublico[]>> {
  const API = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2";
  const out: Record<string, JogoPublico[]> = {};
  for (const c of CLUBES) {
    try {
      const busca = (await (await fetch(`${API}&action=query&list=search&srlimit=10&srsearch=${encodeURIComponent(`${ano} ${c.nome} season`)}`, { headers: UA })).json()) as {
        query: { search: { title: string }[] };
      };
      // a página certa começa com o ano e termina em "season"
      const titulo = busca.query.search.map((s) => s.title).find((t) => t.startsWith(`${ano} `) && /season$/i.test(t) && clubePorNomeApi(t.slice(5, -7))?.nome === c.nome);
      if (titulo) {
        await espera(800);
        const { parse } = (await (await fetch(`${API}&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(titulo)}`, { headers: UA })).json()) as { parse: { wikitext: string } };
        const jogos = lerPublicoDoClube(c.nome, parse.wikitext);
        if (jogos.length) out[c.nome] = jogos;
      }
    } catch (e) {
      console.warn(`Aviso: público do ${c.nome} não lido (${(e as Error).message}).`);
    }
    await espera(800);
  }
  return out;
}
