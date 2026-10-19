import { describe, expect, it } from "vitest";
import { montarRanking, pontosDoPalpite, rankingDoPeriodo } from "../src/modelo/bolao";

describe("pontos do bolão", () => {
  it("10 / 7 / 5 / 0", () => {
    expect(pontosDoPalpite({ gm: 2, gv: 1 }, { gm: 2, gv: 1 })).toBe(10);
    expect(pontosDoPalpite({ gm: 3, gv: 2 }, { gm: 2, gv: 1 })).toBe(7);
    expect(pontosDoPalpite({ gm: 3, gv: 0 }, { gm: 2, gv: 1 })).toBe(5);
    expect(pontosDoPalpite({ gm: 0, gv: 1 }, { gm: 2, gv: 1 })).toBe(0);
    expect(pontosDoPalpite({ gm: 1, gv: 1 }, { gm: 0, gv: 0 })).toBe(5);
    expect(pontosDoPalpite({ gm: 0, gv: 0 }, { gm: 0, gv: 0 })).toBe(10);
    expect(pontosDoPalpite({ gm: 1, gv: 1 }, { gm: 2, gv: 1 })).toBe(0);
  });

  it("ranking soma só jogos encerrados e desempata por exatos", () => {
    const r = montarRanking(
      [
        { uid: "a", jogo: "1", gm: 2, gv: 1 },
        { uid: "a", jogo: "2", gm: 0, gv: 0 },
        { uid: "b", jogo: "1", gm: 1, gv: 0 },
        { uid: "b", jogo: "2", gm: 1, gv: 1 },
        { uid: "b", jogo: "3", gm: 1, gv: 0 }, // jogo ainda sem resultado
      ],
      [
        { id: "1", rodada: 31, gm: 2, gv: 1 },
        { id: "2", rodada: 31, gm: 1, gv: 1 },
      ],
      { a: { nome: "Ana" }, b: { nome: "Bia" } },
    );
    expect(r.map((l) => [l.nome, l.pontos, l.exatos, l.palpites])).toEqual([
      ["Bia", 17, 1, 2],
      ["Ana", 15, 1, 2],
    ]);
    expect(r[0].rodadas[31]).toBe(17);
    expect(r[0].porRodada[31]).toEqual([17, 1, 1, 2]);
  });

  it("desempate: exatos, depois saldos, depois cadastro mais antigo; palpitar mais não pune", () => {
    const res = [
      { id: "1", rodada: 1, gm: 2, gv: 0 },
      { id: "2", rodada: 1, gm: 1, gv: 1 },
      { id: "3", rodada: 2, gm: 0, gv: 1 },
    ];
    const r = montarRanking(
      [
        // Ana: 7 (saldo) + 5 + 0 = 12, 0 exatos, 1 saldo, 3 palpites
        { uid: "a", jogo: "1", gm: 3, gv: 1 },
        { uid: "a", jogo: "2", gm: 0, gv: 0 },
        { uid: "a", jogo: "3", gm: 2, gv: 0 },
        // Bia: 5 + 5 = 10; Caio: 7 + 5 = 12 com 1 saldo, empata com Ana mas se cadastrou depois
        { uid: "b", jogo: "1", gm: 1, gv: 0 },
        { uid: "b", jogo: "2", gm: 2, gv: 2 },
        { uid: "c", jogo: "1", gm: 4, gv: 2 },
        { uid: "c", jogo: "2", gm: 0, gv: 0 },
      ],
      res,
      { a: { nome: "Ana", desde: 100 }, b: { nome: "Bia", desde: 50 }, c: { nome: "Caio", desde: 200 } },
    );
    expect(r.map((l) => [l.nome, l.pontos, l.saldos])).toEqual([
      ["Ana", 12, 1],
      ["Caio", 12, 1],
      ["Bia", 10, 0],
    ]);
  });

  it("ranking de rodada e de turno saem do ranking da temporada", () => {
    const res = [
      { id: "1", rodada: 19, gm: 1, gv: 0 },
      { id: "2", rodada: 20, gm: 2, gv: 2 },
    ];
    const r = montarRanking(
      [
        { uid: "a", jogo: "1", gm: 1, gv: 0 },
        { uid: "b", jogo: "1", gm: 2, gv: 1 },
        { uid: "b", jogo: "2", gm: 2, gv: 2 },
      ],
      res,
      { a: { nome: "Ana" }, b: { nome: "Bia" } },
    );
    expect(rankingDoPeriodo(r, (x) => x <= 19).map((l) => [l.nome, l.pontos, l.exatos])).toEqual([
      ["Ana", 10, 1],
      ["Bia", 7, 0],
    ]);
    // 2º turno: só quem palpitou nele
    expect(rankingDoPeriodo(r, (x) => x >= 20).map((l) => [l.nome, l.pontos])).toEqual([["Bia", 10]]);
    // ranking gravado no formato antigo (sem porRodada) ainda funciona
    const antigo = r.map(({ porRodada: _, ...l }) => l) as unknown as typeof r;
    expect(rankingDoPeriodo(antigo, (x) => x === 20).map((l) => [l.nome, l.pontos])).toEqual([["Bia", 10]]);
  });
});
