// "Rodada em andamento": com a rodada pela metade, uns clubes têm um jogo a mais que outros.
// As chances já contam os jogos que faltam; aqui aparece quanto cada resultado muda.

import { sigla } from "../../config/clubes";
import { adiado, nomesClubes, porData, posicao, proximaRodada, resultados, restantes } from "../dados";
import { sims } from "../estado";
import { classificacao } from "../modelo/classificacao";
import { condicional, type ObjetivoJogo } from "../modelo/impacto";
import type { Chances, Jogo } from "../modelo/tipos";
import { escudo } from "../ui/componentes";
import { dataJogo, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

const NOME_OBJ: Record<ObjetivoJogo, string> = { c: "título", l: "Libertadores", r: "queda" };
const TOM_OBJ: Record<ObjetivoJogo, string> = { c: "c-title", l: "c-lib", r: "c-rel" };

/** Jogos da rodada atual que ainda faltam, só quando a rodada já começou. */
export function pendentesDaRodada(): Jogo[] {
  if (proximaRodada == null || !resultados.some((g) => g.rodada === proximaRodada)) return [];
  return restantes.filter((g) => g.rodada === proximaRodada && !adiado(g)).sort(porData);
}

/** Clubes que ainda jogam na rodada atual (para marcar na tabela). */
export function aindaJogam(): Set<string> {
  return new Set(pendentesDaRodada().flatMap((g) => [g.mandante, g.visitante]));
}

/** Posição do clube se o jogo terminar assim (só esse jogo, os outros ainda sem resultado). */
function posicaoSe(g: Jogo, gm: number, gv: number, clube: string): number {
  return classificacao(nomesClubes, [...resultados, { ...g, gm, gv }]).findIndex((l) => l.clube === clube) + 1;
}

export function rodadaEmAndamento(preferido?: keyof Chances): Html {
  const jogos = pendentesDaRodada();
  if (!jogos.length) return html``;
  const porId = new Map((sims.real?.porJogo ?? []).map((E) => [E.id, E]));
  const PLACARES: [number, number][] = [[1, 0], [1, 1], [0, 1]];

  const linha = (g: Jogo, clube: string) => {
    const casa = g.mandante === clube;
    // ordem do clube: vence, empata, perde
    const ordem = casa ? [0, 1, 2] : [2, 1, 0];
    const pos = ordem.map((o) => posicaoSe(g, ...PLACARES[o], clube));
    const E = porId.get(g.id);
    const i = posicao(clube);
    let obj: ObjetivoJogo | null = null,
      se: number[] = [];
    if (E) {
      const opcoes = (["c", "l", "r"] as const).map((o) => ({ o, se: condicional(E, i, o) })).map((x) => ({ ...x, peso: Math.max(...x.se) - Math.min(...x.se) }));
      const escolhido = opcoes.find((x) => x.o === preferido && x.peso >= 0.01) ?? opcoes.sort((a, b) => b.peso - a.peso)[0];
      if (escolhido.peso >= 0.01) {
        obj = escolhido.o;
        se = ordem.map((o) => escolhido.se[o]);
      }
    }
    const hoje = posicao(clube) + 1;
    return html`<tr><td class="l"><span class="quem">${escudo(clube, 16)}${sigla(clube)}${obj ? html` <small>${NOME_OBJ[obj]}</small>` : ""}</span></td>${pos.map(
      (p, k) => html`<td><b class="${p < hoje ? "up" : p > hoje ? "down" : ""}">${p}º</b>${obj ? html`<small class="${TOM_OBJ[obj]}">${pct(se[k])}</small>` : ""}</td>`,
    )}</tr>`;
  };

  return html`<section class="andamento">
    <h3>Rodada em andamento</h3>
    <p class="note">${jogos.length === 1 ? "Falta 1 jogo" : `Faltam ${jogos.length} jogos`} da ${proximaRodada}ª rodada, então a tabela de hoje ainda vai mudar. As chances já contam esses jogos; aqui está a posição e a chance de cada time conforme o resultado.</p>
    ${jogos.map(
      (g) => html`<div class="and-jogo">
        <div class="quando">${dataJogo(g.data, g.semHora)} · <b>${g.mandante} x ${g.visitante}</b></div>
        <table><thead><tr><th class="l"></th><th>Vence</th><th>Empata</th><th>Perde</th></tr></thead>
        <tbody>${linha(g, g.mandante)}${linha(g, g.visitante)}</tbody></table>
      </div>`,
    )}
    <p class="note">Posição contando só aquele jogo, com placar de 1 a 0 ou 1 a 1. Libertadores aqui é pela posição.</p>
  </section>`;
}
