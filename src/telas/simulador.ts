import { sigla } from "../../config/clubes";
import { CORTES, temporada } from "../../config/temporada";
import { confronto, jogosAdiados, nomesClubes, porData, resultados, restantes, rodadasAbertas, tabela } from "../dados";
import { agendarUsuario, limparPlacares, nPlacares, pedirBase, placares, placaresPorId, rascunhos, salvarPlacares, sims } from "../estado";
import { analisar } from "../modelo/analise";
import { classificacao } from "../modelo/classificacao";
import { chancesDaLinha } from "../modelo/simular";
import type { Jogo, Linha, Placar } from "../modelo/tipos";
import { link } from "../router";
import { atrLinha, celClube, celProb, classeFaixa, legenda, type Tom } from "../ui/componentes";
import { dataJogo, dec, milhar, pct, saldo } from "../ui/formato";
import { html, type Html } from "../ui/html";

type Atalho = "1" | "X" | "2";
const PLACAR: Record<Atalho, Placar> = { "1": [2, 1], X: [1, 1], "2": [1, 2] };
const resultadoDe = (f: Placar): Atalho => (f[0] > f[1] ? "1" : f[0] === f[1] ? "X" : "2");
const $ = (id: string) => document.getElementById(id);

// ---------- tabela simulada ----------

function tabelaSimulada(): (Linha & { max: number })[] {
  const jogados = restantes.filter((g) => placares[confronto(g)]).map((g) => {
    const [gm, gv] = placares[confronto(g)];
    return { ...g, gm, gv };
  });
  const abertos = new Map(nomesClubes.map((c) => [c, 0]));
  for (const g of restantes)
    if (!placares[confronto(g)]) for (const c of [g.mandante, g.visitante]) abertos.set(c, abertos.get(c)! + 1);
  return classificacao(nomesClubes, [...resultados, ...jogados]).map((t) => ({ ...t, max: t.p + 3 * abertos.get(t.clube)! }));
}

function htmlTabela(): Html {
  const linhas = tabelaSimulada();
  const real = tabela.map((t) => t.clube);
  return html`<table style="min-width:680px">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>%</th><th title="Pontos atuais mais 3 por jogo ainda em aberto">Máx</th><th title="Posição simulada comparada com a classificação real">±</th></tr></thead>
    <tbody>${linhas.map((t, p) => {
      const d = real.indexOf(t.clube) - p;
      return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td>${t.j}</td><td>${t.v}</td><td>${t.e}</td><td>${t.d}</td><td>${t.gp}</td><td>${t.gc}</td><td>${saldo(t.gp - t.gc)}</td><td class="dim">${t.j ? Math.round((100 * t.p) / (3 * t.j)) : 0}</td><td class="dim">${t.max}</td>
        <td class="${d > 0 ? "up" : d < 0 ? "down" : "dim"}" aria-label="${d > 0 ? `subiu ${d}` : d < 0 ? `caiu ${-d}` : "mesma posição"}">${d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "="}</td></tr>`;
    })}</tbody>
  </table>`;
}

function htmlContagem(): Html {
  const n = nPlacares();
  return html`<b>${n}</b> simulado${n === 1 ? "" : "s"}, <b>${restantes.length - n}</b> em aberto`;
}

// ---------- jogos ----------

function linhaJogo(g: Jogo): Html {
  const k = confronto(g);
  const f = placares[k];
  const d = rascunhos[k] ?? { m: "", v: "" };
  const vm = f ? f[0] : d.m,
    vv = f ? f[1] : d.v;
  const r = f ? resultadoDe(f) : "";
  const M = sigla(g.mandante),
    V = sigla(g.visitante);
  return html`<div class="sg-row${f ? " done" : ""}" data-row="${k}">
    <div class="meta">${dataJogo(g.data, g.semHora)}</div>
    <div class="ab h" title="${g.mandante}">${M}</div>
    <div class="sc"><input inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Gols do ${g.mandante}" data-s="${k}" value="${vm}">x<input inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Gols do ${g.visitante}" data-s="${k}" value="${vv}"></div>
    <div class="ab" title="${g.visitante}">${V}</div>
    <div class="chips" role="group" aria-label="Atalhos de resultado">
      <button type="button" data-q="${k}" data-k="1" aria-pressed="${r === "1"}">${M} vence</button>
      <button type="button" data-q="${k}" data-k="X" aria-pressed="${r === "X"}">Empate</button>
      <button type="button" data-q="${k}" data-k="2" aria-pressed="${r === "2"}">${V} vence</button>
    </div>
  </div>`;
}

function linhaEncerrado(g: (typeof resultados)[number]): Html {
  return html`<div class="sg-row"><div class="meta">Encerrado</div><div class="ab h" title="${g.mandante}">${sigla(g.mandante)}</div>
    <div class="sc"><span class="fixed">${g.gm}</span>x<span class="fixed">${g.gv}</span></div><div class="ab" title="${g.visitante}">${sigla(g.visitante)}</div></div>`;
}

const abertosDa = (r: number) => restantes.filter((g) => g.rodada === r && !jogosAdiados.includes(g)).sort(porData);
const todosCom = (jogos: Jogo[], k: Atalho) => jogos.length > 0 && jogos.every((g) => placares[confronto(g)] && resultadoDe(placares[confronto(g)]) === k);

function colunaRodada(r: number): Html {
  const feitos = resultados.filter((g) => g.rodada === r);
  const faltam = abertosDa(r);
  const bt = (k: Atalho, rot: string) => html`<button type="button" data-bulk="${k}" data-r="${r}" aria-pressed="${todosCom(faltam, k)}">${rot}</button>`;
  return html`<div class="rcol"><div class="rcol-h"><b>Rodada ${r}</b>
      ${faltam.length ? html`<div class="chips" role="group" aria-label="Preencher a rodada ${r}">${bt("1", "Mandantes vencem")}${bt("X", "Empates")}${bt("2", "Visitantes vencem")}</div>` : ""}</div>
    ${feitos.map(linhaEncerrado)}${faltam.map(linhaJogo)}</div>`;
}

// ---------- chances com a simulação ----------

function htmlChances(): Html {
  const n = nPlacares();
  const titulo = html`<h3>Chances com a sua simulação</h3>`;
  if (!n) return html`${titulo}<p class="note">Simule algum placar para ver como mudam as chances de cada time.</p>`;
  if (!sims.usuario || !sims.real) return html`${titulo}<p class="note">Calculando…</p>`;
  const U = sims.usuario,
    R = sims.real;
  const linhas = tabela
    .map((t, i) => ({ t, a: chancesDaLinha(U.pos[i]), b: chancesDaLinha(R.pos[i]), pts: U.pts[i] }))
    .sort((x, y) => y.pts - x.pts);
  const cel = (tom: Tom, v: number, base: number) => {
    const d = v - base;
    const dif = Math.abs(d) < 0.005 ? "" : html`<small class="${d > 0 ? "up" : "down"}"> ${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}</small>`;
    return celProb(tom, v, "", dif || undefined);
  };
  return html`${titulo}<p class="note">Considerando ${n === 1 ? "o placar que você simulou" : `os ${n} placares que você simulou`} e sorteando o resto. O número pequeno é a diferença, em pontos percentuais, para as chances reais.</p>
    <div class="box"><table style="min-width:640px">
      <thead><tr><th class="l">Clube</th><th>Pts fim</th><th>Campeão</th><th>Liberta</th><th>Sula</th><th>Rebaix.</th></tr></thead>
      <tbody>${linhas.map(
        (r) => html`<tr ${atrLinha(r.t.clube)}>${celClube(r.t.clube)}<td class="dim">${dec(r.pts)}</td>${cel("c-title", r.a.c, r.b.c)}${cel("c-lib", r.a.l, r.b.l)}${cel("c-sula", r.a.s, r.b.s)}${cel("c-rel", r.a.r, r.b.r)}</tr>`,
      )}</tbody>
    </table></div>`;
}

// ---------- análise de plausibilidade ----------

const VEREDITOS = [
  ["Muito plausível", "var(--win)", "Seus resultados são mais prováveis que a maioria dos campeonatos que o modelo gera."],
  ["Plausível", "var(--accent)", "Tem algumas surpresas, mas nada fora do comum."],
  ["Improvável", "var(--title)", "Tem bem mais zebras do que um campeonato típico."],
  ["Muito improvável", "var(--rel)", "Para acontecer, precisaria de uma sequência rara de zebras."],
] as const;

function htmlAnalise(): Html {
  const titulo = html`<h3>Análise da simulação</h3>`;
  const abertos = restantes.length - nPlacares();
  if (abertos > 0)
    return html`${titulo}<p class="note">Preencha ${abertos === 1 ? "o último jogo em aberto" : html`os <b>${abertos}</b> jogos em aberto`} para ver se essa tabela final é provável, segundo o modelo.</p>`;
  if (!sims.base) {
    pedirBase();
    return html`${titulo}<p class="note">Comparando sua tabela com ${milhar(temporada.modelo.simulacoes)} campeonatos simulados pelo modelo…</p>`;
  }
  const B = sims.base;
  const final = tabelaSimulada();
  const a = analisar(final, tabela, restantes, placaresPorId(), B);
  const [nome, cor, frase] = VEREDITOS[a.veredito];
  const umEm = (p: number) => (p <= 0 ? `menos de 1 em ${milhar(B.n)}` : p >= 0.5 ? pct(p) : `${pct(p)} (1 em ${milhar(Math.round(1 / p))})`);
  const raro = (p: number) => (p ? pct(p) : "<0,01%");
  const txt = (z: (typeof a.zebras)[number]) =>
    z.resultado === 0 ? `${z.jogo.mandante} vence ${z.jogo.visitante}` : z.resultado === 2 ? `${z.jogo.visitante} vence ${z.jogo.mandante} fora` : `${z.jogo.mandante} empata com ${z.jogo.visitante}`;
  const porClube = new Map(a.surpresas.map((s) => [s.clube, s]));
  return html`${titulo}
    <div class="kpis">
      <div class="kpi veredito" style="border-left-color:${cor}"><small>Veredito</small><b class="marca">${nome}</b><span class="note">${frase}</span></div>
      <div class="kpi"><small>Mais provável que</small><b>${a.percentil > 0.99 ? "99%+" : a.percentil < 0.01 ? "menos de 1%" : `${Math.round(a.percentil * 100)}%`}</b><span class="note">dos campeonatos simulados pelo modelo</span></div>
      <div class="kpi"><small>Campeão: ${a.campeao}</small><b>${pct(a.chanceCampeao)}</b><span class="note">chance de título pelo modelo</span></div>
      <div class="kpi"><small>Esses ${CORTES.rebaixados} rebaixados juntos</small><b>${raro(a.chanceRebaixados)}</b><span class="note">${a.rebaixados.join(", ")}</span></div>
      <div class="kpi"><small>Esses ${CORTES.lib} na Libertadores</small><b>${raro(a.chanceG7)}</b><span class="note">o mesmo grupo do 1º ao ${CORTES.lib}º, em qualquer ordem</span></div>
    </div>
    <div class="grid2">
      <div class="box"><table>
        <thead><tr><th class="l">Maiores surpresas na tabela</th><th>Posição</th><th>Esperada</th><th class="l">Chance de ficar ali ou além</th></tr></thead>
        <tbody>${[...a.surpresas].sort((x, y) => x.cauda - y.cauda).slice(0, 8).map(
          (s) => html`<tr ${atrLinha(s.clube)}>${celClube(s.clube)}<td class="big">${s.posicao + 1}º</td><td class="dim">${dec(s.posEsperada)}º</td>${celProb(s.acimaDoEsperado ? "c-acc" : "c-rel", s.cauda)}</tr>`,
        )}</tbody>
      </table><p class="note">Verde: chance de terminar nessa posição ou melhor (acima do esperado). Vermelho: nessa posição ou pior (abaixo do esperado).</p></div>
      <div class="box"><table>
        <thead><tr><th class="l">Resultados menos prováveis</th><th class="l">Placar</th><th>Chance</th></tr></thead>
        <tbody>${a.zebras.slice(0, 8).map((z) => html`<tr><td class="l">${txt(z)}</td><td class="l dim">${z.placar[0]} x ${z.placar[1]}</td><td>${pct(z.chance)}</td></tr>`)}</tbody>
      </table></div>
    </div>
    <div class="box"><table style="min-width:560px">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th>Pts esperados</th><th>Pos. esperada</th><th>Chance da posição exata</th></tr></thead>
      <tbody>${final.map((t, p) => {
        const s = porClube.get(t.clube)!;
        const d = t.p - s.ptsEsperados;
        return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td class="${d >= 4 ? "up" : d <= -4 ? "down" : "dim"}">${dec(s.ptsEsperados, 0)} (${d >= 0 ? "+" : ""}${dec(d, 0)})</td><td class="dim">${dec(s.posEsperada)}º</td><td>${umEm(s.exata)}</td></tr>`;
      })}</tbody>
    </table></div>
    <p class="note">O veredito olha só para vitória, empate ou derrota em cada jogo, não para o placar exato. Qualquer tabela final exata, com as 20 posições na ordem, é muito rara, até a mais provável. Por isso a análise olha para grupos (campeão, Libertadores, rebaixados) e para a posição de cada time.</p>`;
}

// ---------- tela ----------

/** Par de rodadas mostrado: a escolhida no endereço e a seguinte. */
function parDeRodadas(numero: number | null): number[] {
  const R = rodadasAbertas;
  let i = numero != null ? R.indexOf(numero) : 0;
  if (i < 0) i = 0;
  i = Math.min(i, Math.max(0, R.length - 2));
  return R.slice(i, i + 2);
}

export function telaSimulador(numero: number | null): Html {
  const R = rodadasAbertas;
  const par = parDeRodadas(numero);
  const i = R.indexOf(par[0]);
  const ant = R[Math.max(0, i - 2)],
    prox = R[Math.min(R.length - 2, i + 2)];
  const nav = par.length
    ? html`<div class="round-nav" id="simRounds">
        ${i > 0 ? html`<a class="btn" href="${link("simulador", ant)}" aria-label="Rodadas anteriores" data-snav>‹</a>` : html`<span class="btn" aria-disabled="true">‹</span>`}
        <b>Rodadas ${par.join(" e ")}</b>
        ${i < R.length - 2 ? html`<a class="btn" href="${link("simulador", prox)}" aria-label="Próximas rodadas" data-snav>›</a>` : html`<span class="btn" aria-disabled="true">›</span>`}
      </div>`
    : "";
  return html`<div class="sim-head"><span class="note" id="simCount">${htmlContagem()}</span><button type="button" data-act="limpar">Limpar simulação</button></div>
    <p class="note">Digite os placares ou use os atalhos. Ao digitar um gol, o cursor passa para o próximo campo. As setas ← e → do teclado mudam as rodadas. As outras telas continuam mostrando só os resultados reais.</p>
    ${legenda()}
    <div class="box" id="simTable">${htmlTabela()}</div>
    ${jogosAdiados.length
      ? html`<div class="pend"><div class="rcol-h"><b>Jogo${jogosAdiados.length > 1 ? "s" : ""} pendente${jogosAdiados.length > 1 ? "s" : ""}</b><span class="note">${jogosAdiados.map((g) => `adiado da ${g.rodada}ª rodada`).filter((v, k, a) => a.indexOf(v) === k).join(", ")}</span></div>${jogosAdiados.map(linhaJogo)}</div>`
      : ""}
    ${nav}
    <div class="rounds2">${par.map(colunaRodada)}</div>
    <div class="chart" id="simProbs">${htmlChances()}</div>
    <div class="chart" id="simAnalysis">${htmlAnalise()}</div>`;
}

/** Atualiza só as partes que mudam, sem redesenhar os campos (o foco continua onde está). */
let esperaAnalise: ReturnType<typeof setTimeout> | undefined;
export function atualizarSimulador() {
  const t = $("simTable");
  if (!t) return;
  t.innerHTML = String(htmlTabela());
  $("simCount")!.innerHTML = String(htmlContagem());
  document.querySelectorAll<HTMLElement>(".sg-row[data-row]").forEach((row) => {
    const f = placares[row.dataset.row!];
    const k = f ? resultadoDe(f) : "";
    row.classList.toggle("done", !!f);
    row.querySelectorAll<HTMLButtonElement>("button[data-q]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
    if (f) {
      const ins = row.querySelectorAll("input");
      if (document.activeElement !== ins[0]) ins[0].value = String(f[0]);
      if (document.activeElement !== ins[1]) ins[1].value = String(f[1]);
    }
  });
  document.querySelectorAll<HTMLButtonElement>("button[data-bulk]").forEach((b) => {
    b.setAttribute("aria-pressed", String(todosCom(abertosDa(+b.dataset.r!), b.dataset.bulk as Atalho)));
  });
  atualizarResultadosSimulador(restantes.length - nPlacares() ? 0 : 400);
}

/** Chamado também quando chega uma simulação nova do Worker. */
export function atualizarResultadosSimulador(atrasoAnalise = 0) {
  const p = $("simProbs");
  if (p) p.innerHTML = String(htmlChances());
  clearTimeout(esperaAnalise);
  esperaAnalise = setTimeout(() => {
    const a = $("simAnalysis");
    if (a) a.innerHTML = String(htmlAnalise());
  }, atrasoAnalise);
}

function definir(k: string, placar: Placar | null) {
  if (placar) placares[k] = placar;
  else delete placares[k];
  delete rascunhos[k];
  salvarPlacares();
  agendarUsuario();
}

/** Eventos do simulador (delegados em `main`). Devolve true quando tratou o clique. */
export function cliqueSimulador(alvo: HTMLElement, redesenhar: () => void): boolean {
  const q = alvo.closest<HTMLButtonElement>("button[data-q]");
  if (q) {
    const k = q.dataset.q!,
      at = q.dataset.k as Atalho;
    const atual = placares[k];
    // clicar de novo no mesmo atalho (com o placar padrão dele) desmarca
    const desmarca = atual && resultadoDe(atual) === at && atual.join() === PLACAR[at].join();
    definir(k, desmarca ? null : [...PLACAR[at]]);
    if (desmarca) {
      const row = q.closest(".sg-row");
      row?.querySelectorAll("input").forEach((i) => (i.value = ""));
    }
    atualizarSimulador();
    return true;
  }
  const b = alvo.closest<HTMLButtonElement>("button[data-bulk]");
  if (b) {
    const jogos = abertosDa(+b.dataset.r!),
      at = b.dataset.bulk as Atalho;
    const todos = todosCom(jogos, at);
    for (const g of jogos) {
      if (todos) delete placares[confronto(g)];
      else placares[confronto(g)] = [...PLACAR[at]];
      delete rascunhos[confronto(g)];
    }
    salvarPlacares();
    agendarUsuario();
    redesenhar();
    return true;
  }
  if (alvo.closest("button[data-act='limpar']")) {
    limparPlacares();
    agendarUsuario();
    redesenhar();
    return true;
  }
  return false;
}

export function digitacaoSimulador(inp: HTMLInputElement) {
  inp.value = inp.value.replace(/\D/g, "").slice(0, 2);
  const k = inp.dataset.s!;
  const ins = inp.closest(".sg-row")!.querySelectorAll("input");
  const m = ins[0].value,
    v = ins[1].value;
  if (m !== "" && v !== "") definir(k, [+m, +v]);
  else {
    delete placares[k];
    if (m === "" && v === "") delete rascunhos[k];
    else rascunhos[k] = { m, v };
    salvarPlacares();
    agendarUsuario();
  }
  atualizarSimulador();
  if (inp.value.length >= 1) {
    const todos = [...document.querySelectorAll<HTMLInputElement>("#main input[data-s]")];
    const prox = todos[todos.indexOf(inp) + 1];
    if (prox) {
      prox.focus();
      prox.select();
    }
  }
}

/** Setas do teclado mudam o par de rodadas. */
export function teclaSimulador(e: KeyboardEvent) {
  const alvo = e.target as HTMLElement;
  if (alvo.closest?.("input,select,textarea")) return;
  const dir = e.key === "ArrowLeft" ? "‹" : e.key === "ArrowRight" ? "›" : null;
  if (!dir) return;
  const a = [...document.querySelectorAll<HTMLAnchorElement>("#simRounds a[data-snav]")].find((x) => x.textContent?.trim() === dir);
  if (a) location.hash = a.getAttribute("href")!;
}
