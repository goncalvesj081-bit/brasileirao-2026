import { describe, expect, it } from "vitest";
import { conferirSerieB, normalizarSerieB, type EspnEventoB } from "../scripts/lib/serieb-espn";
import { criarRng } from "../src/modelo/rng";
import { simularSerieB } from "../src/modelo/serieb";
import type { Jogo, Resultado } from "../src/modelo/tipos";

const ev = (id: string, m: string, v: string, date: string, st = "STATUS_FULL_TIME", gm = "1", gv = "0"): EspnEventoB => ({
  id,
  date,
  season: { slug: "2026-brasileiro-serie-b" },
  status: { type: { name: st, completed: st === "STATUS_FULL_TIME" } },
  competitions: [{ competitors: [
    { homeAway: "home", score: gm, team: { displayName: m, logo: `https://a.espncdn.com/${m}.png` } },
    { homeAway: "away", score: gv, team: { displayName: v } },
  ] }],
});

describe("Série B pela ESPN", () => {
  it("separa resultados e restantes e estima a rodada", () => {
    const d = normalizarSerieB([
      ev("1", "Sport", "Ceará", "2026-03-21T19:00Z"),
      ev("2", "Avaí", "CRB", "2026-03-21T21:00Z", "STATUS_FULL_TIME", "2", "2"),
      ev("3", "Ceará", "Avaí", "2026-03-28T19:00Z", "STATUS_SCHEDULED"),
      ev("4", "CRB", "Sport", "2026-03-28T21:00Z", "STATUS_POSTPONED"),
      ev("1", "Sport", "Ceará", "2026-03-21T19:00Z"), // repetido em dois meses
    ]);
    expect(d.clubes).toEqual(["Avaí", "Ceará", "CRB", "Sport"]);
    expect(d.resultados.map((g) => [g.mandante, g.gm, g.gv, g.rodada])).toEqual([["Sport", 1, 0, 1], ["Avaí", 2, 2, 1]]);
    expect(d.restantes.map((g) => [g.id, g.rodada, g.data])).toEqual([["b3", 2, "2026-03-28T19:00Z"], ["b4", 2, null]]);
    expect(d.escudos.Sport).toBe("https://a.espncdn.com/Sport.png");
  });

  it("acusa clube sem 38 jogos", () => {
    expect(conferirSerieB({ clubes: ["A", "B"], resultados: [], restantes: [] })[0]).toMatch(/2 clubes/);
  });
});

describe("chances da Série B", () => {
  // 6 clubes, cada um com 1 jogo restante; o líder já está 9 pontos à frente
  const clubes = ["A", "B", "C", "D", "E", "F"];
  const r = (id: string, m: string, v: string, gm: number, gv: number): Resultado => ({ id, rodada: 1, mandante: m, visitante: v, data: "2026-04-01T00:00Z", gm, gv });
  const resultados: Resultado[] = [r("1", "A", "B", 3, 0), r("2", "A", "C", 3, 0), r("3", "A", "D", 3, 0), r("4", "E", "F", 1, 1)];
  const restantes: Jogo[] = [{ id: "5", rodada: 2, mandante: "B", visitante: "C", data: null }];

  it("somas fecham e o mata-mata leva exatamente dois", () => {
    const c = simularSerieB({ clubes, resultados, restantes }, 2000, criarRng(1));
    const soma = (x: number[]) => x.reduce((a, b) => a + b, 0);
    expect(soma(c.titulo)).toBeCloseTo(1, 6);
    expect(soma(c.direto)).toBeCloseTo(2, 6);
    expect(soma(c.viaPlayoff)).toBeCloseTo(2, 6);
    expect(soma(c.acesso)).toBeCloseTo(4, 6);
    expect(c.titulo[c.tabela.findIndex((t) => t.clube === "A")]).toBe(1);
    for (const i of c.tabela.keys()) expect(c.viaPlayoff[i]).toBeLessThanOrEqual(c.playoff[i] + 1e-9);
  });
});
