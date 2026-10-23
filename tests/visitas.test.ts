import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMINS } from "../config/admin";
import { diaDeBrasilia, incrementosDaAbertura, somarDias } from "../src/modelo/visitas";

describe("contagem de visitas", () => {
  it("dia de Brasília vira à meia-noite de lá, não à de Londres", () => {
    expect(diaDeBrasilia(new Date("2026-10-23T02:30:00Z"))).toBe("2026-10-22");
    expect(diaDeBrasilia(new Date("2026-10-23T03:30:00Z"))).toBe("2026-10-23");
  });

  it("primeira visita do aparelho conta visitante, novo e o tipo de aparelho", () => {
    expect(incrementosDaAbertura(null, "2026-10-23", true, false)).toEqual({ acessos: 1, visitantes: 1, celular: 1, novos: 1 });
  });

  it("volta em outro dia conta visitante, mas não novo", () => {
    expect(incrementosDaAbertura("2026-10-20", "2026-10-23", false, true)).toEqual({ acessos: 1, visitantes: 1, computador: 1, app: 1 });
  });

  it("segunda abertura no mesmo dia só conta acesso", () => {
    expect(incrementosDaAbertura("2026-10-23", "2026-10-23", true, false)).toEqual({ acessos: 1 });
  });

  it("soma os dias, inclusive as telas", () => {
    const t = somarDias([{ visitantes: 2, acessos: 3, telas: { tabela: 2 } }, { visitantes: 1, telas: { tabela: 1, jogos: 4 } }, {}]);
    expect(t.visitantes).toBe(3);
    expect(t.acessos).toBe(3);
    expect(t.telas).toEqual({ tabela: 3, jogos: 4 });
  });

  it("a lista de admins é a mesma no código e nas regras do banco", () => {
    const regras = readFileSync(join(import.meta.dirname, "..", "firestore.rules"), "utf8");
    const lista = /request\.auth\.uid in \[([^\]]*)\]/.exec(regras)![1];
    const nasRegras = [...lista.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    expect(nasRegras.sort()).toEqual([...ADMINS].sort());
  });
});
