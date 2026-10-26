import { describe, expect, it } from "vitest";
import { clubeHistorico } from "../config/clubes-historicos";
import { conciliar, lerArtilheiros, lerConfrontosPt, lerPlacar, lerResultados, lerTabela, naoFecham, validarTemporada, zonaDoTexto } from "../scripts/lib/historia-wiki";
import type { LinhaHistoria, TemporadaHistoria } from "../src/modelo/historia";

// trechos no formato das páginas "AAAA Campeonato Brasileiro Série A" da Wikipédia em inglês

const TABELA_TEAMN = `<onlyinclude>{{#invoke:sports table|main|style=WDL
|team1=SAN|name_SAN=[[Santos Futebol Clube (São Paulo)|Santos]]
|team2=CAP|name_CAP=[[Clube Atlético Paranaense|Atlético-PR]]
|team3=PAY|name_PAY=[[Paysandu Sport Club|Paysandu]]
|win_SAN=2|draw_SAN=0|loss_SAN=0|gf_SAN=5|ga_SAN=1
|win_CAP=1|draw_CAP=0|loss_CAP=1|gf_CAP=3|ga_CAP=3
|win_PAY=0|draw_PAY=0|loss_PAY=2|gf_PAY=1|ga_PAY=5|adjust_points_PAY=-8 <!-- tribunal | -->
|col_CL=green1|text_CL=Qualified for [[2004 Copa Libertadores]] and [[2004 Copa Sudamericana]]
|result1=CL
|col_R=red1|text_R=Relegation to [[2004 Campeonato Brasileiro Série B|Série B]]
|result3=R
}}</onlyinclude>`;

const TABELA_ORDEM = `{{#invoke:Sports table|main|style=WDL
|team_order=BOT, FLA
|result2=CSA
|win_FLA=0|draw_FLA=1|loss_FLA=1|gf_FLA=1|ga_FLA=2
|win_BOT=1|draw_BOT=1|loss_BOT=0|gf_BOT=2|ga_BOT=1
|col_CSA=blue1 |text_CSA=Qualification for [[2025 Copa Sudamericana#Group stage|Copa Sudamericana group stage]]
}}
== Results ==
{{#invoke:Sports results|main
|team1=BOT |team2=FLA
|name_BOT=[[Botafogo de Futebol e Regatas|Botafogo]]
|name_FLA={{nowrap|[[CR Flamengo|Flamengo]]}}
|match_BOT_FLA=1–0<sup>(R03)</sup>
|match_FLA_BOT=[[Clássico da Rivalidade|'''1–1''']]
}}`;

describe("tabela final", () => {
  it("lê o formato com team1, team2... e os ajustes do tribunal", () => {
    const t = lerTabela(TABELA_TEAMN, 2003);
    expect(t.map((l) => l[0])).toEqual(["Santos", "Athletico-PR", "Paysandu"]);
    expect(t[0]).toEqual(["Santos", 2, 0, 0, 5, 1, 0, "l"]);
    expect(t[2]).toEqual(["Paysandu", 0, 0, 2, 1, 5, -8, "r"]);
  });

  it("lê o formato com team_order, com os nomes definidos só nos resultados", () => {
    const t = lerTabela(TABELA_ORDEM.replace("|win_FLA", "|name_BOT=[[Botafogo de Futebol e Regatas|Botafogo]]|name_FLA=[[CR Flamengo|Flamengo]]\n|win_FLA"), 2024);
    expect(t.map((l) => [l[0], l[7]])).toEqual([
      ["Botafogo", null],
      ["Flamengo", "s"],
    ]);
  });

  it("falha dizendo o clube que falta no cadastro", () => {
    expect(() => lerTabela(TABELA_TEAMN.replace("Paysandu Sport Club", "Clube Inexistente"), 2003)).toThrow(/Clube Inexistente/);
  });

  it("faixa pelo texto da legenda", () => {
    expect(zonaDoTexto("Qualified for 2004 Copa Libertadores and 2004 Copa Sudamericana")).toBe("l");
    expect(zonaDoTexto("Qualification for Copa Sudamericana group stage")).toBe("s");
    expect(zonaDoTexto("Relegation to Série B")).toBe("r");
    expect(zonaDoTexto("")).toBeNull();
  });
});

describe("confrontos", () => {
  it("placar com traço, negrito, link e nota em volta", () => {
    expect(lerPlacar("2–1")).toEqual([2, 1]);
    expect(lerPlacar("[[Coelho versus Raposa|'''0–2''']]")).toEqual([0, 2]);
    expect(lerPlacar("3-0<sup>(R12)</sup>")).toEqual([3, 0]);
    expect(lerPlacar("—")).toBeNull();
  });

  it("matriz em inglês", () => {
    expect(lerResultados(TABELA_ORDEM, 2024)).toEqual([
      ["Botafogo", "Flamengo", 1, 0],
      ["Flamengo", "Botafogo", 1, 1],
    ]);
  });

  it("tabela em português: colunas na ordem das linhas, diagonal ignorada", () => {
    const pt = `== Confrontos ==
{| class="wikitable"
|-style="background:#F0F0F0;"
!align="left"|&nbsp;!!ATM!!CRU!!FLA
|-
!Atlético-MG
!<!-- CAM --> —
|<!-- CRU --> bgcolor="FFE8E8"|[[Clássico Mineiro|'''0–2''']]
|<!-- FLA--> bgcolor=#FFFFDD|1-1
|-
!Cruzeiro
|<!-- ATM--> bgcolor=#E8EDFF|3-0
!<!-- CRU--> bgcolor=#FFFFDD|-
|<!-- FLA--> bgcolor=#E8EDFF|2-0
|-
!Flamengo
|<!-- ATM--> |0-1
|<!-- CRU--> |1-1
!<!-- FLA--> —
|}`;
    expect(lerConfrontosPt(pt, 2008)).toEqual([
      ["Atlético-MG", "Cruzeiro", 0, 2],
      ["Atlético-MG", "Flamengo", 1, 1],
      ["Cruzeiro", "Atlético-MG", 3, 0],
      ["Cruzeiro", "Flamengo", 2, 0],
      ["Flamengo", "Atlético-MG", 0, 1],
      ["Flamengo", "Cruzeiro", 1, 1],
    ]);
  });
});

describe("artilheiros", () => {
  it("acha as colunas pelo cabeçalho e repete os gols empatados (rowspan)", () => {
    const txt = `===Top scorers===
{| class="wikitable"
|-
!Rank
!Player
!Club
!Goals
|-
|rowspan="2"|1
| align="left" |{{flagicon|BRA}} [[Yuri Alberto]]
| align="left" |Corinthians
|rowspan="2"|'''15'''
|-
| align="left" |{{flagicon|BRA}} [[Alerrandro]]
| align="left" |Vitória
|-
|3
| align="left" |{{flagicon|BRA}} [[Estêvão Willian|Estêvão]]
| align="left" |Palmeiras
|'''13'''
|}`;
    expect(lerArtilheiros(txt, 2024)).toEqual([
      ["Yuri Alberto", "Corinthians", 15],
      ["Alerrandro", "Vitória", 15],
      ["Estêvão", "Palmeiras", 13],
    ]);
  });

  it("aceita outra ordem de colunas (gols antes do time)", () => {
    const txt = `===Top goal scorers===
{| class="wikitable"
|-
!Scorer
!Goals
!Team
|-
|[[Romário]]
|style="text-align:center;"|22
|[[CR Vasco da Gama|Vasco da Gama]]
|-
|[[Carlos Tevez]]
|style="text-align:center;"|20
|[[Sport Club Corinthians Paulista|Corinthians]]
|}`;
    expect(lerArtilheiros(txt, 2005)).toEqual([
      ["Romário", "Vasco", 22],
      ["Carlos Tevez", "Corinthians", 20],
    ]);
  });
});

describe("cadastro de clubes", () => {
  it("reconhece pelo artigo e pelo nome curto, sem confundir parecidos", () => {
    const n = (s: string) => clubeHistorico(s)?.nome;
    expect(n("América Futebol Clube (MG)")).toBe("América-MG");
    expect(n("Clube Atlético Mineiro")).toBe("Atlético-MG");
    expect(n("Atlético Clube Goianiense")).toBe("Atlético-GO");
    expect(n("Goiás Esporte Clube")).toBe("Goiás");
    expect(n("Santos Futebol Clube (São Paulo)")).toBe("Santos");
    expect(n("Associação Desportiva São Caetano")).toBe("São Caetano");
    expect(n("Sport Club Corinthians Paulista")).toBe("Corinthians");
    expect(n("Sport Club do Recife")).toBe("Sport");
    expect(n("Paraná Clube")).toBe("Paraná");
    expect(n("Club Athletico Paranaense")).toBe("Athletico-PR");
    expect(n("Grêmio Barueri Futebol")).toBe("Grêmio Barueri");
    expect(n("Grêmio FBPA")).toBe("Grêmio");
    expect(n("Atlético-MG")).toBe("Atlético-MG");
  });
});

describe("conferência entre fontes", () => {
  const tab: LinhaHistoria[] = [
    ["A", 2, 0, 0, 4, 1, 0, null],
    ["B", 0, 1, 1, 1, 3, 0, null],
    ["C", 0, 1, 1, 2, 3, 0, null],
  ];
  // 4 jogos: A 2x0 B, A 2x1 C, B 1x1 C (na fonte saiu 1x0)
  const jogos: [string, string, number, number][] = [
    ["A", "B", 2, 0],
    ["A", "C", 2, 1],
    ["B", "C", 1, 0],
  ];

  it("acerta o único placar que faz os dois clubes fecharem com a tabela", () => {
    expect(naoFecham(tab, jogos)).toEqual(["B", "C"]);
    const r = conciliar(tab, jogos, {}, 2, 2010);
    expect(r.jogos[2]).toEqual(["B", "C", 1, 1]);
    expect(naoFecham(r.tabela, r.jogos)).toEqual([]);
    expect(r.correcoes).toEqual(["2010: B 1x0 C → 1x1 (o placar que fecha com a tabela)"]);
  });

  it("prefere o placar da outra Wikipédia quando ele fecha", () => {
    const r = conciliar(tab, jogos, { jogos: [["B", "C", 1, 1]] }, 2, 2010);
    expect(r.correcoes[0]).toMatch(/outra Wikipédia/);
    expect(naoFecham(r.tabela, r.jogos)).toEqual([]);
  });

  it("não mexe quando tudo fecha", () => {
    const certos: [string, string, number, number][] = [...jogos.slice(0, 2), ["B", "C", 1, 1]];
    expect(conciliar(tab, certos, {}, 2, 2010).correcoes).toEqual([]);
  });
});

describe("validação", () => {
  const base = (): TemporadaHistoria => ({
    ano: 2010,
    formato: { clubes: 2, rodadas: 2 },
    tabela: [
      ["A", 1, 1, 0, 3, 2, 0, null],
      ["B", 0, 1, 1, 2, 3, 0, null],
    ],
    jogos: [
      [0, 1, 2, 1],
      [1, 0, 1, 1],
    ],
    artilheiros: [],
    notas: [],
  });

  it("aceita uma edição consistente", () => {
    expect(validarTemporada(base())).toEqual([]);
  });

  it("acusa jogos a mais, ordem errada e confrontos que não fecham", () => {
    const t = base();
    t.tabela[1] = ["B", 2, 1, 1, 2, 3, 0, null];
    const erros = validarTemporada(t);
    expect(erros.some((e) => /B com 4 jogos/.test(e))).toBe(true);
    expect(erros.some((e) => /acima de/.test(e))).toBe(true);
    expect(erros.some((e) => /não fecham .* B/.test(e))).toBe(true);
  });

  it("os clubes liberados podem não fechar (jogo não disputado)", () => {
    const t = base();
    t.jogos = [[0, 1, 2, 1]];
    t.tabela = [
      ["A", 1, 0, 1, 2, 4, 0, null],
      ["B", 0, 0, 2, 1, 5, 0, null],
    ];
    expect(validarTemporada(t, ["A", "B"])).toEqual([]);
  });
});
