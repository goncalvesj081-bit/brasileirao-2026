// Série B: tabela, chances (título, acesso direto, mata-mata, queda) e jogos, com os dados da ESPN.
// A simulação é calculada só quando alguém abre a seção.

import serieBJson from "../../data/serieb.json";
import { slugTexto } from "../../config/clubes";
import { classificacao, jogosDoClube } from "../modelo/classificacao";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { criarRng, hash } from "../modelo/rng";
import { REGRA_B, simularSerieB, type ChancesB, type SerieB } from "../modelo/serieb";
import type { Jogo, Resultado } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { celProb, gravarPref, lerPref, seletor, vazio } from "../ui/componentes";
import { curvasPorRodada, posicaoPorRodada } from "../ui/graficos";
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

/** Escudo da Série B: primeiro a cópia no próprio site; se faltar, o da ESPN; se também falhar, some. */
const escB = (clube: string, tam = 20) => {
  const url = serieB.escudos[clube];
  if (!url) return html`<span class="esc" style="--a:#6e757e;--b:#2b3037;--t:${tam}px" aria-hidden="true"></span>`;
  const reserva = `if(!this.dataset.r){this.dataset.r=1;this.src='${url}'}else{this.remove()}`;
  return html`<span class="esc ok" style="--t:${tam}px" aria-hidden="true"><img src="escudos/b/${slugB(clube)}.png" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" onerror="${reserva}"></span>`;
};
/** Endereço do clube da Série B: "Atlético Goianiense" → "atletico-goianiense". */
export const slugB = slugTexto;
export const clubePorSlugB = (s: string) => serieB.clubes.find((c) => slugB(c) === s) ?? null;
const linkB = (c: string) => link("serie-b", "clube", slugB(c));
const celClubeB = (clube: string) => html`<td class="l team"><a href="${linkB(clube)}">${escB(clube)}<span class="nome">${clube}</span></a></td>`;

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
  const lado = (c: string, dir: "m" | "v") => html`<a class="lado ${dir}" href="${linkB(c)}">${escB(c, 24)}<span class="nome">${c}</span><small>${pos.get(c)}º</small></a>`;
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

// ---------- página do clube ----------

/** Chances depois de cada rodada (rodada estimada), calculadas aos poucos para não travar a tela. */
let evolucao: Map<number, ChancesB> | null = null;
let evolucaoAgendada = false;
function pedirEvolucao(): Map<number, ChancesB> | null {
  if (evolucao || evolucaoAgendada) return evolucao;
  evolucaoAgendada = true;
  const rodadas = [...new Set(serieB.resultados.map((g) => g.rodada))].sort((a, b) => a - b);
  const todos: Jogo[] = [...serieB.resultados, ...serieB.restantes];
  const parcial = new Map<number, ChancesB>();
  let k = 0;
  const passo = () => {
    const r = rodadas[k++];
    if (r == null) {
      evolucao = parcial;
      aoTerminar();
      return;
    }
    const feitos = serieB.resultados.filter((g) => g.rodada <= r);
    const ids = new Set(feitos.map((g) => g.id));
    parcial.set(r, simularSerieB({ clubes: serieB.clubes, resultados: feitos, restantes: todos.filter((g) => !ids.has(g.id)) }, 1500, criarRng(r * 7919)));
    setTimeout(passo, 0);
  };
  setTimeout(passo, 60);
  return null;
}

function telaClubeB(clube: string): Html {
  const p = tabelaB.findIndex((t) => t.clube === clube);
  if (p < 0) return vazio("Clube não encontrado na Série B.");
  const t = tabelaB[p];
  const c = pedirChances();
  const k = c ? c.tabela.findIndex((x) => x.clube === clube) : -1;
  const kpi = (rot: string, v: number, cls: string) => html`<div class="kpi ${v < 0.001 ? "zero" : ""}"><small>${rot}</small><b class="${cls}">${pct(v)}</b></div>`;
  const F = forcas(tabelaB);
  const proximos = serieB.restantes.filter((g) => g.mandante === clube || g.visitante === clube).sort((a, b) => (a.data ?? "9").localeCompare(b.data ?? "9"));
  const feitos = jogosDoClube(clube, serieB.resultados).reverse();
  const ev = pedirEvolucao();
  let graficos: Html = html`<p class="empty carregando">Calculando as chances de cada rodada</p>`;
  if (ev) {
    const pts = [...ev.entries()].map(([r, ch]) => ({ r, i: ch.tabela.findIndex((x) => x.clube === clube) }));
    const pos = [...ev.keys()].map((r) => ({ r, pos: classificacao(serieB.clubes, serieB.resultados.filter((g) => g.rodada <= r)).findIndex((x) => x.clube === clube) + 1 }));
    graficos = html`<section class="tsec"><h3>Chance de acesso e de queda, rodada a rodada</h3>
        <p class="note">Calculadas só com os resultados que existiam até aquela rodada (${(1500).toLocaleString("pt-BR")} campeonatos por rodada). A rodada é estimada pela ordem dos jogos.</p>
        ${curvasPorRodada(`Chances do ${clube} rodada a rodada`, [
          { nome: "Acesso", cor: "var(--lib)", vals: pts.map(({ r, i }) => ({ r, v: ev.get(r)!.acesso[i] })) },
          { nome: "Queda", cor: "var(--rel)", vals: pts.map(({ r, i }) => ({ r, v: ev.get(r)!.queda[i] })) },
        ])}</section>
      <section class="tsec"><h3>Posição depois de cada rodada</h3>
        ${posicaoPorRodada(`Posição do ${clube} rodada a rodada`, pos, [
          [1, REGRA_B.diretos, "var(--lib)"],
          [REGRA_B.diretos + 1, REGRA_B.playoffAte, "var(--sula)"],
          [tabelaB.length - REGRA_B.rebaixados + 1, tabelaB.length, "var(--rel)"],
        ])}</section>`;
  }
  return html`<div class="ficha">
      <div class="ficha-pos ${zonaB(p, tabelaB.length)}"><b>${p + 1}º</b></div>
      <dl>
        <div><dt>Pontos</dt><dd>${t.p}</dd></div>
        <div><dt>Jogos</dt><dd>${t.j}</dd></div>
        <div><dt>Campanha</dt><dd>${t.v}V ${t.e}E ${t.d}D</dd></div>
        <div><dt>Saldo</dt><dd>${saldo(t.gp - t.gc)}</dd></div>
        <div><dt>Últimos 5</dt><dd>${forma(clube)}</dd></div>
      </dl>
    </div>
    <div class="colunas">
      <div class="coluna">
        <section class="tsec"><h3>Chances no fim da Série B</h3>
          ${c && k >= 0
            ? html`<div class="kpis">${kpi("Título", c.titulo[k], "t-title")}${kpi("Sobe direto", c.direto[k], "t-lib")}${kpi("Mata-mata", c.playoff[k], "t-sula")}${kpi("Acesso", c.acesso[k], "t-lib")}${kpi("Queda", c.queda[k], "t-rel")}</div>
              <p class="note">Deve terminar com cerca de ${Math.round(c.pts[k])} pontos.</p>`
            : html`<p class="empty carregando">Calculando</p>`}
        </section>
        <section class="tsec"><h3>Jogos que faltam</h3>
          ${proximos.length
            ? html`<div class="box sem-linha"><table class="tab"><thead><tr><th class="l">Data</th><th class="l">Jogo</th><th>Vence</th><th>Empata</th><th>Perde</th></tr></thead><tbody>${proximos.map((g) => {
                const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
                const casa = g.mandante === clube;
                const adv = casa ? g.visitante : g.mandante;
                const [v, d] = casa ? [H, A] : [A, H];
                return html`<tr><td class="l dim">${g.data ? dataJogo(g.data).split(",")[0] : "Adiado"}</td><td class="l team"><a href="${linkB(adv)}"><span class="dim casa">${casa ? "x" : "@"}</span>${escB(adv, 18)}<span>${adv}</span></a></td><td class="${v > d ? "up" : ""}">${pct(v)}</td><td class="dim">${pct(D)}</td><td class="${d > v ? "down" : ""}">${pct(d)}</td></tr>`;
              })}</tbody></table></div><p class="note">“x” é jogo em casa e “@”, fora.</p>`
            : html`<p class="note">Sem jogos restantes.</p>`}
        </section>
      </div>
      <div class="coluna">${graficos}
        <section class="tsec"><h3>Resultados em ${new Date().getFullYear()}</h3>
          <div class="box sem-linha"><table class="tab"><tbody>${feitos.map(
            (g) => html`<tr><td class="l dim">${g.data ? dataJogo(g.data).split(",")[0] : ""}</td><td class="l team"><a href="${linkB(g.adversario)}"><span class="dim casa">${g.casa ? "x" : "@"}</span>${escB(g.adversario, 18)}<span>${g.adversario}</span></a></td><td class="big">${g.pro}-${g.contra}</td><td><span class="form"><i class="${g.res}">${g.res}</i></span></td></tr>`,
          )}</tbody></table></div>
        </section>
      </div>
    </div>${fonteB()}`;
}

// ---------- simulador ----------

type PlacarB = [number, number];
function lerPlacaresB(): Record<string, PlacarB> {
  try {
    return JSON.parse(lerPref("serieb-placares", "{}")) as Record<string, PlacarB>;
  } catch {
    return {};
  }
}
const placaresB = lerPlacaresB();
const ehNum = (x: string) => /^\d{1,2}$/.test(x);

function chancesSimuladas(): ChancesB {
  const fixos = serieB.restantes.filter((g) => placaresB[g.id]);
  const resultados: Resultado[] = [...serieB.resultados, ...fixos.map((g) => ({ ...g, gm: placaresB[g.id][0], gv: placaresB[g.id][1] }))];
  const restantes = serieB.restantes.filter((g) => !placaresB[g.id]);
  return simularSerieB({ clubes: serieB.clubes, resultados, restantes }, restantes.length ? 4000 : 1, criarRng(12345));
}

function resultadoSimulador(): Html {
  const c = chancesSimuladas();
  const n = Object.keys(placaresB).length;
  return html`<p class="note">${n ? `${n} placar${n > 1 ? "es" : ""} seu${n > 1 ? "s" : ""}; o resto é sorteado.` : "Preencha placares para ver como as chances mudam."}</p>
    <div class="box"><table class="tab curta">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th>Acesso</th><th>Queda</th></tr></thead>
      <tbody>${c.tabela.map(
        (t, p) => html`<tr class="${zonaB(p, c.tabela.length)}"><td class="pos">${p + 1}</td>${celClubeB(t.clube)}<td class="big">${t.p}</td>${celProb("c-lib", c.acesso[p])}${celProb("c-rel", c.queda[p])}</tr>`,
      )}</tbody></table></div>`;
}

function telaSimuladorB(): Html {
  const jogos = [...serieB.restantes].sort((a, b) => (a.data ?? "9").localeCompare(b.data ?? "9"));
  if (!jogos.length) return vazio("Não há jogos restantes para simular.");
  return html`<div class="colunas">
    <div class="coluna"><section class="tsec"><h3>Jogos que faltam</h3>
      <div class="sim-b">${jogos.map((g) => {
        const pl = placaresB[g.id];
        return html`<div class="sim-b-jogo"><small class="dim">${g.data ? dataJogo(g.data) : "Adiado"}</small>
          <div class="sim-b-linha"><span class="nm">${escB(g.mandante, 18)}${g.mandante}</span>
          <input inputmode="numeric" maxlength="2" data-sb="${g.id}" data-lado="m" value="${pl ? pl[0] : ""}" aria-label="Gols do ${g.mandante}">
          <span class="dim">x</span>
          <input inputmode="numeric" maxlength="2" data-sb="${g.id}" data-lado="v" value="${pl ? pl[1] : ""}" aria-label="Gols do ${g.visitante}">
          <span class="nm v">${g.visitante}${escB(g.visitante, 18)}</span></div></div>`;
      })}</div>
      <button type="button" class="discreto" data-sb-limpar>Apagar meus placares</button>
    </section></div>
    <div class="coluna"><section class="tsec"><h3>Como fica</h3><div id="sb-res">${resultadoSimulador()}</div></section></div>
  </div>`;
}

let esperaB: ReturnType<typeof setTimeout> | undefined;
/** Digitação no simulador da Série B: guarda o placar quando os dois lados têm número e recalcula. */
export function digitacaoSerieB(inp: HTMLInputElement) {
  const id = inp.dataset.sb!;
  const par = [...document.querySelectorAll<HTMLInputElement>(`input[data-sb="${id}"]`)];
  const m = par.find((x) => x.dataset.lado === "m")!.value.trim(),
    v = par.find((x) => x.dataset.lado === "v")!.value.trim();
  if (ehNum(m) && ehNum(v)) placaresB[id] = [+m, +v];
  else delete placaresB[id];
  gravarPref("serieb-placares", JSON.stringify(placaresB));
  clearTimeout(esperaB);
  esperaB = setTimeout(() => {
    const alvo = document.getElementById("sb-res");
    if (alvo) alvo.innerHTML = String(resultadoSimulador());
  }, 250);
}
export function limparSerieB() {
  for (const k of Object.keys(placaresB)) delete placaresB[k];
  gravarPref("serieb-placares", "{}");
}

export function telaSerieB(vista: string, extra = ""): Html {
  const vistas = SECOES.find((x) => x.id === "serie-b")!.vistas;
  if (!serieB.clubes.length) return html`${seletor(vistas, vista, (k) => link("serie-b", k), "Série B")}${vazio("Os dados da Série B chegam na próxima atualização automática.")}`;
  if (vista === "clube") {
    const c = clubePorSlugB(extra);
    return html`${seletor(vistas, "", (k) => link("serie-b", k), "Série B")}${c ? html`<h2 class="titulo-b">${escB(c, 30)} ${c}</h2>${telaClubeB(c)}` : vazio("Clube não encontrado na Série B.")}`;
  }
  const topo = seletor(vistas, vista, (k) => link("serie-b", k), "Série B");
  const corpo = vista === "chances" ? telaChances() : vista === "jogos" ? telaJogos() : vista === "simular" ? telaSimuladorB() : telaTabela();
  return html`${topo}${corpo}`;
}
