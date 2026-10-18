import { clubePorNomeApi } from "../../config/clubes";
import type { Jogo, Linha, Pessoas, Resultado } from "../../src/modelo/tipos";
import type { ApiArtilheiro, ApiLinha, ApiPartida, ApiTime, ApiTimeCompleto } from "./api";

export class NomesDesconhecidos extends Error {}

/** Converte times da API para os nomes do site; junta todos os nomes que não bateram para um erro só. */
export function criarTradutor() {
  const faltando = new Set<string>();
  const nome = (t: ApiTime): string => {
    const c = clubePorNomeApi(t.name, t.shortName);
    if (c) return c.nome;
    faltando.add(`${t.name} (curto: ${t.shortName ?? "-"}, sigla: ${t.tla ?? "-"})`);
    return t.name;
  };
  const conferir = () => {
    if (faltando.size)
      throw new NomesDesconhecidos(
        `Clubes da API sem correspondência em config/clubes.ts: ${[...faltando].join("; ")}. Adicione uma chave ao clube certo.`,
      );
  };
  return { nome, conferir };
}

export interface Partidas {
  resultados: Resultado[];
  restantes: Jogo[];
  aoVivo: boolean;
}

export function normalizarPartidas(partidas: ApiPartida[], nome: (t: ApiTime) => string): Partidas {
  const resultados: Resultado[] = [];
  const restantes: Jogo[] = [];
  let aoVivo = false;
  for (const p of partidas) {
    if (p.status === "CANCELLED") continue; // a validação acusa os 38 jogos que faltarem
    if (p.matchday == null) throw new Error(`Partida ${p.id} sem rodada.`);
    const base: Jogo = {
      id: String(p.id),
      rodada: p.matchday,
      mandante: nome(p.homeTeam),
      visitante: nome(p.awayTeam),
      data: p.status === "POSTPONED" ? null : p.utcDate,
    };
    const { home, away } = p.score.fullTime;
    if ((p.status === "FINISHED" || p.status === "AWARDED") && home != null && away != null) {
      resultados.push({ ...base, data: p.utcDate, gm: home, gv: away });
    } else {
      if (p.status === "IN_PLAY" || p.status === "PAUSED") aoVivo = true;
      // SCHEDULED = dia marcado, horário ainda não confirmado (TIMED = confirmado)
      restantes.push(p.status === "SCHEDULED" && base.data ? { ...base, semHora: true } : base);
    }
  }
  const ordem = (a: Jogo, b: Jogo) => a.rodada - b.rodada || (a.data ?? "9").localeCompare(b.data ?? "9") || a.mandante.localeCompare(b.mandante, "pt");
  return { resultados: resultados.sort(ordem), restantes: restantes.sort(ordem), aoVivo };
}

export function normalizarTabela(linhas: ApiLinha[], nome: (t: ApiTime) => string): Linha[] {
  return linhas.map((l) => ({
    clube: nome(l.team),
    p: l.points,
    j: l.playedGames,
    v: l.won,
    e: l.draw,
    d: l.lost,
    gp: l.goalsFor,
    gc: l.goalsAgainst,
  }));
}

const dataBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/**
 * Atualiza artilharia, assistências e técnicos com o que a API trouxer. O que ela não trouxer
 * continua como estava no pessoas.json (edição manual). Troca de técnico detectada vira registro em `trocas`.
 */
export function atualizarPessoas(
  atual: Pessoas,
  artilheiros: ApiArtilheiro[] | null,
  times: ApiTimeCompleto[] | null,
  nome: (t: ApiTime) => string,
  agora = new Date(),
): Pessoas {
  const hoje = dataBR(agora);
  const p: Pessoas = structuredClone(atual);
  const fonte = "football-data.org";

  if (artilheiros?.length) {
    const gols = artilheiros.filter((a) => (a.goals ?? 0) > 0).map((a) => [a.player.name, nome(a.team), a.goals!] as [string, string, number]);
    if (gols.length) p.artilharia = { atualizado: hoje, fonte, lista: gols.sort((a, b) => b[2] - a[2]) };
    const ast = artilheiros.filter((a) => (a.assists ?? 0) > 0).map((a) => [a.player.name, nome(a.team), a.assists!] as [string, string, number]);
    // a lista de artilheiros só traz quem marcou; assistências dela são parciais, então só substitui se a manual estiver vazia
    if (ast.length && !p.assistencias.lista.length) p.assistencias = { atualizado: hoje, fonte: `${fonte} (só entre os artilheiros)`, lista: ast.sort((a, b) => b[2] - a[2]) };
  }

  // Técnicos: o nome exibido é o da edição manual ("Tite"); a API usa o nome completo ("Adenor Leonardo Bacchi").
  // Por isso guardamos o último nome visto na API e só registramos troca quando ELE muda.
  if (times?.length) {
    const lista = { ...p.tecnicos.lista };
    const vistos = { ...(p.tecnicos.api ?? {}) };
    let trocou = false;
    for (const t of times) {
      const tecnico = t.coach?.name?.trim();
      if (!tecnico) continue;
      const clube = nome(t);
      const visto = vistos[clube];
      vistos[clube] = tecnico;
      if (!visto && lista[clube]) continue; // primeira vez: só aprende o nome da API
      if (visto && mesmaPessoa(visto, tecnico)) continue;
      const inicio = t.coach?.contract?.start ? dataBR(new Date(t.coach.contract.start)) : hoje;
      if (lista[clube]) p.trocas = { atualizado: hoje, lista: [...p.trocas.lista, [clube, lista[clube][0], "", hoje, tecnico]] };
      lista[clube] = [tecnico, inicio];
      trocou = true;
    }
    p.tecnicos = { ...p.tecnicos, lista, api: vistos, ...(trocou ? { atualizado: hoje, fonte } : {}) };
  }
  return p;
}

const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e", "jr", "junior", "filho", "neto"]);

/** A API costuma usar o nome completo ("Abel Fernando Moreira Ferreira"); a edição manual, o nome conhecido ("Abel Ferreira"). */
export function mesmaPessoa(a: string, b: string): boolean {
  const partes = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !PARTICULAS.has(w));
  const A = partes(a),
    B = new Set(partes(b));
  if (!A.length || !B.size) return false;
  const comuns = A.filter((w) => B.has(w)).length;
  return comuns >= Math.min(2, A.length, B.size);
}
