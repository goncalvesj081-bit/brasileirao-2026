// "O que mudou desde a sua última visita" para o meu time, e avisos no celular (app instalado).

import { meta, posicao } from "../dados";
import { sims } from "../estado";
import { chancesSim } from "../modelo/simular";
import { gravarPref, lerPref, modoVagas } from "./componentes";
import { favorito } from "./favorito";
import { pct } from "./formato";
import { html, type Html } from "./html";

type Snap = { atualizado: string; clube: string; ch: Record<string, number> };
const ROT: Record<string, string> = { c: "Título", l: "Libertadores", s: "Sul-Americana", r: "Queda" };

function ler<T>(k: string): T | null {
  try {
    return JSON.parse(lerPref(k, "null")) as T | null;
  } catch {
    return null;
  }
}

/** Diferenças de pelo menos 3 pontos percentuais desde os últimos dados vistos neste aparelho. */
export function mudancasDesdeUltimaVisita(): Html {
  const clube = favorito();
  const res = sims.real;
  if (!clube || !res) return html``;
  const agora = chancesSim(res, posicao(clube), modoVagas());
  const atual: Snap = { atualizado: meta.atualizado, clube, ch: { ...agora } };
  const visto = ler<Snap>("visto");
  let dif = ler<{ de: Snap; para: Snap }>("diferenca");
  if (!visto || visto.clube !== clube) {
    gravarPref("visto", JSON.stringify(atual));
    return html``;
  }
  if (visto.atualizado !== meta.atualizado) {
    dif = { de: visto, para: atual };
    gravarPref("diferenca", JSON.stringify(dif));
    gravarPref("visto", JSON.stringify(atual));
  }
  if (!dif || dif.para.atualizado !== meta.atualizado || dif.de.clube !== clube) return html``;
  const itens = Object.keys(ROT).filter((k) => Math.abs((dif!.para.ch[k] ?? 0) - (dif!.de.ch[k] ?? 0)) >= 0.03);
  if (!itens.length) return html``;
  return html`<p class="mt-mudou"><b>Desde sua última visita:</b> ${itens.map(
    (k, n) => html`${n ? " · " : ""}${ROT[k]} ${pct(dif!.de.ch[k])} → <b>${pct(dif!.para.ch[k])}</b>`,
  )}</p>`;
}

const suportaAvisos = () => "Notification" in window && "serviceWorker" in navigator;

export function botaoAvisos(): Html {
  if (!suportaAvisos()) return html``;
  const ativo = Notification.permission === "granted" && lerPref("avisos", "") === "sim";
  return html`<button type="button" class="discreto" data-avisos aria-pressed="${ativo}">${ativo ? "Avisos ligados" : "Avisar no celular"}</button>`;
}

/** Pede permissão, guarda o favorito para o service worker e agenda a conferência periódica. */
export async function ligarAvisos(): Promise<string> {
  if (!suportaAvisos()) return "Este navegador não tem avisos.";
  if (lerPref("avisos", "") === "sim" && Notification.permission === "granted") {
    gravarPref("avisos", "");
    return "Avisos desligados.";
  }
  const p = await Notification.requestPermission();
  if (p !== "granted") return "Sem permissão para avisos.";
  gravarPref("avisos", "sim");
  await guardarFavoritoParaAvisos();
  const reg = await navigator.serviceWorker.ready;
  const sync = (reg as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void> } }).periodicSync;
  if (!sync) return "Avisos ligados, mas este navegador só confere quando o app está aberto.";
  try {
    await sync.register("novidades", { minInterval: 3 * 3600 * 1000 });
    return "Avisos ligados: o app confere os resultados de tempos em tempos.";
  } catch {
    return "Avisos ligados. Instale o app na tela inicial para receber com ele fechado.";
  }
}

export async function guardarFavoritoParaAvisos() {
  try {
    const c = await caches.open("brasileirao26-prefs");
    await c.put("/favorito", new Response(favorito() ?? ""));
    await c.put("/meta-visto", new Response(meta.atualizado));
  } catch {
    /* sem Cache API: os avisos ficam sem o nome do time */
  }
}
