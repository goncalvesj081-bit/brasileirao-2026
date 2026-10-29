// Contas "matemáticas" (sem probabilidade): o que já está garantido, o que é impossível e quantos pontos
// faltam para garantir. Conservador: empate em pontos conta contra (o desempate pode não ajudar).

import { VAGAS } from "./copas";
import type { Chances, Jogo, Linha } from "./tipos";

export interface Meta {
  /** já não depende de ninguém */
  garantido: boolean;
  /** ainda dá, nem que dependa dos outros */
  possivel: boolean;
  /** pontos que o clube precisa somar para garantir sozinho; null se nem vencendo tudo garante */
  faltam: number | null;
}

export function maximos(tabela: Linha[], restantes: Jogo[]): Map<string, number> {
  const falta = new Map(tabela.map((t) => [t.clube, 0]));
  for (const g of restantes) for (const c of [g.mandante, g.visitante]) falta.set(c, (falta.get(c) ?? 0) + 1);
  return new Map(tabela.map((t) => [t.clube, t.p + 3 * falta.get(t.clube)!]));
}

/** Terminar entre os `k` primeiros (k = 1: título; k = 16: fugir da queda com 20 clubes). */
export function metaTopK(clube: string, k: number, tabela: Linha[], max: Map<string, number>): Meta {
  const eu = tabela.find((t) => t.clube === clube)!;
  const meuMax = max.get(clube)!;
  const outros = tabela.filter((t) => t.clube !== clube);
  // possível: no máximo k-1 clubes já estão acima do que eu consigo fazer
  const possivel = outros.filter((t) => t.p > meuMax).length <= k - 1;
  // garantir: no máximo k-1 clubes conseguem chegar aos meus pontos
  const maxOutros = outros.map((t) => max.get(t.clube)!).sort((a, b) => b - a);
  const alvo = k - 1 < maxOutros.length ? maxOutros[k - 1] + 1 : 0;
  const faltam = Math.max(0, alvo - eu.p);
  return { garantido: eu.p >= alvo, possivel, faltam: alvo <= meuMax ? faltam : null };
}

/** Melhor e pior posição possíveis, contando só pontos. */
export function faixaPossivel(clube: string, tabela: Linha[], max: Map<string, number>): [number, number] {
  const eu = tabela.find((t) => t.clube === clube)!;
  const outros = tabela.filter((t) => t.clube !== clube);
  return [1 + outros.filter((t) => t.p > max.get(clube)!).length, 1 + outros.filter((t) => max.get(t.clube)! >= eu.p).length];
}

/**
 * Até que posição a última vaga pode descer quando as copas mandam vagas para a tabela: as 5 da liga,
 * mais as 2 da Copa do Brasil e os 2 campeões continentais; a Sul-Americana vem logo depois.
 */
export const ULTIMA_LIB = VAGAS.libertadoresLiga + VAGAS.libertadoresCopa + 2;
export const ULTIMA_SULA = ULTIMA_LIB + VAGAS.sulAmericana;

export type Objetivo = keyof Chances;
/** Por objetivo e por clube (na ordem da tabela): já garantido pela matemática, e ainda possível. */
export type Certezas = Record<Objetivo, { garantido: boolean[]; possivel: boolean[] }>;

/**
 * O que as contas garantem ou descartam, para a simulação nunca dizer 100% ou 0% do que ainda pode mudar.
 * Libertadores e Sul-Americana pela posição: o corte pode descer até ULTIMA_LIB e ULTIMA_SULA.
 */
export function certezas(tabela: Linha[], restantes: Jogo[], rebaixados: number): Certezas {
  const max = maximos(tabela, restantes);
  const n = tabela.length;
  const out = Object.fromEntries((["c", "l", "s", "r"] as const).map((k) => [k, { garantido: [] as boolean[], possivel: [] as boolean[] }])) as Certezas;
  for (const t of tabela) {
    const meta = (k: number) => metaTopK(t.clube, Math.min(k, n), tabela, max);
    const titulo = meta(1),
      fica = meta(n - rebaixados),
      g5 = meta(VAGAS.libertadoresLiga);
    const marca = (o: Objetivo, garantido: boolean, possivel: boolean) => {
      out[o].garantido.push(garantido);
      out[o].possivel.push(possivel);
    };
    marca("c", titulo.garantido, titulo.possivel);
    marca("l", g5.garantido, meta(ULTIMA_LIB).possivel);
    marca("s", false, !g5.garantido && fica.possivel && meta(ULTIMA_SULA).possivel);
    marca("r", !fica.possivel, !fica.garantido);
  }
  return out;
}
