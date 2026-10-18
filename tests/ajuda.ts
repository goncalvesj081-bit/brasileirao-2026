import { CLUBES } from "../config/clubes";
import type { Jogo, Resultado } from "../src/modelo/tipos";

export const NOMES = CLUBES.map((c) => c.nome);

export function res(rodada: number, mandante: string, gm: number, gv: number, visitante: string, data: string | null = null): Resultado {
  return { id: `${rodada}-${mandante}-${visitante}`, rodada, mandante, visitante, gm, gv, data };
}

/** Tabela completa de turno e returno pelo método do círculo: 38 rodadas, 380 jogos. */
export function tabelaCompleta(clubes = NOMES, inicio = Date.UTC(2026, 0, 28)): Jogo[] {
  const n = clubes.length;
  const roda = clubes.slice(1);
  const jogos: Jogo[] = [];
  for (let r = 0; r < n - 1; r++) {
    const lista = [clubes[0], ...roda];
    for (let k = 0; k < n / 2; k++) {
      let m = lista[k],
        v = lista[n - 1 - k];
      if ((r + k) % 2) [m, v] = [v, m];
      const data = (rr: number) => new Date(inicio + rr * 7 * 86_400_000).toISOString();
      jogos.push({ id: `${r + 1}-${m}-${v}`, rodada: r + 1, mandante: m, visitante: v, data: data(r) });
      jogos.push({ id: `${r + n}-${v}-${m}`, rodada: r + n, mandante: v, visitante: m, data: data(r + n - 1) });
    }
    roda.unshift(roda.pop()!);
  }
  return jogos;
}

/** Disputa as rodadas 1..ate com placares deterministas. */
export function disputar(jogos: Jogo[], ate: number): { resultados: Resultado[]; restantes: Jogo[] } {
  const resultados: Resultado[] = [];
  const restantes: Jogo[] = [];
  jogos.forEach((g, i) => {
    if (g.rodada <= ate) resultados.push({ ...g, gm: (i * 7) % 4, gv: (i * 3) % 3 });
    else restantes.push(g);
  });
  return { resultados, restantes };
}
