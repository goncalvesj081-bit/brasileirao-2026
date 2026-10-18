import { temporada } from "../../config/temporada";
import { classificacao } from "./classificacao";
import { criarRng, hash } from "./rng";
import { resultadosAteRodada, rodadasEncerradas } from "./rodadas";
import { chancesDaLinha, simular } from "./simular";
import type { EntradaHistorico, Jogo, Resultado } from "./tipos";

const confronto = (g: Jogo) => `${g.mandante}|${g.visitante}`;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** Identifica o conjunto de resultados usado numa entrada; se mudar, a entrada é recalculada. */
export function chaveDosResultados(lista: Resultado[]): string {
  const partes = lista.map((r) => `${confronto(r)}|${r.gm}|${r.gv}`).sort();
  return `v${temporada.modelo.versao}-${lista.length}-${hash(partes.join(";"))}`;
}

export function calcularEntrada(
  R: number,
  clubes: string[],
  resultados: Resultado[],
  restantes: Jogo[],
  n: number = temporada.modelo.simulacoes,
): EntradaHistorico {
  const { ate, lista } = resultadosAteRodada(R, resultados, restantes);
  const chave = chaveDosResultados(lista);
  const jaJogados = new Set(lista.map(confronto));
  const faltando = [...resultados, ...restantes].filter((g) => !jaJogados.has(confronto(g)));
  const tabela = classificacao(clubes, lista);
  const sim = simular({ tabela, restantes: faltando, n, rand: criarRng(parseInt(hash(chave), 16)) });
  const probs: EntradaHistorico["probs"] = {};
  tabela.forEach((t, i) => {
    const ch = chancesDaLinha(sim.pos[i]);
    probs[t.clube] = { c: r4(ch.c), l: r4(ch.l), s: r4(ch.s), r: r4(ch.r), pos: i + 1, pts: t.p };
  });
  return { rodada: R, ate, chave, probs };
}

/**
 * Mantém as entradas cuja chave ainda bate com os resultados e calcula as que faltam ou mudaram
 * (rodada nova, placar corrigido, jogo adiado que entrou numa rodada antiga).
 */
export function atualizarHistorico(
  atual: EntradaHistorico[],
  clubes: string[],
  resultados: Resultado[],
  restantes: Jogo[],
  n: number = temporada.modelo.simulacoes,
  aoCalcular?: (R: number) => void,
): { historico: EntradaHistorico[]; recalculadas: number[] } {
  const porRodada = new Map(atual.map((h) => [h.rodada, h]));
  const recalculadas: number[] = [];
  const historico = rodadasEncerradas(resultados, restantes).map((R) => {
    const velha = porRodada.get(R);
    const { lista } = resultadosAteRodada(R, resultados, restantes);
    if (velha && velha.chave === chaveDosResultados(lista)) return velha;
    aoCalcular?.(R);
    recalculadas.push(R);
    return calcularEntrada(R, clubes, resultados, restantes, n);
  });
  return { historico, recalculadas };
}
