import "./estilos.css";
import { aplicarPlacares, meta, situacao } from "./dados";
import { iniciarAoVivo, ultimaBusca } from "./aovivo";
import { aoMudar, agendarUsuario, simularReal, sincronizarComJogosReais } from "./estado";
import { lerRota, link, redirecionamento, ROTA_INICIAL, SECOES, tituloDa, type Rota } from "./router";
import { aindaJogam } from "./telas/andamento";
import { telaChances } from "./telas/chances";
import { telaClassificacao } from "./telas/classificacao";
import { telaClube } from "./telas/clube";
import { telaEstatisticas } from "./telas/estatisticas";
import { telaMais, telaSobre } from "./telas/mais";
import { telaPessoas } from "./telas/pessoas";
import { telaRodada } from "./telas/rodada";
import { aoCalcularSerieB, digitacaoSerieB, limparSerieB, telaSerieB } from "./telas/serieb";
import { telaComparar } from "./telas/comparar";
import { abrirMeusDados, aoMudarBolao, aoMudarConta, carregar as carregarConta, contaTopo, foraDoBolao, digitacaoBolao, entrarBolao, enviarLoginBolao, sairBolao, salvarPerfilBolao, telaBolao, trocarModoLogin } from "./telas/bolao";
import { mascaraWhatsapp } from "./modelo/perfil";
import { alternarFavorito } from "./ui/favorito";
import { guardarFavoritoParaAvisos, ligarAvisos } from "./ui/avisos";
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
import { compartilhar, compartilharRodada } from "./ui/compartilhar";

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
      return telaSerieB(r.vista, r.extra);
    case "comparar":
      return telaComparar(r.vista, r.extra);
    case "bolao":
      return telaBolao(r.vista, r.numero);
  }
  return html``;
}

function fonte(): Html {
  const vivo = meta.aoVivo && ultimaBusca ? `, placar ao vivo às ${ultimaBusca.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "";
  return html`${meta.aoVivo ? html`<span class="live">Jogo em andamento</span>` : ""}<span>${situacao()}</span><span>Atualizado ${dataHora(meta.atualizado)}${vivo}</span>`;
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
  if (rota.secao !== "bolao") foraDoBolao();
  $("main").innerHTML = String(conteudo(rota));
  desenharConta();
  const comLado = ((rota.secao === "tabela" && rota.vista === "geral") || (rota.secao === "chances" && rota.vista === "resumo")) && aindaJogam().size > 0;
  document.querySelector(".content")?.classList.toggle("larga", rota.secao === "clube" || rota.secao === "jogos" || comLado || (rota.secao === "serie-b" && (rota.vista === "clube" || rota.vista === "simular")));
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
  const compR = alvo.closest<HTMLButtonElement>("button[data-compartilhar-rodada]");
  if (compR) {
    void compartilharRodada(Number(compR.dataset.compartilharRodada), compR);
    return;
  }
  const comp = alvo.closest<HTMLButtonElement>("button[data-compartilhar]");
  if (comp) {
    void compartilhar(comp.dataset.compartilhar!, comp);
    return;
  }
  if (alvo.closest("button[data-bolao-entrar]")) return void entrarBolao();
  if (alvo.closest("button[data-bolao-sair]")) return sairBolao();
  const modoLogin = alvo.closest<HTMLButtonElement>("button[data-bolao-modo]");
  if (modoLogin) return trocarModoLogin(modoLogin.dataset.bolaoModo!, document.querySelector<HTMLFormElement>("form[data-bolao-form]"));
  if (alvo.closest("button[data-bolao-cancelar-perfil]")) return abrirMeusDados(false);
  if (alvo.closest("button[data-sb-limpar]")) {
    limparSerieB();
    desenhar();
    return;
  }
  const av = alvo.closest<HTMLButtonElement>("button[data-avisos]");
  if (av) {
    void ligarAvisos().then((msg) => {
      av.textContent = msg;
      setTimeout(desenhar, 2500);
    });
    return;
  }
  const fav = alvo.closest<HTMLButtonElement>("button[data-favorito]");
  if (fav) {
    alternarFavorito(fav.dataset.favorito!);
    void guardarFavoritoParaAvisos();
    desenhar();
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
$("main").addEventListener("submit", (e) => {
  const form = (e.target as HTMLElement).closest<HTMLFormElement>("form[data-bolao-form], form[data-bolao-perfil]");
  if (!form) return;
  e.preventDefault();
  void ("bolaoPerfil" in form.dataset ? salvarPerfilBolao(form) : enviarLoginBolao(form));
});
$("main").addEventListener("change", (e) => {
  const sel = (e.target as HTMLElement).closest<HTMLSelectElement>("select[data-comparar]");
  if (!sel) return;
  const outro = document.querySelector<HTMLSelectElement>(`select[data-comparar="${sel.dataset.comparar === "a" ? "b" : "a"}"]`)!;
  location.hash = sel.dataset.comparar === "a" ? link("comparar", sel.value, outro.value) : link("comparar", outro.value, sel.value);
});
$("main").addEventListener("input", (e) => {
  const inp = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-s]");
  if (inp) digitacaoSimulador(inp);
  const inpB = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-sb]");
  if (inpB) digitacaoSerieB(inpB);
  const whats = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-whats]");
  if (whats) whats.value = mascaraWhatsapp(whats.value);
  const inpP = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-bp]");
  if (inpP) digitacaoBolao(inpP);
});
$("main").addEventListener("focusin", (e) => {
  const inp = (e.target as HTMLElement).closest?.<HTMLInputElement>("input[data-s]");
  if (inp) inp.select();
});

/** Telas que mostram a simulação real e precisam ser redesenhadas quando ela termina. */
const usaSimulacao = (r: Rota) =>
  r.secao === "chances" || r.secao === "jogos" || r.secao === "comparar" || (r.secao === "tabela" && r.vista === "geral") || (r.secao === "clube" && (r.vista === "resumo" || r.vista === "rodada-a-rodada" || r.vista === "torcida"));

aoMudar(() => {
  if (rota.secao === "simular") atualizarResultadosSimulador();
  else if (usaSimulacao(rota)) manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
});

function desenharConta() {
  $("conta").innerHTML = String(contaTopo());
  $("sideConta").innerHTML = String(contaTopo(true));
}
aoMudarConta(desenharConta);
// cantinho do usuário: carrega o Firebase depois que a página já apareceu
setTimeout(carregarConta, 800);
function cliqueConta(e: MouseEvent) {
  const alvo = e.target as HTMLElement;
  const menu = alvo.closest("details");
  if (alvo.closest("[data-conta-fechar]")) menu?.removeAttribute("open");
  else if (alvo.closest("button[data-conta-dados]")) {
    menu?.removeAttribute("open");
    abrirMeusDados(true);
    location.hash = link("bolao", "palpites");
  } else if (alvo.closest("button[data-bolao-sair]")) {
    menu?.removeAttribute("open");
    sairBolao();
  }
}
$("conta").addEventListener("click", cliqueConta);
$("sideConta").addEventListener("click", cliqueConta);
// clique fora fecha o menu da conta
document.addEventListener("click", (e) => {
  const menu = document.querySelector<HTMLDetailsElement>(".conta-menu[open]");
  if (menu && !menu.contains(e.target as Node)) menu.open = false;
});

aoMudarBolao(() => {
  if (rota.secao === "bolao") manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
});
aoCalcularSerieB(() => {
  if (rota.secao === "serie-b" && rota.vista !== "simular") manterFiltros(() => ($("main").innerHTML = String(conteudo(rota))));
});

sincronizarComJogosReais();
desenhar();
simularReal();

// placar ao vivo de minuto em minuto (ESPN); jogo encerrado já conta na tabela e nas chances
iniciarAoVivo((ps) => {
  const { mudou, resultadoNovo } = aplicarPlacares(ps);
  if (resultadoNovo) simularReal();
  // simulador: jogo em andamento entra com o placar real; encerrado sai dos placares simulados
  if (sincronizarComJogosReais()) agendarUsuario(0);
  // não redesenha enquanto alguém digita ou preenche o login/cadastro (perderia o que está sendo escrito)
  const digitando = document.activeElement instanceof HTMLInputElement || !!document.querySelector("form[data-bolao-form], form[data-bolao-perfil]");
  if ((mudou || meta.aoVivo) && !digitando) desenhar();
});

// app instalável e uso sem internet (só no site publicado; no desenvolvimento atrapalharia o recarregamento)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
agendarUsuario(0);

