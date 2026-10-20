// Série B 2026: 1º e 2º sobem direto; 3º x 6º e 4º x 5º jogam o mata-mata de acesso (ida e volta,
// o mais bem colocado decide em casa e passa no empate do agregado); do 17º ao 20º caem.

import { classificacao } from "./classificacao";
import { forcas, golsEsperados } from "./forcas";
import { sortearPlacar } from "./poisson";
import type { Jogo, Linha, Resultado } from "./tipos";

export interface SerieB {
  atualizado: string;
  clubes: string[];
  resultados: Resultado[];
  restantes: Jogo[];
  escudos: Record<string, string>;
}

export const REGRA_B = { diretos: 2, playoffAte: 6, rebaixados: 4 } as const;

export interface ChancesB {
  /** mesma ordem de `tabela` */
  tabela: Linha[];
  n: number;
  pos: number[][];
  titulo: number[];
  direto: number[];
  /** chance de terminar do 3º ao 6º (jogar o mata-mata) */
  playoff: number[];
  /** chance de subir pelo mata-mata */
  viaPlayoff: number[];
  acesso: number[];
  queda: number[];
  pts: number[];
}

export function simularSerieB(d: Pick<SerieB, "clubes" | "resultados" | "restantes">, n: number, rand: () => number): ChancesB {
  const tabela = classificacao(d.clubes, d.resultados);
  const N = tabela.length;
  const idx = new Map(tabela.map((t, i) => [t.clube, i]));
  const F = forcas(tabela);
  const jogos = d.restantes
    .filter((g) => idx.has(g.mandante) && idx.has(g.visitante))
    .map((g) => {
      const [lm, lv] = golsEsperados(F, g.mandante, g.visitante);
      return { m: idx.get(g.mandante)!, v: idx.get(g.visitante)!, lm, lv, em: Math.exp(-lm), ev: Math.exp(-lv) };
    });
  const ida = (casa: number, fora: number): [number, number] => {
    const [lc, lf] = golsEsperados(F, tabela[casa].clube, tabela[fora].clube);
    return sortearPlacar(lc, lf, Math.exp(-lc), Math.exp(-lf), rand);
  };

  const pos = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const viaPlayoff = new Array<number>(N).fill(0);
  const ptsSoma = new Array<number>(N).fill(0);
  const p = new Int32Array(N),
    v = new Int32Array(N),
    sg = new Int32Array(N),
    gp = new Int32Array(N);
  const ordem = tabela.map((_, i) => i);
  const sorteio = new Float64Array(N);

  for (let s = 0; s < n; s++) {
    for (let i = 0; i < N; i++) {
      const t = tabela[i];
      p[i] = t.p;
      v[i] = t.v;
      sg[i] = t.gp - t.gc;
      gp[i] = t.gp;
      sorteio[i] = rand();
    }
    for (const g of jogos) {
      const [a, b] = sortearPlacar(g.lm, g.lv, g.em, g.ev, rand);
      gp[g.m] += a;
      gp[g.v] += b;
      sg[g.m] += a - b;
      sg[g.v] += b - a;
      if (a > b) {
        p[g.m] += 3;
        v[g.m]++;
      } else if (a < b) {
        p[g.v] += 3;
        v[g.v]++;
      } else {
        p[g.m]++;
        p[g.v]++;
      }
    }
    // confronto direto e cartões não entram; o sorteio desfaz o que sobrar
    ordem.sort((x, y) => p[y] - p[x] || v[y] - v[x] || sg[y] - sg[x] || gp[y] - gp[x] || sorteio[x] - sorteio[y]);
    for (let k = 0; k < N; k++) {
      pos[ordem[k]][k]++;
      ptsSoma[ordem[k]] += p[ordem[k]];
    }
    // mata-mata: o pior colocado manda a ida
    for (const [alto, baixo] of [
      [2, 5],
      [3, 4],
    ]) {
      const A = ordem[alto],
        B = ordem[baixo];
      const [b1, a1] = ida(B, A);
      const [a2, b2] = ida(A, B);
      viaPlayoff[a1 + a2 >= b1 + b2 ? A : B]++;
    }
  }

  const soma = (i: number, de: number, ate: number) => pos[i].slice(de, ate).reduce((x, y) => x + y, 0) / n;
  const direto = tabela.map((_, i) => soma(i, 0, REGRA_B.diretos));
  const via = viaPlayoff.map((x) => x / n);
  return {
    tabela,
    n,
    pos: pos.map((l) => l.map((x) => x / n)),
    titulo: tabela.map((_, i) => pos[i][0] / n),
    direto,
    playoff: tabela.map((_, i) => soma(i, REGRA_B.diretos, REGRA_B.playoffAte)),
    viaPlayoff: via,
    acesso: direto.map((x, i) => x + via[i]),
    queda: tabela.map((_, i) => soma(i, N - REGRA_B.rebaixados, N)),
    pts: ptsSoma.map((x) => x / n),
  };
}
