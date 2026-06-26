const CACHE = "pirates-abyss-v23-scenery";
const ENEMY_ASSET_FILES = [
  "baleeiro_sombrio.png",
  "barco_costeiro.png",
  "barco_costeiro_congelado.png",
  "barco_mercante_pequeno.png",
  "boss_almirante_negro.png",
  "boss_capitao_barba_de_ferro.png",
  "boss_crocomar_anciao.png",
  "boss_deinosuchus_do_mangue.png",
  "boss_dragao_marinho_vulcanico.png",
  "boss_grande_armada_imperial.png",
  "boss_holandes_voador.png",
  "boss_jormungandr_de_gelo.png",
  "boss_kraken_primordial.png",
  "boss_leviata_jurassico.png",
  "boss_megalodon_ancestral.png",
  "boss_mosasaurus_jovem.png",
  "boss_rainha_corsaria_scarlet.png",
  "boss_rei_pteranodonte.png",
  "boss_tempestade_viva.png",
  "bote_da_marinha.png",
  "bote_de_pesca_hostil.png",
  "bote_pirata.png",
  "brigantina_pirata.png",
  "cacador_da_tormenta.png",
  "cacador_do_mangue.png",
  "canoa_de_couro.png",
  "canoa_de_guerra.png",
  "canoa_tribal.png",
  "carapaca_vulcanica.png",
  "contrabandista_abissal.png",
  "corsario_boreal.png",
  "corsario_disfarcado.png",
  "corsario_perdido.png",
  "corveta_da_marinha.png",
  "corveta_vulcanica.png",
  "cultista_do_kraken.png",
  "cutter_real.png",
  "dragao_marinho_jovem.png",
  "dreadnought_afundado.png",
  "escuna_fantasma.png",
  "escuna_pirata.png",
  "escuna_rapida.png",
  "fragata_congelada.png",
  "fragata_imperial.png",
  "fragata_pirata.png",
  "frota_imperial_perdida.png",
  "galeao_pirata.png",
  "galeao_real.png",
  "guardiao_do_canal.png",
  "ictiossauro.png",
  "jacare_da_lagoa.png",
  "jangada_de_caca.png",
  "jangada_de_pescador.png",
  "leviata_menor.png",
  "nau_espectral.png",
  "navio_almirante.png",
  "navio_amaldicoado.png",
  "navio_danificado.png",
  "navio_de_carga.png",
  "navio_de_linha.png",
  "navio_de_suprimentos.png",
  "navio_fantasma_do_gelo.png",
  "navio_fantasma_lendario.png",
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
  "saqueador_de_cinzas.png",
  "serpente_de_gelo.png",
  "serpente_marinha.png",
  "traineira_saqueadora.png",
  "transporte_de_obsidiana.png",
  "transporte_de_ouro.png",
  "transporte_ilegal.png",
  "vulto_do_triangulo.png"
];
const SHIP_ASSET_FILES = [
  "barco_de_pesca_adaptado.png",
  "black_abyss.png",
  "bote_armado.png",
  "bote_de_tronco.png",
  "brigantina_pequena.png",
  "brigantina_pirata.png",
  "canoa_de_caca.png",
  "canoa_do_tita.png",
  "corveta_armada.png",
  "corveta_simples.png",
  "cutter_real.png",
  "encouracado_imperial.png",
  "escuna_leve.png",
  "escuna_mercante.png",
  "fragata_corsaria.png",
  "fragata_fantasma.png",
  "fragata_real.png",
  "galeao_de_guerra.png",
  "galeao_mercante.png",
  "galeao_pirata.png",
  "galeota.png",
  "jangada_de_cipo.png",
  "jangada_reforcada.png",
  "jangada_reforcada_primitiva.png",
  "kraken_hunter.png",
  "navio_mercante_armado.png"
];
const ISLAND_BACKGROUND_FILES = [
  "01_lagoa_dos_primeiros_remadores.png",
  "02_manguezal_dos_ancestrais.png",
  "03_ilhas_dos_pterodactilos.png",
  "04_selva_dos_repteis_marinhos.png",
  "05_canal_do_tita_jurassico.png",
  "06_costa_dos_naufragos.png",
  "07_ilhas_comerciais.png",
  "08_mar_das_tempestades.png",
  "09_baia_dos_corsarios.png",
  "10_oceano_profundo.png",
  "11_triangulo_maldito.png",
  "12_mar_imperial.png",
  "13_arquipelago_vulcanico.png",
  "14_reino_congelado.png",
  "15_abismo_do_kraken.png"
];
const OCEAN_BACKGROUND_FILES = [
  "16_fundo_do_mar_oceano.png"
];
const ASSETS = [
  "./",
  "index.html",
  "styles.css?v=20",
  "game.js?v=30",
  "icon.svg",
  "manifest.webmanifest",
  ...ENEMY_ASSET_FILES.map(file => `assets/enemies/${file}`),
  ...SHIP_ASSET_FILES.map(file => `assets/ships/${file}`),
  ...ISLAND_BACKGROUND_FILES.map(file => `assets/backgrounds/islands/${file}`),
  ...OCEAN_BACKGROUND_FILES.map(file => `assets/backgrounds/ocean/${file}`)
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
