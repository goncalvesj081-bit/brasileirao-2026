import { temporada } from "../../config/temporada";
import { jogosAdiados, nomesClubes, resultados, tabela } from "../dados";
import { sims } from "../estado";
import { classificacao, classificacaoUltimos } from "../modelo/classificacao";
import { chancesSim } from "../modelo/simular";
import type { Chances, Linha } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { atrLinha, avisoSimulacao, celClube, celProb, classeFaixa, forma, legenda, lerPref, modoVagas, seletor, seletorLocal, seletorVagas, type Tom } from "../ui/componentes";
import { saldo } from "../ui/formato";
import { aindaJogam, rodadaEmAndamento } from "./andamento";
import { cartaoMeuTime } from "./meutime";
import { html, type Html } from "../ui/html";

const COLUNAS: [keyof Chances, string, Tom][] = [
  ["c", "Título", "c-title"],
  ["l", "Liberta", "c-lib"],
  ["s", "Sula", "c-sula"],
  ["r", "Queda", "c-rel"],
];

/** Tabela de classificação. `chance`: coluna de probabilidade a mostrar (só na geral). */
export function tabelaClassificacao(linhas: Linha[], zonas: boolean, comForma: boolean, chance?: keyof Chances): Html {
  const n = linhas.length;
  const col = chance ? COLUNAS.find((c) => c[0] === chance)! : null;
  const res = sims.real;
  const jogam = zonas ? aindaJogam() : new Set<string>();
  return html`<div class="box"><table class="tab">
    <thead><tr><th>#</th><th class="l">Clube</th><th>P</th><th>J</th><th class="w">V</th><th class="w">E</th><th class="w">D</th><th class="w">GP</th><th class="w">GC</th><th>SG</th>${comForma ? html`<th class="l w">Últimos 5</th>` : ""}${col ? html`<th>${col[1]}</th>` : ""}</tr></thead>
    <tbody>${linhas.map((t, p) => {
      const i = tabela.indexOf(t);
      const c = col && res && i >= 0 ? chancesSim(res, i, modoVagas())[col[0]] : null;
      return html`<tr ${atrLinha(t.clube, zonas ? classeFaixa(p, n) : "")}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="big">${t.p}</td><td class="dim">${t.j}${jogam.has(t.clube) ? html`<i class="pend" title="Ainda joga nesta rodada"></i>` : ""}</td><td class="w">${t.v}</td><td class="w">${t.e}</td><td class="w">${t.d}</td><td class="w">${t.gp}</td><td class="w">${t.gc}</td><td class="dim">${saldo(t.gp - t.gc)}</td>${comForma ? html`<td class="l w">${forma(t.clube)}</td>` : ""}${col ? (c == null ? html`<td class="dim">…</td>` : celProb(col[2], c)) : ""}</tr>`;
    })}</tbody>
  </table></div>`;
}

export function telaClassificacao(vista: string): Html {
  const T = temporada.turnoAte;
  const sec = SECOES.find((s) => s.id === "tabela")!;
  const topo = seletor(sec.vistas, vista, (k) => link("tabela", k), "Recorte da tabela");
  let linhas: Linha[],
    nota = "";
  switch (vista) {
    case "mandante":
      linhas = classificacao(nomesClubes, resultados, (_, lado) => lado === "m");
      break;
    case "visitante":
      linhas = classificacao(nomesClubes, resultados, (_, lado) => lado === "v");
      break;
    case "turno":
      linhas = classificacao(nomesClubes, resultados.filter((r) => r.rodada <= T));
      nota = `Rodadas 1 a ${T}.`;
      break;
    case "returno": {
      linhas = classificacao(nomesClubes, resultados.filter((r) => r.rodada > T));
      const pend = jogosAdiados.filter((g) => g.rodada > T);
      nota = `Rodadas ${T + 1} a 38.` + (pend.length ? ` Falta${pend.length > 1 ? "m" : ""} ${pend.map((g) => `${g.mandante} x ${g.visitante}`).join(", ")}, adiado${pend.length > 1 ? "s" : ""}.` : "");
      break;
    }
    case "ultimas-10":
      linhas = classificacaoUltimos(nomesClubes, resultados, 10);
      break;
    default: {
      const chance = lerPref("chance", "c") as keyof Chances;
      return html`${topo}${avisoSimulacao()}${cartaoMeuTime()}
        <div class="barra-opcoes"><span class="dim">Chance de</span>${seletorLocal("chance", COLUNAS.map(([k, t]) => [k, t]), chance, "Coluna de chance")}</div>
        ${chance === "l" || chance === "s" ? seletorVagas() : ""}
        <div class="com-lado"><div class="coluna">${tabelaClassificacao(tabela, true, true, chance)}${legenda()}</div>${rodadaEmAndamento(chance)}</div>`;
    }
  }
  return html`${topo}${nota ? html`<p class="note">${nota}</p>` : ""}${tabelaClassificacao(linhas, false, vista === "ultimas-10")}`;
}
