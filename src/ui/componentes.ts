import { cores, escudoFixo, sigla, slug } from "../../config/clubes";
import { CORTES, temporada } from "../../config/temporada";
import { jogosDoClube } from "../modelo/classificacao";
import type { ModoVagas } from "../modelo/simular";
import { escudos, resultados } from "../dados";
import { nPlacares, sims } from "../estado";
import { link } from "../router";
import { pct } from "./formato";
import { html, type Html } from "./html";

const n0: number = temporada.clubes;

function maisFrequente(contagem: Record<number, number>, padrao: number): number {
  let melhor = padrao,
    vezes = -1;
  for (const [k, v] of Object.entries(contagem)) if (v > vezes) [melhor, vezes] = [+k, v];
  return melhor;
}

/**
 * Faixas que aparecem nas cores da tabela: 1º ao 4º fase de grupos; depois, até o corte mais provável
 * da Libertadores (pré e vagas que descem das copas); depois, Sul-Americana até o corte mais provável dela.
 * Antes da simulação terminar, vale a regra básica.
 */
export function faixas(): { grupos: number; lib: number; sula: number; provavel: boolean } {
  const r = sims.real;
  if (!r) return { grupos: CORTES.libGrupos, lib: CORTES.lib, sula: CORTES.sula, provavel: false };
  return { grupos: CORTES.libGrupos, lib: maisFrequente(r.corteLib, CORTES.lib - 1) + 1, sula: maisFrequente(r.corteSula, CORTES.sula - 1) + 1, provavel: true };
}

type Zona = "lib" | "pre" | "sula" | "rel" | null;
function zona(p: number, n: number): Zona {
  const f = faixas();
  if (p >= n - CORTES.rebaixados) return "rel";
  if (p < f.grupos) return "lib";
  if (p < f.lib) return "pre";
  if (p < f.sula) return "sula";
  return null;
}
export function classeFaixa(p: number, n = n0): string {
  const z = zona(p, n);
  return z ? `z-${z}` : "";
}
export function corFaixa(p: number, n = n0): string {
  const z = zona(p, n);
  return z ? `var(--${z})` : "var(--muted)";
}

/** Aviso nas telas de dados reais quando há placares simulados guardados. */
export function avisoSimulacao(): Html {
  const n = nPlacares();
  if (!n) return html``;
  return html`<p class="aviso">Aqui só entram resultados reais. Seus ${n} placare${n > 1 ? "s" : ""} simulado${n > 1 ? "s" : ""} aparece${n > 1 ? "m" : ""} em <a href="${link("simular", "tabela")}">Simular</a>.</p>`;
}

export const linkClube = (clube: string, aba?: string) => (aba ? link("clube", slug(clube), aba) : link("clube", slug(clube)));

/** Escudo do clube; enquanto não carrega (ou se falhar), aparecem as duas cores do clube. */
export function escudo(clube: string, tam = 20): Html {
  const [a, b] = cores(clube);
  const url = escudoFixo(clube) ?? escudos[clube];
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
  const f = faixas();
  const r = temporada.faixas.rebaixamento;
  const item = (cor: string, txt: string) => html`<span><i style="background:${cor}"></i>${txt}</span>`;
  const de = (a: number, b: number) => (a === b ? `${a}º` : `${a}º ao ${b}º`);
  const prov = f.provavel ? " (mais provável)" : "";
  return html`<div class="legend">
    ${item("var(--lib)", `Libertadores, grupos ${de(1, f.grupos)}`)}
    ${f.lib > f.grupos ? item("var(--pre)", `Libertadores, pré e vagas das copas ${de(f.grupos + 1, f.lib)}${prov}`) : ""}
    ${item("var(--sula)", `Sul-Americana ${de(f.lib + 1, f.sula)}${prov}`)}
    ${item("var(--rel)", `Rebaixamento ${de(r[0], r[1])}`)}
    <a href="${link("chances", "vagas")}">Por que muda</a>
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

// ---------- como contar as vagas ----------

/** "posicao": só quem termina dentro da faixa (que desce com as copas); "titulos": conta também quem ganha copa. */
export const modoVagas = (): ModoVagas => (lerPref("vagas", "posicao") === "titulos" ? "titulos" : "posicao");

export function seletorVagas(): Html {
  return html`<div class="barra-opcoes"><span class="dim">Vagas</span>${seletorLocal(
    "vagas",
    [
      ["posicao", "Pela posição"],
      ["titulos", "Com títulos"],
    ],
    modoVagas(),
    "Como contar as vagas",
  )}</div>`;
}
