var C="turnos-mineros-v12";
var F=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).catch(function(){}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
// Abre al instante con la copia guardada y actualiza en segundo plano (nunca espera a la red).
self.addEventListener("fetch",function(e){
  var r=e.request;
  if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  e.respondWith(caches.open(C).then(function(c){
    return c.match(r).then(function(m){
      var red=fetch(r).then(function(n){if(n&&n.status===200)c.put(r,n.clone());return n}).catch(function(){return null});
      e.waitUntil(red);
      if(m)return m;
      return red.then(function(n){return n||c.match("index.html")});
    });
  }));
});
