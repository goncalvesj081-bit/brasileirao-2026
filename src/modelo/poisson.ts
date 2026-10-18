export function poisson(l: number, k: number): number {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
}

/** Probabilidade de vitória do mandante, empate e vitória do visitante. */
export function probResultado(lm: number, lv: number): [number, number, number] {
  let H = 0,
    D = 0,
    A = 0;
  for (let i = 0; i <= 10; i++) {
    const pi = poisson(lm, i);
    for (let j = 0; j <= 10; j++) {
      const p = pi * poisson(lv, j);
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
