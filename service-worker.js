const CACHE = "pirates-abyss-v21-enemy-sprites";
const ENEMY_ASSET_FILES = [
  "barco_costeiro.png",
  "barco_mercante_pequeno.png",
  "boss_capitao_barba_de_ferro.png",
  "boss_crocomar_anciao.png",
  "boss_deinosuchus_do_mangue.png",
  "boss_leviata_jurassico.png",
  "boss_mosasaurus_jovem.png",
  "boss_rainha_corsaria_scarlet.png",
  "boss_rei_pteranodonte.png",
  "boss_tempestade_viva.png",
  "bote_de_pesca_hostil.png",
  "bote_pirata.png",
  "brigantina_pirata.png",
  "cacador_da_tormenta.png",
  "cacador_do_mangue.png",
  "canoa_de_couro.png",
  "canoa_de_guerra.png",
  "canoa_tribal.png",
  "corveta_da_marinha.png",
  "escuna_pirata.png",
  "escuna_rapida.png",
  "guardiao_do_canal.png",
  "ictiossauro.png",
  "jacare_da_lagoa.png",
  "jangada_de_caca.png",
  "jangada_de_pescador.png",
  "navio_danificado.png",
  "navio_de_carga.png",
  "navio_quebra_bloqueio.png",
  "patrulha_naval.png",
  "pequeno_contrabandista.png",
  "pescador_primitivo.png",
  "plesiossauro.png",
  "pterodactilo_cacador.png",
  "remador_das_ilhas.png",
  "remador_rival.png",
  "reptil_das_raizes.png",
  "saqueador_da_selva.png",
  "traineira_saqueadora.png",
  "transporte_de_ouro.png"
];
const ASSETS = [
  "./",
  "index.html",
  "styles.css?v=19",
  "game.js?v=21",
  "icon.svg",
  "manifest.webmanifest",
  ...ENEMY_ASSET_FILES.map(file => `assets/enemies/${file}`)
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("index.html"))));
});
