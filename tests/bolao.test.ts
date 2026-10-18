import { describe, expect, it } from "vitest";
import { montarRanking, pontosDoPalpite } from "../src/modelo/bolao";

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
  });
});
