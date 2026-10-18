import { cores, sigla, slug } from "../../config/clubes";
import { CORTES, faixaDaPosicao, temporada } from "../../config/temporada";
import { jogosDoClube } from "../modelo/classificacao";
import { escudos, resultados } from "../dados";
import { link } from "../router";
import { pct } from "./formato";
import { html, type Html } from "./html";

const n0: number = temporada.clubes;
const CLASSE = { libertadores: "z-lib", preLibertadores: "z-pre", sulAmericana: "z-sula", rebaixamento: "z-rel" } as const;
const COR = { libertadores: "var(--lib)", preLibertadores: "var(--pre)", sulAmericana: "var(--sula)", rebaixamento: "var(--rel)" } as const;

export function classeFaixa(p: number, n = n0): string {
  const f = faixaDaPosicao(p, n);
  return f ? CLASSE[f] : "";
}
export function corFaixa(p: number, n = n0): string {
  const f = faixaDaPosicao(p, n);
  return f ? COR[f] : "var(--muted)";
}

export const linkClube = (clube: string, aba?: string) => (aba ? link("clube", slug(clube), aba) : link("clube", slug(clube)));

/** Escudo do clube; enquanto não carrega (ou se falhar), aparecem as duas cores do clube. */
export function escudo(clube: string, tam = 20): Html {
  const [a, b] = cores(clube);
  const url = escudos[clube];
  return html`<span class="esc" style="--a:${a};--b:${b};--t:${tam}px" aria-hidden="true">${url ? html`<img src="${url}" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" onload="this.parentNode.classList.add('ok')" onerror="this.remove()">` : ""}</span>`;
}

/** Linha de tabela que leva à página do clube (o nome também é link, para teclado e leitor de tela). */
export const atrLinha = (clube: string, extra = "") => html`class="click ${extra}" data-href="${linkClube(clube)}"`;
/** Célula do clube. Em tabelas com a classe "curta", o celular mostra a sigla no lugar do nome. */
export const celClube = (clube: string) =>
  html`<td class="l team"><a href="${linkClube(clube)}" title="${clube}">${escudo(clube)}<span class="nome">${clube}</span><span class="sig">${sigla(clube)}</span></a></td>`;

export type Tom = "c-title" | "c-lib" | "c-sula" | "c-rel" | "c-acc";

/** Número da probabilidade com uma barra fina embaixo, do tamanho da chance. */
export function celProb(tom: Tom, p: number, extra = "", depois?: Html, texto?: string): Html {
  const w = Math.min(100, Math.max(0, p * 100)).toFixed(1);
  const nulo = p < 0.0005 && !texto;
  return html`<td class="prob ${tom} ${extra} ${nulo ? "nulo" : ""}"><span>${texto ?? pct(p)}</span>${depois ?? ""}<i style="width:${w}%"></i></td>`;
}

/** Seletor no topo da tela (links, para cada opção ter seu endereço). */
export function seletor(opcoes: [string, string][], atual: string, href: (k: string) => string, rotulo = "Ver"): Html {
  return html`<nav class="seg" aria-label="${rotulo}">${opcoes.map(
    ([k, t]) => html`<a href="${href(k)}" aria-current="${k === atual ? "page" : "false"}">${t}</a>`,
  )}</nav>`;
}

/** Seletor que não muda o endereço (preferência guardada no aparelho). */
export function seletorLocal(nome: string, opcoes: [string, string][], atual: string, rotulo: string): Html {
  return html`<div class="seg" role="group" aria-label="${rotulo}">${opcoes.map(
    ([k, t]) => html`<button type="button" data-pref="${nome}" data-valor="${k}" aria-pressed="${k === atual}">${t}</button>`,
  )}</div>`;
}

export function legenda(): Html {
  const f = temporada.faixas;
  const item = (cor: string, txt: string) => html`<span><i style="background:${cor}"></i>${txt}</span>`;
  return html`<div class="legend">
    ${item("var(--lib)", `Libertadores ${f.libertadores[0]}–${f.libertadores[1]}`)}
    ${item("var(--pre)", `Pré-Libertadores ${f.preLibertadores[0]}–${f.preLibertadores[1]}`)}
    ${item("var(--sula)", `Sul-Americana ${f.sulAmericana[0]}–${f.sulAmericana[1]}`)}
    ${item("var(--rel)", `Rebaixamento ${f.rebaixamento[0]}–${f.rebaixamento[1]}`)}
  </div>`;
}

/** Últimos k resultados como quadradinhos V/E/D. */
export function forma(clube: string, k = 5): Html {
  const jogos = jogosDoClube(clube, resultados).slice(-k);
  return html`<span class="form">${jogos.map(
    (g) => html`<i class="${g.res}" title="${g.rodada}ª: ${g.casa ? "x" : "@"} ${g.adversario} ${g.pro}-${g.contra}">${g.res}</i>`,
  )}</span>`;
}

export const vazio = (txt: string) => html`<p class="empty">${txt}</p>`;
export const calculando = () => html`<p class="empty carregando">Calculando ${temporada.modelo.simulacoes.toLocaleString("pt-BR")} campeonatos</p>`;

export const ROT_LIB = `1º ao ${CORTES.lib}º`;

// ---------- preferências locais (coluna de chance da tabela etc.) ----------

export function lerPref(nome: string, padrao: string): string {
  try {
    return localStorage.getItem(`brasileirao26-${nome}`) ?? padrao;
  } catch {
    return padrao;
  }
}
export function gravarPref(nome: string, valor: string) {
  try {
    localStorage.setItem(`brasileirao26-${nome}`, valor);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}
