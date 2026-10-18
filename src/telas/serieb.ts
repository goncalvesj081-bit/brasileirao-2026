// Série B: tabela, chances (título, acesso direto, mata-mata, queda) e jogos, com os dados da ESPN.
// A simulação é calculada só quando alguém abre a seção.

import serieBJson from "../../data/serieb.json";
import { classificacao, jogosDoClube } from "../modelo/classificacao";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { criarRng, hash } from "../modelo/rng";
import { REGRA_B, simularSerieB, type ChancesB, type SerieB } from "../modelo/serieb";
import type { Jogo } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { celProb, seletor, vazio } from "../ui/componentes";
import { dataHora, dataJogo, dec, pct, saldo } from "../ui/formato";
import { html, type Html } from "../ui/html";

export const serieB = serieBJson as unknown as SerieB;

const tabelaB = classificacao(serieB.clubes, serieB.resultados);
const N_SIM = 10000;

let chances: ChancesB | null = null;
let agendado = false;
let aoTerminar: () => void = () => {};
/** Quem redesenha a tela quando a simulação da Série B termina. */
export const aoCalcularSerieB = (f: () => void) => (aoTerminar = f);

function pedirChances(): ChancesB | null {
  if (chances || agendado || !serieB.clubes.length) return chances;
  agendado = true;
  // deixa a tela aparecer antes de calcular
  setTimeout(() => {
    const semente = parseInt(hash(JSON.stringify(serieB.resultados.map((g) => [g.id, g.gm, g.gv]))), 16);
    chances = simularSerieB(serieB, N_SIM, criarRng(semente));
    aoTerminar();
  }, 30);
  return null;
}

const escB = (clube: string, tam = 20) => {
  const url = serieB.escudos[clube];
  return url
    ? html`<span class="esc ok" style="--t:${tam}px" aria-hidden="true"><img src="${url}" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" onerror="this.remove()"></span>`
    : html`<span class="esc" style="--a:#6e757e;--b:#2b3037;--t:${tam}px" aria-hidden="true"></span>`;
};
const celClubeB = (clube: string) => html`<td class="l team"><span class="lado-b">${escB(clube)}<span class="nome">${clube}</span></span></td>`;

/** Cor da faixa pela posição (0-based): acesso direto, mata-mata, queda. */
function zonaB(p: number, n: number): string {
  if (p < REGRA_B.diretos) return "z-lib";
  if (p < REGRA_B.playoffAte) return "z-sula";
  if (p >= n - REGRA_B.rebaixados) return "z-rel";
  return "";
}

function forma(clube: string): Html {
  const jogos = jogosDoClube(clube, serieB.resultados).slice(-5);
  return html`<span class="form">${jogos.map((g) => html`<i class="${g.res}" title="${g.casa ? "x" : "@"} ${g.adversario} ${g.pro}-${g.contra}">${g.res}</i>`)}</span>`;
}

const legendaB = () => html`<div class="legend">
  <span><i style="background:var(--lib)"></i>Sobe direto, 1º e 2º</span>
  <span><i style="background:var(--sula)"></i>Mata-mata de acesso, 3º ao 6º</span>
  <span><i style="background:var(--rel)"></i>Rebaixamento, 17º ao 20º</span>
</div>`;

const fonteB = () =>
  html`<p class="note">Dados da ESPN${serieB.atualizado ? `, atualizados ${dataHora(serieB.atualizado)}` : ""}. ${serieB.resultados.length} jogos disputados, ${serieB.restantes.length} restantes.</p>`;

function telaTabela(): Html {
  const c = pedirChances();
  const i = (clube: string) => c?.tabela.findIndex((t) => t.clube === clube) ?? -1;
  return html`<div class="box"><table class="tab">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th>SG</th><th class="l w">Últimos 5</th><th>Acesso</th><th>Queda</th></tr></thead>
    <tbody>${tabelaB.map((t, p) => {
      const k = i(t.clube);
      return html`<tr class="${zonaB(p, tabelaB.length)}"><td class="pos">${p + 1}</td>${celClubeB(t.clube)}<td class="big">${t.p}</td><td class="dim">${t.j}</td><td class="w">${t.v}</td><td class="w">${t.e}</td><td class="w">${t.d}</td><td class="w">${t.gp}</td><td class="w">${t.gc}</td><td class="dim">${saldo(t.gp - t.gc)}</td><td class="l w">${forma(t.clube)}</td>${
        c && k >= 0 ? html`${celProb("c-lib", c.acesso[k])}${celProb("c-rel", c.queda[k])}` : html`<td class="dim">…</td><td class="dim">…</td>`
      }</tr>`;
    })}</tbody>
  </table></div>${legendaB()}
  <p class="note">Acesso: subir direto ou pelo mata-mata, em ${N_SIM.toLocaleString("pt-BR")} campeonatos simulados.</p>${fonteB()}`;
}

function telaChances(): Html {
  const c = pedirChances();
  if (!c) return html`<p class="empty carregando">Calculando ${N_SIM.toLocaleString("pt-BR")} campeonatos</p>`;
  return html`<div class="box"><table class="tab">
    <thead><tr><th>#</th><th class="l">Clube</th><th class="w">Pts</th><th>Título</th><th class="w">Sobe direto</th><th class="w">Mata-mata</th><th>Acesso</th><th>Queda</th><th class="w" title="Pontos esperados no fim">Fim</th></tr></thead>
    <tbody>${c.tabela.map(
      (t, p) => html`<tr class="${zonaB(p, c.tabela.length)}"><td class="pos">${p + 1}</td>${celClubeB(t.clube)}<td class="big w">${t.p}</td>${celProb("c-title", c.titulo[p])}${celProb("c-lib", c.direto[p], "w")}${celProb("c-sula", c.playoff[p], "w")}${celProb("c-lib", c.acesso[p])}${celProb("c-rel", c.queda[p])}<td class="dim w">${dec(c.pts[p], 0)}</td></tr>`,
    )}</tbody>
  </table></div>${legendaB()}
  <p class="note">Sobe direto: terminar em 1º ou 2º. Mata-mata: terminar do 3º ao 6º; 3º x 6º e 4º x 5º, em ida e volta, e o mais bem colocado passa no empate. Acesso: direto ou vencendo o mata-mata.</p>${fonteB()}`;
}

function telaJogos(): Html {
  if (!serieB.clubes.length) return vazio("Dados da Série B ainda não carregados.");
  const F = forcas(tabelaB);
  const pos = new Map(tabelaB.map((t, p) => [t.clube, p + 1]));
  const lado = (c: string, dir: "m" | "v") => html`<span class="lado ${dir}">${escB(c, 24)}<span class="nome">${c}</span><small>${pos.get(c)}º</small></span>`;
  const futuros = serieB.restantes.filter((g) => g.data).sort((a, b) => a.data!.localeCompare(b.data!));
  // próximos 10 jogos e os 10 últimos resultados
  const proximos = futuros.slice(0, 10);
  const semData = serieB.restantes.filter((g) => !g.data);
  const ultimos = [...serieB.resultados].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).slice(0, 10);
  const jogo = (g: Jogo) => {
    const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
    return html`<article class="jogo">
      <div class="quando">${g.data ? dataJogo(g.data) : "Adiado, sem data"}</div>
      <div class="confronto">${lado(g.mandante, "m")}<span class="x">x</span>${lado(g.visitante, "v")}</div>
      <div class="odds" aria-label="Chances: ${g.mandante} ${pct(H)}, empate ${pct(D)}, ${g.visitante} ${pct(A)}">
        <div class="split"><i style="flex:${H}"></i><i style="flex:${D}"></i><i style="flex:${A}"></i></div>
        <div class="nums"><span class="${H > A ? "fav" : ""}">${pct(H)}</span><span>Empate ${pct(D)}</span><span class="${A > H ? "fav" : ""}">${pct(A)}</span></div>
      </div></article>`;
  };
  return html`<h2>Próximos jogos</h2>
    ${proximos.length ? html`<div class="jogos">${proximos.map(jogo)}</div>` : vazio("Não há jogos marcados.")}
    ${semData.length ? html`<p class="note">Sem data: ${semData.map((g) => `${g.mandante} x ${g.visitante}`).join(", ")}.</p>` : ""}
    <h2>Últimos resultados</h2>
    <div class="jogos">${ultimos.map(
      (g) => html`<article class="jogo feito"><div class="quando">${g.data ? dataJogo(g.data) : ""}</div>
        <div class="confronto">${lado(g.mandante, "m")}<span class="placar">${g.gm}<i>x</i>${g.gv}</span>${lado(g.visitante, "v")}</div></article>`,
    )}</div>
    <p class="note">Barra: chance de vitória do mandante, empate e vitória do visitante, pelo mesmo modelo da Série A.</p>${fonteB()}`;
}

export function telaSerieB(vista: string): Html {
  const topo = seletor(SECOES.find((x) => x.id === "serie-b")!.vistas, vista, (k) => link("serie-b", k), "Série B");
  if (!serieB.clubes.length) return html`${topo}${vazio("Os dados da Série B chegam na próxima atualização automática.")}`;
  const corpo = vista === "chances" ? telaChances() : vista === "jogos" ? telaJogos() : telaTabela();
  return html`${topo}${corpo}`;
}
