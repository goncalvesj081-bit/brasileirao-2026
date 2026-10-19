// "Jogos que decidem": quanto o resultado de um jogo mexe nas chances de cada clube.

import type { EfeitoJogo } from "./simular";

export type ObjetivoJogo = "c" | "l" | "r";

export interface Efeito {
  /** índice do clube (ordem da tabela) */
  clube: number;
  objetivo: ObjetivoJogo;
  /** chance do clube no objetivo se der mandante, empate, visitante */
  se: [number, number, number];
  /** diferença entre o melhor e o pior cenário */
  peso: number;
}

/** Chance condicional de um clube num objetivo para cada resultado do jogo. */
export function condicional(E: EfeitoJogo, clube: number, obj: ObjetivoJogo): [number, number, number] {
  return [0, 1, 2].map((o) => (E.n[o] ? E[obj][o][clube] / E.n[o] : 0)) as [number, number, number];
}

/**
 * A diferença entre o melhor e o pior resultado vai além do acaso da simulação? Cada resultado só tem
 * os campeonatos sorteados em que ele saiu (poucos milhares), então diferenças pequenas aparecem até
 * em jogos que não mexem no clube. Exige 3 desvios-padrão da diferença entre as duas proporções.
 */
export function significativo(E: EfeitoJogo, se: readonly number[]): boolean {
  const a = se.indexOf(Math.max(...se)),
    b = se.indexOf(Math.min(...se));
  const na = E.n[a],
    nb = E.n[b];
  if (!na || !nb) return false;
  const p = (se[a] * na + se[b] * nb) / (na + nb);
  return se[a] - se[b] > 3 * Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
}

/** Todos os efeitos relevantes de um jogo (peso mínimo em pontos percentuais), do maior para o menor. */
export function efeitosDoJogo(E: EfeitoJogo, nClubes: number, minimo = 0.02): Efeito[] {
  const lista: Efeito[] = [];
  for (let i = 0; i < nClubes; i++) {
    for (const obj of ["c", "l", "r"] as const) {
      const se = condicional(E, i, obj);
      const peso = Math.max(...se) - Math.min(...se);
      if (peso >= minimo && significativo(E, se)) lista.push({ clube: i, objetivo: obj, se, peso });
    }
  }
  return lista.sort((a, b) => b.peso - a.peso);
}

/** Maior efeito do jogo num objetivo (para escolher os jogos que mais pesam na rodada). */
export function maiorEfeito(E: EfeitoJogo, nClubes: number, obj: ObjetivoJogo): Efeito | null {
  let melhor: Efeito | null = null;
  for (let i = 0; i < nClubes; i++) {
    const se = condicional(E, i, obj);
    const peso = Math.max(...se) - Math.min(...se);
    if ((!melhor || peso > melhor.peso) && significativo(E, se)) melhor = { clube: i, objetivo: obj, se, peso };
  }
  return melhor;
}
