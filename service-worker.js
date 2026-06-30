const CACHE = "pirates-abyss-v247-desktop-download";
const APP_SHELL = [
  "./",
  "index.html",
  "styles.css?v=139",
  "auth.js?v=7",
  "game.js?v=245",
  "icon.svg",
  "manifest.webmanifest",
  "assets/effects/aura1.png",
  "assets/effects/reparo_barco_3sprites.png",
  "assets/ui/tabs/mobile/icon_combate_square.png",
  "assets/ui/tabs/mobile/icon_navio_square.png",
  "assets/ui/tabs/mobile/icon_mapa_square.png",
  "assets/ui/tabs/mobile/icon_capitao_square.png",
  "assets/ui/tabs/mobile/icon_prestigio_square.png",
  "assets/ui/tabs/mobile/icon_status_square.png",
  "assets/ui/combat/icon_ataque_especial.png?v=5",
  "assets/ui/combat/icon_reparos_emergencia.png?v=5",
  "assets/ui/combat/icon_boss.png?v=5",
  "assets/ui/combat/icon_retroceder_mapa.png?v=5",
  "assets/ui/combat/icon_avancar_mapa.png?v=5",
  "assets/ui/combat/icon_upgrade_melhoria_recomendada.png?v=5",
  "assets/ui/combat/icon_upgrade_equipamento_recomendado.png?v=5",
  "assets/maps/mapa_idle_mobile.jpg",
  "assets/newbackgrounds/login.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if (isNavigation) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("index.html", copy));
      return response;
    }).catch(() => caches.match("index.html")));
    return;
  }

  if (!isSameOrigin) return;
  if (url.pathname.endsWith("/online-config.js")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 204, headers: { "Content-Type": "application/javascript" } })));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      const copy = response.clone();
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    });
  }));
});
