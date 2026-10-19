import { clubePorSlug } from "../config/clubes";

export interface Secao {
  id: string;
  rotulo: string;
  vistas: [string, string][];
  /** na barra de baixo do celular, cai em "Mais" */
  emMais?: boolean;
}

export const SECOES: Secao[] = [
  {
    id: "tabela",
    rotulo: "Tabela",
    vistas: [
      ["geral", "Geral"],
      ["ultimas-10", "Últimos 10 jogos"],
      ["mandante", "Mandante"],
      ["visitante", "Visitante"],
      ["turno", "Turno"],
      ["returno", "Returno"],
    ],
  },
  {
    id: "chances",
    rotulo: "Chances",
    vistas: [
      ["resumo", "Resumo"],
      ["vagas", "Vagas"],
      ["campeao", "Título"],
      ["libertadores", "Libertadores"],
      ["sul-americana", "Sul-Americana"],
      ["rebaixamento", "Queda"],
      ["posicoes", "Posições"],
      ["pontos", "Por pontos"],
      ["acerto", "Acerto do modelo"],
    ],
  },
  { id: "jogos", rotulo: "Jogos", vistas: [] },
  {
    id: "simular",
    rotulo: "Simular",
    vistas: [
      ["jogos", "Jogos"],
      ["tabela", "Tabela"],
      ["chances", "Chances"],
      ["analise", "Análise"],
    ],
  },
  {
    id: "bolao",
    rotulo: "Bolão",
    emMais: true,
    vistas: [
      ["palpites", "Palpites"],
      ["ranking", "Ranking"],
      ["regras", "Regulamento"],
    ],
  },
  {
    id: "serie-b",
    rotulo: "Série B",
    emMais: true,
    vistas: [
      ["tabela", "Tabela"],
      ["chances", "Chances"],
      ["jogos", "Jogos"],
      ["simular", "Simular"],
    ],
  },
  {
    id: "estatisticas",
    rotulo: "Estatísticas",
    emMais: true,
    vistas: [
      ["vitorias", "Vitórias seguidas"],
      ["invencibilidade", "Invencibilidade"],
      ["derrotas", "Derrotas seguidas"],
      ["sem-vitorias", "Sem vencer"],
      ["ataque", "Ataque"],
      ["defesa", "Defesa"],
      ["restante", "Tabela que falta"],
      ["publico", "Público"],
    ],
  },
  {
    id: "pessoas",
    rotulo: "Jogadores e técnicos",
    emMais: true,
    vistas: [
      ["artilharia", "Artilharia"],
      ["assistencias", "Assistências"],
      ["cartoes", "Cartões"],
      ["tecnicos", "Técnicos"],
      ["trocas", "Trocas"],
    ],
  },
  { id: "comparar", rotulo: "Comparar times", emMais: true, vistas: [] },
  { id: "sobre", rotulo: "Como calculamos", emMais: true, vistas: [] },
  { id: "mais", rotulo: "Mais", vistas: [] },
];

export const ABAS_CLUBE: [string, string][] = [
  ["resumo", "Resumo"],
  ["rodada-a-rodada", "Rodada a rodada"],
  ["jogos", "Jogos"],
  ["torcida", "Para quem torcer"],
  ["destaques", "Destaques"],
];

export interface Rota {
  secao: string;
  vista: string;
  /** terceiro pedaço do endereço: rodada (#/jogos/32) ou objetivo (#/chances/pontos/libertadores) */
  extra: string;
  numero: number | null;
  clube?: string;
}

export const ROTA_INICIAL = "#/tabela/geral";

/** Endereços da primeira versão do site, para links já compartilhados continuarem funcionando. */
const ANTIGAS: Record<string, (a: string, b: string) => string> = {
  simulador: (a) => `#/simular/jogos${a ? "/" + a : ""}`,
  classificacao: (a) => `#/tabela/${a === "ultimas-10" ? a : a || "geral"}`,
  rodada: (_, b) => `#/jogos${b ? "/" + b : ""}`,
  pontuacao: (a) => `#/chances/pontos/${a || "campeao"}`,
};

export function redirecionamento(hash = location.hash): string | null {
  const [s = "", a = "", b = ""] = hash.replace(/^#\/?/, "").split("/");
  return ANTIGAS[s] ? ANTIGAS[s](a, b) : null;
}

/** Lê o endereço; devolve null quando não é uma rota conhecida. */
export function lerRota(hash = location.hash): Rota | null {
  const [secao = "", a = "", b = ""] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const num = (x: string) => (/^\d+$/.test(x) ? +x : null);
  if (secao === "clube") {
    const c = clubePorSlug(a);
    if (!c) return null;
    const aba = ABAS_CLUBE.some(([k]) => k === b) ? b : "resumo";
    return { secao, vista: aba, extra: "", numero: null, clube: c.nome };
  }
  if (secao === "serie-b" && a === "clube") return { secao, vista: "clube", extra: b, numero: null };
  if (secao === "comparar") {
    const A = clubePorSlug(a)?.nome ?? "",
      B = clubePorSlug(b)?.nome ?? "";
    return { secao, vista: A, extra: B, numero: null };
  }
  const s = SECOES.find((x) => x.id === secao);
  if (!s) {
    // endereço curto: #/corinthians (ou #/corinthians/jogos)
    const c = clubePorSlug(secao);
    if (!c) return null;
    const aba = ABAS_CLUBE.some(([k]) => k === a) ? a : "resumo";
    return { secao: "clube", vista: aba, extra: "", numero: null, clube: c.nome };
  }
  if (!s.vistas.length) return { secao, vista: "", extra: a, numero: num(a) };
  const vista = s.vistas.some(([k]) => k === a) ? a : s.vistas[0][0];
  return { secao, vista, extra: b, numero: num(b) };
}

export const link = (...partes: (string | number)[]) => "#/" + partes.map((p) => encodeURIComponent(String(p))).join("/");

export function tituloDa(r: Rota): string {
  if (r.clube) return r.clube;
  return SECOES.find((s) => s.id === r.secao)?.rotulo ?? "";
}

/** Seção que fica acesa na barra de baixo do celular. */
export function abaInferior(r: Rota): string {
  if (r.secao === "clube") return "tabela";
  return SECOES.find((s) => s.id === r.secao)?.emMais ? "mais" : r.secao;
}
