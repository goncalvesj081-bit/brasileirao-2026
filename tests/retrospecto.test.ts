import { describe, expect, it } from "vitest";
import { lerTemporada } from "../scripts/lib/retrospecto-espn";
import { retrospecto } from "../src/modelo/retrospecto";

const ev = (id: string, date: string, m: string, v: string, gm: string, gv: string, st = "STATUS_FULL_TIME") => ({
  id,
  date,
  season: { slug: "2025-brasileiro-serie-a" },
  status: { type: { name: st, completed: st === "STATUS_FULL_TIME" } },
  competitions: [{ competitors: [
    { homeAway: "home" as const, score: gm, team: { displayName: m } },
    { homeAway: "away" as const, score: gv, team: { displayName: v } },
  ] }],
});

describe("retrospecto", () => {
  it("lê a temporada, só clubes da Série A atual, sem confundir o América com o Atlético-MG", () => {
    const j = lerTemporada(2025, [
      ev("1", "2025-05-01T00:00Z", "Flamengo", "Bahia", "2", "1"),
      ev("2", "2025-05-02T00:00Z", "América Mineiro", "Flamengo", "1", "1"),
      ev("3", "2025-05-03T00:00Z", "Atlético Mineiro", "Red Bull Bragantino", "0", "0"),
      ev("1", "2025-05-01T00:00Z", "Flamengo", "Bahia", "2", "1"),
    ]);
    expect(j).toEqual([
      [2025, "2025-05-01T00:00Z", "Flamengo", "Bahia", 2, 1],
      [2025, "2025-05-03T00:00Z", "Atlético-MG", "Bragantino", 0, 0],
    ]);
  });

  it("soma vitórias, empates e derrotas do ponto de vista do primeiro clube, com os jogos deste ano", () => {
    const r = retrospecto(
      "Bahia",
      "Flamengo",
      [[2025, "2025-05-01T00:00Z", "Flamengo", "Bahia", 2, 1], [2024, "2024-08-01T00:00Z", "Bahia", "Flamengo", 1, 1]],
      [{ id: "x", rodada: 5, mandante: "Flamengo", visitante: "Bahia", data: "2026-04-01T00:00Z", gm: 0, gv: 1 }],
      2026,
    );
    expect([r.v, r.e, r.d, r.jogos.length]).toEqual([1, 1, 1, 3]);
    expect(r.jogos[0][0]).toBe(2024);
  });
});
