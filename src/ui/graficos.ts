// Gráficos em SVG feitos à mão. viewBox estreito (400) para o texto continuar legível no celular.

import { CORTES } from "../../config/temporada";
import type { Chances } from "../modelo/tipos";
import { corFaixa, faixas, vazio } from "./componentes";
import { pct } from "./formato";
import { cru, esc, html, type Html } from "./html";

/** Chance de terminar em cada posição, com o valor em cima da barra e as faixas embaixo. */
export function barrasPosicao(linha: number[], clube: string): Html {
  const n = linha.length,
    W = 400,
    H = 210,
    pl = 4,
    pr = 4,
    pb = 38,
    pt = 22;
  const bw = (W - pl - pr) / n;
  const max = Math.max(0.05, ...linha);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance de ${esc(clube)} terminar em cada posição">`;
  s += `<line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/>`;
  linha.forEach((v, p) => {
    const x = pl + p * bw + 2,
      w = bw - 4;
    if (v >= 0.0005)
      s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(1, H - pb - y(v))}" fill="${corFaixa(p, n)}" rx="2"><title>${p + 1}º: ${pct(v)}</title></rect>`;
    if (v >= 0.02)
      s += `<text x="${x + w / 2}" y="${y(v) - 5}" text-anchor="middle" class="v">${Math.round(v * 100)}</text>`;
    s += `<text x="${x + w / 2}" y="${H - pb + 14}" text-anchor="middle">${p + 1}</text>`;
  });
  const faixa = (a: number, b: number, cor: string, rot: string) => {
    const x1 = pl + a * bw + 2,
      x2 = pl + b * bw - 2;
    s += `<rect x="${x1}" y="${H - 16}" width="${x2 - x1}" height="4" fill="${cor}"/><text x="${(x1 + x2) / 2}" y="${H - 1}" text-anchor="middle">${rot}</text>`;
  };
  const fx = faixas();
  faixa(0, fx.lib, "var(--lib)", "Libertadores");
  faixa(fx.lib, fx.sula, "var(--sula)", "Sula");
  faixa(n - CORTES.rebaixados, n, "var(--rel)", "Rebaixamento");
  return html`${cru(s + "</svg>")}<p class="note">Números em cima das barras: chance em %.</p>`;
}

export interface PontoSerie {
  r: number;
  ch: Chances;
  pos: number;
}

const CURVAS: [keyof Chances, string, string][] = [
  ["c", "var(--title)", "Título"],
  ["l", "var(--lib)", `Top ${CORTES.lib}`],
  ["s", "var(--sula)", `${CORTES.lib + 1}º ao ${CORTES.sula}º`],
  ["r", "var(--rel)", "Rebaixamento"],
];

function eixoRodadas(r0: number, r1: number, x: (r: number) => number, yTexto: number): string {
  let s = "";
  for (let r = r0; r <= r1; r++)
    if (r === r0 || r === r1 || (r % 5 === 0 && r1 - r > 2 && r - r0 > 2)) s += `<text x="${x(r)}" y="${yTexto}" text-anchor="middle">${r}ª</text>`;
  return s;
}

/** Chances de título, Libertadores, Sula e rebaixamento depois de cada rodada; valor final escrito na ponta. */
export function evolucaoChances(clube: string, serie: PontoSerie[]): Html {
  if (serie.length < 2) return vazio("Ainda não há rodadas suficientes.");
  const W = 400,
    H = 210,
    pl = 42,
    pr = 52,
    pt = 12,
    pb = 26;
  const r0 = serie[0].r,
    r1 = serie[serie.length - 1].r;
  const x = (r: number) => pl + ((W - pl - pr) * (r - r0)) / Math.max(1, r1 - r0);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chances de ${esc(clube)} rodada a rodada">`;
  for (const t of [0, 0.5, 1])
    s += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"${t === 0.5 ? ' stroke-dasharray="3 4"' : ""}/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${t * 100}%</text>`;
  s += eixoRodadas(r0, r1, x, H - 6);
  const visiveis = CURVAS.filter(([k]) => Math.max(...serie.map((p) => p.ch[k])) >= 0.05);
  const pontas: { y: number; cor: string; txt: string }[] = [];
  for (const [k, cor] of visiveis) {
    const vals = serie.map((p) => p.ch[k]);
    s += `<polyline fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${serie.map((p, i) => `${x(p.r)},${y(vals[i])}`).join(" ")}"/>`;
    const ult = vals[vals.length - 1];
    s += `<circle cx="${x(r1)}" cy="${y(ult)}" r="4" fill="${cor}"/>`;
    pontas.push({ y: y(ult), cor, txt: pct(ult) });
  }
  // afasta rótulos que ficariam um em cima do outro
  pontas.sort((a, b) => a.y - b.y);
  for (let i = 1; i < pontas.length; i++) if (pontas[i].y - pontas[i - 1].y < 15) pontas[i].y = pontas[i - 1].y + 15;
  for (const p of pontas) s += `<text x="${x(r1) + 8}" y="${p.y + 4}" class="v" style="fill:${p.cor}">${p.txt}</text>`;
  return html`${cru(s + "</svg>")}<div class="legend">${visiveis.map(([, cor, rot]) => html`<span><i style="background:${cor}"></i>${rot}</span>`)}</div>`;
}

/** Posição na tabela depois de cada rodada, com as faixas ao fundo. */
export function evolucaoPosicao(clube: string, serie: PontoSerie[]): Html {
  if (serie.length < 2) return html``;
  const n = 20,
    W = 400,
    H = 170,
    pl = 32,
    pr = 40,
    pt = 10,
    pb = 26;
  const r0 = serie[0].r,
    r1 = serie[serie.length - 1].r;
  const x = (r: number) => pl + ((W - pl - pr) * (r - r0)) / Math.max(1, r1 - r0);
  const y = (p: number) => pt + ((H - pt - pb) * (p - 1)) / (n - 1);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Posição de ${esc(clube)} na tabela rodada a rodada">`;
  const faixa = (a: number, b: number, cor: string) => {
    s += `<rect x="${pl}" y="${y(a) - 3}" width="${W - pl - pr}" height="${y(b) - y(a) + 6}" fill="${cor}" opacity=".13"/>`;
  };
  faixa(1, CORTES.lib, "var(--lib)");
  faixa(CORTES.lib + 1, CORTES.sula, "var(--sula)");
  faixa(n - CORTES.rebaixados + 1, n, "var(--rel)");
  for (const p of [1, 5, 10, 15, 20]) s += `<text x="${pl - 6}" y="${y(p) + 4}" text-anchor="end">${p}º</text>`;
  s += eixoRodadas(r0, r1, x, H - 6);
  s += `<polyline fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" points="${serie.map((p) => `${x(p.r)},${y(p.pos)}`).join(" ")}"/>`;
  const ult = serie[serie.length - 1];
  s += `<circle cx="${x(r1)}" cy="${y(ult.pos)}" r="4" fill="var(--ink)"/><text x="${x(r1) + 8}" y="${y(ult.pos) + 4}" class="v">${ult.pos}º</text>`;
  return cru(s + "</svg>");
}

/** Posição de dois clubes depois de cada rodada, no mesmo gráfico. */
export function duasPosicoes(a: { nome: string; cor: string; serie: { r: number; pos: number }[] }, b: { nome: string; cor: string; serie: { r: number; pos: number }[] }): Html {
  const todas = [...a.serie, ...b.serie];
  if (a.serie.length < 2 || b.serie.length < 2) return html``;
  const n = 20,
    W = 400,
    H = 190,
    pl = 32,
    pr = 40,
    pt = 10,
    pb = 26;
  const r0 = Math.min(...todas.map((p) => p.r)),
    r1 = Math.max(...todas.map((p) => p.r));
  const x = (r: number) => pl + ((W - pl - pr) * (r - r0)) / Math.max(1, r1 - r0);
  const y = (p: number) => pt + ((H - pt - pb) * (p - 1)) / (n - 1);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Posição de ${esc(a.nome)} e ${esc(b.nome)} rodada a rodada">`;
  const faixa = (de: number, ate: number, cor: string) => {
    s += `<rect x="${pl}" y="${y(de) - 3}" width="${W - pl - pr}" height="${y(ate) - y(de) + 6}" fill="${cor}" opacity=".1"/>`;
  };
  faixa(1, CORTES.lib, "var(--lib)");
  faixa(CORTES.lib + 1, CORTES.sula, "var(--sula)");
  faixa(n - CORTES.rebaixados + 1, n, "var(--rel)");
  for (const p of [1, 5, 10, 15, 20]) s += `<text x="${pl - 6}" y="${y(p) + 4}" text-anchor="end">${p}º</text>`;
  s += eixoRodadas(r0, r1, x, H - 6);
  for (const c of [a, b]) {
    s += `<polyline fill="none" stroke="${c.cor}" stroke-width="2.4" stroke-linejoin="round" points="${c.serie.map((p) => `${x(p.r)},${y(p.pos)}`).join(" ")}"/>`;
    const u = c.serie[c.serie.length - 1];
    s += `<circle cx="${x(u.r)}" cy="${y(u.pos)}" r="4" fill="${c.cor}"/><text x="${x(u.r) + 8}" y="${y(u.pos) + 4}" class="v" style="fill:${c.cor}">${u.pos}º</text>`;
  }
  return html`${cru(s + "</svg>")}<div class="legend"><span><i style="background:${a.cor}"></i>${a.nome}</span><span><i style="background:${b.cor}"></i>${b.nome}</span></div>`;
}
