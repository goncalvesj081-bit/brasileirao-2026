import { describe, expect, it } from "vitest";
import { faixaPossivel, maximos, metaTopK } from "../src/modelo/matematica";
import type { Jogo, Linha } from "../src/modelo/tipos";

const L = (clube: string, p: number): Linha => ({ clube, p, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 });
const J = (m: string, v: string): Jogo => ({ id: m + v, rodada: 38, mandante: m, visitante: v, data: null });

describe("matemática", () => {
  // 4 clubes, 1 jogo para cada: A x B e C x D
  const tab = [L("A", 10), L("B", 8), L("C", 6), L("D", 2)];
  const rest = [J("A", "B"), J("C", "D")];
  const max = maximos(tab, rest);

  it("título: A precisa de 2 pontos para não depender de ninguém (B chega a 11)", () => {
    const m = metaTopK("A", 1, tab, max);
    expect(m).toEqual({ garantido: false, possivel: true, faltam: 2 });
    expect(metaTopK("C", 1, tab, max).possivel).toBe(false); // C chega a 9, A já tem 10
    // C chega a 9: passa o B (8), mas não garante o 2º (B pode chegar a 11)
    expect(metaTopK("C", 2, tab, max)).toEqual({ garantido: false, possivel: true, faltam: null });
  });

  it("faixa de posição possível", () => {
    expect(faixaPossivel("A", tab, max)).toEqual([1, 2]);
    expect(faixaPossivel("C", tab, max)).toEqual([2, 3]); // o D chega no máximo a 5
    expect(faixaPossivel("D", tab, max)).toEqual([4, 4]);
  });
});

import { medirAcerto, type Previsao } from "../src/modelo/acerto";
describe("acerto do modelo", () => {
  it("conta favorito, Brier e faixas", () => {
    const j = { id: "1", rodada: 2, mandante: "A", visitante: "B", data: null, gm: 1, gv: 0 };
    const prev: Previsao[] = [
      { jogo: j, p: [0.6, 0.25, 0.15], deu: 0 },
      { jogo: j, p: [0.5, 0.3, 0.2], deu: 2 },
    ];
    const a = medirAcerto(prev);
    expect(a.favorito).toBe(0.5);
    expect(a.brier).toBeCloseTo(((0.4 ** 2 + 0.25 ** 2 + 0.15 ** 2) + (0.5 ** 2 + 0.3 ** 2 + 0.8 ** 2)) / 2, 6);
    expect(a.faixas.find((f) => f.de === 0.6)?.aconteceu).toBe(1);
  });
});
