const CACHE = "mms-v2";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.ico"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
      .catch(erro => {
        console.warn(
          "Alguns arquivos não puderam ser armazenados no cache:",
          erro
        );
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(nomesCaches => {
        return Promise.all(
          nomesCaches
            .filter(nomeCache => nomeCache !== CACHE)
            .map(nomeCache => caches.delete(nomeCache))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(resposta => {
        if (
          resposta &&
          resposta.status === 200 &&
          resposta.type === "basic"
        ) {
          const copiaResposta = resposta.clone();

          caches.open(CACHE)
            .then(cache => {
              cache.put(event.request, copiaResposta);
            });
        }

        return resposta;
      })
      .catch(async () => {
        const respostaCache =
          await caches.match(event.request);

        if (respostaCache) {
          return respostaCache;
        }

        if (event.request.mode === "navigate") {
          const paginaInicial =
            await caches.match("./index.html");

          if (paginaInicial) {
            return paginaInicial;
          }
        }

        return new Response(
          "Conteúdo indisponível no momento.",
          {
            status: 503,
            statusText: "Offline",
            headers: {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          }
        );
      })
  );
});