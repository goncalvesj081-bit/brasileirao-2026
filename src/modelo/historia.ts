// História da Série A desde 2003 (pontos corridos): tipos de data/historia.json e o que se calcula deles.
// Código puro (testado em tests/historia.test.ts).

/** Faixa em que o clube terminou: Libertadores, Sul-Americana ou rebaixamento. */
export type Zona = "l" | "s" | "r";

/** [clube, v, e, d, gp, gc, pontos ganhos ou perdidos no tribunal, faixa] */
export type LinhaHistoria = [string, number, number, number, number, number, number, Zona | null];

export interface TemporadaHistoria {
  ano: number;
  formato: { clubes: number; rodadas: number };
  /** tabela final, na ordem de classificação */
  tabela: LinhaHistoria[];
  /** [mandante, visitante, gm, gv], com índices na `tabela`; null quando a fonte não traz os placares */
  jogos: [number, number, number, number][] | null;
  /** [jogador, clube, gols], os primeiros da artilharia */
  artilheiros: [string, string, number][];
  notas: string[];
  /** os placares de campo não fecham com a tabela (jogos anulados ou decididos no tribunal), explicado nas notas */
  confrontosDiferem?: boolean;
  /** placares da fonte acertados para fechar com a tabela final ("Guarani 2x1 Figueirense → 3x0 (...)") */
  correcoes?: string[];
}

export interface Historia {
  atualizado: string;
  temporadas: TemporadaHistoria[];
}

export const pontosDa = (l: LinhaHistoria) => 3 * l[1] + l[2] + l[6];
export const jogosDa = (l: LinhaHistoria) => l[1] + l[2] + l[3];
/** Aproveitamento (0 a 1), que permite comparar as edições de 46, 42 e 38 rodadas. */
export const aproveitamento = (l: LinhaHistoria) => pontosDa(l) / (3 * jogosDa(l));

export interface Campeao {
  ano: number;
  campeao: string;
  vice: string;
  pts: number;
  /** vantagem sobre o vice */
  vantagem: number;
  aprov: number;
}

export function campeoes(h: Historia): Campeao[] {
  return h.temporadas.map((t) => {
    const [c, v] = t.tabela;
    return { ano: t.ano, campeao: c[0], vice: v[0], pts: pontosDa(c), vantagem: pontosDa(c) - pontosDa(v), aprov: aproveitamento(c) };
  });
}

/** Clubes por número de títulos (e, no empate, o título mais recente primeiro). */
export function titulos(h: Historia): { clube: string; anos: number[] }[] {
  const m = new Map<string, number[]>();
  for (const c of campeoes(h)) m.set(c.campeao, [...(m.get(c.campeao) ?? []), c.ano]);
  return [...m].map(([clube, anos]) => ({ clube, anos })).sort((a, b) => b.anos.length - a.anos.length || b.anos.at(-1)! - a.anos.at(-1)!);
}

export interface LinhaGeral {
  clube: string;
  temporadas: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  /** pontos de campo (3V+E), sem as decisões de tribunal, para somar edições diferentes do mesmo jeito */
  p: number;
  titulos: number;
  /** vezes no G-4/Libertadores pela tabela, na Sul-Americana e rebaixado */
  lib: number;
  sula: number;
  quedas: number;
  melhor: number;
}

/** Tabela de todos os tempos desde 2003. */
export function tabelaGeral(h: Historia): LinhaGeral[] {
  const m = new Map<string, LinhaGeral>();
  for (const t of h.temporadas)
    t.tabela.forEach((l, i) => {
      const [clube, v, e, d, gp, gc, , z] = l;
      const g = m.get(clube) ?? { clube, temporadas: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, p: 0, titulos: 0, lib: 0, sula: 0, quedas: 0, melhor: 99 };
      g.temporadas++;
      g.j += v + e + d;
      g.v += v;
      g.e += e;
      g.d += d;
      g.gp += gp;
      g.gc += gc;
      g.p += 3 * v + e;
      if (i === 0) g.titulos++;
      if (z === "l") g.lib++;
      if (z === "s") g.sula++;
      if (z === "r") g.quedas++;
      g.melhor = Math.min(g.melhor, i + 1);
      m.set(clube, g);
    });
  return [...m.values()].sort((a, b) => b.p - a.p || b.v - a.v || b.gp - b.gc - (a.gp - a.gc));
}

export interface Campanha {
  ano: number;
  clube: string;
  pos: number;
  valor: number;
  linha: LinhaHistoria;
}

/** Campanhas de todas as edições, ordenadas por `valor` (maior primeiro, ou menor com `crescente`). */
export function campanhas(h: Historia, valor: (l: LinhaHistoria) => number, crescente = false, quantas = 10): Campanha[] {
  const todas = h.temporadas.flatMap((t) => t.tabela.map((linha, i) => ({ ano: t.ano, clube: linha[0], pos: i + 1, valor: valor(linha), linha })));
  return todas.sort((a, b) => (crescente ? a.valor - b.valor : b.valor - a.valor) || a.ano - b.ano).slice(0, quantas);
}

export interface JogoHistorico {
  ano: number;
  mandante: string;
  visitante: string;
  gm: number;
  gv: number;
}

export function jogosDe(t: TemporadaHistoria): JogoHistorico[] {
  return (t.jogos ?? []).map(([im, iv, gm, gv]) => ({ ano: t.ano, mandante: t.tabela[im][0], visitante: t.tabela[iv][0], gm, gv }));
}

export const todosOsJogos = (h: Historia) => h.temporadas.flatMap(jogosDe);

/** Maiores goleadas (diferença de gols; no empate, mais gols do vencedor). */
export function goleadas(h: Historia, quantas = 15): JogoHistorico[] {
  const dif = (g: JogoHistorico) => Math.abs(g.gm - g.gv);
  return todosOsJogos(h)
    .sort((a, b) => dif(b) - dif(a) || Math.max(b.gm, b.gv) - Math.max(a.gm, a.gv) || a.ano - b.ano)
    .slice(0, quantas);
}

/** Jogos com mais gols. */
export function maisGols(h: Historia, quantos = 10): JogoHistorico[] {
  return todosOsJogos(h)
    .sort((a, b) => b.gm + b.gv - (a.gm + a.gv) || a.ano - b.ano)
    .slice(0, quantos);
}

export interface ResumoEdicao {
  ano: number;
  clubes: number;
  jogos: number;
  gols: number;
  media: number;
  mandante: number;
  empates: number;
  visitante: number;
}

/** Gols e resultados de cada edição (com a tabela final: gols marcados somados = gols da edição). */
export function resumoEdicoes(h: Historia): ResumoEdicao[] {
  return h.temporadas.map((t) => {
    const jogos = (t.tabela.length * t.formato.rodadas) / 2;
    const gols = t.tabela.reduce((s, l) => s + l[4], 0);
    const js = jogosDe(t);
    const conta = (f: (g: JogoHistorico) => boolean) => (js.length ? js.filter(f).length / js.length : NaN);
    return {
      ano: t.ano,
      clubes: t.tabela.length,
      jogos,
      gols,
      media: gols / jogos,
      mandante: conta((g) => g.gm > g.gv),
      empates: conta((g) => g.gm === g.gv),
      visitante: conta((g) => g.gm < g.gv),
    };
  });
}

export interface Passagem {
  ano: number;
  pos: number;
  clubes: number;
  linha: LinhaHistoria;
}

/** Edições disputadas por um clube, em ordem. */
export function trajetoria(h: Historia, clube: string): Passagem[] {
  const out: Passagem[] = [];
  for (const t of h.temporadas) {
    const i = t.tabela.findIndex((l) => l[0] === clube);
    if (i >= 0) out.push({ ano: t.ano, pos: i + 1, clubes: t.tabela.length, linha: t.tabela[i] });
  }
  return out;
}

export interface Retrospecto {
  adversario: string;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
}

/** Retrospecto do clube contra cada adversário, nas edições com placares. */
export function retrospectoContra(h: Historia, clube: string): Retrospecto[] {
  const m = new Map<string, Retrospecto>();
  for (const g of todosOsJogos(h)) {
    const casa = g.mandante === clube;
    if (!casa && g.visitante !== clube) continue;
    const adv = casa ? g.visitante : g.mandante;
    const [pro, contra] = casa ? [g.gm, g.gv] : [g.gv, g.gm];
    const r = m.get(adv) ?? { adversario: adv, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
    r.j++;
    r.gp += pro;
    r.gc += contra;
    if (pro > contra) r.v++;
    else if (pro < contra) r.d++;
    else r.e++;
    m.set(adv, r);
  }
  return [...m.values()].sort((a, b) => b.j - a.j || a.adversario.localeCompare(b.adversario, "pt"));
}

/** Artilheiros de cada edição (todos os empatados no topo). */
export function artilheirosDasEdicoes(h: Historia): { ano: number; nomes: [string, string][]; gols: number }[] {
  return h.temporadas
    .filter((t) => t.artilheiros.length)
    .map((t) => {
      const gols = t.artilheiros[0][2];
      return { ano: t.ano, gols, nomes: t.artilheiros.filter((a) => a[2] === gols).map(([j, c]) => [j, c] as [string, string]) };
    });
}
