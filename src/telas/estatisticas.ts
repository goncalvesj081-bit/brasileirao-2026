import { nomesClubes, resultados, tabela } from "../dados";
import { classificacao, jogosDoClube, sequencia, type Res } from "../modelo/classificacao";
import { atrLinha, celClube, forma } from "../ui/componentes";
import { dec } from "../ui/formato";
import { html, type Html } from "../ui/html";

const SEQ: Record<string, [string, (r: Res) => boolean, string]> = {
  vitorias: ["Sequência de vitórias", (r) => r === "V", "vitórias seguidas"],
  derrotas: ["Sequência de derrotas", (r) => r === "D", "derrotas seguidas"],
  invencibilidade: ["Sequência de invencibilidade", (r) => r !== "D", "jogos sem perder"],
  "sem-vitorias": ["Sequência sem vitórias", (r) => r !== "V", "jogos sem vencer"],
};

export function telaEstatisticas(vista: string): Html {
  if (vista === "ataque" || vista === "defesa") return gols(vista === "ataque");
  const [titulo, teste, unidade] = SEQ[vista] ?? SEQ.vitorias;
  const linhas = nomesClubes
    .map((c) => ({ c, ...sequencia(jogosDoClube(c, resultados), teste) }))
    .sort((a, b) => b.atual - a.atual || b.maior - a.maior || a.c.localeCompare(b.c, "pt"));
  const topo = linhas.reduce((m, r) => (r.maior > m.maior ? r : m), linhas[0]);
  return html`<h2>${titulo}</h2>
    <p class="sub">Maior sequência do campeonato: <b>${topo.c}</b>, ${topo.maior} ${unidade}${topo.maiorAte ? ` (até a ${topo.maiorAte}ª rodada)` : ""}.</p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Atual</th><th class="l w">Desde</th><th>Recorde</th><th class="l w">Últimos 5</th></tr></thead>
      <tbody>${linhas.map(
        (r, k) => html`<tr ${atrLinha(r.c)}><td class="pos">${k + 1}</td>${celClube(r.c)}<td class="big">${r.atual}</td><td class="l dim w">${r.atual ? `${r.atualDesde}ª rodada` : "—"}</td><td>${r.maior}</td><td class="l w">${forma(r.c)}</td></tr>`,
      )}</tbody>
    </table></div>`;
}

function gols(ataque: boolean): Html {
  const M = classificacao(nomesClubes, resultados, (_, l) => l === "m");
  const V = classificacao(nomesClubes, resultados, (_, l) => l === "v");
  const de = (arr: typeof M, c: string) => arr.find((t) => t.clube === c)!;
  const g = (t: (typeof M)[number]) => (ataque ? t.gp : t.gc);
  const linhas = tabela
    .map((t) => ({
      t,
      g: g(t),
      m: g(de(M, t.clube)),
      v: g(de(V, t.clube)),
      zero: jogosDoClube(t.clube, resultados).filter((x) => (ataque ? x.pro : x.contra) === 0).length,
      media: t.j ? g(t) / t.j : 0,
    }))
    .sort((a, b) => (ataque ? b.media - a.media : a.media - b.media));
  return html`<h2>${ataque ? "Melhor ataque" : "Melhor defesa"}</h2>
    <p class="sub">Ordenado pela média de gols ${ataque ? "marcados" : "sofridos"} por jogo, porque nem todos os times têm o mesmo número de jogos.</p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th class="w">J</th><th>Gols</th><th>Média</th><th class="w">Em casa</th><th class="w">Fora</th><th>${ataque ? "Sem marcar" : "Sem sofrer"}</th></tr></thead>
      <tbody>${linhas.map(
        (r, k) => html`<tr ${atrLinha(r.t.clube)}><td class="pos">${k + 1}</td>${celClube(r.t.clube)}<td class="dim w">${r.t.j}</td><td class="big">${r.g}</td><td>${dec(r.media, 2)}</td><td class="w">${r.m}</td><td class="w">${r.v}</td><td class="dim">${r.zero}</td></tr>`,
      )}</tbody>
    </table></div>`;
}
