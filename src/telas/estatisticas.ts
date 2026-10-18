import { nomesClubes, restantes, resultados, tabela } from "../dados";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
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
  if (vista === "restante") return tabelaQueFalta();
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

/** Dificuldade dos jogos que faltam: aproveitamento médio dos adversários e pontos esperados pelo modelo. */
function tabelaQueFalta(): Html {
  const F = forcas(tabela);
  const ppg = new Map(tabela.map((t) => [t.clube, t.j ? t.p / t.j : 0]));
  const pos = new Map(tabela.map((t, p) => [t.clube, p + 1]));
  const linhas = tabela
    .map((t) => {
      const js = restantes.filter((g) => g.mandante === t.clube || g.visitante === t.clube);
      const adv = js.map((g) => (g.mandante === t.clube ? g.visitante : g.mandante));
      const esperado = js.reduce((s, g) => {
        const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
        return s + (g.mandante === t.clube ? 3 * H + D : 3 * A + D);
      }, 0);
      const media = (f: (c: string) => number) => (adv.length ? adv.reduce((s, c) => s + f(c), 0) / adv.length : 0);
      return {
        t,
        n: js.length,
        casa: js.filter((g) => g.mandante === t.clube).length,
        advPpg: media((c) => ppg.get(c)!),
        advPos: media((c) => pos.get(c)!),
        esperado,
      };
    })
    .sort((a, b) => b.advPpg - a.advPpg);
  return html`<h2>Tabela que falta</h2>
    <p class="sub">Do caminho mais difícil para o mais fácil, pelo aproveitamento médio dos adversários que faltam (pontos por jogo deles até agora).</p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Jogos</th><th class="w">Em casa</th><th>Adversários</th><th class="w">Posição média</th><th title="Pontos que o modelo espera nos jogos que faltam">Pontos esperados</th></tr></thead>
      <tbody>${linhas.map(
        (r, k) => html`<tr ${atrLinha(r.t.clube)}><td class="pos">${k + 1}</td>${celClube(r.t.clube)}<td class="dim">${r.n}</td><td class="w dim">${r.casa}</td><td class="big">${dec(r.advPpg, 2)}</td><td class="w">${dec(r.advPos, 1)}º</td><td>${dec(r.esperado, 1)} <span class="dim">de ${3 * r.n}</span></td></tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Adversários: pontos por jogo dos adversários que faltam. Pontos esperados: soma, jogo a jogo, de 3 × chance de vitória + chance de empate, pelo mesmo modelo das chances; já conta a força do próprio time e o mando de campo.</p>`;
}
