import { describe, expect, it } from "vitest";
import {
  classificacao,
  classificacaoUltimos,
  compararLinhas,
  jogosDoClube,
  linhaVazia,
  sequencia,
} from "../src/modelo/classificacao";
import { ordemFinal } from "../src/modelo/simular";
import type { Linha } from "../src/modelo/tipos";
import { res } from "./ajuda";

const L = (clube: string, o: Partial<Linha>): Linha => ({ ...linhaVazia(clube), ...o });

describe("classificação", () => {
  const jogos = [
    res(1, "Palmeiras", 2, 0, "Santos"),
    res(1, "Flamengo", 1, 1, "Bahia"),
    res(2, "Santos", 3, 1, "Flamengo"),
    res(2, "Bahia", 0, 1, "Palmeiras"),
  ];
  const T = classificacao(["Palmeiras", "Santos", "Flamengo", "Bahia"], jogos);
  const por = (c: string) => T.find((t) => t.clube === c)!;

  it("soma pontos, jogos, vitórias, empates, derrotas e gols", () => {
    expect(por("Palmeiras")).toEqual({ clube: "Palmeiras", p: 6, j: 2, v: 2, e: 0, d: 0, gp: 3, gc: 0 });
    expect(por("Santos")).toEqual({ clube: "Santos", p: 3, j: 2, v: 1, e: 0, d: 1, gp: 3, gc: 3 });
    expect(por("Flamengo")).toEqual({ clube: "Flamengo", p: 1, j: 2, v: 0, e: 1, d: 1, gp: 2, gc: 4 });
    expect(por("Bahia")).toEqual({ clube: "Bahia", p: 1, j: 2, v: 0, e: 1, d: 1, gp: 1, gc: 2 });
  });

  it("pontos sempre batem com 3V + E", () => {
    for (const t of T) expect(t.p).toBe(3 * t.v + t.e);
  });

  it("ordena e inclui clube sem jogos", () => {
    expect(T.map((t) => t.clube)).toEqual(["Palmeiras", "Santos", "Bahia", "Flamengo"]);
    const com = classificacao(["Palmeiras", "Santos", "Flamengo", "Bahia", "Remo"], jogos);
    expect(com.at(-1)).toEqual(linhaVazia("Remo"));
  });

  it("filtra como mandante e como visitante", () => {
    const M = classificacao(["Palmeiras", "Santos", "Flamengo", "Bahia"], jogos, (_, lado) => lado === "m");
    const V = classificacao(["Palmeiras", "Santos", "Flamengo", "Bahia"], jogos, (_, lado) => lado === "v");
    expect(M.find((t) => t.clube === "Santos")).toMatchObject({ j: 1, v: 1, gp: 3, gc: 1 });
    expect(V.find((t) => t.clube === "Santos")).toMatchObject({ j: 1, d: 1, gp: 0, gc: 2 });
    for (const c of ["Palmeiras", "Santos", "Flamengo", "Bahia"]) {
      const m = M.find((t) => t.clube === c)!,
        v = V.find((t) => t.clube === c)!,
        g = por(c);
      expect(m.p + v.p).toBe(g.p);
      expect(m.j + v.j).toBe(g.j);
    }
  });

  it("filtra turno e returno pela rodada", () => {
    const t = classificacao(["Palmeiras", "Santos"], [res(19, "Palmeiras", 1, 0, "Santos"), res(20, "Santos", 1, 0, "Palmeiras")], (g) => g.rodada <= 19);
    expect(t[0]).toMatchObject({ clube: "Palmeiras", p: 3, j: 1 });
    expect(t[1]).toMatchObject({ clube: "Santos", p: 0, j: 1 });
  });

  it("últimos n jogos de cada clube, em ordem cronológica", () => {
    const seq = [
      res(1, "Palmeiras", 0, 1, "Santos"),
      res(2, "Santos", 0, 0, "Palmeiras"),
      res(3, "Palmeiras", 2, 0, "Santos"),
    ];
    const u2 = classificacaoUltimos(["Palmeiras", "Santos"], seq, 2);
    expect(u2.find((t) => t.clube === "Palmeiras")).toMatchObject({ j: 2, p: 4 });
    expect(jogosDoClube("Palmeiras", seq).map((g) => g.res)).toEqual(["D", "E", "V"]);
  });
});

describe("desempate", () => {
  it("1º critério: pontos", () => {
    expect(compararLinhas(L("A", { p: 10, v: 1 }), L("B", { p: 9, v: 3 }))).toBeLessThan(0);
  });

  it("2º critério: vitórias", () => {
    const a = L("A", { p: 10, v: 3, e: 1, gp: 5, gc: 5 });
    const b = L("B", { p: 10, v: 2, e: 4, gp: 20, gc: 2 });
    expect(compararLinhas(a, b)).toBeLessThan(0);
  });

  it("3º critério: saldo de gols", () => {
    const a = L("A", { p: 10, v: 3, gp: 8, gc: 4 });
    const b = L("B", { p: 10, v: 3, gp: 12, gc: 9 });
    expect(compararLinhas(a, b)).toBeLessThan(0);
  });

  it("4º critério: gols pró", () => {
    const a = L("A", { p: 10, v: 3, gp: 9, gc: 5 });
    const b = L("B", { p: 10, v: 3, gp: 6, gc: 2 });
    expect(compararLinhas(a, b)).toBeLessThan(0);
  });

  it("empate total: ordem alfabética na tela, estável", () => {
    const a = L("Bahia", { p: 10, v: 3, gp: 6, gc: 2 });
    const b = L("Atlético-MG", { p: 10, v: 3, gp: 6, gc: 2 });
    expect(compararLinhas(b, a)).toBeLessThan(0);
  });

  it("na simulação usa os mesmos critérios e só sorteia o empate total", () => {
    //            A   B   C   D
    const p = [10, 10, 10, 12];
    const v = [3, 3, 2, 0];
    const gp = [9, 9, 30, 0];
    const gc = [5, 5, 1, 0];
    expect(ordemFinal(p, v, gp, gc, [0.9, 0.1, 0.5, 0.5])).toEqual([3, 1, 0, 2]);
    expect(ordemFinal(p, v, gp, gc, [0.1, 0.9, 0.5, 0.5])).toEqual([3, 0, 1, 2]);
  });
});

describe("sequências", () => {
  const seq = [
    res(1, "Remo", 1, 0, "Santos"),
    res(2, "Santos", 0, 2, "Remo"),
    res(3, "Remo", 1, 1, "Bahia"),
    res(4, "Bahia", 0, 1, "Remo"),
    res(5, "Remo", 2, 0, "Vasco"),
    res(6, "Vasco", 3, 2, "Remo"),
    res(7, "Remo", 0, 0, "Vasco"),
  ];
  const jogos = jogosDoClube("Remo", seq);

  it("vitórias: maior 2, atual 0", () => {
    expect(sequencia(jogos, (r) => r === "V")).toEqual({ atual: 0, maior: 2, maiorAte: 2, atualDesde: null });
  });
  it("invencibilidade: maior 5, terminou na 5ª", () => {
    expect(sequencia(jogos, (r) => r !== "D")).toMatchObject({ maior: 5, maiorAte: 5, atual: 1, atualDesde: 7 });
  });
  it("sem vencer: atual 2, desde a 6ª", () => {
    expect(sequencia(jogos, (r) => r !== "V")).toMatchObject({ atual: 2, atualDesde: 6 });
  });
});

describe("confronto direto", () => {
  it("desempata dois clubes iguais em pontos, vitórias, saldo e gols pró", () => {
    const r = (mandante: string, visitante: string, gm: number, gv: number, id: string) => ({ id, rodada: 1, mandante, visitante, data: null, gm, gv });
    // A e B: 1 vitória, 1 derrota, saldo 0, 2 gols pró; B venceu o confronto direto
    const t = classificacao(["A", "B", "C"], [r("A", "B", 0, 1, "1"), r("A", "C", 2, 1, "2"), r("C", "B", 2, 1, "3")]);
    expect(t.map((l) => l.clube)).toEqual(["C", "B", "A"]);
  });
});
