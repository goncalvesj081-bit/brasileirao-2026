// Service worker: deixa o site abrir sem internet com a última versão vista.
// Página: rede primeiro (para pegar dados novos), cache se estiver offline.
// Arquivos com hash no nome (JS/CSS), fontes e escudos: cache primeiro, porque não mudam.

const CACHE = "brasileirao26-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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
    /fonts\.(googleapis|gstatic)\.com|crests\.football-data\.org|upload\.wikimedia\.org/.test(url.host);
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
