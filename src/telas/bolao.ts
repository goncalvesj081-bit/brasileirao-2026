// Bolão: entrar com o Google, palpitar nos jogos da rodada (até a hora do jogo) e ranking.
// O Firebase só é carregado quando alguém abre esta seção.

import { bolaoConfigurado } from "../../config/firebase";
import { porData, proximaRodada, restantes, resultados, rodadasComJogo } from "../dados";
import { PONTOS, pontosDoPalpite, type LinhaRanking } from "../modelo/bolao";
import type { Jogo, Resultado } from "../modelo/tipos";
import { link, SECOES } from "../router";
import { escudo, seletor, vazio } from "../ui/componentes";
import { dataHora, dataJogo } from "../ui/formato";
import { html, type Html } from "../ui/html";
import { navRodada } from "./rodada";

type Cliente = typeof import("../bolao/cliente");
let cli: Cliente | null = null;
let carregando = false;
let erro = "";
let usuario: import("../bolao/cliente").User | null = null;
let nome = "";
let meus: Record<string, [number, number]> = {};
let rank: { linhas: LinhaRanking[]; atualizado: Date | null } | null = null;
const revelados = new Map<number, Record<string, [string, number, number][]>>();
let nomes: Record<string, { nome: string; foto: string }> | null = null;

let redesenhar: () => void = () => {};
export const aoMudarBolao = (f: () => void) => (redesenhar = f);

function carregar() {
  if (cli || carregando || !bolaoConfigurado()) return;
  carregando = true;
  import("../bolao/cliente")
    .then((c) => {
      cli = c;
      c.aoMudarUsuario(async (u) => {
        usuario = u;
        meus = {};
        if (u) {
          try {
            nome = await c.registrar(u);
            meus = await c.meusPalpites(u.uid);
          } catch (e) {
            erro = `Não deu para carregar seus palpites (${(e as Error).message}).`;
          }
        }
        redesenhar();
      });
      return c.ranking().then((r) => {
        rank = r;
        redesenhar();
      });
    })
    .catch((e) => {
      erro = `Não deu para abrir o bolão (${(e as Error).message}).`;
      redesenhar();
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

function cabecalhoUsuario(): Html {
  if (!usuario)
    return html`<div class="bolao-login"><p>Entre com sua conta Google para palpitar. Seu nome e sua foto aparecem no ranking.</p>
      <button type="button" class="botao-google" data-bolao-entrar>Entrar com o Google</button></div>`;
  return html`<div class="bolao-eu">${usuario.photoURL ? html`<img src="${usuario.photoURL}" alt="" width="32" height="32" referrerpolicy="no-referrer">` : ""}
    <label>Nome no ranking <input data-bolao-nome value="${nome}" maxlength="30"></label>
    <button type="button" class="discreto" data-bolao-salvar-nome>Salvar nome</button>
    <button type="button" class="discreto" data-bolao-sair>Sair</button></div>`;
}

function telaPalpites(numero: number | null): Html {
  const R = rodadasComJogo.length ? [...new Set([...resultados.map((g) => g.rodada), ...rodadasComJogo])].sort((a, b) => a - b) : [];
  const r = numero != null && R.includes(numero) ? numero : (proximaRodada ?? R[R.length - 1]);
  if (r == null) return vazio("Não há rodadas.");
  const jogos: (Jogo | Resultado)[] = [...resultados.filter((g) => g.rodada === r), ...restantes.filter((g) => g.rodada === r)].sort(porData);
  const algumFechado = jogos.some((g) => !aberto(g));
  if (algumFechado) pedirRevelados(r);
  const rev = revelados.get(r) ?? {};
  const totalRodada = jogos.reduce((s, g) => s + ("gm" in g && meus[g.id] ? pontosDoPalpite({ gm: meus[g.id][0], gv: meus[g.id][1] }, g) : 0), 0);

  return html`${cabecalhoUsuario()}
    ${navRodada(R, r, (x) => link("bolao", "palpites", x))}
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
    <p>Entre com o Google e dê seu palpite de placar para os jogos da Série A. Dá para mudar quantas vezes quiser até a hora marcada do jogo; depois disso o palpite fecha.</p>
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
  carregar();
  const aviso = erro ? html`<p class="aviso">${erro}</p>` : "";
  if (!cli) return html`${topo}${aviso}<p class="empty carregando">Abrindo o bolão</p>`;
  const corpo = vista === "ranking" ? telaRanking() : vista === "regras" ? telaRegras() : telaPalpites(numero);
  return html`${topo}${aviso}${corpo}`;
}

// ---------- ações (chamadas pelo main) ----------

export async function entrarBolao() {
  try {
    await cli?.entrar();
  } catch (e) {
    erro = `Não deu para entrar (${(e as Error).message}).`;
    redesenhar();
  }
}
export const sairBolao = () => void cli?.sair();
export async function salvarNomeBolao() {
  const inp = document.querySelector<HTMLInputElement>("input[data-bolao-nome]");
  if (!cli || !usuario || !inp?.value.trim()) return;
  await cli.mudarNome(usuario, inp.value);
  nome = inp.value.trim().slice(0, 30);
  redesenhar();
}

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
