import { describe, expect, it } from "vitest";
import { lerPlacares } from "../src/aovivo";

const ev = (st: string, m: string, v: string, gm: string, gv: string, clock = "31'", completed = false) => ({
  status: { displayClock: clock, type: { name: st, completed } },
  competitions: [{ competitors: [
    { homeAway: "home" as const, score: gm, team: { displayName: m } },
    { homeAway: "away" as const, score: gv, team: { displayName: v } },
  ] }],
});

describe("placar ao vivo da ESPN", () => {
  it("lê jogos em andamento, intervalo e encerrados; ignora os que não começaram", () => {
    const ps = lerPlacares({ events: [
      ev("STATUS_FIRST_HALF", "Fluminense", "Santos", "1", "0"),
      ev("STATUS_HALFTIME", "Grêmio", "Cruzeiro", "1", "1", "45'"),
      ev("STATUS_FULL_TIME", "Mirassol", "Internacional", "2", "0", "90'", true),
      ev("STATUS_SCHEDULED", "Bahia", "Flamengo", "0", "0", "0'"),
    ] });
    expect(ps).toEqual([
      { mandante: "Fluminense", visitante: "Santos", gm: 1, gv: 0, fim: false, minuto: "31'", lances: [] },
      { mandante: "Grêmio", visitante: "Cruzeiro", gm: 1, gv: 1, fim: false, minuto: "Intervalo", lances: [] },
      { mandante: "Mirassol", visitante: "Internacional", gm: 2, gv: 0, fim: true, minuto: "90'", lances: [] },
    ]);
  });

  it("lê gols (inclusive contra) e cartões, com acréscimos", () => {
    const e = ev("STATUS_SECOND_HALF", "Fluminense", "Santos", "2", "0");
    (e.competitions[0].competitors[0].team as { id?: string }).id = "1";
    (e.competitions[0] as unknown as { details: unknown[] }).details = [
      { clock: { displayValue: "45'+2'" }, team: { id: "1" }, scoringPlay: true, athletesInvolved: [{ displayName: "Cano" }] },
      { clock: { displayValue: "60'" }, team: { id: "2" }, scoringPlay: true, ownGoal: true, athletesInvolved: [{ displayName: "Zagueiro" }] },
      { clock: { displayValue: "70'" }, team: { id: "2" }, yellowCard: true, athletesInvolved: [{ displayName: "Volante" }] },
    ];
    expect(lerPlacares({ events: [e] })[0].lances).toEqual([
      { min: 47, rotulo: "45'+2'", tipo: "gol", jogador: "Cano", lado: "m" },
      { min: 60, rotulo: "60'", tipo: "contra", jogador: "Zagueiro", lado: "m" },
      { min: 70, rotulo: "70'", tipo: "amarelo", jogador: "Volante", lado: "v" },
    ]);
  });
});
