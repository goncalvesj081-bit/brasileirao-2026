import { bolao } from "../config/bolao";
import { clubePorSlug } from "../config/clubes";

export interface Secao {
  id: string;
  rotulo: string;
  vistas: [string, string][];
  /** no celular, fica dentro de "Mais" em vez de ter aba própria embaixo */
  emMais?: boolean;
  /** fora da navegação (só por link) */
  oculta?: boolean;
}

export const SECOES: Secao[] = [
  {
    id: "tabela",
    rotulo: "Tabela",
    vistas: [
      ["geral", "Geral"],
      ["ultimas-10", "Últimos 10"],
      ["mandante", "Em casa"],
      ["visitante", "Fora"],
    ],
  },
  { id: "jogos", rotulo: "Jogos", vistas: [] },
  {
    id: "chances",
    rotulo: "Chances",
    // sem o bolão, Chances volta para a barra de baixo do celular
    emMais: bolao.visivel,
    vistas: [
      ["campeao", "Título"],
      ["libertadores", "Libertadores"],
      ["sul-americana", "Sul-Americana"],
      ["rebaixamento", "Queda"],
      ["posicoes", "Posição final"],
      ["pontos", "Pontos necessários"],
      ["restante", "Tabela que falta"],
      ["vagas", "Vagas e copas"],
      ["acerto", "Acerto do modelo"],
    ],
  },
  {
    id: "simular",
    rotulo: "Simular",
    vistas: [
      ["jogos", "Palpites"],
      ["resultado", "Resultado"],
      ["analise", "Análise"],
      ["computador", "Computador"],
    ],
  },
  {
    id: "bolao",
    rotulo: "Bolão",
    oculta: !bolao.visivel,
    vistas: [
      ["palpites", "Palpites"],
      ["ranking", "Ranking"],
      ["regras", "Regulamento"],
    ],
  },
  {
    id: "numeros",
    rotulo: "Números",
    emMais: true,
    vistas: [
      ["artilharia", "Gols e assistências"],
      ["cartoes", "Cartões"],
      ["gols", "Ataque e defesa"],
      ["sequencias", "Sequências"],
      ["tecnicos", "Técnicos"],
      ["publico", "Público"],
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
  { id: "comparar", rotulo: "Comparar times", emMais: true, oculta: true, vistas: [] },
  { id: "sobre", rotulo: "Como calculamos", emMais: true, oculta: true, vistas: [] },
  { id: "mais", rotulo: "Mais", oculta: true, vistas: [] },
];

export const ABAS_CLUBE: [string, string][] = [
  ["resumo", "Resumo"],
  ["torcida", "Para quem torcer"],
  ["jogos", "Jogos"],
  ["rodada-a-rodada", "Evolução"],
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
  estatisticas: (a) =>
    a === "restante" ? "#/chances/restante" : `#/numeros/${a === "ataque" || a === "defesa" ? "gols" : a === "publico" ? "publico" : "sequencias"}`,
  pessoas: (a) => `#/numeros/${a === "trocas" ? "tecnicos" : a === "assistencias" ? "artilharia" : a || "artilharia"}`,
};
/** Vistas que saíram de uma seção que continua existindo. */
const VISTAS_ANTIGAS: Record<string, string> = {
  "tabela/turno": ROTA_INICIAL,
  "tabela/returno": ROTA_INICIAL,
  "chances/resumo": ROTA_INICIAL,
  "simular/tabela": "#/simular/resultado",
  "simular/chances": "#/simular/resultado",
};

export function redirecionamento(hash = location.hash): string | null {
  const [s = "", a = "", b = ""] = hash.replace(/^#\/?/, "").split("/");
  if (ANTIGAS[s]) return ANTIGAS[s](a, b);
  if (s === "clube" && b === "destaques") return `#/clube/${a}`;
  return VISTAS_ANTIGAS[`${s}/${a}`] ?? null;
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
  if (secao === "bolao" && !bolao.visivel) return null;
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

/** Seção que fica acesa na barra lateral (o clube fica sob a Tabela). */
export const secaoAtiva = (r: Rota) => (r.secao === "clube" ? "tabela" : r.secao);

/** Seção que fica acesa na barra de baixo do celular. */
export function abaInferior(r: Rota): string {
  if (r.secao === "clube") return "tabela";
  return SECOES.find((s) => s.id === r.secao)?.emMais ? "mais" : r.secao;
}
