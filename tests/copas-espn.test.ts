import { describe, expect, it } from "vitest";
import { montarCopa, type EspnEvento } from "../scripts/lib/copas-espn";

const ev = (
  fase: string,
  data: string,
  casa: string,
  gc: number | null,
  fora: string,
  gf: number | null,
  o: { avancaCasa?: boolean; avancaFora?: boolean } = {},
): EspnEvento => ({
  date: data,
  season: { slug: fase },
  status: { type: { name: gc === null ? "STATUS_SCHEDULED" : "STATUS_FULL_TIME", completed: gc !== null } },
  competitions: [
    {
      competitors: [
        { homeAway: "home", score: String(gc ?? 0), advance: o.avancaCasa ?? null, team: { displayName: casa } },
        { homeAway: "away", score: String(gf ?? 0), advance: o.avancaFora ?? null, team: { displayName: fora } },
      ],
    },
  ],
});

describe("situação das copas pela ESPN", () => {
  it("semifinal com a ida jogada: saldo de quem mandou a ida e falta a volta na casa do outro", () => {
    const c = montarCopa(
      [
        ev("quarterfinals", "2026-09-20", "Palmeiras", 2, "Santos", 0, { avancaCasa: true }),
        ev("semifinals", "2026-10-14", "Fluminense", 1, "Palmeiras", 2),
        ev("semifinals", "2026-10-21", "Palmeiras", null, "Fluminense", null),
        ev("final", "2026-11-28", "TBD Home", null, "TBD Away", null),
      ],
      "Libertadores",
    )!;
    expect(c.confrontos).toEqual([{ a: "Fluminense", b: "Palmeiras", saldoA: -1, faltam: ["b"] }]);
    expect(c.campeao).toBeUndefined();
  });

  it("usa os nomes do site para clubes da Série A (Vasco da Gama vira Vasco)", () => {
    const c = montarCopa([ev("semifinals", "2026-10-13", "Boca Juniors", 0, "Vasco da Gama", 1)], "Sul-Americana")!;
    expect(c.confrontos[0]).toMatchObject({ a: "Boca Juniors", b: "Vasco", saldoA: -1, faltam: ["b"] });
  });

  it("confronto decidido nos pênaltis fica com quem a ESPN marcou como classificado", () => {
    const c = montarCopa(
      [
        ev("semifinals", "2026-11-01", "Palmeiras", 1, "Vasco da Gama", 0),
        ev("semifinals", "2026-11-08", "Vasco da Gama", 1, "Palmeiras", 0, { avancaCasa: true }),
        ev("semifinals", "2026-11-01", "Grêmio", 0, "Atlético-MG", 0),
        ev("semifinals", "2026-11-07", "Atlético-MG", null, "Grêmio", null),
      ],
      "Copa do Brasil",
    )!;
    expect(c.confrontos).toEqual([
      { a: "Palmeiras", b: "Vasco", saldoA: 0, faltam: [], vencedor: "Vasco" },
      { a: "Grêmio", b: "Atlético-MG", saldoA: 0, faltam: ["b"] },
    ]);
  });

  it("final definida e por jogar vira um confronto em campo neutro", () => {
    const c = montarCopa(
      [ev("semifinals", "2026-11-08", "Vasco da Gama", 1, "Palmeiras", 0, { avancaCasa: true }), ev("final", "2026-12-06", "Vasco da Gama", null, "Grêmio", null)],
      "Copa do Brasil",
    )!;
    expect(c.confrontos).toEqual([{ a: "Vasco", b: "Grêmio", saldoA: 0, faltam: ["neutro"] }]);
  });

  it("final jogada define campeão e vice", () => {
    const c = montarCopa([ev("final", "2026-12-06", "Vasco da Gama", 0, "Grêmio", 2, { avancaFora: true })], "Copa do Brasil")!;
    expect(c.campeao).toBe("Grêmio");
    expect(c.vice).toBe("Vasco");
  });

  it("sem mata-mata devolve nada (quem chama mantém o arquivo anterior)", () => {
    expect(montarCopa([ev("group-stage", "2026-05-01", "A", 1, "B", 0)], "X")).toBeNull();
  });
});
