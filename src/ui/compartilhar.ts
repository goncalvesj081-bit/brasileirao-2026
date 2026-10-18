// Gera uma imagem com as chances do clube e abre o compartilhamento do celular (ou baixa a imagem).

import { cores, escudoFixo, slug } from "../../config/clubes";
import { escudos, linhaDe, meta, nomesClubes, posicao, restantes, resultados, tabela } from "../dados";
import { classificacao } from "../modelo/classificacao";
import { sims } from "../estado";
import { chancesSim } from "../modelo/simular";
import { modoVagas } from "./componentes";
import { pct } from "./formato";

const W = 1080,
  H = 1350;
const FONTE = '"Archivo", system-ui, sans-serif';
const COR = { fundo: "#111417", tinta: "#eceff2", apagado: "#8b939c", linha: "#23282e", destaque: "#9be15d" };

/** Carrega o escudo com CORS; se o servidor não permitir, desenha sem ele. */
function carregarEscudo(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const fim = setTimeout(() => ok(null), 2500);
    img.onload = () => {
      clearTimeout(fim);
      ok(img);
    };
    img.onerror = () => {
      clearTimeout(fim);
      ok(null);
    };
    img.src = url;
  });
}

export async function gerarImagem(clube: string): Promise<Blob | null> {
  const res = sims.real;
  if (!res) return null;
  await document.fonts?.ready;
  const i = posicao(clube);
  const t = linhaDe(clube);
  const ch = chancesSim(res, i, modoVagas());
  const [c1, c2] = cores(clube);

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = COR.fundo;
  g.fillRect(0, 0, W, H);
  // faixa com as cores do clube
  g.fillStyle = c1;
  g.fillRect(0, 0, W / 2, 18);
  g.fillStyle = c2;
  g.fillRect(W / 2, 0, W / 2, 18);

  // a cópia no próprio site (feita na publicação) não esbarra em CORS; a original fica de reserva
  const esc = (await carregarEscudo(`escudos/${slug(clube)}.png`)) ?? (await carregarEscudo(escudoFixo(clube) ?? escudos[clube]));
  let x = 90;
  if (esc) {
    // cabe num quadrado de 130 sem deformar
    const k = 130 / Math.max(esc.naturalWidth || 130, esc.naturalHeight || 130);
    const w = (esc.naturalWidth || 130) * k,
      h = (esc.naturalHeight || 130) * k;
    g.drawImage(esc, 90 + (130 - w) / 2, 120 + (130 - h) / 2, w, h);
    x = 250;
  }
  g.fillStyle = COR.tinta;
  g.font = `900 92px ${FONTE}`;
  g.fillText(clube, x, 220, W - x - 80);

  g.fillStyle = COR.destaque;
  g.font = `900 200px ${FONTE}`;
  g.fillText(`${i + 1}º`, 90, 470);
  g.fillStyle = COR.apagado;
  g.font = `600 40px ${FONTE}`;
  g.fillText(`${t.p} pontos em ${t.j} jogos`, 420, 395);
  g.fillText(`${t.v}V ${t.e}E ${t.d}D, saldo ${t.gp - t.gc > 0 ? "+" : ""}${t.gp - t.gc}`, 420, 450);

  const itens: [string, number, string][] = [
    ["Título", ch.c, "#f2c14e"],
    ["Libertadores", ch.l, "#4f8ff7"],
    ["Sul-Americana", ch.s, "#b48cf2"],
    ["Rebaixamento", ch.r, "#ff6b5e"],
  ];
  let y = 600;
  g.strokeStyle = COR.linha;
  g.lineWidth = 3;
  for (const [rot, v, cor] of itens) {
    g.beginPath();
    g.moveTo(90, y - 70);
    g.lineTo(W - 90, y - 70);
    g.stroke();
    g.fillStyle = COR.apagado;
    g.font = `600 44px ${FONTE}`;
    g.fillText(rot, 90, y + 10);
    g.fillStyle = v < 0.001 ? COR.linha : cor;
    g.font = `900 96px ${FONTE}`;
    const txt = pct(v);
    g.fillText(txt, W - 90 - g.measureText(txt).width, y + 20);
    // barra fina proporcional
    g.fillRect(90, y + 45, ((W - 180) * Math.min(1, v)) | 0, 6);
    y += 170;
  }

  g.fillStyle = COR.apagado;
  g.font = `500 32px ${FONTE}`;
  const quando = new Date(meta.atualizado).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  g.fillText(`Chances no fim do Brasileirão 2026, com dados até ${quando}.`, 90, H - 110);
  g.fillStyle = COR.tinta;
  g.font = `800 34px ${FONTE}`;
  g.fillText(location.host + location.pathname.replace(/\/$/, ""), 90, H - 60);

  return new Promise((ok) => cv.toBlob((b) => ok(b), "image/png"));
}

const escudoDe = (c: string) => carregarEscudo(`escudos/${slug(c)}.png`).then((e) => e ?? carregarEscudo(escudoFixo(c) ?? escudos[c]));

/** Imagem da rodada: resultados (e placares ao vivo) e quem subiu ou desceu na tabela. */
export async function gerarImagemRodada(r: number): Promise<Blob | null> {
  await document.fonts?.ready;
  const feitos = resultados.filter((g) => g.rodada === r);
  const vivos = restantes.filter((g) => g.rodada === r && g.aoVivo);
  const jogos = [...feitos.map((g) => ({ g, gm: g.gm, gv: g.gv, vivo: false })), ...vivos.map((g) => ({ g, gm: g.aoVivo!.gm, gv: g.aoVivo!.gv, vivo: true }))].sort((a, b) =>
    (a.g.data ?? "").localeCompare(b.g.data ?? ""),
  );
  if (!jogos.length) return null;
  const antes = classificacao(nomesClubes, resultados.filter((g) => g.rodada !== r));
  const posAntes = new Map(antes.map((t, p) => [t.clube, p + 1]));
  const mov = tabela.map((t, p) => ({ c: t.clube, p: p + 1, d: posAntes.get(t.clube)! - (p + 1) })).filter((x) => x.d !== 0);
  const subiram = [...mov].sort((a, b) => b.d - a.d).slice(0, 3).filter((x) => x.d > 0);
  const desceram = [...mov].sort((a, b) => a.d - b.d).slice(0, 3).filter((x) => x.d < 0);

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = COR.fundo;
  g.fillRect(0, 0, W, H);
  g.fillStyle = COR.destaque;
  g.fillRect(0, 0, W, 14);
  g.fillStyle = COR.tinta;
  g.font = `900 84px ${FONTE}`;
  g.fillText(`${r}ª rodada`, 70, 150);
  g.fillStyle = COR.apagado;
  g.font = `600 34px ${FONTE}`;
  g.fillText(`Brasileirão 2026${vivos.length ? " · com jogos em andamento" : ""}`, 70, 205);

  const linhaH = Math.min(72, 700 / jogos.length);
  let y = 270;
  const escs = await Promise.all(jogos.flatMap((j) => [escudoDe(j.g.mandante), escudoDe(j.g.visitante)]));
  jogos.forEach((j, k) => {
    const meio = W / 2;
    g.font = `700 36px ${FONTE}`;
    g.fillStyle = COR.tinta;
    const m = j.g.mandante,
      v = j.g.visitante;
    g.fillText(m, meio - 110 - g.measureText(m).width, y + 12, 330);
    g.fillText(v, meio + 110, y + 12, 330);
    const em = escs[2 * k],
      ev = escs[2 * k + 1];
    if (em) g.drawImage(em, meio - 100, y - 26, 44, 44);
    if (ev) g.drawImage(ev, meio + 56, y - 26, 44, 44);
    g.font = `900 42px ${FONTE}`;
    g.fillStyle = j.vivo ? "#ff6b5e" : COR.tinta;
    const placar = `${j.gm}–${j.gv}`;
    g.fillText(placar, meio - g.measureText(placar).width / 2, y + 14);
    y += linhaH;
  });

  y += 40;
  g.strokeStyle = COR.linha;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(70, y - 30);
  g.lineTo(W - 70, y - 30);
  g.stroke();
  const coluna = (titulo: string, lista: typeof mov, x: number, cor: string, seta: string) => {
    g.fillStyle = COR.apagado;
    g.font = `700 32px ${FONTE}`;
    g.fillText(titulo, x, y + 20);
    lista.forEach((it, k) => {
      g.fillStyle = cor;
      g.font = `800 34px ${FONTE}`;
      g.fillText(`${seta}${Math.abs(it.d)}`, x, y + 78 + k * 54);
      g.fillStyle = COR.tinta;
      g.font = `600 34px ${FONTE}`;
      g.fillText(`${it.p}º ${it.c}`, x + 80, y + 78 + k * 54, 360);
    });
  };
  coluna("Mais subiu", subiram, 70, "#9be15d", "▲");
  coluna("Mais desceu", desceram, W / 2 + 20, "#ff6b5e", "▼");

  g.fillStyle = COR.tinta;
  g.font = `800 34px ${FONTE}`;
  g.fillText(location.host + location.pathname.replace(/\/$/, ""), 70, H - 60);
  return new Promise((ok) => cv.toBlob((b) => ok(b), "image/png"));
}

async function enviar(blob: Blob, nome: string, titulo: string) {
  const arquivo = new File([blob], nome, { type: "image/png" });
  const url = location.href;
  if (navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({ files: [arquivo], title: titulo, text: url }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
}

export async function compartilharRodada(r: number, botao: HTMLButtonElement) {
  const original = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Gerando imagem…";
  try {
    const blob = await gerarImagemRodada(r);
    if (blob) await enviar(blob, `rodada-${r}-brasileirao-2026.png`, `${r}ª rodada do Brasileirão 2026`);
  } finally {
    botao.disabled = false;
    botao.textContent = original;
  }
}

export async function compartilhar(clube: string, botao: HTMLButtonElement) {
  const original = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Gerando imagem…";
  try {
    const blob = await gerarImagem(clube);
    if (!blob) return;
    const nome = `${clube.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}-brasileirao-2026.png`;
    const arquivo = new File([blob], nome, { type: "image/png" });
    const url = location.href;
    if (navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: `${clube} no Brasileirão 2026`, text: url }).catch(() => {});
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
  } finally {
    botao.disabled = false;
    botao.textContent = original;
  }
}
