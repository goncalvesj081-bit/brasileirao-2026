// Chances > Acerto do modelo: o modelo de cada jogo, antes dele, contra o que aconteceu.

import { nomesClubes, resultados } from "../dados";
import { medirAcerto, previsoes } from "../modelo/acerto";
import { escudo } from "../ui/componentes";
import { dec, pct } from "../ui/formato";
import { cru, html, type Html } from "../ui/html";

let cache: { chave: number; html: Html } | null = null;

/** Pontos da calibração: chance prevista (x) contra frequência real (y); na diagonal, o modelo está certo. */
function grafico(faixas: { media: number; n: number; aconteceu: number }[]): Html {
  const W = 300,
    H = 240,
    p = 34,
    pl = 46,
    pr = 22;
  const x = (v: number) => pl + (W - pl - pr) * v,
    y = (v: number) => H - p - (H - p - 14) * v;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance prevista contra o que aconteceu" style="max-width:420px">`;
  s += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}" stroke="var(--line-strong)" stroke-dasharray="4 4"/>`;
  for (const t of [0, 0.5, 1]) {
    s += `<text x="${x(t)}" y="${H - p + 16}" text-anchor="middle">${t * 100}%</text><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${t * 100}%</text>`;
  }
  for (const f of faixas) {
    const r = Math.max(3, Math.min(12, Math.sqrt(f.n)));
    s += `<circle cx="${x(f.media)}" cy="${y(f.aconteceu / f.n)}" r="${r}" fill="var(--accent)" opacity=".8"><title>Previu ${pct(f.media)} em ${f.n} casos; aconteceu ${pct(f.aconteceu / f.n)}</title></circle>`;
  }
  s += `<text x="${x(0.5)}" y="${H - 2}" text-anchor="middle">chance prevista</text>`;
  return cru(s + "</svg>");
}

export function telaAcerto(): Html {
  const chave = resultados.length;
  if (cache?.chave === chave) return cache.html;
  const prev = previsoes(nomesClubes, resultados);
  const a = medirAcerto(prev);
  const ganho = 1 - a.brier / a.brierBase;
  const zebras = prev
    .map((x) => ({ ...x, q: x.p[x.deu] }))
    .sort((u, v) => u.q - v.q)
    .slice(0, 8);
  const nomeRes = (d: 0 | 1 | 2, m: string, v: string) => (d === 1 ? "empate" : `vitória do ${d === 0 ? m : v}`);
  const h = html`<div class="kpis">
      <div class="kpi"><small>Jogos avaliados</small><b>${a.jogos}</b></div>
      <div class="kpi"><small>Favorito venceu</small><b class="t-lib">${pct(a.favorito)}</b></div>
      <div class="kpi"><small>Melhor que chutar a média</small><b class="${ganho > 0 ? "up" : "down"}">${pct(Math.max(0, ganho))}</b></div>
    </div>
    <p class="note">Para cada jogo já disputado, a chance que o modelo dava antes da rodada, usando só os resultados das rodadas anteriores (a mesma conta das chances do site). "Melhor que chutar a média": quanto o erro do modelo (Brier, ${dec(a.brier, 3)}) é menor que o de chutar sempre a frequência do campeonato (${dec(a.brierBase, 3)}).</p>
    <section class="tsec"><h3>Quando o modelo diz X%, acontece X%?</h3>
      ${grafico(a.faixas)}
      <div class="box sem-linha"><table class="tab"><thead><tr><th class="l">Chance prevista</th><th>Casos</th><th>Média prevista</th><th>Aconteceu</th></tr></thead><tbody>${a.faixas.map(
        (f) => html`<tr><td class="l">${Math.round(f.de * 100)}% a ${Math.round(f.ate * 100)}%</td><td class="dim">${f.n}</td><td>${pct(f.media)}</td><td><b>${pct(f.aconteceu / f.n)}</b></td></tr>`,
      )}</tbody></table></div>
      <p class="note">Cada jogo conta três vezes (vitória do mandante, empate e vitória do visitante). Quanto mais perto da linha tracejada, mais confiáveis são os números.</p></section>
    <section class="tsec"><h3>Maiores zebras</h3>
      <ul class="plist">${zebras.map(
        (z) => html`<li><span>${escudo(z.jogo.mandante, 16)} ${z.jogo.rodada}ª: ${z.jogo.mandante} ${z.jogo.gm} x ${z.jogo.gv} ${z.jogo.visitante} ${escudo(z.jogo.visitante, 16)}</span><b>${nomeRes(z.deu, z.jogo.mandante, z.jogo.visitante)} tinha ${pct(z.q)}</b></li>`,
      )}</ul></section>`;
  cache = { chave, html: h };
  return h;
}
