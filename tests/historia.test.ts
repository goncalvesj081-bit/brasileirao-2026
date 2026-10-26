import { describe, expect, it } from "vitest";
import historiaJson from "../data/historia.json";
import { aproveitamento, campanhas, campeoes, goleadas, pontosDa, retrospectoContra, tabelaGeral, titulos, trajetoria, type Historia } from "../src/modelo/historia";

const mini: Historia = {
  atualizado: "",
  temporadas: [
    {
      ano: 2020,
      formato: { clubes: 2, rodadas: 2 },
      tabela: [
        ["A", 2, 0, 0, 5, 0, 0, "l"],
        ["B", 0, 0, 2, 0, 5, 0, "r"],
      ],
      jogos: [
        [0, 1, 4, 0],
        [1, 0, 0, 1],
      ],
      artilheiros: [["Fulano", "A", 4]],
      notas: [],
    },
    {
      ano: 2021,
      formato: { clubes: 2, rodadas: 2 },
      tabela: [
        ["C", 1, 1, 0, 2, 1, 0, null],
        ["A", 0, 1, 1, 1, 2, -1, null],
      ],
      jogos: null,
      artilheiros: [],
      notas: [],
    },
  ],
};

describe("cálculos da história", () => {
  it("campeões e títulos", () => {
    expect(campeoes(mini).map((c) => [c.ano, c.campeao, c.vantagem])).toEqual([
      [2020, "A", 6],
      [2021, "C", 4],
    ]);
    expect(titulos(mini)).toEqual([
      { clube: "C", anos: [2021] },
      { clube: "A", anos: [2020] },
    ]);
  });

  it("pontos contam o tribunal; a tabela de todos os tempos, não", () => {
    expect(pontosDa(mini.temporadas[1].tabela[1])).toBe(0);
    const a = tabelaGeral(mini).find((l) => l.clube === "A")!;
    expect([a.temporadas, a.j, a.p, a.titulos, a.lib, a.melhor]).toEqual([2, 4, 7, 1, 1, 1]);
  });

  it("campanhas, goleadas, trajetória e retrospecto", () => {
    expect(campanhas(mini, aproveitamento, false, 1)[0]).toMatchObject({ ano: 2020, clube: "A", valor: 1 });
    expect(goleadas(mini, 1)[0]).toMatchObject({ mandante: "A", visitante: "B", gm: 4 });
    expect(trajetoria(mini, "A").map((p) => [p.ano, p.pos])).toEqual([
      [2020, 1],
      [2021, 2],
    ]);
    // 2021 não tem placares: o retrospecto só usa 2020
    expect(retrospectoContra(mini, "A")).toEqual([{ adversario: "B", j: 2, v: 2, e: 0, d: 0, gp: 5, gc: 0 }]);
  });
});

describe("data/historia.json", () => {
  const h = historiaJson as unknown as Historia;

  it("tem todas as edições desde 2003, em ordem", () => {
    expect(h.temporadas.map((t) => t.ano)).toEqual(Array.from({ length: h.temporadas.length }, (_, i) => 2003 + i));
  });

  it("confere fatos conhecidos", () => {
    const campeao = (ano: number) => h.temporadas.find((t) => t.ano === ano)!.tabela[0][0];
    expect(campeao(2003)).toBe("Cruzeiro");
    expect(pontosDa(h.temporadas[0].tabela[0])).toBe(100);
    expect(campeao(2019)).toBe("Flamengo");
    expect(campeao(2024)).toBe("Botafogo");
    expect(h.temporadas.find((t) => t.ano === 2004)!.tabela.find((l) => l[0] === "São Caetano")![6]).toBe(-24);
  });

  it("cada clube jogou o número certo de jogos e os índices dos placares existem", () => {
    for (const t of h.temporadas) {
      for (const l of t.tabela) expect(l[1] + l[2] + l[3], `${t.ano} ${l[0]}`).toBe(t.formato.rodadas);
      for (const [m, v] of t.jogos ?? []) expect(t.tabela[m] && t.tabela[v] && m !== v).toBeTruthy();
    }
  });
});
