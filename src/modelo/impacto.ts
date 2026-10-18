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

/** Todos os efeitos relevantes de um jogo (peso mínimo em pontos percentuais), do maior para o menor. */
export function efeitosDoJogo(E: EfeitoJogo, nClubes: number, minimo = 0.02): Efeito[] {
  const lista: Efeito[] = [];
  for (let i = 0; i < nClubes; i++) {
    for (const obj of ["c", "l", "r"] as const) {
      const se = condicional(E, i, obj);
      const peso = Math.max(...se) - Math.min(...se);
      if (peso >= minimo) lista.push({ clube: i, objetivo: obj, se, peso });
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
    if (!melhor || peso > melhor.peso) melhor = { clube: i, objetivo: obj, se, peso };
  }
  return melhor;
}
