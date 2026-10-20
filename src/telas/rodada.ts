import { sigla } from "../../config/clubes";
import { adiado, porData, posicao, proximaRodada, resultados, restantes, retrospectoAntigo, rodadasComJogo, tabela } from "../dados";
import { retrospecto } from "../modelo/retrospecto";
import { temporada } from "../../config/temporada";
import { sims } from "../estado";
import { forcas, golsEsperados } from "../modelo/forcas";
import { efeitosDoJogo, maiorEfeito, type Efeito, type ObjetivoJogo } from "../modelo/impacto";
import { probResultado } from "../modelo/poisson";
import type { EfeitoJogo } from "../modelo/simular";
import type { Jogo, Lance } from "../modelo/tipos";
import { link } from "../router";
import { escudo, linkClube, vazio } from "../ui/componentes";
import { dataJogo, pct } from "../ui/formato";
import { cru, esc, html, type Html } from "../ui/html";

/** Navegação entre rodadas: ‹ 31ª rodada › */
export function navRodada(R: number[], r: number, href: (x: number) => string, id = ""): Html {
  const i = R.indexOf(r);
  const seta = (alvo: number | undefined, rot: string, txt: string) =>
    alvo != null ? html`<a class="seta" href="${href(alvo)}" aria-label="${rot}" data-snav>${txt}</a>` : html`<span class="seta" aria-disabled="true">${txt}</span>`;
  return html`<div class="round-nav" ${id ? html`id="${id}"` : ""}>${seta(R[i - 1], "Rodada anterior", "‹")}<b>${r}ª rodada</b>${seta(R[i + 1], "Próxima rodada", "›")}</div>`;
}

const lado = (c: string, dir: "m" | "v") =>
  html`<a class="lado ${dir}" href="${linkClube(c)}">${escudo(c, 24)}<span class="nome">${c}</span><small>${posicao(c) + 1}º</small></a>`;

const NOME_OBJ: Record<ObjetivoJogo, string> = { c: "título", l: "Libertadores", r: "queda" };
const TOM_OBJ: Record<ObjetivoJogo, string> = { c: "c-title", l: "c-lib", r: "c-rel" };

/** Tabelinha "o que muda": colunas = mandante vence, empate, visitante vence. */
function oQueMuda(g: Jogo, efs: Efeito[]): Html {
  if (!efs.length) return html``;
  const linha = (e: Efeito) => {
    const c = tabela[e.clube].clube;
    const melhor = e.objetivo === "r" ? Math.min(...e.se) : Math.max(...e.se);
    return html`<tr><td class="l"><span class="quem">${escudo(c, 16)}${sigla(c)} <small>${NOME_OBJ[e.objetivo]}</small></span></td>${e.se.map(
      (v) => html`<td class="${TOM_OBJ[e.objetivo]} ${v === melhor ? "forte" : ""}">${pct(v)}</td>`,
    )}</tr>`;
  };
  return html`<details class="muda"><summary>O que muda com o resultado</summary>
    <table><thead><tr><th class="l"></th><th>${sigla(g.mandante)} vence</th><th>Empate</th><th>${sigla(g.visitante)} vence</th></tr></thead>
    <tbody>${efs.map(linha)}</tbody></table></details>`;
}

/** "Retrospecto desde 2022: Flamengo 3 vitórias, 2 empates, Bahia 1 · último: 2025, Flamengo 2 x 1" */
function retroLinha(g: Jogo): Html {
  const r = retrospecto(g.mandante, g.visitante, retrospectoAntigo.jogos, resultados, temporada.ano);
  if (!r.jogos.length) return html``;
  const u = r.jogos[r.jogos.length - 1];
  const desde = Math.min(...r.jogos.map((j) => j[0]));
  const vit = (n: number) => `${n} vitória${n === 1 ? "" : "s"}`;
  return html`<p class="retro">Retrospecto desde ${desde}: <b>${sigla(g.mandante)}</b> ${vit(r.v)}, ${r.e} empate${r.e === 1 ? "" : "s"}, <b>${sigla(g.visitante)}</b> ${vit(r.d)} · último: ${u[0]}, ${sigla(u[2])} ${u[4]} x ${u[5]} ${sigla(u[3])}</p>`;
}

const ICONE: Record<Lance["tipo"], string> = { gol: "⚽", contra: "⚽", amarelo: "🟨", vermelho: "🟥" };

/** Gols e cartões, em ordem; os do mandante à esquerda, os do visitante à direita. */
/** Jogos encerrados com os lances abertos (sobrevive ao redesenho a cada minuto do placar ao vivo). */
const abertos = new Set<string>();
document.addEventListener(
  "toggle",
  (ev) => {
    const d = ev.target;
    if (d instanceof HTMLDetailsElement && d.dataset.jogo) d.open ? abertos.add(d.dataset.jogo) : abertos.delete(d.dataset.jogo);
  },
  true,
);

function lancesHtml(lances: Lance[] | undefined): Html {
  if (!lances?.length) return html``;
  return html`<ul class="lances">${lances.map(
    (l) => html`<li class="${l.lado}"><span class="min">${l.rotulo || `${l.min}'`}</span><span>${ICONE[l.tipo]} ${l.jogador}${l.tipo === "contra" ? " (contra)" : ""}</span></li>`,
  )}</ul>`;
}

/**
 * Chance de um clube ao longo do jogo: em cada minuto, a chance se o placar daquele momento fosse o final.
 * Usa só os gols (os lances) e o efeito do jogo guardado pela simulação.
 */
function chanceDuranteJogo(e: Efeito, lances: Lance[], agora: number): Html {
  const gols = lances.filter((l) => l.tipo === "gol" || l.tipo === "contra");
  // o relógio da ESPN pode vir sem minuto (intervalo) ou atrás do último gol: a linha nunca volta no tempo
  agora = Math.max(agora, ...gols.map((l) => l.min));
  const fim = Math.max(90, agora, ...gols.map((l) => l.min));
  const W = 400,
    H = 138,
    pl = 50,
    pr = 46,
    pt = 10,
    pb = 40;
  const x = (m: number) => pl + ((W - pl - pr) * m) / fim;
  const vals = [...e.se];
  const lo = Math.min(...vals),
    hi = Math.max(...vals);
  const y = (v: number) => pt + (H - pt - pb) * (1 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
  const res = (gm: number, gv: number) => (gm > gv ? 0 : gm === gv ? 1 : 2);
  let gm = 0,
    gv = 0;
  const pontos: [number, number][] = [[0, e.se[1]]];
  for (const l of gols) {
    pontos.push([l.min, e.se[res(gm, gv)]]);
    if (l.lado === "m") gm++;
    else gv++;
    pontos.push([l.min, e.se[res(gm, gv)]]);
  }
  pontos.push([agora, e.se[res(gm, gv)]]);
  const c = tabela[e.clube].clube;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance de ${esc(c)} durante o jogo">`;
  for (const v of [lo, hi]) s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${pct(v)}</text>`;
  for (const m of [0, 45, 90]) s += `<text x="${x(m)}" y="${H - 4}" text-anchor="middle">${m}'</text>`;
  const cor = `var(--${e.objetivo === "c" ? "title" : e.objetivo === "l" ? "lib" : "rel"})`;
  s += `<polyline fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round" points="${pontos.map(([m, v]) => `${x(m)},${y(v)}`).join(" ")}"/>`;
  // as bolinhas dos gols ficam numa faixa própria, embaixo do gráfico, para não cobrir a linha nem o ponto final
  for (const l of gols) s += `<text x="${x(l.min)}" y="${H - pb + 17}" text-anchor="middle" style="font-size:11px">⚽</text>`;
  const u = pontos[pontos.length - 1];
  s += `<circle cx="${x(u[0])}" cy="${y(u[1])}" r="4" fill="${cor}"/><text x="${x(u[0]) + 7}" y="${y(u[1]) + 4}" class="v" style="fill:${cor}">${pct(u[1])}</text>`;
  return html`<div class="durante"><small>${sigla(c)}, ${NOME_OBJ[e.objetivo]}, se o placar de cada momento fosse o final</small>${cru(s + "</svg>")}</div>`;
}

/** Jogo em andamento: como ficam as chances se o placar parcial for o final. */
function seTerminarAssim(g: Jogo, efs: Efeito[]): Html {
  const v = g.aoVivo!;
  const k = v.gm > v.gv ? 0 : v.gm === v.gv ? 1 : 2;
  if (!efs.length) return html``;
  const res = sims.real!;
  return html`<div class="se-assim"><b>Se terminar assim:</b> ${efs.map((e, n) => {
    const c = tabela[e.clube].clube;
    const hoje = res.porJogo ? e.se.reduce((s, x, o) => s + x * (porIdN(g.id)?.[o] ?? 0), 0) : 0;
    const depois = e.se[k];
    const sobe = e.objetivo === "r" ? depois < hoje : depois > hoje;
    return html`${n ? " · " : ""}${escudo(c, 14)} ${sigla(c)} ${NOME_OBJ[e.objetivo]} <span class="${TOM_OBJ[e.objetivo]}">${pct(hoje)} → <b>${pct(depois)}</b></span>${sobe ? " ↑" : " ↓"}`;
  })}</div>`;
}

/** Fração de simulações com mandante, empate e visitante em um jogo (para a chance "de agora"). */
function porIdN(id: string): [number, number, number] | null {
  const E = sims.real?.porJogo?.find((x) => x.id === id);
  if (!E) return null;
  const t = E.n[0] + E.n[1] + E.n[2] || 1;
  return [E.n[0] / t, E.n[1] / t, E.n[2] / t];
}

/** Os efeitos que interessam num jogo: o maior de cada time do jogo e o maior de um time de fora. */
function efeitosRelevantes(g: Jogo, E: EfeitoJogo): Efeito[] {
  const todos = efeitosDoJogo(E, tabela.length);
  const im = posicao(g.mandante),
    iv = posicao(g.visitante);
  const escolhidos: Efeito[] = [];
  for (const i of [im, iv]) {
    const e = todos.find((x) => x.clube === i);
    if (e) escolhidos.push(e);
  }
  const fora = todos.find((x) => x.clube !== im && x.clube !== iv && x.peso >= 0.03);
  if (fora) escolhidos.push(fora);
  return escolhidos;
}

/** "O que mais pesa nesta rodada": para título, Libertadores e queda, o jogo que mais mexe. */
function destaques(jogos: Jogo[], porId: Map<string, EfeitoJogo>): Html {
  const itens = (["c", "l", "r"] as const)
    .map((obj) => {
      let melhor: { g: Jogo; e: Efeito } | null = null;
      for (const g of jogos) {
        const E = porId.get(g.id);
        const e = E && maiorEfeito(E, tabela.length, obj);
        if (e && (!melhor || e.peso > melhor.e.peso)) melhor = { g, e };
      }
      return melhor && melhor.e.peso >= 0.03 ? { obj, ...melhor } : null;
    })
    .filter((x) => x !== null);
  if (!itens.length) return html``;
  return html`<section class="pesa"><h2>O que mais pesa nesta rodada</h2>
    <ul>${itens.map(({ obj, g, e }) => {
      const c = tabela[e.clube].clube;
      const [lo, hi] = [Math.min(...e.se), Math.max(...e.se)];
      return html`<li><small>${NOME_OBJ[obj][0].toUpperCase() + NOME_OBJ[obj].slice(1)}</small>
        <span><b>${g.mandante} x ${g.visitante}</b>: ${escudo(c, 16)} ${c} vai de <b class="${TOM_OBJ[obj]}">${pct(lo)}</b> a <b class="${TOM_OBJ[obj]}">${pct(hi)}</b>, conforme o resultado.</span></li>`;
    })}</ul></section>`;
}

export function telaRodada(numero: number | null): Html {
  const R = rodadasComJogo;
  if (!R.length) return vazio("Não há mais jogos no campeonato.");
  const r = numero != null && R.includes(numero) ? numero : (proximaRodada ?? R[0]);
  const disputados = resultados.filter((g) => g.rodada === r).sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const faltam = restantes.filter((g) => g.rodada === r).sort(porData);
  const F = forcas(tabela);
  const porId = new Map((sims.real?.porJogo ?? []).map((E) => [E.id, E]));

  const quando = (g: Jogo) =>
    adiado(g) ? (g.data ? `Adiado para ${dataJogo(g.data, g.semHora)}` : "Adiado, sem data") : dataJogo(g.data, g.semHora);

  return html`${navRodada(R, r, (x) => link("jogos", x))}
    ${destaques(faltam, porId)}
    <div class="jogos">
      ${faltam.map((g) => {
        const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
        const E = porId.get(g.id);
        const vivo = g.aoVivo;
        return html`<article class="jogo ${vivo ? "ao-vivo" : ""}">
          <div class="quando">${vivo ? html`<span class="live">Ao vivo${vivo.rotulo ? `, ${vivo.rotulo}` : vivo.minuto != null ? `, ${vivo.minuto}'` : ""}</span>` : quando(g)}</div>
          <div class="confronto">${lado(g.mandante, "m")}${vivo ? html`<span class="placar">${vivo.gm}<i>x</i>${vivo.gv}</span>` : html`<span class="x">x</span>`}${lado(g.visitante, "v")}</div>
          ${vivo && E ? seTerminarAssim(g, efeitosRelevantes(g, E)) : ""}
          ${vivo ? lancesHtml(vivo.lances) : ""}
          ${vivo && E && vivo.lances && efeitosRelevantes(g, E)[0] ? chanceDuranteJogo(efeitosRelevantes(g, E)[0], vivo.lances, vivo.minuto ?? (vivo.rotulo === "Intervalo" ? 45 : 0)) : ""}
          <div class="odds" aria-label="Chances: ${g.mandante} ${pct(H)}, empate ${pct(D)}, ${g.visitante} ${pct(A)}">
            <div class="split"><i style="flex:${H}"></i><i style="flex:${D}"></i><i style="flex:${A}"></i></div>
            <div class="nums"><span class="${H > A ? "fav" : ""}">${pct(H)}</span><span>Empate ${pct(D)}</span><span class="${A > H ? "fav" : ""}">${pct(A)}</span></div>
          </div>
          ${vivo ? "" : retroLinha(g)}
          ${E ? oQueMuda(g, efeitosRelevantes(g, E)) : ""}
        </article>`;
      })}
      ${disputados.map((g) => {
        const topo = html`<div class="quando">${g.provisorio ? "Encerrado, placar da ESPN" : "Encerrado"}</div>
          <div class="confronto">${lado(g.mandante, "m")}<span class="placar">${g.gm}<i>x</i>${g.gv}</span>${lado(g.visitante, "v")}</div>`;
        // encerrado: só o placar; os lances abrem com um toque
        return g.lances?.length
          ? html`<details class="jogo feito" data-jogo="${g.id}" ${abertos.has(g.id) ? "open" : ""}><summary>${topo}</summary>${lancesHtml(g.lances)}</details>`
          : html`<article class="jogo feito">${topo}</article>`;
      })}
    </div>
    ${disputados.length || faltam.some((g) => g.aoVivo) ? html`<button type="button" class="discreto compartilhar" data-compartilhar-rodada="${r}">Compartilhar a rodada</button>` : ""}
    <p class="note">Barra: chance de vitória do mandante, empate e vitória do visitante. "O que muda" mostra a chance final de cada time em cada resultado, com o resto do campeonato sorteado. Para testar placares, use <a href="#/simular">Simular</a>.</p>`;
}
