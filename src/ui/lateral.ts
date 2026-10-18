import { tabela } from "../dados";
import { link, SECOES, type Rota } from "../router";
import { linkClube } from "./componentes";
import { html, type Html } from "./html";

const GRUPOS = ["Simular", "Chances", "Campeonato"] as const;

export function navegacao(r: Rota): Html {
  return html`${GRUPOS.map(
    (g) => html`<div class="grp">${g}</div>${SECOES.filter((s) => s.grupo === g).map((s) => {
      const ativa = r.secao === s.id;
      const destino = s.vistas.length ? link(s.id, s.vistas[0][0]) : link(s.id);
      return html`<a class="sec" href="${destino}" aria-current="${ativa ? "page" : "false"}">${s.rotulo}</a>
        ${ativa && s.vistas.length
          ? html`<div class="subs">${s.vistas.map(
              ([v, rot]) => html`<a href="${link(s.id, v)}" aria-current="${r.vista === v ? "page" : "false"}">${rot}</a>`,
            )}</div>`
          : ""}`;
    })}`,
  )}`;
}

export function listaClubes(r: Rota): Html {
  return html`${tabela.map(
    (t, p) => html`<a href="${linkClube(t.clube)}" aria-current="${r.clube === t.clube ? "page" : "false"}"><small>${p + 1}º</small><span>${t.clube}</span><em>${t.p}</em></a>`,
  )}`;
}
