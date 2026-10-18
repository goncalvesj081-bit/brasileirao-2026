import { describe, expect, it } from "vitest";
import { decidir, distribuirVagas, sortearCopa, type Copa, type Titulos } from "../src/modelo/copas";
import { criarRng } from "../src/modelo/rng";
import { classificacao } from "../src/modelo/classificacao";
import { simular } from "../src/modelo/simular";
import { NOMES, disputar, tabelaCompleta } from "./ajuda";

// 20 clubes fictícios: "C1" é o 1º colocado, "C20" o último
const ordem = Array.from({ length: 20 }, (_, i) => i);
const indice = (c: string) => (/^C\d+$/.test(c) ? +c.slice(1) - 1 : undefined);
const pos = (s: Set<number>) => [...s].map((i) => i + 1).sort((a, b) => a - b);
const T = (o: Partial<Titulos> = {}): Titulos => ({ copaDoBrasil: null, libertadores: null, sulAmericana: null, ...o });

describe("distribuição de vagas", () => {
  it("sem copas: Libertadores até o 5º, Sul-Americana do 6º ao 11º", () => {
    const d = distribuirVagas(ordem, T(), indice, 4);
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5]);
    expect(pos(d.sula)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(d.corteLib).toBe(4);
    expect(d.corteSula).toBe(10);
  });

  it("finalistas da Copa do Brasil fora do G5 entram e o corte fica no 5º", () => {
    const d = distribuirVagas(ordem, T({ copaDoBrasil: { campeao: "C9", vice: "C12" } }), indice, 4);
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5, 9, 12]);
    // a Sula pula quem foi à Libertadores
    expect(pos(d.sula)).toEqual([6, 7, 8, 10, 11, 13]);
  });

  it("finalistas da Copa do Brasil já no G5: as duas vagas descem e vira G7", () => {
    const d = distribuirVagas(ordem, T({ copaDoBrasil: { campeao: "C1", vice: "C3" } }), indice, 4);
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(d.corteLib).toBe(6);
  });

  it("campeões da Libertadores e da Sula brasileiros e já classificados: G9", () => {
    const d = distribuirVagas(
      ordem,
      T({ copaDoBrasil: { campeao: "C1", vice: "C2" }, libertadores: "C3", sulAmericana: "C4" }),
      indice,
      4,
    );
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("time que ganha dois títulos libera uma vaga a mais", () => {
    const d = distribuirVagas(ordem, T({ copaDoBrasil: { campeao: "C2", vice: "C10" }, libertadores: "C2" }), indice, 4);
    // 8 vagas: C2 (títulos), C10 (vice) e 6 pela tabela
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5, 6, 7, 10]);
  });

  it("campeão estrangeiro não muda nada", () => {
    const d = distribuirVagas(ordem, T({ libertadores: "Estudiantes" }), indice, 4);
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5]);
  });

  it("finalista da Copa do Brasil rebaixado perde a vaga, que desce na tabela", () => {
    const d = distribuirVagas(ordem, T({ copaDoBrasil: { campeao: "C18", vice: "C8" } }), indice, 4);
    expect(pos(d.lib)).toEqual([1, 2, 3, 4, 5, 6, 8]);
    expect(d.lib.has(17)).toBe(false);
  });
});

describe("sorteio das copas", () => {
  it("saldo grande com um jogo a menos quase sempre classifica", () => {
    const rand = criarRng(1);
    let vence = 0;
    for (let i = 0; i < 4000; i++) if (decidir({ a: "A", b: "B", saldoA: 3, faltam: ["b"] }, rand) === "A") vence++;
    expect(vence / 4000).toBeGreaterThan(0.9);
  });

  it("confronto sem jogos e mando dividido fica perto de 50%", () => {
    const rand = criarRng(2);
    let vence = 0;
    for (let i = 0; i < 8000; i++) if (decidir({ a: "A", b: "B", saldoA: 0, faltam: ["a", "b"] }, rand) === "A") vence++;
    expect(vence / 8000).toBeGreaterThan(0.46);
    expect(vence / 8000).toBeLessThan(0.54);
  });

  it("semifinais levam a uma final com campeão e vice de lados diferentes da chave", () => {
    const copa: Copa = {
      nome: "X",
      finalUnica: true,
      confrontos: [
        { a: "A", b: "B", saldoA: 0, faltam: [], vencedor: "A" },
        { a: "C", b: "D", saldoA: 0, faltam: [], vencedor: "D" },
      ],
    };
    const r = sortearCopa(copa, criarRng(3))!;
    expect(new Set([r.campeao, r.vice])).toEqual(new Set(["A", "D"]));
  });

  it("copa já decidida devolve o resultado oficial", () => {
    const copa: Copa = { nome: "X", finalUnica: true, confrontos: [], campeao: "A", vice: "B" };
    expect(sortearCopa(copa, criarRng(4))).toEqual({ campeao: "A", vice: "B" });
  });
});

describe("simulação com copas", () => {
  it("as chances de Libertadores somam o total de vagas de cada campeonato", () => {
    const { resultados, restantes } = disputar(tabelaCompleta(), 30);
    const tabela = classificacao(NOMES, resultados);
    const copas = {
      atualizado: "",
      copaDoBrasil: { nome: "CdB", finalUnica: true, confrontos: [{ a: NOMES[0], b: NOMES[1], saldoA: 0, faltam: ["neutro" as const] }] },
      libertadores: { nome: "Lib", finalUnica: true, confrontos: [] },
      sulAmericana: { nome: "Sula", finalUnica: true, confrontos: [] },
    };
    const s = simular({ tabela, restantes, n: 2000, rand: criarRng(5), copas });
    // 5 pela tabela + 2 da Copa do Brasil (se um finalista cair, a vaga desce; o total é o mesmo)
    expect(s.vagaLib.reduce((a, b) => a + b, 0)).toBeCloseTo(7, 5);
    expect(s.vagaSula.reduce((a, b) => a + b, 0)).toBeCloseTo(6, 5);
    const semCopas = simular({ tabela, restantes, n: 2000, rand: criarRng(5) });
    expect(semCopas.vagaLib.reduce((a, b) => a + b, 0)).toBeCloseTo(5, 5);
  });
});
