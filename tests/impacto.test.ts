import { describe, expect, it } from "vitest";
import { significativo } from "../src/modelo/impacto";
import type { EfeitoJogo } from "../src/modelo/simular";

const efeito = (n: [number, number, number]) => ({ id: "x", n, c: [], l: [], r: [] }) as EfeitoJogo;

describe("significativo", () => {
  it("descarta diferença do tamanho do acaso", () => {
    // 1,6 ponto com ~4 a 10 mil casos por resultado: menos de 3 desvios
    expect(significativo(efeito([10000, 6000, 4000]), [0.624, 0.62, 0.608])).toBe(false);
  });
  it("aceita diferença grande", () => {
    expect(significativo(efeito([10000, 6000, 4000]), [0.695, 0.6, 0.469])).toBe(true);
  });
  it("resultado que nunca saiu não conta", () => {
    expect(significativo(efeito([10000, 0, 4000]), [0.6, 0.9, 0.6])).toBe(false);
  });
});
