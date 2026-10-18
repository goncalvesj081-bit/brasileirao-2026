// Técnicos e trocas pela Wikipédia (inglês) e assistências pela ESPN, tudo sem edição manual.
// As funções de leitura são puras (testadas em tests/pessoas-auto.test.ts); as de busca só baixam o texto.

import { clubePorNomeApi } from "../../config/clubes";

type Troca = [string, string, string, string, string];

// ---------- wikitext ----------

/** Divide no separador `sep` só fora de [[ ]] e {{ }}. */
function dividirTopo(s: string, sep: string): string[] {
  const out: string[] = [];
  let prof = 0,
    ini = 0;
  for (let i = 0; i < s.length; i++) {
    const d = s.slice(i, i + 2);
    if (d === "[[" || d === "{{") {
      prof++;
      i++;
    } else if (d === "]]" || d === "}}") {
      prof = Math.max(0, prof - 1);
      i++;
    } else if (prof === 0 && s.startsWith(sep, i)) {
      out.push(s.slice(ini, i));
      ini = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(s.slice(ini));
  return out;
}

/** Texto limpo de uma célula: sem referências, bandeiras, links e marcação. */
export function limpar(s: string): string {
  let t = s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  // templates de dentro para fora
  for (let k = 0; k < 10 && /\{\{/.test(t); k++)
    t = t.replace(/\{\{([^{}]*)\}\}/g, (_, corpo: string) => {
      const [nome, ...args] = corpo.split("|").map((x) => x.trim());
      const n = nome.toLowerCase();
      const pos = args.filter((a) => !/^\w+\s*=/.test(a));
      if (n === "sortname") return pos.slice(0, 2).join(" ");
      if (n === "nowrap" || n === "nobr" || n === "small") return pos.join("|");
      return "";
    });
  t = t
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** Lê a primeira tabela do wikitext em linhas de células (rowspan expandido). */
export function lerTabela(wikitext: string): { cab: string[]; linhas: string[][]; brutas: string[][] } {
  const ini = wikitext.indexOf("{|");
  if (ini < 0) return { cab: [], linhas: [], brutas: [] };
  const fim = wikitext.indexOf("\n|}", ini);
  const corpo = wikitext.slice(ini, fim < 0 ? undefined : fim);
  const blocos = corpo.split(/\n\|-[^\n]*/);
  blocos[0] = blocos[0].split("\n").slice(1).join("\n"); // tira a linha "{| class=…"

  let cab: string[] = [];
  const linhas: string[][] = [];
  const brutasLinhas: string[][] = [];
  const pendente: { texto: string; bruto: string; restam: number }[] = [];
  for (const bloco of blocos) {
    // junta continuação de linha na célula anterior
    const brutas: { cab: boolean; txt: string }[] = [];
    for (const l of bloco.split("\n")) {
      if (/^\s*$/.test(l)) continue;
      if (l.startsWith("!")) for (const c of dividirTopo(l.slice(1), "!!")) brutas.push({ cab: true, txt: c });
      else if (l.startsWith("|") && !l.startsWith("|+") && !l.startsWith("|}")) for (const c of dividirTopo(l.slice(1), "||")) brutas.push({ cab: false, txt: c });
      else if (brutas.length) brutas[brutas.length - 1].txt += "\n" + l;
    }
    if (!brutas.length) continue;
    const celulas = brutas.map((b) => {
      const partes = dividirTopo(b.txt, "|");
      // "rowspan=2 | texto": atributos antes do primeiro | de nível zero
      const temAtr = partes.length > 1 && /^\s*[a-z-]+\s*=/.test(partes[0]);
      const atr = temAtr ? partes[0] : "";
      const texto = temAtr ? partes.slice(1).join("|") : b.txt;
      const rs = Number(/rowspan\s*=\s*"?(\d+)/.exec(atr)?.[1] ?? 1);
      return { texto: limpar(texto), bruto: texto, rs, cab: b.cab };
    });
    if (celulas.every((c) => c.cab)) {
      cab = celulas.map((c) => c.texto);
      continue;
    }
    const linha: string[] = [],
      bruta: string[] = [];
    let col = 0;
    const ocupar = () => {
      while (pendente[col]?.restam > 0) {
        linha[col] = pendente[col].texto;
        bruta[col] = pendente[col].bruto;
        pendente[col].restam--;
        col++;
      }
    };
    for (const c of celulas) {
      ocupar();
      linha[col] = c.texto;
      bruta[col] = c.bruto;
      if (c.rs > 1) pendente[col] = { texto: c.texto, bruto: c.bruto, restam: c.rs - 1 };
      col++;
    }
    ocupar();
    linhas.push(linha);
    brutasLinhas.push(bruta);
  }
  return { cab, linhas, brutas: brutasLinhas };
}

const MESES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "12 February 2026" ou "February 12, 2026" → [dia, mês, ano]. */
export function lerData(s: string): [number, number, number] | null {
  const t = s.toLowerCase();
  let m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(t);
  if (m && MESES.includes(m[2])) return [+m[1], MESES.indexOf(m[2]) + 1, +m[3]];
  m = /([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(t);
  if (m && MESES.includes(m[1])) return [+m[2], MESES.indexOf(m[1]) + 1, +m[3]];
  return null;
}
const dois = (n: number) => String(n).padStart(2, "0");

const INTERINO = /\s*\((caretaker|interim)\)\s*/i;
const semInterino = (n: string) => n.replace(INTERINO, " ").trim();
const ehInterino = (n: string) => INTERINO.test(n);
const igual = (a: string, b: string) =>
  semInterino(a).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === semInterino(b).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function motivo(m: string): string {
  const t = m.toLowerCase();
  if (/sacked|dismiss|fired/.test(t)) return "Demitido";
  if (/resign/.test(t)) return "Pediu demissão";
  if (/mutual/.test(t)) return "Acordo";
  if (/end of contract|contract expir/.test(t)) return "Fim de contrato";
  if (/signed|hired|appointed by|left for/.test(t)) return "Saiu para outro clube";
  if (/director/.test(t)) return "Virou diretor";
  return "Saiu";
}

const coluna = (cab: string[], re: RegExp) => cab.findIndex((c) => re.test(c));

/** Página da Wikipédia do primeiro link da célula: "[[Tite (football manager)|Tite]]" → "Tite (football manager)". */
export function alvoLink(bruto: string): string | null {
  for (const m of bruto.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) if (!/^(file|image|arquivo):/i.test(m[1])) return m[1].trim();
  return null;
}

type Data = [number, number, number];
const dataBR = (d: Data) => `${dois(d[0])}/${dois(d[1])}/${d[2]}`;

interface Mudanca {
  clube: string;
  sai: string;
  mot: string;
  vaga: Data | null;
  entra: string;
  nomeado: Data | null;
  usada?: boolean;
}

/** Linhas da tabela de trocas, com as passagens de interino juntadas (A → interino → B vira A → B). */
export function lerMudancas(wikitext: string): Mudanca[] {
  const M = lerTabela(wikitext);
  const k = {
    time: coluna(M.cab, /^team|club/i),
    sai: coluna(M.cab, /outgoing/i),
    mot: coluna(M.cab, /manner/i),
    vaga: coluna(M.cab, /vacancy/i),
    entra: coluna(M.cab, /incoming/i),
    nomeado: coluna(M.cab, /appointment/i),
  };
  const muds: Mudanca[] = [];
  if (Object.values(k).every((x) => x >= 0))
    for (const l of M.linhas) {
      const c = clubePorNomeApi(l[k.time]);
      if (!c) continue;
      muds.push({ clube: c.nome, sai: l[k.sai] ?? "", mot: l[k.mot] ?? "", vaga: lerData(l[k.vaga] ?? ""), entra: l[k.entra] ?? "", nomeado: lerData(l[k.nomeado] ?? "") });
    }
  for (const m of muds) {
    if (m.usada) continue;
    while (ehInterino(m.entra)) {
      const prox = muds.find((x) => !x.usada && x !== m && x.clube === m.clube && igual(x.sai, m.entra));
      if (!prox) break;
      prox.usada = true;
      m.entra = prox.entra;
      m.nomeado = prox.nomeado;
    }
  }
  return muds.filter((m) => !m.usada && m.sai && !ehInterino(m.sai));
}

/** Data em que o técnico assumiu o clube, pela última troca da tabela que o tem como sucessor. */
export function contratacao(muds: Mudanca[], clube: string, tecnico: string): string | null {
  const ult = [...muds].reverse().find((m) => m.clube === clube && igual(m.entra, tecnico));
  const d = ult?.nomeado ?? ult?.vaga;
  return d ? dataBR(d) : null;
}

export interface Tecnicos {
  /** clube → [técnico, no cargo desde, foto] */
  lista: Record<string, [string, string, string?]>;
  trocas: Troca[];
  /** clube → página do técnico na Wikipédia (para a foto) */
  paginas: Record<string, string>;
}

/**
 * Monta técnicos atuais e trocas do ano a partir das seções "Personnel and kits" e "Coaching changes".
 * Quem já estava no cargo antes da temporada fica "antes de <ano>"; buscarTecnicos procura a data nas anteriores.
 */
export function tecnicosDaWikipedia(pessoal: string, mudancas: string, ano: number): Tecnicos {
  const P = lerTabela(pessoal);
  const cTime = coluna(P.cab, /^team|club/i),
    cTec = coluna(P.cab, /coach|manager/i);
  const atuais = new Map<string, string>();
  const paginas: Record<string, string> = {};
  if (cTime >= 0 && cTec >= 0)
    P.linhas.forEach((l, i) => {
      const c = clubePorNomeApi(l[cTime]);
      if (!c || !l[cTec]) return;
      atuais.set(c.nome, l[cTec]);
      const alvo = alvoLink(P.brutas[i][cTec] ?? "");
      if (alvo) paginas[c.nome] = alvo;
    });

  const validas = lerMudancas(mudancas);
  const nomeExib = (n: string) => (ehInterino(n) ? `${semInterino(n)} (interino)` : n);
  const lista: Tecnicos["lista"] = {};
  for (const [clube, tec] of atuais) lista[clube] = [nomeExib(tec), contratacao(validas, clube, tec) ?? `antes de ${ano}`];
  const trocas: Troca[] = validas
    .filter((m) => m.vaga && m.vaga[2] >= ano)
    .map((m) => [m.clube, m.sai, motivo(m.mot), `${dois(m.vaga![0])}/${dois(m.vaga![1])}`, nomeExib(m.entra)]);
  return { lista, trocas, paginas };
}

// ---------- busca ----------

const UA = { "User-Agent": "brasileirao-2026 (https://github.com/goncalvesj081-bit/brasileirao-2026)" };

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${new URL(url).host}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

const API_W = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2&redirects=1";

/** Wikitext da seção cujo título casa com `re` na página `pagina`. */
async function secaoWiki(pagina: string, re: RegExp): Promise<string> {
  const W = `${API_W}&action=parse&page=${encodeURIComponent(pagina)}`;
  const { parse } = await json<{ parse: { sections: { index: string; line: string }[] } }>(`${W}&prop=sections`);
  const s = parse.sections.find((x) => re.test(x.line));
  if (!s) throw new Error(`seção ${re} não encontrada em ${pagina}`);
  return (await json<{ parse: { wikitext: string } }>(`${W}&prop=wikitext&section=${s.index}`)).parse.wikitext;
}
const TROCAS_RE = /coaching changes|managerial changes/i;

/** Foto (miniatura) do artigo de cada página, em lote. */
async function fotos(paginas: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paginas.length) return out;
  const r = await json<{ query: { pages: { title: string; thumbnail?: { source: string } }[]; redirects?: { from: string; to: string }[]; normalized?: { from: string; to: string }[] } }>(
    `${API_W}&action=query&prop=pageimages&piprop=thumbnail&pithumbsize=240&titles=${encodeURIComponent(paginas.join("|"))}`,
  );
  const destino = new Map<string, string>();
  for (const x of [...(r.query.normalized ?? []), ...(r.query.redirects ?? [])]) destino.set(x.from, x.to);
  const final = (t: string) => {
    let a = t;
    for (let k = 0; k < 3 && destino.has(a); k++) a = destino.get(a)!;
    return a;
  };
  const porTitulo = new Map(r.query.pages.map((p) => [p.title, p.thumbnail?.source]));
  for (const p of paginas) {
    const src = porTitulo.get(final(p));
    if (src) out.set(p, src);
  }
  return out;
}

/**
 * Técnicos e trocas pela página da temporada na Wikipédia em inglês. Para quem assumiu antes da temporada,
 * procura a data nas tabelas de trocas das temporadas anteriores (Série A e B). `anterior` evita repetir a busca.
 */
export async function buscarTecnicos(ano: number, anterior: Record<string, [string, string, string?]> = {}): Promise<Tecnicos> {
  const pagina = `${ano} Campeonato Brasileiro Série A`;
  const t = tecnicosDaWikipedia(await secaoWiki(pagina, /personnel/i), await secaoWiki(pagina, TROCAS_RE), ano);
  if (Object.keys(t.lista).length < 18) throw new Error(`só ${Object.keys(t.lista).length} técnicos reconhecidos na Wikipédia`);

  const antes = `antes de ${ano}`;
  const falta = new Set<string>();
  for (const [clube, [nome, desde]] of Object.entries(t.lista)) {
    if (desde !== antes) continue;
    const a = anterior[clube];
    if (a && igual(a[0], nome) && !a[1].startsWith("antes de")) t.lista[clube][1] = a[1];
    else falta.add(clube);
  }
  for (let y = ano - 1; y >= ano - 12 && falta.size; y--)
    for (const serie of ["A", "B"]) {
      if (!falta.size) break;
      const muds = await secaoWiki(`${y} Campeonato Brasileiro Série ${serie}`, TROCAS_RE)
        .then(lerMudancas)
        .catch(() => []);
      for (const clube of [...falta]) {
        const d = contratacao(muds, clube, t.lista[clube][0]);
        if (d) {
          t.lista[clube][1] = d;
          falta.delete(clube);
        }
      }
    }

  const f = await fotos([...new Set(Object.values(t.paginas))]).catch(() => new Map<string, string>());
  for (const [clube, pag] of Object.entries(t.paginas)) {
    const src = f.get(pag);
    if (src) t.lista[clube][2] = src;
  }
  return t;
}

interface EspnLider {
  value: number;
  athlete: { displayName: string; team?: { displayName?: string; name?: string } };
}

/** Líderes de assistências do Brasileirão na ESPN (os 50 primeiros, com quem não marcou gol). */
export async function buscarAssistencias(): Promise<[string, string, number][]> {
  const r = await json<{ stats: { name: string; leaders: EspnLider[] }[] }>("https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/statistics");
  const lideres = r.stats.find((s) => s.name === "assistsLeaders")?.leaders ?? [];
  const lista = lideres
    .map((l) => [l.athlete.displayName, clubePorNomeApi(l.athlete.team?.displayName, l.athlete.team?.name)?.nome, Math.round(l.value)] as const)
    .filter((x): x is [string, string, number] => !!x[1] && x[2] > 0);
  if (lista.length < 10) throw new Error(`só ${lista.length} jogadores com assistência na ESPN`);
  return lista.sort((a, b) => b[2] - a[2]);
}
