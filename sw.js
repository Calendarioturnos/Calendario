/* Service worker propio de Calendario de turnos.
 * Antes este archivo cargaba un script externo de 3nbf4.com y no cacheaba
 * nada; ahora solo guarda una copia local de la app para que funcione
 * sin conexión. No carga scripts de terceros, no envía notificaciones
 * ni datos a ningún servidor.
 * Sube CACHE_NAME a 'turnos-v2', 'turnos-v3'... cada vez que cambie
 * index.html u otro archivo de la lista, para que los usuarios
 * instalados reciban la versión nueva.
 */
var CACHE_NAME = 'turnos-v2';
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
      return cache.addAll(ASSETS);
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
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        // Sin red: si es una navegación, sirve la portada cacheada.
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return cached;
      });
      // Cache primero para abrir rápido sin conexión; la red actualiza en segundo plano.
      return cached || network;
    })
  );
});
