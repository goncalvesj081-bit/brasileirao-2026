import { clubePorNomeApi } from "../../config/clubes";
import type { Jogo, Linha, Pessoas, Resultado } from "../../src/modelo/tipos";
import type { ApiArtilheiro, ApiLinha, ApiPartida, ApiTime } from "./api";

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
      if (p.status === "IN_PLAY" || p.status === "PAUSED") {
        aoVivo = true;
        const min = Number.parseInt(String(p.minute ?? ""), 10);
        base.aoVivo = { gm: home ?? 0, gv: away ?? 0, minuto: Number.isFinite(min) ? min : null };
      }
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

export const dataBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Artilharia pela football-data.org (todos os que marcaram). Sem lista nova, mantém a anterior. */
export function atualizarArtilharia(atual: Pessoas, artilheiros: ApiArtilheiro[] | null, nome: (t: ApiTime) => string, agora = new Date()): Pessoas {
  const gols = (artilheiros ?? []).filter((a) => (a.goals ?? 0) > 0).map((a) => [a.player.name, nome(a.team), a.goals!] as [string, string, number]);
  if (!gols.length) return atual;
  gols.sort((a, b) => b[2] - a[2]);
  if (JSON.stringify(gols) === JSON.stringify(atual.artilharia.lista)) return atual;
  return { ...atual, artilharia: { atualizado: dataBR(agora), fonte: "football-data.org", lista: gols } };
}
