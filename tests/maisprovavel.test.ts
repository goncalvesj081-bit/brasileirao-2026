import { describe, expect, it } from "vitest";
import { campeonatoMaisProvavel } from "../src/modelo/maisprovavel";
import { linhaVazia } from "../src/modelo/classificacao";
import { criarRng } from "../src/modelo/rng";

describe("campeonato mais provável", () => {
  it("preenche todos os jogos abertos e prefere a tabela que bate com as chances", () => {
    const base = ["A", "B"].map((c, i) => ({ ...linhaVazia(c), p: i === 0 ? 3 : 0, j: 1, gp: i === 0 ? 2 : 1, gc: i === 0 ? 1 : 2 }));
    const abertos = [1, 2, 3, 4].map((k) => ({ id: String(k), rodada: 2, mandante: k % 2 ? "A" : "B", visitante: k % 2 ? "B" : "A", data: null }));
    // A termina em 1º em 90% dos campeonatos
    const pos = [
      [0.9, 0.1],
      [0.1, 0.9],
    ];
    const r = campeonatoMaisProvavel(base, abertos, pos, 200, criarRng(3));
    expect(r.size).toBe(4);
    let pa = 3,
      pb = 0;
    for (const g of abertos) {
      const [m, v] = r.get(g.id)!;
      const [a, b] = g.mandante === "A" ? [m, v] : [v, m];
      if (a > b) pa += 3;
      else if (b > a) pb += 3;
      else (pa++, pb++);
    }
    expect(pa).toBeGreaterThanOrEqual(pb);
  });
});
