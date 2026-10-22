// "Campeonato mais provável": sorteia muitos campeonatos com o modelo e fica com aquele em que a
// tabela final é a mais provável, medida pelas chances de cada clube terminar na posição em que
// terminou (soma dos logaritmos). Um único sorteio costuma pôr algum clube numa posição rara.

import { forcas, golsEsperados } from "./forcas";
import { sortearPlacar } from "./poisson";
import { ordemFinal } from "./simular";
import type { Jogo, Linha, Placar } from "./tipos";

/**
 * @param base tabela atual (com os placares já fixados)
 * @param abertos jogos a sortear
 * @param pos pos[i][p]: chance do clube base[i] terminar em p (mesma ordem de `base`)
 */
export function campeonatoMaisProvavel(base: Linha[], abertos: Jogo[], pos: number[][], tentativas: number, rand: () => number): Map<string, Placar> {
  const n = base.length;
  const I = new Map(base.map((t, i) => [t.clube, i]));
  const F = forcas(base);
  const jogos = abertos
    .filter((g) => I.has(g.mandante) && I.has(g.visitante))
    .map((g) => {
      const [lm, lv] = golsEsperados(F, g.mandante, g.visitante);
      return { id: g.id, h: I.get(g.mandante)!, a: I.get(g.visitante)!, lm, lv, em: Math.exp(-lm), ev: Math.exp(-lv) };
    });
  const logp = pos.map((l) => l.map((x) => Math.log(Math.max(x, 1e-6))));
  const p = new Int32Array(n),
    v = new Int32Array(n),
    gp = new Int32Array(n),
    gc = new Int32Array(n),
    sorteio = new Float64Array(n);
  const atual: Placar[] = jogos.map(() => [0, 0]);
  let melhor: Placar[] = [],
    nota = -Infinity;
  for (let t = 0; t < tentativas; t++) {
    for (let i = 0; i < n; i++) {
      p[i] = base[i].p;
      v[i] = base[i].v;
      gp[i] = base[i].gp;
      gc[i] = base[i].gc;
      sorteio[i] = rand();
    }
    for (let k = 0; k < jogos.length; k++) {
      const g = jogos[k];
      const [a, b] = sortearPlacar(g.lm, g.lv, g.em, g.ev, rand);
      atual[k] = [a, b];
      gp[g.h] += a;
      gc[g.h] += b;
      gp[g.a] += b;
      gc[g.a] += a;
      if (a > b) (p[g.h] += 3), v[g.h]++;
      else if (b > a) (p[g.a] += 3), v[g.a]++;
      else p[g.h]++, p[g.a]++;
    }
    const ordem = ordemFinal(p, v, gp, gc, sorteio);
    let s = 0;
    for (let q = 0; q < n; q++) s += logp[ordem[q]][q];
    if (s > nota) {
      nota = s;
      melhor = atual.map((x) => [x[0], x[1]]);
    }
  }
  return new Map(jogos.map((g, k) => [g.id, melhor[k]]));
}
