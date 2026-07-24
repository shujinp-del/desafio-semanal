const CACHE = "mms-v1";
const ARQUIVOS = [
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ARQUIVOS).catch(erro => {
        console.warn("Algum arquivo não foi cacheado ainda:", erro);
      });
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});