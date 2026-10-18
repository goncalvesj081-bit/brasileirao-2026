// Copia os escudos para dist/escudos/<slug>.png, no mesmo endereço do site.
// A imagem de compartilhar desenha o escudo num canvas, e o servidor original não libera isso (CORS).
// Roda depois do build; se um escudo falhar, avisa e segue (a imagem sai sem ele).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLUBES, slugTexto } from "../config/clubes";

const RAIZ = join(import.meta.dirname, "..");
const escudos = JSON.parse(readFileSync(join(RAIZ, "data", "escudos.json"), "utf8")) as Record<string, string>;
const DESTINO = join(RAIZ, "dist", "escudos");
mkdirSync(DESTINO, { recursive: true });

let ok = 0;
for (const c of CLUBES) {
  const url = c.escudo ?? escudos[c.nome];
  if (!url) continue;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "brasileirao-2026 (GitHub Pages)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(join(DESTINO, `${c.slug}.png`), Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (e) {
    console.warn(`Aviso: escudo de ${c.nome} não baixado (${(e as Error).message}).`);
  }
}
console.log(`Escudos copiados: ${ok} de ${CLUBES.length}.`);

// Série B: escudos da ESPN em dist/escudos/b/<slug>.png (mesmo endereço do site; o celular pode bloquear os de fora)
const serieB = JSON.parse(readFileSync(join(RAIZ, "data", "serieb.json"), "utf8")) as { escudos: Record<string, string> };
mkdirSync(join(DESTINO, "b"), { recursive: true });
let okB = 0;
for (const [nome, url] of Object.entries(serieB.escudos)) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "brasileirao-2026 (GitHub Pages)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(join(DESTINO, "b", `${slugTexto(nome)}.png`), Buffer.from(await r.arrayBuffer()));
    okB++;
  } catch (e) {
    console.warn(`Aviso: escudo de ${nome} (Série B) não baixado (${(e as Error).message}).`);
  }
}
console.log(`Escudos da Série B copiados: ${okB} de ${Object.keys(serieB.escudos).length}.`);
