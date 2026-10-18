import { describe, expect, it } from "vitest";
import { classificacao } from "../src/modelo/classificacao";
import { validarDados } from "../src/modelo/validar";
import { NOMES, disputar, tabelaCompleta } from "./ajuda";

const base = () => {
  const jogos = tabelaCompleta();
  const { resultados, restantes } = disputar(jogos, 20);
  return { clubes: NOMES, resultados, restantes };
};

describe("validação dos dados", () => {
  it("aceita uma temporada consistente", () => {
    const d = base();
    expect(validarDados(d)).toEqual([]);
    expect(validarDados({ ...d, tabelaOficial: classificacao(NOMES, d.resultados) })).toEqual([]);
  });

  it("acusa time com menos de 38 jogos somando disputados e restantes", () => {
    const d = base();
    const removido = d.restantes.pop()!;
    const erros = validarDados(d);
    expect(erros.some((e) => e.startsWith(`${removido.mandante}:`) && e.includes("esperava 38"))).toBe(true);
    expect(erros.some((e) => e.includes("380 jogos"))).toBe(true);
  });

  it("acusa jogo repetido", () => {
    const d = base();
    d.restantes.push({ ...d.restantes[0] });
    const erros = validarDados(d);
    expect(erros.some((e) => e.includes("aparece duas vezes"))).toBe(true);
    expect(erros.some((e) => e.includes("Confronto repetido"))).toBe(true);
  });

  it("acusa clube desconhecido", () => {
    const d = base();
    d.restantes[0] = { ...d.restantes[0], mandante: "Sport" };
    expect(validarDados(d).some((e) => e.includes("Clube desconhecido: Sport"))).toBe(true);
  });

  it("acusa placar inválido", () => {
    const d = base();
    d.resultados[0] = { ...d.resultados[0], gm: -1 };
    d.resultados[1] = { ...d.resultados[1], gv: 1.5 };
    expect(validarDados(d).filter((e) => e.startsWith("Placar inválido"))).toHaveLength(2);
  });

  it("acusa tabela oficial com pontos que não batem com 3V + E", () => {
    const d = base();
    const oficial = classificacao(NOMES, d.resultados);
    oficial[0] = { ...oficial[0], p: oficial[0].p + 1 };
    const erros = validarDados({ ...d, tabelaOficial: oficial });
    expect(erros.some((e) => e.includes("não batem com 3×"))).toBe(true);
  });

  it("acusa tabela oficial diferente da calculada pelos jogos", () => {
    const d = base();
    const oficial = classificacao(NOMES, d.resultados);
    // consistente com 3V+E, mas não com os jogos
    oficial[3] = { ...oficial[3], v: oficial[3].v + 1, d: oficial[3].d - 1, p: oficial[3].p + 3 };
    const erros = validarDados({ ...d, tabelaOficial: oficial });
    expect(erros.some((e) => e.startsWith(`${oficial[3].clube}: tabela oficial difere`))).toBe(true);
  });

  it("acusa resultado que sumiu em relação aos dados gravados", () => {
    const d = base();
    const anteriores = d.resultados.slice();
    const saiu = d.resultados.pop()!;
    d.restantes.push(saiu);
    const erros = validarDados({ ...d, resultadosAnteriores: anteriores });
    expect(erros.some((e) => e.includes("sumiram"))).toBe(true);
  });

  it("não acusa quando só o id mudou (dados antigos x API)", () => {
    const d = base();
    const anteriores = d.resultados.map((r) => ({ ...r, id: "antigo-" + r.id }));
    expect(validarDados({ ...d, resultadosAnteriores: anteriores })).toEqual([]);
  });
});
