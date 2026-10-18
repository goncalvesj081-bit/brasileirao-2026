import { clubePorSlug } from "../config/clubes";

export interface Secao {
  id: string;
  rotulo: string;
  grupo: "Simular" | "Chances" | "Campeonato";
  vistas: [string, string][];
}

export const SECOES: Secao[] = [
  { id: "simulador", rotulo: "Simulador", grupo: "Simular", vistas: [] },
  {
    id: "chances",
    rotulo: "Probabilidades por time",
    grupo: "Chances",
    vistas: [
      ["resumo", "Resumo"],
      ["campeao", "Campeão"],
      ["libertadores", "Libertadores"],
      ["sul-americana", "Sul-Americana"],
      ["rebaixamento", "Rebaixamento"],
      ["posicoes", "Todas as posições"],
    ],
  },
  {
    id: "pontuacao",
    rotulo: "Por pontuação",
    grupo: "Chances",
    vistas: [
      ["campeao", "Campeão"],
      ["libertadores", "Libertadores"],
      ["sul-americana", "Sul-Americana"],
      ["rebaixamento", "Rebaixamento"],
    ],
  },
  {
    id: "classificacao",
    rotulo: "Classificação",
    grupo: "Campeonato",
    vistas: [
      ["geral", "Geral"],
      ["ultimas-10", "Últimas 10 rodadas"],
      ["mandante", "Como mandante"],
      ["visitante", "Como visitante"],
      ["turno", "Turno"],
      ["returno", "Returno"],
    ],
  },
  {
    id: "rodada",
    rotulo: "Próxima rodada",
    grupo: "Campeonato",
    vistas: [
      ["tabela", "Tabela da rodada"],
      ["probabilidades", "Tabela de probabilidades"],
    ],
  },
  {
    id: "estatisticas",
    rotulo: "Estatísticas",
    grupo: "Campeonato",
    vistas: [
      ["vitorias", "Sequência de vitórias"],
      ["derrotas", "Sequência de derrotas"],
      ["invencibilidade", "Invencibilidade"],
      ["sem-vitorias", "Sem vitórias"],
      ["ataque", "Melhor ataque"],
      ["defesa", "Melhor defesa"],
    ],
  },
  {
    id: "pessoas",
    rotulo: "Jogadores e técnicos",
    grupo: "Campeonato",
    vistas: [
      ["artilharia", "Artilharia"],
      ["assistencias", "Assistências"],
      ["tecnicos", "Técnicos"],
      ["trocas", "Trocas de técnico"],
    ],
  },
];

export const ABAS_CLUBE: [string, string][] = [
  ["resumo", "Resumo"],
  ["rodada-a-rodada", "Rodada a rodada"],
  ["jogos", "Jogos"],
  ["destaques", "Destaques"],
];

export interface Rota {
  secao: string;
  vista: string;
  /** rodada escolhida (#/rodada/tabela/32, #/simulador/32) */
  numero: number | null;
  /** só na página do clube */
  clube?: string;
  aba?: string;
}

export const ROTA_INICIAL = "#/chances/resumo";

/** Lê o endereço; devolve null quando não é uma rota conhecida. */
export function lerRota(hash = location.hash): Rota | null {
  const [secao = "", a = "", b = ""] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (secao === "clube") {
    const c = clubePorSlug(a);
    if (!c) return null;
    const aba = ABAS_CLUBE.some(([k]) => k === b) ? b : "resumo";
    return { secao: "clube", clube: c.nome, aba, vista: "", numero: null };
  }
  const s = SECOES.find((x) => x.id === secao);
  if (!s) return null;
  if (!s.vistas.length) return { secao, vista: "", numero: a && /^\d+$/.test(a) ? +a : null };
  const vista = s.vistas.some(([k]) => k === a) ? a : s.vistas[0][0];
  return { secao, vista, numero: /^\d+$/.test(b) ? +b : null };
}

export const link = (...partes: (string | number)[]) => "#/" + partes.map((p) => encodeURIComponent(String(p))).join("/");

export function tituloDa(r: Rota): string {
  if (r.clube) return r.clube;
  return SECOES.find((s) => s.id === r.secao)?.rotulo ?? "";
}
