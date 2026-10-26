// História da Série A desde 2003: campeões, cada edição, tabela de todos os tempos, recordes e a trajetória
// de cada clube. Os dados (data/historia.json) só são baixados quando alguém abre a seção.

import { slugTexto } from "../../config/clubes";
import { clubeHistoricoPorSlug, coresHistoricas, naSerieAAtual } from "../../config/clubes-historicos";
import { tabela } from "../dados";
import {
  aproveitamento,
  artilheirosDasEdicoes,
  campanhas,
  campeoes,
  goleadas,
  jogosDa,
  jogosDe,
  maisGols,
  pontosDa,
  resumoEdicoes,
  retrospectoContra,
  tabelaGeral,
  titulos,
  trajetoria,
  type Campanha,
  type Historia,
  type JogoHistorico,
  type LinhaHistoria,
  type TemporadaHistoria,
  type Zona,
} from "../modelo/historia";
import { link } from "../router";
import { escudo, linkClube, seletor, vazio } from "../ui/componentes";
import { dec, saldo } from "../ui/formato";
import { cru, esc, html, type Html } from "../ui/html";
import { serieB, slugB } from "./serieb";

// ---------- dados ----------

let H: Historia | null = null;
let pedido = false;
let falhou = false;
let aoCarregar: () => void = () => {};
/** Quem redesenha a tela quando os dados da história chegam. */
export const aoCarregarHistoria = (f: () => void) => (aoCarregar = f);

function dados(): Historia | null {
  if (H || pedido) return H;
  pedido = true;
  import("../../data/historia.json")
    .then((m) => {
      H = m.default as unknown as Historia;
      aoCarregar();
    })
    .catch(() => {
      falhou = true;
      pedido = false;
      aoCarregar();
    });
  return null;
}

// ---------- peças ----------

const linkH = (c: string) => link("historia", "clube", slugTexto(c));
const linkAno = (ano: number) => link("historia", "temporadas", ano);

/** Escudo de qualquer clube que já passou pela Série A: o do site, o da Série B ou as cores do clube. */
function escudoH(clube: string, tam = 20): Html {
  if (naSerieAAtual(clube)) return escudo(clube, tam);
  const url = serieB.escudos[clube];
  const [a, b] = coresHistoricas(clube);
  // enquanto a imagem não carrega (ou se falhar), aparecem as cores do clube
  const reserva = `if(!this.dataset.r){this.dataset.r=1;this.src='${url}'}else{this.remove()}`;
  return html`<span class="esc" style="--a:${a};--b:${b};--t:${tam}px" aria-hidden="true">${url ? html`<img src="escudos/b/${slugB(clube)}.png" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" onload="this.parentNode.classList.add('ok')" onerror="${reserva}">` : ""}</span>`;
}

const celClubeH = (clube: string) => html`<td class="l team"><a href="${linkH(clube)}">${escudoH(clube)}<span class="nome">${clube}</span></a></td>`;
const nomeH = (clube: string) => html`<a class="clube-h" href="${linkH(clube)}">${escudoH(clube, 18)}<span>${clube}</span></a>`;

const CLASSE_ZONA: Record<Zona, string> = { l: "z-lib", s: "z-sula", r: "z-rel" };
const classeLinha = (l: LinhaHistoria, i: number) => (i === 0 ? "z-campeao" : l[7] ? CLASSE_ZONA[l[7]] : "");
const aprov = (x: number) => `${dec(x * 100)}%`;
const placar = (g: JogoHistorico) => html`${nomeH(g.mandante)} <b class="placar-h">${g.gm} x ${g.gv}</b> ${nomeH(g.visitante)}`;

const legendaH = () => html`<div class="legend">
  <span><i style="background:var(--title)"></i>Campeão</span>
  <span><i style="background:var(--lib)"></i>Libertadores</span>
  <span><i style="background:var(--sula)"></i>Sul-Americana</span>
  <span><i style="background:var(--rel)"></i>Rebaixado</span>
</div>`;

const fonte = () =>
  html`<p class="note">Tabelas, placares e artilheiros da Wikipédia (em inglês, conferida com a versão em português). Libertadores e Sul-Americana como foram distribuídas em cada ano, inclusive vagas por copas.</p>`;

// ---------- telas ----------

export function telaHistoria(vista: string, extra: string): Html {
  const h = dados();
  if (!h) return falhou ? vazio("Não foi possível carregar a história agora. Tente de novo em instantes.") : html`<p class="note">Carregando a história do Brasileirão…</p>`;
  if (vista === "clube") return telaClubeH(h, extra);
  const corpo =
    vista === "temporadas" ? telaTemporada(h, extra) : vista === "geral" ? telaGeral(h) : vista === "recordes" ? telaRecordes(h) : vista === "clubes" ? telaClubes(h) : telaCampeoes(h);
  return corpo;
}

function telaCampeoes(h: Historia): Html {
  const ts = titulos(h);
  const arts = new Map(artilheirosDasEdicoes(h).map((a) => [a.ano, a]));
  const lider = tabela[0];
  const primeiro = h.temporadas[0].ano,
    ultimo = h.temporadas.at(-1)!.ano;
  return html`<p class="note">Desde ${primeiro} o Brasileirão é disputado por pontos corridos: todos contra todos, em turno e returno, e quem soma mais pontos é campeão. São ${h.temporadas.length} edições até ${ultimo}.</p>
    <section class="tsec"><h3>Títulos por clube</h3>
      <ol class="titulos-h">${ts.map(
        (t) => html`<li><a href="${linkH(t.clube)}">${escudoH(t.clube, 30)}<span class="nome">${t.clube}</span><b>${t.anos.length}</b><small>${t.anos.join(", ")}</small></a></li>`,
      )}</ol>
    </section>
    <section class="tsec"><h3>Ano a ano</h3>
    <div class="box"><table class="tab">
      <thead><tr><th>Ano</th><th class="l">Campeão</th><th>Pts</th><th class="w">Aprov.</th><th class="w">Vantagem</th><th class="l w">Vice</th><th class="l w">Artilheiro</th></tr></thead>
      <tbody>
        ${lider ? html`<tr class="click" data-href="${link("tabela", "geral")}"><td class="pos">2026</td><td class="l team"><a href="${linkClube(lider.clube)}">${escudo(lider.clube)}<span class="nome">${lider.clube}</span></a></td><td class="dim">${lider.p}</td><td class="w dim" colspan="4" style="text-align:left">em disputa, líder agora</td></tr>` : ""}
        ${campeoes(h)
          .reverse()
          .map((c) => {
            const a = arts.get(c.ano);
            return html`<tr class="click z-campeao" data-href="${linkAno(c.ano)}"><td class="pos"><a href="${linkAno(c.ano)}">${c.ano}</a></td>${celClubeH(c.campeao)}<td class="big">${c.pts}</td><td class="w dim">${aprov(c.aprov)}</td><td class="w dim">${c.vantagem ? `+${c.vantagem}` : "saldo"}</td><td class="l w">${nomeH(c.vice)}</td><td class="l w quebra artilheiro-h">${a ? html`${a.nomes.map(([j]) => j).join(", ")} <span class="dim">(${a.gols})</span>` : ""}</td></tr>`;
          })}
      </tbody>
    </table></div></section>
    ${fonte()}`;
}

function navAno(anos: number[], ano: number): Html {
  const i = anos.indexOf(ano);
  const seta = (alvo: number | undefined, rot: string, txt: string) =>
    alvo != null ? html`<a class="seta" href="${linkAno(alvo)}" aria-label="${rot}">${txt}</a>` : html`<span class="seta" aria-disabled="true">${txt}</span>`;
  return html`<div class="round-nav">${seta(anos[i - 1], "Edição anterior", "‹")}<b>Brasileirão ${ano}</b>${seta(anos[i + 1], "Próxima edição", "›")}</div>`;
}

function telaTemporada(h: Historia, extra: string): Html {
  const anos = h.temporadas.map((t) => t.ano);
  const t = h.temporadas.find((x) => String(x.ano) === extra) ?? h.temporadas.at(-1)!;
  const r = resumoEdicoes(h).find((x) => x.ano === t.ano)!;
  const art = t.artilheiros[0];
  const lider = t.tabela[0];
  const anosSel: [string, string][] = anos.map((a) => [String(a), String(a)]);
  return html`${seletor(anosSel, String(t.ano), (k) => linkAno(+k), "Edição")}
    ${navAno(anos, t.ano)}
    <div class="kpis">
      <div class="kpi"><small>Campeão</small><b class="t-title">${lider[0]}</b></div>
      <div class="kpi"><small>Pontos do campeão</small><b>${pontosDa(lider)}</b></div>
      <div class="kpi"><small>Gols por jogo</small><b>${dec(r.media, 2)}</b></div>
      ${art ? html`<div class="kpi"><small>Artilheiro${t.artilheiros.filter((a) => a[2] === art[2]).length > 1 ? "s" : ""}</small><b>${art[2]} gols</b></div>` : ""}
    </div>
    <p class="note">${t.formato.clubes} clubes, ${t.formato.rodadas} rodadas, ${r.jogos} jogos e ${r.gols} gols.${Number.isFinite(r.mandante) ? ` Mandantes venceram ${dec(r.mandante * 100, 0)}% dos jogos; ${dec(r.empates * 100, 0)}% terminaram empatados.` : ""}</p>
    ${tabelaFinal(t)}
    ${legendaH()}
    ${t.notas.length ? html`<section class="tsec"><h3>O que a tabela não conta</h3>${t.notas.map((n) => html`<p class="note">${n}</p>`)}</section>` : ""}
    <div class="duas-h">
      ${t.artilheiros.length ? html`<section class="tsec"><h3>Artilharia</h3>${listaArtilheiros(t)}</section>` : ""}
      ${t.jogos ? html`<section class="tsec"><h3>Maiores goleadas</h3>${listaJogos(goleadas({ atualizado: "", temporadas: [t] }, 6), false)}</section>` : ""}
    </div>
    ${t.correcoes?.length ? html`<details class="note"><summary>Placares acertados nesta edição (${t.correcoes.length})</summary><p>Erros de digitação da fonte, corrigidos para fechar com a tabela final:</p><ul>${t.correcoes.map((c) => html`<li>${c}</li>`)}</ul></details>` : ""}
    ${fonte()}`;
}

function tabelaFinal(t: TemporadaHistoria): Html {
  return html`<div class="box"><table class="tab">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th class="w">J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th>SG</th><th>Aprov.</th></tr></thead>
    <tbody>${t.tabela.map((l, i) => {
      const [c, v, e, d, gp, gc, aj] = l;
      const marca = aj ? html`<sup class="aj" title="${aj > 0 ? "Ganhou" : "Perdeu"} ${Math.abs(aj)} ponto${Math.abs(aj) > 1 ? "s" : ""} no tribunal">${saldo(aj)}</sup>` : "";
      return html`<tr class="click ${classeLinha(l, i)}" data-href="${linkH(c)}"><td class="pos">${i + 1}</td>${celClubeH(c)}<td class="big">${pontosDa(l)}${marca}</td><td class="w dim">${v + e + d}</td><td class="w">${v}</td><td class="w">${e}</td><td class="w">${d}</td><td class="w">${gp}</td><td class="w">${gc}</td><td class="dim">${saldo(gp - gc)}</td><td class="dim">${aprov(aproveitamento(l))}</td></tr>`;
    })}</tbody>
  </table></div>`;
}

function listaArtilheiros(t: TemporadaHistoria): Html {
  return html`<ol class="lista-h">${t.artilheiros.map(
    ([j, c, g]) => html`<li><span class="quem">${j}</span>${nomeH(c)}<b>${g}</b></li>`,
  )}</ol>`;
}

function listaJogos(js: JogoHistorico[], comAno = true): Html {
  return html`<ol class="lista-h jogos-h">${js.map(
    (g) => html`<li>${comAno ? html`<a class="ano-h" href="${linkAno(g.ano)}">${g.ano}</a>` : ""}<span class="jogo-h">${placar(g)}</span></li>`,
  )}</ol>`;
}

function telaGeral(h: Historia): Html {
  const linhas = tabelaGeral(h);
  const n = h.temporadas.length;
  return html`<p class="note">Todos os jogos da Série A de ${h.temporadas[0].ano} a ${h.temporadas.at(-1)!.ano} somados (${n} edições). Pontos de campo (3 por vitória, 1 por empate), sem as mudanças do tribunal.</p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>Ed.</th><th class="w">J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">SG</th><th>Aprov.</th><th class="w">Títulos</th><th class="w">Quedas</th></tr></thead>
      <tbody>${linhas.map(
        (l, i) =>
          html`<tr class="click" data-href="${linkH(l.clube)}"><td class="pos">${i + 1}</td>${celClubeH(l.clube)}<td class="big">${l.p}</td><td class="dim">${l.temporadas}</td><td class="w dim">${l.j}</td><td class="w">${l.v}</td><td class="w">${l.e}</td><td class="w">${l.d}</td><td class="w dim">${saldo(l.gp - l.gc)}</td><td class="dim">${aprov(l.p / (3 * l.j))}</td><td class="w ${l.titulos ? "t-title" : "dim"}">${l.titulos || "–"}</td><td class="w ${l.quedas ? "t-rel" : "dim"}">${l.quedas || "–"}</td></tr>`,
      )}</tbody>
    </table></div>
    ${fonte()}`;
}

function listaCampanhas(cs: Campanha[], valor: (c: Campanha) => string): Html {
  return html`<ol class="lista-h">${cs.map(
    (c) => html`<li><a class="ano-h" href="${linkAno(c.ano)}">${c.ano}</a>${nomeH(c.clube)}<span class="dim">${c.pos}º</span><b>${valor(c)}</b></li>`,
  )}</ol>`;
}

function telaRecordes(h: Historia): Html {
  const pts = (c: Campanha) => `${pontosDa(c.linha)} pts`;
  const porJogo = (i: 4 | 5) => (l: LinhaHistoria) => l[i] / jogosDa(l);
  const vinte = { ...h, temporadas: h.temporadas.filter((t) => t.formato.clubes === 20) };
  const arts = h.temporadas
    .flatMap((t) => t.artilheiros.map(([j, c, g]) => ({ ano: t.ano, j, c, g })))
    .sort((a, b) => b.g - a.g || a.ano - b.ano)
    .slice(0, 10);
  const vantagens = campeoes(h)
    .sort((a, b) => b.vantagem - a.vantagem || a.ano - b.ano)
    .slice(0, 5);
  const apertados = campeoes(h)
    .sort((a, b) => a.vantagem - b.vantagem || a.ano - b.ano)
    .slice(0, 5);
  return html`<p class="note">As edições de 2003 e 2004 tiveram 46 rodadas e a de 2005, 42. Para comparar campanhas, o aproveitamento (pontos ganhos sobre os possíveis) vale mais que os pontos.</p>
    <div class="duas-h">
      <section class="tsec"><h3>Melhores campanhas</h3>${listaCampanhas(campanhas(h, aproveitamento), (c) => aprov(c.valor))}</section>
      <section class="tsec"><h3>Piores campanhas</h3>${listaCampanhas(campanhas(h, aproveitamento, true), (c) => aprov(c.valor))}</section>
      <section class="tsec"><h3>Mais pontos com 38 rodadas</h3>${listaCampanhas(campanhas(vinte, pontosDa, false, 5), pts)}</section>
      <section class="tsec"><h3>Menos pontos com 38 rodadas</h3>${listaCampanhas(campanhas(vinte, pontosDa, true, 5), pts)}</section>
      <section class="tsec"><h3>Melhores ataques</h3><p class="note">Gols marcados por jogo (total na edição).</p>${listaCampanhas(campanhas(h, porJogo(4), false, 5), (c) => `${dec(c.valor, 2)} (${c.linha[4]})`)}</section>
      <section class="tsec"><h3>Melhores defesas</h3><p class="note">Gols sofridos por jogo (total na edição).</p>${listaCampanhas(campanhas(h, porJogo(5), true, 5), (c) => `${dec(c.valor, 2)} (${c.linha[5]})`)}</section>
      <section class="tsec"><h3>Títulos mais folgados</h3>${listaCampanhas(
        vantagens.map((c) => ({ ano: c.ano, clube: c.campeao, pos: 1, valor: c.vantagem, linha: h.temporadas.find((t) => t.ano === c.ano)!.tabela[0] })),
        (c) => `+${c.valor} pts`,
      )}</section>
      <section class="tsec"><h3>Títulos mais apertados</h3>${listaCampanhas(
        apertados.map((c) => ({ ano: c.ano, clube: c.campeao, pos: 1, valor: c.vantagem, linha: h.temporadas.find((t) => t.ano === c.ano)!.tabela[0] })),
        (c) => (c.valor ? `+${c.valor} pt${c.valor > 1 ? "s" : ""}` : "no desempate"),
      )}</section>
      <section class="tsec"><h3>Maiores goleadas</h3>${listaJogos(goleadas(h, 10))}</section>
      <section class="tsec"><h3>Jogos com mais gols</h3>${listaJogos(maisGols(h, 10))}</section>
      <section class="tsec"><h3>Mais gols numa edição</h3><ol class="lista-h">${arts.map(
        (a) => html`<li><a class="ano-h" href="${linkAno(a.ano)}">${a.ano}</a><span class="quem">${a.j}</span>${nomeH(a.c)}<b>${a.g}</b></li>`,
      )}</ol></section>
    </div>
    <section class="tsec"><h3>Gols por jogo em cada edição</h3>${graficoMedia(h)}</section>
    <p class="note">Goleadas e jogos com mais gols não incluem 2004, sem placares na fonte.</p>
    ${fonte()}`;
}

/** Barras da média de gols por jogo, edição a edição. */
function graficoMedia(h: Historia): Html {
  const rs = resumoEdicoes(h);
  const W = 400,
    H = 170,
    pl = 4,
    pr = 4,
    pt = 18,
    pb = 22;
  const bw = (W - pl - pr) / rs.length;
  const min = 2,
    max = Math.max(...rs.map((r) => r.media));
  const y = (v: number) => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Média de gols por jogo em cada edição do Brasileirão">`;
  rs.forEach((r, i) => {
    const x = pl + i * bw + 1.5,
      w = bw - 3;
    s += `<rect x="${x}" y="${y(r.media)}" width="${w}" height="${H - pb - y(r.media)}" fill="var(--accent)" opacity=".75" rx="1.5"><title>${r.ano}: ${dec(r.media, 2)} gols por jogo</title></rect>`;
    if (i % 2 === 0 || i === rs.length - 1) s += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle" style="font-size:9px">${String(r.ano).slice(2)}</text>`;
  });
  const top = rs.reduce((a, b) => (b.media > a.media ? b : a)),
    fundo = rs.reduce((a, b) => (b.media < a.media ? b : a));
  for (const r of [top, fundo]) {
    const i = rs.indexOf(r);
    s += `<text x="${pl + i * bw + bw / 2}" y="${y(r.media) - 4}" text-anchor="middle" class="v" style="font-size:9.5px">${dec(r.media, 2)}</text>`;
  }
  return cru(s + "</svg>");
}

function telaClubes(h: Historia): Html {
  const linhas = tabelaGeral(h).sort((a, b) => b.temporadas - a.temporadas || a.clube.localeCompare(b.clube, "pt"));
  const n = h.temporadas.length;
  return html`<p class="note">Os ${linhas.length} clubes que jogaram a Série A desde ${h.temporadas[0].ano}. ${linhas.filter((l) => l.temporadas === n).map((l) => l.clube).join(", ").replace(/, ([^,]*)$/, " e $1")} estiveram em todas as ${n} edições.</p>
    <nav class="grade-clubes" aria-label="Clubes">${linhas.map(
      (l) => html`<a href="${linkH(l.clube)}">${escudoH(l.clube, 28)}<span>${l.clube}</span><small>${l.temporadas} ${l.temporadas > 1 ? "edições" : "edição"}${l.titulos ? `, ${l.titulos} título${l.titulos > 1 ? "s" : ""}` : ""}</small></a>`,
    )}</nav>`;
}

function telaClubeH(h: Historia, s: string): Html {
  const ch = clubeHistoricoPorSlug(s);
  const traj = ch ? trajetoria(h, ch.nome) : [];
  const lista = html`Veja a <a href="${link("historia", "clubes")}">lista de clubes</a>.`;
  if (!ch) return html`<p class="empty">Clube não encontrado. ${lista}</p>`;
  if (!traj.length)
    return html`<p class="empty">${ch.nome} não disputou a Série A entre ${h.temporadas[0].ano} e ${h.temporadas.at(-1)!.ano}. ${lista}</p>`;
  const clube = ch.nome;
  const g = tabelaGeral(h).find((x) => x.clube === clube)!;
  const tits = traj.filter((p) => p.pos === 1).map((p) => p.ano);
  const ret = retrospectoContra(h, clube);
  const meus = h.temporadas.flatMap(jogosDe).filter((x) => x.mandante === clube || x.visitante === clube);
  const margem = (x: JogoHistorico) => (x.mandante === clube ? x.gm - x.gv : x.gv - x.gm);
  const vitorias = [...meus].sort((a, b) => margem(b) - margem(a) || a.ano - b.ano).filter((x) => margem(x) > 0).slice(0, 5);
  const derrotas = [...meus].sort((a, b) => margem(a) - margem(b) || a.ano - b.ano).filter((x) => margem(x) < 0).slice(0, 5);
  return html`<div class="cabeca-h">${escudoH(clube, 44)}<div><h2>${clube}</h2><p class="note">${g.temporadas} de ${h.temporadas.length} edições da Série A desde ${h.temporadas[0].ano}.${naSerieAAtual(clube) ? html` <a href="${linkClube(clube)}">Ver em 2026</a>` : ""}</p></div></div>
    <div class="kpis">
      <div class="kpi"><small>Títulos</small><b class="${tits.length ? "t-title" : ""}">${tits.length}</b></div>
      <div class="kpi"><small>Melhor posição</small><b>${g.melhor}º</b></div>
      <div class="kpi"><small>Libertadores</small><b class="t-lib">${g.lib}</b></div>
      <div class="kpi"><small>Rebaixamentos</small><b class="${g.quedas ? "t-rel" : ""}">${g.quedas}</b></div>
      <div class="kpi"><small>Aproveitamento</small><b>${aprov(g.p / (3 * g.j))}</b></div>
    </div>
    ${tits.length ? html`<p class="big-line">Campeão em ${tits.join(", ").replace(/, ([^,]*)$/, " e $1")}.</p>` : ""}
    <section class="tsec"><h3>Posição final em cada edição</h3>${graficoTrajetoria(h, clube)}</section>
    <div class="box"><table class="tab">
      <thead><tr><th>Ano</th><th>Pos.</th><th>P</th><th class="w">J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th>Aprov.</th></tr></thead>
      <tbody>${[...traj].reverse().map(({ ano, pos, clubes, linha: l }) => {
        const [, v, e, d, gp, gc] = l;
        return html`<tr class="click ${classeLinha(l, pos - 1)}" data-href="${linkAno(ano)}"><td class="pos"><a href="${linkAno(ano)}">${ano}</a></td><td class="big">${pos}º<small class="dim"> de ${clubes}</small></td><td>${pontosDa(l)}</td><td class="w dim">${v + e + d}</td><td class="w">${v}</td><td class="w">${e}</td><td class="w">${d}</td><td class="w">${gp}</td><td class="w">${gc}</td><td class="dim">${aprov(aproveitamento(l))}</td></tr>`;
      })}</tbody>
    </table></div>
    ${legendaH()}
    <div class="duas-h">
      ${vitorias.length ? html`<section class="tsec"><h3>Maiores vitórias</h3>${listaJogos(vitorias)}</section>` : ""}
      ${derrotas.length ? html`<section class="tsec"><h3>Maiores derrotas</h3>${listaJogos(derrotas)}</section>` : ""}
    </div>
    ${ret.length
      ? html`<section class="tsec"><h3>Contra cada adversário</h3><p class="note">Jogos da Série A desde ${h.temporadas[0].ano} (2004 fica de fora, sem placares na fonte).</p>
      <div class="box"><table class="tab">
        <thead><tr><th class="l">Adversário</th><th>J</th><th>V</th><th>E</th><th>D</th><th class="w">GP</th><th class="w">GC</th><th>Aprov.</th></tr></thead>
        <tbody>${ret.map(
          (r) =>
            html`<tr class="click" data-href="${linkH(r.adversario)}">${celClubeH(r.adversario)}<td class="dim">${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td class="w">${r.gp}</td><td class="w">${r.gc}</td><td class="dim">${aprov((3 * r.v + r.e) / (3 * r.j))}</td></tr>`,
        )}</tbody>
      </table></div></section>`
      : ""}`;
}

/** Linha da posição final ano a ano; some nos anos fora da Série A. Ouro = campeão, vermelho = rebaixado. */
function graficoTrajetoria(h: Historia, clube: string): Html {
  const anos = h.temporadas.map((t) => t.ano);
  const traj = new Map(trajetoria(h, clube).map((p) => [p.ano, p]));
  const n = Math.max(...h.temporadas.map((t) => t.tabela.length));
  const W = 400,
    H = 180,
    pl = 30,
    pr = 10,
    pt = 10,
    pb = 24;
  const x = (a: number) => pl + ((W - pl - pr) * (a - anos[0])) / (anos.at(-1)! - anos[0]);
  const y = (p: number) => pt + ((H - pt - pb) * (p - 1)) / (n - 1);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Posição final de ${esc(clube)} em cada edição">`;
  for (const p of [1, 4, 10, 17, 20]) {
    s += `<line x1="${pl}" x2="${W - pr}" y1="${y(p)}" y2="${y(p)}" stroke="var(--line)"/>`;
    s += `<text x="${pl - 6}" y="${y(p) + 4}" text-anchor="end">${p}º</text>`;
  }
  for (const a of anos) if (a % 4 === 3) s += `<text x="${x(a)}" y="${H - 6}" text-anchor="middle">${a}</text>`;
  // um trecho de linha para cada sequência de anos seguidos na Série A
  let trecho: string[] = [];
  const fechar = () => {
    if (trecho.length > 1) s += `<polyline fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" points="${trecho.join(" ")}"/>`;
    trecho = [];
  };
  for (const a of anos) {
    const p = traj.get(a);
    if (!p) {
      fechar();
      continue;
    }
    trecho.push(`${x(a)},${y(p.pos)}`);
  }
  fechar();
  for (const p of traj.values()) {
    const cor = p.pos === 1 ? "var(--title)" : p.linha[7] === "r" ? "var(--rel)" : p.linha[7] === "l" ? "var(--lib)" : "var(--ink)";
    s += `<circle cx="${x(p.ano)}" cy="${y(p.pos)}" r="${p.pos === 1 ? 5 : 3.5}" fill="${cor}"><title>${p.ano}: ${p.pos}º</title></circle>`;
  }
  return cru(s + "</svg>");
}
