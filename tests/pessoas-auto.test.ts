import { describe, expect, it } from "vitest";
import { lerData, limpar, lerTabela, tecnicosDaWikipedia } from "../scripts/lib/pessoas-auto";

// trechos no formato da página "2026 Campeonato Brasileiro Série A" da Wikipédia em inglês
const PESSOAL = `==Personnel and kits==
{| class="wikitable sortable"
|-
! rowspan="1" |Team
! rowspan="1" |Head coach
! rowspan="1" |Captain
|-
| Atlético Mineiro
| {{flagicon|ARG}} [[Eduardo Domínguez]]
| {{flagicon|BRA}} [[Everson (footballer, born 1990)|Everson]]
|-
| Botafogo
| {{flagicon|BRA}} [[Tite (football manager)|Tite]]
| {{flagicon|BRA}} [[Alex Telles]]
|-
| Coritiba
| {{flagicon|BRA}} [[Fernando Seabra]]
| Fulano
|-
| Grêmio
| {{flagicon|BRA}} [[Fulano de Tal]] (caretaker)
| Ciclano
|-
| Bahia
| {{flagicon|BRA}} [[Rogério Ceni]]
| {{flagicon|BRA}} [[Éverton Ribeiro]]
|}`;

const MUDANCAS = `===Coaching changes===
{| class="wikitable sortable"
|-
!Team
!Outgoing head coach
!Manner of departure
!Date of vacancy
!Position in table
!Incoming head coach
!Date of appointment
!Ref
|-
|Coritiba
|{{flagicon|BRA}} [[Mozart (footballer)|Mozart]]
|rowspan=2|End of contract
|28 November 2025
|rowspan=2|''Pre-season''
|{{flagicon|BRA}} [[Fernando Seabra]]
|8 December 2025
|<ref>{{cite web|url=https://x|title=Comunicado}}</ref>
|-
|Grêmio
|{{flagicon|BRA}} [[Mano Menezes]]
|9 December 2025
|{{flagicon|POR}} [[Luís Castro (footballer, born 1961)|Luís Castro]]
|12 December 2025
|<ref>a</ref>
|-
|Atlético Mineiro
|{{flagicon|ARG}} [[Jorge Sampaoli]]
|Mutual consent
|12 February 2026
|14th
|{{flagicon|BRA}} [[Lucas Gonçalves]] (caretaker)
|12 February 2026
|
|-
|Atlético Mineiro
|{{flagicon|BRA}} [[Lucas Gonçalves]] (caretaker)
|End of caretaker spell
|24 February 2026
|15th
|{{flagicon|ARG}} [[Eduardo Domínguez]]
|24 February 2026
|
|-
|Grêmio
|{{flagicon|POR}} [[Luís Castro (footballer, born 1961)|Luís Castro]]
|Sacked
|1 October 2026
|18th
|{{flagicon|BRA}} [[Fulano de Tal]] (caretaker)
|1 October 2026
|
|}`;

describe("leitura da Wikipédia", () => {
  it("limpa links, bandeiras e referências", () => {
    expect(limpar("{{flagicon|BRA}} [[Tite (football manager)|Tite]]<ref>{{cite web|url=x}}</ref>")).toBe("Tite");
    expect(limpar("{{nowrap|{{sortname|Abel|Ferreira}}}}")).toBe("Abel Ferreira");
  });

  it("expande rowspan nas linhas seguintes", () => {
    const { cab, linhas } = lerTabela(MUDANCAS);
    expect(cab[2]).toBe("Manner of departure");
    expect(linhas[1][2]).toBe("End of contract");
    expect(linhas[1][4]).toBe("Pre-season");
    expect(linhas[1][5]).toBe("Luís Castro");
  });

  it("lê datas em inglês", () => {
    expect(lerData("12 February 2026")).toEqual([12, 2, 2026]);
    expect(lerData("February 12, 2026")).toEqual([12, 2, 2026]);
    expect(lerData("—")).toBe(null);
  });

  it("monta técnicos atuais e trocas do ano, juntando os interinos", () => {
    const t = tecnicosDaWikipedia(PESSOAL, MUDANCAS, 2026);
    expect(t.lista["Atlético-MG"]).toEqual(["Eduardo Domínguez", "24/02/2026"]);
    expect(t.lista["Coritiba"]).toEqual(["Fernando Seabra", "08/12/2025"]);
    expect(t.lista["Bahia"]).toEqual(["Rogério Ceni", "antes de 2026"]);
    expect(t.lista["Grêmio"]).toEqual(["Fulano de Tal (interino)", "01/10/2026"]);
    expect(t.trocas).toEqual([
      ["Atlético-MG", "Jorge Sampaoli", "Acordo", "12/02", "Eduardo Domínguez"],
      ["Grêmio", "Luís Castro", "Demitido", "01/10", "Fulano de Tal (interino)"],
    ]);
  });
});
