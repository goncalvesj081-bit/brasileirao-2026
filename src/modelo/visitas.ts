// Contagem anônima de visitas: um documento por dia em estatisticas/AAAA-MM-DD, só com números.
// Nada identifica a pessoa: o aparelho guarda só a data da última visita.

/** Contadores de um dia. `telas` conta as aberturas de cada seção do site. */
export interface Dia {
  /** aparelhos diferentes que abriram o site no dia */
  visitantes: number;
  /** aparelhos que abriram o site pela primeira vez */
  novos: number;
  /** vezes que o site foi aberto (cada carregamento da página) */
  acessos: number;
  celular: number;
  computador: number;
  /** abriram pelo app instalado na tela inicial */
  app: number;
  telas: Record<string, number>;
}

export const SECOES_CONTADAS = ["tabela", "jogos", "chances", "simular", "numeros", "serie-b", "clube", "comparar", "sobre", "mais"];

/** Data de Brasília no formato AAAA-MM-DD. */
export function diaDeBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Quais contadores sobem nesta abertura do site, a partir do que o aparelho lembra. */
export function incrementosDaAbertura(ultimoDia: string | null, hoje: string, celular: boolean, app: boolean): Record<string, number> {
  const inc: Record<string, number> = { acessos: 1 };
  if (ultimoDia !== hoje) {
    inc.visitantes = 1;
    inc[celular ? "celular" : "computador"] = 1;
    if (app) inc.app = 1;
    if (!ultimoDia) inc.novos = 1;
  }
  return inc;
}

/** Soma dos dias, para os totais de uma semana ou de um mês. */
export function somarDias(dias: Partial<Dia>[]): Dia {
  const t: Dia = { visitantes: 0, novos: 0, acessos: 0, celular: 0, computador: 0, app: 0, telas: {} };
  for (const d of dias) {
    for (const k of ["visitantes", "novos", "acessos", "celular", "computador", "app"] as const) t[k] += d[k] ?? 0;
    for (const [s, v] of Object.entries(d.telas ?? {})) t.telas[s] = (t.telas[s] ?? 0) + v;
  }
  return t;
}
