import type { Linha, Resultado } from "./tipos";

export function linhaVazia(clube: string): Linha {
  return { clube, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
}

export function somarJogo(l: Linha, pro: number, contra: number): void {
  l.j++;
  l.gp += pro;
  l.gc += contra;
  if (pro > contra) {
    l.p += 3;
    l.v++;
  } else if (pro === contra) {
    l.p++;
    l.e++;
  } else l.d++;
}

/** Critérios da CBF usados aqui: pontos, vitórias, saldo, gols pró. Depois, ordem alfabética só para a tela ficar estável. */
export function compararLinhas(a: Linha, b: Linha): number {
  return (
    b.p - a.p ||
    b.v - a.v ||
    b.gp - b.gc - (a.gp - a.gc) ||
    b.gp - a.gp ||
    a.clube.localeCompare(b.clube, "pt")
  );
}

export function ordenar(linhas: Linha[]): Linha[] {
  return linhas.sort(compararLinhas);
}

export type Lado = "m" | "v";

/**
 * Classificação a partir dos resultados. `filtro(jogo, lado)` decide se o jogo conta para
 * aquele lado (mandante ou visitante); sem filtro, conta tudo.
 */
export function classificacao(
  clubes: string[],
  resultados: Resultado[],
  filtro: (r: Resultado, lado: Lado) => boolean = () => true,
): Linha[] {
  const T = new Map(clubes.map((c) => [c, linhaVazia(c)]));
  const linha = (c: string) => {
    let l = T.get(c);
    if (!l) T.set(c, (l = linhaVazia(c)));
    return l;
  };
  for (const r of resultados) {
    if (filtro(r, "m")) somarJogo(linha(r.mandante), r.gm, r.gv);
    if (filtro(r, "v")) somarJogo(linha(r.visitante), r.gv, r.gm);
  }
  return ordenar([...T.values()]);
}

export type Res = "V" | "E" | "D";

export interface JogoDoClube {
  id: string;
  rodada: number;
  data: string | null;
  casa: boolean;
  adversario: string;
  pro: number;
  contra: number;
  res: Res;
}

/** Jogos disputados por um clube, na ordem em que aconteceram (data; sem data, pela rodada). */
export function jogosDoClube(clube: string, resultados: Resultado[]): JogoDoClube[] {
  return resultados
    .filter((r) => r.mandante === clube || r.visitante === clube)
    .sort(ordemCronologica)
    .map((r) => {
      const casa = r.mandante === clube;
      const pro = casa ? r.gm : r.gv;
      const contra = casa ? r.gv : r.gm;
      return {
        id: r.id,
        rodada: r.rodada,
        data: r.data,
        casa,
        adversario: casa ? r.visitante : r.mandante,
        pro,
        contra,
        res: pro > contra ? "V" : pro === contra ? "E" : "D",
      };
    });
}

export function ordemCronologica(a: { data: string | null; rodada: number }, b: { data: string | null; rodada: number }): number {
  if (a.data && b.data && a.data !== b.data) return a.data < b.data ? -1 : 1;
  return a.rodada - b.rodada;
}

/** Classificação considerando só os últimos `n` jogos de cada clube. */
export function classificacaoUltimos(clubes: string[], resultados: Resultado[], n: number): Linha[] {
  return ordenar(
    clubes.map((c) => {
      const l = linhaVazia(c);
      for (const g of jogosDoClube(c, resultados).slice(-n)) somarJogo(l, g.pro, g.contra);
      return l;
    }),
  );
}

export interface Sequencia {
  atual: number;
  maior: number;
  /** rodada em que a maior sequência terminou */
  maiorAte: number | null;
  /** rodada em que a sequência atual começou */
  atualDesde: number | null;
}

export function sequencia(jogos: JogoDoClube[], teste: (r: Res) => boolean): Sequencia {
  let corrida = 0,
    maior = 0,
    maiorAte: number | null = null;
  for (const g of jogos) {
    if (teste(g.res)) {
      corrida++;
      if (corrida > maior) {
        maior = corrida;
        maiorAte = g.rodada;
      }
    } else corrida = 0;
  }
  let atual = 0,
    atualDesde: number | null = null;
  for (let k = jogos.length - 1; k >= 0 && teste(jogos[k].res); k--) {
    atual++;
    atualDesde = jogos[k].rodada;
  }
  return { atual, maior, maiorAte, atualDesde };
}
