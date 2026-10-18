import { slug } from "../../config/clubes";
import { CORTES, faixaDaPosicao, temporada } from "../../config/temporada";
import { jogosDoClube } from "../modelo/classificacao";
import { resultados } from "../dados";
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

/** Linha de tabela que leva à página do clube (o nome também é link, para teclado e leitor de tela). */
export const atrLinha = (clube: string, extra = "") => html`class="click ${extra}" data-href="${linkClube(clube)}"`;
export const celClube = (clube: string) => html`<td class="l team"><a href="${linkClube(clube)}">${clube}</a></td>`;

export type Tom = "c-title" | "c-lib" | "c-sula" | "c-rel" | "c-acc";

/** Célula com a barra da probabilidade atrás do número. */
export function celProb(tom: Tom, p: number, extra = "", depois?: Html, texto?: string): Html {
  const w = Math.min(100, Math.max(0, p * 100)).toFixed(1);
  return html`<td class="prob ${tom} ${extra}"><div class="b" style="width:${w}%"></div><span>${texto ?? pct(p)}</span>${depois ?? ""}</td>`;
}

export function legenda(): Html {
  const f = temporada.faixas;
  const item = (cor: string, txt: string) => html`<span><i style="background:${cor}"></i>${txt}</span>`;
  return html`<div class="legend">
    ${item("var(--lib)", `${f.libertadores[0]}º ao ${f.libertadores[1]}º Libertadores (fase de grupos)`)}
    ${item("var(--pre)", `${f.preLibertadores[0]}º e ${f.preLibertadores[1]}º pré-Libertadores`)}
    ${item("var(--sula)", `${f.sulAmericana[0]}º ao ${f.sulAmericana[1]}º Sul-Americana`)}
    ${item("var(--rel)", `${f.rebaixamento[0]}º ao ${f.rebaixamento[1]}º rebaixamento`)}
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
export const calculando = () => vazio(`Calculando ${temporada.modelo.simulacoes.toLocaleString("pt-BR")} campeonatos…`);

export const ROT_LIB = `1º ao ${CORTES.lib}º`;
