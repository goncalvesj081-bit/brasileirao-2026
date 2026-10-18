import { describe, expect, it } from "vitest";
import { clubePorNomeApi } from "../config/clubes";
import { CORTES, faixaDaPosicao } from "../config/temporada";
import { classificacao, linhaVazia } from "../src/modelo/classificacao";
import { forcas, golsEsperados, pesoDoTime } from "../src/modelo/forcas";
import { atualizarHistorico } from "../src/modelo/historico";
import { probResultado } from "../src/modelo/poisson";
import { criarRng } from "../src/modelo/rng";
import { ehAdiado, rodadasEncerradas, resultadosAteRodada } from "../src/modelo/rodadas";
import { chancesDaLinha, simular } from "../src/modelo/simular";
import { NOMES, disputar, res, tabelaCompleta } from "./ajuda";

describe("forças", () => {
  it("peso = min(0,6; jogos/(jogos+8))", () => {
    expect(pesoDoTime(0)).toBe(0);
    expect(pesoDoTime(8)).toBe(0.5);
    expect(pesoDoTime(12)).toBe(0.6);
    expect(pesoDoTime(30)).toBe(0.6);
  });

  it("encolhe para a média: time sem jogos tem força 1", () => {
    const T = [
      { ...linhaVazia("A"), j: 12, gp: 24, gc: 12 },
      { ...linhaVazia("B"), j: 12, gp: 12, gc: 24 },
      linhaVazia("C"),
    ];
    const F = forcas(T);
    expect(F.media).toBeCloseTo(36 / 24);
    // A marca 2/jogo = 1,333× a média; com peso 0,6: 1 + 0,6 × 0,333 = 1,2
    expect(F.ataque.get("A")).toBeCloseTo(1.2);
    expect(F.defesa.get("A")).toBeCloseTo(1 + 0.6 * (1 / 1.5 - 1));
    expect(F.ataque.get("C")).toBe(1);
  });

  it("fator casa 1,18 e fora 0,85", () => {
    const F = forcas([linhaVazia("A"), linhaVazia("B")]);
    const [m, v] = golsEsperados(F, "A", "B");
    expect(m).toBeCloseTo(1.2 * 1.18);
    expect(v).toBeCloseTo(1.2 * 0.85);
  });

  it("probabilidades de 1X2 somam 1 e favorecem o mandante igual", () => {
    const [H, D, A] = probResultado(1.4, 1.0);
    expect(H + D + A).toBeCloseTo(1);
    expect(H).toBeGreaterThan(A);
  });
});

describe("simulação", () => {
  const jogos = tabelaCompleta();
  const { resultados, restantes } = disputar(jogos, 30);
  const tabela = classificacao(NOMES, resultados);

  it("cada linha de posições soma 1 e cada posição soma 1", () => {
    const s = simular({ tabela, restantes, n: 2000, rand: criarRng(1) });
    for (const r of s.pos) expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    for (let p = 0; p < 20; p++) expect(s.pos.reduce((a, r) => a + r[p], 0)).toBeCloseTo(1);
  });

  it("é determinística com a mesma semente", () => {
    const a = simular({ tabela, restantes, n: 500, rand: criarRng(7) });
    const b = simular({ tabela, restantes, n: 500, rand: criarRng(7) });
    expect(a.pos).toEqual(b.pos);
  });

  it("com todos os placares fixados, o resultado é certo", () => {
    const forcados = Object.fromEntries(restantes.map((g) => [g.id, [1, 0] as [number, number]]));
    const s = simular({ tabela, restantes, forcados, n: 50, rand: criarRng(3) });
    const final = classificacao(NOMES, [...resultados, ...restantes.map((g) => ({ ...g, gm: 1, gv: 0 }))]);
    expect(s.clubes[s.pos.findIndex((r) => r[0] === 1)]).toBe(final[0].clube);
  });

  it("faixas básicas de 2026: Libertadores 1–4 + 5º na pré, Sula 6–11, rebaixamento 17–20", () => {
    expect(CORTES).toEqual({ libGrupos: 4, lib: 5, sula: 11, rebaixados: 4 });
    expect(faixaDaPosicao(3)).toBe("libertadores");
    expect(faixaDaPosicao(4)).toBe("preLibertadores");
    expect(faixaDaPosicao(10)).toBe("sulAmericana");
    expect(faixaDaPosicao(11)).toBe(null);
    expect(faixaDaPosicao(16)).toBe("rebaixamento");
    const linha = Array.from({ length: 20 }, () => 0.05);
    const ch = chancesDaLinha(linha);
    expect(ch.l).toBeCloseTo(0.25);
    expect(ch.s).toBeCloseTo(0.3);
    expect(ch.r).toBeCloseTo(0.2);
  });
});

describe("rodadas e histórico", () => {
  const jogos = tabelaCompleta();

  it("jogo sem data de rodada passada é adiado; da rodada atual, não", () => {
    const { resultados, restantes } = disputar(jogos, 10);
    const adiado = { ...restantes.find((g) => g.rodada === 11)! };
    // move um jogo da 11ª para "sem data" e disputa a 11ª e a 12ª
    const r11e12 = disputar(jogos, 12).resultados.filter((r) => r.rodada >= 11 && r.id !== adiado.id);
    const res2 = [...resultados, ...r11e12];
    const rest2 = [{ ...adiado, data: null }, ...restantes.filter((g) => g.rodada > 12)];
    expect(ehAdiado(rest2[0], res2, rest2)).toBe(true);
    expect(rodadasEncerradas(res2, rest2)).toContain(11);
    // o mesmo jogo, se for da rodada que está acontecendo, não é adiado
    expect(ehAdiado({ ...rest2[0], rodada: 12 }, res2, rest2)).toBe(false);
  });

  it("histórico da rodada R usa só o que tinha acontecido até o fim dela", () => {
    const { resultados, restantes } = disputar(jogos, 12);
    // jogo da 3ª disputado bem depois (adiado), na semana da 12ª
    const atrasado = resultados.find((r) => r.rodada === 3)!;
    atrasado.data = resultados.find((r) => r.rodada === 12)!.data;
    const { lista } = resultadosAteRodada(5, resultados, restantes);
    expect(lista.some((r) => r.id === atrasado.id)).toBe(false);
    expect(lista.filter((r) => r.rodada <= 5)).toHaveLength(49);
    expect(resultadosAteRodada(12, resultados, restantes).lista).toHaveLength(120);
  });

  it("recalcula só as rodadas novas ou alteradas", () => {
    const um = disputar(jogos, 3);
    const h1 = atualizarHistorico([], NOMES, um.resultados, um.restantes, 200);
    expect(h1.recalculadas).toEqual([1, 2, 3]);

    const dois = disputar(jogos, 4);
    const h2 = atualizarHistorico(h1.historico, NOMES, dois.resultados, dois.restantes, 200);
    expect(h2.recalculadas).toEqual([4]);
    expect(h2.historico[0]).toBe(h1.historico[0]);

    // placar corrigido na 2ª: recalcula da 2ª em diante
    const i = dois.resultados.findIndex((r) => r.rodada === 2);
    dois.resultados[i] = { ...dois.resultados[i], gm: dois.resultados[i].gm + 1 };
    const h3 = atualizarHistorico(h2.historico, NOMES, dois.resultados, dois.restantes, 200);
    expect(h3.recalculadas).toEqual([2, 3, 4]);
  });

  it("entradas guardam posição e pontos daquele momento", () => {
    const um = disputar(jogos, 1);
    const h = atualizarHistorico([], NOMES, um.resultados, um.restantes, 100).historico[0];
    const t = classificacao(NOMES, um.resultados);
    expect(h.probs[t[0].clube]).toMatchObject({ pos: 1, pts: t[0].p });
  });
});

describe("nomes da API", () => {
  it.each([
    ["CA Mineiro", "Atlético-MG"],
    ["Clube Atlético Mineiro", "Atlético-MG"],
    ["CA Paranaense", "Athletico-PR"],
    ["SE Palmeiras", "Palmeiras"],
    ["Grêmio FBPA", "Grêmio"],
    ["Clube do Remo", "Remo"],
    ["São Paulo FC", "São Paulo"],
    ["RB Bragantino", "Bragantino"],
    ["CR Vasco da Gama", "Vasco"],
    ["EC Vitória", "Vitória"],
    ["Associação Chapecoense de Futebol", "Chapecoense"],
  ])("%s → %s", (api, nome) => {
    expect(clubePorNomeApi(api)?.nome).toBe(nome);
  });

  it("nome desconhecido não vira clube nenhum", () => {
    expect(clubePorNomeApi("Sport Recife")).toBe(null);
  });

  it("mantém o helper de resultado consistente", () => {
    expect(res(1, "A", 1, 0, "B")).toMatchObject({ gm: 1, gv: 0 });
  });
});
