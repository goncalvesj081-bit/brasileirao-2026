import { CORTES } from "../../config/temporada";
import { forcas, golsEsperados } from "./forcas";
import { sortearPoisson } from "./poisson";
import type { Chances, Jogo, Linha, Placar } from "./tipos";

export interface EntradaSimulacao {
  tabela: Linha[];
  restantes: Jogo[];
  /** placares fixados pelo usuário, por id do jogo */
  forcados?: Record<string, Placar>;
  n: number;
  rand: () => number;
  /** guarda distribuição de pontos por clube e os grupos exatos de G7 e Z4 (usado na análise) */
  detalhado?: boolean;
}

export interface ResultadoSimulacao {
  n: number;
  /** mesma ordem da tabela de entrada */
  clubes: string[];
  /** pos[i][p]: chance do clube i terminar na posição p (0-based) */
  pos: number[][];
  /** pontos médios no fim */
  pts: number[];
  /** [pontos finais, vezes, campeão, Libertadores, Sul-Americana, rebaixado] */
  porPontos: [number, number, number, number, number, number][];
  ptsDist?: Record<number, number>[];
  z4?: Record<string, number>;
  lib?: Record<string, number>;
}

/**
 * Ordem final de uma simulação: pontos, vitórias, saldo, gols pró; empate total decidido no sorteio.
 * Recebe arrays por índice de clube e devolve os índices do 1º ao último.
 */
export function ordemFinal(
  p: ArrayLike<number>,
  v: ArrayLike<number>,
  gp: ArrayLike<number>,
  gc: ArrayLike<number>,
  sorteio: ArrayLike<number>,
): number[] {
  const idx = Array.from({ length: p.length }, (_, i) => i);
  return idx.sort(
    (a, b) => p[b] - p[a] || v[b] - v[a] || gp[b] - gc[b] - (gp[a] - gc[a]) || gp[b] - gp[a] || sorteio[a] - sorteio[b],
  );
}

export function simular(e: EntradaSimulacao): ResultadoSimulacao {
  const T = e.tabela;
  const n = T.length;
  const I = new Map(T.map((t, i) => [t.clube, i]));
  const F = forcas(T);
  const jogos = e.restantes
    .filter((g) => I.has(g.mandante) && I.has(g.visitante))
    .map((g) => ({
      h: I.get(g.mandante)!,
      a: I.get(g.visitante)!,
      f: e.forcados?.[g.id] ?? null,
      L: golsEsperados(F, g.mandante, g.visitante),
    }));

  const pos = Array.from({ length: n }, () => new Float64Array(n));
  const ptsSoma = new Float64Array(n);
  const porPontos = new Map<number, [number, number, number, number, number, number]>();
  const ptsDist = e.detalhado ? Array.from({ length: n }, () => new Map<number, number>()) : null;
  const z4 = e.detalhado ? new Map<string, number>() : null;
  const lib = e.detalhado ? new Map<string, number>() : null;

  const p0 = T.map((t) => t.p),
    v0 = T.map((t) => t.v),
    gp0 = T.map((t) => t.gp),
    gc0 = T.map((t) => t.gc);
  const p = new Int32Array(n),
    v = new Int32Array(n),
    gp = new Int32Array(n),
    gc = new Int32Array(n),
    sorteio = new Float64Array(n);

  for (let s = 0; s < e.n; s++) {
    for (let i = 0; i < n; i++) {
      p[i] = p0[i];
      v[i] = v0[i];
      gp[i] = gp0[i];
      gc[i] = gc0[i];
      sorteio[i] = e.rand();
    }
    for (const G of jogos) {
      let gh: number, ga: number;
      if (G.f) [gh, ga] = G.f;
      else {
        gh = sortearPoisson(G.L[0], e.rand);
        ga = sortearPoisson(G.L[1], e.rand);
      }
      gp[G.h] += gh;
      gc[G.h] += ga;
      gp[G.a] += ga;
      gc[G.a] += gh;
      if (gh > ga) {
        p[G.h] += 3;
        v[G.h]++;
      } else if (ga > gh) {
        p[G.a] += 3;
        v[G.a]++;
      } else {
        p[G.h]++;
        p[G.a]++;
      }
    }
    const ordem = ordemFinal(p, v, gp, gc, sorteio);
    for (let q = 0; q < n; q++) {
      const ti = ordem[q];
      const P = p[ti];
      pos[ti][q]++;
      ptsSoma[ti] += P;
      let b = porPontos.get(P);
      if (!b) porPontos.set(P, (b = [P, 0, 0, 0, 0, 0]));
      b[1]++;
      if (q === 0) b[2]++;
      if (q < CORTES.lib) b[3]++;
      else if (q < CORTES.sula) b[4]++;
      if (q >= n - CORTES.rebaixados) b[5]++;
      if (ptsDist) ptsDist[ti].set(P, (ptsDist[ti].get(P) ?? 0) + 1);
    }
    if (z4 && lib) {
      const kz = ordem.slice(n - CORTES.rebaixados).sort((a, b) => a - b).join(",");
      const kl = ordem.slice(0, CORTES.lib).sort((a, b) => a - b).join(",");
      z4.set(kz, (z4.get(kz) ?? 0) + 1);
      lib.set(kl, (lib.get(kl) ?? 0) + 1);
    }
  }

  return {
    n: e.n,
    clubes: T.map((t) => t.clube),
    pos: Array.from(pos, (r) => Array.from(r, (x) => x / e.n)),
    pts: Array.from(ptsSoma, (x) => x / e.n),
    porPontos: [...porPontos.values()].sort((a, b) => b[0] - a[0]),
    ptsDist: ptsDist?.map((m) => Object.fromEntries(m)),
    z4: z4 ? Object.fromEntries(z4) : undefined,
    lib: lib ? Object.fromEntries(lib) : undefined,
  };
}

function somar(r: number[], a: number, b: number): number {
  let s = 0;
  for (let i = a; i < b; i++) s += r[i];
  return s;
}

/** Campeão, Libertadores (1º ao fim da pré), Sul-Americana e rebaixamento, a partir da linha de posições. */
export function chancesDaLinha(r: number[]): Chances {
  const n = r.length;
  return { c: r[0], l: somar(r, 0, CORTES.lib), s: somar(r, CORTES.lib, CORTES.sula), r: somar(r, n - CORTES.rebaixados, n) };
}

export function chancesDoClube(res: ResultadoSimulacao, clube: string): Chances | null {
  const i = res.clubes.indexOf(clube);
  return i < 0 ? null : chancesDaLinha(res.pos[i]);
}
