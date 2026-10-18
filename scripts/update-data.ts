// Busca resultados, jogos restantes e classificação na football-data.org, valida e grava em data/.
// Uso: FOOTBALL_DATA_KEY=... npm run update-data
// Se a validação falhar, sai com erro e não grava nada.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLUBES } from "../config/clubes";
import { temporada } from "../config/temporada";
import { atualizarHistorico } from "../src/modelo/historico";
import type { EntradaHistorico, Jogo, Meta, Pessoas, Resultado } from "../src/modelo/tipos";
import { validarDados } from "../src/modelo/validar";
import { api, type ApiArtilheiro, type ApiLinha, type ApiPartida, type ApiTimeCompleto } from "./lib/api";
import { atualizarPessoas, criarTradutor, normalizarPartidas, normalizarTabela } from "./lib/normalizar";

const DIR = join(import.meta.dirname, "..", "data");
const arq = (n: string) => join(DIR, n);

function ler<T>(nome: string, padrao: T): T {
  const p = arq(nome);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : padrao;
}

const json = (x: unknown) => JSON.stringify(x, null, 1) + "\n";

async function opcional<T>(o: string, f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    console.warn(`Aviso: ${o} indisponível (${(e as Error).message}). Mantendo os dados manuais.`);
    return null;
  }
}

async function main() {
  const chave = process.env.FOOTBALL_DATA_KEY;
  if (!chave) {
    console.error("Defina FOOTBALL_DATA_KEY (no GitHub: Settings > Secrets and variables > Actions).");
    process.exit(1);
  }
  const { competicao: C, ano } = temporada;

  const anteriores = ler<{ jogos: Resultado[] }>("resultados.json", { jogos: [] }).jogos;
  const historicoAtual = ler<EntradaHistorico[]>("historico.json", []);
  const pessoasAtual = ler<Pessoas | null>("pessoas.json", null);
  const metaAtual = ler<Meta | null>("meta.json", null);

  console.log("Buscando partidas e classificação…");
  const { matches } = await api<{ matches: ApiPartida[] }>(`/competitions/${C}/matches?season=${ano}`, chave);
  const { standings } = await api<{ standings: { type: string; table: ApiLinha[] }[] }>(`/competitions/${C}/standings?season=${ano}`, chave);
  const artilheiros = await opcional("artilharia", () =>
    api<{ scorers: ApiArtilheiro[] }>(`/competitions/${C}/scorers?season=${ano}&limit=60`, chave).then((r) => r.scorers),
  );
  const times = await opcional("técnicos", () =>
    api<{ teams: ApiTimeCompleto[] }>(`/competitions/${C}/teams?season=${ano}`, chave).then((r) => r.teams),
  );

  const tradutor = criarTradutor();
  const { resultados, restantes, aoVivo } = normalizarPartidas(matches, tradutor.nome);
  const total = standings.find((s) => s.type === "TOTAL")?.table ?? [];
  const oficial = normalizarTabela(total, tradutor.nome);
  const pessoas = pessoasAtual ? atualizarPessoas(pessoasAtual, artilheiros, times, tradutor.nome) : null;
  tradutor.conferir();

  // A classificação da API às vezes demora alguns minutos para incluir um jogo recém-encerrado.
  // Se o número de jogos não bate, ela está atrasada: confere só 3V+E nela e segue com os jogos.
  const clubes = CLUBES.map((c) => c.nome);
  const jogosPorClube = new Map<string, number>();
  for (const r of resultados) for (const c of [r.mandante, r.visitante]) jogosPorClube.set(c, (jogosPorClube.get(c) ?? 0) + 1);
  const atrasada = oficial.some((o) => o.j !== (jogosPorClube.get(o.clube) ?? 0));
  if (atrasada) console.warn("Aviso: a classificação da API ainda não tem todos os jogos encerrados; conferindo só 3V+E nela.");

  const erros = validarDados({
    clubes,
    resultados,
    restantes,
    tabelaOficial: atrasada ? undefined : oficial,
    resultadosAnteriores: anteriores,
  });
  for (const o of oficial) if (o.p !== 3 * o.v + o.e) erros.push(`Tabela oficial, ${o.clube}: ${o.p} pontos ≠ 3×${o.v} + ${o.e}.`);
  if (oficial.length !== temporada.clubes) erros.push(`Classificação oficial com ${oficial.length} clubes.`);

  if (erros.length) {
    console.error(`\nDados NÃO gravados. ${erros.length} problema(s):`);
    for (const e of [...new Set(erros)]) console.error(" - " + e);
    process.exit(1);
  }

  console.log(`${resultados.length} jogos disputados, ${restantes.length} restantes${aoVivo ? ", jogo em andamento" : ""}.`);
  const { historico, recalculadas } = atualizarHistorico(historicoAtual, clubes, resultados, restantes, undefined, (R) =>
    process.stdout.write(`Histórico: rodada ${R}… `),
  );
  if (recalculadas.length) console.log(`\nHistórico recalculado: ${recalculadas.join(", ")}.`);

  const novos: Record<string, string> = {
    "resultados.json": json({ temporada: ano, jogos: resultados satisfies Resultado[] }),
    "jogos.json": json({ temporada: ano, jogos: restantes satisfies Jogo[] }),
    "historico.json": json(historico),
  };
  if (pessoas) novos["pessoas.json"] = json(pessoas);

  const mudaram = Object.keys(novos).filter((n) => !existsSync(arq(n)) || readFileSync(arq(n), "utf8") !== novos[n]);
  if (mudaram.length || metaAtual?.aoVivo !== aoVivo || !metaAtual) {
    const meta: Meta = { atualizado: new Date().toISOString(), aoVivo, fonte: "football-data.org" };
    novos["meta.json"] = json(meta);
    mudaram.push("meta.json");
  }
  if (!mudaram.length) {
    console.log("Nada mudou.");
    return;
  }
  // grava tudo em .tmp primeiro e só então troca, para nunca deixar a pasta pela metade
  for (const n of mudaram) writeFileSync(arq(n) + ".tmp", novos[n]);
  for (const n of mudaram) renameSync(arq(n) + ".tmp", arq(n));
  console.log(`Gravados: ${mudaram.join(", ")}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
