// Cartões da Série A pela API pública da ESPN (detalhes de cada jogo encerrado) e quem está
// pendurado ou suspenso. Regra da CBF: 3 amarelos ou 1 vermelho = fora do jogo seguinte do time.

import { clubePorNomeApi } from "../../config/clubes";

export interface EspnJogoCartoes {
  id: string;
  date: string;
  status: { type: { completed?: boolean; name: string } };
  competitions: {
    competitors: { team: { id: string; displayName: string } }[];
    details?: { yellowCard?: boolean; redCard?: boolean; team?: { id: string }; athletesInvolved?: { id: string; displayName: string }[] }[];
  }[];
}

/** [jogador, clube, amarelos, vermelhos, situação] */
export type LinhaCartoes = [string, string, number, number, "suspenso" | "pendurado" | ""];

export function calcularCartoes(eventos: EspnJogoCartoes[]): LinhaCartoes[] {
  const vistos = new Set<string>();
  const jogos = eventos
    .filter((e) => !vistos.has(e.id) && vistos.add(e.id) && (e.status.type.completed || /FULL_TIME|FINAL/.test(e.status.type.name)))
    .sort((a, b) => a.date.localeCompare(b.date));
  // jogos de cada clube, em ordem, e cartões de cada jogador em cada jogo
  const jogosDoClube = new Map<string, string[]>();
  const porJogador = new Map<string, { nome: string; clube: string; cart: Map<string, { a: number; v: number }> }>();
  for (const e of jogos) {
    const c = e.competitions[0];
    const nomes = new Map(c.competitors.map((x) => [x.team.id, clubePorNomeApi(x.team.displayName)?.nome]));
    for (const n of nomes.values()) if (n) jogosDoClube.set(n, [...(jogosDoClube.get(n) ?? []), e.id]);
    for (const d of c.details ?? []) {
      if (!d.yellowCard && !d.redCard) continue;
      const clube = nomes.get(d.team?.id ?? "");
      const at = d.athletesInvolved?.[0];
      if (!clube || !at) continue;
      const k = `${at.id}|${clube}`;
      const j = porJogador.get(k) ?? { nome: at.displayName, clube, cart: new Map() };
      const nesse = j.cart.get(e.id) ?? { a: 0, v: 0 };
      if (d.redCard) nesse.v++;
      else nesse.a++;
      j.cart.set(e.id, nesse);
      porJogador.set(k, j);
    }
  }
  const linhas: LinhaCartoes[] = [];
  for (const j of porJogador.values()) {
    const seq = jogosDoClube.get(j.clube) ?? [];
    let amarelos = 0,
      vermelhos = 0,
      suspensoApos: string | null = null;
    for (const id of seq) {
      const c = j.cart.get(id);
      if (!c) continue;
      if (c.v) {
        // os amarelos que viraram vermelho no mesmo jogo não entram na conta
        vermelhos += c.v;
        suspensoApos = id;
      } else if (c.a) {
        const antes = amarelos;
        amarelos += c.a;
        if (Math.floor(amarelos / 3) > Math.floor(antes / 3)) suspensoApos = id;
      }
    }
    const ultimo = seq[seq.length - 1];
    const situacao = suspensoApos && suspensoApos === ultimo ? "suspenso" : amarelos % 3 === 2 ? "pendurado" : "";
    linhas.push([j.nome, j.clube, amarelos, vermelhos, situacao]);
  }
  return linhas.sort((a, b) => b[2] + 3 * b[3] - (a[2] + 3 * a[3]) || a[0].localeCompare(b[0], "pt"));
}

export async function buscarCartoes(ano: number): Promise<LinhaCartoes[]> {
  const eventos: EspnJogoCartoes[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${ano}${String(m).padStart(2, "0")}&limit=500`, {
      headers: { "User-Agent": "brasileirao-2026-site" },
    });
    if (!r.ok) throw new Error(`ESPN cartões, mês ${m}: HTTP ${r.status}`);
    eventos.push(...(((await r.json()) as { events?: EspnJogoCartoes[] }).events ?? []));
  }
  const linhas = calcularCartoes(eventos);
  if (linhas.length < 50) throw new Error(`só ${linhas.length} jogadores com cartão`);
  return linhas;
}
