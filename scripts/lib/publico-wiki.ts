// Maiores e menores públicos da Série A, pela seção "Público" da página da temporada na Wikipédia
// em português (que só lista os dez maiores e os dez menores, com o público pagante).

import { clubePorNomeApi } from "../../config/clubes";
import { lerTabela } from "./pessoas-auto";

/** [público, mandante, placar, visitante, estádio, data, rodada] */
export type LinhaPublico = [number, string, string, string, string, string, number];

export function lerPublico(wikitext: string): { maiores: LinhaPublico[]; menores: LinhaPublico[] } {
  const tabelas = wikitext.split(/(?=\{\|)/).filter((t) => t.startsWith("{|"));
  const ler = (t: string | undefined): LinhaPublico[] => {
    if (!t) return [];
    const { cab, linhas } = lerTabela(t);
    const col = (re: RegExp) => cab.findIndex((c) => re.test(c));
    const k = { pub: col(/público/i), m: col(/mandante/i), pl: col(/placar/i), v: col(/visitante/i), est: col(/estádio/i), d: col(/data/i), r: col(/rodada/i) };
    if (Object.values(k).some((x) => x < 0)) return [];
    return linhas
      .map((l): LinhaPublico | null => {
        const m = clubePorNomeApi(l[k.m])?.nome,
          v = clubePorNomeApi(l[k.v])?.nome;
        const pub = Number((l[k.pub] ?? "").replace(/\D/g, ""));
        if (!m || !v || !pub) return null;
        return [pub, m, (l[k.pl] ?? "").replace(/[–-]/, "-"), v, l[k.est] ?? "", l[k.d] ?? "", Number.parseInt(l[k.r] ?? "", 10) || 0];
      })
      .filter((x): x is LinhaPublico => !!x);
  };
  return { maiores: ler(tabelas[0]), menores: ler(tabelas[1]) };
}

export async function buscarPublico(ano: number): Promise<{ maiores: LinhaPublico[]; menores: LinhaPublico[] }> {
  const pagina = encodeURIComponent(`Campeonato Brasileiro de Futebol de ${ano} - Série A`);
  const W = `https://pt.wikipedia.org/w/api.php?format=json&formatversion=2&redirects=1&action=parse&page=${pagina}`;
  const UA = { "User-Agent": "brasileirao-2026 (https://github.com/goncalvesj081-bit/brasileirao-2026)" };
  const secoes = (await (await fetch(`${W}&prop=sections`, { headers: UA })).json()) as { parse: { sections: { index: string; line: string }[] } };
  const s = secoes.parse.sections.find((x) => /^público$/i.test(x.line));
  if (!s) throw new Error("seção Público não encontrada");
  const { parse } = (await (await fetch(`${W}&prop=wikitext&section=${s.index}`, { headers: UA })).json()) as { parse: { wikitext: string } };
  const r = lerPublico(parse.wikitext);
  if (r.maiores.length < 5) throw new Error(`só ${r.maiores.length} maiores públicos reconhecidos`);
  return r;
}
