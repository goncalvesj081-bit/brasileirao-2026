import { adiado, cartoes, historico, linhaDe, pessoas, porData, posicao, resultados, restantes, tabela } from "../dados";
import { sims } from "../estado";
import { jogosDoClube } from "../modelo/classificacao";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { ultimaRodadaComJogo } from "../modelo/rodadas";
import { chancesDaLinha, chancesSim } from "../modelo/simular";
import type { Jogo } from "../modelo/tipos";
import { ABAS_CLUBE } from "../router";
import { calculando, classeFaixa, escudo, forma, linkClube, modoVagas, seletor, seletorVagas, vazio } from "../ui/componentes";
import { pct, saldo } from "../ui/formato";
import { comoSomar, quantoFalta, type Objetivo, type ObjetivosPorPontos } from "../modelo/quantofalta";
import { barrasPosicao, evolucaoChances, evolucaoPosicao, type PontoSerie } from "../ui/graficos";
import { html, type Html } from "../ui/html";
import { dataDoDado, fotoTecnico } from "./pessoas";
import { telaTorcida } from "./torcida";
import { faixaPossivel, maximos, metaTopK, type Meta } from "../modelo/matematica";
import { CORTES } from "../../config/temporada";
import { favorito } from "../ui/favorito";

export function telaClube(clube: string, aba: string): Html {
  const i = posicao(clube);
  if (i < 0) return vazio("Clube não encontrado.");
  const t = linhaDe(clube);
  const tec = pessoas.tecnicos.lista[clube];

  const ficha = html`<div class="ficha">
    <div class="ficha-pos ${classeFaixa(i)}"><b>${i + 1}º</b></div>
    <dl>
      <div><dt>Pontos</dt><dd>${t.p}</dd></div>
      <div><dt>Jogos</dt><dd>${t.j}</dd></div>
      <div><dt>Campanha</dt><dd>${t.v}V ${t.e}E ${t.d}D</dd></div>
      <div><dt>Saldo</dt><dd>${saldo(t.gp - t.gc)}</dd></div>
      <div><dt>Últimos 5</dt><dd>${forma(clube)}</dd></div>
    </dl>
    ${tec ? html`<p class="note ficha-tec">Técnico <b>${tec[0]}</b>, desde ${tec[1]}</p>` : ""}
    <button type="button" class="discreto favorito" data-favorito="${clube}" aria-pressed="${favorito() === clube}">${favorito() === clube ? "★ Meu time" : "☆ Marcar como meu time"}</button>
  </div>`;
  const abas = seletor(ABAS_CLUBE, aba, (k) => linkClube(clube, k), "Seções do clube");

  let corpo: Html;
  if (aba === "rodada-a-rodada") corpo = rodadaARodada(clube, i);
  else if (aba === "jogos") corpo = jogos(clube);
  else if (aba === "destaques") corpo = destaques(clube);
  else if (aba === "torcida") corpo = telaTorcida(clube);
  else corpo = resumo(clube, i);
  return html`${ficha}${abas}<div class="colunas">${corpo}</div>`;
}

function jogosRestantes(clube: string): Jogo[] {
  return restantes.filter((g) => g.mandante === clube || g.visitante === clube).sort((a, b) => Number(adiado(a)) - Number(adiado(b)) || porData(a, b));
}

function tabelaJogos(clube: string, lista: Jogo[]): Html {
  if (!lista.length) return html`<p class="note">Sem jogos restantes.</p>`;
  const F = forcas(tabela);
  return html`<div class="box sem-linha"><table class="tab">
    <thead><tr><th class="l">Rod.</th><th class="l">Jogo</th><th>Vence</th><th>Empata</th><th>Perde</th></tr></thead>
    <tbody>${lista.map((g) => {
      const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
      const casa = g.mandante === clube;
      const v = casa ? H : A,
        d = casa ? A : H;
      const adv = casa ? g.visitante : g.mandante;
      return html`<tr><td class="l dim">${adiado(g) ? "Adiado" : `${g.rodada}ª`}</td><td class="l team"><a href="${linkClube(adv)}"><span class="dim casa">${casa ? "x" : "@"}</span>${escudo(adv, 18)}<span>${adv}</span></a></td><td class="${v > d ? "up" : ""}">${pct(v)}</td><td class="dim">${pct(D)}</td><td class="${d > v ? "down" : ""}">${pct(d)}</td></tr>`;
    })}</tbody>
  </table></div>`;
}

function resumo(clube: string, i: number): Html {
  const res = sims.real;
  if (!res) return calculando();
  const linha = res.pos[i];
  const ch = chancesSim(res, i, modoVagas());
  const moda = linha.indexOf(Math.max(...linha));
  const kpi = (rot: string, v: number, cls: string) =>
    html`<div class="kpi ${v < 0.001 ? "zero" : ""}"><small>${rot}</small><b class="${cls}">${pct(v)}</b></div>`;
  const proximos = jogosRestantes(clube);
  return html`<div class="coluna"><section class="tsec"><h3>Chances no fim do campeonato</h3>${seletorVagas()}
      <div class="kpis">${kpi("Título", ch.c, "t-title")}${kpi("Libertadores", ch.l, "t-lib")}${kpi("Sul-Americana", ch.s, "t-sula")}${kpi("Rebaixamento", ch.r, "t-rel")}</div>
      <p class="note">Deve terminar com cerca de ${Math.round(res.pts[i])} pontos.</p>
      <button type="button" class="discreto compartilhar" data-compartilhar="${clube}">Compartilhar</button></section>
    ${quantoFaltaHtml(clube, i)}
    ${matematicaHtml(clube, i)}
    <section class="tsec"><h3>Próximos jogos</h3>${tabelaJogos(clube, proximos.filter((g) => !adiado(g)).slice(0, 3))}
      ${proximos.length > 3 ? html`<a class="linkbtn" href="${linkClube(clube, "jogos")}">Ver os ${proximos.length} jogos restantes</a>` : ""}</section></div>
    <section class="tsec"><h3>Onde deve terminar</h3>
      <p class="note">Chance de terminar em cada posição. A mais provável é ${moda + 1}º, com ${pct(linha[moda])}.</p>
      ${barrasPosicao(linha, clube)}</section>`;
}

/** "Quanto falta": pontos para chegar a 90% em cada objetivo que ainda está em aberto. */
function quantoFaltaHtml(clube: string, i: number): Html {
  const res = sims.real;
  const dados = res?.objetivosPorPontos?.[i];
  if (!res || !dados) return html``;
  const t = linhaDe(clube);
  const jogos = restantes.filter((g) => g.mandante === clube || g.visitante === clube).length;
  const ch = chancesSim(res, i, "posicao");
  const ALVO = 0.9;
  const itens: [Objetivo, string, number][] = [
    ["titulo", "Título", ch.c],
    ["libertadores", "Libertadores", ch.l],
    ["sulAmericana", "Sul-Americana (ou mais)", ch.l + ch.s],
    ["fugir", "Fugir da queda", 1 - ch.r],
  ];
  const linhas = itens
    // só objetivos em aberto: nem perdidos (<1%) nem resolvidos (>99%)
    .filter(([, , p]) => p >= 0.01 && p <= 0.99)
    .map(([obj, nome]) => {
      // "Sul-Americana (ou mais)": basta terminar até o corte da Sula
      const dadosObj = obj === "sulAmericana" ? somarLibSula(dados) : dados;
      const r = quantoFalta(dadosObj, obj, ALVO, t.p, jogos);
      let txt: Html;
      if (r.tipo === "garantido") txt = html`com os pontos de hoje já passa de ${pct(ALVO)}.`;
      else if (r.tipo === "nao-alcanca")
        txt = html`nem vencendo os ${jogos} jogos a chance chega a ${pct(ALVO)} (no máximo ${pct(r.chanceMaxima)}). Depende de tropeços dos outros.`;
      else
        txt = html`chegar a <b>${r.meta.pontos} pontos</b>: faltam ${r.meta.faltam} em ${jogos} jogo${jogos > 1 ? "s" : ""} (${comoSomar(r.meta.faltam)}).`;
      return html`<li><span class="obj">${nome}</span><span>${txt}</span></li>`;
    });
  if (!linhas.length) return html``;
  return html`<section class="tsec"><h3>Quanto falta</h3>
    <ul class="falta">${linhas}</ul>
    <p class="note">Pontos finais a partir dos quais a chance fica acima de ${pct(ALVO)} nas simulações, contando pela posição.</p></section>`;
}

/** Junta Libertadores e Sul-Americana: "terminar até o corte da Sula". */
function somarLibSula(d: ObjetivosPorPontos): ObjetivosPorPontos {
  const out: ObjetivosPorPontos = {};
  for (const [p, b] of Object.entries(d)) out[+p] = [b[0], b[1], b[2], b[2] + b[3], b[4]];
  return out;
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
  return html`<p class="note inteira">Chances calculadas só com os resultados que existiam até aquela rodada. Aqui as faixas são fixas (top 5 e 6º ao 11º, a regra básica do Brasileirão), sem as vagas que descem das copas; por isso os números podem ser menores que os de Resumo.</p>
    <section class="tsec"><h3>Chance de top 5, de 6º ao 11º e de queda, rodada a rodada</h3>${evolucaoChances(clube, s)}</section>
    <section class="tsec"><h3>Posição na tabela depois de cada rodada</h3>${evolucaoPosicao(clube, s)}</section>`;
}

function jogos(clube: string): Html {
  const feitos = jogosDoClube(clube, resultados).reverse();
  return html`<section class="tsec"><h3>Jogos restantes</h3>${tabelaJogos(clube, jogosRestantes(clube))}
      <p class="note">“x” é jogo em casa e “@”, fora.</p></section>
    <section class="tsec"><h3>Resultados em 2026</h3>
      <div class="box sem-linha"><table class="tab">
        <thead><tr><th class="l">Rod.</th><th class="l">Adversário</th><th>Placar</th><th></th></tr></thead>
        <tbody>${feitos.map(
          (g) => html`<tr><td class="l dim">${g.rodada}ª</td><td class="l team"><a href="${linkClube(g.adversario)}"><span class="dim casa">${g.casa ? "x" : "@"}</span>${escudo(g.adversario, 18)}<span>${g.adversario}</span></a></td><td class="big">${g.pro}-${g.contra}</td><td><span class="form"><i class="${g.res}">${g.res}</i></span></td></tr>`,
        )}</tbody>
      </table></div></section>`;
}

function destaques(clube: string): Html {
  const tec = pessoas.tecnicos.lista[clube];
  const trocas = pessoas.trocas.lista.filter((t) => t[0] === clube);
  const art: [string, number][] = pessoas.artilharia.lista.filter((a) => a[1] === clube).map((a) => [a[0], a[2]]);
  const ast: [string, number][] = pessoas.assistencias.lista.filter((a) => a[1] === clube).map((a) => [a[0], a[2]]);
  const lista = (rows: [string, number][], un: string, plural: string) =>
    html`<ol class="plist">${rows.map(([n, v]) => html`<li><span>${n}</span><b>${v} ${v > 1 ? plural : un}</b></li>`)}</ol>`;
  return html`<div class="coluna"><section class="tsec"><h3>Técnico</h3>
      ${tec
        ? html`<div class="tecnico">${fotoTecnico(tec, 76)}<div><p class="big-line">${tec[0]}</p><p class="note">No cargo desde ${tec[1]}.</p></div></div>`
        : html`<p class="note">Sem informação.</p>`}
      <p class="note">${trocas.length ? `Trocas em 2026: ${trocas.map((t) => `${t[1]} saiu em ${t[3]}, entrou ${t[4]}`).join("; ")}.` : "Sem trocas de técnico em 2026."}</p>
      ${dataDoDado(pessoas.tecnicos)}</section></div>
    <div class="coluna"><section class="tsec"><h3>Artilheiros no Brasileirão</h3>
      ${art.length ? lista(art, "gol", "gols") : html`<p class="note">Sem dados atualizados.</p>`}
      ${dataDoDado(pessoas.artilharia)}</section>
    ${(() => {
      const c = cartoes.lista.filter((l) => l[1] === clube && l[4]);
      return c.length
        ? html`<section class="tsec"><h3>Suspensos e pendurados</h3><ol class="plist">${c.map((l) => html`<li><span>${l[0]}</span><b class="${l[4] === "suspenso" ? "down" : ""}">${l[4] === "suspenso" ? "suspenso no próximo jogo" : `pendurado, ${l[2]} amarelos`}</b></li>`)}</ol><p class="note">Pelos cartões da ESPN, de ${cartoes.atualizado}.</p></section>`
        : "";
    })()}
    ${ast.length ? html`<section class="tsec"><h3>Mais assistências</h3>${lista(ast, "assistência", "assistências")}${dataDoDado(pessoas.assistencias)}</section>` : ""}
</div>`;
}

/** O que já está garantido ou impossível, sem probabilidade (empate em pontos conta contra). */
function matematicaHtml(clube: string, i: number): Html {
  const max = maximos(tabela, restantes);
  const n = tabela.length;
  const jogos = restantes.filter((g) => g.mandante === clube || g.visitante === clube).length;
  const frase = (m: Meta) =>
    m.garantido
      ? html`<b class="up">garantido</b>`
      : !m.possivel
        ? html`<b class="down">sem chance</b>`
        : m.faltam != null
          ? html`garante com mais <b>${m.faltam}</b> ponto${m.faltam > 1 ? "s" : ""} (de ${3 * jogos} em disputa)`
          : html`ainda possível, mas depende de outros resultados`;
  const itens: [string, Meta][] = [
    ["Título", metaTopK(clube, 1, tabela, max)],
    [`G${CORTES.libGrupos} (Libertadores, grupos)`, metaTopK(clube, CORTES.libGrupos, tabela, max)],
    ["Fugir da queda", metaTopK(clube, n - CORTES.rebaixados, tabela, max)],
  ];
  const [melhor, pior] = faixaPossivel(clube, tabela, max);
  const res = sims.real;
  const vistos = res ? res.pos[i].map((v, p) => [v, p] as const).filter(([v]) => v >= 0.0005).map(([, p]) => p + 1) : [];
  return html`<section class="tsec"><h3>Matemática</h3>
    <ul class="falta">${itens.map(([nome, m]) => html`<li><span class="obj">${nome}</span><span>${frase(m)}</span></li>`)}</ul>
    <p class="note">Pela matemática, pode terminar entre o <b>${melhor}º</b> e o <b>${pior}º</b>${vistos.length ? html`; nas simulações, ficou entre o ${Math.min(...vistos)}º e o ${Math.max(...vistos)}º` : ""}. Conta só pontos, e empate em pontos conta contra, porque o desempate pode não ajudar.</p></section>`;
}
