// "Quanto falta": com quantos pontos finais um clube chega a uma chance-alvo de um objetivo.

/** [vezes, campeão, Libertadores, Sul-Americana, rebaixado] por pontuação final do clube */
export type ObjetivosPorPontos = Record<number, [number, number, number, number, number]>;

export type Objetivo = "titulo" | "libertadores" | "sulAmericana" | "fugir";
const COLUNA: Record<Objetivo, 1 | 2 | 3 | 4> = { titulo: 1, libertadores: 2, sulAmericana: 3, fugir: 4 };

export interface Meta {
  /** pontos finais que bastam (nas simulações) para a chance-alvo */
  pontos: number;
  /** pontos que faltam somar a partir de agora */
  faltam: number;
  jogos: number;
  /** chance quando termina exatamente com esses pontos */
  chance: number;
}

export type Resposta =
  | { tipo: "meta"; meta: Meta }
  | { tipo: "garantido" } // com os pontos de hoje já atinge a chance-alvo
  | { tipo: "nao-alcanca"; chanceMaxima: number }; // nem vencendo tudo chega lá

/**
 * Menor pontuação final a partir da qual a chance do objetivo fica sempre ≥ alvo
 * (para "fugir", o risco de queda fica sempre ≤ 1 − alvo). Pontuações com poucas
 * simulações (menos de `minimo`) são ignoradas, porque a porcentagem fica instável.
 */
export function quantoFalta(
  dados: ObjetivosPorPontos,
  objetivo: Objetivo,
  alvo: number,
  pontosAtuais: number,
  jogosRestantes: number,
  minimo = 30,
): Resposta {
  const col = COLUNA[objetivo];
  const taxa = (b: [number, number, number, number, number]) => (objetivo === "fugir" ? 1 - b[col] / b[0] : b[col] / b[0]);
  const linhas = Object.entries(dados)
    .map(([p, b]) => ({ p: +p, n: b[0], t: taxa(b) }))
    .filter((l) => l.n >= minimo)
    .sort((a, b) => b.p - a.p);
  if (!linhas.length) return { tipo: "nao-alcanca", chanceMaxima: 0 };

  // anda de cima para baixo enquanto a chance continuar acima do alvo
  let ok: (typeof linhas)[number] | null = null;
  for (const l of linhas) {
    if (l.t >= alvo) ok = l;
    else break;
  }
  if (!ok) return { tipo: "nao-alcanca", chanceMaxima: linhas[0].t };
  if (ok.p <= pontosAtuais) return { tipo: "garantido" };
  return { tipo: "meta", meta: { pontos: ok.p, faltam: ok.p - pontosAtuais, jogos: jogosRestantes, chance: ok.t } };
}

/** "4 vitórias e 1 empate" para k pontos (o jeito mais curto de somar k). */
export function comoSomar(k: number): string {
  const v = Math.floor(k / 3),
    e = k % 3;
  const vit = v ? `${v} vitória${v > 1 ? "s" : ""}` : "";
  const emp = e ? `${e} empate${e > 1 ? "s" : ""}` : "";
  return [vit, emp].filter(Boolean).join(" e ");
}
