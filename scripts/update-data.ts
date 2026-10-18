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
import { api, type ApiArtilheiro, type ApiLinha, type ApiPartida, type ApiTime } from "./lib/api";
import { atualizarArtilharia, criarTradutor, dataBR, normalizarPartidas, normalizarTabela } from "./lib/normalizar";
import { buscarAssistencias, buscarTecnicos } from "./lib/pessoas-auto";
import { buscarCopas } from "./lib/copas-espn";
import type { Copas } from "../src/modelo/copas";

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
    console.warn(`Aviso: ${o} indisponível (${(e as Error).message}). Mantendo os dados anteriores.`);
    return null;
  }
}

async function main() {
  // tira espaços e quebras de linha que às vezes vêm junto ao colar a chave
  const chave = process.env.FOOTBALL_DATA_KEY?.trim();
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
    // limite alto: todos os que marcaram, para a lista de cada clube ficar completa
    api<{ scorers: ApiArtilheiro[] }>(`/competitions/${C}/scorers?season=${ano}&limit=500`, chave).then((r) => r.scorers),
  );
  // só para os escudos
  const times = await opcional("times", () => api<{ teams: ApiTime[] }>(`/competitions/${C}/teams?season=${ano}`, chave).then((r) => r.teams));
  // técnicos e trocas pela Wikipédia; assistências pela ESPN (a football-data só traz as de quem marcou)
  const tecnicos = await opcional("técnicos (Wikipédia)", () => buscarTecnicos(ano, pessoasAtual?.tecnicos.lista));
  const assistencias = await opcional("assistências (ESPN)", buscarAssistencias);

  const tradutor = criarTradutor();
  const { resultados, restantes, aoVivo } = normalizarPartidas(matches, tradutor.nome);
  const total = standings.find((s) => s.type === "TOTAL")?.table ?? [];
  const oficial = normalizarTabela(total, tradutor.nome);
  let pessoas = pessoasAtual ? atualizarArtilharia(pessoasAtual, artilheiros, tradutor.nome) : null;
  if (pessoas) {
    // a data só muda quando a lista muda, senão o arquivo seria regravado a cada execução
    const hoje = dataBR(new Date());
    const bloco = <L>(antes: { atualizado: string; fonte: string; lista: L }, lista: L, fonte: string) =>
      JSON.stringify(antes.lista) === JSON.stringify(lista) && antes.fonte === fonte ? antes : { atualizado: hoje, fonte, lista };
    if (tecnicos)
      pessoas = {
        ...pessoas,
        tecnicos: bloco(pessoas.tecnicos, tecnicos.lista, "Wikipédia (en)"),
        trocas: bloco(pessoas.trocas, tecnicos.trocas, "Wikipédia (en)"),
      };
    if (assistencias) pessoas = { ...pessoas, assistencias: bloco(pessoas.assistencias, assistencias, "ESPN") };
  }
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
  // escudos: só https e só de clubes conhecidos; se a API não trouxer, mantém os que já existem
  const escudos = { ...ler<Record<string, string>>("escudos.json", {}) };
  for (const t of times ?? []) if (t.crest?.startsWith("https://")) escudos[tradutor.nome(t)] = t.crest;
  novos["escudos.json"] = json(Object.fromEntries(Object.entries(escudos).filter(([c]) => clubes.includes(c)).sort()));

  // copas (ESPN, sem chave): se falhar, mantém o arquivo anterior; a data só muda quando o conteúdo muda
  try {
    const copas = await buscarCopas(ano);
    const anterior = ler<Copas | null>("copas.json", null);
    const semData = (c: Copas | null) => (c ? JSON.stringify({ ...c, atualizado: "" }) : "");
    if (semData(copas) !== semData(anterior)) {
      novos["copas.json"] = json(copas);
      console.log("Copas atualizadas.");
    }
  } catch (e) {
    console.warn(`Aviso: copas não atualizadas (${(e as Error).message}). Mantendo data/copas.json.`);
  }

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
