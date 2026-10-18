import "./estilos.css";
import { meta, restantes, resultados, situacao } from "./dados";
import { aoMudar, simularReal, agendarUsuario } from "./estado";
import { lerRota, ROTA_INICIAL, tituloDa, type Rota } from "./router";
import { telaChances } from "./telas/chances";
import { telaClassificacao } from "./telas/classificacao";
import { telaClube } from "./telas/clube";
import { telaEstatisticas } from "./telas/estatisticas";
import { telaPessoas } from "./telas/pessoas";
import { telaPontuacao } from "./telas/pontuacao";
import { telaRodada } from "./telas/rodada";
import {
  atualizarResultadosSimulador,
  cliqueSimulador,
  digitacaoSimulador,
  teclaSimulador,
  telaSimulador,
} from "./telas/simulador";
import { dataHora } from "./ui/formato";
import { html, type Html } from "./ui/html";
import { listaClubes, navegacao } from "./ui/lateral";

const $ = (id: string) => document.getElementById(id)!;
let rota: Rota = lerRota() ?? lerRota(ROTA_INICIAL)!;

function conteudo(r: Rota): Html {
  switch (r.secao) {
    case "simulador":
      return telaSimulador(r.numero);
    case "chances":
      return telaChances(r.vista);
    case "pontuacao":
      return telaPontuacao(r.vista);
    case "classificacao":
      return telaClassificacao(r.vista);
    case "rodada":
      return telaRodada(r.vista, r.numero);
    case "estatisticas":
      return telaEstatisticas(r.vista);
    case "pessoas":
      return telaPessoas(r.vista);
    case "clube":
      return telaClube(r.clube!, r.aba!);
  }
  return html``;
}

function fonte(): Html {
  return html`${meta.aoVivo ? html`<span class="live">Jogo em andamento</span>` : ""}
    <span>Atualizado em ${dataHora(meta.atualizado)}</span>
    <span>${situacao()}</span>
    <span>${resultados.length} jogos disputados, ${restantes.length} por jogar</span>`;
}

function desenhar() {
  const titulo = tituloDa(rota);
  document.title = `${titulo}, Brasileirão 2026`;
  $("pageTitle").textContent = titulo;
  $("fonte").innerHTML = rota.secao === "clube" ? "" : String(fonte());
  $("sideNav").innerHTML = String(navegacao(rota));
  $("sideClubs").innerHTML = String(listaClubes(rota));
  $("main").innerHTML = String(conteudo(rota));
}

function abrirMenu(abrir: boolean) {
  document.body.classList.toggle("nav-open", abrir);
  $("menuBtn").setAttribute("aria-expanded", String(abrir));
}

window.addEventListener("hashchange", () => {
  const nova = lerRota();
  if (!nova) {
    history.replaceState(null, "", ROTA_INICIAL);
    rota = lerRota(ROTA_INICIAL)!;
  } else {
    const mesmaTela = nova.secao === rota.secao && nova.clube === rota.clube;
    rota = nova;
    if (!mesmaTela) window.scrollTo({ top: 0 });
  }
  abrirMenu(false);
  desenhar();
  if (rota.secao === "simulador" && document.activeElement?.matches("[data-snav]")) $("simRounds")?.scrollIntoView({ block: "start" });
});

$("menuBtn").addEventListener("click", () => abrirMenu(!document.body.classList.contains("nav-open")));
$("navFundo").addEventListener("click", () => abrirMenu(false));
$("side").addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("a")) abrirMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") abrirMenu(false);
  if (rota.secao === "simulador") teclaSimulador(e);
});

// linha da tabela inteira leva ao clube (o nome já é link; isto só aumenta a área de toque)
$("main").addEventListener("click", (e) => {
  const alvo = e.target as HTMLElement;
  if (rota.secao === "simulador" && cliqueSimulador(alvo, desenhar)) return;
  if (alvo.closest("a,button,input")) return;
  const tr = alvo.closest<HTMLElement>("tr[data-href]");
  if (tr) location.hash = tr.dataset.href!;
});
$("main").addEventListener("input", (e) => {
  const inp = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-s]");
  if (inp) digitacaoSimulador(inp);
});
$("main").addEventListener("focusin", (e) => {
  const inp = (e.target as HTMLElement).closest?.<HTMLInputElement>("input[data-s]");
  if (inp) inp.select();
});

aoMudar(() => {
  if (rota.secao === "simulador") atualizarResultadosSimulador();
  else $("main").innerHTML = String(conteudo(rota));
});

if (!lerRota()) history.replaceState(null, "", ROTA_INICIAL);
desenhar();
simularReal();
agendarUsuario(0);
