import { cartoes, nomesClubes, pessoas, publico, publicoEmCasa, resultados, tabela } from "../dados";
import { jogosDoClube, sequencia, type Res } from "../modelo/classificacao";
import { atrLinha, celClube, celProb, classeFaixa, escudo, forma, linkClube } from "../ui/componentes";
import { dec } from "../ui/formato";
import { html, type Html } from "../ui/html";

export function telaNumeros(vista: string): Html {
  if (vista === "gols") return gols();
  if (vista === "sequencias") return sequencias();
  if (vista === "publico") return telaPublico();
  if (vista === "cartoes") return telaCartoes();
  if (vista === "tecnicos") return tecnicos();
  return artilharia();
}

// ---------- sequências ----------

const SEQ: [string, (r: Res) => boolean, string][] = [
  ["Vitórias", (r) => r === "V", "vitórias seguidas"],
  ["Sem perder", (r) => r !== "D", "jogos sem perder"],
  ["Sem vencer", (r) => r !== "V", "jogos sem vencer"],
  ["Derrotas", (r) => r === "D", "derrotas seguidas"],
];

function sequencias(): Html {
  const porClube = nomesClubes.map((c) => ({ c, s: SEQ.map(([, teste]) => sequencia(jogosDoClube(c, resultados), teste)) }));
  const ordem = tabela.map((t) => porClube.find((x) => x.c === t.clube)!);
  const recordes = SEQ.map(([, , un], k) => {
    const top = porClube.reduce((m, x) => (x.s[k].maior > m.s[k].maior ? x : m), porClube[0]);
    return html`<div><small>Recorde de ${un}</small><b>${escudo(top.c, 18)}${top.c}</b><span>${top.s[k].maior}${top.s[k].maiorAte ? `, até a ${top.s[k].maiorAte}ª rodada` : ""}</span></div>`;
  });
  return html`<div class="destaques2 quatro">${recordes}</div>
    <h2>Sequência atual</h2>
    <div class="box"><table class="tab curta">
      <thead><tr><th>#</th><th class="l">Clube</th>${SEQ.map(([t]) => html`<th>${t}</th>`)}<th class="l w">Últimos 5</th></tr></thead>
      <tbody>${ordem.map(
        (r, p) => html`<tr ${atrLinha(r.c, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(r.c)}${r.s.map(
          (s, k) => html`<td class="${s.atual === 0 ? "dim" : k < 2 ? "up" : "down"}">${s.atual || "–"}</td>`,
        )}<td class="l w">${forma(r.c)}</td></tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Quantos jogos seguidos cada time vem com cada resultado, até a última rodada.</p>`;
}

function gols(): Html {
  const zeros = (c: string, ataque: boolean) => jogosDoClube(c, resultados).filter((x) => (ataque ? x.pro : x.contra) === 0).length;
  const linhas = tabela
    .map((t) => ({ t, ataque: t.j ? t.gp / t.j : 0, defesa: t.j ? t.gc / t.j : 0 }))
    .sort((a, b) => b.ataque - b.defesa - (a.ataque - a.defesa));
  const melhor = (f: (x: (typeof linhas)[number]) => number, menor: boolean) =>
    linhas.reduce((m, x) => ((menor ? f(x) < f(m) : f(x) > f(m)) ? x : m), linhas[0]);
  const atq = melhor((x) => x.ataque, false),
    dfs = melhor((x) => x.defesa, true);
  return html`<div class="destaques2">
      <div><small>Melhor ataque</small><b>${escudo(atq.t.clube, 22)}${atq.t.clube}</b><span>${dec(atq.ataque, 2)} gols por jogo</span></div>
      <div><small>Melhor defesa</small><b>${escudo(dfs.t.clube, 22)}${dfs.t.clube}</b><span>${dec(dfs.defesa, 2)} sofridos por jogo</span></div>
    </div>
    <div class="box"><table class="tab curta">
      <thead><tr><th class="l">Clube</th><th class="w">J</th><th>Marcados</th><th>Por jogo</th><th>Sofridos</th><th>Por jogo</th><th class="w">Sem marcar</th><th class="w">Sem sofrer</th></tr></thead>
      <tbody>${linhas.map(
        (r) => html`<tr ${atrLinha(r.t.clube)}>${celClube(r.t.clube)}<td class="dim w">${r.t.j}</td><td class="big">${r.t.gp}</td><td class="up">${dec(r.ataque, 2)}</td><td class="big">${r.t.gc}</td><td class="down">${dec(r.defesa, 2)}</td><td class="dim w">${zeros(r.t.clube, true)}</td><td class="dim w">${zeros(r.t.clube, false)}</td></tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Ordenado pela diferença entre as médias de gols marcados e sofridos, porque nem todos os times têm o mesmo número de jogos.</p>`;
}

function telaPublico(): Html {
  if (!publico.maiores.length) return html`<p class="empty">Os dados de público chegam na próxima atualização automática.</p>`;
  const tab = (titulo: string, linhas: typeof publico.maiores) => html`<section class="tsec"><h3>${titulo}</h3>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th>Público</th><th class="l">Jogo</th><th class="l w">Estádio</th><th class="l w">Data</th><th class="w">Rod.</th></tr></thead>
      <tbody>${linhas.map(
        ([n, m, pl, v, est, d, r], k) => html`<tr><td class="pos">${k + 1}</td><td class="big">${n.toLocaleString("pt-BR")}</td><td class="l"><span class="quem">${escudo(m, 16)}${m} ${pl} ${v}${escudo(v, 16)}</span></td><td class="l dim w">${est}</td><td class="l dim w">${d}</td><td class="dim w">${r ? `${r}ª` : ""}</td></tr>`,
      )}</tbody>
    </table></div></section>`;
  const medias = nomesClubes
    .map((c) => ({ c, ...publicoEmCasa(c) }))
    .filter((x) => x.jogos)
    .sort((a, b) => b.media - a.media);
  const tabMedias = html`<section class="tsec"><h3>Média de público em casa</h3>
    <div class="box"><table class="tab"><thead><tr><th>#</th><th class="l">Clube</th><th>Média</th><th>Jogos com público</th></tr></thead><tbody>${medias.map(
      (x, k) => html`<tr ${atrLinha(x.c)}><td class="pos">${k + 1}</td>${celClube(x.c)}<td class="big">${Math.round(x.media).toLocaleString("pt-BR")}</td><td class="dim">${x.jogos} de ${x.emCasa}</td></tr>`,
    )}</tbody></table></div>
    <p class="note">Só clubes com público informado na Wikipédia; a média usa os jogos que têm o número.</p></section>`;
  return html`${medias.length ? tabMedias : ""}${tab("Maiores públicos", publico.maiores)}${tab("Menores públicos", publico.menores)}
    <p class="note">Público pagante. A fonte só lista os dez maiores e os dez menores do campeonato. Dados da Wikipédia${publico.atualizado ? `, de ${publico.atualizado}` : ""}.</p>`;
}

/** Foto do técnico (da Wikipédia); sem foto, nada. */
export const fotoTecnico = (t: [string, string, string?], tam: number) =>
  t[2] ? html`<img class="foto-tec" src="${t[2]}" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : "";

/** "Dados de 17/10/2026, ESPN." */
export const dataDoDado = (d: { atualizado: string; fonte?: string }) =>
  html`<p class="note">Dados de ${d.atualizado || "data desconhecida"}${d.fonte ? `, ${d.fonte}` : ""}.</p>`;

// ---------- gols e assistências ----------

function ranking(lista: [string, string, number][], un: string): Html {
  const max = lista[0]?.[2] || 1;
  let ult: number | null = null,
    pos = 0;
  return html`<div class="box"><table class="tab">
    <thead><tr><th>#</th><th class="l">Jogador</th><th class="l">${un}</th></tr></thead>
    <tbody>${lista.map(([nome, clube, v], k) => {
      if (v !== ult) [pos, ult] = [k + 1, v];
      return html`<tr ${atrLinha(clube)}><td class="pos">${pos}</td><td class="l team"><a href="${linkClube(clube)}" title="${clube}">${escudo(clube, 18)}<span>${nome}</span></a></td>${celProb("c-acc", v / max, "wide", undefined, String(v))}</tr>`;
    })}</tbody>
  </table></div>`;
}

function artilharia(): Html {
  return html`<div class="grid2">
      <section class="tsec"><h3>Artilharia</h3>${ranking(pessoas.artilharia.lista.slice(0, 20), "Gols")}${dataDoDado(pessoas.artilharia)}</section>
      <section class="tsec"><h3>Assistências</h3>${ranking(pessoas.assistencias.lista.slice(0, 20), "Assistências")}${dataDoDado(pessoas.assistencias)}</section>
    </div>`;
}

// ---------- técnicos e trocas ----------

function tecnicos(): Html {
  const nTrocas = (c: string) => pessoas.trocas.lista.filter((t) => t[0] === c).length;
  const trocas = pessoas.trocas.lista.slice().reverse();
  return html`<div class="box"><table class="tab curta tab-tec">
      <thead><tr><th>#</th><th class="l">Clube</th><th class="l">Técnico</th><th class="l w">Desde</th><th>Trocas</th></tr></thead>
      <tbody>${tabela.map((t, p) => {
        const c: [string, string, string?] = pessoas.tecnicos.lista[t.clube] ?? ["—", ""];
        return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="l"><span class="quem-tec">${fotoTecnico(c, 28)}${c[0]}</span></td><td class="l dim w">${c[1]}</td><td class="dim">${nTrocas(t.clube) || "–"}</td></tr>`;
      })}</tbody>
    </table></div>${dataDoDado(pessoas.tecnicos)}
    <h2>${trocas.length} trocas em 2026</h2>
    <ul class="trocas">${trocas.map(
      (t) => html`<li><time>${t[3]}</time><a href="${linkClube(t[0])}">${escudo(t[0], 18)}<b>${t[0]}</b></a><span>Saiu ${t[1]}${t[2] ? html` <small>(${t[2]})</small>` : ""}, entrou <b>${t[4]}</b></span></li>`,
    )}</ul>
    <p class="note">Interinos não contam como troca.</p>`;
}

/** Suspensos para o próximo jogo, pendurados e quem mais levou cartão. */
function telaCartoes(): Html {
  if (!cartoes.lista.length) return html`<p class="empty">Os cartões chegam na próxima atualização automática.</p>`;
  const pos = new Map(tabela.map((t, p) => [t.clube, p]));
  const porClube = (s: string) => cartoes.lista.filter((l) => l[4] === s).sort((a, b) => pos.get(a[1])! - pos.get(b[1])! || a[0].localeCompare(b[0], "pt"));
  const lista = (ls: typeof cartoes.lista) =>
    html`<div class="box"><table class="tab"><thead><tr><th class="l">Jogador</th><th class="l">Clube</th><th>Amarelos</th><th>Vermelhos</th></tr></thead><tbody>${ls.map(
      ([n, c, a, v]) => html`<tr ${atrLinha(c)}><td class="l team">${n}</td><td class="l team dim"><a href="${linkClube(c)}">${escudo(c, 18)}<span>${c}</span></a></td><td><span class="cartao am">${a}</span></td><td>${v ? html`<span class="cartao vm">${v}</span>` : html`<span class="dim">0</span>`}</td></tr>`,
    )}</tbody></table></div>`;
  const susp = porClube("suspenso"),
    pend = porClube("pendurado");
  return html`${dataDoDado({ atualizado: cartoes.atualizado, fonte: "ESPN" })}
    <section class="tsec"><h3>Suspensos no próximo jogo</h3>${susp.length ? lista(susp) : html`<p class="note">Ninguém.</p>`}</section>
    <section class="tsec"><h3>Pendurados</h3><p class="note">Com mais um amarelo, ficam fora do jogo seguinte.</p>${pend.length ? lista(pend) : html`<p class="note">Ninguém.</p>`}</section>
    <section class="tsec"><h3>Mais cartões</h3>${lista(cartoes.lista.slice(0, 30))}</section>
    <p class="note">Regra da CBF: a cada 3 amarelos, ou com um vermelho, o jogador cumpre suspensão no jogo seguinte do time. Suspensões maiores dadas pelo tribunal (STJD) não aparecem aqui.</p>`;
}
