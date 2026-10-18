import { CORTES, temporada } from "../../config/temporada";
import { tabela } from "../dados";
import { sims } from "../estado";
import { chancesDaLinha, type ResultadoSimulacao } from "../modelo/simular";
import type { Chances } from "../modelo/tipos";
import { atrLinha, calculando, celClube, celProb, classeFaixa, corFaixa, legenda, type Tom } from "../ui/componentes";
import { dec, saldo } from "../ui/formato";
import { html, type Html } from "../ui/html";

export const ZONAS: Record<string, { chave: keyof Chances; nome: string; tom: Tom; frase: string }> = {
  campeao: { chave: "c", nome: "Campeão", tom: "c-title", frase: "ser campeão" },
  libertadores: { chave: "l", nome: "Libertadores", tom: "c-lib", frase: `ir à Libertadores (1º ao ${CORTES.lib}º, com a pré)` },
  "sul-americana": { chave: "s", nome: "Sul-Americana", tom: "c-sula", frase: `terminar entre ${CORTES.lib + 1}º e ${CORTES.sula}º` },
  rebaixamento: { chave: "r", nome: "Rebaixamento", tom: "c-rel", frase: "ser rebaixado" },
};

const chancesDe = (res: ResultadoSimulacao, i: number) => chancesDaLinha(res.pos[i]);

export function telaChances(vista: string): Html {
  const res = sims.real;
  if (!res) return calculando();
  if (vista === "posicoes") return mapaDeCalor(res);
  if (ZONAS[vista]) return porZona(res, vista);
  return resumo(res);
}

function resumo(res: ResultadoSimulacao): Html {
  return html`${legenda()}
    <p class="note">Libertadores soma fase de grupos e pré-Libertadores (1º ao ${CORTES.lib}º).</p>
    <div class="box"><table style="min-width:700px">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th>J</th><th>SG</th><th>Campeão</th><th>Liberta</th><th>Sula</th><th>Rebaix.</th><th title="Pontos médios no fim">Pts fim</th></tr></thead>
      <tbody>${tabela.map((t, p) => {
        const c = chancesDe(res, p);
        return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td class="dim">${t.j}</td><td class="dim">${saldo(t.gp - t.gc)}</td>
          ${celProb("c-title", c.c)}${celProb("c-lib", c.l)}${celProb("c-sula", c.s)}${celProb("c-rel", c.r)}<td class="dim">${dec(res.pts[p])}</td></tr>`;
      })}</tbody>
    </table></div>`;
}

function porZona(res: ResultadoSimulacao, vista: string): Html {
  const z = ZONAS[vista];
  const linhas = tabela.map((t, i) => ({ t, i, p: chancesDe(res, i)[z.chave] })).sort((a, b) => b.p - a.p || a.i - b.i);
  return html`<h2>Chance de ${z.frase}</h2>
    <div class="box"><table>
      <thead><tr><th>#</th><th class="l">Clube</th><th>Pts</th><th>J</th><th class="l">Probabilidade</th></tr></thead>
      <tbody>${linhas.map(
        (r, k) => html`<tr ${atrLinha(r.t.clube)}><td class="pos">${k + 1}</td>${celClube(r.t.clube)}<td class="big">${r.t.p}</td><td class="dim">${r.t.j}</td>${celProb(z.tom, r.p, "wide")}</tr>`,
      )}</tbody>
    </table></div>`;
}

function mapaDeCalor(res: ResultadoSimulacao): Html {
  const n = tabela.length;
  const cols = [...Array(n).keys()];
  return html`<p class="sub">Chance, em %, de cada time terminar em cada posição. Quanto mais forte a cor, maior a chance.</p>
    <div class="box"><table class="heat">
      <thead><tr><th class="l">Clube</th>${cols.map((p) => html`<th style="color:${corFaixa(p, n)}">${p + 1}º</th>`)}</tr></thead>
      <tbody>${tabela.map(
        (t, i) => html`<tr ${atrLinha(t.clube)}>${celClube(t.clube)}${cols.map((p) => {
          const v = res.pos[i][p];
          if (v < 0.0005) return html`<td></td>`;
          const alfa = (0.08 + Math.sqrt(v) * 0.85).toFixed(3);
          const forte = v > 0.35 ? "color:var(--paper);font-weight:700" : "";
          return html`<td style="background:rgba(var(--heat),${alfa});${forte}" title="${t.clube}, ${p + 1}º: ${dec(v * 100)}%">${v < 0.01 ? html`<small>&lt;1</small>` : Math.round(v * 100)}</td>`;
        })}</tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Cada linha soma 100%. ${temporada.modelo.simulacoes.toLocaleString("pt-BR")} campeonatos simulados.</p>`;
}
