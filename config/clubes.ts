// Clubes da Série A 2026. `nome` é o que aparece no site e nos JSON.
// `chaves` são palavras que identificam o clube no nome que a API usa (sem acento, minúsculas).
// Se a API trouxer um nome que não bate com nada, o script falha e diz qual nome adicionar aqui.

export interface Clube {
  nome: string;
  sigla: string;
  slug: string;
  /** cor principal e secundária (bolinha quando o escudo não carrega) */
  cores: [string, string];
  chaves: string[];
  /** escudo que vale por cima do da API (quando a API traz uma versão desatualizada) */
  escudo?: string;
}

export const CLUBES: Clube[] = [
  { nome: "Athletico-PR", sigla: "CAP", slug: "athletico-pr", cores: ["#c8102e", "#111111"], chaves: ["paranaense", "athletico"],
    // a API ainda usa o escudo anterior a 2019
    escudo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Athletico_Paranaense_%28Logo_2019%29.svg/120px-Athletico_Paranaense_%28Logo_2019%29.svg.png" },
  { nome: "Atlético-MG", sigla: "CAM", slug: "atletico-mg", cores: ["#111111", "#f2f2f2"], chaves: ["mineiro", "atletico mg"] },
  { nome: "Bahia", sigla: "BAH", slug: "bahia", cores: ["#0057a8", "#e30613"], chaves: ["bahia"] },
  { nome: "Botafogo", sigla: "BOT", slug: "botafogo", cores: ["#111111", "#f2f2f2"], chaves: ["botafogo"] },
  { nome: "Bragantino", sigla: "RBB", slug: "bragantino", cores: ["#f2f2f2", "#d50032"], chaves: ["bragantino"] },
  { nome: "Chapecoense", sigla: "CHA", slug: "chapecoense", cores: ["#00843d", "#f2f2f2"], chaves: ["chapecoense"] },
  { nome: "Corinthians", sigla: "COR", slug: "corinthians", cores: ["#f2f2f2", "#111111"], chaves: ["corinthians"] },
  { nome: "Coritiba", sigla: "CFC", slug: "coritiba", cores: ["#00544d", "#f2f2f2"], chaves: ["coritiba"] },
  { nome: "Cruzeiro", sigla: "CRU", slug: "cruzeiro", cores: ["#003da5", "#f2f2f2"], chaves: ["cruzeiro"] },
  { nome: "Flamengo", sigla: "FLA", slug: "flamengo", cores: ["#c4161c", "#111111"], chaves: ["flamengo"] },
  { nome: "Fluminense", sigla: "FLU", slug: "fluminense", cores: ["#8a1538", "#00613c"], chaves: ["fluminense"] },
  { nome: "Grêmio", sigla: "GRE", slug: "gremio", cores: ["#0d80bf", "#111111"], chaves: ["gremio"] },
  { nome: "Internacional", sigla: "INT", slug: "internacional", cores: ["#e30613", "#f2f2f2"], chaves: ["internacional"] },
  { nome: "Mirassol", sigla: "MIR", slug: "mirassol", cores: ["#ffd200", "#00703c"], chaves: ["mirassol"] },
  { nome: "Palmeiras", sigla: "PAL", slug: "palmeiras", cores: ["#006437", "#f2f2f2"], chaves: ["palmeiras"] },
  { nome: "Remo", sigla: "REM", slug: "remo", cores: ["#0b1f4b", "#f2f2f2"], chaves: ["remo"] },
  { nome: "Santos", sigla: "SAN", slug: "santos", cores: ["#f2f2f2", "#111111"], chaves: ["santos"] },
  { nome: "São Paulo", sigla: "SAO", slug: "sao-paulo", cores: ["#e30613", "#111111"], chaves: ["sao paulo"] },
  { nome: "Vasco", sigla: "VAS", slug: "vasco", cores: ["#111111", "#f2f2f2"], chaves: ["vasco"] },
  { nome: "Vitória", sigla: "VIT", slug: "vitoria", cores: ["#e30613", "#111111"], chaves: ["vitoria"] },
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
export const escudoFixo = (nome: string) => POR_NOME.get(nome)?.escudo;
export const cores = (nome: string): [string, string] => POR_NOME.get(nome)?.cores ?? ["#6e757e", "#2b3037"];
export const slug = (nome: string) => POR_NOME.get(nome)?.slug ?? semAcento(nome).replace(/ /g, "-");
