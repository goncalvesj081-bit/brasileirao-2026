import { describe, expect, it } from "vitest";
import { probResultado, sortearPlacar } from "../src/modelo/poisson";
import { criarRng } from "../src/modelo/rng";

describe("placar com ajuste de empates", () => {
  it("o sorteio segue as mesmas chances da conta exata", () => {
    const [lm, lv] = [1.5, 1.1];
    const rand = criarRng(7);
    const n = 200000;
    const c = [0, 0, 0];
    for (let k = 0; k < n; k++) {
      const [a, b] = sortearPlacar(lm, lv, Math.exp(-lm), Math.exp(-lv), rand);
      c[a > b ? 0 : a === b ? 1 : 2]++;
    }
    const p = probResultado(lm, lv);
    for (let i = 0; i < 3; i++) expect(Math.abs(c[i] / n - p[i])).toBeLessThan(0.004);
  });
  it("empate fica mais provável que no Poisson puro", () => {
    expect(probResultado(1.3, 1.1)[1]).toBeGreaterThan(0.27);
  });
});
