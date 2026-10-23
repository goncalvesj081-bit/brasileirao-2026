import { tabela } from "../dados";
import { sims } from "../estado";
import type { ResultadoSimulacao } from "../modelo/simular";
import type { Chances } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, avisoSimulacao, calculando, celClube, corFaixa, seletor, seletorVagas, type Tom } from "../ui/componentes";
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
  const corpo = vista === "vagas" ? html`${seletorVagas()}${telaVagas(res)}` : vista === "pontos" ? telaPontuacao(extra) : mapaDeCalor(res);
  return html`${topo}${avisoSimulacao()}${corpo}`;
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
