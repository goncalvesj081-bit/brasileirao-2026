import { describe, expect, it } from "vitest";
import { calcularCartoes, type EspnJogoCartoes } from "../scripts/lib/cartoes-espn";
import { lerPublico } from "../scripts/lib/publico-wiki";

const jogo = (id: string, date: string, cartoes: [string, "a" | "v"][]): EspnJogoCartoes => ({
  id,
  date,
  status: { type: { completed: true, name: "STATUS_FULL_TIME" } },
  competitions: [{
    competitors: [{ team: { id: "1", displayName: "Palmeiras" } }, { team: { id: "2", displayName: "Santos" } }],
    details: cartoes.map(([nome, t]) => ({ yellowCard: t === "a", redCard: t === "v", team: { id: "1" }, athletesInvolved: [{ id: nome, displayName: nome }] })),
  }],
});

describe("cartões", () => {
  it("3º amarelo no último jogo = suspenso; 2 amarelos = pendurado; vermelho = suspenso", () => {
    const L = calcularCartoes([
      jogo("1", "2026-04-01", [["Ana", "a"], ["Bia", "a"]]),
      jogo("2", "2026-04-08", [["Ana", "a"], ["Bia", "a"], ["Caio", "a"]]),
      jogo("3", "2026-04-15", [["Ana", "a"], ["Dani", "v"]]),
      jogo("2", "2026-04-08", []), // repetido
    ]);
    const de = (n: string) => L.find((l) => l[0] === n)!;
    expect(de("Ana")).toEqual(["Ana", "Palmeiras", 3, 0, "suspenso"]);
    expect(de("Bia")).toEqual(["Bia", "Palmeiras", 2, 0, "pendurado"]);
    expect(de("Caio")[4]).toBe("");
    expect(de("Dani")).toEqual(["Dani", "Palmeiras", 0, 1, "suspenso"]);
  });

  it("suspensão já cumprida não conta", () => {
    const L = calcularCartoes([jogo("1", "2026-04-01", [["Edu", "v"]]), jogo("2", "2026-04-08", [])]);
    expect(L[0][4]).toBe("");
  });
});

describe("público", () => {
  it("lê os maiores e os menores públicos da Wikipédia", () => {
    const linha = (n: number, pub: number, m: string, pl: string, v: string) => `|-
!${n}
|align="right"|{{formatnum:${pub}}}
|align="right"|{{Futebol ${m}|estado=depois}}
|align="center"|${pl}
|{{Futebol ${v}|estado=antes}}
|[[Estádio Jornalista Mário Filho|Maracanã]]
|23 de maio
|align="center"|17.ª
|align=center|<ref>{{citar web|URL=x|título=y}}</ref>`;
    const cab = `{| class="wikitable"
|-
!width="30" |N.º
!width="70" |Público{{nota de rodapé|nome=PP|Considera-se apenas o público pagante.}}
!width="200"|Mandante
!width="50" |Placar
!width="200"|Visitante
!width="130"|Estádio
!width="110"|Data
!width="50" |Rodada
!width="30" |{{Tooltip|Ref.|Referências}}
`;
    const txt = `=== Público ===\n; Maiores públicos\n${cab}${linha(1, 67251, "Flamengo", "0–3", "Palmeiras")}\n|}\n; Menores públicos\n${cab}${linha(1, 3558, "Chapecoense", "1–4", "Athletico-PR")}\n|}`;
    const r = lerPublico(txt);
    expect(r.maiores).toEqual([[67251, "Flamengo", "0-3", "Palmeiras", "Maracanã", "23 de maio", 17]]);
    expect(r.menores[0].slice(0, 4)).toEqual([3558, "Chapecoense", "1-4", "Athletico-PR"]);
  });
});
