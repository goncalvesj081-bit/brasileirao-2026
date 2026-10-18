/** Jogo da tabela. `data` em ISO (UTC) ou null quando ainda não tem data. */
export interface Jogo {
  id: string;
  rodada: number;
  mandante: string;
  visitante: string;
  data: string | null;
  /** dia definido, horário ainda não */
  semHora?: boolean;
}

export interface Resultado extends Jogo {
  gm: number;
  gv: number;
}

export interface Linha {
  clube: string;
  p: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
}

export type Placar = [number, number];

/** Chances de um clube: campeão, Libertadores (com pré), Sul-Americana e rebaixamento. */
export interface Chances {
  c: number;
  l: number;
  s: number;
  r: number;
}

export interface PontoHistorico extends Chances {
  pos: number;
  pts: number;
}

export interface EntradaHistorico {
  rodada: number;
  /** último instante considerado (ISO) ou null quando os dados não tinham data */
  ate: string | null;
  chave: string;
  probs: Record<string, PontoHistorico>;
}

export interface Meta {
  atualizado: string;
  aoVivo: boolean;
  fonte: string;
}

export interface Pessoas {
  artilharia: { atualizado: string; fonte: string; lista: [string, string, number][] };
  assistencias: { atualizado: string; fonte: string; lista: [string, string, number][] };
  /** lista: clube → [técnico, no cargo desde]; api: último nome visto na API (para detectar trocas) */
  tecnicos: { atualizado: string; fonte: string; lista: Record<string, [string, string]>; api?: Record<string, string> };
  /** [clube, saiu, motivo, data, entrou] */
  trocas: { atualizado: string; lista: [string, string, string, string, string][] };
  destaques: {
    atualizado: string;
    porClube: Record<string, { art: [string, number][]; ast: [string, number][]; obs?: string }>;
  };
}
