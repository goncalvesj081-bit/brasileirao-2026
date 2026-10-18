// Copas que mexem nas vagas do Brasileirão: Copa do Brasil (campeão e vice vão à Libertadores),
// Libertadores e Sul-Americana (o campeão vai à próxima Libertadores). O estado de cada uma fica em
// data/copas.json; o que falta disputar é sorteado em cada simulação.

import { temporada } from "../../config/temporada";
import { sortearPoisson } from "./poisson";

export type Mando = "a" | "b" | "neutro";

/** Um confronto em andamento: `saldoA` é o saldo de gols de `a` nos jogos já disputados. */
export interface Confronto {
  a: string;
  b: string;
  saldoA: number;
  /** quem manda cada jogo que falta (vazio = confronto decidido pelo saldo) */
  faltam: Mando[];
  /** quando o confronto já acabou */
  vencedor?: string;
}

export interface Copa {
  nome: string;
  /** confrontos da fase atual, na ordem da chave: vencedor do 1º enfrenta o do 2º, e assim por diante */
  confrontos: Confronto[];
  /** a final (e as fases seguintes) é em jogo único em campo neutro? */
  finalUnica: boolean;
  campeao?: string;
  vice?: string;
}

export interface Copas {
  atualizado: string;
  copaDoBrasil: Copa;
  libertadores: Copa;
  sulAmericana: Copa;
}

// sem saber a força de times de fora do Brasileirão, cada time é tratado como médio
const MEDIA = temporada.modelo.mediaGolsPadrao;

function jogo(mando: Mando, rand: () => number): number {
  const la = MEDIA * (mando === "a" ? temporada.modelo.fatorCasa : mando === "b" ? temporada.modelo.fatorFora : 1);
  const lb = MEDIA * (mando === "b" ? temporada.modelo.fatorCasa : mando === "a" ? temporada.modelo.fatorFora : 1);
  return sortearPoisson(la, rand) - sortearPoisson(lb, rand);
}

/** Vencedor de um confronto: soma o saldo dos jogos que faltam; empate no agregado vai aos pênaltis (50%). */
export function decidir(c: Confronto, rand: () => number): string {
  if (c.vencedor) return c.vencedor;
  let saldo = c.saldoA;
  for (const m of c.faltam) saldo += jogo(m, rand);
  if (saldo > 0) return c.a;
  if (saldo < 0) return c.b;
  return rand() < 0.5 ? c.a : c.b;
}

/** Sorteia o que falta da copa e devolve campeão e vice. */
export function sortearCopa(copa: Copa, rand: () => number): { campeao: string; vice: string } | null {
  if (copa.campeao && copa.vice) return { campeao: copa.campeao, vice: copa.vice };
  if (!copa.confrontos.length) return null;
  // a fase atual já é a final
  if (copa.confrontos.length === 1) {
    const c = copa.confrontos[0];
    const campeao = decidir(c, rand);
    return { campeao, vice: campeao === c.a ? c.b : c.a };
  }
  let vivos = copa.confrontos.map((c) => decidir(c, rand));
  for (;;) {
    const final = vivos.length === 2;
    const prox: string[] = [];
    for (let i = 0; i + 1 < vivos.length; i += 2) {
      const a = vivos[i],
        b = vivos[i + 1];
      const faltam: Mando[] = final && copa.finalUnica ? ["neutro"] : ["a", "b"];
      const venc = decidir({ a, b, saldoA: 0, faltam }, rand);
      if (final) return { campeao: venc, vice: venc === a ? b : a };
      prox.push(venc);
    }
    vivos = prox;
  }
}

export interface Titulos {
  copaDoBrasil: { campeao: string; vice: string } | null;
  libertadores: string | null;
  sulAmericana: string | null;
}

export function sortearTitulos(copas: Copas, rand: () => number): Titulos {
  return {
    copaDoBrasil: sortearCopa(copas.copaDoBrasil, rand),
    libertadores: sortearCopa(copas.libertadores, rand)?.campeao ?? null,
    sulAmericana: sortearCopa(copas.sulAmericana, rand)?.campeao ?? null,
  };
}

export const VAGAS = {
  /** Brasileirão: 1º ao 4º na fase de grupos e 5º na pré */
  libertadoresLiga: 5,
  /** Copa do Brasil: campeão (grupos) e vice (pré) */
  libertadoresCopa: 2,
  sulAmericana: 6,
};

export interface Distribuicao {
  /** índices (na ordem final) de quem vai à Libertadores, por qualquer caminho */
  lib: Set<number>;
  sula: Set<number>;
  /** pior posição (0-based) que entrou na Libertadores pela tabela; -1 se nenhuma */
  corteLib: number;
  corteSula: number;
}

/**
 * Distribui as vagas a partir da ordem final (índices de clube, do 1º ao último) e dos títulos.
 * Regra: os classificados por título ficam com a vaga; as vagas que sobram (porque o time já estava
 * classificado por outro caminho, ou porque caiu para a Série B) descem para o melhor colocado ainda sem vaga.
 */
export function distribuirVagas(ordem: number[], titulos: Titulos, indice: (clube: string) => number | undefined, rebaixados: number): Distribuicao {
  const n = ordem.length;
  const posicao = new Map(ordem.map((c, p) => [c, p]));
  const caiu = (c: number) => (posicao.get(c) ?? 0) >= n - rebaixados;

  let total = VAGAS.libertadoresLiga;
  const porTitulo = new Set<number>();
  // campeões continentais: vaga própria, mesmo que caiam (regra da Conmebol)
  for (const c of [titulos.libertadores, titulos.sulAmericana]) {
    const i = c ? indice(c) : undefined;
    if (i === undefined) continue;
    total++;
    porTitulo.add(i);
  }
  // finalistas da Copa do Brasil: só se estiverem na Série A do ano seguinte; um finalista de fora
  // da Série A atual (que pode subir) fica com a vaga e ela não desce para a tabela
  for (const c of titulos.copaDoBrasil ? [titulos.copaDoBrasil.campeao, titulos.copaDoBrasil.vice] : []) {
    const i = indice(c);
    if (i === undefined) continue;
    total++;
    if (!caiu(i)) porTitulo.add(i);
  }

  const lib = new Set(porTitulo);
  let pelaTabela = total - porTitulo.size;
  let corteLib = -1;
  for (let p = 0; p < n && pelaTabela > 0; p++) {
    const c = ordem[p];
    if (lib.has(c) || caiu(c)) continue;
    lib.add(c);
    pelaTabela--;
    corteLib = p;
  }
  const sula = new Set<number>();
  let corteSula = -1;
  for (let p = 0; p < n && sula.size < VAGAS.sulAmericana; p++) {
    const c = ordem[p];
    if (lib.has(c) || caiu(c)) continue;
    sula.add(c);
    corteSula = p;
  }
  return { lib, sula, corteLib, corteSula };
}
