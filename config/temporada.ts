// Tudo que muda de um ano para outro fica aqui.

export const temporada = {
  ano: 2026,
  competicao: "BSA",
  clubes: 20,
  rodadas: 38,
  turnoAte: 19,

  // Regra básica de 2026, pela tabela (1 = líder). As vagas da Copa do Brasil e dos campeões
  // continentais que sobram descem na tabela; isso é calculado em src/modelo/copas.ts.
  faixas: {
    libertadores: [1, 4], // fase de grupos
    preLibertadores: [5, 5],
    sulAmericana: [6, 11],
    rebaixamento: [17, 20],
  },

  modelo: {
    simulacoes: 20000,
    fatorCasa: 1.18,
    fatorFora: 0.85,
    // peso do próprio time = min(pesoMax, jogos / (jogos + jogosEncolhimento)); o resto vai para a média
    pesoMax: 0.6,
    jogosEncolhimento: 8,
    mediaGolsPadrao: 1.2,
    // correção de Dixon-Coles nos placares baixos (0x0, 1x0, 0x1, 1x1): o Poisson puro dá empates de menos.
    // -0,1 acerta a taxa de empates de 2026 (27,8% reais; o Poisson puro previa 24,9%) e melhora a previsão jogo a jogo
    rhoEmpates: -0.1,
    // muda este número se mudar o modelo: força o recálculo de todo o histórico
    versao: 3,
  },

  // jogo restante de rodada já passada, sem data ou marcado para depois disto, conta como adiado
  diasAdiado: 7,
} as const;

export type Faixa = keyof typeof temporada.faixas;

const f = temporada.faixas;
/** Quantidade de posições, contadas a partir do 1º, em cada corte (0-based exclusivo). */
export const CORTES = {
  libGrupos: f.libertadores[1],
  lib: f.preLibertadores[1],
  sula: f.sulAmericana[1],
  rebaixados: f.rebaixamento[1] - f.rebaixamento[0] + 1,
};

/** Faixa de uma posição 0-based. */
export function faixaDaPosicao(p: number, n: number = temporada.clubes): Faixa | null {
  if (p < CORTES.libGrupos) return "libertadores";
  if (p < CORTES.lib) return "preLibertadores";
  if (p < CORTES.sula) return "sulAmericana";
  if (p >= n - CORTES.rebaixados) return "rebaixamento";
  return null;
}
