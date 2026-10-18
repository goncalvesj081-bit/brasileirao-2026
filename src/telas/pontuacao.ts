import { tabela } from "../dados";
import { sims } from "../estado";
import { calculando, celProb, linkClube, vazio } from "../ui/componentes";
import { pct } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { ZONAS } from "./chances";

const COLUNA = { c: 2, l: 3, s: 4, r: 5 } as const;

export function telaPontuacao(vista: string): Html {
  const res = sims.real;
  if (!res) return calculando();
  const z = ZONAS[vista] ?? ZONAS.campeao;
  const col = COLUNA[z.chave];
  const rebaix = z.chave === "r";

  const linhas = res.porPontos
    .filter((b) => b[1] >= 40) // pontuações raríssimas dão porcentagens instáveis
    .map((b) => ({ p: b[0], pr: b[col] / b[1] }))
    .sort((a, b) => b.p - a.p);
  // corta as caudas: de onde a chance encosta em 100% até onde encosta em 0%
  const meio = linhas.filter((r) => r.pr > 0.002 && r.pr < 0.998);
  if (!meio.length) return vazio("Sem dados suficientes: a disputa já está praticamente decidida.");
  const hi = Math.max(...meio.map((r) => r.p)) + 1;
  const lo = Math.min(...meio.map((r) => r.p)) - 1;
  const vistas = linhas.filter((r) => r.p <= hi && r.p >= lo);

  const marcos = [0.5, 0.9, 0.99]
    .map((t) => {
      const r = rebaix
        ? vistas.filter((r) => r.pr <= 1 - t).sort((a, b) => a.p - b.p)[0]
        : vistas.filter((r) => r.pr >= t).sort((a, b) => a.p - b.p)[0];
      return r ? ([t, r.p] as const) : null;
    })
    .filter((x) => x !== null);

  const projetados = (pts: number) =>
    tabela
      .map((t, i) => ({ t, i }))
      .filter((o) => Math.round(res.pts[o.i]) === pts)
      .map((o, k) => html`${k ? ", " : ""}<a href="${linkClube(o.t.clube)}">${o.t.clube}</a>`);

  return html`<h2>${z.nome}: chance pela pontuação final</h2>
    <p class="sub">${rebaix ? "Com quantos pontos um time escapa do rebaixamento" : "Quantos pontos um time precisa somar"} nas 38 rodadas, considerando todas as simulações.</p>
    <div class="legend">${marcos.map(
      ([t, p]) => html`<span><b>${p} pontos</b>: ${rebaix ? `risco abaixo de ${pct(1 - t)}` : `${pct(t)} de chance`}</span>`,
    )}</div>
    <div class="box"><table>
      <thead><tr><th>Pontos</th><th class="l">${rebaix ? "Risco de rebaixamento" : "Probabilidade"}</th><th class="l">Times projetados para essa pontuação</th></tr></thead>
      <tbody>${vistas.map((r) => html`<tr><td class="big">${r.p}</td>${celProb(z.tom, r.pr, "wide")}<td class="l dim">${projetados(r.p)}</td></tr>`)}</tbody>
    </table></div>`;
}
