// Cliente mínimo da football-data.org (v4). Plano grátis: 10 requisições por minuto.

const BASE = "https://api.football-data.org/v4";

export interface ApiTime {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  /** endereço da imagem do escudo */
  crest?: string | null;
}

export interface ApiPartida {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED" | "AWARDED" | string;
  matchday: number | null;
  homeTeam: ApiTime;
  awayTeam: ApiTime;
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface ApiLinha {
  position: number;
  team: ApiTime;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ApiArtilheiro {
  player: { name: string };
  team: ApiTime;
  goals: number | null;
  assists: number | null;
}

export interface ApiTimeCompleto extends ApiTime {
  coach?: { name: string | null; contract?: { start?: string | null } } | null;
}

export class ErroApi extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T>(caminho: string, chave: string, tentativas = 3): Promise<T> {
  for (let t = 1; ; t++) {
    const r = await fetch(BASE + caminho, { headers: { "X-Auth-Token": chave } });
    if (r.ok) return (await r.json()) as T;
    if (r.status === 429 && t < tentativas) {
      const s = Number(r.headers.get("X-RequestCounter-Reset")) || 60;
      console.warn(`Limite da API atingido; esperando ${s}s.`);
      await espera((s + 1) * 1000);
      continue;
    }
    if (r.status >= 500 && t < tentativas) {
      await espera(5000 * t);
      continue;
    }
    throw new ErroApi(r.status, `${caminho}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
}
