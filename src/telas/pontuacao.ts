import { sigla } from "../../config/clubes";
import { tabela } from "../dados";
import { sims } from "../estado";
import { link } from "../router";
import { calculando, celProb, escudo, linkClube, seletor, vazio } from "../ui/componentes";
import { pct } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { ZONAS } from "./chances";

const COLUNA = { c: 2, l: 3, s: 4, r: 5 } as const;

/** Chance de cada objetivo conforme a pontuação final (dentro de Chances, "Por pontos"). */
export function telaPontuacao(objetivo: string): Html {
  const res = sims.real;
  if (!res) return calculando();
  const chave = ZONAS[objetivo] ? objetivo : "campeao";
  const z = ZONAS[chave];
  const col = COLUNA[z.chave];
  const rebaix = z.chave === "r";
  const topo = seletor(
    Object.entries(ZONAS).map(([k, v]) => [k, v.nome]),
    chave,
    (k) => link("chances", "pontos", k),
    "Objetivo",
  );

  const linhas = res.porPontos
    .filter((b) => b[1] >= 40) // pontuações raríssimas dão porcentagens instáveis
    .map((b) => ({ p: b[0], pr: b[col] / b[1] }))
    .sort((a, b) => b.p - a.p);
  // corta as caudas: de onde a chance encosta em 100% até onde encosta em 0%
  const meio = linhas.filter((r) => r.pr > 0.002 && r.pr < 0.998);
  if (!meio.length) return html`${topo}${vazio("Essa disputa já está praticamente decidida.")}`;
  const hi = Math.max(...meio.map((r) => r.p)) + 1;
  const lo = Math.min(...meio.map((r) => r.p)) - 1;
  const vistas = linhas.filter((r) => r.p <= hi && r.p >= lo);

  const marcos = [0.5, 0.9, 0.99]
    .map((t) => {
      const r = rebaix
        ? vistas.filter((r) => r.pr <= 1 - t).sort((a, b) => a.p - b.p)[0]
        : vistas.filter((r) => r.pr >= t).sort((a, b) => a.p - b.p)[0];
      return r ? ([t, r.p] as const) : null;
    })
    .filter((x) => x !== null);

  const projetados = (pts: number) =>
    tabela
      .map((t, i) => ({ t, i }))
      .filter((o) => Math.round(res.pts[o.i]) === pts)
      .map((o) => html`<a class="mini" href="${linkClube(o.t.clube)}" title="${o.t.clube}">${escudo(o.t.clube, 18)}<span>${sigla(o.t.clube)}</span></a>`);

  return html`${topo}
    <div class="marcos">${marcos.map(
      ([t, p]) => html`<div><b>${p}</b><span>pontos: ${rebaix ? `risco abaixo de ${pct(1 - t)}` : `${pct(t)} de chance`}</span></div>`,
    )}</div>
    <div class="box"><table class="tab">
      <thead><tr><th>Pontos</th><th class="l">${rebaix ? "Risco de cair" : "Chance"}</th><th class="l">Projetados</th></tr></thead>
      <tbody>${vistas.map((r) => html`<tr><td class="big">${r.p}</td>${celProb(z.tom, r.pr, "wide")}<td class="l">${projetados(r.p)}</td></tr>`)}</tbody>
    </table></div>
    <p class="note">Em todas as simulações, com que frequência quem terminou com aquela pontuação conseguiu o objetivo pela posição (as vagas que descem das copas já contam). Projetados: times que devem terminar com essa pontuação.</p>`;
}
