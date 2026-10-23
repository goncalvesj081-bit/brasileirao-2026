import { sigla } from "../../config/clubes";
import { temporada } from "../../config/temporada";
import { nomesClubes, posicao, proximaRodada, restantes, resultados, tabela } from "../dados";
import { sims } from "../estado";
import { classificacao, classificacaoUltimos } from "../modelo/classificacao";
import { chancesSim, type ResultadoSimulacao } from "../modelo/simular";
import type { Chances, Linha } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, avisoSimulacao, celClube, celProb, classeFaixa, escudo, forma, legenda, linkClube, modoVagas, seletor, type Tom } from "../ui/componentes";
import { pct, saldo } from "../ui/formato";
import { aindaJogam, rodadaEmAndamento } from "./andamento";
import { cartaoMeuTime } from "./meutime";
import { fraseDoPeso, jogosQueMaisPesam } from "./rodada";
import { html, type Html } from "../ui/html";

const COLUNAS: [keyof Chances, string, Tom][] = [
  ["c", "Título", "c-title"],
  ["l", "Liberta", "c-lib"],
  ["s", "Sula", "c-sula"],
  ["r", "Queda", "c-rel"],
];

/** Tabela de classificação. `chances`: mostra as quatro colunas de probabilidade (só na geral). */
export function tabelaClassificacao(linhas: Linha[], zonas: boolean, comForma: boolean, chances = false, aoVivo = false): Html {
  const n = linhas.length;
  const res = sims.real;
  const jogam = zonas ? aindaJogam() : new Set<string>();
  // ao vivo: placar de quem está jogando e quantas posições sobe ou desce em relação à tabela oficial
  const vivos = new Map<string, { pro: number; contra: number; min: string }>();
  if (aoVivo)
    for (const g of restantes)
      if (g.aoVivo) {
        const min = g.aoVivo.rotulo ?? (g.aoVivo.minuto != null ? `${g.aoVivo.minuto}'` : "");
        vivos.set(g.mandante, { pro: g.aoVivo.gm, contra: g.aoVivo.gv, min });
        vivos.set(g.visitante, { pro: g.aoVivo.gv, contra: g.aoVivo.gm, min });
      }
  // com as chances, a tabela fica só com o essencial (V, E, D, GP e GC continuam nos recortes)
  const det = (x: number) => (chances ? "" : html`<td class="w">${x}</td>`);
  const so = chances ? " w" : "";
  return html`<div class="box"><table class="tab${chances ? " curta" : ""}">
    <thead><tr><th>#</th><th class="l">Clube</th>${aoVivo ? html`<th class="vivo-th">Agora</th>` : ""}<th>P</th><th class="${so}">J</th>${chances ? "" : html`<th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th>`}<th class="${so}">SG</th>${comForma ? html`<th class="l w">Últimos 5</th>` : ""}${chances ? COLUNAS.map(([, t]) => html`<th>${t}</th>`) : ""}</tr></thead>
    <tbody>${linhas.map((t, p) => {
      const i = posicao(t.clube);
      const c = chances && res && i >= 0 ? chancesSim(res, i, modoVagas()) : null;
      const v = vivos.get(t.clube);
      const mov = aoVivo ? i - p : 0;
      const marca = v
        ? html`<td class="vivo-cel"><span class="vivo-placar ${v.pro > v.contra ? "up" : v.pro < v.contra ? "down" : ""}">${v.pro}-${v.contra}</span><small>${v.min}</small></td>`
        : aoVivo
          ? html`<td></td>`
          : "";
      return html`<tr ${atrLinha(t.clube, zonas ? classeFaixa(p, n) : "")}><td class="pos">${p + 1}${mov ? html`<small class="mov ${mov > 0 ? "up" : "down"}">${mov > 0 ? "▲" : "▼"}${Math.abs(mov)}</small>` : ""}</td>${celClube(t.clube)}${marca}<td class="big">${t.p}</td><td class="dim${so}">${t.j}${jogam.has(t.clube) ? html`<i class="pend" title="Ainda joga nesta rodada"></i>` : ""}</td>${det(t.v)}${det(t.e)}${det(t.d)}${det(t.gp)}${det(t.gc)}<td class="dim${so}">${saldo(t.gp - t.gc)}</td>${comForma ? html`<td class="l w">${forma(t.clube)}</td>` : ""}${chances ? COLUNAS.map(([k, , tom]) => (c ? celProb(tom, c[k]) : html`<td class="dim">…</td>`)) : ""}</tr>`;
    })}</tbody>
  </table></div>`;
}

export function telaClassificacao(vista: string): Html {
  const sec = SECOES.find((s) => s.id === "tabela")!;
  const topo = html`<div class="cabeca-tabela"><h2>Classificação</h2>${seletor(sec.vistas, vista, (k) => link("tabela", k), "Recorte da tabela")}</div>`;
  if (vista === "geral")
    return html`${avisoSimulacao()}${cartaoMeuTime()}${panorama()}${topo}
      <div class="com-lado"><div class="coluna">${tabelaGeral()}${legenda()}
        <p class="note">Chances em % a partir de ${temporada.modelo.simulacoes.toLocaleString("pt-BR")} campeonatos simulados. Mais detalhes em <a href="${link("chances")}">Chances</a>.</p></div>${rodadaEmAndamento()}</div>`;
  const linhas =
    vista === "mandante"
      ? classificacao(nomesClubes, resultados, (_, lado) => lado === "m")
      : vista === "visitante"
        ? classificacao(nomesClubes, resultados, (_, lado) => lado === "v")
        : classificacaoUltimos(nomesClubes, resultados, 10);
  return html`${topo}${tabelaClassificacao(linhas, false, vista === "ultimas-10")}`;
}

/** Um cartão do panorama: até `max` clubes com a chance em `chave`. */
function cartao(res: ResultadoSimulacao, titulo: string, chave: keyof Chances, tom: Tom, filtro: (p: number) => boolean, max: number, vazio: string, rodape = ""): Html {
  const linhas = tabela
    .map((t, i) => ({ clube: t.clube, p: chancesSim(res, i, modoVagas())[chave] }))
    .filter((x) => filtro(x.p))
    .sort((a, b) => b.p - a.p)
    .slice(0, max);
  return html`<section class="briga ${tom}"><h2>${titulo}</h2>${linhas.length
    ? html`<ol>${linhas.map(
        (x) => html`<li><a href="${linkClube(x.clube)}">${escudo(x.clube, 20)}<span>${x.clube}</span><b>${pct(x.p)}</b></a><i style="width:${(x.p * 100).toFixed(1)}%"></i></li>`,
      )}</ol>`
    : html`<p class="note">${vazio}</p>`}${rodape ? html`<p class="note">${rodape}</p>` : ""}</section>`;
}

/** Topo da tela inicial: as três brigas do campeonato e o jogo que mais pesa na próxima rodada. */
function panorama(): Html {
  const res = sims.real;
  if (!res) return html`<div class="panorama carregando-cartoes" aria-hidden="true"><i></i><i></i><i></i></div>`;
  const lider = chancesSim(res, 0, modoVagas()).c;
  const porId = new Map((res.porJogo ?? []).map((E) => [E.id, E]));
  const daRodada = proximaRodada != null ? restantes.filter((g) => g.rodada === proximaRodada) : [];
  const peso = jogosQueMaisPesam(daRodada, porId).sort((a, b) => b.e.peso - a.e.peso)[0];
  // na Libertadores, quem já passou de 97% sai da lista da briga e aparece numa linha embaixo
  const garantidos = tabela.filter((_, i) => chancesSim(res, i, modoVagas()).l > 0.97).map((t) => sigla(t.clube));
  return html`<div class="panorama">
      ${cartao(res, lider > 0.995 ? "Campeão" : "Briga pelo título", "c", "c-title", (p) => p >= 0.005, 6, "")}
      ${cartao(res, "Briga pela Libertadores", "l", "c-lib", (p) => p >= 0.03 && p <= 0.97, 10, "Os classificados já estão praticamente definidos.", garantidos.length ? `Praticamente garantidos: ${garantidos.join(", ")}` : "")}
      ${cartao(res, "Risco de queda", "r", "c-rel", (p) => p >= 0.03, 10, "Ninguém corre risco real.")}
    </div>
    ${peso ? html`<a class="peso" href="${link("jogos")}"><em>Jogo que mais pesa na ${proximaRodada}ª rodada</em><span class="pesa-frase">${fraseDoPeso(peso.obj, peso.g, peso.e)}</span><i aria-hidden="true">›</i></a>` : ""}`;
}

/** Tabela geral; com jogo em andamento, mostra como fica se os placares de agora forem os finais. */
function tabelaGeral(): Html {
  const vivos = restantes.filter((g) => g.aoVivo);
  if (!vivos.length) return tabelaClassificacao(tabela, true, true, true);
  const agora = classificacao(nomesClubes, [...resultados, ...vivos.map((g) => ({ ...g, gm: g.aoVivo!.gm, gv: g.aoVivo!.gv }))]);
  return html`<p class="aviso vivo-aviso"><span class="live">Ao vivo</span> Tabela se os jogos terminassem agora. As setas mostram quantas posições cada time ganha ou perde.</p>
    ${tabelaClassificacao(agora, true, true, true, true)}`;
}
