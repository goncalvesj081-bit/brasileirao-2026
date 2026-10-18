// Quanto o modelo acertou: para cada jogo já disputado, a chance que ele dava antes da rodada
// (só com os resultados das rodadas anteriores), comparada com o que aconteceu.

import { classificacao } from "./classificacao";
import { forcas, golsEsperados } from "./forcas";
import { probResultado } from "./poisson";
import type { Resultado } from "./tipos";

export interface Previsao {
  jogo: Resultado;
  /** mandante, empate, visitante */
  p: [number, number, number];
  /** 0 mandante, 1 empate, 2 visitante */
  deu: 0 | 1 | 2;
}

export function previsoes(clubes: string[], resultados: Resultado[]): Previsao[] {
  const porRodada = new Map<number, ReturnType<typeof forcas>>();
  return resultados.map((g) => {
    let F = porRodada.get(g.rodada);
    if (!F) {
      F = forcas(classificacao(clubes, resultados.filter((r) => r.rodada < g.rodada)));
      porRodada.set(g.rodada, F);
    }
    const p = probResultado(...golsEsperados(F, g.mandante, g.visitante));
    return { jogo: g, p, deu: g.gm > g.gv ? 0 : g.gm === g.gv ? 1 : 2 };
  });
}

export interface Acerto {
  jogos: number;
  /** o resultado mais provável aconteceu */
  favorito: number;
  /** erro quadrático médio (Brier) do modelo e de chutar sempre a frequência média do campeonato */
  brier: number;
  brierBase: number;
  /** por faixa de chance prevista (0–10%, 10–20%…): quantas vezes previu e quantas aconteceram */
  faixas: { de: number; ate: number; n: number; media: number; aconteceu: number }[];
}

export function medirAcerto(prev: Previsao[]): Acerto {
  const n = prev.length || 1;
  const freq = [0, 1, 2].map((o) => prev.filter((x) => x.deu === o).length / n);
  const brier = (p: number[], deu: number) => p.reduce((s, x, o) => s + (x - (o === deu ? 1 : 0)) ** 2, 0);
  const faixas = Array.from({ length: 10 }, (_, k) => ({ de: k / 10, ate: (k + 1) / 10, n: 0, media: 0, aconteceu: 0 }));
  for (const x of prev)
    x.p.forEach((p, o) => {
      const f = faixas[Math.min(9, Math.floor(p * 10))];
      f.n++;
      f.media += p;
      if (x.deu === o) f.aconteceu++;
    });
  for (const f of faixas) f.media = f.n ? f.media / f.n : 0;
  return {
    jogos: prev.length,
    favorito: prev.filter((x) => x.p.indexOf(Math.max(...x.p)) === x.deu).length / n,
    brier: prev.reduce((s, x) => s + brier(x.p, x.deu), 0) / n,
    brierBase: prev.reduce((s, x) => s + brier(freq, x.deu), 0) / n,
    faixas: faixas.filter((f) => f.n),
  };
}
