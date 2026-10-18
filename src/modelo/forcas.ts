import { temporada } from "../../config/temporada";
import type { Linha } from "./tipos";

export interface Forcas {
  media: number;
  ataque: Map<string, number>;
  defesa: Map<string, number>;
}

const M = temporada.modelo;

/** Peso dado ao desempenho do próprio time; o resto puxa para a média da liga. */
export function pesoDoTime(jogos: number): number {
  return Math.min(M.pesoMax, jogos / (jogos + M.jogosEncolhimento));
}

/** Força de ataque (gols marcados por jogo) e de defesa (sofridos por jogo), relativas à média, com encolhimento. */
export function forcas(tabela: Linha[]): Forcas {
  const totJ = tabela.reduce((s, t) => s + t.j, 0);
  const totG = tabela.reduce((s, t) => s + t.gp, 0);
  const media = totJ ? totG / totJ : M.mediaGolsPadrao;
  const ataque = new Map<string, number>();
  const defesa = new Map<string, number>();
  for (const t of tabela) {
    const w = pesoDoTime(t.j);
    const j = Math.max(t.j, 1);
    ataque.set(t.clube, 1 + w * (t.gp / j / media - 1));
    defesa.set(t.clube, 1 + w * (t.gc / j / media - 1));
  }
  return { media, ataque, defesa };
}

/** Gols esperados de mandante e visitante. */
export function golsEsperados(F: Forcas, mandante: string, visitante: string): [number, number] {
  const a = (c: string) => F.ataque.get(c) ?? 1;
  const d = (c: string) => F.defesa.get(c) ?? 1;
  return [F.media * a(mandante) * d(visitante) * M.fatorCasa, F.media * a(visitante) * d(mandante) * M.fatorFora];
}
