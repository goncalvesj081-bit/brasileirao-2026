// "Para quem torcer": nos jogos que faltam, qual resultado mais ajuda o clube no objetivo em aberto.
// Usa o efeito de cada jogo guardado pela simulação (chance do clube em cada resultado).

import { adiado, porData, posicao, proximaRodada, restantes, rodadasAbertas } from "../dados";
import { sims } from "../estado";
import { condicional, significativo, type ObjetivoJogo } from "../modelo/impacto";
import { chancesDaLinha, chancesSim } from "../modelo/simular";
import type { Jogo } from "../modelo/tipos";
import { calculando, escudo, linkClube, vazio } from "../ui/componentes";
import { dataJogo, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

const MINIMO = 0.015;
/** Uma casa decimal: perto de 90% as diferenças são pequenas e "90%" e "90%" não dizem nada. */
const pct1 = pct;
const pontos = (d: number) => `${(d * 100).toFixed(1).replace(".", ",")} ponto${Math.abs(d * 100) >= 1.95 ? "s" : ""}`;

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
      const peso = Math.max(...se) - Math.min(...se);
      return { jogo: g, se, melhor, peso, proprio: g.mandante === clube || g.visitante === clube, real: peso >= MINIMO && significativo(E, se) };
    })
    // só os jogos cuja diferença vai além do acaso da simulação (e os do próprio clube)
    .filter((x): x is Torcida & { real: boolean } => !!x && (x.proprio || x.real))
    .sort((a, b) => porData(a.jogo, b.jogo));
}

/** Chance no objetivo pela mesma conta dos efeitos por jogo (Libertadores pela posição, com o corte descendo pelas copas). */
function chanceNoObjetivo(clube: string, obj: ObjetivoJogo): number {
  const res = sims.real!;
  const i = posicao(clube);
  return obj === "l" ? res.posLib[i] : chancesDaLinha(res.pos[i])[obj];
}

/** Objetivos ainda em aberto (entre 1% e 99%). */
export function objetivosAbertos(clube: string): ObjetivoJogo[] {
  if (!sims.real) return [];
  return (["c", "l", "r"] as const).filter((o) => {
    const p = chanceNoObjetivo(clube, o);
    return p >= 0.01 && p <= 0.99;
  });
}

const NOME_OBJ: Record<ObjetivoJogo, string> = { c: "o título", l: "a Libertadores", r: "a queda" };

/** Nenhum objetivo entre 1% e 99%: diz se a matemática já fechou tudo ou se ainda falta confirmar algo. */
function semNadaEmAberto(clube: string): string {
  const res = sims.real!;
  const i = posicao(clube);
  const ch = chancesSim(res, i);
  const m = res.certezas;
  const faltam = (["c", "l", "r"] as const).filter((o) => m && !m[o].garantido[i] && m[o].possivel[i]);
  if (!faltam.length) return `Nada mais em aberto para o ${clube}: a matemática já definiu tudo.`;
  const lista = faltam.map((o) => `${NOME_OBJ[o]} (${pct(ch[o])})`).join(", ").replace(/, ([^,]*)$/, " e $1");
  return `Nenhum jogo muda de forma visível as chances do ${clube}, mas ainda não está tudo confirmado pela matemática: ${lista}.`;
}

const res = (g: Jogo, k: 0 | 1 | 2) => (k === 1 ? "empate" : `vitória do ${k === 0 ? g.mandante : g.visitante}`);

export function telaTorcida(clube: string): Html {
  if (!sims.real) return calculando();
  const objs = objetivosAbertos(clube);
  if (!objs.length) return vazio(semNadaEmAberto(clube));
  return html`<div class="coluna">${objs.map((obj) => {
    const lista = torcidaDoClube(clube, obj);
    const base = chanceNoObjetivo(clube, obj);
    const atual = obj === "r" ? 1 - base : base;
    return html`<section class="tsec"><h3>Para ${NOME[obj]}</h3>
      <p class="note">Hoje: ${pct1(atual)}${obj === "r" ? " de ficar na Série A" : ""}. Jogos das próximas rodadas${proximaRodada ? ` (a partir da ${proximaRodada}ª)` : ""} que mudam essa chance de verdade, além do acaso da simulação (e os do próprio clube), por data:</p>
      ${lista.length
        ? html`<ul class="torcida">${lista.map((t) => {
            const g = t.jogo;
            const pior = t.se.indexOf(Math.min(...t.se));
            return html`<li class="${t.proprio ? "proprio" : ""}">
              <div class="quando">${dataJogo(g.data, g.semHora)}${t.proprio ? " · jogo do " + clube : ""}</div>
              <div class="t-jogo">${escudo(g.mandante, 18)}<a href="${linkClube(g.mandante)}">${g.mandante}</a> x <a href="${linkClube(g.visitante)}">${g.visitante}</a>${escudo(g.visitante, 18)}</div>
              <div class="t-reco">Melhor: <b>${res(g, t.melhor)}</b>, <b class="${TOM[obj]}">${pct1(t.se[t.melhor])}</b>
                <span class="dim">· pior: ${res(g, pior as 0 | 1 | 2)}, ${pct1(t.se[pior])} · diferença de ${pontos(t.peso)}</span></div>
            </li>`;
          })}</ul>`
        : vazio("Nenhum jogo das próximas rodadas muda essa chance além do acaso da simulação: o resultado dos outros quase não importa.")}
    </section>`;
  })}
  <p class="note">Chance do ${clube} em cada resultado, nos campeonatos simulados em que aquele jogo terminou assim. O resto do campeonato continua sorteado.</p></div>`;
}
