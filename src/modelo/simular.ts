import { CORTES } from "../../config/temporada";
import { distribuirVagas, sortearTitulos, type Copas, type Titulos } from "./copas";
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
  /** guarda distribuição de pontos por clube e os grupos exatos de G5 e Z4 (usado na análise) */
  detalhado?: boolean;
  /** estado das copas; sem ele, vale a regra básica da tabela (G5 e Sul-Americana do 6º ao 11º) */
  copas?: Copas;
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
  /** chance de ir à Libertadores / Sul-Americana contando também os títulos (Copa do Brasil, continentais) */
  vagaLib: number[];
  vagaSula: number[];
  /** chance de terminar dentro da faixa, com o corte já descendo pelas copas; título não conta */
  posLib: number[];
  posSula: number[];
  /** em quantas simulações a última vaga da Libertadores (e da Sula) pela tabela parou em cada posição (0-based) */
  corteLib: Record<number, number>;
  corteSula: Record<number, number>;
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
  const vagaLib = new Float64Array(n),
    vagaSula = new Float64Array(n),
    posLib = new Float64Array(n),
    posSula = new Float64Array(n);
  const corteLib = new Map<number, number>(),
    corteSula = new Map<number, number>();
  const semTitulos: Titulos = { copaDoBrasil: null, libertadores: null, sulAmericana: null };
  const indice = (c: string) => I.get(c);

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
    const d = distribuirVagas(ordem, e.copas ? sortearTitulos(e.copas, e.rand) : semTitulos, indice, CORTES.rebaixados);
    for (const i of d.lib) vagaLib[i]++;
    for (const i of d.sula) vagaSula[i]++;
    corteLib.set(d.corteLib, (corteLib.get(d.corteLib) ?? 0) + 1);
    corteSula.set(d.corteSula, (corteSula.get(d.corteSula) ?? 0) + 1);
    for (let q = 0; q < n; q++) {
      const ti = ordem[q];
      const P = p[ti];
      pos[ti][q]++;
      ptsSoma[ti] += P;
      let b = porPontos.get(P);
      if (!b) porPontos.set(P, (b = [P, 0, 0, 0, 0, 0]));
      b[1]++;
      if (q === 0) b[2]++;
      // pela posição: dentro do corte da Libertadores, ou entre ele e o corte da Sul-Americana
      if (q <= d.corteLib) {
        b[3]++;
        posLib[ti]++;
      } else if (q <= d.corteSula) {
        b[4]++;
        posSula[ti]++;
      }
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
    vagaLib: Array.from(vagaLib, (x) => x / e.n),
    vagaSula: Array.from(vagaSula, (x) => x / e.n),
    posLib: Array.from(posLib, (x) => x / e.n),
    posSula: Array.from(posSula, (x) => x / e.n),
    corteLib: Object.fromEntries(corteLib),
    corteSula: Object.fromEntries(corteSula),
  };
}

function somar(r: number[], a: number, b: number): number {
  let s = 0;
  for (let i = a; i < b; i++) s += r[i];
  return s;
}

/** Pela regra básica da tabela (sem as vagas que descem das copas), a partir da linha de posições. */
export function chancesDaLinha(r: number[]): Chances {
  const n = r.length;
  return { c: r[0], l: somar(r, 0, CORTES.lib), s: somar(r, CORTES.lib, CORTES.sula), r: somar(r, n - CORTES.rebaixados, n) };
}

export type ModoVagas = "posicao" | "titulos";

/**
 * Chances do clube i. "posicao": só conta terminar dentro da faixa (que desce conforme as copas);
 * "titulos": conta também quem se classifica por ganhar uma copa.
 */
export function chancesSim(res: ResultadoSimulacao, i: number, modo: ModoVagas = "posicao"): Chances {
  const r = res.pos[i];
  const n = r.length;
  const [l, s] = modo === "titulos" ? [res.vagaLib[i], res.vagaSula[i]] : [res.posLib[i], res.posSula[i]];
  return { c: r[0], l, s, r: somar(r, n - CORTES.rebaixados, n) };
}
