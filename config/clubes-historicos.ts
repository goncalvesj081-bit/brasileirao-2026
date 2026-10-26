// Todos os clubes que jogaram a Série A desde 2003 (pontos corridos), para a seção História.
// Os que estão na Série A atual usam o mesmo nome de config/clubes.ts (assim o link leva à página do clube).
// `padrao` reconhece o clube pelo nome na Wikipédia (artigo em inglês ou nome curto em português), já sem
// acento e em minúsculas. A ordem importa: o primeiro que bater vale ("américa mineiro" antes de "mineiro").

import { clube as clubeAtual, semAcento, slugTexto } from "./clubes";

export interface ClubeHistorico {
  nome: string;
  padrao: RegExp;
  cores: [string, string];
}

export const CLUBES_HISTORICOS: ClubeHistorico[] = [
  { nome: "América-MG", padrao: /\bamerica\b.*\b(mg|mineiro)\b/, cores: ["#00843d", "#111111"] },
  { nome: "América-RN", padrao: /\bamerica\b.*\b(rn|natal)\b/, cores: ["#c8102e", "#f2f2f2"] },
  { nome: "Atlético-GO", padrao: /\bgoianiense\b|\batletico go\b/, cores: ["#c8102e", "#111111"] },
  { nome: "Athletico-PR", padrao: /\bparanaense\b|\bathletico\b|\batletico pr\b/, cores: ["#c8102e", "#111111"] },
  { nome: "Atlético-MG", padrao: /\bmineiro\b|\batletico mg\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Avaí", padrao: /\bavai\b/, cores: ["#0057a8", "#f2f2f2"] },
  { nome: "Bahia", padrao: /\bbahia\b/, cores: ["#0057a8", "#e30613"] },
  { nome: "Grêmio Barueri", padrao: /\bbarueri\b/, cores: ["#e30613", "#ffd200"] },
  { nome: "Grêmio Prudente", padrao: /\bprudente\b/, cores: ["#e30613", "#ffd200"] },
  { nome: "Botafogo", padrao: /\bbotafogo\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Bragantino", padrao: /\bbragantino\b/, cores: ["#f2f2f2", "#d50032"] },
  { nome: "Brasiliense", padrao: /\bbrasiliense\b/, cores: ["#ffd200", "#00703c"] },
  { nome: "Ceará", padrao: /\bceara\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Chapecoense", padrao: /\bchapecoense\b/, cores: ["#00843d", "#f2f2f2"] },
  { nome: "Corinthians", padrao: /\bcorinthians\b/, cores: ["#f2f2f2", "#111111"] },
  { nome: "Coritiba", padrao: /\bcoritiba\b/, cores: ["#00544d", "#f2f2f2"] },
  { nome: "CSA", padrao: /\balagoano\b|^csa$/, cores: ["#0057a8", "#f2f2f2"] },
  { nome: "Criciúma", padrao: /\bcriciuma\b/, cores: ["#ffd200", "#111111"] },
  { nome: "Cruzeiro", padrao: /\bcruzeiro\b/, cores: ["#003da5", "#f2f2f2"] },
  { nome: "Cuiabá", padrao: /\bcuiaba\b/, cores: ["#00703c", "#ffd200"] },
  { nome: "Figueirense", padrao: /\bfigueirense\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Flamengo", padrao: /\bflamengo\b/, cores: ["#c4161c", "#111111"] },
  { nome: "Fluminense", padrao: /\bfluminense\b/, cores: ["#8a1538", "#00613c"] },
  { nome: "Fortaleza", padrao: /\bfortaleza\b/, cores: ["#c8102e", "#0057a8"] },
  { nome: "Goiás", padrao: /\bgoias\b/, cores: ["#00703c", "#f2f2f2"] },
  { nome: "Grêmio", padrao: /\bgremio\b/, cores: ["#0d80bf", "#111111"] },
  { nome: "Guarani", padrao: /\bguarani\b/, cores: ["#00703c", "#f2f2f2"] },
  { nome: "Internacional", padrao: /\binternacional\b/, cores: ["#e30613", "#f2f2f2"] },
  { nome: "Ipatinga", padrao: /\bipatinga\b/, cores: ["#0057a8", "#f2f2f2"] },
  { nome: "Joinville", padrao: /\bjoinville\b/, cores: ["#e30613", "#111111"] },
  { nome: "Juventude", padrao: /\bjuventude\b/, cores: ["#00703c", "#f2f2f2"] },
  { nome: "Mirassol", padrao: /\bmirassol\b/, cores: ["#ffd200", "#00703c"] },
  { nome: "Náutico", padrao: /\bnautico\b/, cores: ["#e30613", "#f2f2f2"] },
  { nome: "Palmeiras", padrao: /\bpalmeiras\b/, cores: ["#006437", "#f2f2f2"] },
  { nome: "Paysandu", padrao: /\bpaysandu\b/, cores: ["#0057a8", "#f2f2f2"] },
  { nome: "Ponte Preta", padrao: /\bponte preta\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Portuguesa", padrao: /\bportuguesa\b/, cores: ["#e30613", "#00703c"] },
  { nome: "Remo", padrao: /\bremo\b/, cores: ["#0b1f4b", "#f2f2f2"] },
  { nome: "Santa Cruz", padrao: /\bsanta cruz\b/, cores: ["#e30613", "#111111"] },
  { nome: "Santo André", padrao: /\bsanto andre\b/, cores: ["#0057a8", "#f2f2f2"] },
  // antes de São Paulo: o artigo do Santos é "Santos Futebol Clube (São Paulo)"
  { nome: "Santos", padrao: /\bsantos\b/, cores: ["#f2f2f2", "#111111"] },
  { nome: "São Caetano", padrao: /\bsao caetano\b/, cores: ["#0057a8", "#f2f2f2"] },
  { nome: "São Paulo", padrao: /\bsao paulo\b/, cores: ["#e30613", "#111111"] },
  { nome: "Vasco", padrao: /\bvasco\b/, cores: ["#111111", "#f2f2f2"] },
  { nome: "Vitória", padrao: /\bvitoria\b/, cores: ["#e30613", "#111111"] },
  // por último: "Sport Club" também está no nome do Corinthians, do Internacional e do Paysandu
  { nome: "Sport", padrao: /\brecife\b|^sport$/, cores: ["#e30613", "#111111"] },
  // Paraná Clube depois do Athletico ("paranaense") e do Santos ("Santos FC (São Paulo)" não tem "parana")
  { nome: "Paraná", padrao: /\bparana\b/, cores: ["#0057a8", "#e30613"] },
];

/** Clube pelo nome na Wikipédia ("Clube Atlético Paranaense", "CR Flamengo", "Atlético-MG"...). */
export function clubeHistorico(texto: string): ClubeHistorico | null {
  const t = semAcento(texto);
  return CLUBES_HISTORICOS.find((c) => c.padrao.test(t)) ?? null;
}

const POR_NOME = new Map(CLUBES_HISTORICOS.map((c) => [c.nome, c]));
const POR_SLUG = new Map(CLUBES_HISTORICOS.map((c) => [slugTexto(c.nome), c]));
export const clubeHistoricoPorSlug = (s: string) => POR_SLUG.get(s) ?? null;
export const coresHistoricas = (nome: string): [string, string] => POR_NOME.get(nome)?.cores ?? ["#6e757e", "#2b3037"];
/** Está na Série A atual (tem página de clube no site)? */
export const naSerieAAtual = (nome: string) => !!clubeAtual(nome);
