import { tabela } from "../dados";
import { sims } from "../estado";
import { chancesSim, type ResultadoSimulacao } from "../modelo/simular";
import type { Chances } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, avisoSimulacao, calculando, celClube, celProb, classeFaixa, corFaixa, modoVagas, seletor, seletorVagas, type Tom } from "../ui/componentes";
import { dec } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { telaPontuacao } from "./pontuacao";
import { telaVagas } from "./vagas";
import { telaAcerto } from "./acerto";
import { tabelaQueFalta } from "./restante";

export const ZONAS: Record<string, { chave: keyof Chances; nome: string; tom: Tom; frase: string }> = {
  campeao: { chave: "c", nome: "Título", tom: "c-title", frase: "Chance de ser campeão" },
  libertadores: { chave: "l", nome: "Libertadores", tom: "c-lib", frase: "Chance de ir à Libertadores" },
  "sul-americana": { chave: "s", nome: "Sul-Americana", tom: "c-sula", frase: "Chance de ir à Sul-Americana" },
  rebaixamento: { chave: "r", nome: "Queda", tom: "c-rel", frase: "Chance de ser rebaixado" },
};

export function telaChances(vista: string, extra: string): Html {
  const sec = SECOES.find((s) => s.id === "chances")!;
  const topo = seletor(sec.vistas, vista, (k) => link("chances", k), "Tipo de chance");
  if (vista === "acerto") return html`${topo}${telaAcerto()}`;
  if (vista === "restante") return html`${topo}${tabelaQueFalta()}`;
  const res = sims.real;
  if (!res) return html`${topo}${calculando()}`;
  let corpo: Html;
  if (ZONAS[vista]) corpo = html`${vista === "libertadores" || vista === "sul-americana" ? seletorVagas() : ""}${porZona(res, vista)}`;
  else if (vista === "vagas") corpo = html`${seletorVagas()}${telaVagas(res)}`;
  else if (vista === "pontos") corpo = telaPontuacao(extra);
  else corpo = mapaDeCalor(res);
  return html`${topo}${avisoSimulacao()}${corpo}`;
}

/** Os 20 clubes, do mais para o menos provável num objetivo (título, Libertadores, Sul-Americana ou queda). */
function porZona(res: ResultadoSimulacao, vista: string): Html {
  const z = ZONAS[vista];
  const linhas = tabela.map((t, i) => ({ t, i, p: chancesSim(res, i, modoVagas())[z.chave] })).sort((a, b) => b.p - a.p || a.i - b.i);
  return html`<h2>${z.frase}</h2>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th class="l">Chance</th></tr></thead>
      <tbody>${linhas.map(
        (r) => html`<tr ${atrLinha(r.t.clube, classeFaixa(r.i))}><td class="pos">${r.i + 1}</td>${celClube(r.t.clube)}<td class="big">${r.t.p}</td>${celProb(z.tom, r.p, "wide")}</tr>`,
      )}</tbody>
    </table></div>
    <p class="note">O número à esquerda é a posição de hoje.</p>`;
}

function mapaDeCalor(res: ResultadoSimulacao): Html {
  const n = tabela.length;
  const cols = [...Array(n).keys()];
  return html`<p class="sub">Chance, em %, de cada time terminar em cada posição.</p>
    <div class="box"><table class="heat">
      <thead><tr><th class="l">Clube</th>${cols.map((p) => html`<th style="color:${corFaixa(p, n)}">${p + 1}</th>`)}</tr></thead>
      <tbody>${tabela.map(
        (t, i) => html`<tr ${atrLinha(t.clube)}>${celClube(t.clube)}${cols.map((p) => {
          const v = res.pos[i][p];
          if (v < 0.0005) return html`<td></td>`;
          const alfa = (0.08 + Math.sqrt(v) * 0.85).toFixed(3);
          const forte = v > 0.35 ? "color:var(--paper);font-weight:700" : "";
          return html`<td style="background:rgba(var(--heat),${alfa});${forte}" title="${t.clube}, ${p + 1}º: ${dec(v * 100)}%">${v < 0.001 ? html`<small>&lt;0,1</small>` : dec(v * 100, 1)}</td>`;
        })}</tr>`,
      )}</tbody>
    </table></div>`;
}
