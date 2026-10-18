import { adiado, porData, posicao, proximaRodada, resultados, restantes, rodadasComJogo, tabela } from "../dados";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import type { Jogo } from "../modelo/tipos";
import { link } from "../router";
import { escudo, linkClube, vazio } from "../ui/componentes";
import { dataJogo, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

/** Navegação entre rodadas: ‹ 31ª rodada › */
export function navRodada(R: number[], r: number, href: (x: number) => string, id = ""): Html {
  const i = R.indexOf(r);
  const seta = (alvo: number | undefined, rot: string, txt: string) =>
    alvo != null ? html`<a class="seta" href="${href(alvo)}" aria-label="${rot}" data-snav>${txt}</a>` : html`<span class="seta" aria-disabled="true">${txt}</span>`;
  return html`<div class="round-nav" ${id ? html`id="${id}"` : ""}>${seta(R[i - 1], "Rodada anterior", "‹")}<b>${r}ª rodada</b>${seta(R[i + 1], "Próxima rodada", "›")}</div>`;
}

const lado = (c: string, dir: "m" | "v") =>
  html`<a class="lado ${dir}" href="${linkClube(c)}">${escudo(c, 24)}<span class="nome">${c}</span><small>${posicao(c) + 1}º</small></a>`;

export function telaRodada(numero: number | null): Html {
  const R = rodadasComJogo;
  if (!R.length) return vazio("Não há mais jogos no campeonato.");
  const r = numero != null && R.includes(numero) ? numero : (proximaRodada ?? R[0]);
  const disputados = resultados.filter((g) => g.rodada === r).sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const faltam = restantes.filter((g) => g.rodada === r).sort(porData);
  const F = forcas(tabela);

  const quando = (g: Jogo) =>
    adiado(g) ? (g.data ? `Adiado para ${dataJogo(g.data, g.semHora)}` : "Adiado, sem data") : dataJogo(g.data, g.semHora);

  return html`${navRodada(R, r, (x) => link("jogos", x))}
    <div class="jogos">
      ${faltam.map((g) => {
        const [H, D, A] = probResultado(...golsEsperados(F, g.mandante, g.visitante));
        return html`<article class="jogo">
          <div class="quando">${quando(g)}</div>
          <div class="confronto">${lado(g.mandante, "m")}<span class="x">x</span>${lado(g.visitante, "v")}</div>
          <div class="odds" aria-label="Chances: ${g.mandante} ${pct(H)}, empate ${pct(D)}, ${g.visitante} ${pct(A)}">
            <div class="split"><i style="flex:${H}"></i><i style="flex:${D}"></i><i style="flex:${A}"></i></div>
            <div class="nums"><span class="${H > A ? "fav" : ""}">${pct(H)}</span><span>Empate ${pct(D)}</span><span class="${A > H ? "fav" : ""}">${pct(A)}</span></div>
          </div>
        </article>`;
      })}
      ${disputados.map(
        (g) => html`<article class="jogo feito">
          <div class="quando">Encerrado</div>
          <div class="confronto">${lado(g.mandante, "m")}<span class="placar">${g.gm}<i>x</i>${g.gv}</span>${lado(g.visitante, "v")}</div>
        </article>`,
      )}
    </div>
    <p class="note">Barra: chance de vitória do mandante, empate e vitória do visitante. Para testar placares, use <a href="#/simular">Simular</a>.</p>`;
}
