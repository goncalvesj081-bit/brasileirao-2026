// "Para quem torcer": nos jogos que faltam, qual resultado mais ajuda o clube no objetivo em aberto.
// Usa o efeito de cada jogo guardado pela simulação (chance do clube em cada resultado).

import { adiado, porData, posicao, proximaRodada, restantes, rodadasAbertas } from "../dados";
import { sims } from "../estado";
import { condicional, type ObjetivoJogo } from "../modelo/impacto";
import { chancesDaLinha } from "../modelo/simular";
import type { Jogo } from "../modelo/tipos";
import { calculando, escudo, linkClube, vazio } from "../ui/componentes";
import { dataJogo, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

const NOME: Record<ObjetivoJogo, string> = { c: "o título", l: "a Libertadores", r: "fugir da queda" };
const TOM: Record<ObjetivoJogo, string> = { c: "c-title", l: "c-lib", r: "c-rel" };

export interface Torcida {
  jogo: Jogo;
  /** chance no objetivo para mandante vence, empate, visitante vence (para queda já vem como "não cair") */
  se: [number, number, number];
  melhor: 0 | 1 | 2;
  peso: number;
  proprio: boolean;
}

/** Jogos das duas próximas rodadas que mais mexem no objetivo do clube, do que mais pesa ao que menos pesa. */
export function torcidaDoClube(clube: string, obj: ObjetivoJogo, rodadas = 2): Torcida[] {
  const res = sims.real;
  if (!res?.porJogo) return [];
  const i = posicao(clube);
  const alvo = new Set(rodadasAbertas.slice(0, rodadas));
  const porId = new Map(res.porJogo.map((E) => [E.id, E]));
  return restantes
    .filter((g) => alvo.has(g.rodada) && !adiado(g))
    .map((g) => {
      const E = porId.get(g.id);
      if (!E) return null;
      let se = condicional(E, i, obj);
      if (obj === "r") se = se.map((x) => 1 - x) as [number, number, number];
      const melhor = se.indexOf(Math.max(...se)) as 0 | 1 | 2;
      return { jogo: g, se, melhor, peso: Math.max(...se) - Math.min(...se), proprio: g.mandante === clube || g.visitante === clube };
    })
    .filter((x): x is Torcida => !!x && x.peso >= 0.003)
    // jogos do próprio clube primeiro, por data; os outros, do que mais pesa ao que menos pesa
    .sort((a, b) => Number(b.proprio) - Number(a.proprio) || (a.proprio ? porData(a.jogo, b.jogo) : b.peso - a.peso || porData(a.jogo, b.jogo)));
}

/** Objetivos ainda em aberto (entre 1% e 99%). */
export function objetivosAbertos(clube: string): ObjetivoJogo[] {
  const res = sims.real;
  if (!res) return [];
  const ch = chancesDaLinha(res.pos[posicao(clube)]);
  return (["c", "l", "r"] as const).filter((o) => ch[o] >= 0.01 && ch[o] <= 0.99);
}

const res = (g: Jogo, k: 0 | 1 | 2) => (k === 1 ? "empate" : `vitória do ${k === 0 ? g.mandante : g.visitante}`);

export function telaTorcida(clube: string): Html {
  if (!sims.real) return calculando();
  const objs = objetivosAbertos(clube);
  if (!objs.length) return vazio(`Nada mais em aberto para o ${clube}: as chances já estão definidas.`);
  return html`<div class="coluna">${objs.map((obj) => {
    const lista = torcidaDoClube(clube, obj);
    const base = chancesDaLinha(sims.real!.pos[posicao(clube)])[obj];
    const atual = obj === "r" ? 1 - base : base;
    return html`<section class="tsec"><h3>Para ${NOME[obj]}</h3>
      <p class="note">Hoje: ${pct(atual)}${obj === "r" ? " de ficar na Série A" : ""}. Nos jogos das próximas rodadas${proximaRodada ? ` (a partir da ${proximaRodada}ª)` : ""}, o resultado que mais ajuda:</p>
      ${lista.length
        ? html`<ul class="torcida">${lista.map((t) => {
            const g = t.jogo;
            const pior = t.se.indexOf(Math.min(...t.se));
            return html`<li class="${t.proprio ? "proprio" : ""}">
              <div class="quando">${dataJogo(g.data, g.semHora)}${t.proprio ? " · jogo do " + clube : ""}</div>
              <div class="t-jogo">${escudo(g.mandante, 18)}<a href="${linkClube(g.mandante)}">${g.mandante}</a> x <a href="${linkClube(g.visitante)}">${g.visitante}</a>${escudo(g.visitante, 18)}</div>
              <div class="t-reco">Melhor: <b>${res(g, t.melhor)}</b>, <b class="${TOM[obj]}">${pct(t.se[t.melhor])}</b>
                <span class="dim">· pior: ${res(g, pior as 0 | 1 | 2)}, ${pct(t.se[pior])}</span></div>
            </li>`;
          })}</ul>`
        : vazio("Nenhum jogo das próximas rodadas mexe nisso.")}
    </section>`;
  })}
  <p class="note">Chance do ${clube} em cada resultado, nos campeonatos simulados em que aquele jogo terminou assim. O resto do campeonato continua sorteado.</p></div>`;
}
