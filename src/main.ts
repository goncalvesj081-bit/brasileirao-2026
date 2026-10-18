import "./estilos.css";
import { meta, situacao } from "./dados";
import { aoMudar, agendarUsuario, simularReal } from "./estado";
import { lerRota, link, redirecionamento, ROTA_INICIAL, SECOES, tituloDa, type Rota } from "./router";
import { aindaJogam } from "./telas/andamento";
import { telaChances } from "./telas/chances";
import { telaClassificacao } from "./telas/classificacao";
import { telaClube } from "./telas/clube";
import { telaEstatisticas } from "./telas/estatisticas";
import { telaMais, telaSobre } from "./telas/mais";
import { telaPessoas } from "./telas/pessoas";
import { telaRodada } from "./telas/rodada";
import { aoCalcularSerieB, telaSerieB } from "./telas/serieb";
import {
  atualizarResultadosSimulador,
  cliqueSimulador,
  digitacaoSimulador,
  teclaSimulador,
  telaSimulador,
} from "./telas/simulador";
import { escudo, gravarPref, seletor } from "./ui/componentes";
import { dataHora } from "./ui/formato";
import { html, type Html } from "./ui/html";
import { abasInferiores, listaClubes, navegacao } from "./ui/lateral";
import { compartilhar } from "./ui/compartilhar";

const $ = (id: string) => document.getElementById(id)!;

function rotaAtual(): Rota {
  const antiga = redirecionamento();
  if (antiga) history.replaceState(null, "", antiga);
  const r = lerRota();
  if (r) return r;
  history.replaceState(null, "", ROTA_INICIAL);
  return lerRota(ROTA_INICIAL)!;
}
let rota = rotaAtual();

const topoDe = (id: string, vista: string) => {
  const s = SECOES.find((x) => x.id === id)!;
  return seletor(s.vistas, vista, (k) => link(id, k), s.rotulo);
};

function conteudo(r: Rota): Html {
  switch (r.secao) {
    case "tabela":
      return telaClassificacao(r.vista);
    case "chances":
      return telaChances(r.vista, r.extra);
    case "jogos":
      return telaRodada(r.numero);
    case "simular":
      return telaSimulador(r.vista, r.numero);
    case "estatisticas":
      return html`${topoDe("estatisticas", r.vista)}${telaEstatisticas(r.vista)}`;
    case "pessoas":
      return html`${topoDe("pessoas", r.vista)}${telaPessoas(r.vista)}`;
    case "mais":
      return telaMais();
    case "sobre":
      return telaSobre();
    case "clube":
      return telaClube(r.clube!, r.vista);
    case "serie-b":
      return telaSerieB(r.vista);
  }
  return html``;
}

function fonte(): Html {
  return html`${meta.aoVivo ? html`<span class="live">Jogo em andamento</span>` : ""}<span>${situacao()}</span><span>Atualizado ${dataHora(meta.atualizado)}</span>`;
}

/** Redesenha sem perder a rolagem lateral das barras de filtro; o filtro escolhido fica à vista. */
function manterFiltros(redesenhar: () => void) {
  const chave = (el: Element, i: number) => `${el.getAttribute("aria-label") ?? ""}#${i}`;
  const antes = new Map([...document.querySelectorAll(".seg")].map((el, i) => [chave(el, i), el.scrollLeft]));
  redesenhar();
  document.querySelectorAll<HTMLElement>(".seg").forEach((el, i) => {
    el.scrollLeft = antes.get(chave(el, i)) ?? 0;
    const ativo = el.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
    if (!ativo) return;
    const ini = ativo.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft,
      fim = ini + ativo.offsetWidth;
    if (ini < el.scrollLeft) el.scrollLeft = ini - 16;
    else if (fim > el.scrollLeft + el.clientWidth) el.scrollLeft = fim - el.clientWidth + 16;
  });
}

function desenhar() {
  manterFiltros(desenharTudo);
}

function desenharTudo() {
  const titulo = tituloDa(rota);
  document.title = rota.secao === "tabela" ? "Brasileirão 2026" : `${titulo}, Brasileirão 2026`;
  $("pageTitle").innerHTML = String(rota.clube ? html`${escudoTitulo(rota.clube)}${titulo}` : html`${titulo}`);
  $("fonte").innerHTML = rota.clube || rota.secao === "mais" || rota.secao === "sobre" || rota.secao === "serie-b" ? "" : String(fonte());
  $("sideNav").innerHTML = String(navegacao(rota));
  $("sideClubs").innerHTML = String(listaClubes(rota));
  $("abas").innerHTML = String(abasInferiores(rota));
  $("main").innerHTML = String(conteudo(rota));
  const comLado = ((rota.secao === "tabela" && rota.vista === "geral") || (rota.secao === "chances" && rota.vista === "resumo")) && aindaJogam().size > 0;
  document.querySelector(".content")?.classList.toggle("larga", rota.secao === "clube" || rota.secao === "jogos" || comLado);
}

const escudoTitulo = (c: string) => escudo(c, 34);

window.addEventListener("hashchange", () => {
  const anterior = rota;
  rota = rotaAtual();
  const mesmaTela = anterior.secao === rota.secao && anterior.clube === rota.clube;
  desenhar();
  if (!mesmaTela) window.scrollTo({ top: 0 });
  else if (document.activeElement?.closest?.(".seg, .round-nav")) {
    // trocou de aba ou de rodada: mantém o seletor à vista
    document.querySelector(".seg")?.scrollIntoView({ block: "nearest" });
  }
});

document.addEventListener("keydown", (e) => {
  if (rota.secao === "simular") teclaSimulador(e);
});

$("main").addEventListener("click", (e) => {
  const alvo = e.target as HTMLElement;
  if (rota.secao === "simular" && cliqueSimulador(alvo, desenhar)) return;
  const comp = alvo.closest<HTMLButtonElement>("button[data-compartilhar]");
  if (comp) {
    void compartilhar(comp.dataset.compartilhar!, comp);
    return;
  }
  const pref = alvo.closest<HTMLButtonElement>("button[data-pref]");
  if (pref) {
    gravarPref(pref.dataset.pref!, pref.dataset.valor!);
    manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
    return;
  }
  if (alvo.closest("a,button,input")) return;
  // a linha inteira leva ao clube (o nome já é link; isto só aumenta a área de toque)
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

/** Telas que mostram a simulação real e precisam ser redesenhadas quando ela termina. */
const usaSimulacao = (r: Rota) =>
  r.secao === "chances" || r.secao === "jogos" || (r.secao === "tabela" && r.vista === "geral") || (r.secao === "clube" && (r.vista === "resumo" || r.vista === "rodada-a-rodada"));

aoMudar(() => {
  if (rota.secao === "simular") atualizarResultadosSimulador();
  else if (usaSimulacao(rota)) manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
});

aoCalcularSerieB(() => {
  if (rota.secao === "serie-b") manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
});

desenhar();
simularReal();

// app instalável e uso sem internet (só no site publicado; no desenvolvimento atrapalharia o recarregamento)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
agendarUsuario(0);

