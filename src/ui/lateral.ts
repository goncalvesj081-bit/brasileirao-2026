import { tabela } from "../dados";
import { abaInferior, link, SECOES, type Rota } from "../router";
import { escudo, linkClube } from "./componentes";
import { favorito } from "./favorito";
import { cru, html, type Html } from "./html";

const destino = (id: string) => {
  const s = SECOES.find((x) => x.id === id)!;
  return s.vistas.length ? link(s.id, s.vistas[0][0]) : link(s.id);
};

// ícones de traço simples, desenhados à mão (24x24)
const ICONES: Record<string, string> = {
  tabela: '<path d="M4 6h16M4 12h16M4 18h16M8 3v18"/>',
  chances: '<path d="M5 20V12M12 20V5M19 20v-9"/>',
  jogos: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  simular: '<path d="M6 4v16M18 4v16M12 4v16"/><circle cx="6" cy="9" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="18" cy="8" r="2"/>',
  bolao: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM5 5h3M16 5h3M5 5c0 3 1.5 4 3 4M19 5c0 3-1.5 4-3 4M12 13v4M8 20h8"/>',
  "serie-b": '<path d="M7 4h6.5a3.5 3.5 0 0 1 0 7H7zM7 11h7.5a3.5 3.5 0 0 1 0 7H7zM7 4v14"/>',
  comparar: '<path d="M8 4v16M16 4v16M4 8h8M12 16h8"/>',
  estatisticas: '<path d="M4 19h16M6 15l4-4 3 3 5-6"/>',
  pessoas: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4-5.5 7-5.5s5.5 1.5 7 5.5"/>',
  sobre: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  mais: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
};
const icone = (k: string) =>
  cru(`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[k]}</svg>`);

/** Barra lateral do computador: todas as seções, sem subitens (eles ficam no topo de cada tela). */
export function navegacao(r: Rota): Html {
  return html`${SECOES.filter((s) => s.id !== "mais").map(
    (s) => html`<a class="sec" href="${destino(s.id)}" aria-current="${r.secao === s.id ? "page" : "false"}">${icone(s.id)}<span>${s.rotulo}</span></a>`,
  )}`;
}

/** Atalho para as páginas dos clubes, em ordem alfabética (posição e pontos já estão na tabela). */
export function listaClubes(r: Rota): Html {
  const clubes = tabela.map((t) => t.clube).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return html`<h2>Clubes</h2>${clubes.map(
    (c) => html`<a href="${linkClube(c)}" aria-current="${r.clube === c ? "page" : "false"}"${favorito() === c ? html` class="fav"` : ""}>${escudo(c, 16)}<span>${c}${favorito() === c ? " ★" : ""}</span></a>`,
  )}`;
}

/** Abas fixas embaixo, no celular. */
export function abasInferiores(r: Rota): Html {
  const ativa = abaInferior(r);
  return html`${["tabela", "chances", "jogos", "simular", "mais"].map(
    (id) => html`<a href="${destino(id)}" aria-current="${ativa === id ? "page" : "false"}">${icone(id)}<span>${SECOES.find((s) => s.id === id)!.rotulo}</span></a>`,
  )}`;
}
