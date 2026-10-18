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

export interface LinhaRanking {
  uid: string;
  nome: string;
  foto: string;
  pontos: number;
  exatos: number;
  palpites: number;
  /** pontos por rodada */
  rodadas: Record<number, number>;
}

/** Ranking pelos jogos já encerrados. Desempate: mais placares exatos, depois menos palpites (acertou mais com menos), depois nome. */
export function montarRanking(
  palpites: Palpite[],
  resultados: { id: string; rodada: number; gm: number; gv: number }[],
  usuarios: Record<string, { nome: string; foto?: string }>,
): LinhaRanking[] {
  const res = new Map(resultados.map((r) => [r.id, r]));
  const por = new Map<string, LinhaRanking>();
  for (const p of palpites) {
    const r = res.get(p.jogo);
    if (!r) continue;
    const l = por.get(p.uid) ?? { uid: p.uid, nome: usuarios[p.uid]?.nome ?? "Sem nome", foto: usuarios[p.uid]?.foto ?? "", pontos: 0, exatos: 0, palpites: 0, rodadas: {} };
    const pts = pontosDoPalpite(p, r);
    l.pontos += pts;
    l.palpites++;
    if (pts === PONTOS.exato) l.exatos++;
    l.rodadas[r.rodada] = (l.rodadas[r.rodada] ?? 0) + pts;
    por.set(p.uid, l);
  }
  return [...por.values()].sort((a, b) => b.pontos - a.pontos || b.exatos - a.exatos || a.palpites - b.palpites || a.nome.localeCompare(b.nome, "pt"));
}
