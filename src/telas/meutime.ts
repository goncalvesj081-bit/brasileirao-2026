// Cartão do "meu time" no topo da Tabela: posição, chances em aberto, próximo jogo e atalhos.

import { adiado, linhaDe, porData, posicao, restantes } from "../dados";
import { sims } from "../estado";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { chancesSim } from "../modelo/simular";
import { tabela } from "../dados";
import { escudo, linkClube, modoVagas } from "../ui/componentes";
import { favorito } from "../ui/favorito";
import { dataJogo, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

export function cartaoMeuTime(): Html {
  const c = favorito();
  if (!c) return html``;
  const i = posicao(c);
  const t = linhaDe(c);
  const res = sims.real;
  const ch = res ? chancesSim(res, i, modoVagas()) : null;
  const itens: [string, number, string][] = ch
    ? ([
        ["Título", ch.c, "t-title"],
        ["Libertadores", ch.l, "t-lib"],
        ["Sul-Americana", ch.s, "t-sula"],
        ["Queda", ch.r, "t-rel"],
      ] as [string, number, string][]).filter(([, v]) => v >= 0.005)
    : [];
  const prox = restantes.filter((g) => !adiado(g) && (g.mandante === c || g.visitante === c)).sort(porData)[0];
  let jogo: Html = html``;
  if (prox) {
    const [H, D, A] = probResultado(...golsEsperados(forcas(tabela), prox.mandante, prox.visitante));
    const casa = prox.mandante === c;
    const adv = casa ? prox.visitante : prox.mandante;
    jogo = html`<p class="mt-jogo">Próximo: ${casa ? "x" : "@"} ${escudo(adv, 16)} <b>${adv}</b>, ${dataJogo(prox.data, prox.semHora)} · vence ${pct(casa ? H : A)}, empata ${pct(D)}</p>`;
  }
  return html`<section class="meu-time">
    <a class="mt-nome" href="${linkClube(c)}">${escudo(c, 30)}<b>${c}</b><span class="dim">${i + 1}º, ${t.p} pts</span></a>
    ${itens.length ? html`<div class="mt-ch">${itens.map(([r, v, k]) => html`<span><small>${r}</small><b class="${k}">${pct(v)}</b></span>`)}</div>` : ""}
    ${jogo}
    <p class="mt-links"><a href="${linkClube(c, "torcida")}">Para quem torcer</a><a href="${linkClube(c, "rodada-a-rodada")}">Rodada a rodada</a></p>
  </section>`;
}
