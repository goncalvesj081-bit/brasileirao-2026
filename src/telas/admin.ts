// Tela de admin (#/admin, fora do menu): quantas pessoas estão usando o site, dia a dia.

import { ADMINS } from "../../config/admin";
import { diaDeBrasilia, somarDias, type Dia } from "../modelo/visitas";
import { SECOES } from "../router";
import { dec } from "../ui/formato";
import { cru, html, type Html } from "../ui/html";

type Cliente = typeof import("../admin/cliente");
let cli: Cliente | null = null;
let usuario: import("../admin/cliente").User | null = null;
let authPronto = false;
let dias: [string, Partial<Dia>][] | null = null;
let erro = "";
let redesenhar: () => void = () => {};

export const aoMudarAdmin = (f: () => void) => (redesenhar = f);

function carregar() {
  if (cli) return;
  import("../admin/cliente")
    .then((c) => {
      cli = c;
      c.aoMudarUsuario((u) => {
        usuario = u;
        authPronto = true;
        dias = null;
        erro = "";
        if (u && ADMINS.includes(u.uid)) atualizar();
        redesenhar();
      });
    })
    .catch((e) => {
      erro = `Não deu para carregar o Firebase (${(e as Error).message}).`;
      redesenhar();
    });
}

function atualizar() {
  if (!cli) return;
  dias = null;
  cli
    .lerDias()
    .then((d) => (dias = d))
    .catch((e) => (erro = `Não deu para ler as estatísticas (${(e as Error).message}).`))
    .finally(redesenhar);
}

export async function cliqueAdmin(alvo: HTMLElement): Promise<boolean> {
  if (alvo.closest("button[data-admin-entrar]")) {
    try {
      await cli?.entrar();
    } catch (e) {
      erro = `Não deu para entrar (${(e as Error).message}).`;
      redesenhar();
    }
    return true;
  }
  if (alvo.closest("button[data-admin-sair]")) return void (await cli?.sair()), true;
  if (alvo.closest("button[data-admin-atualizar]")) return atualizar(), true;
  return false;
}

export function telaAdmin(): Html {
  carregar();
  if (erro) return html`<p class="empty">${erro}</p>`;
  if (!authPronto) return html`<p class="empty carregando">Carregando</p>`;
  if (!usuario)
    return html`<div class="texto"><p>Área restrita. Entre com a conta Google de quem administra o site.</p>
      <p><button type="button" class="discreto" data-admin-entrar>Entrar com Google</button></p></div>`;
  if (!ADMINS.includes(usuario.uid))
    return html`<div class="texto"><p>A conta <b>${usuario.email ?? usuario.displayName ?? ""}</b> ainda não é admin.</p>
      <p>ID desta conta: <code class="id-admin">${usuario.uid}</code></p>
      <p class="note">Para liberar, esse ID entra em config/admin.ts e em firestore.rules. Mande o ID para quem cuida do código.</p>
      <p><button type="button" class="discreto" data-admin-sair>Sair</button></p></div>`;
  if (!dias) return html`<p class="empty carregando">Lendo as estatísticas</p>`;
  return painel(dias);
}

// ---------- painel ----------

const diaMenos = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
const fmt = (n: number) => n.toLocaleString("pt-BR");
const dataCurta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

export function painel(dias: [string, Partial<Dia>][]): Html {
  const hoje = diaDeBrasilia();
  const por = new Map(dias);
  const periodo = (n: number) => somarDias([...Array(n).keys()].map((k) => por.get(diaMenos(hoje, k)) ?? {}));
  const H = periodo(1),
    O = somarDias([por.get(diaMenos(hoje, 1)) ?? {}]),
    S = periodo(7),
    M = periodo(30),
    T = somarDias(dias.map(([, d]) => d));
  const kpi = (rot: string, v: number, sub = "") => html`<div class="kpi"><small>${rot}</small><b>${fmt(v)}</b>${sub ? html`<span class="note">${sub}</span>` : ""}</div>`;
  const desde = dias[0]?.[0];
  const disp = M.celular + M.computador;
  const rotulo = (id: string) => SECOES.find((s) => s.id === id)?.rotulo ?? (id === "clube" ? "Páginas de clube" : id);
  const telas = Object.entries(M.telas).sort((a, b) => b[1] - a[1]);
  const maxTela = telas[0]?.[1] || 1;
  return html`<div class="admin-topo"><p class="note">${usuario?.email ?? ""} · contagem desde ${desde ? dataCurta(desde) + "/" + desde.slice(0, 4) : "hoje"}</p>
      <span><button type="button" class="discreto" data-admin-atualizar>Atualizar</button> <button type="button" class="discreto" data-admin-sair>Sair</button></span></div>
    <div class="kpis">
      ${kpi("Pessoas hoje", H.visitantes, `${fmt(H.acessos)} acessos`)}
      ${kpi("Ontem", O.visitantes, `${fmt(O.acessos)} acessos`)}
      ${kpi("Últimos 7 dias", S.visitantes, `${dec(S.visitantes / 7, 0)} por dia`)}
      ${kpi("Últimos 30 dias", M.visitantes, `${dec(M.visitantes / 30, 0)} por dia`)}
      ${kpi("Aparelhos novos (30 dias)", M.novos)}
      ${kpi("Aparelhos desde o início", T.novos)}
    </div>
    <section class="tsec"><h3>Pessoas por dia, últimos 30 dias</h3>${grafico(hoje, por)}</section>
    <div class="grid2">
      <section class="tsec"><h3>Como acessam (30 dias)</h3>
        <ul class="plist">
          <li><span>Celular</span><b>${fmt(M.celular)} · ${disp ? dec((100 * M.celular) / disp, 0) : 0}%</b></li>
          <li><span>Computador</span><b>${fmt(M.computador)} · ${disp ? dec((100 * M.computador) / disp, 0) : 0}%</b></li>
          <li><span>Pelo app instalado</span><b>${fmt(M.app)}</b></li>
          <li><span>Acessos por pessoa</span><b>${M.visitantes ? dec(M.acessos / M.visitantes, 1) : "–"}</b></li>
        </ul></section>
      <section class="tsec"><h3>Telas mais abertas (30 dias)</h3>
        ${telas.length
          ? html`<div class="box sem-linha"><table class="tab"><tbody>${telas.map(
              ([s, v]) => html`<tr><td class="l">${rotulo(s)}</td><td class="prob c-acc wide"><span>${fmt(v)}</span><i style="width:${((100 * v) / maxTela).toFixed(1)}%"></i></td></tr>`,
            )}</tbody></table></div>`
          : html`<p class="note">Ainda sem dados.</p>`}</section>
    </div>
    <p class="note">"Pessoas" conta aparelhos diferentes por dia: quem abre o site no celular e no computador conta duas vezes, e quem volta em outro dia conta de novo (por isso a soma da semana é maior que o número de pessoas diferentes). Navegação anônima ou que apaga os dados do site sempre conta como aparelho novo. Nada identifica quem visitou.</p>`;
}

/** Barras dos últimos 30 dias (visitantes), com o número do dia em cima da barra mais alta e da de hoje. */
function grafico(hoje: string, por: Map<string, Partial<Dia>>): Html {
  const N = 30,
    W = 640,
    H = 180,
    pb = 22,
    pt = 18;
  const vals = [...Array(N).keys()].reverse().map((k) => {
    const dia = diaMenos(hoje, k);
    return { dia, v: por.get(dia)?.visitantes ?? 0 };
  });
  const max = Math.max(1, ...vals.map((x) => x.v));
  const bw = W / N;
  const y = (v: number) => H - pb - ((H - pb - pt) * v) / max;
  const topo = vals.reduce((m, x) => (x.v > m.v ? x : m), vals[0]);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pessoas por dia nos últimos 30 dias">`;
  s += `<line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/>`;
  vals.forEach((x, i) => {
    const hoje_ = i === N - 1;
    s += `<rect x="${i * bw + 2}" y="${y(x.v)}" width="${bw - 4}" height="${Math.max(0, H - pb - y(x.v))}" rx="2" fill="${hoje_ ? "var(--accent)" : "var(--lib)"}" opacity="${hoje_ ? 1 : 0.75}"><title>${dataCurta(x.dia)}: ${fmt(x.v)}</title></rect>`;
    if ((x === topo && x.v > 0) || hoje_) s += `<text x="${i * bw + bw / 2}" y="${y(x.v) - 5}" text-anchor="middle" class="v">${fmt(x.v)}</text>`;
    if (i % 5 === 4 || hoje_) s += `<text x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${hoje_ ? "hoje" : dataCurta(x.dia)}</text>`;
  });
  return cru(s + "</svg>");
}
