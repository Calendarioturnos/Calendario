/* Service worker propio de Calendario de turnos.
 * Antes este archivo cargaba un script externo de 3nbf4.com y no cacheaba
 * nada; ahora solo guarda una copia local de la app para que funcione
 * sin conexión. No carga scripts de terceros, no envía notificaciones
 * ni datos a ningún servidor.
 * Sube CACHE_NAME a 'turnos-v2', 'turnos-v3'... cada vez que cambie
 * index.html u otro archivo de la lista, para que los usuarios
 * instalados reciban la versión nueva.
 * Las descargas usan {cache:'reload'} para no traer una copia vieja
 * del caché HTTP del navegador.
 */
var CACHE_NAME = 'turnos-v5';
var ASSETS = [
  './',
  'index.html',
  'acerca.html',
  'privacidad.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(ASSETS.map(function (u) {
        return fetch(u, { cache: 'reload' }).then(function (r) {
          if (r && r.ok) return cache.put(u, r);
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // solo archivos propios
  // El archivo de versión nunca se cachea: siempre se lee fresco de la red,
  // o el aviso de actualización mostraría una versión vieja.
  if (url.pathname.endsWith('apk-version.json')) {
    event.respondWith(fetch(event.request, { cache: 'reload' }));
    return;
  }
  // Con internet, siempre la versión en vivo; sin internet, la copia
  // guardada. La copia solo es respaldo, nunca se muestra si hay red.
  // Clave sin query: la página se abre como /Calendario/ y como
  // /Calendario/?v=4, y si se guardan como claves distintas la copia
  // vieja queda pegada para siempre. Una sola entrada por archivo.
  var cacheKey = url.origin + url.pathname;
  event.respondWith(
    fetch(event.request, { cache: 'reload' }).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(cacheKey, copy);
        });
        return response;
      }
      return caches.match(cacheKey).then(function (cached) {
        return cached || response;
      });
    }).catch(function () {
      // Sin red: sirve la copia guardada; si no hay, la portada.
      return caches.match(cacheKey).then(function (cached) {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
