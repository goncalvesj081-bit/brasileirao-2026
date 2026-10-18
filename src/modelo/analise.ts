import { CORTES } from "../../config/temporada";
import { forcas, golsEsperados } from "./forcas";
import { probResultado } from "./poisson";
import type { ResultadoSimulacao } from "./simular";
import type { Jogo, Linha, Placar } from "./tipos";

/** Distribuição normal acumulada (aproximação de Abramowitz e Stegun). */
export function normalAcumulada(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export interface Zebra {
  jogo: Jogo;
  placar: Placar;
  /** 0 mandante, 1 empate, 2 visitante */
  resultado: 0 | 1 | 2;
  chance: number;
}

export interface Surpresa {
  clube: string;
  posicao: number; // 0-based
  posEsperada: number; // 1-based, média
  acimaDoEsperado: boolean;
  /** chance de ficar nessa posição ou além (melhor se acima, pior se abaixo) */
  cauda: number;
  exata: number;
  pts: number;
  ptsEsperados: number;
}

export interface Analise {
  /** fração dos campeonatos simulados menos prováveis que o do usuário */
  percentil: number;
  veredito: 0 | 1 | 2 | 3; // muito plausível, plausível, improvável, muito improvável
  campeao: string;
  chanceCampeao: number;
  rebaixados: string[];
  chanceRebaixados: number;
  g7: string[];
  chanceG7: number;
  surpresas: Surpresa[];
  zebras: Zebra[];
}

/**
 * Compara a tabela final simulada pelo usuário com o modelo.
 * `final`: classificação com todos os jogos preenchidos; `tabelaReal`: classificação real de hoje;
 * `base`: simulação do modelo puro com `detalhado: true`.
 */
export function analisar(
  final: Linha[],
  tabelaReal: Linha[],
  restantes: Jogo[],
  forcados: Record<string, Placar>,
  base: ResultadoSimulacao,
): Analise {
  const F = forcas(tabelaReal);
  const I = new Map(base.clubes.map((c, i) => [c, i]));
  const n = final.length;

  // 1) vitória/empate/derrota de cada jogo: log-verossimilhança comparada com a de um campeonato típico
  let logL = 0,
    mu = 0,
    vr = 0;
  const zebras: Zebra[] = [];
  for (const g of restantes) {
    const f = forcados[g.id];
    if (!f) continue;
    const P = probResultado(...golsEsperados(F, g.mandante, g.visitante));
    const o = f[0] > f[1] ? 0 : f[0] === f[1] ? 1 : 2;
    logL += Math.log(P[o]);
    const e = P.reduce((s, p) => s + p * Math.log(p), 0);
    const e2 = P.reduce((s, p) => s + p * Math.log(p) ** 2, 0);
    mu += e;
    vr += e2 - e * e;
    zebras.push({ jogo: g, placar: f, resultado: o, chance: P[o] });
  }
  const percentil = vr > 0 ? normalAcumulada((logL - mu) / Math.sqrt(vr)) : 0.5;
  const veredito = percentil >= 0.5 ? 0 : percentil >= 0.2 ? 1 : percentil >= 0.05 ? 2 : 3;

  // 2) campeão, G7 e Z4 exatos
  const chaveGrupo = (linhas: Linha[]) => linhas.map((r) => I.get(r.clube)!).sort((a, b) => a - b).join(",");
  const rebaixadas = final.slice(n - CORTES.rebaixados);
  const g7 = final.slice(0, CORTES.lib);
  const campeao = final[0].clube;

  // 3) cada time: chance de terminar ali ou além
  const surpresas: Surpresa[] = final.map((t, p) => {
    const i = I.get(t.clube)!;
    const r = base.pos[i];
    const esperada = r.reduce((s, v, q) => s + v * q, 0);
    const acima = p <= esperada;
    const cauda = acima ? r.slice(0, p + 1).reduce((s, v) => s + v, 0) : r.slice(p).reduce((s, v) => s + v, 0);
    const dist = base.ptsDist?.[i] ?? {};
    let tot = 0,
      soma = 0;
    for (const [pts, c] of Object.entries(dist)) {
      tot += c;
      soma += c * +pts;
    }
    return {
      clube: t.clube,
      posicao: p,
      posEsperada: esperada + 1,
      acimaDoEsperado: acima,
      cauda,
      exata: r[p],
      pts: t.p,
      ptsEsperados: tot ? soma / tot : base.pts[i],
    };
  });

  return {
    percentil,
    veredito,
    campeao,
    chanceCampeao: base.pos[I.get(campeao)!][0],
    rebaixados: rebaixadas.map((r) => r.clube),
    chanceRebaixados: (base.z4?.[chaveGrupo(rebaixadas)] ?? 0) / base.n,
    g7: g7.map((r) => r.clube),
    chanceG7: (base.lib?.[chaveGrupo(g7)] ?? 0) / base.n,
    surpresas,
    zebras: zebras.sort((a, b) => a.chance - b.chance),
  };
}
