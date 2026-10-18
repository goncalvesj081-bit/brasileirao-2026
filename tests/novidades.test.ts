import { datasPendentes, type EspnEvento } from "../scripts/lib/copas-espn";
import { ehDiaDeJogo } from "../scripts/lib/agenda";
import { describe, expect, it } from "vitest";
import { classificacao } from "../src/modelo/classificacao";
import { decidir, golsPelasForcas } from "../src/modelo/copas";
import { forcas } from "../src/modelo/forcas";
import { comoSomar, quantoFalta, type ObjetivosPorPontos } from "../src/modelo/quantofalta";
import { criarRng } from "../src/modelo/rng";
import { simular } from "../src/modelo/simular";
import { linhaVazia } from "../src/modelo/classificacao";
import { NOMES, disputar, tabelaCompleta } from "./ajuda";

describe("quanto falta", () => {
  // pontos finais → [vezes, campeão, Liberta, Sula, queda]
  const dados: ObjetivosPorPontos = {
    50: [100, 0, 20, 70, 0],
    52: [100, 0, 50, 50, 0],
    54: [100, 0, 85, 15, 0],
    55: [100, 0, 92, 8, 0],
    57: [100, 0, 97, 3, 0],
    60: [100, 0, 100, 0, 0],
    61: [5, 0, 5, 0, 0], // poucas simulações: ignorada
  };

  it("menor pontuação a partir da qual a chance fica sempre acima do alvo", () => {
    expect(quantoFalta(dados, "libertadores", 0.9, 48, 7)).toEqual({ tipo: "meta", meta: { pontos: 55, faltam: 7, jogos: 7, chance: 0.92 } });
    expect(quantoFalta(dados, "libertadores", 0.5, 48, 7)).toMatchObject({ meta: { pontos: 52, faltam: 4 } });
  });

  it("já garantido quando os pontos de hoje bastam", () => {
    expect(quantoFalta(dados, "libertadores", 0.9, 56, 3)).toEqual({ tipo: "garantido" });
  });

  it("não alcança quando nem a maior pontuação chega ao alvo", () => {
    expect(quantoFalta({ 40: [100, 0, 0, 0, 60], 43: [100, 0, 0, 0, 30] }, "fugir", 0.9, 37, 2)).toEqual({ tipo: "nao-alcanca", chanceMaxima: 0.7 });
  });

  it("fugir da queda usa o risco", () => {
    const q: ObjetivosPorPontos = { 38: [100, 0, 0, 0, 60], 41: [100, 0, 0, 0, 20], 43: [100, 0, 0, 0, 5], 45: [100, 0, 0, 0, 0] };
    expect(quantoFalta(q, "fugir", 0.9, 36, 5)).toMatchObject({ meta: { pontos: 43, faltam: 7 } });
  });

  it("diz como somar os pontos", () => {
    expect(comoSomar(13)).toBe("4 vitórias e 1 empate");
    expect(comoSomar(3)).toBe("1 vitória");
    expect(comoSomar(2)).toBe("2 empates");
  });
});

describe("efeito de cada jogo", () => {
  const { resultados, restantes } = disputar(tabelaCompleta(), 33);
  const tabela = classificacao(NOMES, resultados);
  const s = simular({ tabela, restantes, n: 3000, rand: criarRng(11), detalhado: true });

  it("guarda um registro por jogo restante, somando todas as simulações", () => {
    expect(s.porJogo).toHaveLength(restantes.length);
    for (const E of s.porJogo!) expect(E.n[0] + E.n[1] + E.n[2]).toBe(3000);
  });

  it("condicional bate com o total: média ponderada das três hipóteses = chance geral", () => {
    const E = s.porJogo![0];
    for (let i = 0; i < tabela.length; i++) {
      const total = (E.c[0][i] + E.c[1][i] + E.c[2][i]) / 3000;
      expect(total).toBeCloseTo(s.pos[i][0], 10);
    }
  });

  it("objetivos por pontuação somam as simulações de cada clube", () => {
    for (const m of s.objetivosPorPontos!) expect(Object.values(m).reduce((a, b) => a + b[0], 0)).toBe(3000);
  });
});

describe("força nas copas", () => {
  it("time bem mais forte passa mais vezes num confronto igual", () => {
    const T = [
      { ...linhaVazia("Forte"), j: 30, gp: 70, gc: 15 },
      { ...linhaVazia("Fraco"), j: 30, gp: 20, gc: 60 },
      { ...linhaVazia("Médio"), j: 30, gp: 40, gc: 40 },
    ];
    const gols = golsPelasForcas(forcas(T));
    const rand = criarRng(3);
    let forte = 0;
    for (let k = 0; k < 4000; k++) if (decidir({ a: "Forte", b: "Fraco", saldoA: 0, faltam: ["a", "b"] }, rand, gols) === "Forte") forte++;
    expect(forte / 4000).toBeGreaterThan(0.7);
  });
});


describe("dias de jogo das copas", () => {
  const ev = (slug: string, date: string, nome: string): EspnEvento => ({
    date,
    season: { slug },
    status: { type: { name: nome, completed: nome === "STATUS_FULL_TIME" } },
    competitions: [{ competitors: [] }],
  });

  it("guarda só jogos de mata-mata ainda por disputar, inclusive finais a definir", () => {
    const d = datasPendentes([
      ev("semifinals", "2026-10-14T00:30Z", "STATUS_FULL_TIME"),
      ev("semifinals", "2026-10-21T00:30Z", "STATUS_SCHEDULED"),
      ev("final", "2026-11-28T20:00Z", "STATUS_SCHEDULED"),
      ev("group-stage", "2026-10-21T00:30Z", "STATUS_SCHEDULED"),
    ]);
    expect(d).toEqual(["2026-10-21T00:30Z", "2026-11-28T20:00Z"]);
  });

  it("jogo de copa às 21h30 de Brasília liga a atualização naquele dia", () => {
    const daCopa = [{ id: "c", rodada: 0, mandante: "", visitante: "", data: "2026-10-21T00:30:00Z" }];
    expect(ehDiaDeJogo(daCopa, false, Date.parse("2026-10-20T15:00:00Z"))).toBe(true);
    expect(ehDiaDeJogo(daCopa, false, Date.parse("2026-10-22T15:00:00Z"))).toBe(false);
  });
});
