import { temporada } from "../../config/temporada";
import type { Jogo, Resultado } from "./tipos";

const DIA = 86_400_000;

/** Data do primeiro jogo de cada rodada (considerando disputados e restantes). */
export function inicioDasRodadas(todos: Jogo[]): Map<number, number> {
  const ini = new Map<number, number>();
  for (const g of todos) {
    if (!g.data) continue;
    const t = Date.parse(g.data);
    const atual = ini.get(g.rodada);
    if (atual === undefined || t < atual) ini.set(g.rodada, t);
  }
  return ini;
}

/** Jogo fora da janela normal da sua rodada: sem data, ou mais de `diasAdiado` depois do primeiro jogo da rodada. */
function foraDaJanela(g: Jogo, inicio: Map<number, number>): boolean {
  if (!g.data) return true;
  const ini = inicio.get(g.rodada);
  return ini !== undefined && Date.parse(g.data) - ini > temporada.diasAdiado * DIA;
}

/** Maior rodada com algum jogo disputado. */
export function ultimaRodadaComJogo(resultados: Resultado[]): number {
  return resultados.reduce((m, r) => Math.max(m, r.rodada), 0);
}

/**
 * Jogo restante considerado adiado: é de uma rodada anterior à última que já começou
 * e está fora da janela normal dela (sem data ou bem depois dos outros jogos).
 */
export function ehAdiado(g: Jogo, resultados: Resultado[], restantes: Jogo[]): boolean {
  const ultima = ultimaRodadaComJogo(resultados);
  if (g.rodada >= ultima) return false;
  return foraDaJanela(g, inicioDasRodadas([...resultados, ...restantes]));
}

/** Rodadas encerradas para o histórico: todos os jogos foram disputados, exceto os adiados. */
export function rodadasEncerradas(resultados: Resultado[], restantes: Jogo[]): number[] {
  const ultima = ultimaRodadaComJogo(resultados);
  const inicio = inicioDasRodadas([...resultados, ...restantes]);
  const abertas = new Set<number>();
  for (const g of restantes) {
    // jogo da última rodada que começou ainda segura a rodada aberta, mesmo sem data
    const adiado = g.rodada < ultima && foraDaJanela(g, inicio);
    if (!adiado) abertas.add(g.rodada);
  }
  const rodadas = [...new Set(resultados.map((r) => r.rodada))].sort((a, b) => a - b);
  return rodadas.filter((r) => !abertas.has(r));
}

/**
 * Resultados que existiam quando a rodada R terminou.
 * Com datas: tudo disputado até o último jogo da rodada R dentro da janela normal (jogos adiados
 * da própria rodada R, disputados depois, ficam de fora; jogos de outras rodadas antecipados entram).
 * Sem datas (dados antigos): jogos das rodadas 1 a R.
 */
export function resultadosAteRodada(R: number, resultados: Resultado[], restantes: Jogo[]): { ate: string | null; lista: Resultado[] } {
  const inicio = inicioDasRodadas([...resultados, ...restantes]);
  const daRodada = resultados.filter((r) => r.rodada === R && !foraDaJanela(r, inicio));
  const datas = daRodada.map((r) => r.data).filter((d): d is string => !!d);
  if (!datas.length || datas.length < daRodada.length) {
    return { ate: null, lista: resultados.filter((r) => r.rodada <= R) };
  }
  const ate = datas.reduce((m, d) => (d > m ? d : m));
  const corte = Date.parse(ate);
  const lista = resultados.filter((r) => (r.data ? Date.parse(r.data) <= corte : r.rodada <= R));
  return { ate, lista };
}
