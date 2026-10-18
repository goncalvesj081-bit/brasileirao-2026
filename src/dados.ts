// Dados do campeonato e tudo que se calcula direto deles (sem simulação).

import resultadosJson from "../data/resultados.json";
import jogosJson from "../data/jogos.json";
import historicoJson from "../data/historico.json";
import pessoasJson from "../data/pessoas.json";
import metaJson from "../data/meta.json";
import escudosJson from "../data/escudos.json";
import copasJson from "../data/copas.json";
import cartoesJson from "../data/cartoes.json";
import publicoJson from "../data/publico.json";
import { CLUBES } from "../config/clubes";
import { classificacao } from "./modelo/classificacao";
import type { Copas } from "./modelo/copas";
import { chaveDosResultados } from "./modelo/historico";
import { ehAdiado, inicioDasRodadas } from "./modelo/rodadas";
import type { EntradaHistorico, Jogo, Linha, Meta, Pessoas, Resultado } from "./modelo/tipos";

export const resultados = resultadosJson.jogos as Resultado[];
export const restantes = jogosJson.jogos as Jogo[];
export const historico = historicoJson as unknown as EntradaHistorico[];
export const pessoas = pessoasJson as unknown as Pessoas;
export const meta = metaJson as Meta;
export const escudos = escudosJson as Record<string, string>;
export const copas = copasJson as unknown as Copas;
/** [jogador, clube, amarelos, vermelhos, situação] */
export const cartoes = cartoesJson as unknown as { atualizado: string; lista: [string, string, number, number, "suspenso" | "pendurado" | ""][] };
/** [público, mandante, placar, visitante, estádio, data, rodada] */
type LinhaPublico = [number, string, string, string, string, string, number];
export const publico = publicoJson as unknown as { atualizado: string; maiores: LinhaPublico[]; menores: LinhaPublico[] };

export const nomesClubes = CLUBES.map((c) => c.nome);
export const tabela: Linha[] = classificacao(nomesClubes, resultados);
export const posicao = (clube: string) => tabela.findIndex((t) => t.clube === clube);
export const linhaDe = (clube: string) => tabela.find((t) => t.clube === clube)!;

/** Semente da simulação real: com os mesmos resultados, os mesmos números. */
export const sementeReal = parseInt(chaveDosResultados(resultados).split("-").pop()!, 16);

/** Chave estável de um jogo para guardar placares do usuário (não muda se o id da fonte mudar). */
export const confronto = (g: Jogo) => `${g.mandante}|${g.visitante}`;

const adiadosSet = new Set(restantes.filter((g) => ehAdiado(g, resultados, restantes)).map(confronto));
export const adiado = (g: Jogo) => adiadosSet.has(confronto(g));
export const jogosAdiados = restantes.filter(adiado);

/** Rodadas com jogo por disputar, sem contar os adiados. */
export const rodadasAbertas = [...new Set(restantes.filter((g) => !adiado(g)).map((g) => g.rodada))].sort((a, b) => a - b);
export const proximaRodada = rodadasAbertas[0] ?? null;

/** Todas as rodadas que ainda têm algum jogo (inclusive adiado), para a tela da rodada. */
export const rodadasComJogo = [...new Set(restantes.map((g) => g.rodada))].sort((a, b) => a - b);

const inicio = inicioDasRodadas([...resultados, ...restantes]);
/** Ordena jogos restantes por data; sem data vai para o fim. */
export function porData(a: Jogo, b: Jogo): number {
  const ta = a.data ? Date.parse(a.data) : (inicio.get(a.rodada) ?? 0) + 1e13;
  const tb = b.data ? Date.parse(b.data) : (inicio.get(b.rodada) ?? 0) + 1e13;
  return ta - tb || a.mandante.localeCompare(b.mandante, "pt");
}

export function rotuloRodada(r: number): string {
  return `${r}ª rodada`;
}

/** Linha de situação: "31ª rodada: faltam 5 jogos" ou "Próxima: 32ª rodada". */
export function situacao(): string {
  if (proximaRodada == null) return restantes.length ? "Só faltam jogos adiados" : "Campeonato encerrado";
  const faltam = restantes.filter((g) => g.rodada === proximaRodada && !adiado(g)).length;
  const jogados = resultados.filter((r) => r.rodada === proximaRodada).length;
  return jogados ? `${proximaRodada}ª rodada: falta${faltam > 1 ? "m" : ""} ${faltam} jogo${faltam > 1 ? "s" : ""}` : `Próxima: ${proximaRodada}ª rodada`;
}
