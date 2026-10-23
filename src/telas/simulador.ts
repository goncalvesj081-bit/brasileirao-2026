import { sigla } from "../../config/clubes";
import { CORTES, temporada } from "../../config/temporada";
import { confronto, jogosAdiados, nomesClubes, porData, resultados, restantes, rodadasAbertas, tabela } from "../dados";
import { agendarUsuario, editaveis, limparPlacares, nPlacares, nSimulados, placares, placaresPorId, rascunhos, salvarPlacares, sims, sincronizarComJogosReais } from "../estado";
import { analisar } from "../modelo/analise";
import { classificacao } from "../modelo/classificacao";
import { forcas, golsEsperados } from "../modelo/forcas";
import { campeonatoMaisProvavel } from "../modelo/maisprovavel";
import { probResultado } from "../modelo/poisson";
import { chancesSim } from "../modelo/simular";
import type { Jogo, Linha, Placar } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, celClube, celProb, classeFaixa, escudo, legenda, modoVagas, seletor, type Tom } from "../ui/componentes";
import { dataJogo, dec, difPP, milhar, pct, saldo } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { navRodada } from "./rodada";

type Atalho = "1" | "X" | "2";
const PLACAR: Record<Atalho, Placar> = { "1": [2, 1], X: [1, 1], "2": [1, 2] };
const resultadoDe = (f: Placar): Atalho => (f[0] > f[1] ? "1" : f[0] === f[1] ? "X" : "2");
const $ = (id: string) => document.getElementById(id);

// ---------- tabela simulada ----------

function tabelaSimulada(): (Linha & { max: number })[] {
  const jogados = restantes
    .filter((g) => placares[confronto(g)])
    .map((g) => {
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
  return html`<table class="tab">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th>SG</th><th title="Pontos atuais mais 3 por jogo ainda em aberto">Máx</th><th title="Posição simulada comparada com a real">±</th></tr></thead>
    <tbody>${linhas.map((t, p) => {
      const d = real.indexOf(t.clube) - p;
      return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td class="dim">${t.j}</td><td class="w">${t.v}</td><td class="w">${t.e}</td><td class="w">${t.d}</td><td class="dim">${saldo(t.gp - t.gc)}</td><td class="dim">${t.max}</td>
        <td class="${d > 0 ? "up" : d < 0 ? "down" : "dim"}" aria-label="${d > 0 ? `subiu ${d}` : d < 0 ? `caiu ${-d}` : "mesma posição"}">${d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "="}</td></tr>`;
    })}</tbody>
  </table>`;
}

// ---------- resumo no topo ----------

function htmlResumo(): Html {
  const n = nSimulados();
  const total = editaveis().length;
  let destaque: Html | "" = "";
  if (nPlacares() && sims.usuario && sims.real) {
    const U = sims.usuario,
      R = sims.real;
    const i = U.pos.reduce((m, r, k) => (r[0] > U.pos[m][0] ? k : m), 0);
    const d = U.pos[i][0] - R.pos[i][0];
    destaque = html`<a class="efeito" href="${link("simular", "resultado")}">${escudo(U.clubes[i], 18)}<span>${U.clubes[i]} campeão</span><b>${pct(U.pos[i][0])}</b>${Math.abs(d) >= 0.001 ? html`<small class="${d > 0 ? "up" : "down"}">${difPP(d)}</small>` : ""}</a>`;
  }
  return html`<div class="progresso"><span><b>${n}</b> de ${total} jogos simulados</span><i style="width:${total ? (100 * n) / total : 100}%"></i></div>${destaque}`;
}

// ---------- jogos ----------

/** Jogo que já começou: placar real, sem campos para mudar (ao vivo se atualiza sozinho). */
function cartaoTravado(g: Jogo, gm: number, gv: number, rotulo: Html): Html {
  const time = (c: string, n: number) => html`<div class="sim-time">${escudo(c, 22)}<span class="nome">${c}</span><b class="sim-real">${n}</b></div>`;
  return html`<article class="sim-jogo done travado"><div class="quando">${rotulo}</div>${time(g.mandante, gm)}${time(g.visitante, gv)}</article>`;
}

function cartaoJogo(g: Jogo): Html {
  if (g.aoVivo) {
    const v = g.aoVivo;
    return cartaoTravado(g, v.gm, v.gv, html`<span class="live">Ao vivo${v.rotulo ? `, ${v.rotulo}` : v.minuto != null ? `, ${v.minuto}'` : ""}</span> · placar real, atualiza sozinho`);
  }
  const k = confronto(g);
  const f = placares[k];
  const d = rascunhos[k] ?? { m: "", v: "" };
  const val = [f ? f[0] : d.m, f ? f[1] : d.v];
  const r = f ? resultadoDe(f) : "";
  const time = (c: string, lado: 0 | 1) => html`<div class="sim-time">
      ${escudo(c, 22)}<span class="nome">${c}</span>
      <button type="button" class="passo" data-passo="-1" data-lado="${lado}" data-k="${k}" aria-label="Menos um gol do ${c}">−</button>
      <input inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Gols do ${c}" data-s="${k}" value="${val[lado]}">
      <button type="button" class="passo" data-passo="1" data-lado="${lado}" data-k="${k}" aria-label="Mais um gol do ${c}">+</button>
    </div>`;
  return html`<article class="sim-jogo${f ? " done" : ""}" data-row="${k}">
    <div class="quando">${dataJogo(g.data, g.semHora)}</div>
    ${time(g.mandante, 0)}${time(g.visitante, 1)}
    <div class="chips" role="group" aria-label="Resultado rápido">
      <button type="button" data-q="${k}" data-k="1" aria-pressed="${r === "1"}">${sigla(g.mandante)}</button>
      <button type="button" data-q="${k}" data-k="X" aria-pressed="${r === "X"}">Empate</button>
      <button type="button" data-q="${k}" data-k="2" aria-pressed="${r === "2"}">${sigla(g.visitante)}</button>
    </div>
  </article>`;
}

const abertosDa = (r: number) => restantes.filter((g) => g.rodada === r && !jogosAdiados.includes(g)).sort(porData);
/** Para os botões de rodada inteira: só os jogos que ainda dá para simular. */
const editaveisDa = (r: number) => abertosDa(r).filter((g) => !g.aoVivo);
const todosCom = (jogos: Jogo[], k: Atalho) => {
  const js = jogos.filter((g) => !g.aoVivo);
  return js.length > 0 && js.every((g) => placares[confronto(g)] && resultadoDe(placares[confronto(g)]) === k);
};

function vistaJogos(numero: number | null): Html {
  const R = rodadasAbertas;
  if (!R.length && !jogosAdiados.length) return html`<p class="empty">Não há mais jogos para simular.</p>`;
  const r = numero != null && R.includes(numero) ? numero : R[0];
  const faltam = r != null ? abertosDa(r) : [];
  const bt = (k: Atalho, rot: string) => html`<button type="button" data-bulk="${k}" data-r="${r}" aria-pressed="${todosCom(faltam, k)}">${rot}</button>`;
  return html`
    ${r != null
      ? html`${navRodada(R, r, (x) => link("simular", "jogos", x), "simRounds")}
        ${faltam.length ? html`<div class="chips rodada-inteira" role="group" aria-label="Preencher a rodada inteira"><span class="dim">Rodada inteira</span>${bt("1", "Mandantes")}${bt("X", "Empates")}${bt("2", "Visitantes")}</div>` : ""}
        <div class="sim-grade">${faltam.map(cartaoJogo)}${resultados
          .filter((g) => g.rodada === r)
          .map((g) => cartaoTravado(g, g.gm, g.gv, html`Encerrado${g.provisorio ? ", placar da ESPN" : ""}`))}</div>`
      : ""}
    ${jogosAdiados.length
      ? html`<section class="pend"><h3>Adiado${jogosAdiados.length > 1 ? "s" : ""}, sem rodada fixa</h3><div class="sim-grade">${jogosAdiados.map(cartaoJogo)}</div></section>`
      : ""}`;
}

// ---------- chances com a simulação ----------

function htmlChances(): Html {
  const n = nPlacares();
  if (!n) return html`<p class="empty">Simule algum placar na aba Jogos para ver aqui como mudam as chances.</p>`;
  if (!sims.usuario || !sims.real) return html`<p class="empty carregando">Calculando</p>`;
  const U = sims.usuario,
    R = sims.real;
  const linhas = tabela
    .map((t, i) => ({ t, a: chancesSim(U, i, modoVagas()), b: chancesSim(R, i, modoVagas()), pts: U.pts[i] }))
    .sort((x, y) => y.pts - x.pts);
  const cel = (tom: Tom, v: number, base: number) => {
    const d = v - base;
    const dif = Math.abs(d) < 0.001 ? "" : html`<small class="${d > 0 ? "up" : "down"}">${difPP(d)}</small>`;
    return celProb(tom, v, "", dif || undefined);
  };
  return html`<div class="box"><table class="tab curta">
      <thead><tr><th class="l">Clube</th><th class="w">Pts fim</th><th>Título</th><th>Liberta</th><th>Sula</th><th>Queda</th></tr></thead>
      <tbody>${linhas.map(
        (r) => html`<tr ${atrLinha(r.t.clube)}>${celClube(r.t.clube)}<td class="dim w">${dec(r.pts)}</td>${cel("c-title", r.a.c, r.b.c)}${cel("c-lib", r.a.l, r.b.l)}${cel("c-sula", r.a.s, r.b.s)}${cel("c-rel", r.a.r, r.b.r)}</tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Com os ${n} placares que você escolheu e o resto sorteado. Em verde e vermelho, quantos pontos percentuais a chance ganhou ou perdeu em relação à real.</p>`;
}

// ---------- análise de plausibilidade ----------

const VEREDITOS = [
  ["Muito plausível", "var(--win)", "Seus resultados são mais prováveis que a maioria dos campeonatos que o modelo gera."],
  ["Plausível", "var(--accent)", "Tem algumas surpresas, mas nada fora do comum."],
  ["Improvável", "var(--title)", "Tem bem mais zebras do que um campeonato típico."],
  ["Muito improvável", "var(--rel)", "Para acontecer, precisaria de uma sequência rara de zebras."],
] as const;

function htmlAnalise(): Html {
  const abertos = restantes.length - nPlacares();
  if (abertos > 0)
    return html`<p class="empty">A análise aparece quando todos os jogos tiverem placar. ${abertos === 1 ? "Falta 1 jogo" : `Faltam ${abertos} jogos`}; use os botões de rodada inteira em <a href="${link("simular", "jogos")}">Palpites</a> para ir mais rápido.</p>`;
  if (!sims.base) {
    return html`<p class="empty carregando">Comparando sua tabela com ${milhar(temporada.modelo.simulacoes)} campeonatos</p>`;
  }
  const B = sims.base;
  const final = tabelaSimulada();
  const a = analisar(final, tabela, restantes, placaresPorId(), B);
  const [nome, cor, frase] = VEREDITOS[a.veredito];
  const umEm = (p: number) => (p < 0.0005 ? "<0,1%" : pct(p));
  const raro = (p: number) => (p ? pct(p) : "<0,01%");
  const txt = (z: (typeof a.zebras)[number]) =>
    z.resultado === 0 ? `${z.jogo.mandante} vence ${z.jogo.visitante}` : z.resultado === 2 ? `${z.jogo.visitante} vence ${z.jogo.mandante} fora` : `${z.jogo.mandante} empata com ${z.jogo.visitante}`;
  const porClube = new Map(a.surpresas.map((s) => [s.clube, s]));
  return html`<div class="veredito" style="--cor:${cor}"><small>Veredito</small><b>${nome}</b><p>${frase} Mais provável que ${a.percentil > 0.999 ? "99,9%" : a.percentil < 0.001 ? "menos de 0,1%" : pct(a.percentil)} dos campeonatos simulados.</p></div>
    <div class="kpis">
      <div class="kpi"><small>${a.campeao} campeão</small><b>${pct(a.chanceCampeao)}</b></div>
      <div class="kpi"><small>Esses ${CORTES.rebaixados} rebaixados juntos</small><b>${raro(a.chanceRebaixados)}</b><span class="note">${a.rebaixados.join(", ")}</span></div>
      <div class="kpi"><small>Esses ${CORTES.lib} primeiros</small><b>${raro(a.chanceG7)}</b><span class="note">o mesmo grupo do 1º ao ${CORTES.lib}º, em qualquer ordem</span></div>
    </div>
    <section><h3>Sua tabela final</h3><div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th>SG</th><th class="w" title="Pontos que o modelo esperava para o clube">Pts esperados</th><th title="Posição em que o clube mais termina nos campeonatos do computador, e em quantos deles">Mais provável</th><th class="w" title="Em quantos campeonatos do computador o clube termina exatamente na posição da sua tabela">Nessa posição</th></tr></thead>
      <tbody>${final.map((t, p) => {
        const s = porClube.get(t.clube)!;
        const d = t.p - s.ptsEsperados;
        const dist = B.pos[B.clubes.indexOf(t.clube)];
        const moda = dist.indexOf(Math.max(...dist));
        return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td class="w">${t.v}</td><td class="w">${t.e}</td><td class="w">${t.d}</td><td class="w dim">${t.gp}</td><td class="w dim">${t.gc}</td><td class="dim">${saldo(t.gp - t.gc)}</td><td class="w ${d >= 4 ? "up" : d <= -4 ? "down" : "dim"}">${dec(s.ptsEsperados, 0)}</td><td><b class="${moda === p ? "" : "dim"}">${moda + 1}º</b> <small class="dim">${umEm(dist[moda])}</small></td><td class="w ${moda === p ? "" : "dim"}">${umEm(s.exata)}</td></tr>`;
      })}</tbody>
    </table></div>${legenda()}</section>
    <div class="grid2">
      <section><h3>Maiores surpresas na tabela</h3><div class="box"><table class="tab">
        <thead><tr><th class="l">Clube</th><th>Ficou</th><th>Esperado</th><th>Chance</th></tr></thead>
        <tbody>${[...a.surpresas].sort((x, y) => x.cauda - y.cauda).slice(0, 8).map(
          (s) => html`<tr ${atrLinha(s.clube)}>${celClube(s.clube)}<td class="big">${s.posicao + 1}º</td><td class="dim">${dec(s.posEsperada)}º</td>${celProb(s.acimaDoEsperado ? "c-acc" : "c-rel", s.cauda)}</tr>`,
        )}</tbody>
      </table></div><p class="note">Chance de terminar nessa posição ou além: melhor, em verde; pior, em vermelho.</p></section>
      <section><h3>Resultados menos prováveis</h3><div class="box"><table class="tab">
        <thead><tr><th class="l">Jogo</th><th>Placar</th><th>Chance</th></tr></thead>
        <tbody>${a.zebras.slice(0, 8).map((z) => html`<tr><td class="l quebra">${txt(z)}</td><td class="dim">${z.placar[0]} x ${z.placar[1]}</td><td>${pct(z.chance)}</td></tr>`)}</tbody>
      </table></div></section>
    </div>
    <p class="note">"Mais provável" é a posição em que o clube mais termina nos ${milhar(B.n)} campeonatos do computador; "Nessa posição", em quantos deles ele termina exatamente onde ficou na sua tabela. O veredito olha só vitória, empate ou derrota de cada jogo, não o placar exato. Uma tabela final exata, com as 20 posições na ordem, é sempre raríssima; por isso a análise olha grupos e a posição de cada time.</p>`;
}

// ---------- projeção do computador ----------

/** Tabela final que o computador espera: pontos médios das simulações e vitórias, empates e gols esperados jogo a jogo. */
function htmlComputador(): Html {
  const R = sims.real;
  if (!R) return html`<p class="empty carregando">Calculando</p>`;
  const F = forcas(tabela);
  const esp = new Map(tabela.map((t) => [t.clube, { v: t.v, e: t.e, d: t.d, gp: t.gp, gc: t.gc }]));
  for (const g of restantes) {
    const [lm, lv] = golsEsperados(F, g.mandante, g.visitante);
    const [H, D, A] = probResultado(lm, lv);
    const m = esp.get(g.mandante),
      v = esp.get(g.visitante);
    if (!m || !v) continue;
    m.v += H;
    m.e += D;
    m.d += A;
    m.gp += lm;
    m.gc += lv;
    v.v += A;
    v.e += D;
    v.d += H;
    v.gp += lv;
    v.gc += lm;
  }
  const N = R.clubes.length;
  const linhas = R.clubes
    .map((c, i) => ({
      c,
      pts: R.pts[i],
      posMedia: R.pos[i].reduce((s, x, p) => s + x * (p + 1), 0),
      titulo: R.pos[i][0],
      lib: R.vagaLib[i],
      queda: R.pos[i].slice(N - CORTES.rebaixados).reduce((a, b) => a + b, 0),
      ...esp.get(c)!,
    }))
    .sort((a, b) => b.pts - a.pts || a.posMedia - b.posMedia);
  const r0 = (x: number) => Math.round(x);
  return html`<p class="note">Como o campeonato termina para o computador, sem nenhum palpite seu: a média de ${milhar(R.n)} campeonatos sorteados com o modelo. Por ser média, os pontos têm casa decimal.</p>
    <p><button type="button" class="discreto" data-act="sortear">Preencher com o campeonato mais provável</button> <span class="note">O computador sorteia 3.000 campeonatos e preenche os jogos que você ainda não simulou com o placar daquele em que a tabela final é a mais provável; os seus jogos ficam como estão.</span></p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th class="w">SG</th><th class="w" title="Posição média nas simulações">Pos. média</th><th>Título</th><th>Liberta</th><th>Queda</th></tr></thead>
      <tbody>${linhas.map(
        (t, p) => html`<tr ${atrLinha(t.c, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.c)}<td class="big">${dec(t.pts)}</td><td class="w">${r0(t.v)}</td><td class="w">${r0(t.e)}</td><td class="w">${r0(t.d)}</td><td class="w dim">${r0(t.gp)}</td><td class="w dim">${r0(t.gc)}</td><td class="dim w">${saldo(r0(t.gp - t.gc))}</td><td class="dim w">${dec(t.posMedia)}º</td>${celProb("c-title", t.titulo)}${celProb("c-lib", t.lib)}${celProb("c-rel", t.queda)}</tr>`,
      )}</tbody>
    </table></div>${legenda()}
    <p class="note">Vitórias, empates, derrotas e gols: os atuais mais a chance de cada resultado e os gols esperados em cada jogo que falta, arredondados.</p>`;
}

// ---------- tela ----------

export function telaSimulador(vista: string, numero: number | null): Html {
  const sec = SECOES.find((s) => s.id === "simular")!;
  let corpo: Html;
  if (vista === "resultado")
    corpo = html`<section><h2>Tabela com seus palpites</h2><div class="box" id="simTable">${htmlTabela()}</div>${legenda()}</section>
      <section><h2>Chances com seus palpites</h2><div id="simProbs">${htmlChances()}</div></section>`;
  else if (vista === "analise") corpo = html`<div id="simAnalysis">${htmlAnalise()}</div>`;
  else if (vista === "computador") corpo = html`<div id="simComputador">${htmlComputador()}</div>`;
  else corpo = vistaJogos(numero);
  return html`${seletor(sec.vistas, vista, (k) => link("simular", k), "Parte do simulador")}
    <div class="sim-topo"><div id="simResumo" class="sim-resumo">${htmlResumo()}</div><button type="button" class="discreto" data-act="limpar">Limpar</button></div>
    ${corpo}`;
}

/** Atualiza só as partes que mudam, sem redesenhar os campos (o foco continua onde está). */
let esperaAnalise: ReturnType<typeof setTimeout> | undefined;
export function atualizarSimulador() {
  const t = $("simTable");
  if (t) t.innerHTML = String(htmlTabela());
  document.querySelectorAll<HTMLElement>(".sim-jogo[data-row]").forEach((row) => {
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
    b.setAttribute("aria-pressed", String(todosCom(editaveisDa(+b.dataset.r!), b.dataset.bulk as Atalho)));
  });
  atualizarResultadosSimulador(restantes.length - nPlacares() ? 0 : 400);
}

/** Chamado também quando chega uma simulação nova do Worker. */
export function atualizarResultadosSimulador(atrasoAnalise = 0) {
  const r = $("simResumo");
  if (r) r.innerHTML = String(htmlResumo());
  const p = $("simProbs");
  if (p) p.innerHTML = String(htmlChances());
  const c = $("simComputador");
  if (c && c.querySelector(".carregando")) c.innerHTML = String(htmlComputador());
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
  const passo = alvo.closest<HTMLButtonElement>("button[data-passo]");
  if (passo) {
    const k = passo.dataset.k!,
      lado = +passo.dataset.lado! as 0 | 1;
    const row = passo.closest(".sim-jogo")!;
    const ins = row.querySelectorAll("input");
    const vals = [ins[0].value, ins[1].value];
    const atual = vals[lado] === "" ? 0 : +vals[lado];
    vals[lado] = String(Math.max(0, Math.min(19, atual + +passo.dataset.passo!)));
    if (vals[1 - lado] === "") vals[1 - lado] = "0";
    ins[0].value = vals[0];
    ins[1].value = vals[1];
    definir(k, [+vals[0], +vals[1]]);
    atualizarSimulador();
    return true;
  }
  const q = alvo.closest<HTMLButtonElement>("button[data-q]");
  if (q) {
    const k = q.dataset.q!,
      at = q.dataset.k as Atalho;
    const atual = placares[k];
    // tocar de novo no mesmo atalho (com o placar padrão dele) desmarca
    const desmarca = atual && resultadoDe(atual) === at && atual.join() === PLACAR[at].join();
    definir(k, desmarca ? null : [...PLACAR[at]]);
    if (desmarca) q.closest(".sim-jogo")?.querySelectorAll("input").forEach((i) => (i.value = ""));
    atualizarSimulador();
    return true;
  }
  const b = alvo.closest<HTMLButtonElement>("button[data-bulk]");
  if (b) {
    const jogos = editaveisDa(+b.dataset.r!),
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
  if (alvo.closest("button[data-act='sortear']")) {
    const R = sims.usuario ?? sims.real;
    if (!R) return true;
    const base = tabelaSimulada();
    const pos = base.map((t) => R.pos[R.clubes.indexOf(t.clube)]);
    const abertos = editaveis().filter((g) => !placares[confronto(g)]);
    const escolhidos = campeonatoMaisProvavel(base, abertos, pos, 3000, Math.random);
    for (const g of abertos) {
      const pl = escolhidos.get(g.id);
      if (!pl) continue;
      placares[confronto(g)] = pl;
      delete rascunhos[confronto(g)];
    }
    salvarPlacares();
    agendarUsuario(0);
    location.hash = link("simular", "analise");
    return true;
  }
  if (alvo.closest("button[data-act='limpar']")) {
    if (!nSimulados() || !confirm("Apagar todos os placares simulados?")) return true;
    limparPlacares();
    // os jogos em andamento continuam com o placar real
    sincronizarComJogosReais();
    agendarUsuario();
    redesenhar();
    return true;
  }
  return false;
}

export function digitacaoSimulador(inp: HTMLInputElement) {
  inp.value = inp.value.replace(/\D/g, "").slice(0, 2);
  const k = inp.dataset.s!;
  const ins = inp.closest(".sim-jogo")!.querySelectorAll("input");
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

/** Setas do teclado mudam a rodada. */
export function teclaSimulador(e: KeyboardEvent) {
  const alvo = e.target as HTMLElement;
  if (alvo.closest?.("input,select,textarea")) return;
  const dir = e.key === "ArrowLeft" ? "‹" : e.key === "ArrowRight" ? "›" : null;
  if (!dir) return;
  const a = [...document.querySelectorAll<HTMLAnchorElement>("#simRounds a[data-snav]")].find((x) => x.textContent?.trim() === dir);
  if (a) location.hash = a.getAttribute("href")!;
}
