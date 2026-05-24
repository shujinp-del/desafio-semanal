const CACHE_NAME = "desafio-semanal-v1"

const arquivos = [

  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"

]

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(arquivos))

  )
})

self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request)
      .then(response => {

        return response || fetch(event.request)

      })

  )
})