import { describe, expect, it } from "vitest";
import { certezas, ULTIMA_LIB, ULTIMA_SULA } from "../src/modelo/matematica";
import { chancesSim, QUASE_CERTO, type ResultadoSimulacao } from "../src/modelo/simular";
import type { Jogo, Linha } from "../src/modelo/tipos";
import { pct } from "../src/ui/formato";

const linha = (clube: string, p: number): Linha => ({ clube, p, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 });
const jogo = (m: string, v: string, i: number): Jogo => ({ id: String(i), rodada: 33 + i, mandante: m, visitante: v, data: null });

// 20 clubes; o último ("Z") tem 21 pontos e 6 jogos, o 16º tem 35: ainda dá para escapar (39 > 35)
const nomes = "ABCDEFGHIJKLMNOPQRSZ".split("");
const pts = [70, 70, 54, 54, 54, 50, 50, 47, 44, 43, 39, 39, 38, 38, 37, 35, 34, 33, 26, 21];
const tabela = nomes.map((c, i) => linha(c, pts[i]));
const restantes = [0, 1, 2, 3, 4, 5].map((i) => jogo("Z", nomes[i], i));

/** Resultado de simulação de mentira: cada clube termina sempre na própria posição. */
function simFixa(): ResultadoSimulacao {
  const pos = tabela.map((_, i) => tabela.map((__, p) => (p === i ? 1 : 0)));
  const um = (f: (i: number) => boolean) => tabela.map((_, i) => (f(i) ? 1 : 0));
  return {
    n: 1000,
    clubes: nomes,
    pos,
    pts,
    porPontos: [],
    vagaLib: um((i) => i < 5),
    vagaSula: um((i) => i >= 5 && i < 11),
    posLib: um((i) => i < 5),
    posSula: um((i) => i >= 5 && i < 11),
    corteLib: {},
    corteSula: {},
    certezas: certezas(tabela, restantes, 4),
  };
}

describe("certezas da matemática", () => {
  it("cortes máximos das copas", () => {
    expect(ULTIMA_LIB).toBe(9);
    expect(ULTIMA_SULA).toBe(15);
  });

  it("quem ainda pode escapar não aparece com 100% de queda", () => {
    const ch = chancesSim(simFixa(), nomes.indexOf("Z"));
    expect(ch.r).toBe(QUASE_CERTO);
    expect(pct(ch.r)).toBe(">99,9%");
    // título e Libertadores já são impossíveis: aí 0% é verdade
    expect(ch.c).toBe(0);
    expect(ch.l).toBe(0);
  });

  it("quem ainda pode cair não aparece com 0% de queda; quem já não cai, sim", () => {
    // só o Z joga: chega a 39 e pode passar o 16º (35), mas não tira dois clubes do 15º (37) para baixo
    expect(pct(chancesSim(simFixa(), nomes.indexOf("P")).r)).toBe("<0,1%");
    expect(pct(chancesSim(simFixa(), nomes.indexOf("O")).r)).toBe("0%");
  });

  it("o que a matemática garante vira 100% mesmo que a simulação diga menos", () => {
    const res = simFixa();
    res.pos[0] = res.pos[0].map((_, p) => (p === 0 ? 0.998 : p === 1 ? 0.002 : 0));
    const m = certezas([linha("A", 90), ...tabela.slice(1)], restantes, 4);
    expect(chancesSim({ ...res, certezas: m }, 0).c).toBe(1);
  });

  it("sem certezas (resultado antigo), os números passam como estão", () => {
    const { certezas: _, ...res } = simFixa();
    expect(chancesSim(res as ResultadoSimulacao, nomes.indexOf("Z")).r).toBe(1);
  });
});
