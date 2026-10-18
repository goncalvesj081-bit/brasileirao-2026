import { pessoas, tabela } from "../dados";
import { atrLinha, celClube, celProb, classeFaixa, escudo, linkClube } from "../ui/componentes";
import { html, type Html } from "../ui/html";

/** Foto do técnico (da Wikipédia); sem foto, nada. */
export const fotoTecnico = (t: [string, string, string?], tam: number) =>
  t[2] ? html`<img class="foto-tec" src="${t[2]}" alt="" width="${tam}" height="${tam}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : "";

/** "Dados de 17/10/2026, ESPN." */
export const dataDoDado = (d: { atualizado: string; fonte?: string }) =>
  html`<p class="note">Dados de ${d.atualizado || "data desconhecida"}${d.fonte ? `, ${d.fonte}` : ""}.</p>`;

function ranking(lista: [string, string, number][]) {
  let ult: number | null = null,
    pos = 0;
  return lista.map(([nome, clube, v], k) => {
    if (v !== ult) {
      pos = k + 1;
      ult = v;
    }
    return { pos, nome, clube, v };
  });
}

export function telaPessoas(vista: string): Html {
  if (vista === "artilharia" || vista === "assistencias") {
    const art = vista === "artilharia";
    const bloco = art ? pessoas.artilharia : pessoas.assistencias;
    const max = bloco.lista[0]?.[2] || 1;
    return html`<h2>${art ? "Artilharia" : "Assistências"}</h2>${dataDoDado(bloco)}${art ? "" : html`<p class="note">Os 50 primeiros do campeonato.</p>`}
      <div class="box"><table class="tab">
        <thead><tr><th>#</th><th class="l">Jogador</th><th class="l">Clube</th><th class="l">${art ? "Gols" : "Assistências"}</th></tr></thead>
        <tbody>${ranking(bloco.lista).map(
          (r) => html`<tr ${atrLinha(r.clube)}><td class="pos">${r.pos}</td><td class="l team">${r.nome}</td><td class="l team dim"><a href="${linkClube(r.clube)}">${escudo(r.clube, 18)}<span>${r.clube}</span></a></td>${celProb("c-acc", r.v / max, "wide", undefined, String(r.v))}</tr>`,
        )}</tbody>
      </table></div>`;
  }

  if (vista === "tecnicos") {
    const trocas = (c: string) => pessoas.trocas.lista.filter((t) => t[0] === c).length;
    return html`<h2>Técnicos</h2>${dataDoDado(pessoas.tecnicos)}
      <p class="note">Técnico atual de cada clube, na ordem da classificação. Trocas conta as mudanças durante 2026.</p>
      <div class="box"><table class="tab curta tab-tec">
        <thead><tr><th>#</th><th class="l">Clube</th><th class="l">Técnico</th><th class="l">No cargo desde</th><th>Trocas</th></tr></thead>
        <tbody>${tabela.map((t, p) => {
          const c: [string, string, string?] = pessoas.tecnicos.lista[t.clube] ?? ["—", ""];
          return html`<tr ${atrLinha(t.clube, classeFaixa(p))}><td class="pos">${p + 1}</td>${celClube(t.clube)}<td class="l"><span class="quem-tec">${fotoTecnico(c, 28)}${c[0]}</span></td><td class="l dim">${c[1]}</td><td class="dim">${trocas(t.clube) || "—"}</td></tr>`;
        })}</tbody>
      </table></div>`;
  }

  const lista = pessoas.trocas.lista.slice().reverse();
  return html`<h2>Trocas de técnico em 2026</h2>${dataDoDado(pessoas.trocas)}
    <p class="note">${lista.length} mudanças desde o início do campeonato, da mais recente para a mais antiga. Interinos não contam como troca.</p>
    <div class="box"><table class="tab">
      <thead><tr><th class="l">Data</th><th class="l">Clube</th><th class="l">Saiu</th><th class="l">Motivo</th><th class="l">Entrou</th></tr></thead>
      <tbody>${lista.map(
        (t) => html`<tr ${atrLinha(t[0])}><td class="l dim">${t[3]}</td>${celClube(t[0])}<td class="l">${t[1]}</td><td class="l dim">${t[2] || "—"}</td><td class="l">${t[4]}</td></tr>`,
      )}</tbody>
    </table></div>`;
}
