// Service worker: deixa o site abrir sem internet com a última versão vista.
// Página: rede primeiro (para pegar dados novos), cache se estiver offline.
// Arquivos com hash no nome (JS/CSS), fontes e escudos: cache primeiro, porque não mudam.

const CACHE = "brasileirao26-v3";
const PREFS = "brasileirao26-prefs";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== PREFS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put("./", copia));
          return r;
        })
        .catch(() => caches.match("./").then((r) => r || caches.match(req))),
    );
    return;
  }

  const estatico =
    (url.origin === location.origin && /\/assets\/|\.(png|webmanifest)$/.test(url.pathname)) ||
    /fonts\.(googleapis|gstatic)\.com|crests\.football-data\.org|(upload|thumb)\.wikimedia\.org|a\.espncdn\.com/.test(url.host);
  if (!estatico) return;
  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((resp) => {
          if (resp.ok || resp.type === "opaque") {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        }),
    ),
  );
});

// Avisos: de tempos em tempos (só com o app instalado, onde o navegador permitir), confere se há
// dados novos no site; se houver, avisa. O time favorito é guardado pela página em PREFS.
async function lerPref(chave) {
  const r = await (await caches.open(PREFS)).match(chave);
  return r ? r.text() : "";
}
async function gravarPref(chave, valor) {
  await (await caches.open(PREFS)).put(chave, new Response(valor));
}
async function conferirNovidades() {
  const r = await fetch("meta.json", { cache: "no-store" });
  if (!r.ok) return;
  const { atualizado } = await r.json();
  const visto = await lerPref("/meta-visto");
  if (!visto) return gravarPref("/meta-visto", atualizado);
  if (atualizado === visto) return;
  await gravarPref("/meta-visto", atualizado);
  const fav = await lerPref("/favorito");
  await self.registration.showNotification("Brasileirão 2026: resultados novos", {
    body: fav ? `Veja como ficaram as chances do ${fav}.` : "Veja como ficaram as chances.",
    icon: "icone-192.png",
    badge: "icone-192.png",
    tag: "novidades",
  });
}
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "novidades") e.waitUntil(conferirNovidades().catch(() => {}));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((ws) => (ws.length ? ws[0].focus() : self.clients.openWindow("./"))),
  );
});
