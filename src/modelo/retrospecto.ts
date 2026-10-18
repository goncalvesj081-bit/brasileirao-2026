// Retrospecto de um confronto: jogos das temporadas passadas (data/retrospecto.json) e desta.

import type { Resultado } from "./tipos";

/** [ano, data ISO, mandante, visitante, gols mandante, gols visitante] */
export type JogoAntigo = [number, string, string, string, number, number];

export interface Retrospecto {
  jogos: JogoAntigo[];
  /** do ponto de vista do clube `a` */
  v: number;
  e: number;
  d: number;
}

export function retrospecto(a: string, b: string, antigos: JogoAntigo[], atuais: Resultado[], ano: number): Retrospecto {
  const deste = atuais
    .filter((g) => (g.mandante === a && g.visitante === b) || (g.mandante === b && g.visitante === a))
    .map((g): JogoAntigo => [ano, g.data ?? "", g.mandante, g.visitante, g.gm, g.gv]);
  const jogos = [...antigos.filter(([, , m, v]) => (m === a && v === b) || (m === b && v === a)), ...deste].sort((x, y) => x[1].localeCompare(y[1]));
  let v = 0,
    e = 0,
    d = 0;
  for (const [, , m, , gm, gv] of jogos) {
    const [pro, contra] = m === a ? [gm, gv] : [gv, gm];
    if (pro > contra) v++;
    else if (pro === contra) e++;
    else d++;
  }
  return { jogos, v, e, d };
}
