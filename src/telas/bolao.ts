// Bolão: entrar (Google ou e-mail), completar o cadastro, palpitar nos jogos da rodada (até a hora do jogo) e ranking.
// O Firebase só é carregado quando alguém abre esta seção.

import { bolaoConfigurado } from "../../config/firebase";
import { porData, proximaRodada, restantes, resultados, rodadasComJogo } from "../dados";
import { PONTOS, pontosDoPalpite, type LinhaRanking } from "../modelo/bolao";
import { normalizarWhatsapp, problemaNoPerfil, whatsappParaTela, type Perfil } from "../modelo/perfil";
import type { Jogo, Resultado } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { escudo, seletor, vazio } from "../ui/componentes";
import { dataHora, dataJogo } from "../ui/formato";
import { cru, html, type Html } from "../ui/html";
import { navRodada } from "./rodada";

type Cliente = typeof import("../bolao/cliente");
let cli: Cliente | null = null;
let carregando = false;
let erro = "";
let usuario: import("../bolao/cliente").User | null = null;
/** O Firebase já disse se há alguém conectado (antes disso, não dá para decidir entre login e palpites). */
let authPronto = false;
let nome = "";
/** Cadastro privado; null = ainda não preencheu (sem ele, não há palpite). */
let perfil: Perfil | null = null;
let editandoPerfil = false;
/** O que foi digitado no cadastro, para não perder num redesenho. */
let rascunho = { nome: "", apelido: "", nascimento: "", whatsapp: "", aceite: false };
/** Cadastro feito junto com a conta de e-mail; gravado quando o Firebase avisa que a pessoa entrou. */
let perfilNovo: Perfil | null = null;
let meus: Record<string, [number, number]> = {};
let rank: { linhas: LinhaRanking[]; atualizado: Date | null } | null = null;
const revelados = new Map<number, Record<string, [string, number, number][]>>();
let nomes: Record<string, { nome: string; foto: string }> | null = null;

// tela de login
type ModoLogin = "entrar" | "criar" | "recuperar";
let modo: ModoLogin = "entrar";
let emailDigitado = "";
let infoLogin = "";
let enviando = false;
/** Nome escolhido ao criar a conta; gravado quando o Firebase avisa que a pessoa entrou. */
let nomeNovo = "";

let vistaAtual = "";
let redesenhar: () => void = () => {};
/** Antes de redesenhar, guarda o que já foi digitado no login ou no cadastro (a senha não). */
export const aoMudarBolao = (f: () => void) =>
  (redesenhar = () => {
    const form = document.querySelector<HTMLFormElement>("form[data-bolao-form], form[data-bolao-perfil]");
    if (form) guardarDigitado(form);
    f();
  });

let avisarConta: () => void = () => {};
/** Chamado quando muda quem está conectado ou o nome dele (para o cantinho do usuário no topo). */
export const aoMudarConta = (f: () => void) => (avisarConta = f);

let pedindoRanking = false;
function pedirRanking() {
  if (!cli || rank || pedindoRanking) return;
  pedindoRanking = true;
  void cli
    .ranking()
    .then((r) => {
      rank = r;
      if (vistaAtual === "ranking") redesenhar();
    })
    .finally(() => (pedindoRanking = false));
}

/** Carrega o Firebase (também fora do bolão, para o topo saber se há alguém conectado). */
export function carregar() {
  if (cli || carregando || !bolaoConfigurado()) return;
  carregando = true;
  import("../bolao/cliente")
    .then((c) => {
      cli = c;
      c.voltaDoGoogle().catch((e) => {
        erro = erroDeLogin(e);
        redesenhar();
      });
      c.aoMudarUsuario(async (u) => {
        usuario = u;
        authPronto = true;
        meus = {};
        perfil = null;
        editandoPerfil = false;
        if (u) {
          try {
            if (nomeNovo) {
              await c.mudarNome(u, nomeNovo);
              nome = nomeNovo;
              nomeNovo = "";
            } else nome = await c.registrar(u);
            if (perfilNovo) {
              await c.salvarPerfil(u.uid, perfilNovo);
              perfil = perfilNovo;
              perfilNovo = null;
            } else perfil = await c.lerPerfil(u.uid);
            meus = await c.meusPalpites(u.uid);
          } catch (e) {
            erro = `Não deu para carregar seus palpites (${(e as Error).message}).`;
          }
        }
        avisarConta();
        if (vistaAtual) redesenhar();
      });
      if (vistaAtual === "ranking") pedirRanking();
    })
    .catch((e) => {
      erro = `Não deu para abrir o bolão (${(e as Error).message}).`;
      if (vistaAtual) redesenhar();
    });
}

function pedirRevelados(r: number) {
  if (!cli || revelados.has(r)) return;
  revelados.set(r, {});
  void Promise.all([cli.revelados(r), nomes ? Promise.resolve(nomes) : cli.nomes()]).then(([x, n]) => {
    revelados.set(r, x);
    nomes = n;
    redesenhar();
  });
}

const aberto = (g: Jogo) => !!g.data && Date.now() < Date.parse(g.data) && !("gm" in g);
const fmtPalpite = (p?: [number, number]) => (p ? `${p[0]} x ${p[1]}` : "sem palpite");

const LOGO_GOOGLE = cru(
  `<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>`,
);

/** Tela de entrada: Google ou e-mail e senha (entrar, criar conta, recuperar senha). */
function telaLogin(): Html {
  const titulo = modo === "criar" ? "Criar conta no bolão" : modo === "recuperar" ? "Recuperar a senha" : "Entrar no bolão";
  const campoEmail = html`<label>E-mail<input type="email" name="email" autocomplete="email" required value="${emailDigitado}"></label>`;
  const campos =
    modo === "criar"
      ? html`${camposPerfil(false)}
          ${campoEmail}
          <label>Senha<input type="password" name="senha" autocomplete="new-password" minlength="6" required><small>Pelo menos 6 caracteres.</small></label>
          ${campoAceite()}`
      : modo === "recuperar"
        ? campoEmail
        : html`${campoEmail}
          <label><span class="rotulo-senha">Senha<button type="button" class="link" data-bolao-modo="recuperar">Esqueci a senha</button></span><input type="password" name="senha" autocomplete="current-password" required></label>`;
  const botao = modo === "criar" ? "Criar conta" : modo === "recuperar" ? "Enviar link" : "Entrar";
  return html`<div class="login">
    <div class="login-cartao">
      <h2>${titulo}</h2>
      <p class="login-sub">${modo === "recuperar" ? "Mandamos um link para você criar uma senha nova." : "Palpite nos jogos da rodada e dispute o ranking com a galera."}</p>
      ${modo !== "recuperar" ? html`<button type="button" class="botao-google" data-bolao-entrar ${enviando ? "disabled" : ""}>${LOGO_GOOGLE}Continuar com o Google</button>
        <div class="login-ou"><span>ou com e-mail</span></div>` : ""}
      <form class="login-form" data-bolao-form novalidate>
        ${campos}
        ${erro ? html`<p class="login-erro" role="alert">${erro}</p>` : ""}
        ${infoLogin ? html`<p class="login-info" role="status">${infoLogin}</p>` : ""}
        <button type="submit" class="botao-principal" ${enviando ? "disabled" : ""}>${enviando ? "Aguarde…" : botao}</button>
      </form>
      <p class="login-troca">${modo === "entrar"
        ? html`Ainda não tem conta? <button type="button" class="link" data-bolao-modo="criar">Criar conta</button>`
        : html`Já tem conta? <button type="button" class="link" data-bolao-modo="entrar">Entrar</button>`}</p>
    </div>
    <p class="note">Sem entrar, dá para ver o <a href="${link("bolao", "ranking")}">ranking</a> e as <a href="${link("bolao", "regras")}">regras</a>.</p>
  </div>`;
}

const hojeISO = () => new Date().toLocaleDateString("sv-SE");

/** Nome completo, nascimento e WhatsApp (e o nome do ranking, quando `comApelido`). */
function camposPerfil(comApelido: boolean): Html {
  return html`<label>Nome completo<input name="nome" autocomplete="name" maxlength="60" required value="${rascunho.nome}"></label>
    ${comApelido ? html`<label>Nome no ranking<input name="apelido" autocomplete="nickname" maxlength="30" required value="${rascunho.apelido}"><small>É o único dado que aparece para os outros participantes.</small></label>` : ""}
    <div class="login-dupla">
      <label>Data de nascimento<input type="date" name="nascimento" autocomplete="bday" min="1900-01-01" max="${hojeISO()}" required value="${rascunho.nascimento}"></label>
      <label>WhatsApp<input type="tel" name="whatsapp" autocomplete="tel-national" inputmode="tel" placeholder="(11) 98765-4321" data-whats required value="${rascunho.whatsapp}"></label>
    </div>`;
}
const campoAceite = () =>
  html`<label class="login-aceite"><input type="checkbox" name="aceite" ${rascunho.aceite ? "checked" : ""}><span>Autorizo o uso do meu nome, nascimento e WhatsApp só para entrarem em contato comigo se eu ganhar. Esses dados não aparecem no site.</span></label>`;

/** Ranking mostra "Maria S." em vez do nome completo. */
function apelidoDe(nomeCompleto: string): string {
  const p = nomeCompleto.trim().split(/\s+/);
  return (p.length > 1 ? `${p[0]} ${p[p.length - 1]![0]!.toUpperCase()}.` : p[0] ?? "").slice(0, 30);
}

/** Cadastro: obrigatório na primeira vez (quem entrou pelo Google) e editável em "Meus dados". */
function telaPerfil(): Html {
  const primeira = !perfil;
  if (!rascunho.nome && !rascunho.nascimento) {
    rascunho = perfil
      ? { nome: perfil.nome, apelido: nome, nascimento: perfil.nascimento, whatsapp: whatsappParaTela(perfil.whatsapp), aceite: true }
      : { nome: usuario?.displayName ?? "", apelido: nome, nascimento: "", whatsapp: "", aceite: false };
  }
  return html`<div class="login">
    <div class="login-cartao">
      <h2>${primeira ? "Complete seu cadastro" : "Meus dados"}</h2>
      <p class="login-sub">${primeira ? "Falta pouco: precisamos de alguns dados para falar com você se ganhar o bolão." : "Nascimento e WhatsApp só servem para o contato com quem ganhar."}</p>
      <form class="login-form" data-bolao-perfil novalidate>
        ${camposPerfil(true)}
        ${primeira ? campoAceite() : ""}
        ${erro ? html`<p class="login-erro" role="alert">${erro}</p>` : ""}
        <button type="submit" class="botao-principal" ${enviando ? "disabled" : ""}>${enviando ? "Salvando…" : primeira ? "Salvar e palpitar" : "Salvar"}</button>
      </form>
      <p class="login-troca">${primeira
        ? html`Entrou com a conta errada? <button type="button" class="link" data-bolao-sair>Sair</button>`
        : html`<button type="button" class="link" data-bolao-cancelar-perfil>Voltar aos palpites</button>`}</p>
    </div>
  </div>`;
}

const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";


function telaPalpites(numero: number | null): Html {
  const R = rodadasComJogo.length ? [...new Set([...resultados.map((g) => g.rodada), ...rodadasComJogo])].sort((a, b) => a - b) : [];
  const r = numero != null && R.includes(numero) ? numero : (proximaRodada ?? R[R.length - 1]);
  if (r == null) return vazio("Não há rodadas.");
  if (!usuario) return telaLogin();
  if (!perfil || editandoPerfil) return telaPerfil();
  const jogos: (Jogo | Resultado)[] = [...resultados.filter((g) => g.rodada === r), ...restantes.filter((g) => g.rodada === r)].sort(porData);
  const algumFechado = jogos.some((g) => !aberto(g));
  if (algumFechado) pedirRevelados(r);
  const rev = revelados.get(r) ?? {};
  const totalRodada = jogos.reduce((s, g) => s + ("gm" in g && meus[g.id] ? pontosDoPalpite({ gm: meus[g.id][0], gv: meus[g.id][1] }, g) : 0), 0);

  return html`    ${navRodada(R, r, (x) => link("bolao", "palpites", x))}
    ${usuario && jogos.some((g) => "gm" in g) ? html`<p class="note">Seus pontos nesta rodada: <b>${totalRodada}</b>.</p>` : ""}
    <div class="bolao-jogos">${jogos.map((g) => {
      const meu = meus[g.id];
      const res = "gm" in g ? (g as Resultado) : null;
      const pode = !!usuario && aberto(g);
      const todos = rev[g.id];
      const pts = res && meu ? pontosDoPalpite({ gm: meu[0], gv: meu[1] }, res) : null;
      return html`<article class="bp-jogo">
        <div class="quando">${g.data ? dataJogo(g.data, g.semHora) : "Adiado, sem data"}${aberto(g) ? "" : res ? ` · terminou ${res.gm} x ${res.gv}` : g.data && Date.now() >= Date.parse(g.data) ? " · em andamento" : ""}</div>
        <div class="bp-linha"><span class="nm">${escudo(g.mandante, 20)}${g.mandante}</span>
          ${pode
            ? html`<input inputmode="numeric" maxlength="2" data-bp="${g.id}" data-rodada="${g.rodada}" data-lado="m" value="${meu ? meu[0] : ""}" aria-label="Gols do ${g.mandante}"><span class="dim">x</span><input inputmode="numeric" maxlength="2" data-bp="${g.id}" data-rodada="${g.rodada}" data-lado="v" value="${meu ? meu[1] : ""}" aria-label="Gols do ${g.visitante}">`
            : html`<span class="bp-fixo">${usuario ? fmtPalpite(meu) : res ? `${res.gm} x ${res.gv}` : "–"}</span>`}
          <span class="nm v">${g.visitante}${escudo(g.visitante, 20)}</span></div>
        <div class="bp-status" data-st="${g.id}">${pts != null ? html`<b class="${pts ? "up" : "dim"}">+${pts} pontos</b>` : !g.data ? "Palpite abre quando o jogo tiver data." : ""}</div>
        ${todos?.length
          ? html`<details class="muda"><summary>Palpites de todos (${todos.length})</summary><ul class="bp-todos">${todos.map(([uid, gm, gv]) => {
              const p = res ? pontosDoPalpite({ gm, gv }, res) : null;
              return html`<li class="${uid === usuario?.uid ? "eu" : ""}"><span>${nomes?.[uid]?.nome ?? "…"}</span><b>${gm} x ${gv}</b>${p != null ? html`<small class="${p ? "up" : "dim"}">+${p}</small>` : ""}</li>`;
            })}</ul></details>`
          : ""}
      </article>`;
    })}</div>
    <p class="note">O palpite salva sozinho quando os dois placares estão preenchidos, e fecha na hora do jogo. Os palpites de todos aparecem depois que o jogo começa (com até uns 10 minutos de atraso).</p>`;
}

function telaRanking(): Html {
  pedirRanking();
  if (!rank) return html`<p class="empty carregando">Carregando o ranking</p>`;
  if (!rank.linhas.length) return vazio("O ranking aparece depois do primeiro jogo com palpites.");
  const ultima = Math.max(0, ...rank.linhas.flatMap((l) => Object.keys(l.rodadas).map(Number)));
  return html`<div class="box"><table class="tab">
      <thead><tr><th>#</th><th class="l">Participante</th><th>Pontos</th><th>Exatos</th><th class="w">Palpites</th>${ultima ? html`<th>${ultima}ª</th>` : ""}</tr></thead>
      <tbody>${rank.linhas.map(
        (l, k) => html`<tr class="${l.uid === usuario?.uid ? "eu" : ""}"><td class="pos">${k + 1}</td><td class="l"><span class="quem-tec">${l.foto ? html`<img class="foto-tec" src="${l.foto}" alt="" width="24" height="24" referrerpolicy="no-referrer">` : ""}${l.nome}</span></td><td class="big">${l.pontos}</td><td>${l.exatos}</td><td class="w dim">${l.palpites}</td>${ultima ? html`<td class="dim">${l.rodadas[ultima] ?? 0}</td>` : ""}</tr>`,
      )}</tbody>
    </table></div>
    <p class="note">Desempate: mais placares exatos, depois menos palpites. ${rank.atualizado ? `Atualizado ${dataHora(rank.atualizado.toISOString())}.` : ""}</p>`;
}

function telaRegras(): Html {
  return html`<div class="texto">
    <h2>Como funciona</h2>
    <p>Entre com o Google ou com e-mail e senha, complete o cadastro e dê seu palpite de placar para os jogos da Série A. Dá para mudar quantas vezes quiser até a hora marcada do jogo; depois disso o palpite fecha.</p>
    <h2>Pontos</h2>
    <p><b>${PONTOS.exato} pontos</b>: placar exato. <b>${PONTOS.saldo} pontos</b>: acertou o vencedor e o saldo de gols (palpite 3 x 1, deu 2 x 0). <b>${PONTOS.resultado} pontos</b>: acertou só o vencedor, ou acertou que seria empate. <b>0</b>: errou o resultado.</p>
    <h2>Ranking</h2>
    <p>Um ranking só, com todo mundo. Soma os pontos dos jogos encerrados; desempata quem tem mais placares exatos e, depois, quem fez menos palpites. Os palpites de cada jogo ficam visíveis para todos depois que ele começa.</p>
    <h2>Jogo adiado</h2>
    <p>Sem data, o palpite fica fechado. Quando o jogo ganha data nova, ele abre de novo até a nova hora; o palpite que você já tinha continua valendo.</p>
  </div>`;
}

export function telaBolao(vista: string, numero: number | null): Html {
  const topo = seletor(SECOES.find((s) => s.id === "bolao")!.vistas, vista, (k) => link("bolao", k), "Bolão");
  if (!bolaoConfigurado())
    return html`${topo}${vista === "regras" ? telaRegras() : vazio("O bolão está quase pronto: falta ligar o projeto do Firebase (login com Google e o banco de palpites).")}`;
  vistaAtual = vista;
  carregar();
  // sem login, o erro aparece dentro da própria tela de entrada
  const aviso = erro && (usuario || vista !== "palpites") ? html`<p class="aviso">${erro}</p>` : "";
  if (!cli || (!authPronto && vista === "palpites")) return html`${topo}${aviso}<p class="empty carregando">Abrindo o bolão</p>`;
  const corpo = vista === "ranking" ? telaRanking() : vista === "regras" ? telaRegras() : telaPalpites(numero);
  return html`${topo}${aviso}${corpo}`;
}

// ---------- ações (chamadas pelo main) ----------

/** Mensagem do login em português; fechar a janela do Google não é erro. */
function erroDeLogin(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled") return "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-login-credentials")
    return "E-mail ou senha incorretos.";
  if (code === "auth/email-already-in-use") return "Já existe uma conta com este e-mail. Entre com ele, ou use Continuar com o Google se foi assim que você criou.";
  if (code === "auth/invalid-email") return "Este e-mail não parece válido.";
  if (code === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
  if (code === "auth/missing-password") return "Digite a senha.";
  if (code === "auth/too-many-requests") return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (code === "auth/unauthorized-domain") return `Este endereço (${location.hostname}) ainda não está autorizado no login do Firebase.`;
  if (code === "auth/network-request-failed") return "Sem conexão. Confira a internet e tente de novo.";
  if (code === "auth/operation-not-allowed") return "Este jeito de entrar ainda não foi ativado no Firebase.";
  if (code === "auth/web-storage-unsupported") return "O navegador está bloqueando o armazenamento do site (aba anônima ou cookies bloqueados). Abra numa aba normal.";
  return `Não deu para entrar (${(e as Error).message}).`;
}

export async function entrarBolao() {
  erro = infoLogin = "";
  try {
    await cli?.entrar();
  } catch (e) {
    erro = erroDeLogin(e);
  }
  redesenhar();
}

export function trocarModoLogin(m: string, form?: HTMLFormElement | null) {
  if (form) guardarDigitado(form);
  modo = m === "criar" || m === "recuperar" ? m : "entrar";
  erro = infoLogin = "";
  redesenhar();
  [...document.querySelectorAll<HTMLInputElement>(".login-form input")].find((i) => !i.value)?.focus();
}

function guardarDigitado(form: HTMLFormElement) {
  const d = new FormData(form);
  emailDigitado = String(d.get("email") ?? emailDigitado);
  const txt = (k: string, atual: string) => (d.has(k) ? String(d.get(k)) : atual);
  rascunho = {
    nome: txt("nome", rascunho.nome),
    apelido: txt("apelido", rascunho.apelido),
    nascimento: txt("nascimento", rascunho.nascimento),
    whatsapp: txt("whatsapp", rascunho.whatsapp),
    aceite: form.querySelector('input[name="aceite"]') ? d.has("aceite") : rascunho.aceite,
  };
}

/** Aviso de preenchimento sem redesenhar (não apaga a senha que já foi digitada). */
function avisarNoForm(form: HTMLFormElement, msg: string) {
  erro = "";
  let el = form.querySelector<HTMLElement>(".login-erro");
  if (!el) {
    el = document.createElement("p");
    el.className = "login-erro";
    el.setAttribute("role", "alert");
    form.querySelector(".botao-principal")!.before(el);
  }
  el.textContent = msg;
}

/** Cadastro do formulário, ou o problema com ele. */
function perfilDoRascunho(exigeAceite: boolean): Perfil | string {
  const p: Perfil = { nome: rascunho.nome.trim(), nascimento: rascunho.nascimento, whatsapp: normalizarWhatsapp(rascunho.whatsapp) };
  const problema = problemaNoPerfil(p, hojeISO());
  if (problema) return problema;
  if (exigeAceite && !rascunho.aceite) return "Marque a autorização de contato para continuar.";
  return p;
}

/** Formulário de e-mail e senha. */
export async function enviarLoginBolao(form: HTMLFormElement) {
  if (!cli || enviando) return;
  guardarDigitado(form);
  const d = new FormData(form);
  const senha = String(d.get("senha") ?? "");
  infoLogin = "";
  const novo = modo === "criar" ? perfilDoRascunho(true) : null;
  const aviso =
    typeof novo === "string" ? novo : !emailDigitado.trim() ? "Digite seu e-mail." : modo !== "recuperar" && !senha ? "Digite a senha." : "";
  if (aviso) return avisarNoForm(form, aviso);
  erro = "";
  enviando = true;
  redesenhar();
  try {
    if (modo === "criar" && novo && typeof novo !== "string") {
      perfilNovo = novo;
      nomeNovo = apelidoDe(novo.nome);
      await cli.criarConta(nomeNovo, emailDigitado, senha);
    } else if (modo === "recuperar") {
      await cli.recuperarSenha(emailDigitado);
      infoLogin = `Se houver uma conta com ${emailDigitado.trim()}, o link chega em instantes. Confira também o spam.`;
      modo = "entrar";
    } else await cli.entrarComEmail(emailDigitado, senha);
  } catch (e) {
    nomeNovo = "";
    perfilNovo = null;
    erro = erroDeLogin(e);
  }
  enviando = false;
  redesenhar();
}

/** Formulário do cadastro (primeira vez ou "Meus dados"). */
export async function salvarPerfilBolao(form: HTMLFormElement) {
  if (!cli || !usuario || enviando) return;
  guardarDigitado(form);
  erro = "";
  const p = perfilDoRascunho(!perfil);
  const apelido = rascunho.apelido.trim().slice(0, 30) || apelidoDe(rascunho.nome);
  if (typeof p === "string") return avisarNoForm(form, p);
  enviando = true;
  redesenhar();
  try {
    await cli.salvarPerfil(usuario.uid, p);
    if (apelido !== nome) await cli.mudarNome(usuario, apelido);
    perfil = p;
    nome = apelido;
    avisarConta();
    editandoPerfil = false;
    form.remove();
    rascunho = { ...RASCUNHO_VAZIO };
  } catch (e) {
    erro = `Não deu para salvar seus dados (${(e as Error).message}).`;
  }
  enviando = false;
  redesenhar();
}

/** Saiu da seção do bolão: o Firebase continua carregado, mas não redesenha a tela à toa. */
export const foraDoBolao = () => (vistaAtual = "");

/** Conta do usuário: na barra lateral (computador, `lado`) ou ao lado do título (celular). */
export function contaTopo(lado = false): Html {
  if (!bolaoConfigurado() || !authPronto) return html``;
  if (!usuario) return html`<a class="conta-entrar" href="${link("bolao", "palpites")}">${ICONE_PESSOA}${lado ? "Entrar no bolão" : "Entrar"}</a>`;
  const primeiro = nome.split(/\s+/)[0] || "Você";
  return html`<details class="conta-menu">
    <summary aria-label="Sua conta">${avatar(36)}${lado
      ? html`<span class="conta-quem-lado"><b>${nome}</b><small>${usuario.email ?? ""}</small></span><i aria-hidden="true">▾</i>`
      : html`<span class="conta-nome">${primeiro}</span>`}</summary>
    <div class="conta-pop">
      ${lado ? "" : html`<div class="conta-quem"><b>${nome}</b><small>${usuario.email ?? ""}</small></div>`}
      <a href="${link("bolao", "palpites")}" data-conta-fechar>Meus palpites</a>
      <a href="${link("bolao", "ranking")}" data-conta-fechar>Ranking</a>
      <button type="button" data-conta-dados>Meus dados</button>
      <button type="button" data-bolao-sair>Sair</button>
    </div>
  </details>`;
}

const ICONE_PESSOA = cru(
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4-5.5 7-5.5s5.5 1.5 7 5.5"/></svg>`,
);

function avatar(tam: number): Html {
  return usuario?.photoURL
    ? html`<img class="avatar" src="${usuario.photoURL}" alt="" width="${tam}" height="${tam}" referrerpolicy="no-referrer">`
    : html`<span class="avatar" aria-hidden="true">${iniciais(nome)}</span>`;
}

export function abrirMeusDados(abrir: boolean) {
  editandoPerfil = abrir;
  erro = "";
  document.querySelector("form[data-bolao-perfil]")?.remove();
  rascunho = { ...RASCUNHO_VAZIO };
  redesenhar();
}
const RASCUNHO_VAZIO = { nome: "", apelido: "", nascimento: "", whatsapp: "", aceite: false };

/** Sai e esquece o que foi digitado, para a próxima pessoa no aparelho não ver os dados. */
export const sairBolao = () => {
  erro = "";
  document.querySelector("form[data-bolao-perfil]")?.remove();
  rascunho = { ...RASCUNHO_VAZIO };
  emailDigitado = "";
  void cli?.sair();
};

const esperas = new Map<string, ReturnType<typeof setTimeout>>();
/** Digitação de palpite: salva quando os dois lados têm número; apaga quando os dois ficam vazios. */
export function digitacaoBolao(inp: HTMLInputElement) {
  const id = inp.dataset.bp!;
  const rodada = Number(inp.dataset.rodada);
  const par = [...document.querySelectorAll<HTMLInputElement>(`input[data-bp="${id}"]`)];
  const m = par.find((x) => x.dataset.lado === "m")!.value.trim(),
    v = par.find((x) => x.dataset.lado === "v")!.value.trim();
  const st = document.querySelector<HTMLElement>(`[data-st="${id}"]`);
  clearTimeout(esperas.get(id));
  const ok = (x: string) => /^\d{1,2}$/.test(x) && +x <= 20;
  if (!(ok(m) && ok(v)) && !(m === "" && v === "")) {
    if (st) st.textContent = "";
    return;
  }
  esperas.set(
    id,
    setTimeout(async () => {
      if (!cli || !usuario) return;
      try {
        if (m === "" && v === "") {
          await cli.apagarPalpite(usuario.uid, id);
          delete meus[id];
          if (st) st.textContent = "Palpite apagado";
        } else {
          await cli.salvarPalpite(usuario.uid, id, rodada, +m, +v);
          meus[id] = [+m, +v];
          if (st) st.textContent = "Salvo ✓";
        }
      } catch {
        if (st) st.textContent = "Não salvou: o jogo já começou?";
      }
    }, 500),
  );
}
