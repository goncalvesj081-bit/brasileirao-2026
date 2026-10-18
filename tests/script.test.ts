import { describe, expect, it } from "vitest";
import { ehDiaDeJogo } from "../scripts/lib/agenda";
import { criarTradutor, normalizarPartidas } from "../scripts/lib/normalizar";
import type { ApiPartida } from "../scripts/lib/api";
import type { Jogo } from "../src/modelo/tipos";

const jogo = (data: string | null): Jogo => ({ id: "1", rodada: 1, mandante: "Bahia", visitante: "Remo", data });

describe("agenda", () => {
  const agora = Date.parse("2026-10-18T13:00:00Z"); // 10h em Brasília
  it("roda quando há jogo hoje no horário de Brasília", () => {
    expect(ehDiaDeJogo([jogo("2026-10-18T22:30:00Z")], false, agora)).toBe(true);
  });
  it("não roda quando o próximo jogo é amanhã", () => {
    expect(ehDiaDeJogo([jogo("2026-10-19T23:00:00Z")], false, agora)).toBe(false);
    expect(ehDiaDeJogo([jogo(null)], false, agora)).toBe(false);
  });
  it("jogo das 21h30 de Brasília (00h30 UTC do dia seguinte) conta como hoje", () => {
    expect(ehDiaDeJogo([jogo("2026-10-19T00:30:00Z")], false, agora)).toBe(true);
  });
  it("logo depois da meia-noite, jogo que começou à noite ainda conta", () => {
    expect(ehDiaDeJogo([jogo("2026-10-19T00:30:00Z")], false, Date.parse("2026-10-19T03:30:00Z"))).toBe(true);
  });
  it("jogo em andamento sempre roda", () => {
    expect(ehDiaDeJogo([], true, agora)).toBe(true);
  });
});

const partida = (o: Partial<ApiPartida>): ApiPartida => ({
  id: 1,
  utcDate: "2026-10-18T19:00:00Z",
  status: "FINISHED",
  matchday: 31,
  homeTeam: { id: 1, name: "Fluminense FC", shortName: "Fluminense" },
  awayTeam: { id: 2, name: "Santos FC", shortName: "Santos" },
  score: { fullTime: { home: 2, away: 1 } },
  ...o,
});

describe("normalização da API", () => {
  it("separa disputados e restantes, e marca jogo ao vivo", () => {
    const t = criarTradutor();
    const r = normalizarPartidas(
      [
        partida({}),
        partida({ id: 2, status: "IN_PLAY", score: { fullTime: { home: 0, away: 0 } } }),
        partida({ id: 3, status: "POSTPONED", score: { fullTime: { home: null, away: null } } }),
        partida({ id: 4, status: "TIMED", score: { fullTime: { home: null, away: null } } }),
      ],
      t.nome,
    );
    t.conferir();
    expect(r.resultados).toHaveLength(1);
    expect(r.resultados[0]).toMatchObject({ mandante: "Fluminense", visitante: "Santos", gm: 2, gv: 1, rodada: 31 });
    expect(r.restantes.map((g) => g.id)).toEqual(["2", "4", "3"]);
    expect(r.restantes.find((g) => g.id === "3")!.data).toBe(null);
    expect(r.aoVivo).toBe(true);
  });

  it("falha listando os nomes de clube que não reconhece", () => {
    const t = criarTradutor();
    normalizarPartidas([partida({ homeTeam: { id: 9, name: "Sport Club do Recife", shortName: "Sport" } })], t.nome);
    expect(() => t.conferir()).toThrow(/Sport Club do Recife/);
  });
});
