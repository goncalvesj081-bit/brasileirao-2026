import { restantes, tabela } from "../dados";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { atrLinha, celClube } from "../ui/componentes";
import { dec } from "../ui/formato";
import { html, type Html } from "../ui/html";

/** Dificuldade dos jogos que faltam: aproveitamento médio dos adversários e pontos esperados pelo modelo. */
export function tabelaQueFalta(): Html {
  const F = forcas(tabela);
  const ppg = new Map(tabela.map((t) => [t.clube, t.j ? t.p / t.j : 0]));
  const pos = new Map(tabela.map((t, p) => [t.clube, p + 1]));
  const linhas = tabela
    .map((t) => {
      const js = restantes.filter((g) => g.mandante === t.clube || g.visitante === t.clube);
      const adv = js.map((g) => (g.mandante === t.clube ? g.visitante : g.mandante));
      const esperado = js.reduce((s, g) => {
        const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
        return s + (g.mandante === t.clube ? 3 * H + D : 3 * A + D);
      }, 0);
      const media = (f: (c: string) => number) => (adv.length ? adv.reduce((s, c) => s + f(c), 0) / adv.length : 0);
      return {
        t,
        n: js.length,
        casa: js.filter((g) => g.mandante === t.clube).length,
        advPpg: media((c) => ppg.get(c)!),
        advPos: media((c) => pos.get(c)!),
        esperado,
      };
    })
    .sort((a, b) => b.advPpg - a.advPpg);
  return html`<p class="sub">Do caminho mais difícil para o mais fácil, pelo aproveitamento médio dos adversários que faltam (pontos por jogo deles até agora).</p>
    <div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Clube</th><th>Jogos</th><th class="w">Em casa</th><th>Adversários</th><th class="w">Posição média</th><th title="Pontos que o modelo espera nos jogos que faltam">Pontos esperados</th></tr></thead>
      <tbody>${linhas.map(
        (r, k) => html`<tr ${atrLinha(r.t.clube)}><td class="pos">${k + 1}</td>${celClube(r.t.clube)}<td class="dim">${r.n}</td><td class="w dim">${r.casa}</td><td class="big">${dec(r.advPpg, 2)}</td><td class="w">${dec(r.advPos, 1)}º</td><td>${dec(r.esperado, 1)} <span class="dim">de ${3 * r.n}</span></td></tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Adversários: pontos por jogo dos adversários que faltam. Pontos esperados: soma, jogo a jogo, de 3 × chance de vitória + chance de empate, pelo mesmo modelo das chances; já conta a força do próprio time e o mando de campo.</p>`;
}

