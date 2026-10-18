// Contas "matemáticas" (sem probabilidade): o que já está garantido, o que é impossível e quantos pontos
// faltam para garantir. Conservador: empate em pontos conta contra (o desempate pode não ajudar).

import type { Jogo, Linha } from "./tipos";

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
