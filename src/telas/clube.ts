import { adiado, historico, linhaDe, pessoas, porData, posicao, resultados, restantes, tabela } from "../dados";
import { sims } from "../estado";
import { jogosDoClube } from "../modelo/classificacao";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { ultimaRodadaComJogo } from "../modelo/rodadas";
import { chancesDaLinha } from "../modelo/simular";
import type { Jogo } from "../modelo/tipos";
import { ABAS_CLUBE } from "../router";
import { calculando, forma, linkClube, vazio } from "../ui/componentes";
import { pct, saldo } from "../ui/formato";
import { barrasPosicao, evolucaoChances, evolucaoPosicao, type PontoSerie } from "../ui/graficos";
import { html, type Html } from "../ui/html";
import { dataDoDado } from "./pessoas";

export function telaClube(clube: string, aba: string): Html {
  const i = posicao(clube);
  if (i < 0) return vazio("Clube não encontrado.");
  const t = linhaDe(clube);
  const tec = pessoas.tecnicos.lista[clube];

  const ficha = html`<div class="ficha">
    <div class="ficha-pos"><b>${i + 1}º</b><span>lugar</span></div>
    <dl>
      <div><dt>Pontos</dt><dd>${t.p}</dd></div>
      <div><dt>Jogos</dt><dd>${t.j}</dd></div>
      <div><dt>Campanha</dt><dd>${t.v}V ${t.e}E ${t.d}D</dd></div>
      <div><dt>Saldo</dt><dd>${saldo(t.gp - t.gc)}</dd></div>
      <div><dt>Últimos 5</dt><dd>${forma(clube)}</dd></div>
    </dl>
    ${tec ? html`<p class="note ficha-tec">Técnico: <b>${tec[0]}</b>, desde ${tec[1]}</p>` : ""}
  </div>`;
  const abas = html`<nav class="ttabs" aria-label="Seções do clube">${ABAS_CLUBE.map(
    ([k, rot]) => html`<a href="${linkClube(clube, k)}" aria-current="${aba === k ? "page" : "false"}">${rot}</a>`,
  )}</nav>`;

  let corpo: Html;
  if (aba === "rodada-a-rodada") corpo = rodadaARodada(clube, i);
  else if (aba === "jogos") corpo = jogos(clube);
  else if (aba === "destaques") corpo = destaques(clube);
  else corpo = resumo(clube, i);
  return html`${ficha}${abas}${corpo}`;
}

function jogosRestantes(clube: string): Jogo[] {
  return restantes.filter((g) => g.mandante === clube || g.visitante === clube).sort((a, b) => Number(adiado(a)) - Number(adiado(b)) || porData(a, b));
}

function tabelaJogos(clube: string, lista: Jogo[]): Html {
  if (!lista.length) return html`<p class="note">Sem jogos restantes.</p>`;
  const F = forcas(tabela);
  return html`<div class="box sem-linha"><table>
    <thead><tr><th class="l">Rod.</th><th class="l">Jogo</th><th>Vence</th><th>Empata</th><th>Perde</th></tr></thead>
    <tbody>${lista.map((g) => {
      const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
      const casa = g.mandante === clube;
      const v = casa ? H : A,
        d = casa ? A : H;
      const adv = casa ? g.visitante : g.mandante;
      return html`<tr><td class="l dim">${adiado(g) ? "Adiado" : `${g.rodada}ª`}</td><td class="l">${casa ? "x" : "@"} <a href="${linkClube(adv)}">${adv}</a></td><td class="${v > d ? "up" : ""}">${pct(v)}</td><td class="dim">${pct(D)}</td><td class="${d > v ? "down" : ""}">${pct(d)}</td></tr>`;
    })}</tbody>
  </table></div>`;
}

function resumo(clube: string, i: number): Html {
  const res = sims.real;
  if (!res) return calculando();
  const linha = res.pos[i];
  const ch = chancesDaLinha(linha);
  const moda = linha.indexOf(Math.max(...linha));
  const kpi = (rot: string, v: number, cls: string) =>
    html`<div class="kpi ${v < 0.001 ? "zero" : ""}"><small>${rot}</small><b class="${cls}">${pct(v)}</b></div>`;
  const proximos = jogosRestantes(clube);
  return html`<section class="tsec"><h3>Chances no fim do campeonato</h3>
      <div class="kpis">${kpi("Título", ch.c, "t-title")}${kpi("Libertadores", ch.l, "t-lib")}${kpi("Sul-Americana", ch.s, "t-sula")}${kpi("Rebaixamento", ch.r, "t-rel")}</div>
      <p class="note">Deve terminar com cerca de ${Math.round(res.pts[i])} pontos.</p></section>
    <section class="tsec"><h3>Onde deve terminar</h3>
      <p class="note">Chance de terminar em cada posição. A mais provável é ${moda + 1}º, com ${pct(linha[moda])}.</p>
      ${barrasPosicao(linha, clube)}</section>
    <section class="tsec"><h3>Próximos jogos</h3>${tabelaJogos(clube, proximos.filter((g) => !adiado(g)).slice(0, 3))}
      ${proximos.length > 3 ? html`<a class="linkbtn" href="${linkClube(clube, "jogos")}">Ver os ${proximos.length} jogos restantes</a>` : ""}</section>`;
}

function serie(clube: string, i: number): PontoSerie[] | null {
  const res = sims.real;
  if (!res) return null;
  const atual = ultimaRodadaComJogo(resultados);
  const s: PontoSerie[] = historico
    .filter((h) => h.rodada < atual && h.probs[clube])
    .map((h) => ({ r: h.rodada, ch: h.probs[clube], pos: h.probs[clube].pos }));
  s.push({ r: atual, ch: chancesDaLinha(res.pos[i]), pos: i + 1 });
  return s;
}

function rodadaARodada(clube: string, i: number): Html {
  const s = serie(clube, i);
  if (!s) return calculando();
  return html`<section class="tsec"><h3>Chances depois de cada rodada</h3>
      <p class="note">Calculadas só com os resultados que existiam até aquela rodada.</p>${evolucaoChances(clube, s)}</section>
    <section class="tsec"><h3>Posição na tabela depois de cada rodada</h3>${evolucaoPosicao(clube, s)}</section>`;
}

function jogos(clube: string): Html {
  const feitos = jogosDoClube(clube, resultados).reverse();
  return html`<section class="tsec"><h3>Jogos restantes</h3>${tabelaJogos(clube, jogosRestantes(clube))}
      <p class="note">“x” é jogo em casa e “@”, fora.</p></section>
    <section class="tsec"><h3>Resultados em 2026</h3>
      <div class="box sem-linha"><table>
        <thead><tr><th class="l">Rod.</th><th class="l">Adversário</th><th>Placar</th><th></th></tr></thead>
        <tbody>${feitos.map(
          (g) => html`<tr><td class="l dim">${g.rodada}ª</td><td class="l">${g.casa ? "x" : "@"} <a href="${linkClube(g.adversario)}">${g.adversario}</a></td><td class="big">${g.pro}-${g.contra}</td><td><span class="form"><i class="${g.res}">${g.res}</i></span></td></tr>`,
        )}</tbody>
      </table></div></section>`;
}

const dataBR = (s: string) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : 0;
};

function destaques(clube: string): Html {
  const tec = pessoas.tecnicos.lista[clube];
  const trocas = pessoas.trocas.lista.filter((t) => t[0] === clube);
  const manual = pessoas.destaques.porClube[clube];
  // usa a fonte mais recente: os destaques manuais do clube ou a artilharia geral
  const usarGeral = !manual || dataBR(pessoas.artilharia.atualizado) > dataBR(pessoas.destaques.atualizado);
  const art: [string, number][] = usarGeral
    ? pessoas.artilharia.lista.filter((a) => a[1] === clube).map((a) => [a[0], a[2]])
    : manual.art;
  const ast: [string, number][] = usarGeral
    ? pessoas.assistencias.lista.filter((a) => a[1] === clube && a[2] >= 3).map((a) => [a[0], a[2]])
    : manual.ast.filter((r) => r[1] >= 3);
  const lista = (rows: [string, number][], un: string, plural: string) =>
    html`<ol class="plist">${rows.map(([n, v]) => html`<li><span>${n}</span><b>${v} ${v > 1 ? plural : un}</b></li>`)}</ol>`;
  return html`<section class="tsec"><h3>Técnico</h3>
      ${tec ? html`<p class="big-line">${tec[0]}</p><p class="note">No cargo desde ${tec[1]}.</p>` : html`<p class="note">Sem informação.</p>`}
      <p class="note">${trocas.length ? `Trocas em 2026: ${trocas.map((t) => `${t[1]} saiu em ${t[3]}, entrou ${t[4]}`).join("; ")}.` : "Sem trocas de técnico em 2026."}</p>
      ${dataDoDado(pessoas.tecnicos)}</section>
    <section class="tsec"><h3>Artilheiros no Brasileirão</h3>
      ${art.length ? lista(art, "gol", "gols") : html`<p class="note">Sem dados atualizados.</p>`}
      ${dataDoDado(usarGeral ? pessoas.artilharia : pessoas.destaques)}</section>
    ${ast.length ? html`<section class="tsec"><h3>Mais assistências</h3>${lista(ast, "assistência", "assistências")}${dataDoDado(usarGeral ? pessoas.assistencias : pessoas.destaques)}</section>` : ""}
    ${!usarGeral && manual.obs ? html`<p class="note">${manual.obs}</p>` : ""}`;
}
