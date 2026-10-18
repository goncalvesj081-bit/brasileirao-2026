import { temporada } from "../../config/temporada";
import { tabela } from "../dados";
import { sims } from "../estado";
import { chancesSim, type ResultadoSimulacao } from "../modelo/simular";
import type { Chances } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, avisoSimulacao, calculando, celClube, celProb, classeFaixa, corFaixa, modoVagas, seletor, seletorVagas, type Tom } from "../ui/componentes";
import { dec } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { rodadaEmAndamento } from "./andamento";
import { telaPontuacao } from "./pontuacao";
import { telaVagas } from "./vagas";

export const ZONAS: Record<string, { chave: keyof Chances; nome: string; tom: Tom; frase: string }> = {
  campeao: { chave: "c", nome: "Título", tom: "c-title", frase: "Chance de ser campeão" },
  libertadores: { chave: "l", nome: "Libertadores", tom: "c-lib", frase: "Chance de ir à Libertadores" },
  "sul-americana": { chave: "s", nome: "Sul-Americana", tom: "c-sula", frase: "Chance de ir à Sul-Americana" },
  rebaixamento: { chave: "r", nome: "Queda", tom: "c-rel", frase: "Chance de ser rebaixado" },
};

const chancesDe = (res: ResultadoSimulacao, i: number) => chancesSim(res, i, modoVagas());

export function telaChances(vista: string, extra: string): Html {
  const sec = SECOES.find((s) => s.id === "chances")!;
  const topo = seletor(sec.vistas, vista, (k) => link("chances", k), "Tipo de chance");
  const res = sims.real;
  if (!res) return html`${topo}${calculando()}`;
  let corpo: Html;
  if (vista === "posicoes") corpo = mapaDeCalor(res);
  else if (vista === "vagas") corpo = telaVagas(res);
  else if (vista === "pontos") corpo = telaPontuacao(extra);
  else if (ZONAS[vista]) corpo = porZona(res, vista);
  else corpo = resumo(res);
  const comSeletor = vista === "resumo" || vista === "libertadores" || vista === "sul-americana";
  return html`${topo}${avisoSimulacao()}${comSeletor ? seletorVagas() : ""}${corpo}`;
}

function resumo(res: ResultadoSimulacao): Html {
  return html`<div class="com-lado"><div class="coluna"><div class="box"><table class="tab curta">
      <thead><tr><th>#</th><th class="l">Clube</th><th class="w">Pts</th><th>Título</th><th>Liberta</th><th>Sula</th><th>Queda</th><th class="w" title="Pontos esperados no fim">Fim</th></tr></thead>
      <tbody>${tabela.map((t, p) => {
        const c = chancesDe(res, p);
        return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big w">${t.p}</td>
          ${celProb("c-title", c.c)}${celProb("c-lib", c.l)}${celProb("c-sula", c.s)}${celProb("c-rel", c.r)}<td class="dim w">${dec(res.pts[p], 0)}</td></tr>`;
      })}</tbody>
    </table></div>
    <p class="note">${modoVagas() === "titulos" ? "Com títulos: conta terminar dentro da faixa ou ganhar a vaga por uma copa." : "Pela posição: conta só terminar dentro da faixa, que desce conforme as vagas das copas."} Veja <a href="${link("chances", "vagas")}">Vagas</a>. ${temporada.modelo.simulacoes.toLocaleString("pt-BR")} campeonatos simulados com os resultados até agora.</p></div>
    ${rodadaEmAndamento()}</div>`;
}

function porZona(res: ResultadoSimulacao, vista: string): Html {
  const z = ZONAS[vista];
  const linhas = tabela.map((t, i) => ({ t, i, p: chancesDe(res, i)[z.chave] })).sort((a, b) => b.p - a.p || a.i - b.i);
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
  return html`<h2>Chance de cada posição final, em %</h2>
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
