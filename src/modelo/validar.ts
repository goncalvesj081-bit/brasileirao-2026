import { temporada } from "../../config/temporada";
import { classificacao } from "./classificacao";
import type { Jogo, Linha, Resultado } from "./tipos";

export interface EntradaValidacao {
  clubes: string[];
  resultados: Resultado[];
  restantes: Jogo[];
  /** classificação oficial (da API), se disponível, para conferir com a calculada */
  tabelaOficial?: Linha[];
  /** resultados já gravados; um jogo não pode "desaparecer" dos disputados */
  resultadosAnteriores?: Resultado[];
}

/** Devolve a lista de problemas; vazia quando está tudo certo. */
export function validarDados(e: EntradaValidacao): string[] {
  const erros: string[] = [];
  const { clubes, resultados, restantes } = e;
  const conhecidos = new Set(clubes);

  if (clubes.length !== temporada.clubes) erros.push(`Esperava ${temporada.clubes} clubes, vieram ${clubes.length}.`);

  const todos: Jogo[] = [...resultados, ...restantes];
  const totalEsperado = temporada.clubes * (temporada.clubes - 1);
  if (todos.length !== totalEsperado) erros.push(`Esperava ${totalEsperado} jogos no total, vieram ${todos.length}.`);

  const ids = new Set<string>();
  const confrontos = new Set<string>();
  for (const g of todos) {
    if (ids.has(g.id)) erros.push(`Jogo ${g.id} aparece duas vezes.`);
    ids.add(g.id);
    const k = `${g.mandante} x ${g.visitante}`;
    if (confrontos.has(k)) erros.push(`Confronto repetido: ${k}.`);
    confrontos.add(k);
    for (const c of [g.mandante, g.visitante]) if (!conhecidos.has(c)) erros.push(`Clube desconhecido: ${c} (jogo ${g.id}).`);
    if (g.mandante === g.visitante) erros.push(`Clube contra ele mesmo no jogo ${g.id}.`);
    if (!(g.rodada >= 1 && g.rodada <= temporada.rodadas)) erros.push(`Rodada inválida (${g.rodada}) no jogo ${g.id}.`);
  }

  for (const r of resultados) {
    if (!Number.isInteger(r.gm) || !Number.isInteger(r.gv) || r.gm < 0 || r.gv < 0)
      erros.push(`Placar inválido no jogo ${r.id}: ${r.gm} x ${r.gv}.`);
  }

  const jogos = new Map(clubes.map((c) => [c, { disputados: 0, restantes: 0 }]));
  for (const r of resultados) for (const c of [r.mandante, r.visitante]) { const n = jogos.get(c); if (n) n.disputados++; }
  for (const g of restantes) for (const c of [g.mandante, g.visitante]) { const n = jogos.get(c); if (n) n.restantes++; }
  for (const [c, n] of jogos) {
    if (n.disputados + n.restantes !== temporada.rodadas)
      erros.push(`${c}: ${n.disputados} disputados + ${n.restantes} restantes = ${n.disputados + n.restantes}, esperava ${temporada.rodadas}.`);
  }

  const calculada = classificacao(clubes, resultados);
  for (const t of calculada) {
    if (t.p !== 3 * t.v + t.e) erros.push(`${t.clube}: ${t.p} pontos não batem com 3×${t.v} + ${t.e}.`);
    if (t.v + t.e + t.d !== t.j) erros.push(`${t.clube}: V+E+D diferente de jogos.`);
  }

  if (e.tabelaOficial) {
    const porClube = new Map(calculada.map((t) => [t.clube, t]));
    for (const o of e.tabelaOficial) {
      if (o.p !== 3 * o.v + o.e) erros.push(`Tabela oficial, ${o.clube}: ${o.p} pontos não batem com 3×${o.v} + ${o.e}.`);
      const c = porClube.get(o.clube);
      if (!c) {
        erros.push(`Tabela oficial tem clube desconhecido: ${o.clube}.`);
        continue;
      }
      const campos = (["p", "j", "v", "e", "d", "gp", "gc"] as const).filter((k) => c[k] !== o[k]);
      if (campos.length)
        erros.push(`${o.clube}: tabela oficial difere da calculada pelos jogos em ${campos.map((k) => `${k} (${o[k]} x ${c[k]})`).join(", ")}.`);
    }
  }

  if (e.resultadosAnteriores) {
    // compara pelo confronto (cada mandante x visitante acontece uma vez), não pelo id
    const chave = (r: Jogo) => `${r.mandante} x ${r.visitante}`;
    const atuais = new Set(resultados.map(chave));
    const sumiram = e.resultadosAnteriores.filter((r) => !atuais.has(chave(r)));
    if (sumiram.length)
      erros.push(`${sumiram.length} jogo(s) já disputado(s) sumiram dos resultados: ${sumiram.slice(0, 5).map((r) => `${r.mandante} x ${r.visitante}`).join(", ")}.`);
  }

  return erros;
}
