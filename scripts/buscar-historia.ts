// Monta data/historia.json com as temporadas da Série A desde 2003, pela Wikipédia (sem chave).
// Temporada passada não muda: roda à mão (npm run historia), quando um ano termina ou para corrigir algo.
// Se qualquer temporada falhar na validação, nada é gravado.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { temporada } from "../config/temporada";
import type { Historia, TemporadaHistoria } from "../src/modelo/historia";
import { conciliar, lerArtilheiros, lerConfrontosPt, lerResultados, lerTabela, tituloEn, tituloPt, validarTemporada, wikitexto } from "./lib/historia-wiki";

const PRIMEIRO = 2003;

/** O que a tabela sozinha não conta. */
const NOTAS: Record<number, string[]> = {
  2003: [
    "Primeiro Brasileirão por pontos corridos, com 24 clubes e 46 rodadas.",
    "O tribunal mudou pontos por escalação irregular: o Paysandu perdeu 8 e a Ponte Preta perdeu os de dois jogos; São Caetano, Corinthians, Fluminense, Internacional e Juventude ganharam pontos. Os placares são os de campo.",
  ],
  2004: ["24 clubes e 46 rodadas. A fonte não traz o placar de cada jogo desta edição: ela fica fora do retrospecto e das goleadas."],
  2005: [
    "22 clubes e 42 rodadas.",
    "Máfia do Apito: onze jogos apitados por Edílson Pereira de Carvalho foram anulados e disputados de novo. Os placares são os dos jogos que valeram.",
  ],
  2006: ["Primeira edição com 20 clubes e 38 rodadas, o formato que vale até hoje."],
  2013: ["Flamengo e Portuguesa perderam 4 pontos cada no tribunal por escalação irregular na última rodada; com isso a Portuguesa caiu e o Fluminense ficou."],
  2016: [
    "Chapecoense x Atlético-MG, da última rodada, não foi disputado por causa do acidente aéreo da Chapecoense; os dois times ficaram com derrota por 3 a 0. O jogo não aparece entre os placares.",
  ],
};
NOTAS[2004].push("O São Caetano perdeu 24 pontos no tribunal pela morte do zagueiro Serginho em campo, por ter deixado o jogador atuar sabendo do problema cardíaco.");

/**
 * Erros de digitação na tabela da Wikipédia em inglês, conferidos na versão em português (que fecha com os placares).
 * [v, e, d, gp, gc]
 */
const TABELA_CORRIGIDA: Record<number, Record<string, [number, number, number, number, number]>> = {
  2006: { Figueirense: [15, 12, 11, 52, 44] },
  2007: { Paraná: [11, 8, 19, 42, 64] },
};

/**
 * Clubes cujos placares não fecham com a tabela final mesmo depois de conferir as duas Wikipédias
 * (as duas têm o mesmo erro, ou o jogo não foi disputado). A tabela final vale como oficial.
 */
const CONFRONTOS_DIFEREM: Record<number, string[]> = {
  2003: ["Paraná", "Athletico-PR", "Vasco", "Fluminense"],
  2007: ["Cruzeiro", "Botafogo", "Internacional", "Figueirense", "Náutico", "Paraná"],
  2008: ["Figueirense", "Ipatinga"],
  2012: ["Flamengo"],
  2016: ["Atlético-MG", "Chapecoense"],
};
const notaDiferem = (clubes: string[]) =>
  `Na fonte, alguns placares de ${clubes.join(", ").replace(/, ([^,]*)$/, " e $1")} não batem exatamente com a tabela final (diferença de um gol ou de um resultado). A tabela final é a oficial.`;

/** Tenta ler; se a página não tiver aquele bloco (ou vier em outro formato), devolve null. */
function talvez<T>(f: () => T): T | null {
  try {
    return f();
  } catch {
    return null;
  }
}

/** Correções feitas ao conciliar as duas Wikipédias, para conferir no fim. */
const correcoes: string[] = [];

async function temporadaDe(ano: number): Promise<TemporadaHistoria> {
  const en = await wikitexto("en", tituloEn(ano));
  const pt = await wikitexto("pt", tituloPt(ano)).catch(() => "");
  const clubes = lerTabela(en, ano).length;
  const rodadas = 2 * (clubes - 1);
  const tabelaPt = talvez(() => lerTabela(pt, ano));
  const confrontosPt = talvez(() => lerResultados(pt, ano) ?? lerConfrontosPt(pt, ano));
  const confrontosEn = lerResultados(en, ano);
  let tabela = lerTabela(en, ano);
  for (const l of tabela) {
    const certo = TABELA_CORRIGIDA[ano]?.[l[0]];
    if (certo) l.splice(1, 5, ...certo);
  }
  let confrontos = confrontosEn ?? confrontosPt;
  const corrigidos: string[] = [];
  if (confrontos) {
    const c = conciliar(tabela, confrontos, { tabela: tabelaPt, jogos: confrontosEn ? confrontosPt : null }, rodadas, ano);
    ({ tabela, jogos: confrontos } = c);
    corrigidos.push(...c.correcoes.map((x) => x.replace(/^\d+: /, "")));
    correcoes.push(...c.correcoes);
  }
  let artilheiros = lerArtilheiros(en, ano);
  if (!artilheiros.length) artilheiros = lerArtilheiros(pt, ano);
  const nomes = tabela.map((l) => l[0]);
  const indice = (c: string) => {
    const i = nomes.indexOf(c);
    if (i < 0) throw new Error(`${ano}: ${c} está nos confrontos mas não na tabela`);
    return i;
  };
  return {
    ano,
    formato: { clubes, rodadas },
    tabela,
    jogos: confrontos?.map(([m, v, gm, gv]) => [indice(m), indice(v), gm, gv]) ?? null,
    artilheiros,
    notas: [...(NOTAS[ano] ?? []), ...(CONFRONTOS_DIFEREM[ano] && ano !== 2016 ? [notaDiferem(CONFRONTOS_DIFEREM[ano])] : [])],
    ...(CONFRONTOS_DIFEREM[ano] ? { confrontosDiferem: true } : {}),
    ...(corrigidos.length ? { correcoes: corrigidos } : {}),
  };
}

const temporadas: TemporadaHistoria[] = [];
const erros: string[] = [];
for (let ano = PRIMEIRO; ano < temporada.ano; ano++) {
  try {
    const t = await temporadaDe(ano);
    erros.push(...validarTemporada(t, CONFRONTOS_DIFEREM[ano]));
    temporadas.push(t);
    const ajustes = t.tabela.filter((l) => l[6]).map((l) => `${l[0]} ${l[6] > 0 ? "+" : ""}${l[6]}`);
    console.log(
      `${ano}: campeão ${t.tabela[0][0]}, ${t.jogos?.length ?? "sem"} confrontos, artilheiro ${t.artilheiros[0]?.join(" ") ?? "?"}${ajustes.length ? `, ajustes: ${ajustes.join(", ")}` : ""}`,
    );
  } catch (e) {
    erros.push((e as Error).message);
  }
}

if (correcoes.length) console.log(`\nCorreções:\n- ${correcoes.join("\n- ")}`);

if (erros.length) {
  console.error(`\nNada gravado. Problemas:\n- ${erros.join("\n- ")}`);
  process.exit(1);
}

const historia: Historia = { atualizado: new Date().toISOString().slice(0, 10), temporadas };
writeFileSync(join(import.meta.dirname, "..", "data", "historia.json"), JSON.stringify(historia) + "\n");
console.log(`\ndata/historia.json: ${temporadas.length} temporadas (${PRIMEIRO}–${temporada.ano - 1}).`);
