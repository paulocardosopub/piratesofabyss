const CACHE = "pirates-abyss-v51-fixed-prologue-backgrounds";
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
const ENEMY_SPRITESHEET_ASSET_FILES = [
  "01_Remador_Rival_sprite_9frames.png",
  "02_Pescador_Primitivo_sprite_9frames.png",
  "03_Jacare_da_Lagoa_sprite_9frames.png",
  "04_Boss_Crocomar_Anciao_sprite_9frames.png",
  "05_Canoa_Tribal_sprite_9frames.png",
  "06_Cacador_do_Mangue_sprite_9frames.png",
  "07_Reptil_das_Raizes_sprite_9frames.png",
  "08_Boss_Deinosuchus_do_Mangue_sprite_9frames.png",
  "01_Canoa_de_Couro_sprite_9frames.png",
  "02_Pterodactilo_Cacador_sprite_9frames.png",
  "03_Remador_das_Ilhas_sprite_9frames.png",
  "04_Boss_Rei_Pteranodonte_sprite_9frames.png",
  "05_Jangada_de_Caca_sprite_9frames.png",
  "06_Ictiossauro_sprite_9frames.png",
  "07_Saqueador_da_Selva_sprite_9frames.png",
  "08_Boss_Mosasaurus_Jovem_sprite_9frames.png"
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
const PLAYER_SHIP_SPRITESHEET_ASSET_FILES = [
  "PLAYER-01_01_Bote_de_Tronco_sprite_9frames.png",
  "PLAYER-01_02_Jangada_de_Cipó_sprite_9frames.png",
  "PLAYER-01_03_Canoa_de_Caça_sprite_9frames.png",
  "PLAYER-01_04_Jangada_Reforçada_Primitiva_sprite_9frames.png",
  "PLAYER-01_05_Canoa_do_Titã_sprite_9frames.png",
  "PLAYER-01_06_Bote_Armado_sprite_9frames.png",
  "PLAYER-01_07_Jangada_Reforçada_sprite_9frames.png",
  "PLAYER-01_08_Barco_de_Pesca_Adaptado_sprite_9frames.png",
  "PLAYER-01_09_Escuna_Leve_sprite_9frames.png",
  "PLAYER-02_01_Escuna_Mercante_sprite_9frames.png",
  "PLAYER-02_02_Cutter_Real_sprite_9frames.png",
  "PLAYER-02_03_Brigantina_Pequena_sprite_9frames.png",
  "PLAYER-02_04_Corveta_Simples_sprite_9frames.png",
  "PLAYER-02_05_Brigantina_Pirata_sprite_9frames.png",
  "PLAYER-02_06_Corveta_Armada_sprite_9frames.png",
  "PLAYER-02_07_Galeota_sprite_9frames.png",
  "PLAYER-02_08_Navio_Mercante_Armado_sprite_9frames.png"
];
const ISLAND_ASSET_FILES = [
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
const FIXED_BACKGROUND_ASSET_FILES = [
  "01 - Lagoa dos Remadores.png",
  "02 - Manguezal dos Ancestrais.png",
  "03 - Ilha dos Pterodactilos.png",
  "04 - Selva dos Repteis Marinhos.png",
  "05 - Canal Ancestral.png"
];
const OCEAN_ASSET_FILES = [
  "16_fundo_do_mar_oceano.png"
];
const PET_ASSET_FILES = [
  "peixe_palhaco.png",
  "agua_viva.png",
  "tartaruga_marinha.png",
  "foca.png",
  "golfinho.png",
  "arraia_eletrica.png",
  "tubarao.png",
  "baleia_assassina.png",
  "megalodon.png",
  "kraken.png"
];
const CAPTAIN_ASSET_FILES = [
  "01 - Pirata Recruta Masculino.png",
  "01 - Pirata Recruta Feminino.png",
  "02 - Pirata Aventureiro Masculino.png",
  "02 - Pirata Aventureira Feminina.png",
  "03 - Pirata Corsário Masculino.png",
  "03 - Pirata Corsária Feminina.png",
  "04 - Pirata Saqueador Masculino.png",
  "04 - Pirata Saqueadora Feminina.png",
  "05 - Capitão Pirata Masculino.png",
  "05 - Capitã Pirata Feminina.png",
  "06 - Almirante Corsário Masculino.png",
  "06 - Almirante Corsária Feminina.png",
  "07 - Capitão do Abismo Masculino.png",
  "07 - Capitã do Abismo Feminina.png",
  "08 - Senhor dos Mares Sombrios Masculino.png",
  "08 - Senhora dos Mares Sombrios Feminina.png",
  "09 - Rei Pirata Abissal Masculino.png",
  "09 - Rainha Pirata Abissal Feminina.png",
  "10 - Pirata Lendário Masculino.png",
  "10 - Pirata Lendário Feminino.png"
];
const ASSETS = [
  "./",
  "index.html",
  "styles.css?v=39",
  "game.js?v=63",
  "icon.svg",
  "manifest.webmanifest",
  "assets/maps/mapa_idle_animado_barquinho_agua_vento.gif",
  ...FIXED_BACKGROUND_ASSET_FILES.map(file => `assets/newbackgrounds/${file}`),
  ...ENEMY_ASSET_FILES.map(file => `assets/enemies/${file}`),
  ...ENEMY_SPRITESHEET_ASSET_FILES.map(file => `assets/spritesenemies/${file}`),
  ...SHIP_ASSET_FILES.map(file => `assets/ships/${file}`),
  ...PLAYER_SHIP_SPRITESHEET_ASSET_FILES.map(file => `assets/spritesships/${file}`),
  ...ISLAND_ASSET_FILES.map(file => `assets/backgrounds/islands/${file}`),
  ...OCEAN_ASSET_FILES.map(file => `assets/backgrounds/ocean/${file}`),
  ...PET_ASSET_FILES.map(file => `assets/pets/${file}`),
  ...CAPTAIN_ASSET_FILES.map(file => `assets/pirates/${file}`)
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
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (isNavigation) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("index.html", copy));
      return response;
    }).catch(() => caches.match("index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("index.html"))));
});
