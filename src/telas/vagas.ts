import { clube } from "../../config/clubes";
import { copas } from "../dados";
import { sortearCopa, VAGAS, type Copa } from "../modelo/copas";
import { criarRng } from "../modelo/rng";
import type { ResultadoSimulacao } from "../modelo/simular";
import { escudo } from "../ui/componentes";
import { pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

/** Distribuição de "até que posição vai a vaga", em linhas com barra. */
function corte(contagem: Record<number, number>, n: number, tom: string): Html {
  const linhas = Object.entries(contagem)
    .map(([p, c]) => ({ p: +p, f: c / n }))
    .filter((l) => l.p >= 0 && l.f >= 0.001)
    .sort((a, b) => a.p - b.p);
  const max = Math.max(...linhas.map((l) => l.f));
  return html`<div class="box"><table class="tab">
    <tbody>${linhas.map(
      (l) => html`<tr class="${l.f === max ? "destaque" : ""}"><td class="l">Até o <b>${l.p + 1}º</b></td><td class="prob ${tom} wide"><span>${pct(l.f)}</span><i style="width:${(l.f * 100).toFixed(1)}%"></i></td></tr>`,
    )}</tbody>
  </table></div>`;
}

/** Chance de título de cada time numa copa (sorteando o que falta, como na simulação). */
function chancesCopa(copa: Copa): [string, number][] {
  if (copa.campeao) return [[copa.campeao, 1]];
  const rand = criarRng(2026);
  const N = 20000;
  const conta = new Map<string, number>();
  for (let s = 0; s < N; s++) {
    const r = sortearCopa(copa, rand);
    if (r) conta.set(r.campeao, (conta.get(r.campeao) ?? 0) + 1);
  }
  return [...conta.entries()].map(([t, c]) => [t, c / N] as [string, number]).sort((a, b) => b[1] - a[1]);
}

function blocoCopa(copa: Copa, efeito: string): Html {
  const chances = chancesCopa(copa);
  const situacao = copa.campeao
    ? html`<p class="note">Campeão: <b>${copa.campeao}</b>${copa.vice ? `, vice: ${copa.vice}` : ""}.</p>`
    : html`<ul class="confrontos">${copa.confrontos.map((c) => {
        const vant = c.saldoA > 0 ? `${c.a} leva ${c.saldoA} gol${c.saldoA > 1 ? "s" : ""} de vantagem` : c.saldoA < 0 ? `${c.b} leva ${-c.saldoA} gol${c.saldoA < -1 ? "s" : ""} de vantagem` : c.faltam.length === 2 ? "ainda sem jogos" : "empatado no agregado";
        return html`<li><span>${c.a} x ${c.b}</span><small>${vant}</small></li>`;
      })}</ul>`;
  return html`<section class="copa"><h3>${copa.nome}</h3><p class="note">${efeito}</p>${situacao}
    <div class="titulo-copa">${chances.map(
      ([t, p]) => html`<span class="${clube(t) ? "" : "dim"}">${clube(t) ? escudo(t, 18) : ""}${t} <b>${pct(p)}</b></span>`,
    )}</div></section>`;
}

export function telaVagas(res: ResultadoSimulacao): Html {
  return html`<h2>Até onde vai a Libertadores</h2>
    <p class="sub">Pela tabela, o Brasileirão dá ${VAGAS.libertadoresLiga} vagas: do 1º ao 4º direto na fase de grupos e o 5º na pré. A Copa do Brasil dá mais ${VAGAS.libertadoresCopa}, e os campeões da Libertadores e da Sul-Americana, se forem brasileiros, mais uma cada. Quando quem ganha essas vagas já está classificado pela tabela, a vaga desce para o próximo colocado.</p>
    ${corte(res.corteLib, res.n, "c-lib")}
    <p class="note">Em quantos dos ${res.n.toLocaleString("pt-BR")} campeonatos simulados a última vaga pela tabela ficou em cada posição.</p>
    <h2>Até onde vai a Sul-Americana</h2>
    <p class="sub">São ${VAGAS.sulAmericana} vagas, para os ${VAGAS.sulAmericana} melhores colocados que não foram à Libertadores.</p>
    ${corte(res.corteSula, res.n, "c-sula")}
    <h2>Copas que mexem nas vagas</h2>
    <div class="grid2">
      ${blocoCopa(copas.copaDoBrasil, "Campeão e vice vão à Libertadores.")}
      ${blocoCopa(copas.libertadores, "Campeão brasileiro ganha vaga na próxima Libertadores.")}
      ${blocoCopa(copas.sulAmericana, "Campeão brasileiro ganha vaga na Libertadores.")}
    </div>
    <p class="note">Situação das copas em ${copas.atualizado}. O que falta delas é sorteado em cada simulação a partir do placar dos jogos já feitos, com os dois times considerados de força igual.</p>`;
}
