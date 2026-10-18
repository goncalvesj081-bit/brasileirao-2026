// Clubes da Série A 2026. `nome` é o que aparece no site e nos JSON.
// `chaves` são palavras que identificam o clube no nome que a API usa (sem acento, minúsculas).
// Se a API trouxer um nome que não bate com nada, o script falha e diz qual nome adicionar aqui.

export interface Clube {
  nome: string;
  sigla: string;
  slug: string;
  chaves: string[];
}

export const CLUBES: Clube[] = [
  { nome: "Athletico-PR", sigla: "CAP", slug: "athletico-pr", chaves: ["paranaense", "athletico"] },
  { nome: "Atlético-MG", sigla: "CAM", slug: "atletico-mg", chaves: ["mineiro", "atletico mg"] },
  { nome: "Bahia", sigla: "BAH", slug: "bahia", chaves: ["bahia"] },
  { nome: "Botafogo", sigla: "BOT", slug: "botafogo", chaves: ["botafogo"] },
  { nome: "Bragantino", sigla: "RBB", slug: "bragantino", chaves: ["bragantino"] },
  { nome: "Chapecoense", sigla: "CHA", slug: "chapecoense", chaves: ["chapecoense"] },
  { nome: "Corinthians", sigla: "COR", slug: "corinthians", chaves: ["corinthians"] },
  { nome: "Coritiba", sigla: "CFC", slug: "coritiba", chaves: ["coritiba"] },
  { nome: "Cruzeiro", sigla: "CRU", slug: "cruzeiro", chaves: ["cruzeiro"] },
  { nome: "Flamengo", sigla: "FLA", slug: "flamengo", chaves: ["flamengo"] },
  { nome: "Fluminense", sigla: "FLU", slug: "fluminense", chaves: ["fluminense"] },
  { nome: "Grêmio", sigla: "GRE", slug: "gremio", chaves: ["gremio"] },
  { nome: "Internacional", sigla: "INT", slug: "internacional", chaves: ["internacional"] },
  { nome: "Mirassol", sigla: "MIR", slug: "mirassol", chaves: ["mirassol"] },
  { nome: "Palmeiras", sigla: "PAL", slug: "palmeiras", chaves: ["palmeiras"] },
  { nome: "Remo", sigla: "REM", slug: "remo", chaves: ["remo"] },
  { nome: "Santos", sigla: "SAN", slug: "santos", chaves: ["santos"] },
  { nome: "São Paulo", sigla: "SAO", slug: "sao-paulo", chaves: ["sao paulo"] },
  { nome: "Vasco", sigla: "VAS", slug: "vasco", chaves: ["vasco"] },
  { nome: "Vitória", sigla: "VIT", slug: "vitoria", chaves: ["vitoria"] },
];

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Encontra o clube pelo nome da API. Cada chave tem que aparecer como palavra(s) inteira(s). */
export function clubePorNomeApi(...nomes: (string | null | undefined)[]): Clube | null {
  const alvos = nomes.filter((n): n is string => !!n).map((n) => ` ${semAcento(n)} `);
  const achados = CLUBES.filter((c) => c.chaves.some((k) => alvos.some((a) => a.includes(` ${k} `))));
  return achados.length === 1 ? achados[0] : null;
}

const POR_NOME = new Map(CLUBES.map((c) => [c.nome, c]));
const POR_SLUG = new Map(CLUBES.map((c) => [c.slug, c]));
export const clube = (nome: string) => POR_NOME.get(nome);
export const clubePorSlug = (slug: string) => POR_SLUG.get(slug);
export const sigla = (nome: string) => POR_NOME.get(nome)?.sigla ?? nome.slice(0, 3).toUpperCase();
export const slug = (nome: string) => POR_NOME.get(nome)?.slug ?? semAcento(nome).replace(/ /g, "-");
