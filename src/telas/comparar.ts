// Comparar dois clubes lado a lado: campanha, chances, confronto direto e posição rodada a rodada.

import { slug } from "../../config/clubes";
import { historico, linhaDe, nomesClubes, posicao, restantes, resultados, retrospectoAntigo } from "../dados";
import { retrospecto } from "../modelo/retrospecto";
import { temporada } from "../../config/temporada";
import { sims } from "../estado";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { ultimaRodadaComJogo } from "../modelo/rodadas";
import { chancesSim } from "../modelo/simular";
import { tabela } from "../dados";
import { link } from "../router";
import { escudo, forma, linkClube, modoVagas } from "../ui/componentes";
import { favorito } from "../ui/favorito";
import { dataJogo, dec, pct, saldo } from "../ui/formato";
import { duasPosicoes } from "../ui/graficos";
import { html, type Html } from "../ui/html";

const COR_A = "#4f8ff7",
  COR_B = "#f2994a";

function escolha(nome: string, atual: string, outro: string): Html {
  return html`<select class="escolha" data-comparar="${nome}" aria-label="Clube ${nome === "a" ? "da esquerda" : "da direita"}">
    ${nomesClubes
      .slice()
      .sort((x, y) => x.localeCompare(y, "pt"))
      .map((c) => html`<option value="${slug(c)}" ${c === atual ? "selected" : ""} ${c === outro ? "disabled" : ""}>${c}</option>`)}
  </select>`;
}

function serie(clube: string) {
  const atual = ultimaRodadaComJogo(resultados);
  const s = historico.filter((h) => h.rodada < atual && h.probs[clube]).map((h) => ({ r: h.rodada, pos: h.probs[clube].pos }));
  s.push({ r: atual, pos: posicao(clube) + 1 });
  return s;
}

export function telaComparar(a: string, b: string): Html {
  const fav = favorito();
  const A = a || fav || tabela[0].clube;
  const B = b && b !== A ? b : tabela.find((t) => t.clube !== A)!.clube;
  const [ta, tb] = [linhaDe(A), linhaDe(B)];
  const res = sims.real;
  const ch = (c: string) => (res ? chancesSim(res, posicao(c), modoVagas()) : null);
  const [ca, cb] = [ch(A), ch(B)];
  const linha = (rot: string, va: Html | string | number, vb: Html | string | number, melhor?: "a" | "b" | null) =>
    html`<tr><td class="${melhor === "a" ? "forte" : ""}">${va}</td><th>${rot}</th><td class="${melhor === "b" ? "forte" : ""}">${vb}</td></tr>`;
  const cmp = (x: number, y: number, maior = true) => (x === y ? null : (x > y) === maior ? "a" : "b");
  const p = (x: number | undefined) => (x == null ? "…" : pct(x));

  const faltam = restantes.filter((g) => (g.mandante === A && g.visitante === B) || (g.mandante === B && g.visitante === A));
  const F = forcas(tabela);

  return html`<div class="cmp-escolha">${escolha("a", A, B)}<span class="dim">x</span>${escolha("b", B, A)}</div>
    <div class="box sem-linha"><table class="cmp">
      <thead><tr><th><a href="${linkClube(A)}">${escudo(A, 36)}<span>${A}</span></a></th><th></th><th><a href="${linkClube(B)}">${escudo(B, 36)}<span>${B}</span></a></th></tr></thead>
      <tbody>
        ${linha("Posição", `${posicao(A) + 1}º`, `${posicao(B) + 1}º`, cmp(posicao(B), posicao(A)))}
        ${linha("Pontos", ta.p, tb.p, cmp(ta.p, tb.p))}
        ${linha("Jogos", ta.j, tb.j)}
        ${linha("Aproveitamento", pct(ta.j ? ta.p / (3 * ta.j) : 0), pct(tb.j ? tb.p / (3 * tb.j) : 0), cmp(ta.p / Math.max(1, ta.j), tb.p / Math.max(1, tb.j)))}
        ${linha("Campanha", `${ta.v}V ${ta.e}E ${ta.d}D`, `${tb.v}V ${tb.e}E ${tb.d}D`)}
        ${linha("Gols", `${ta.gp} pró, ${ta.gc} contra`, `${tb.gp} pró, ${tb.gc} contra`)}
        ${linha("Saldo", saldo(ta.gp - ta.gc), saldo(tb.gp - tb.gc), cmp(ta.gp - ta.gc, tb.gp - tb.gc))}
        ${linha("Últimos 5", forma(A), forma(B))}
        ${linha("Título", p(ca?.c), p(cb?.c), ca && cb ? cmp(ca.c, cb.c) : null)}
        ${linha("Libertadores", p(ca?.l), p(cb?.l), ca && cb ? cmp(ca.l, cb.l) : null)}
        ${linha("Sul-Americana", p(ca?.s), p(cb?.s))}
        ${linha("Queda", p(ca?.r), p(cb?.r), ca && cb ? cmp(ca.r, cb.r, false) : null)}
        ${linha("Pontos no fim", res ? dec(res.pts[posicao(A)], 0) : "…", res ? dec(res.pts[posicao(B)], 0) : "…")}
      </tbody>
    </table></div>
    <section class="tsec"><h3>Confronto direto</h3>
      ${(() => {
        const r = retrospecto(A, B, retrospectoAntigo.jogos, resultados, temporada.ano);
        if (!r.jogos.length) return html`<p class="note">Não se enfrentaram na Série A desde ${retrospectoAntigo.anos[0] ?? temporada.ano}.</p>`;
        return html`<p class="note">Desde ${r.jogos[0][0]}: <b>${A}</b> ${r.v} vitória${r.v === 1 ? "" : "s"}, ${r.e} empate${r.e === 1 ? "" : "s"}, <b>${B}</b> ${r.d} vitória${r.d === 1 ? "" : "s"}.</p>
          <ul class="plist">${[...r.jogos].reverse().map(([ano, data, m, v, gm, gv]) => html`<li><span>${ano}${data ? `, ${data.slice(8, 10)}/${data.slice(5, 7)}` : ""}: ${m} ${gm} x ${gv} ${v}</span></li>`)}</ul>`;
      })()}
      ${faltam.map((g) => {
        const [H, D, Aw] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
        return html`<p class="note">Falta: ${g.mandante} x ${g.visitante}, ${dataJogo(g.data, g.semHora)}. ${g.mandante} vence ${pct(H)}, empate ${pct(D)}, ${g.visitante} vence ${pct(Aw)}.</p>`;
      })}
    </section>
    <section class="tsec"><h3>Posição depois de cada rodada</h3>
      ${duasPosicoes({ nome: A, cor: COR_A, serie: serie(A) }, { nome: B, cor: COR_B, serie: serie(B) })}</section>
    <p class="note">Em negrito, quem leva vantagem. <a href="${link("comparar", slug(B), slug(A))}">Inverter os lados</a>.</p>`;
}
