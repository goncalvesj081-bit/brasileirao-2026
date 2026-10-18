import { CORTES, temporada } from "../../config/temporada";
import { meta, tabela } from "../dados";
import { link, SECOES } from "../router";
import { escudo, linkClube } from "../ui/componentes";
import { dataHora } from "../ui/formato";
import { html, type Html } from "../ui/html";

/** Tela "Mais" do celular: o que não cabe nas abas de baixo, e os 20 clubes. */
export function telaMais(): Html {
  const itens = SECOES.filter((s) => s.emMais);
  return html`<nav class="lista-links" aria-label="Outras seções">${itens.map(
    (s) => html`<a href="${s.vistas.length ? link(s.id, s.vistas[0][0]) : link(s.id)}"><span>${s.rotulo}</span><i aria-hidden="true">›</i></a>`,
  )}</nav>
    <h2>Clubes</h2>
    <nav class="grade-clubes" aria-label="Clubes">${tabela.map(
      (t, p) => html`<a href="${linkClube(t.clube)}">${escudo(t.clube, 28)}<span>${t.clube}</span><small>${p + 1}º, ${t.p} pts</small></a>`,
    )}</nav>`;
}

export function telaSobre(): Html {
  const f = temporada.faixas;
  const M = temporada.modelo;
  return html`<div class="texto">
    <h2>Como as chances são calculadas</h2>
    <p>Cada time tem uma força de ataque (gols marcados por jogo) e uma de defesa (gols sofridos por jogo), comparadas com a média do campeonato. Com poucos jogos, o número de um time diz pouco, então ele é puxado para a média: o peso do próprio time cresce a cada rodada até chegar a ${Math.round(M.pesoMax * 100)}%.</p>
    <p>Cada jogo que falta é sorteado com placares de Poisson, com o mandante um pouco mais forte. O campeonato inteiro é sorteado ${M.simulacoes.toLocaleString("pt-BR")} vezes; a chance de um time é a fração dessas vezes em que ele terminou na faixa.</p>
    <p>Desempate: pontos, vitórias, saldo de gols e gols marcados.</p>
    <h2>Vagas de 2026</h2>
    <p>Pela tabela, do ${f.libertadores[0]}º ao ${f.libertadores[1]}º vão à fase de grupos da Libertadores, o ${f.preLibertadores[0]}º à pré, do ${f.sulAmericana[0]}º ao ${f.sulAmericana[1]}º à Sul-Americana, e do ${f.rebaixamento[0]}º ao ${f.rebaixamento[1]}º caem.</p>
    <p>A Copa do Brasil dá mais duas vagas na Libertadores (campeão e vice), e os campeões brasileiros da Libertadores e da Sul-Americana ganham uma cada. Quando quem ganha essas vagas já está classificado pela tabela, ou cai para a Série B, a vaga desce para o próximo colocado; a Sul-Americana fica com os ${CORTES.sula - CORTES.lib} seguintes. Por isso o corte da Libertadores pode ir do 5º ao 9º. Em cada simulação, o que falta das copas também é sorteado (times do Brasileirão com a força que têm no campeonato, times de fora como médios), e as chances de Libertadores e Sul-Americana já contam isso. Veja <a href="${link("chances", "vagas")}">Vagas</a>.</p>
    <h2>Dados</h2>
    <p>Resultados e jogos vêm da football-data.org e são conferidos a cada atualização: se os pontos não baterem com as vitórias e empates, ou faltar algum jogo, a atualização é descartada. Última atualização em ${dataHora(meta.atualizado)}.</p>
  </div>`;
}
