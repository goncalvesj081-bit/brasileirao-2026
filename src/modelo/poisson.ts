import { temporada } from "../../config/temporada";

export function poisson(l: number, k: number): number {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

const RHO = temporada.modelo.rhoEmpates;

/** Ajuste de Dixon-Coles: multiplica a chance dos placares baixos (com rho < 0, mais 0x0 e 1x1, menos 1x0 e 0x1). */
export function ajustePlacar(i: number, j: number, lm: number, lv: number, rho = RHO): number {
  if (i > 1 || j > 1) return 1;
  if (i === 0 && j === 0) return 1 - lm * lv * rho;
  if (i === 0) return 1 + lm * rho;
  if (j === 0) return 1 + lv * rho;
  return 1 - rho;
}

/** Probabilidade de vitória do mandante, empate e vitória do visitante. */
export function probResultado(lm: number, lv: number): [number, number, number] {
  let H = 0,
    D = 0,
    A = 0;
  for (let i = 0; i <= 10; i++) {
    const pi = poisson(lm, i);
    for (let j = 0; j <= 10; j++) {
      const p = pi * poisson(lv, j) * ajustePlacar(i, j, lm, lv);
      if (i > j) H += p;
      else if (i === j) D += p;
      else A += p;
    }
  }
  const s = H + D + A;
  return [H / s, D / s, A / s];
}

/** Sorteia um número de gols (método de Knuth; bom para médias pequenas como as do futebol). */
export function sortearPoisson(l: number, rand: () => number): number {
  const L = Math.exp(-l);
  let k = 0,
    p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

/** Igual a sortearPoisson, recebendo e^(-l) já calculado (mais rápido dentro do laço da simulação). */
export function sortearPoissonExp(expMenosL: number, rand: () => number): number {
  let k = 0,
    p = 1;
  do {
    k++;
    p *= rand();
  } while (p > expMenosL);
  return k - 1;
}

/**
 * Sorteia um placar com o ajuste de Dixon-Coles (por rejeição: sorteia os dois Poisson e aceita com
 * chance proporcional ao ajuste). `em` e `ev` são e^(-lm) e e^(-lv), já calculados.
 */
export function sortearPlacar(lm: number, lv: number, em: number, ev: number, rand: () => number): [number, number] {
  // média inválida (liga ainda sem gols): sem ajuste, para o laço abaixo nunca travar
  if (!(lm >= 0 && lv >= 0)) return [sortearPoissonExp(em, rand), sortearPoissonExp(ev, rand)];
  const teto = Math.max(1, 1 - lm * lv * RHO, 1 - RHO, 1 + lm * RHO, 1 + lv * RHO);
  for (;;) {
    const a = sortearPoissonExp(em, rand),
      b = sortearPoissonExp(ev, rand);
    if (rand() * teto < ajustePlacar(a, b, lm, lv)) return [a, b];
  }
}
