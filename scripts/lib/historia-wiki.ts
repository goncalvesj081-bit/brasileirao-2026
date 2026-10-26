// Temporadas passadas da Série A (desde 2003) pela Wikipédia: tabela final, placar de cada confronto e
// artilheiros. As funções de leitura são puras (testadas em tests/historia-wiki.test.ts); a busca só baixa o texto.

import { clubeHistorico } from "../../config/clubes-historicos";
import type { LinhaHistoria, TemporadaHistoria, Zona } from "../../src/modelo/historia";
import { dividirTopo, limpar } from "./pessoas-auto";

// ---------- wikitext ----------

const semComentarios = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "");

/** Corpo de `{{#invoke:<modulo>|main ...}}` (sem as chaves de fora), ou null. Ignora maiúsculas no nome do módulo. */
export function corpoInvoke(texto: string, modulo: string): string | null {
  const re = new RegExp(`\\{\\{\\s*#invoke:\\s*${modulo}\\s*\\|\\s*main`, "i");
  const m = re.exec(texto);
  if (!m) return null;
  let prof = 0;
  for (let i = m.index; i < texto.length - 1; i++) {
    const d = texto.slice(i, i + 2);
    if (d === "{{") {
      prof++;
      i++;
    } else if (d === "}}") {
      prof--;
      i++;
      if (prof === 0) return texto.slice(m.index + m[0].length, i - 1);
    }
  }
  return null;
}

/** Parâmetros nomeados de um template/invoke: `|chave=valor`. */
export function parametros(corpo: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const parte of dividirTopo(semComentarios(corpo), "|")) {
    const k = parte.indexOf("=");
    if (k < 0) continue;
    out.set(parte.slice(0, k).trim(), parte.slice(k + 1).trim());
  }
  return out;
}

/** Nome do clube num valor `name_X`: o alvo do primeiro link (o artigo), senão o texto. */
function nomeDoValor(v: string): string {
  const link = /\[\[([^\]|]+)/.exec(v);
  return link ? link[1] : limpar(v);
}

/** Clube no nome do site, ou erro dizendo o que acrescentar em config/clubes-historicos.ts. */
export function nomeClube(texto: string, ano: number): string {
  const c = clubeHistorico(texto);
  if (!c) throw new Error(`${ano}: clube desconhecido "${texto}" (acrescente em config/clubes-historicos.ts)`);
  return c.nome;
}

/** Siglas da Wikipédia (FLA, COR...) → clube, pelos `name_X` do bloco. */
function siglas(p: Map<string, string>, ano: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of p) if (k.startsWith("name_")) out.set(k.slice(5), nomeClube(nomeDoValor(v), ano));
  return out;
}

/** Siglas na ordem: `team_order=A, B, C` ou `team1=A|team2=B...`. */
function ordemDosTimes(p: Map<string, string>): string[] {
  const ordem = p.get("team_order");
  if (ordem) return ordem.split(",").map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = 1; p.has(`team${i}`); i++) out.push(p.get(`team${i}`)!.trim());
  return out;
}

/** Faixa pelo texto da legenda da Wikipédia ("Qualification for Copa Libertadores...", "Relegation to Série B"). */
export function zonaDoTexto(t: string): Zona | null {
  if (/libertadores/i.test(t)) return "l";
  if (/sudamericana|sul-americana/i.test(t)) return "s";
  if (/relegat|rebaixa/i.test(t)) return "r";
  return null;
}

const num = (s: string | undefined) => {
  const n = Number.parseInt((s ?? "").replace(/[^\d+-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Tabela final (`{{#invoke:sports table}}`), na ordem de classificação. */
export function lerTabela(texto: string, ano: number): LinhaHistoria[] {
  const corpo = corpoInvoke(texto, "sports table");
  if (!corpo) throw new Error(`${ano}: tabela não encontrada`);
  const p = parametros(corpo);
  const nomes = siglas(p, ano);
  const ordem = ordemDosTimes(p);
  if (!ordem.length) throw new Error(`${ano}: tabela sem a ordem dos times`);
  return ordem.map((s, i): LinhaHistoria => {
    const clube = nomes.get(s);
    if (!clube) throw new Error(`${ano}: sigla ${s} sem nome na tabela`);
    if (!p.has(`win_${s}`)) throw new Error(`${ano}: ${clube} sem vitórias na tabela`);
    const res = p.get(`result${i + 1}`)?.trim();
    const zona = res ? zonaDoTexto(p.get(`text_${res}`) ?? "") : null;
    const ajuste = num(p.get(`adjust_points_${s}`));
    return [clube, num(p.get(`win_${s}`)), num(p.get(`draw_${s}`)), num(p.get(`loss_${s}`)), num(p.get(`gf_${s}`)), num(p.get(`ga_${s}`)), ajuste, zona];
  });
}

/** Placar "2–1" (traço curto, longo ou hífen; aceita negrito, links e notas em volta). */
export function lerPlacar(v: string): [number, number] | null {
  const m = /(\d+)\s*[–—-]\s*(\d+)/.exec(limpar(v.replace(/\[\[[^\]|]*\|/g, "[[")));
  return m ? [+m[1], +m[2]] : null;
}

/** Confrontos da matriz `{{#invoke:sports results}}` (Wikipédia em inglês): [mandante, visitante, gm, gv]. */
export function lerResultados(texto: string, ano: number): [string, string, number, number][] | null {
  const corpo = corpoInvoke(texto, "sports results");
  if (!corpo) return null;
  const p = parametros(corpo);
  const nomes = siglas(p, ano);
  const out: [string, string, number, number][] = [];
  const vistos = new Set<string>();
  for (const [k, v] of p) {
    const m = /^match_([A-Za-z0-9]+)_([A-Za-z0-9]+)$/.exec(k);
    if (!m) continue;
    const placar = lerPlacar(v);
    if (!placar) continue;
    const a = nomes.get(m[1]),
      b = nomes.get(m[2]);
    if (!a || !b) throw new Error(`${ano}: confronto ${m[1]} x ${m[2]} sem nome`);
    const chave = `${a}|${b}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push([a, b, placar[0], placar[1]]);
  }
  return out.length ? out : null;
}

/**
 * Confrontos da tabela "Confrontos" da Wikipédia em português (2005 e 2008 não têm a matriz em inglês).
 * Cada linha é um mandante; as colunas seguem a mesma ordem das linhas (a diagonal é o próprio clube).
 */
export function lerConfrontosPt(texto: string, ano: number): [string, string, number, number][] | null {
  const ini = texto.search(/==\s*Confrontos\s*==/);
  if (ini < 0) return null;
  const fimTabela = texto.indexOf("\n|}", ini);
  const tabela = semComentarios(texto.slice(ini, fimTabela < 0 ? undefined : fimTabela));
  const linhas: { nome: string; celulas: string[] }[] = [];
  for (const bloco of tabela.split(/\n\|-[^\n]*/).slice(1)) {
    const ls = bloco
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|") || l.startsWith("!"));
    // a linha de cabeçalho (siglas) tem "!!"
    if (!ls.length || ls[0].includes("!!")) continue;
    const nome = limpar(ls[0].slice(1).split("|").pop()!);
    linhas.push({ nome, celulas: ls.slice(1).map((l) => l.slice(1).split("|").pop()!.trim()) });
  }
  if (!linhas.length) return null;
  const nomes = linhas.map((l) => nomeClube(l.nome, ano));
  const out: [string, string, number, number][] = [];
  linhas.forEach((l, i) => {
    if (l.celulas.length !== linhas.length) throw new Error(`${ano}: linha de ${nomes[i]} com ${l.celulas.length} colunas (esperava ${linhas.length})`);
    l.celulas.forEach((c, j) => {
      if (i === j) return;
      const placar = lerPlacar(c);
      if (placar) out.push([nomes[i], nomes[j], placar[0], placar[1]]);
    });
  });
  return out.length ? out : null;
}

// ---------- artilheiros ----------

/** Conteúdo de uma célula: o que vem depois do `|` de atributos (fora de [[ ]] e {{ }}). */
function valorCelula(c: string): string {
  const partes = dividirTopo(c, "|");
  return partes[partes.length - 1].trim();
}

/**
 * Linhas de uma tabela wiki (`{| ... |}`), com as células de `rowspan` repetidas nas linhas de baixo.
 * Cada célula vem como texto limpo.
 */
export function linhasDaTabela(tabela: string): string[][] {
  const out: string[][] = [];
  const pendentes = new Map<number, { valor: string; restam: number }>();
  for (const bloco of semComentarios(tabela).split(/\n\|-[^\n]*/).slice(1)) {
    const brutas = bloco
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => (l.startsWith("|") || l.startsWith("!")) && !l.startsWith("|}"))
      .flatMap((l) => dividirTopo(l.slice(1), l.startsWith("!") ? "!!" : "||"));
    if (!brutas.length) continue;
    const linha: string[] = [];
    let k = 0;
    for (let col = 0; k < brutas.length || pendentes.has(col); col++) {
      const p = pendentes.get(col);
      if (p) {
        linha.push(p.valor);
        if (--p.restam <= 0) pendentes.delete(col);
        continue;
      }
      const bruta = brutas[k++];
      const valor = limpar(valorCelula(bruta));
      const rs = /rowspan\s*=\s*"?(\d+)/i.exec(dividirTopo(bruta, "|").length > 1 ? bruta : "");
      if (rs && +rs[1] > 1) pendentes.set(col, { valor, restam: +rs[1] - 1 });
      linha.push(valor);
    }
    out.push(linha);
  }
  return out;
}

/**
 * Tabela de artilheiros (seção "Top scorers" / "Top goal scorers" em inglês, "Artilharia"/"Artilheiros" em português).
 * As colunas são achadas pelo cabeçalho (cada ano usa uma ordem).
 */
export function lerArtilheiros(texto: string, ano: number): [string, string, number][] {
  const ini = texto.search(/==+\s*(Top (goal ?)?scorers|Artilharia|Artilheiros)\s*==+/i);
  if (ini < 0) return [];
  const tabIni = texto.indexOf("{|", ini);
  const proximaSecao = texto.slice(ini + 3).search(/\n==/);
  if (tabIni < 0 || (proximaSecao >= 0 && tabIni > ini + 3 + proximaSecao)) return [];
  const tabFim = texto.indexOf("\n|}", tabIni);
  const linhas = linhasDaTabela(texto.slice(tabIni, tabFim < 0 ? undefined : tabFim));
  const iCab = linhas.findIndex((l) => l.some((c) => /^(player|scorer|name|jogador)/i.test(c)));
  if (iCab < 0) return [];
  const cab = linhas[iCab];
  const col = (re: RegExp) => cab.findIndex((c) => re.test(c));
  const cJog = col(/^(player|scorer|name|jogador)/i),
    cClube = col(/^(club|team|clube|equipe)/i),
    cGols = col(/^(goals|gols)/i);
  if (cJog < 0 || cClube < 0 || cGols < 0) return [];
  const out: [string, string, number][] = [];
  for (const l of linhas.slice(iCab + 1)) {
    // a linha pode ter uma célula a menos no começo quando a posição não é repetida
    const d = l.length - cab.length;
    const pega = (c: number) => l[c + (d < 0 ? d : 0)] ?? "";
    const jogador = pega(cJog),
      clube = clubeHistorico(pega(cClube)),
      gols = Number.parseInt(pega(cGols), 10);
    if (!jogador || !clube || !Number.isFinite(gols)) continue;
    out.push([jogador, clube.nome, gols]);
  }
  // só os que estão na mesma faixa dos 10 primeiros (empates no fim entram)
  out.sort((a, b) => b[2] - a[2]);
  const corte = out[Math.min(9, out.length - 1)]?.[2] ?? 0;
  const lista = out.filter((a) => a[2] >= corte);
  if (lista.length && lista[0][2] < 10) throw new Error(`${ano}: artilheiro com só ${lista[0][2]} gols, leitura suspeita`);
  return lista;
}

// ---------- conferência entre fontes ----------

export type Confronto = [string, string, number, number];

/** V, E, D, GP e GC de cada clube somando os confrontos. */
function somar(jogos: Confronto[]): Map<string, number[]> {
  const soma = new Map<string, number[]>();
  const de = (c: string) => soma.get(c) ?? (soma.set(c, [0, 0, 0, 0, 0]), soma.get(c)!);
  for (const [m, v, gm, gv] of jogos) {
    const a = de(m),
      b = de(v);
    a[3] += gm;
    a[4] += gv;
    b[3] += gv;
    b[4] += gm;
    if (gm > gv) (a[0]++, b[2]++);
    else if (gm < gv) (a[2]++, b[0]++);
    else (a[1]++, b[1]++);
  }
  return soma;
}

const numerosDa = (l: LinhaHistoria) => l.slice(1, 6).join();

/** Clubes cuja linha da tabela não fecha com a soma dos confrontos. */
export function naoFecham(tabela: LinhaHistoria[], jogos: Confronto[]): string[] {
  const soma = somar(jogos);
  return tabela.filter((l) => (soma.get(l[0]) ?? []).join() !== numerosDa(l)).map((l) => l[0]);
}

/**
 * Acerta erros de digitação da Wikipédia, sempre na direção que faz tabela e confrontos fecharem:
 * 1. placar diferente na outra língua: fica o da outra se isso fechar mais clubes;
 * 2. linha da tabela diferente na outra língua: fica a da outra se ela fechar com os confrontos e tiver os jogos certos;
 * 3. dois clubes que não fecham por causa de um único jogo entre eles: o placar desse jogo sai da tabela.
 * Devolve o que foi mudado, para o registro.
 */
export function conciliar(
  tabelaIn: LinhaHistoria[],
  jogosIn: Confronto[],
  outra: { tabela?: LinhaHistoria[] | null; jogos?: Confronto[] | null },
  rodadas: number,
  ano: number,
): { tabela: LinhaHistoria[]; jogos: Confronto[]; correcoes: string[] } {
  const tabela = tabelaIn.map((l) => [...l] as LinhaHistoria);
  const jogos = jogosIn.map((g) => [...g] as Confronto);
  const correcoes: string[] = [];
  const placar = (g: Confronto) => `${g[0]} ${g[2]}x${g[3]} ${g[1]}`;

  if (outra.jogos) {
    const alt = new Map(outra.jogos.map((g) => [`${g[0]}|${g[1]}`, g]));
    for (const g of jogos) {
      const o = alt.get(`${g[0]}|${g[1]}`);
      if (!o || (o[2] === g[2] && o[3] === g[3])) continue;
      const antes = naoFecham(tabela, jogos).length;
      const velho: Confronto = [...g];
      [g[2], g[3]] = [o[2], o[3]];
      if (naoFecham(tabela, jogos).length < antes) correcoes.push(`${ano}: ${placar(velho)} → ${g[2]}x${g[3]} (placar da outra Wikipédia)`);
      else [g[2], g[3]] = [velho[2], velho[3]];
    }
  }

  if (outra.tabela) {
    const soma = somar(jogos);
    for (const l of tabela) {
      const s = (soma.get(l[0]) ?? []).join();
      if (s === numerosDa(l)) continue;
      const o = outra.tabela.find((x) => x[0] === l[0]);
      if (!o || numerosDa(o) !== s || o[1] + o[2] + o[3] !== rodadas) continue;
      correcoes.push(`${ano}: tabela de ${l[0]} ${numerosDa(l)} → ${numerosDa(o)} (tabela da outra Wikipédia)`);
      for (let k = 1; k <= 5; k++) l[k] = o[k];
    }
  }

  // um jogo entre dois clubes que não fecham: o placar que faz os dois fecharem
  for (let mudou = true; mudou; ) {
    mudou = false;
    const soma = somar(jogos);
    const errados = new Set(naoFecham(tabela, jogos));
    const linha = (c: string) => tabela.find((l) => l[0] === c)!;
    for (const g of jogos) {
      if (!errados.has(g[0]) || !errados.has(g[1])) continue;
      const a = linha(g[0]),
        sa = soma.get(g[0])!;
      const gm = g[2] + a[4] - sa[3],
        gv = g[3] + a[5] - sa[4];
      if (gm < 0 || gv < 0 || (gm === g[2] && gv === g[3])) continue;
      const velho: Confronto = [...g];
      [g[2], g[3]] = [gm, gv];
      const agora = new Set(naoFecham(tabela, jogos));
      if (!agora.has(g[0]) && !agora.has(g[1])) {
        correcoes.push(`${ano}: ${placar(velho)} → ${gm}x${gv} (o placar que fecha com a tabela)`);
        mudou = true;
        break;
      }
      [g[2], g[3]] = [velho[2], velho[3]];
    }
  }
  return { tabela, jogos, correcoes };
}

// ---------- validação ----------

/**
 * Confere a tabela (pontos, jogos de cada um) e, quando há confrontos, se eles fecham com a tabela.
 * `podemDiferir`: clubes cujos confrontos não precisam fechar (jogo não disputado ou decidido no tribunal).
 */
export function validarTemporada(t: TemporadaHistoria, podemDiferir: string[] = []): string[] {
  const erros: string[] = [];
  const n = t.tabela.length;
  const jogos = t.formato.rodadas;
  if (n !== t.formato.clubes) erros.push(`${t.ano}: ${n} clubes na tabela (esperava ${t.formato.clubes})`);
  for (const [c, v, e, d] of t.tabela) if (v + e + d !== jogos) erros.push(`${t.ano}: ${c} com ${v + e + d} jogos (esperava ${jogos})`);
  // ordem: pontos não podem subir de uma posição para a de baixo
  const pts = t.tabela.map(([, v, e, , , , aj]) => 3 * v + e + aj);
  for (let i = 1; i < n; i++) if (pts[i] > pts[i - 1]) erros.push(`${t.ano}: ${t.tabela[i][0]} (${pts[i]}) acima de ${t.tabela[i - 1][0]} (${pts[i - 1]})`);
  if (t.jogos) {
    const esperado = n * (n - 1);
    if (t.jogos.length !== esperado && !podemDiferir.length) erros.push(`${t.ano}: ${t.jogos.length} confrontos (esperava ${esperado})`);
    const nomes: Confronto[] = t.jogos.map(([im, iv, gm, gv]) => [t.tabela[im][0], t.tabela[iv][0], gm, gv]);
    const diferentes = naoFecham(t.tabela, nomes).filter((c) => !podemDiferir.includes(c));
    if (diferentes.length) erros.push(`${t.ano}: confrontos não fecham com a tabela para ${diferentes.join(", ")}`);
  }
  return erros;
}

// ---------- busca ----------

const UA = { "User-Agent": "brasileirao-2026-site (GitHub Pages)" };

export async function wikitexto(lingua: "en" | "pt", titulo: string): Promise<string> {
  const r = await fetch(`https://${lingua}.wikipedia.org/w/index.php?title=${encodeURIComponent(titulo)}&action=raw`, { headers: UA });
  if (!r.ok) throw new Error(`Wikipédia (${lingua}) "${titulo}": HTTP ${r.status}`);
  return r.text();
}

export const tituloEn = (ano: number) => `${ano} Campeonato Brasileiro Série A`;
export const tituloPt = (ano: number) => `Campeonato Brasileiro de Futebol de ${ano} - Série A`;
