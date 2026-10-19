// Bolão: pontos de cada palpite e ranking. Usado pelo site e pelo script que fecha as rodadas.

export const PONTOS = { exato: 10, saldo: 7, resultado: 5 } as const;

export interface Palpite {
  uid: string;
  jogo: string;
  gm: number;
  gv: number;
}

const sinal = (a: number, b: number) => Math.sign(a - b);

/** Placar exato 10; acertou o vencedor e o saldo 7; só o resultado (vencedor ou empate) 5; errou 0. */
export function pontosDoPalpite(p: { gm: number; gv: number }, r: { gm: number; gv: number }): number {
  if (p.gm === r.gm && p.gv === r.gv) return PONTOS.exato;
  if (sinal(p.gm, p.gv) !== sinal(r.gm, r.gv)) return 0;
  // empate não exato não tem "saldo" a acertar além do próprio empate
  if (r.gm !== r.gv && p.gm - p.gv === r.gm - r.gv) return PONTOS.saldo;
  return PONTOS.resultado;
}

/** Desempenho numa rodada: [pontos, placares exatos, acertos de saldo, palpites em jogos encerrados]. */
export type Desempenho = [number, number, number, number];

export interface LinhaRanking {
  uid: string;
  nome: string;
  foto: string;
  pontos: number;
  exatos: number;
  /** acertou vencedor e saldo, sem ser o placar exato */
  saldos: number;
  palpites: number;
  /** cadastro (ms desde 1970), último critério de desempate; 0 se desconhecido */
  desde: number;
  /** pontos por rodada (formato antigo, mantido para quem ainda tem o site velho aberto) */
  rodadas: Record<number, number>;
  /** desempenho por rodada, para montar o ranking de qualquer período */
  porRodada: Record<number, Desempenho>;
}

/**
 * Ordem do ranking: mais pontos, mais placares exatos, mais acertos de saldo, cadastro mais antigo, nome.
 * Ninguém é punido por palpitar em mais jogos.
 */
export function compararLinhas(
  a: Pick<LinhaRanking, "pontos" | "exatos" | "saldos" | "desde" | "nome">,
  b: Pick<LinhaRanking, "pontos" | "exatos" | "saldos" | "desde" | "nome">,
): number {
  return (
    b.pontos - a.pontos ||
    b.exatos - a.exatos ||
    b.saldos - a.saldos ||
    (a.desde || Infinity) - (b.desde || Infinity) ||
    a.nome.localeCompare(b.nome, "pt")
  );
}

/** Ranking pelos jogos já encerrados (a temporada inteira). */
export function montarRanking(
  palpites: Palpite[],
  resultados: { id: string; rodada: number; gm: number; gv: number }[],
  usuarios: Record<string, { nome: string; foto?: string; desde?: number }>,
): LinhaRanking[] {
  const res = new Map(resultados.map((r) => [r.id, r]));
  const por = new Map<string, LinhaRanking>();
  for (const p of palpites) {
    const r = res.get(p.jogo);
    if (!r) continue;
    const u = usuarios[p.uid];
    const l = por.get(p.uid) ?? {
      uid: p.uid,
      nome: u?.nome ?? "Sem nome",
      foto: u?.foto ?? "",
      pontos: 0,
      exatos: 0,
      saldos: 0,
      palpites: 0,
      desde: u?.desde ?? 0,
      rodadas: {},
      porRodada: {},
    };
    const pts = pontosDoPalpite(p, r);
    const d = (l.porRodada[r.rodada] ??= [0, 0, 0, 0]);
    d[0] += pts;
    d[3]++;
    l.pontos += pts;
    l.palpites++;
    if (pts === PONTOS.exato) (l.exatos++, d[1]++);
    if (pts === PONTOS.saldo) (l.saldos++, d[2]++);
    l.rodadas[r.rodada] = d[0];
    por.set(p.uid, l);
  }
  return [...por.values()].sort(compararLinhas);
}

/** Ranking de um período (uma rodada, um turno), a partir do ranking da temporada. Só entra quem palpitou nele. */
export function rankingDoPeriodo(linhas: LinhaRanking[], noPeriodo: (rodada: number) => boolean): LinhaRanking[] {
  const out: LinhaRanking[] = [];
  for (const l of linhas) {
    // ranking gravado no formato antigo: só os pontos por rodada
    const por: Record<number, Desempenho> = l.porRodada ?? Object.fromEntries(Object.entries(l.rodadas ?? {}).map(([r, p]) => [r, [p, 0, 0, 0]]));
    const soma: Desempenho = [0, 0, 0, 0];
    let jogou = false;
    for (const [r, d] of Object.entries(por)) {
      if (!noPeriodo(+r)) continue;
      jogou = true;
      for (let i = 0; i < 4; i++) soma[i] += d[i];
    }
    if (jogou) out.push({ ...l, pontos: soma[0], exatos: soma[1], saldos: soma[2], palpites: soma[3], desde: l.desde ?? 0 });
  }
  return out.sort(compararLinhas);
}
