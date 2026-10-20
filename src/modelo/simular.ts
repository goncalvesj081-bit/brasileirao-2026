import { CORTES } from "../../config/temporada";
import { distribuirVagas, golsPelasForcas, sortearTitulos, type Copas, type Titulos } from "./copas";
import { forcas, golsEsperados } from "./forcas";
import { sortearPlacar } from "./poisson";
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
  /**
   * Só no modo detalhado. Para cada jogo restante: em quantas simulações deu mandante (0), empate (1)
   * e visitante (2), e, em cada caso, quantas vezes cada clube foi campeão, foi à Libertadores pela
   * posição e caiu. Permite dizer "se o Bahia vencer, o Flamengo cai para X%".
   */
  porJogo?: EfeitoJogo[];
  /** Só no modo detalhado. Por clube: pontos finais → [vezes, campeão, Libertadores, Sul-Americana, rebaixado], pela posição. */
  objetivosPorPontos?: Record<number, [number, number, number, number, number]>[];
}

export interface EfeitoJogo {
  id: string;
  /** vezes que deu mandante, empate, visitante */
  n: [number, number, number];
  /** [resultado][clube] = vezes campeão / Libertadores pela posição / rebaixado */
  c: number[][];
  l: number[][];
  r: number[][];
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
    }))
    .map((G) => ({ ...G, E: [Math.exp(-G.L[0]), Math.exp(-G.L[1])] }));

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
  const golsCopa = golsPelasForcas(F);

  // detalhado: efeito de cada jogo e objetivos por pontuação de cada clube
  const ids = e.restantes.filter((g) => I.has(g.mandante) && I.has(g.visitante)).map((g) => g.id);
  const saida = new Uint8Array(jogos.length);
  // vetores planos (bem mais rápidos que listas aninhadas nesse volume): [jogo][resultado][clube]
  const NJ = jogos.length;
  const efN = e.detalhado ? new Int32Array(NJ * 3) : null;
  const efC = e.detalhado ? new Int32Array(NJ * 3 * n) : null;
  const efL = e.detalhado ? new Int32Array(NJ * 3 * n) : null;
  const efR = e.detalhado ? new Int32Array(NJ * 3 * n) : null;
  // [clube][pontos][vezes, campeão, Liberta, Sula, queda]
  const MAXP = 3 * 38 + 1;
  const objPts = e.detalhado ? new Int32Array(n * MAXP * 5) : null;
  const naLib = new Int32Array(n),
    naQueda = new Int32Array(n);

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
    for (let g = 0; g < jogos.length; g++) {
      const G = jogos[g];
      let gh: number, ga: number;
      if (G.f) [gh, ga] = G.f;
      else [gh, ga] = sortearPlacar(G.L[0], G.L[1], G.E[0], G.E[1], e.rand);
      gp[G.h] += gh;
      gc[G.h] += ga;
      gp[G.a] += ga;
      gc[G.a] += gh;
      saida[g] = gh > ga ? 0 : gh === ga ? 1 : 2;
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
    const d = distribuirVagas(ordem, e.copas ? sortearTitulos(e.copas, e.rand, golsCopa) : semTitulos, indice, CORTES.rebaixados);
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
      if (objPts) {
        const o = (ti * MAXP + P) * 5;
        objPts[o]++;
        if (q === 0) objPts[o + 1]++;
        if (q <= d.corteLib) objPts[o + 2]++;
        else if (q <= d.corteSula) objPts[o + 3]++;
        if (q >= n - CORTES.rebaixados) objPts[o + 4]++;
      }
    }
    if (efN && efC && efL && efR) {
      const nl = d.corteLib + 1;
      for (let q = 0; q < nl; q++) naLib[q] = ordem[q];
      const nq = CORTES.rebaixados;
      for (let q = 0; q < nq; q++) naQueda[q] = ordem[n - nq + q];
      const campeao = ordem[0];
      for (let g = 0; g < NJ; g++) {
        const go = g * 3 + saida[g];
        efN[go]++;
        const base = go * n;
        efC[base + campeao]++;
        for (let q = 0; q < nl; q++) efL[base + naLib[q]]++;
        for (let q = 0; q < nq; q++) efR[base + naQueda[q]]++;
      }
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
    porJogo:
      efN && efC && efL && efR
        ? ids.map((id, g) => {
            const fatia = (v: Int32Array, o: number) => Array.from(v.subarray((g * 3 + o) * n, (g * 3 + o + 1) * n));
            return {
              id,
              n: [efN[g * 3], efN[g * 3 + 1], efN[g * 3 + 2]] as [number, number, number],
              c: [0, 1, 2].map((o) => fatia(efC, o)),
              l: [0, 1, 2].map((o) => fatia(efL, o)),
              r: [0, 1, 2].map((o) => fatia(efR, o)),
            };
          })
        : undefined,
    objetivosPorPontos: objPts
      ? Array.from({ length: n }, (_, ti) => {
          const m: Record<number, [number, number, number, number, number]> = {};
          for (let P = 0; P < MAXP; P++) {
            const o = (ti * MAXP + P) * 5;
            if (objPts[o]) m[P] = [objPts[o], objPts[o + 1], objPts[o + 2], objPts[o + 3], objPts[o + 4]];
          }
          return m;
        })
      : undefined,
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
