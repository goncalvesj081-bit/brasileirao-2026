import { adiado, porData, posicao, proximaRodada, resultados, restantes, rodadasComJogo, tabela } from "../dados";
import { forcas, golsEsperados } from "../modelo/forcas";
import { probResultado } from "../modelo/poisson";
import { link } from "../router";
import { linkClube, vazio } from "../ui/componentes";
import { dataJogo, dec, pct } from "../ui/formato";
import { html, type Html } from "../ui/html";

export function telaRodada(vista: string, numero: number | null): Html {
  const R = rodadasComJogo;
  if (!R.length) return vazio("Nenhum jogo restante.");
  const r = numero != null && R.includes(numero) ? numero : (proximaRodada ?? R[0]);
  const i = R.indexOf(r);
  const disputados = resultados.filter((g) => g.rodada === r);
  const faltam = restantes.filter((g) => g.rodada === r).sort(porData);

  const nav = html`<div class="round-nav">
    ${i > 0 ? html`<a class="btn" href="${link("rodada", vista, R[i - 1])}" aria-label="Rodada anterior">‹</a>` : html`<span class="btn" aria-disabled="true">‹</span>`}
    <b>${r}ª rodada</b>
    ${i < R.length - 1 ? html`<a class="btn" href="${link("rodada", vista, R[i + 1])}" aria-label="Próxima rodada">›</a>` : html`<span class="btn" aria-disabled="true">›</span>`}
  </div>`;
  const nomeClube = (c: string) => html`<a href="${linkClube(c)}">${c}</a>`;
  const quando = (g: (typeof faltam)[number]) =>
    adiado(g) ? (g.data ? `Adiado para ${dataJogo(g.data, g.semHora)}` : "Adiado, ainda sem data") : dataJogo(g.data, g.semHora);

  if (vista === "tabela") {
    return html`${nav}<div class="box"><table>
      <thead><tr><th class="l">Data</th><th class="l">Mandante</th><th></th><th class="l">Visitante</th><th class="l">Posições hoje</th></tr></thead>
      <tbody>
        ${disputados.map(
          (g) => html`<tr><td class="l dim">Encerrado</td><td class="l team">${nomeClube(g.mandante)}</td><td class="big" style="text-align:center">${g.gm} x ${g.gv}</td><td class="l team">${nomeClube(g.visitante)}</td><td class="l dim">${posicao(g.mandante) + 1}º x ${posicao(g.visitante) + 1}º</td></tr>`,
        )}
        ${faltam.map(
          (g) => html`<tr><td class="l dim">${quando(g)}</td><td class="l team">${nomeClube(g.mandante)}</td><td class="dim" style="text-align:center">x</td><td class="l team">${nomeClube(g.visitante)}</td><td class="l dim">${posicao(g.mandante) + 1}º x ${posicao(g.visitante) + 1}º</td></tr>`,
        )}
      </tbody></table></div>`;
  }

  const F = forcas(tabela);
  const odd = (rot: string, p: number) => html`<span class="odd"><small>${rot}</small>${pct(p)}</span>`;
  return html`${nav}
    <p class="sub">Chance de vitória do mandante, de empate e de vitória do visitante. Para testar resultados, use o <a href="#/simulador">Simulador</a>.</p>
    <div class="games">
      ${disputados.map(
        (g) => html`<div class="game"><div class="when"><span>Encerrado</span></div><div class="t">${nomeClube(g.mandante)}</div><div class="score">${g.gm} x ${g.gv}</div><div class="t a">${nomeClube(g.visitante)}</div></div>`,
      )}
      ${faltam.map((g) => {
        const [lm, lv] = golsEsperados(F, g.mandante, g.visitante);
        const [H, D, A] = probResultado(lm, lv);
        return html`<div class="game">
          <div class="when"><span>${quando(g)}</span><span>${dec(lm)} x ${dec(lv)} gols esperados</span></div>
          <div class="t">${nomeClube(g.mandante)}</div>
          <div class="odds">${odd("Casa", H)}${odd("Empate", D)}${odd("Fora", A)}</div>
          <div class="t a">${nomeClube(g.visitante)}</div>
          <div class="split" aria-hidden="true"><i style="width:${H * 100}%"></i><i style="width:${D * 100}%"></i><i style="width:${A * 100}%"></i></div>
        </div>`;
      })}
    </div>`;
}
