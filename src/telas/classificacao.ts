import { temporada } from "../../config/temporada";
import { jogosAdiados, nomesClubes, resultados, tabela } from "../dados";
import { classificacao, classificacaoUltimos } from "../modelo/classificacao";
import type { Linha } from "../modelo/tipos";
import { atrLinha, celClube, classeFaixa, forma, legenda } from "../ui/componentes";
import { saldo } from "../ui/formato";
import { html, type Html } from "../ui/html";

export function tabelaClassificacao(linhas: Linha[], zonas: boolean, comForma: boolean): Html {
  const n = linhas.length;
  return html`<div class="box"><table style="min-width:${comForma ? 760 : 620}px">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th title="Aproveitamento">%</th>${comForma ? html`<th class="l">Últimos 5</th>` : ""}</tr></thead>
    <tbody>${linhas.map(
      (t, p) => html`<tr ${atrLinha(t.clube, zonas ? classeFaixa(p, n) : "")}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td>${t.j}</td><td>${t.v}</td><td>${t.e}</td><td>${t.d}</td><td>${t.gp}</td><td>${t.gc}</td><td>${saldo(t.gp - t.gc)}</td><td class="dim">${t.j ? Math.round((100 * t.p) / (3 * t.j)) : 0}</td>${comForma ? html`<td class="l">${forma(t.clube)}</td>` : ""}</tr>`,
    )}</tbody>
  </table></div>`;
}

export function telaClassificacao(vista: string): Html {
  const T = temporada.turnoAte;
  let linhas: Linha[],
    titulo: string,
    nota = "";
  switch (vista) {
    case "mandante":
      linhas = classificacao(nomesClubes, resultados, (_, lado) => lado === "m");
      titulo = "Classificação como mandante";
      break;
    case "visitante":
      linhas = classificacao(nomesClubes, resultados, (_, lado) => lado === "v");
      titulo = "Classificação como visitante";
      break;
    case "turno":
      linhas = classificacao(nomesClubes, resultados.filter((r) => r.rodada <= T));
      titulo = `Classificação do turno (1ª à ${T}ª)`;
      break;
    case "returno": {
      linhas = classificacao(nomesClubes, resultados.filter((r) => r.rodada > T));
      titulo = `Classificação do returno (${T + 1}ª à 38ª)`;
      const pend = jogosAdiados.filter((g) => g.rodada > T);
      if (pend.length)
        nota = `${pend.map((g) => `${g.mandante} x ${g.visitante} (${g.rodada}ª)`).join(", ")}, adiado${pend.length > 1 ? "s" : ""}, entra${pend.length > 1 ? "m" : ""} no returno quando for disputado.`;
      break;
    }
    case "ultimas-10":
      linhas = classificacaoUltimos(nomesClubes, resultados, 10);
      titulo = "Classificação das últimas 10 rodadas";
      nota = "Considera os 10 últimos jogos de cada time.";
      break;
    default:
      linhas = tabela;
      titulo = "Classificação geral";
  }
  const geral = vista === "geral" || !["mandante", "visitante", "turno", "returno", "ultimas-10"].includes(vista);
  return html`<h2>${titulo}</h2>${geral ? legenda() : ""}${nota ? html`<p class="note">${nota}</p>` : ""}
    ${tabelaClassificacao(linhas, geral, geral || vista === "ultimas-10")}`;
}
