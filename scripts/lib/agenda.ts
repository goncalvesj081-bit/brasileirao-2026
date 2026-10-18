import type { Jogo } from "../../src/modelo/tipos";

const diaBR = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Dia de jogo: algum jogo restante marcado para hoje (horário de Brasília), um jogo que já deveria
 * ter começado nas últimas 6 horas (pega os que passam da meia-noite) ou um jogo em andamento.
 */
export function ehDiaDeJogo(restantes: Jogo[], aoVivo: boolean, agora = Date.now()): boolean {
  if (aoVivo) return true;
  const hoje = diaBR(agora);
  return restantes.some((g) => {
    if (!g.data) return false;
    const t = Date.parse(g.data);
    return diaBR(t) === hoje || (t <= agora && agora - t < 6 * 3_600_000);
  });
}
