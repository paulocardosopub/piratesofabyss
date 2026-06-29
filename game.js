(() => {
  "use strict";

  const SAVE_KEY = "pirates-of-the-abyss-save-v1";
  const COMBAT_MINIMIZED_KEY = "pirates-of-the-abyss-combat-minimized";
  const LEADERBOARD_LIMIT = 50;
  const ARENA_OPPONENT_LIMIT = 10;
  const ARENA_MIN_OPPONENTS = 5;
  const ARENA_ATTACK_INTERVAL_DEFAULT_MS = 1400;
  const ARENA_ATTACK_INTERVAL_MIN_MS = 900;
  const ARENA_ATTACK_INTERVAL_MAX_MS = 2200;
  const ARENA_BALANCED_ATTACK_INTERVAL_MS = ARENA_ATTACK_INTERVAL_DEFAULT_MS;
  const ARENA_HP_MULTIPLIER = 10;
  const ARENA_START_DELAY_MS = 3000;
  const PIRATE_NAME_MIN_LENGTH = 3;
  const PIRATE_NAME_MAX_LENGTH = 20;
  const PVP_SNAPSHOT_VERSION = 2;
  const POWER_FORMULA_VERSION = 2;
  const OFFLINE_REWARD_RATE = .3;
  const OFFLINE_MODAL_AUTO_HIDE_MS = 5000;
  const SHIP_UNLOCK_KILL_REQUIREMENT = 100;
  const COMMON_MONSTER_BALANCE_LAST_REGION = 10;
  const COMMON_MONSTER_BALANCE_MULTIPLIER = 4;
  const MAP_ONE_COMMON_MONSTER_DAMAGE_MULTIPLIER = .7;
  const EARLY_GAME_REWARD_MAP_COUNT = 5;
  const EARLY_GAME_REWARD_MULTIPLIER = .1;
  const PRESTIGE_REGION_NAME = "Oceano Profundo";
  const PRESTIGE_BOSS_NAME = "Megalodon Ancestral";
  const PET_PIRATE_COIN_COSTS = [10, 18, 30, 45, 65, 90, 120, 155, 200, 260];
  const PET_MAX_LEVEL = 5;
  const PET_BASE_STRENGTH_MULTIPLIER = 2;
  const PET_UPGRADE_POWER_STEP = .32;
  const PET_MIN_MONSTER_SPAWN_INTERVAL_MS = 280;
  const CAPTAIN_MAX_LEVEL = 10;
  const CAPTAIN_CHARACTER_ASSET_PATH = "assets/newpirates/";
  const EFFECT_ASSET_PATH = "assets/effects/";
  const CAPTAIN_MANUAL_SKILL_KEY = "sabotage";
  const CAPTAIN_REPAIR_SKILL_KEY = "emergencyRepair";
  const CAPTAIN_MANUAL_SKILL_BASE_COOLDOWN = 10;
  const CAPTAIN_MANUAL_SKILL_MAX_LEVEL = 20;
  const CAPTAIN_SABOTAGE_COST_MULTIPLIER = 2;
  const RESTORE_SHIP_REPAIR_BY_LEVEL = { 1: .25, 2: .5, 3: .75, 4: 1 };
  const RESTORE_SHIP_UPGRADE_COSTS = { 2: 4, 3: 8, 4: 10 };
  const EMERGENCY_REPAIR_COOLDOWN_SECONDS = 15;
  const EMERGENCY_REPAIR_DURATION_MS = 5000;
  const AUTO_REPAIR_DURATION_MS = 4000;
  const AUTO_REPAIR_FEES = [
    { maxMap: 5, gold: 100 },
    { maxMap: 10, gold: 500 },
    { maxMap: 13, gold: 5000 },
    { maxMap: 15, gold: 25000 }
  ];
  const CAPTAIN_HP_REGEN_INTERVAL_SECONDS = 5;
  const AUTO_ATTACK_CAPTAIN_LEVEL_REQUIRED = 2;
  const MANUAL_ATTACK_TUTORIAL_DURATION_MS = 30000;
  const CAPTAIN_REQUIRED_MESSAGE = "Escolha seu capitão primeiro!";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const integerBetween = (min, max) => Math.floor(randomBetween(min, max + 1));
  const nonPassiveListener = { passive: false };

  function preventCancelableDefault(event) {
    if (event.cancelable) event.preventDefault();
  }

  function installMobileGestureGuards() {
    let lastTouchEnd = 0;
    document.addEventListener("touchend", event => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) preventCancelableDefault(event);
      lastTouchEnd = now;
    }, nonPassiveListener);
    ["gesturestart", "gesturechange", "gestureend", "dblclick"].forEach(type => {
      document.addEventListener(type, preventCancelableDefault, nonPassiveListener);
    });
    ["touchstart", "touchmove"].forEach(type => {
      document.addEventListener(type, event => {
        if (event.touches && event.touches.length > 1) preventCancelableDefault(event);
      }, nonPassiveListener);
    });
  }

  installMobileGestureGuards();

  function createPlayerId() {
    const webCrypto = typeof crypto !== "undefined" ? crypto : null;
    if (webCrypto?.randomUUID) return webCrypto.randomUUID();
    const bytes = webCrypto?.getRandomValues ? webCrypto.getRandomValues(new Uint8Array(16)) : null;
    if (bytes) {
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    }
    return `pirate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function sanitizePirateName(value = "") {
    const text = String(value);
    const normalized = text.normalize ? text.normalize("NFKC") : text;
    return normalized
      .replace(/[\u0000-\u001f\u007f<>`"'&]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, PIRATE_NAME_MAX_LENGTH);
  }

  function sanitizeArenaDisplayName(value = "", fallback = "Pirata da Arena") {
    const text = String(value || "");
    const normalized = text.normalize ? text.normalize("NFKC") : text;
    const clean = normalized
      .replace(/[\u0000-\u001f\u007f<>`"'&]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
    return clean || fallback;
  }

  function isValidPirateName(value = state?.pirateName) {
    const clean = sanitizePirateName(value);
    return clean.length >= PIRATE_NAME_MIN_LENGTH && clean.length <= PIRATE_NAME_MAX_LENGTH;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function createLazyImage() {
    const image = new Image();
    image.decoding = "async";
    return image;
  }

  function requestSpriteImage(sprite, src, onLoad) {
    if (!sprite || sprite.loadFailed) return null;
    if (!sprite.image) sprite.image = createLazyImage();
    if (!sprite.requested) {
      sprite.requested = true;
      sprite.loadPromise = new Promise(resolve => {
        sprite.image.onload = () => {
          sprite.loaded = true;
          onLoad?.(sprite);
          resolve(true);
        };
        sprite.image.onerror = () => {
          sprite.loadFailed = true;
          resolve(false);
        };
      });
      sprite.image.src = src;
    }
    return sprite.image;
  }

  const preloadedImages = new Map();
  function preloadImageUrl(src) {
    if (!src) return Promise.resolve(false);
    if (preloadedImages.has(src)) return preloadedImages.get(src);
    const promise = new Promise(resolve => {
      const image = createLazyImage();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    });
    preloadedImages.set(src, promise);
    return promise;
  }

  const RESOURCE_META = {
    ouro: { name: "Ouro", icon: "●", rarity: "Comum", rarityKey: "common", regions: "Todas as regiões", chance: "100%", uses: "Todos os upgrades e navios" },
    madeira: { name: "Madeira", icon: "▰", rarity: "Comum", rarityKey: "common", regions: "Costa, Ilhas Comerciais", chance: "18–28%", uses: "Casco, convés e construção" },
    ferro: { name: "Ferro", icon: "◆", rarity: "Comum", rarityKey: "common", regions: "Costa, Corsários, Mar Imperial", chance: "12–20%", uses: "Canhões, blindagem e navios" },
    tecido: { name: "Tecido", icon: "◒", rarity: "Comum", rarityKey: "common", regions: "Costa, Ilhas Comerciais", chance: "16–24%", uses: "Velas e velocidade" },
    comida: { name: "Comida", icon: "♨", rarity: "Comum", rarityKey: "common", regions: "Ilhas Comerciais", chance: "25%", uses: "Operação e eficiência idle" },
    polvora: { name: "Pólvora", icon: "✹", rarity: "Incomum", rarityKey: "uncommon", regions: "Tempestades, Corsários", chance: "11–16%", uses: "Canhões e skills ofensivas" },
    pedra: { name: "Pedra", icon: "⬟", rarity: "Incomum", rarityKey: "uncommon", regions: "Arquipélago Vulcânico", chance: "17%", uses: "Defesa e reforços de casco" },
    cristal: { name: "Cristal", icon: "◇", rarity: "Raro", rarityKey: "rare", regions: "Tempestades e regiões avançadas", chance: "5–10%", uses: "Skills e upgrades mágicos" },
    perola: { name: "Pérola", icon: "◉", rarity: "Raro", rarityKey: "rare", regions: "Oceano Profundo", chance: "7%", uses: "Equipamentos e skills marítimas" },
    gema: { name: "Gema", icon: "♦", rarity: "Épico", rarityKey: "epic", regions: "Reino Congelado e Abismo", chance: "2–4%", uses: "Navios e equipamentos épicos" },
    ambar: { name: "Âmbar", icon: "⬢", rarity: "Épico", rarityKey: "epic", regions: "Triângulo Maldito", chance: "4%", uses: "Skills fantasmas e receitas" },
    fragmentos: { name: "Fragmentos Lendários", icon: "✦", rarity: "Lendário", rarityKey: "legendary", regions: "Abismo do Kraken", chance: "0,8%", uses: "Black Abyss e itens lendários" }
  };

  const RARITY_COLORS = { common: "#b5c5c4", uncommon: "#67d997", rare: "#64aef4", epic: "#c38af1", legendary: "#ffb349" };
  const RESOURCE_GOLD_VALUES = Object.freeze({
    madeira: 25,
    ferro: 35,
    tecido: 30,
    comida: 20,
    polvora: 75,
    pedra: 90,
    cristal: 300,
    perola: 450,
    gema: 1000,
    ambar: 1200,
    fragmentos: 10000
  });
  const FOOD_LOOT_SELL_GOLD_VALUE = 8;
  const SECONDARY_RESOURCE_KEYS = Object.keys(RESOURCE_GOLD_VALUES);

  function getResourceGoldValue(key) {
    return key === "ouro" ? 1 : RESOURCE_GOLD_VALUES[key] || 0;
  }

  function convertResourceAmountToGold(key, amount) {
    return Math.max(0, Number(amount) || 0) * getResourceGoldValue(key);
  }

  function convertResourceBundleToGold(bundle = {}) {
    return Object.entries(bundle || {}).reduce((sum, [key, amount]) => sum + convertResourceAmountToGold(key, amount), 0);
  }

  function goldOnlyBundle(bundle = {}) {
    return { ouro: Math.max(0, Math.round(convertResourceBundleToGold(bundle))) };
  }

  function isGoldOnlyCost(cost = {}) {
    return Object.keys(cost || {}).every(key => key === "ouro");
  }

  function scaleRewardAmount(amount, multiplier = 1) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) return 0;
    return Math.max(1, Math.round(value * multiplier));
  }

  function scaleRewardBundle(bundle = {}, multiplier = 1) {
    return Object.fromEntries(Object.entries(bundle || {}).map(([key, amount]) => [key, scaleRewardAmount(amount, multiplier)]));
  }

  function scaleReward(reward = {}, multiplier = 1) {
    return {
      ...reward,
      resources: scaleRewardBundle(reward.resources || {}, multiplier),
      xp: reward.xp ? scaleRewardAmount(reward.xp, multiplier) : reward.xp
    };
  }

  const CHEST_SPRITE_PATH = "assets/chests/";
  const CHEST_SPRITE_VERSION = "3";
  const CHEST_DROP_CHANCES = { monster: .05, boss: .30 };
  const CHEST_PIRATE_COIN_CHANCE = .10;
  const CHEST_OPEN_DURATION = .85;
  const CHEST_DEFINITIONS = {
    common: { id: "common", rarity: "comum", rarityKey: "common", file: "baumonstrocomum.png", gold: 5000, width: 72 },
    uncommon: { id: "uncommon", rarity: "incomum", rarityKey: "uncommon", file: "baumonstroincomum.png", gold: 15000, width: 74 },
    rare: { id: "rare", rarity: "raro", rarityKey: "rare", file: "baumonstroraro.png", gold: 35000, width: 78 },
    epic: { id: "epic", rarity: "epico", rarityKey: "epic", file: "baubossepico.png", gold: 65000, width: 82 },
    legendary: { id: "legendary", rarity: "lendario", rarityKey: "legendary", file: "baubosslendario.png", gold: 100000, width: 86 }
  };
  const CHEST_DROP_POOLS = {
    monster: [{ id: "common", weight: 72 }, { id: "uncommon", weight: 28 }],
    boss: [{ id: "rare", weight: 65 }, { id: "epic", weight: 25 }, { id: "legendary", weight: 10 }]
  };
  const CHEST_SPRITES = Object.fromEntries(Object.values(CHEST_DEFINITIONS).map(chest => [chest.id, {
    key: chest.id,
    image: createLazyImage(),
    file: chest.file,
    columns: 3,
    frames: 3,
    requested: false,
    loadFailed: false
  }]));

  function requestChestSprite(sprite) {
    if (!sprite) return null;
    return requestSpriteImage(sprite, `${CHEST_SPRITE_PATH}${sprite.file}?v=${CHEST_SPRITE_VERSION}`);
  }

  function getChestSprite(id) {
    return CHEST_SPRITES[id];
  }

  function measureChestSpriteFrameBounds(sprite, source) {
    if (!sprite || !source) return;
    const sourceWidth = source.width || source.naturalWidth || 0;
    const sourceHeight = source.height || source.naturalHeight || 0;
    const frames = sprite.frames || 3;
    if (!sourceWidth || !sourceHeight || frames <= 0) return;
    const cacheKey = `${sourceWidth}x${sourceHeight}:${frames}`;
    if (sprite.frameBoundsKey === cacheKey && sprite.frameBounds?.length) return;

    const frameWidth = Math.floor(sourceWidth / frames);
    const frameHeight = sourceHeight;
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(source, 0, 0);

    let data;
    try {
      data = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
    } catch {
      return;
    }

    const bounds = [];
    for (let frame = 0; frame < frames; frame++) {
      const frameX = frame * frameWidth;
      let left = frameWidth;
      let top = frameHeight;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = (y * sourceWidth + frameX + x) * 4;
          if (data[index + 3] <= 8) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      bounds[frame] = right >= left && bottom >= top
        ? { left, top, right, bottom, centerX: (left + right) / 2, bottomY: bottom }
        : { left: 0, top: 0, right: frameWidth, bottom: frameHeight, centerX: frameWidth / 2, bottomY: frameHeight * .72 };
    }
    sprite.frameBounds = bounds;
    sprite.referenceBounds = bounds[0] || bounds.find(Boolean);
    sprite.frameBoundsKey = cacheKey;
  }

  const PRIMITIVE_REGIONS = [
    { name: "Lagoa dos Primeiros Remadores", weather: "Águas tranquilas", description: "O primeiro remo, a primeira rota e os primeiros perigos.", boss: "Crocomar Ancião", enemies: ["Remador Rival", "Pescador Primitivo", "Jacaré da Lagoa"], drops: { madeira: .30, comida: .28, tecido: .12 }, baseHp: 24, baseDamage: 3, gold: 6, goldRange: [3, 9], bossGold: [60, 100], xp: 5, sky: "#9ec8b7", sea: "#398b82", land: "#6e925d", kind: "PRIMITIVO" },
    { name: "Manguezal dos Ancestrais", weather: "Névoa do mangue", description: "Raízes densas escondem caçadores e materiais antigos.", boss: "Deinosuchus do Mangue", enemies: ["Canoa Tribal", "Caçador do Mangue", "Réptil das Raízes"], drops: { madeira: .32, comida: .25, ferro: .08 }, baseHp: 34, baseDamage: 4, gold: 8, goldRange: [5, 12], bossGold: [90, 140], xp: 7, sky: "#789b79", sea: "#356d61", land: "#486b45", kind: "PRIMITIVO" },
    { name: "Ilhas dos Pterodáctilos", weather: "Ventos jurássicos", description: "Sombras aladas rondam canoas entre ilhas escarpadas.", boss: "Rei Pteranodonte", enemies: ["Canoa de Couro", "Pterodáctilo Caçador", "Remador das Ilhas"], drops: { madeira: .25, tecido: .20, comida: .22 }, baseHp: 46, baseDamage: 5.2, gold: 10, goldRange: [6, 15], bossGold: [120, 190], xp: 9, sky: "#d1a86c", sea: "#337b8a", land: "#766847", kind: "PRIMITIVO" },
    { name: "Selva dos Répteis Marinhos", weather: "Chuva tropical", description: "Predadores aquáticos cercam as rotas da selva.", boss: "Mosasaurus Jovem", enemies: ["Jangada de Caça", "Ictiossauro", "Saqueador da Selva"], drops: { madeira: .24, ferro: .11, comida: .26 }, baseHp: 60, baseDamage: 6.5, gold: 13, goldRange: [8, 19], bossGold: [170, 260], xp: 11, sky: "#618f72", sea: "#176d76", land: "#3f7349", kind: "PRIMITIVO" },
    { name: "Canal do Titã Jurássico", weather: "Tremores ancestrais", description: "A última travessia antes da verdadeira era pirata.", boss: "Leviatã Jurássico", enemies: ["Canoa de Guerra", "Plesiossauro", "Guardião do Canal"], drops: { madeira: .22, ferro: .14, tecido: .18, comida: .24 }, baseHp: 75, baseDamage: 7.5, gold: 16, goldRange: [9, 23], bossGold: [240, 360], xp: 13, sky: "#8e7967", sea: "#245c69", land: "#4a5941", kind: "PRIMITIVO" }
  ];

  const MAIN_REGIONS = [
    { name: "Costa dos Náufragos", weather: "Brisa costeira", description: "Mar calmo, naufrágios e saqueadores inexperientes.", boss: "Capitão Barba de Ferro", enemies: ["Saqueador da Costa", "Bote Renegado", "Pescador Hostil", "Corsário Perdido"], drops: { madeira: .28, ferro: .16, tecido: .22 }, baseHp: 86.4, baseDamage: 8.4, gold: 18, goldRange: [10, 25], bossGold: [500, 1000], xp: 14, sky: "#78b9c1", sea: "#167087", land: "#5d8b58", kind: "PIRATA" },
    { name: "Ilhas Comerciais", weather: "Céu aberto", description: "Portos ricos, mercantes e contrabandistas discretos.", boss: "Rainha Corsária Scarlet", enemies: ["Mercante Armado", "Contrabandista Veloz", "Guarda do Porto", "Corveta Mercante"], drops: { comida: .25, tecido: .24, madeira: .18 }, baseHp: 160, baseDamage: 15, gold: 32, goldRange: [20, 45], bossGold: [1000, 2000], xp: 31, sky: "#78b6d4", sea: "#17627e", land: "#659a61", kind: "MERCANTE" },
    { name: "Mar das Tempestades", weather: "Temporal elétrico", description: "Chuva, raios e embarcações endurecidas pelo caos.", boss: "Tempestade Viva", enemies: ["Brigue Trovejante", "Caçador da Tormenta", "Nau do Relâmpago", "Corsário das Nuvens"], drops: { polvora: .16, cristal: .065 }, baseHp: 350, baseDamage: 31, gold: 52, goldRange: [35, 70], bossGold: [2000, 4000], xp: 66, sky: "#394d61", sea: "#153d54", land: "#465a55", kind: "TEMPESTADE" },
    { name: "Baía dos Corsários", weather: "Fumaça de canhões", description: "Esconderijos rochosos e a elite dos contrabandistas.", boss: "Almirante Negro", enemies: ["Corveta Corsária", "Brigantina Negra", "Contrabandista de Armas", "Carrasco da Baía"], drops: { ferro: .20, polvora: .15 }, baseHp: 740, baseDamage: 61, gold: 72, goldRange: [50, 95], bossGold: [4000, 7500], xp: 135, sky: "#bd7964", sea: "#294b5d", land: "#4a4540", kind: "CORSÁRIO" },
    { name: "Oceano Profundo", weather: "Correntes abissais", description: "Águas escuras habitadas por feras e caçadores.", boss: "Megalodon Ancestral", enemies: ["Baleeiro Sombrio", "Caçador Abissal", "Serpente Marinha", "Nau do Recife"], drops: { perola: .075, cristal: .08 }, baseHp: 1550, baseDamage: 125, gold: 108, goldRange: [75, 140], bossGold: [7500, 12000], xp: 278, sky: "#2f6680", sea: "#092f48", land: "#364f52", kind: "CRIATURA" },
    { name: "Triângulo Maldito", weather: "Névoa espectral", description: "Navios fantasmas surgem e somem dentro da névoa.", boss: "Holandês Voador", enemies: ["Escuna Fantasma", "Tripulação Perdida", "Nau Espectral", "Vulto do Triângulo"], drops: { ambar: .045, cristal: .095 }, baseHp: 3250, baseDamage: 254, gold: 145, goldRange: [100, 190], bossGold: [12000, 20000], xp: 568, sky: "#536b6e", sea: "#173f4b", land: "#455653", kind: "FANTASMA" },
    { name: "Mar Imperial", weather: "Ventos de guerra", description: "Fortificações e frotas militares dominam o horizonte.", boss: "Grande Armada Imperial", enemies: ["Fragata Imperial", "Galeão Real", "Navio de Linha", "Encouraçado Imperial", "Frota Imperial"], drops: { ferro: .24, cristal: .095 }, baseHp: 22000, baseDamage: 1300, gold: 190, goldRange: [130, 250], bossGold: [20000, 35000], xp: 1650, sky: "#8ca7bb", sea: "#2b5c78", land: "#6c7568", kind: "MARINHA" },
    { name: "Arquipélago Vulcânico", weather: "Cinzas no ar", description: "Rochas negras, lava e criaturas cobertas de magma.", boss: "Dragão Marinho Vulcânico", enemies: ["Corsário Vulcânico", "Bote Flamejante", "Guardião de Lava", "Carapaça Vulcânica", "Dragão Marinho Jovem"], drops: { pedra: .2, ferro: .22, cristal: .1 }, baseHp: 52000, baseDamage: 3200, gold: 240, goldRange: [160, 320], bossGold: [35000, 60000], xp: 3600, sky: "#8c4d3e", sea: "#373743", land: "#342e2b", kind: "VULCÂNICO" },
    { name: "Reino Congelado", weather: "Nevasca cortante", description: "Icebergs, monstros gelados e navios presos no gelo.", boss: "Jormungandr de Gelo", enemies: ["Navio Congelado", "Corsário de Gelo", "Serpente Glacial", "Guardião Congelado", "Fragata Ártica"], drops: { cristal: .12, gema: .045 }, baseHp: 125000, baseDamage: 7200, gold: 335, goldRange: [220, 450], bossGold: [60000, 100000], xp: 7800, sky: "#b4d4df", sea: "#447b91", land: "#d2e2e1", kind: "GLACIAL" },
    { name: "Abismo do Kraken", weather: "O abismo desperta", description: "Redemoinhos, tentáculos e riquezas lendárias.", boss: "Kraken Primordial", enemies: ["Criatura Abissal", "Navio Amaldiçoado", "Tentáculo Menor", "Leviatã Jovem", "Guardião do Abismo", "Frota Fantasma"], drops: { fragmentos: .008, gema: .05, cristal: .13 }, baseHp: 320000, baseDamage: 18000, gold: 475, goldRange: [300, 650], bossGold: [100000, 180000], xp: 18000, sky: "#18293f", sea: "#071f38", land: "#242b38", kind: "ABISSAL" }
  ];
  const FIXED_BACKGROUND_PATH = "assets/newbackgrounds/";
  const ARENA_BACKGROUND_FILE = "00 - Arena.png";
  const FIXED_BACKGROUND_ASSET_FILES = [
    "01 - Lagoa dos Remadores.png",
    "02 - Manguezal dos Ancestrais.png",
    "03 - Ilha dos Pterodactilos.png",
    "04 - Selva dos Repteis Marinhos.png",
    "05 - Canal Ancestral.png",
    "06 - Costa dos Náufragos.png",
    "07 - Ilhas Comerciais (fortes da marinha).png",
    "08 - Mar das Tempestades.png",
    "09 - Baía dos Corsários.png",
    "10 - Oceano Profundo.png",
    "11 - Triangulo Maldito.png",
    "12 - Mar Imperial.png",
    "13 - Arquipelago Vulcanico.png",
    "14 - Reino Congelado.png",
    "15 - Abismo do Kraken.png"
  ];
  const REGIONS = [...PRIMITIVE_REGIONS, ...MAIN_REGIONS];
  FIXED_BACKGROUND_ASSET_FILES.forEach((file, index) => {
    const region = REGIONS[index];
    if (!region) return;
    region.dayNightCycle = false;
    region.fixedBackground = true;
    region.fixedBackgroundFile = file;
  });
  const PROLOGUE_MAP_ASSET = "assets/maps/mapa_idle_animado_barquinho_agua_vento.gif";
  const PROLOGUE_MAP_MOBILE_ASSET = "assets/maps/mapa_idle_mobile.jpg";
  const PROLOGUE_MAP_POINTS = [
    {
      id: "lagoa-primeiros-remadores",
      mapIndex: 1,
      title: "Lagoa dos Primeiros Remadores",
      x: 2.5,
      y: 66.5,
      width: 29,
      height: 28,
      description: "A primeira parada da jornada. Águas rasas, jangadas primitivas e uma rota segura para aprender os fundamentos da navegação."
    },
    {
      id: "manguezal-ancestrais",
      mapIndex: 2,
      title: "Manguezal dos Ancestrais",
      x: 4,
      y: 31.5,
      width: 32,
      height: 31,
      description: "Canais estreitos, raízes antigas e criaturas escondidas no mangue. O jogador começa a enfrentar riscos reais de exploração."
    },
    {
      id: "ilhas-pterodactilos",
      mapIndex: 3,
      title: "Ilhas dos Pterodáctilos",
      x: 36.5,
      y: 18.5,
      width: 29.5,
      height: 28.5,
      description: "Rochedos altos, ninhos nos penhascos e pterodáctilos sobrevoando a rota. Um mapa com sensação vertical e perigosa."
    },
    {
      id: "selva-repteis-marinhos",
      mapIndex: 4,
      title: "Selva dos Répteis Marinhos",
      x: 46.5,
      y: 51.5,
      width: 38.5,
      height: 32,
      description: "Uma ilha mais densa e selvagem, marcada por ossadas antigas e répteis marinhos rondando a costa."
    },
    {
      id: "canal-ancestral-primeiros",
      mapIndex: 5,
      title: "Canal Ancestral dos Primeiros",
      x: 69.5,
      y: 10.5,
      width: 27.5,
      height: 34,
      description: "O clímax do prólogo. Um canal antigo, redemoinhos, ruínas primitivas e criaturas sombrias guardando a passagem."
    }
  ];
  const JOURNEY_MAP_PARTS = [
    {
      id: "jornada-pirata-parte-1",
      title: "Jornada Pirata - Parte 1",
      subtitle: "Mapas 6 a 10",
      asset: "assets/maps/jornada_pirata_parte1_animado.gif",
      mobileAsset: "assets/maps/jornada_pirata_parte1_mobile.jpg",
      alt: "Mapa animado da Jornada Pirata parte 1",
      points: [
        { id: "costa-naufragos", mapIndex: 6, x: 0, y: 7, width: 36, height: 35, shape: "polygon(0 0, 77% 0, 100% 64%, 68% 100%, 12% 89%, 0 58%)" },
        { id: "ilhas-comerciais", mapIndex: 7, x: 35, y: 13, width: 39, height: 33, shape: "polygon(14% 0, 79% 0, 100% 55%, 75% 100%, 13% 88%, 0 34%)" },
        { id: "mar-tempestades", mapIndex: 8, x: 73, y: 8, width: 25, height: 40, shape: "polygon(18% 0, 100% 0, 96% 100%, 22% 88%, 0 45%)" },
        { id: "baia-corsarios", mapIndex: 9, x: 0, y: 47, width: 39, height: 42, shape: "polygon(0 12%, 83% 0, 100% 50%, 76% 100%, 6% 95%, 0 62%)" },
        { id: "oceano-profundo", mapIndex: 10, x: 44, y: 48, width: 52, height: 43, shape: "polygon(12% 0, 76% 0, 100% 58%, 86% 100%, 33% 94%, 0 56%)" }
      ]
    },
    {
      id: "jornada-pirata-parte-2",
      title: "Jornada Pirata - Parte 2",
      subtitle: "Mapas 11 a 15",
      asset: "assets/maps/jornada_pirata_parte2_animado.gif",
      mobileAsset: "assets/maps/jornada_pirata_parte2_mobile.jpg",
      alt: "Mapa animado da Jornada Pirata parte 2",
      points: [
        { id: "triangulo-maldito", mapIndex: 11, x: 0, y: 4, width: 38, height: 38, shape: "polygon(0 0, 76% 0, 100% 57%, 78% 100%, 8% 86%, 0 48%)" },
        { id: "mar-imperial", mapIndex: 12, x: 40, y: 6, width: 58, height: 35, shape: "polygon(11% 0, 100% 0, 96% 89%, 56% 100%, 0 67%, 0 21%)" },
        { id: "arquipelago-vulcanico", mapIndex: 13, x: 29, y: 31, width: 42, height: 35, shape: "polygon(22% 0, 86% 0, 100% 57%, 77% 100%, 17% 91%, 0 45%)" },
        { id: "reino-congelado", mapIndex: 14, x: 0, y: 47, width: 43, height: 44, shape: "polygon(0 23%, 62% 0, 100% 43%, 86% 100%, 10% 93%, 0 62%)" },
        { id: "abismo-kraken", mapIndex: 15, x: 55, y: 48, width: 43, height: 43, shape: "polygon(16% 0, 100% 0, 100% 91%, 44% 100%, 0 76%, 0 25%)" }
      ]
    }
  ];
  const MAP_BOARD_ASSETS = [
    { asset: PROLOGUE_MAP_ASSET, mobileAsset: PROLOGUE_MAP_MOBILE_ASSET },
    ...JOURNEY_MAP_PARTS.map(({ asset, mobileAsset }) => ({ asset, mobileAsset }))
  ];
  const MOBILE_ASSET_MEDIA = "(max-width: 768px), (orientation: landscape) and (max-height: 560px) and (max-width: 980px)";

  function prefersMobileMapAssets() {
    return window.matchMedia?.(MOBILE_ASSET_MEDIA)?.matches;
  }

  function preloadMapBoardAssets() {
    const useMobileAssets = prefersMobileMapAssets();
    const assets = MAP_BOARD_ASSETS.map(item => useMobileAssets ? item.mobileAsset || item.asset : item.asset);
    return Promise.allSettled(assets.map(preloadImageUrl));
  }

  const loadSceneSprite = src => {
    return { image: createLazyImage(), src, requested: false, loadFailed: false };
  };
  const FIXED_BACKGROUND_SPRITES = FIXED_BACKGROUND_ASSET_FILES.map(file => ({ file, ...loadSceneSprite(`${FIXED_BACKGROUND_PATH}${file}`) }));
  const ARENA_BACKGROUND_SPRITE = { file: ARENA_BACKGROUND_FILE, ...loadSceneSprite(`${FIXED_BACKGROUND_PATH}${ARENA_BACKGROUND_FILE}`) };

  function regionUsesFixedBackground(index) {
    const region = REGIONS[index];
    return Boolean(region?.fixedBackground && region.fixedBackgroundFile);
  }

  function getFixedBackgroundSprite(region) {
    if (region?.fixedBackgroundFile === ARENA_BACKGROUND_FILE) {
      requestSpriteImage(ARENA_BACKGROUND_SPRITE, ARENA_BACKGROUND_SPRITE.src);
      return ARENA_BACKGROUND_SPRITE;
    }
    const index = FIXED_BACKGROUND_ASSET_FILES.indexOf(region?.fixedBackgroundFile);
    const sprite = index >= 0 ? FIXED_BACKGROUND_SPRITES[index] : null;
    if (sprite) requestSpriteImage(sprite, sprite.src);
    return sprite;
  }

  const ISLAND_COMPOSITIONS = [
    [{ x: .42, width: .42, height: .30, sea: .055, alpha: .86 }, { x: .13, width: .22, height: .20, sea: .035, alpha: .54, spriteOffset: 1 }, { x: .80, width: .24, height: .22, sea: .04, alpha: .62, spriteOffset: 2 }],
    [{ x: .22, width: .30, height: .27, sea: .048, alpha: .72 }, { x: .68, width: .34, height: .28, sea: .06, alpha: .82 }, { x: .91, width: .16, height: .18, sea: .028, alpha: .45, spriteOffset: -1 }],
    [{ x: .50, width: .34, height: .32, sea: .045, alpha: .78 }, { x: .18, width: .20, height: .20, sea: .03, alpha: .5, spriteOffset: 1 }, { x: .83, width: .21, height: .22, sea: .038, alpha: .56, spriteOffset: 2 }],
    [{ x: .28, width: .36, height: .31, sea: .062, alpha: .8 }, { x: .72, width: .28, height: .24, sea: .045, alpha: .6, spriteOffset: -1 }],
    [{ x: .53, width: .40, height: .31, sea: .055, alpha: .84 }, { x: .84, width: .17, height: .18, sea: .032, alpha: .48, spriteOffset: 1 }],
    [{ x: .24, width: .32, height: .27, sea: .045, alpha: .72 }, { x: .63, width: .36, height: .30, sea: .058, alpha: .84 }, { x: .91, width: .16, height: .18, sea: .032, alpha: .45, spriteOffset: 1 }],
    [{ x: .17, width: .21, height: .19, sea: .032, alpha: .5, spriteOffset: -1 }, { x: .46, width: .34, height: .28, sea: .052, alpha: .78 }, { x: .78, width: .27, height: .24, sea: .045, alpha: .66, spriteOffset: 1 }],
    [{ x: .34, width: .32, height: .27, sea: .047, alpha: .72 }, { x: .76, width: .30, height: .26, sea: .055, alpha: .78 }],
    [{ x: .20, width: .24, height: .23, sea: .038, alpha: .5, spriteOffset: -1 }, { x: .58, width: .38, height: .31, sea: .055, alpha: .82 }, { x: .88, width: .16, height: .17, sea: .03, alpha: .42, spriteOffset: 1 }],
    [{ x: .47, width: .36, height: .30, sea: .055, alpha: .8 }, { x: .81, width: .18, height: .19, sea: .033, alpha: .48, spriteOffset: -1 }],
    [{ x: .25, width: .26, height: .24, sea: .04, alpha: .56 }, { x: .66, width: .34, height: .30, sea: .056, alpha: .76, spriteOffset: 1 }],
    [{ x: .40, width: .38, height: .30, sea: .052, alpha: .82 }, { x: .82, width: .20, height: .20, sea: .035, alpha: .5, spriteOffset: -1 }],
    [{ x: .26, width: .29, height: .25, sea: .046, alpha: .62 }, { x: .70, width: .35, height: .30, sea: .06, alpha: .82 }],
    [{ x: .18, width: .21, height: .20, sea: .034, alpha: .5, spriteOffset: -1 }, { x: .55, width: .40, height: .31, sea: .055, alpha: .84 }, { x: .87, width: .17, height: .18, sea: .031, alpha: .45 }],
    [{ x: .33, width: .32, height: .27, sea: .048, alpha: .64 }, { x: .72, width: .36, height: .31, sea: .06, alpha: .82 }]
  ];

  function getIslandComposition(index) {
    const layout = ISLAND_COMPOSITIONS[index % ISLAND_COMPOSITIONS.length] || ISLAND_COMPOSITIONS[0];
    const primary = layout.reduce((best, layer) => {
      const score = (layer.width || 0) * (layer.height || .26) * (layer.spriteOffset ? .85 : 1);
      const bestScore = (best.width || 0) * (best.height || .26) * (best.spriteOffset ? .85 : 1);
      return score > bestScore ? layer : best;
    }, layout[0]);
    return [{
      ...primary,
      x: clamp(.5 + (primary.x - .5) * .45, .36, .64),
      width: clamp(primary.width * 1.32, .42, .56),
      height: clamp((primary.height || .26) * 1.14, .30, .38),
      sea: clamp((primary.sea || .052) + .028, .075, .105),
      alpha: 1,
      spriteIndex: index + (primary.spriteOffset || 0)
    }];
  }

  function mapIslandLayersHtml(index) {
    return "";
  }

  const PRIMITIVE_SHIPS = [
    { name: "Bote de Tronco", type: "Primitivo", tier: 0, levelReq: 1, hp: 62, damage: 7, speed: 86, armor: 0, costs: { ouro: 0, madeira: 0 } },
    { name: "Jangada de Cipó", type: "Primitivo", tier: 0, levelReq: 1, hp: 76, damage: 9, speed: 91, armor: 1, costs: { ouro: 90, madeira: 24 } },
    { name: "Canoa de Caça", type: "Primitivo", tier: 0, levelReq: 2, hp: 92, damage: 12, speed: 96, armor: 1, costs: { ouro: 180, madeira: 44, comida: 16 } },
    { name: "Jangada Reforçada Primitiva", type: "Primitivo", tier: 0, levelReq: 2, hp: 112, damage: 15, speed: 99, armor: 2, costs: { ouro: 320, madeira: 68, tecido: 16 } },
    { name: "Canoa do Titã", type: "Primitivo", tier: 0, levelReq: 3, hp: 132, damage: 17, speed: 102, armor: 2, costs: { ouro: 520, madeira: 96, ferro: 24 } }
  ];

  const MAIN_SHIPS = [
    { name: "Bote Armado", type: "Pirata", tier: 1, levelReq: 1, hp: 140, damage: 18, speed: 103, armor: 2, costs: { ouro: 900, madeira: 100, ferro: 25 } },
    { name: "Jangada Reforçada", type: "Civil", tier: 1, levelReq: 2, hp: 175, damage: 21, speed: 108, armor: 3, costs: { ouro: 2600, madeira: 80 } },
    { name: "Barco de Pesca Adaptado", type: "Pescador", tier: 1, levelReq: 3, hp: 215, damage: 24, speed: 116, armor: 4, costs: { ouro: 5200, madeira: 90, tecido: 34 } },
    { name: "Escuna Leve", type: "Pirata", tier: 1, levelReq: 3, hp: 270, damage: 60, speed: 150, armor: 10, costs: { ouro: 8000, madeira: 110 } },
    { name: "Escuna Mercante", type: "Mercante", tier: 2, levelReq: 5, hp: 390, damage: 60, speed: 150, armor: 8, costs: { ouro: 18000, madeira: 210, tecido: 55 } },
    { name: "Cutter Real", type: "Marinha", tier: 2, levelReq: 7, hp: 530, damage: 65, speed: 158, armor: 12, costs: { ouro: 34000, madeira: 300, ferro: 90, tecido: 75 } },
    { name: "Brigantina Pequena", type: "Pirata", tier: 2, levelReq: 9, hp: 720, damage: 80, speed: 150, armor: 15, costs: { ouro: 38000, madeira: 300, ferro: 90, polvora: 35 } },
    { name: "Corveta Simples", type: "Marinha", tier: 2, levelReq: 12, hp: 990, damage: 105, speed: 162, armor: 19, costs: { ouro: 65000, madeira: 520, ferro: 160, tecido: 80 } },
    { name: "Brigantina Pirata", type: "Pirata", tier: 3, levelReq: 15, hp: 1500, damage: 160, speed: 172, armor: 24, costs: { ouro: 80000, madeira: 750, ferro: 260, polvora: 100 } },
    { name: "Corveta Armada", type: "Marinha", tier: 3, levelReq: 18, hp: 2250, damage: 230, speed: 178, armor: 31, costs: { ouro: 90000, madeira: 1100, ferro: 500, polvora: 180 } },
    { name: "Galeota", type: "Corsário", tier: 3, levelReq: 20, hp: 3100, damage: 310, speed: 185, armor: 38, costs: { ouro: 100000, madeira: 1500, ferro: 650, tecido: 240, pedra: 90 } },
    { name: "Navio Mercante Armado", type: "Mercante", tier: 3, levelReq: 22, hp: 4300, damage: 390, speed: 176, armor: 46, costs: { ouro: 120000, madeira: 1800, ferro: 750, tecido: 350, comida: 250 } },
    { name: "Galeão Mercante", type: "Mercante", tier: 4, levelReq: 23, hp: 6100, damage: 520, speed: 180, armor: 57, costs: { ouro: 120000, madeira: 1900, ferro: 850, tecido: 450, perola: 25 } },
    { name: "Galeão Pirata", type: "Pirata", tier: 4, levelReq: 24, hp: 7800, damage: 680, speed: 187, armor: 64, costs: { ouro: 140000, madeira: 1950, ferro: 950, polvora: 280 } },
    { name: "Fragata Real", type: "Marinha", tier: 4, levelReq: 25, hp: 10500, damage: 890, speed: 202, armor: 78, costs: { ouro: 140000, madeira: 2600, ferro: 1400, polvora: 450, cristal: 40 } },
    { name: "Fragata Corsária", type: "Corsário", tier: 4, levelReq: 30, hp: 13900, damage: 1190, speed: 214, armor: 88, costs: { ouro: 140000, madeira: 3200, ferro: 1800, polvora: 650, cristal: 65, perola: 40 } },
    { name: "Galeão de Guerra", type: "Pirata", tier: 5, levelReq: 25, hp: 18500, damage: 1580, speed: 205, armor: 105, costs: { ouro: 500000, madeira: 2000, ferro: 1000, polvora: 300 } },
    { name: "Encouraçado Imperial", type: "Marinha", tier: 5, levelReq: 50, hp: 29500, damage: 2400, speed: 218, armor: 145, costs: { ouro: 500000, madeira: 4000, ferro: 2500, polvora: 1200, pedra: 400, cristal: 100 } },
    { name: "Fragata Fantasma", type: "Espectral", tier: 5, levelReq: 65, hp: 44000, damage: 3600, speed: 245, armor: 170, costs: { ouro: 550000, madeira: 4500, ferro: 2500, ambar: 150, perola: 150, gema: 50 } },
    { name: "Kraken Hunter", type: "Caçador", tier: 5, levelReq: 72, hp: 57000, damage: 4700, speed: 238, armor: 205, costs: { ouro: 750000, madeira: 4800, ferro: 2800, polvora: 1600, cristal: 180, gema: 75, fragmentos: 15 } },
    { name: "Black Abyss", type: "Espectral", tier: 5, levelReq: 80, hp: 78000, damage: 6500, speed: 260, armor: 250, costs: { ouro: 1000000, madeira: 5000, ferro: 3000, polvora: 2000, cristal: 250, gema: 100, fragmentos: 25 } }
  ];
  const SHIPS = [...PRIMITIVE_SHIPS, ...MAIN_SHIPS].map((ship, id) => ({ id, bossReq: 0, ...ship }));
  const SHIP_UNLOCK_BY_MAP = Object.freeze({
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 7,
    7: 9,
    8: 11,
    9: 13,
    10: 15,
    11: 17,
    12: 19,
    13: 21,
    14: 23,
    15: 26
  });

  const ARENA_BOT_DEFINITIONS = [
    ["bot_arena_001", "Tonico Pé-de-Pano", "iniciante fraco", "Jangada Reforçada", 1, 6, 76, 14, 260, 1450],
    ["bot_arena_002", "Capitão Dente de Ouro", "iniciante agressivo", "Escuna Saqueadora", 1, 12, 90, 20, 580, 1250],
    ["bot_arena_003", "Marina Corte-Vento", "rápida e frágil", "Veleiro Corsário", 2, 20, 120, 27, 1340, 1500],
    ["bot_arena_004", "Barba de Coral", "tanque inicial", "Barcaça Blindada", 3, 30, 170, 40, 3120, 1300],
    ["bot_arena_005", "Anne Tempestade", "equilibrada", "Fragata Rebelde", 5, 45, 260, 60, 6310, 1400],
    ["bot_arena_006", "Corsário Vitorino", "canhão pesado", "Galeão Pirata", 8, 65, 470, 100, 13940, 1250],
    ["bot_arena_007", "Morgana Maré-Negra", "dano alto", "Galeão de Guerra", 12, 85, 850, 180, 31830, 1350],
    ["bot_arena_008", "Almirante Ossos Frios", "tanque de elite", "Encouraçado Imperial", 16, 110, 1600, 330, 63780, 1450],
    ["bot_arena_009", "Capitã Espectral Nyra", "elite fantasma", "Fragata Fantasma", 22, 140, 3100, 620, 127480, 1200],
    ["bot_arena_010", "Lorde Abissal Krakenzinho", "boss máximo", "Black Abyss", 30, 180, 5400, 1050, 229670, 1300]
  ];
  const ARENA_NORMALIZATION_BANDS = [
    { min: 1000, max: 10000, hp: [70, 100], damage: [8, 22] },
    { min: 10000, max: 50000, hp: [90, 170], damage: [18, 40] },
    { min: 50000, max: 150000, hp: [170, 320], damage: [40, 75] },
    { min: 150000, max: 500000, hp: [320, 850], damage: [75, 180] },
    { min: 500000, max: 1000000, hp: [850, 1600], damage: [180, 330] },
    { min: 1000000, max: 2000000, hp: [1600, 3100], damage: [330, 620] },
    { min: 2000000, max: 4000000, hp: [3100, 5500], damage: [620, 1100] }
  ];

  const ENEMY_CATEGORIES = {
    PESCADOR: { label: "PESCADOR", visual: "PESCADOR", hp: .66, damage: .48, armor: .45, gold: .72, xp: .78, attackSpeed: 1.12, evasion: .01, drops: { comida: .34, tecido: .18, madeira: .22 } },
    MERCANTE: { label: "COMERCIANTE", visual: "MERCANTE", hp: 1.08, damage: .62, armor: .9, gold: 1.65, xp: .95, attackSpeed: 1.08, evasion: .02, drops: { comida: .22, tecido: .2, madeira: .18 } },
    CONTRABANDISTA: { label: "CONTRABANDISTA", visual: "CONTRABANDISTA", hp: .9, damage: 1.05, armor: .75, gold: 1.2, xp: 1.12, attackSpeed: .76, evasion: .12, drops: { polvora: .22, ferro: .18, cristal: .025 } },
    PIRATA: { label: "PIRATA", visual: "PIRATA", hp: .94, damage: 1.22, armor: .72, gold: 1.05, xp: 1.08, attackSpeed: .9, evasion: .055, drops: {} },
    MARINHA: { label: "MARINHA", visual: "MARINHA", hp: 1.42, damage: 1.02, armor: 1.65, gold: 1.35, xp: 1.28, attackSpeed: 1.08, evasion: .025, drops: { ferro: .24 } },
    FANTASMA: { label: "NAVIO FANTASMA", visual: "FANTASMA", hp: 1.18, damage: 1.28, armor: 1.1, gold: 1.45, xp: 1.42, attackSpeed: .88, evasion: .1, drops: { ambar: .08, cristal: .08 } },
    CRIATURA: { label: "CRIATURA MARÍTIMA", visual: "ABISSAL", hp: 1.3, damage: 1.36, armor: 1.2, gold: 1.25, xp: 1.5, attackSpeed: .92, evasion: .06, drops: { perola: .1, cristal: .05 } }
  };

  const PRIMITIVE_ENCOUNTERS = [
    [{ name: "Remador Rival", category: "PESCADOR", tier: 0, weight: 3 }, { name: "Pescador Primitivo", category: "PESCADOR", tier: 0, weight: 2 }, { name: "Jacaré da Lagoa", category: "CRIATURA", tier: 0 }],
    [{ name: "Canoa Tribal", category: "PIRATA", tier: 0, weight: 2 }, { name: "Caçador do Mangue", category: "PESCADOR", tier: 0 }, { name: "Réptil das Raízes", category: "CRIATURA", tier: 0 }],
    [{ name: "Canoa de Couro", category: "PIRATA", tier: 0 }, { name: "Pterodáctilo Caçador", category: "CRIATURA", tier: 0, weight: 2 }, { name: "Remador das Ilhas", category: "PESCADOR", tier: 0 }],
    [{ name: "Jangada de Caça", category: "PESCADOR", tier: 0 }, { name: "Ictiossauro", category: "CRIATURA", tier: 0, weight: 2 }, { name: "Saqueador da Selva", category: "PIRATA", tier: 0 }],
    [{ name: "Canoa de Guerra", category: "PIRATA", tier: 0, weight: 2 }, { name: "Plesiossauro", category: "CRIATURA", tier: 0 }, { name: "Guardião do Canal", category: "MARINHA", tier: 0 }]
  ];

  const MAIN_REGION_ENCOUNTERS = [
    [{ name: "Jangada de Pescador", category: "PESCADOR", tier: 1, weight: 3 }, { name: "Barco Costeiro", category: "PESCADOR", tier: 1, weight: 3 }, { name: "Bote Pirata", category: "PIRATA", tier: 1 }, { name: "Pequeno Contrabandista", category: "CONTRABANDISTA", tier: 1 }, { name: "Escuna Pirata", category: "PIRATA", tier: 1 }],
    [{ name: "Bote de Pesca Hostil", category: "PESCADOR", tier: 1, weight: 2 }, { name: "Traineira Saqueadora", category: "PESCADOR", tier: 2, weight: 2 }, { name: "Barco Mercante Pequeno", category: "MERCANTE", tier: 1 }, { name: "Navio de Carga", category: "MERCANTE", tier: 2 }, { name: "Escuna Rápida", category: "CONTRABANDISTA", tier: 2 }, { name: "Patrulha Naval", category: "MARINHA", tier: 2 }, { name: "Transporte de Ouro", category: "MERCANTE", tier: 2 }],
    [{ name: "Brigantina Pirata", category: "PIRATA", tier: 3 }, { name: "Corveta da Marinha", category: "MARINHA", tier: 3 }, { name: "Navio Quebra-Bloqueio", category: "CONTRABANDISTA", tier: 3 }, { name: "Navio Danificado", category: "PIRATA", tier: 2 }, { name: "Caçador da Tormenta", category: "PIRATA", tier: 3 }],
    [{ name: "Escuna Pirata", category: "PIRATA", tier: 2 }, { name: "Corsário Disfarçado", category: "CONTRABANDISTA", tier: 3 }, { name: "Brigantina Pirata", category: "PIRATA", tier: 3 }, { name: "Transporte Ilegal", category: "CONTRABANDISTA", tier: 2 }, { name: "Fragata Pirata", category: "PIRATA", tier: 4 }],
    [{ name: "Baleeiro Sombrio", category: "PIRATA", tier: 3 }, { name: "Navio de Suprimentos", category: "MERCANTE", tier: 3 }, { name: "Contrabandista Abissal", category: "CONTRABANDISTA", tier: 3 }, { name: "Serpente Marinha", category: "CRIATURA", tier: 4 }, { name: "Galeão Pirata", category: "PIRATA", tier: 4 }],
    [{ name: "Escuna Fantasma", category: "FANTASMA", tier: 3 }, { name: "Nau Espectral", category: "FANTASMA", tier: 4 }, { name: "Navio Amaldiçoado", category: "FANTASMA", tier: 4 }, { name: "Corsário Perdido", category: "PIRATA", tier: 3 }, { name: "Vulto do Triângulo", category: "FANTASMA", tier: 5 }],
    [{ name: "Bote da Marinha", category: "MARINHA", tier: 2 }, { name: "Cutter Real", category: "MARINHA", tier: 2 }, { name: "Fragata Imperial", category: "MARINHA", tier: 4 }, { name: "Galeão Real", category: "MARINHA", tier: 4 }, { name: "Navio de Linha", category: "MARINHA", tier: 5 }, { name: "Navio Almirante", category: "MARINHA", tier: 5 }],
    [{ name: "Saqueador de Cinzas", category: "PIRATA", tier: 4 }, { name: "Transporte de Obsidiana", category: "MERCANTE", tier: 4 }, { name: "Corveta Vulcânica", category: "MARINHA", tier: 4 }, { name: "Carapaça Vulcânica", category: "CRIATURA", tier: 5 }, { name: "Dragão Marinho Jovem", category: "CRIATURA", tier: 5 }],
    [{ name: "Barco Costeiro Congelado", category: "PESCADOR", tier: 3 }, { name: "Corsário Boreal", category: "PIRATA", tier: 4 }, { name: "Fragata Congelada", category: "MARINHA", tier: 5 }, { name: "Navio Fantasma do Gelo", category: "FANTASMA", tier: 5 }, { name: "Serpente de Gelo", category: "CRIATURA", tier: 5 }],
    [{ name: "Cultista do Kraken", category: "PIRATA", tier: 5 }, { name: "Dreadnought Afundado", category: "FANTASMA", tier: 5 }, { name: "Frota Imperial Perdida", category: "MARINHA", tier: 5 }, { name: "Leviatã Menor", category: "CRIATURA", tier: 5 }, { name: "Navio Fantasma Lendário", category: "FANTASMA", tier: 5 }]
  ];
  const REGION_ENCOUNTERS = [...PRIMITIVE_ENCOUNTERS, ...MAIN_REGION_ENCOUNTERS];

  const SKILL_META = {
    fire: { name: "Canhão de Fogo", icon: "🔥", unlock: 5, cooldown: 8, factor: 1.8, burnDuration: 4, burnFactor: .22, effect: "2× de dano e incêndio por 4s.", materials: ["polvora", "ferro"] },
    ice: { name: "Canhão de Gelo", icon: "❄", unlock: 10, cooldown: 11, factor: 2.4, slowDuration: 5, effect: "4× de dano e ataque inimigo mais lento por 5s.", materials: ["cristal", "tecido"] },
    ghost: { name: "Canhão Fantasma", icon: "👻", unlock: 20, cooldown: 14, factor: 3.4, effect: "6× de dano espectral que ignora toda a armadura.", materials: ["ambar", "cristal"] },
    chain: { name: "Bolas de Corrente", icon: "⛓", unlock: 30, cooldown: 10, factor: 4.4, attackDelay: 2500, effect: "8,8× de dano e atrasa o próximo ataque em 2,5s.", materials: ["ferro", "perola"] }
  };

  const CAPTAIN_MANUAL_SKILL_META = {
    sabotage: {
      name: "Sabotar Inimigo",
      icon: "\u2739",
      cooldown: CAPTAIN_MANUAL_SKILL_BASE_COOLDOWN,
      baseMultiplier: 10,
      multiplierStep: 1.5,
      maxLevel: CAPTAIN_MANUAL_SKILL_MAX_LEVEL,
      description: "Golpe manual do pirata. Causa dano direto no inimigo atual e nunca dispara automaticamente."
    },
    emergencyRepair: {
      name: "Restaurar Navio",
      icon: "\u2665",
      cooldown: EMERGENCY_REPAIR_COOLDOWN_SECONDS,
      maxLevel: 4,
      description: "Skill manual do pirata. Restaura 25%, 50%, 75% ou 100% da vida máxima atual do navio."
    }
  };

  const EQUIPMENT_META = {
    compass: { name: "Bússola Naval", icon: "✥", effect: "+12% velocidade e +8% chance de loot", costs: { cristal: 200, perola: 50, ouro: 50000 } },
    spyglass: { name: "Luneta Imperial", icon: "⌕", effect: "+8% precisão e +7% crítico", costs: { cristal: 300, gema: 100, ouro: 75000 } },
    anchor: { name: "Âncora Reforçada", icon: "⚓", effect: "+20 armadura e +10% de vida", costs: { ferro: 1000, pedra: 200, ouro: 50000 } },
    amulet: { name: "Amuleto do Abismo", icon: "☠", effect: "+25% DPS e +20% contra bosses", costs: { ambar: 200, perola: 100, fragmentos: 10, ouro: 100000 } }
  };

  const TRADE_PRICES = {
    madeira: { buy: 25, sell: 10 },
    ferro: { buy: 35, sell: 15 },
    tecido: { buy: 30, sell: 12 },
    polvora: { buy: 75, sell: 30 },
    comida: { buy: 20, sell: 8 },
    pedra: { buy: 90, sell: 35 },
    cristal: { buy: 300, sell: 120 },
    gema: { buy: 1000, sell: 400 },
    perola: { buy: 450, sell: 180 },
    ambar: { buy: 1200, sell: 500 },
    fragmentos: { buy: 10000, sell: 3500 }
  };

  const ENVIRONMENT_LOOT = {
    bird: { name: "Pássaro", food: 10, color: "#ffd86f" },
    fish: { name: "Cardume de peixes", food: 20, color: "#65dff1" },
    shark: { name: "Tubarão", food: 30, color: "#91b9ca" },
    kraken: { name: "Kraken", food: 100, color: "#c485ff" }
  };

  const CAPTAIN_GENDERS = {
    male: { choice: "Capitão Masculino", label: "Capitão" },
    female: { choice: "Capitã Feminina", label: "Capitã" }
  };

  const CAPTAIN_LEVELS = [
    { names: { male: "Recruta Pirata", female: "Recruta Pirata" }, cost: 0, bonuses: { spawnBonus: .05, birdAutoCollect: .2, hpRegenPercentPerSecond: .01 } },
    { names: { male: "Corsário Iniciante", female: "Corsária Iniciante" }, cost: 100, bonuses: { spawnBonus: .08, birdAutoCollect: .2, hpRegenPercentPerSecond: .005 } },
    { names: { male: "Saqueador dos Mares", female: "Saqueadora dos Mares" }, cost: 300, bonuses: { spawnBonus: .1, sharkAutoCollect: .25, hpRegenPercentPerSecond: .005 } },
    { names: { male: "Capitão de Convés", female: "Capitã de Convés" }, cost: 750, bonuses: { spawnBonus: .12, birdAutoCollect: .2, hpRegenPercentPerSecond: .01 } },
    { names: { male: "Capitão Pirata", female: "Capitã Pirata" }, cost: 1500, bonuses: { spawnBonus: .15, sharkAutoCollect: .25, hpRegenPercentPerSecond: .01 } },
    { names: { male: "Comandante Corsário", female: "Comandante Corsária" }, cost: 3000, bonuses: { spawnBonus: .18, birdAutoCollect: .2, hpRegenPercentPerSecond: .01 } },
    { names: { male: "Senhor dos Mares", female: "Senhora dos Mares" }, cost: 6000, bonuses: { spawnBonus: .2, sharkAutoCollect: .25, hpRegenPercentPerSecond: .015 } },
    { names: { male: "Almirante Pirata", female: "Almirante Pirata" }, cost: 12000, bonuses: { spawnBonus: .25, birdAutoCollect: .2, hpRegenPercentPerSecond: .015 } },
    { names: { male: "Soberano do Abismo", female: "Soberana do Abismo" }, cost: 25000, bonuses: { spawnBonus: .3, sharkAutoCollect: .25, hpRegenPercentPerSecond: .02 } },
    { names: { male: "Pirata Lendário", female: "Pirata Lendária" }, cost: 60000, bonuses: { spawnBonus: .4, autoFoodBonus: .5, hpRegenPercentPerSecond: .03 } }
  ].map((entry, index) => ({ level: index + 1, ...entry }));

  const CAPTAIN_EQUIPMENT_MAX_TIER = 10;
  const CAPTAIN_SWORD_BONUS_PROGRESS = [.03, .10, .20, .35, .55, .80, 1.15, 1.60, 2.20, 3.00];
  const CAPTAIN_LIGHT_HANDS_BONUS_PROGRESS = CAPTAIN_SWORD_BONUS_PROGRESS.map(value => value * .5);
  function buildCaptainEquipmentTiers(names, bonusRows) {
    return names.map((name, index) => {
      const level = index + 1;
      return { level, name, bonuses: bonusRows[index], pointCost: level };
    });
  }

  const CAPTAIN_EQUIPMENT_META = {
    sword: {
      tierKey: "swordTier",
      category: "Estilos de Espada",
      shortName: "Espada",
      icon: "⚔",
      description: "Aumenta o dano dos ataques do barco.",
      tiers: buildCaptainEquipmentTiers(
        ["Faca de Marujo", "Lâmina de Convés", "Sabre de Saqueador", "Cutelo Corsário", "Espada do Capitão", "Sabre Dourado", "Lâmina do Kraken", "Espada Fantasma", "Sabre Abissal", "Espada Lendária do Abismo"],
        CAPTAIN_SWORD_BONUS_PROGRESS.map(shipDamageBonus => ({ shipDamageBonus }))
      )
    },
    firearm: {
      tierKey: "firearmTier",
      category: "Estilos de Arma de Fogo",
      shortName: "Arma",
      icon: "✹",
      description: "Aumenta a velocidade de ataque do barco.",
      tiers: buildCaptainEquipmentTiers(
        ["Pistola Enferrujada", "Pistola de Convés", "Mosquete Pirata", "Pistola Dupla", "Bacamarte Corsário", "Arma Dourada do Capitão", "Revólver de Maré Negra", "Pistola Fantasma", "Arma Abissal", "Disparo Lendário do Abismo"],
        [.02, .07, .14, .25, .40, .60, .85, 1.15, 1.55, 2.10].map(shipAttackSpeedBonus => ({ shipAttackSpeedBonus }))
      )
    },
    armor: {
      tierKey: "armorTier",
      category: "Armaduras/Vestes Piratas",
      shortName: "Armadura",
      icon: "◆",
      description: "Aumenta a vida máxima e a resistência do barco.",
      tiers: buildCaptainEquipmentTiers(
        ["Camisa de Marujo", "Colete de Couro Simples", "Veste de Corsário", "Casaco de Batalha", "Armadura do Capitão", "Casaco Dourado de Comando", "Couraça do Kraken", "Veste Fantasma", "Armadura Abissal", "Veste Lendária do Abismo"],
        [[.05, .01], [.12, .02], [.22, .04], [.38, .06], [.60, .09], [.90, .12], [1.30, .16], [1.80, .20], [2.45, .25], [3.30, .32]].map(([shipHpBonus, shipArmorBonus]) => ({ shipHpBonus, shipArmorBonus }))
      )
    },
    trick: {
      tierKey: "trickTier",
      category: "Habilidade de Trapacear",
      shortName: "Trapaça",
      icon: "♣",
      description: "Aumenta esquiva, crítico e chance de ataque duplo.",
      tiers: buildCaptainEquipmentTiers(
        ["Truque de Marujo", "Dado Viciado", "Carta na Manga", "Golpe Baixo", "Blefe de Capitão", "Tiro Escondido", "Trapaça Corsária", "Sorte Fantasma", "Pacto Abissal", "Trapaça Lendária"],
        [[.01, .02, .01], [.02, .04, .02], [.03, .07, .03], [.05, .10, .05], [.07, .14, .07], [.09, .18, .10], [.12, .23, .13], [.15, .29, .17], [.19, .36, .22], [.25, .45, .30]].map(([dodgeChance, critChance, doubleAttackChance]) => ({ dodgeChance, critChance, doubleAttackChance }))
      )
    },
    lightHands: {
      tierKey: "lightHandsTier",
      category: "Mãos Leves",
      shortName: "Mãos Leves",
      icon: "✋",
      description: "Aumenta ouro e XP ganhos ao saquear inimigos e recompensas.",
      tiers: buildCaptainEquipmentTiers(
        ["Dedos Ágeis", "Bolsos Rápidos", "Saque de Convés", "Furto Corsário", "Mãos de Capitão", "Roubo Dourado", "Saque do Kraken", "Furto Fantasma", "Mãos Abissais", "Mãos Lendárias do Abismo"],
        CAPTAIN_LIGHT_HANDS_BONUS_PROGRESS.map(value => ({ goldGainBonus: value, xpGainBonus: value }))
      )
    }
  };

  const PETS = [
    { name: "Peixe-palhaço", icon: "🐠", type: "Pet inicial", rarity: "Comum", rarityKey: "common", damage: 50, interval: 2, power: 300, levelReq: 1, costs: { ouro: 500, comida: 20 }, description: "Pequeno, ligeiro e sempre perto do casco.", color: "#ff9c45", visual: "fish" },
    { name: "Água-viva", icon: "🐙", type: "Aquático mágico", rarity: "Incomum", rarityKey: "uncommon", damage: 80, interval: 2.2, power: 480, levelReq: 3, costs: { ouro: 1200, comida: 40 }, description: "Flutua com um brilho azul e lança bolhas elétricas.", color: "#75dcff", visual: "jelly" },
    { name: "Tartaruga Marinha", icon: "🐢", type: "Defensivo", rarity: "Incomum", rarityKey: "uncommon", damage: 120, interval: 2.5, power: 720, levelReq: 5, costs: { ouro: 2500, comida: 75, madeira: 25 }, description: "Casco resistente que avança firme ao lado do navio.", color: "#67d997", visual: "turtle" },
    { name: "Foca", icon: "🐬", type: "Ágil", rarity: "Incomum", rarityKey: "uncommon", damage: 180, interval: 2, power: 1050, levelReq: 8, costs: { ouro: 5000, comida: 120 }, description: "Emerge em saltos rápidos para atingir o alvo.", color: "#b9d5dc", visual: "seal" },
    { name: "Golfinho", icon: "🐬", type: "Veloz", rarity: "Raro", rarityKey: "rare", damage: 300, interval: 1.7, power: 1700, levelReq: 12, costs: { ouro: 12000, comida: 250, perola: 5 }, description: "Nado elegante que acompanha saques mais longos.", color: "#5ab9ed", visual: "dolphin" },
    { name: "Arraia Elétrica", icon: "⚡", type: "Controle", rarity: "Raro", rarityKey: "rare", damage: 420, interval: 2.3, power: 2300, levelReq: 16, costs: { ouro: 20000, comida: 350, cristal: 10 }, description: "Descargas aquáticas iluminam o caminho da tripulação.", color: "#57ddff", visual: "ray" },
    { name: "Tubarão", icon: "🦈", type: "Ofensivo", rarity: "Épico", rarityKey: "epic", damage: 750, interval: 2, power: 3500, levelReq: 25, costs: { ouro: 50000, comida: 700, gema: 10 }, description: "Uma mordida brutal acompanhada por forte splash.", color: "#92aebb", visual: "shark" },
    { name: "Baleia Assassina", icon: "🐋", type: "Pesado", rarity: "Épico", rarityKey: "epic", damage: 1200, interval: 2.7, power: 5200, levelReq: 35, costs: { ouro: 100000, comida: 1200, gema: 15, perola: 10 }, description: "Orca imponente que escolta o navio nas rotas perigosas.", color: "#e4f1f0", visual: "orca" },
    { name: "Megalodon", icon: "🦈", type: "Lendário ofensivo", rarity: "Lendário", rarityKey: "legendary", damage: 2500, interval: 2.5, power: 11000, levelReq: 55, prestigeReq: 10, costs: { ouro: 500000, comida: 2500, gema: 50, perola: 25, fragmentos: 10 }, description: "Predador pré-histórico do Oceano Profundo.", color: "#ffb349", visual: "megalodon" },
    { name: "Kraken", icon: "🐙", type: "Mítico", rarity: "Mítico", rarityKey: "legendary", damage: 5000, interval: 3, power: 35000, levelReq: 75, prestigeReq: 20, costs: { ouro: 1500000, comida: 5000, gema: 100, ambar: 50, fragmentos: 25 }, description: "Tentáculos lendários que protegem a frota no abismo.", color: "#c485ff", visual: "kraken" }
  ].map((pet, id) => ({ id, dps: pet.damage / pet.interval, ...pet }));

  const PET_BONUS_LEVEL_VALUES = {
    shipAttackPercent: [0, 5, 10, 15, 20, 25],
    attackSpeedPercent: [0, 5, 10, 15, 20, 25],
    monsterSpawnPercent: [0, 5, 10, 15, 20, 25],
    hpRegenPercentPer5s: [0, 1, 3, 5, 7, 10],
    xpPercent: [0, 10, 20, 30, 40, 50],
    goldPercent: [0, 10, 20, 30, 40, 50]
  };
  const PET_FULL_BONUS_KEYS = ["shipAttackPercent", "attackSpeedPercent", "hpRegenPercentPer5s", "xpPercent", "goldPercent", "monsterSpawnPercent"];
  const PET_EMPTY_BONUSES = Object.freeze({
    shipAttackPercent: 0,
    attackSpeedPercent: 0,
    monsterSpawnPercent: 0,
    hpRegenPercentPer5s: 0,
    xpPercent: 0,
    goldPercent: 0
  });
  const PET_BONUS_DISPLAY = [
    ["shipAttackPercent", "Ataque"],
    ["attackSpeedPercent", "Veloc."],
    ["hpRegenPercentPer5s", "Regen"],
    ["xpPercent", "EXP"],
    ["goldPercent", "Gold"],
    ["monsterSpawnPercent", "Spawn"]
  ];

  function buildPetBonusLevels(keys, multiplier = 1) {
    return Object.fromEntries(Array.from({ length: PET_MAX_LEVEL }, (_, index) => {
      const level = index + 1;
      const bonuses = {};
      keys.forEach(key => {
        const value = Number(PET_BONUS_LEVEL_VALUES[key]?.[level] || 0) * multiplier;
        if (value > 0) bonuses[key] = value;
      });
      return [level, bonuses];
    }));
  }

  const PET_BONUS_CONFIG = {
    0: { name: PETS[0].name, bonusesByLevel: buildPetBonusLevels(["attackSpeedPercent"]) },
    1: { name: PETS[1].name, bonusesByLevel: buildPetBonusLevels(["hpRegenPercentPer5s"]) },
    2: { name: PETS[2].name, bonusesByLevel: buildPetBonusLevels(["shipAttackPercent"]) },
    3: { name: PETS[3].name, bonusesByLevel: buildPetBonusLevels(["attackSpeedPercent", "xpPercent"]) },
    4: { name: PETS[4].name, bonusesByLevel: buildPetBonusLevels(["hpRegenPercentPer5s", "goldPercent"]) },
    5: { name: PETS[5].name, bonusesByLevel: buildPetBonusLevels(["shipAttackPercent", "goldPercent", "xpPercent"]) },
    6: { name: PETS[6].name, bonusesByLevel: buildPetBonusLevels(PET_FULL_BONUS_KEYS) },
    7: { name: PETS[7].name, bonusesByLevel: buildPetBonusLevels(PET_FULL_BONUS_KEYS, 2) },
    8: { name: PETS[8].name, bonusesByLevel: buildPetBonusLevels(PET_FULL_BONUS_KEYS, 3) },
    9: { name: PETS[9].name, bonusesByLevel: buildPetBonusLevels(PET_FULL_BONUS_KEYS, 4) }
  };

  const PET_SPRITE_PATH = "assets/newpets/";
  const PET_SPRITE_CONFIG = {
    fish: { file: "PET-01_Peixe-Palhaço_sprite_3frames.png", width: 66, cardWidth: 86, anchorX: .42, anchorY: .58, offsetY: 2 },
    jelly: { file: "PET-02_Água-viva_sprite_3frames.png", width: 70, cardWidth: 88, anchorX: .44, anchorY: .57, offsetY: -3, seamWidth: 7 },
    turtle: { file: "PET-03_Tartaruga_Marinha_sprite_3frames.png", width: 76, cardWidth: 92, anchorX: .42, anchorY: .57, offsetY: 2 },
    seal: { file: "PET-04_Foca_sprite_3frames.png", width: 78, cardWidth: 94, anchorX: .42, anchorY: .6, offsetY: 4, bob: 7, preserveNeutralPixels: true, seamWidth: 5 },
    dolphin: { file: "PET-05_Golfinho_sprite_3frames.png", width: 88, cardWidth: 98, anchorX: .42, anchorY: .57, offsetY: -2, bob: 7 },
    ray: { file: "PET-06_Arraia_Elétrica_sprite_3frames.png", width: 92, cardWidth: 100, anchorX: .43, anchorY: .57, offsetY: 1 },
    shark: { file: "PET-07_Tubarão_sprite_3frames.png", width: 98, cardWidth: 104, anchorX: .42, anchorY: .57, offsetY: 1 },
    orca: { file: "PET-08_Baleia_Assassina_sprite_3frames.png", width: 106, cardWidth: 108, anchorX: .42, anchorY: .57, offsetY: 0 },
    megalodon: { file: "PET-09_Megalodon_sprite_3frames.png", width: 114, cardWidth: 112, anchorX: .42, anchorY: .57, offsetY: 1 },
    kraken: { file: "PET-10_Kraken_sprite_3frames.png", width: 120, cardWidth: 116, anchorX: .44, anchorY: .6, offsetY: -3, bob: 5 }
  };
  const PET_SPRITES = Object.fromEntries(Object.entries(PET_SPRITE_CONFIG).map(([visual, config]) => {
    const sprite = { key: visual, image: createLazyImage(), canvas: null, columns: 3, frames: 3, ready: false, processing: false, requested: false, loadFailed: false, frameBounds: null, referenceBounds: null, ...config };
    return [visual, sprite];
  }));

  function requestPetSprite(sprite) {
    if (!sprite) return null;
    return requestSpriteImage(sprite, `${PET_SPRITE_PATH}${sprite.file}`, () => {
      preparePetSpritesheet(sprite);
      requestAnimationFrame(() => renderPetPreviewCanvases());
    });
  }

  function getPetSprite(visual) {
    return PET_SPRITES[visual];
  }

  function getPetSpriteUrl(visual) {
    const sprite = getPetSprite(visual);
    return sprite ? `${PET_SPRITE_PATH}${sprite.file}` : "";
  }

  function getPetSpriteStyle(visual) {
    const sprite = getPetSprite(visual);
    if (!sprite) return "";
    const cardWidth = sprite.cardWidth || 112;
    return `--pet-sprite:url(${getPetSpriteUrl(visual)});--pet-card-sprite-size:${cardWidth}px;--pet-home-sprite-size:${Math.min(64, Math.round(cardWidth * .58))}px;--pet-current-sprite-size:${Math.min(78, Math.round(cardWidth * .7))}px;`;
  }

  function petSpriteHtml(visual) {
    return `<canvas class="pet-sprite-canvas" data-pet-preview="${visual || ""}" aria-hidden="true"></canvas>`;
  }

  function createCaptainManualSkillState() {
    return Object.fromEntries(Object.keys(CAPTAIN_MANUAL_SKILL_META).map(key => [key, { level: 1, nextReadyAt: 0 }]));
  }

  function getCaptainManualSkillState(key = CAPTAIN_MANUAL_SKILL_KEY, source = state) {
    if (!CAPTAIN_MANUAL_SKILL_META[key]) return null;
    if (!source.captainManualSkills) source.captainManualSkills = createCaptainManualSkillState();
    if (!source.captainManualSkills[key]) source.captainManualSkills[key] = { level: 1, nextReadyAt: 0 };
    return source.captainManualSkills[key];
  }

  function syncCaptainManualSkillState(target) {
    const saved = target.captainManualSkills || {};
    target.captainManualSkills = createCaptainManualSkillState();
    Object.entries(CAPTAIN_MANUAL_SKILL_META).forEach(([key, meta]) => {
      const skill = saved[key] || {};
      target.captainManualSkills[key] = {
        level: clamp(Math.floor(Number(skill.level || 1)), 1, meta.maxLevel),
        nextReadyAt: Math.max(0, Number(skill.nextReadyAt || 0))
      };
    });
    return target;
  }

  function getCaptainManualSkillLevel(key = CAPTAIN_MANUAL_SKILL_KEY, source = state) {
    const meta = CAPTAIN_MANUAL_SKILL_META[key];
    const skill = getCaptainManualSkillState(key, source);
    return meta && skill ? clamp(Math.floor(Number(skill.level || 1)), 1, meta.maxLevel) : 1;
  }

  function getCaptainManualSkillMultiplier(key = CAPTAIN_MANUAL_SKILL_KEY, level = getCaptainManualSkillLevel(key)) {
    const meta = CAPTAIN_MANUAL_SKILL_META[key];
    if (!meta) return 1;
    return Number((meta.baseMultiplier + (Math.max(1, level) - 1) * meta.multiplierStep).toFixed(1));
  }

  function getCaptainManualSkillCost(key = CAPTAIN_MANUAL_SKILL_KEY, level = getCaptainManualSkillLevel(key)) {
    const meta = CAPTAIN_MANUAL_SKILL_META[key];
    if (!meta || level >= meta.maxLevel) return null;
    if (key === CAPTAIN_REPAIR_SKILL_KEY) return RESTORE_SHIP_UPGRADE_COSTS[level + 1] ?? null;
    const baseCost = Math.ceil(level / 2);
    return key === CAPTAIN_MANUAL_SKILL_KEY ? baseCost * CAPTAIN_SABOTAGE_COST_MULTIPLIER : baseCost;
  }

  function getCaptainManualSkillSpentPoints(source = state) {
    return Object.keys(CAPTAIN_MANUAL_SKILL_META).reduce((sum, key) => {
      const level = getCaptainManualSkillLevel(key, source);
      let spent = 0;
      for (let step = 1; step < level; step += 1) spent += getCaptainManualSkillCost(key, step) || 0;
      return sum + spent;
    }, 0);
  }

  function formatCaptainManualMultiplier(value) {
    return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;
  }

  function getCaptainManualSkillCooldownRemaining(key = CAPTAIN_MANUAL_SKILL_KEY, now = Date.now()) {
    const skill = getCaptainManualSkillState(key);
    return Math.max(0, ((skill?.nextReadyAt || 0) - now) / 1000);
  }

  function getCaptainManualSkillDamage(key = CAPTAIN_MANUAL_SKILL_KEY, stats = getStats()) {
    return Math.round(stats.damage * getCaptainManualSkillMultiplier(key));
  }

  function getCaptainRepairPercent(level = getCaptainManualSkillLevel(CAPTAIN_REPAIR_SKILL_KEY)) {
    const cleanLevel = clamp(Math.floor(Number(level) || 1), 1, CAPTAIN_MANUAL_SKILL_META[CAPTAIN_REPAIR_SKILL_KEY].maxLevel);
    return RESTORE_SHIP_REPAIR_BY_LEVEL[cleanLevel] ?? RESTORE_SHIP_REPAIR_BY_LEVEL[1];
  }

  function formatCaptainRepairPercent(level = getCaptainManualSkillLevel(CAPTAIN_REPAIR_SKILL_KEY)) {
    return `${Math.round(getCaptainRepairPercent(level) * 100)}%`;
  }

  function createCaptainBonuses() {
    return { spawnBonus: 0, birdAutoCollect: 0, sharkAutoCollect: 0, hpRegenPercentPerSecond: 0, autoFoodBonus: 0 };
  }

  function createCaptainEquipmentState() {
    return Object.fromEntries(Object.values(CAPTAIN_EQUIPMENT_META).map(meta => [meta.tierKey, 0]));
  }

  function createCaptainEquipmentBonuses() {
    return { shipDamageBonus: 0, shipAttackSpeedBonus: 0, shipHpBonus: 0, shipArmorBonus: 0, dodgeChance: 0, critChance: 0, doubleAttackChance: 0, goldGainBonus: 0, xpGainBonus: 0 };
  }

  function getCaptainEquipmentTier(key, source = state) {
    const meta = CAPTAIN_EQUIPMENT_META[key];
    if (!meta) return 0;
    return clamp(Math.floor(Number(source?.captainEquipment?.[meta.tierKey] || 0)), 0, CAPTAIN_EQUIPMENT_MAX_TIER);
  }

  function getCaptainEquipmentTierData(key, tier = getCaptainEquipmentTier(key)) {
    const meta = CAPTAIN_EQUIPMENT_META[key];
    if (!meta || tier < 1) return null;
    return meta.tiers[clamp(tier, 1, CAPTAIN_EQUIPMENT_MAX_TIER) - 1] || null;
  }

  function getNextCaptainEquipmentTierData(key) {
    const tier = getCaptainEquipmentTier(key);
    return tier >= CAPTAIN_EQUIPMENT_MAX_TIER ? null : getCaptainEquipmentTierData(key, tier + 1);
  }

  function getCaptainEquipmentCost(key) {
    return getNextCaptainEquipmentTierData(key)?.pointCost || null;
  }

  function getCaptainEquipmentSpentPoints(source = state) {
    return Object.keys(CAPTAIN_EQUIPMENT_META).reduce((sum, key) => {
      const tier = getCaptainEquipmentTier(key, source);
      return sum + tier * (tier + 1) / 2;
    }, 0);
  }

  function calculateCaptainEquipmentBonuses(source = state) {
    const bonuses = createCaptainEquipmentBonuses();
    if (!normalizeCaptainGender(source?.captainSelectedGender) || Math.floor(Number(source?.captainLevel || 0)) <= 0) return bonuses;
    Object.keys(CAPTAIN_EQUIPMENT_META).forEach(key => {
      const tierData = getCaptainEquipmentTierData(key, getCaptainEquipmentTier(key, source));
      if (!tierData) return;
      Object.entries(tierData.bonuses).forEach(([bonusKey, value]) => { bonuses[bonusKey] += value; });
    });
    return bonuses;
  }

  function getCaptainEquipmentBonuses(source = state) {
    const bonuses = calculateCaptainEquipmentBonuses(source);
    if (source === state) state.captainEquipmentBonuses = bonuses;
    return bonuses;
  }

  function syncCaptainEquipmentState(target) {
    const saved = target.captainEquipment || {};
    target.captainEquipment = createCaptainEquipmentState();
    Object.values(CAPTAIN_EQUIPMENT_META).forEach(meta => {
      target.captainEquipment[meta.tierKey] = clamp(Math.floor(Number(saved[meta.tierKey] || 0)), 0, CAPTAIN_EQUIPMENT_MAX_TIER);
    });
    target.captainEquipmentBonuses = calculateCaptainEquipmentBonuses(target);
    return target;
  }

  function captainRuntimeXpNeeded(level = state?.captainRuntimeLevel || 1) {
    return Math.round(100 * Math.pow(Math.max(1, Number(level) || 1), 1.42));
  }

  function getAvailableLevelPoints(source = state) {
    return Math.max(0, Math.floor(Number(source.totalLevelPointsEarned || 0)) - Math.floor(Number(source.spentLevelPoints || 0)));
  }

  function syncCaptainRuntimeState(target, saved = target) {
    const hasRuntimeSave = saved.captainRuntimeLevel !== undefined || saved.totalLevelPointsEarned !== undefined || saved.spentLevelPoints !== undefined;
    const fallbackLevel = hasRuntimeSave ? 1 : Math.max(1, Math.floor(Number(target.pirateLevel || 1)));
    target.captainRuntimeLevel = Math.max(1, Math.floor(Number(saved.captainRuntimeLevel || fallbackLevel)));
    target.captainCurrentXp = Math.max(0, Number(saved.captainCurrentXp ?? (hasRuntimeSave ? 0 : target.xp || 0)) || 0);
    target.spentLevelPoints = getCaptainEquipmentSpentPoints(target) + getCaptainManualSkillSpentPoints(target);
    target.totalLevelPointsEarned = Math.max(target.spentLevelPoints, Math.floor(Number(saved.totalLevelPointsEarned ?? Math.max(0, target.captainRuntimeLevel - 1)) || 0));
    const needed = captainRuntimeXpNeeded(target.captainRuntimeLevel);
    while (target.captainCurrentXp >= needed) target.captainCurrentXp = needed - 1;
    target.captainXpToNextLevel = needed;
    target.availableLevelPoints = getAvailableLevelPoints(target);
    return target;
  }

  function addCaptainRuntimeXp(amount) {
    syncCaptainRuntimeState(state);
    state.captainCurrentXp += Math.max(0, Number(amount) || 0);
    let gainedPoints = 0;
    while (state.captainCurrentXp >= captainRuntimeXpNeeded(state.captainRuntimeLevel)) {
      state.captainCurrentXp -= captainRuntimeXpNeeded(state.captainRuntimeLevel);
      state.captainRuntimeLevel += 1;
      state.totalLevelPointsEarned += 1;
      gainedPoints += 1;
    }
    syncCaptainRuntimeState(state);
    if (gainedPoints) toast(`Capitão subiu ${gainedPoints} nível${gainedPoints > 1 ? "s" : ""}: +${gainedPoints} Ponto${gainedPoints > 1 ? "s" : ""} de Nível.`, "gold-toast");
  }

  function normalizeCaptainGender(value) {
    const normalized = String(value || "").toLowerCase();
    if (["male", "masculino", "m"].includes(normalized)) return "male";
    if (["female", "feminina", "feminino", "f"].includes(normalized)) return "female";
    return null;
  }

  function getCaptainBonusesForLevel(level = 0) {
    const bonuses = createCaptainBonuses();
    CAPTAIN_LEVELS.slice(0, clamp(Math.floor(Number(level) || 0), 0, CAPTAIN_MAX_LEVEL)).forEach(entry => {
      Object.entries(entry.bonuses).forEach(([key, value]) => { bonuses[key] += value; });
    });
    bonuses.birdAutoCollect = Math.min(1, bonuses.birdAutoCollect);
    bonuses.sharkAutoCollect = Math.min(1, bonuses.sharkAutoCollect);
    return bonuses;
  }

  function getCaptainLevelData(level) {
    return CAPTAIN_LEVELS[clamp(Math.floor(Number(level) || 1), 1, CAPTAIN_MAX_LEVEL) - 1];
  }

  function getCaptainImageUrl(level, gender) {
    const cleanGender = normalizeCaptainGender(gender);
    if (!cleanGender) return "";
    return `${CAPTAIN_CHARACTER_ASSET_PATH}${getCaptainCharacterFile(level, cleanGender)}`;
  }

  function getCaptainName(level, gender) {
    const cleanGender = normalizeCaptainGender(gender) || "male";
    return getCaptainLevelData(level).names[cleanGender] || getCaptainLevelData(level).names.male;
  }

  function syncCaptainState(target) {
    const gender = normalizeCaptainGender(target.captainSelectedGender);
    target.captainProgressPersistsAfterPrestige = true;
    if (!gender) {
      target.captainSelectedGender = null;
      target.captainLevel = 0;
      target.captainVisualImage = "";
      target.captainBonuses = createCaptainBonuses();
      target.captainUpgradePurchased = [];
      return target;
    }
    const level = clamp(Math.floor(Number(target.captainLevel || 1)), 1, CAPTAIN_MAX_LEVEL);
    target.captainSelectedGender = gender;
    target.captainLevel = level;
    target.captainVisualImage = getCaptainImageUrl(level, gender);
    target.captainBonuses = getCaptainBonusesForLevel(level);
    target.captainUpgradePurchased = Array.from({ length: level }, (_, index) => index + 1);
    return target;
  }

  const CAPTAIN_CHARACTER_POSES = { idle: 0, celebrate: 1, hit: 2 };
  const CAPTAIN_CHARACTER_REACTION_SECONDS = { celebrate: 2.35, hit: .42 };
  const CAPTAIN_CHARACTER_GENDER_FILE_KEYS = { male: "masculino", female: "feminino" };
  const PIRATE_CHARACTER_CONFIG = {
    boat_01: { scale: .445, offsetX: .063, offsetY: -5.186, deckY: .86, anchor: "deck", maxHeight: 112, embed: .08, railOverlap: .05, legCut: .2, layer: "front" },
    boat_02: { scale: .43, offsetX: .059, offsetY: -16.908, deckY: .85, anchor: "deck", maxHeight: 110, embed: .08, railOverlap: .01, legCut: 0, layer: "front" },
    boat_03: { scale: .4, offsetX: .009, offsetY: -35.159, deckY: .8, anchor: "deck", maxHeight: 112, embed: .08, railOverlap: .01, legCut: .14, layer: "front" },
    boat_04: { scale: .4, offsetX: -.034, offsetY: -20.861, deckY: .84, anchor: "deck", maxHeight: 112, embed: .08, railOverlap: .01, legCut: 0, layer: "front" },
    boat_05: { scale: .43, offsetX: -.002, offsetY: -14.566, deckY: .81, anchor: "deck", maxHeight: 114, embed: .08, railOverlap: .01, legCut: .15, layer: "front" },
    boat_06: { scale: .35, offsetX: .238, offsetY: -41.316, deckY: .78, anchor: "deck", maxHeight: 114, embed: .08, railOverlap: .01, legCut: 0, layer: "behind" },
    boat_07: { scale: .35, offsetX: -.037, offsetY: -19.067, deckY: .74, anchor: "deck", maxHeight: 112, embed: .08, railOverlap: .01, legCut: 0, layer: "front" },
    boat_08: { scale: .35, offsetX: .164, offsetY: .685, deckY: .76, anchor: "deck", maxHeight: 116, embed: .08, railOverlap: .01, legCut: .2, layer: "behind" },
    boat_09: { scale: .35, offsetX: .189, offsetY: -7.244, deckY: .78, anchor: "deck", maxHeight: 118, embed: .08, railOverlap: .01, legCut: 0, layer: "behind" },
    boat_10: { scale: .35, offsetX: -.233, offsetY: -40.087, deckY: .8, anchor: "deck", maxHeight: 118, embed: .08, railOverlap: .01, legCut: 0, layer: "behind" },
    boat_11: { scale: .405, offsetX: .041, offsetY: -15.674, deckY: .78, anchor: "deck", maxHeight: 120, embed: .08, railOverlap: .01, legCut: .2, layer: "front" },
    boat_12: { scale: .35, offsetX: .008, offsetY: -11.047, deckY: .78, anchor: "deck", maxHeight: 120, embed: .08, railOverlap: .01, legCut: .145, layer: "front" },
    boat_13: { scale: .398, offsetX: .035, offsetY: 9.695, deckY: .8, anchor: "deck", maxHeight: 122, embed: .08, railOverlap: .01, legCut: .25, layer: "front" },
    boat_14: { scale: .33, offsetX: .245, offsetY: -60.281, deckY: .77, anchor: "deck", maxHeight: 122, embed: .08, railOverlap: .01, legCut: .25, layer: "behind" },
    boat_15: { scale: .35, offsetX: .01, offsetY: -.074, deckY: .77, anchor: "deck", maxHeight: 124, embed: .08, railOverlap: .01, legCut: .25, layer: "front" },
    boat_16: { scale: .35, offsetX: .011, offsetY: 3.592, deckY: .78, anchor: "deck", maxHeight: 126, embed: .08, railOverlap: .01, legCut: .12, layer: "front" },
    boat_17: { scale: .25, offsetX: .23, offsetY: -56.05, deckY: .77, anchor: "deck", maxHeight: 128, embed: .4, railOverlap: .066, legCut: 0, layer: "behind" },
    boat_18: { scale: .25, offsetX: -.011, offsetY: 5.917, deckY: .8, anchor: "deck", maxHeight: 128, embed: .35, railOverlap: .07, legCut: .25, layer: "front" },
    boat_19: { scale: .25, offsetX: .218, offsetY: -30.694, deckY: .8, anchor: "deck", maxHeight: 128, embed: .43, railOverlap: .07, legCut: 0, layer: "behind" },
    boat_20: { scale: .25, offsetX: .041, offsetY: 9.035, deckY: .8, anchor: "deck", maxHeight: 130, embed: .43, railOverlap: .07, legCut: .15, layer: "front" },
    boat_21: { scale: .25, offsetX: .273, offsetY: -19.435, deckY: .81, anchor: "deck", maxHeight: 132, embed: .08, railOverlap: .01, legCut: .15, layer: "behind" },
    boat_22: { scale: .25, offsetX: .296, offsetY: -56.269, deckY: .82, anchor: "deck", maxHeight: 134, embed: .08, railOverlap: .08, legCut: 0, layer: "behind" },
    boat_23: { scale: .25, offsetX: -.064, offsetY: -36.93, deckY: .81, anchor: "deck", maxHeight: 136, embed: .2, railOverlap: .076, legCut: .1, layer: "front" },
    boat_24: { scale: .25, offsetX: -.059, offsetY: 5.592, deckY: .81, anchor: "deck", maxHeight: 136, embed: .5, railOverlap: .08, legCut: .12, layer: "front" },
    boat_25: { scale: .25, offsetX: -.031, offsetY: -12.825, deckY: .82, anchor: "deck", maxHeight: 138, embed: .35, railOverlap: .08, legCut: .12, layer: "front" },
    boat_26: { scale: .25, offsetX: -.027, offsetY: -7.312, deckY: .82, anchor: "deck", maxHeight: 140, embed: .08, railOverlap: .01, legCut: .1, layer: "front" }
  };

  const CAPTAIN_EDITOR_STORAGE_KEY = "piratesCaptainPositionDrafts";

  function isCaptainEditorEnabled() {
    return Boolean(VISUAL_AUDIT_CONFIG?.editCaptain);
  }

  function getCaptainEditorBoatKey(shipId) {
    const index = Math.floor(Number(shipId) || 0) + 1;
    return `boat_${String(index).padStart(2, "0")}`;
  }

  function loadCaptainEditorDrafts() {
    if (typeof localStorage === "undefined") return {};
    try {
      const saved = JSON.parse(localStorage.getItem(CAPTAIN_EDITOR_STORAGE_KEY) || "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch (error) {
      return {};
    }
  }

  function saveCaptainEditorDrafts() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(CAPTAIN_EDITOR_STORAGE_KEY, JSON.stringify(captainEditorDrafts));
      window.__captainEditorDrafts = captainEditorDrafts;
    } catch (error) {}
  }

  function sanitizeCaptainEditorConfig(config) {
    const layer = config.layer === "behind" ? "behind" : "front";
    return {
      scale: clamp(Number(config.scale ?? .4), .22, .7),
      offsetX: clamp(Number(config.offsetX ?? 0), -.5, .5),
      offsetY: clamp(Number(config.offsetY ?? 0), -80, 80),
      deckY: clamp(Number(config.deckY ?? .78), .52, .96),
      anchor: "deck",
      maxHeight: clamp(Number(config.maxHeight ?? 120), 64, 180),
      embed: clamp(Number(config.embed ?? .08), 0, .58),
      railOverlap: clamp(Number(config.railOverlap ?? .06), .01, .14),
      legCut: clamp(Number(config.legCut ?? 0), 0, .5),
      layer
    };
  }

  function setCaptainEditorDraft(shipId, patch = {}) {
    const key = getCaptainEditorBoatKey(shipId);
    const base = PIRATE_CHARACTER_CONFIG[key];
    if (!base) return null;
    const current = captainEditorDrafts[key] || base;
    const next = sanitizeCaptainEditorConfig({ ...current, ...patch });
    captainEditorDrafts[key] = next;
    saveCaptainEditorDrafts();
    return next;
  }

  function clearCaptainEditorDraft(shipId) {
    const key = getCaptainEditorBoatKey(shipId);
    delete captainEditorDrafts[key];
    saveCaptainEditorDrafts();
    return PIRATE_CHARACTER_CONFIG[key] || null;
  }

  function formatCaptainEditorNumber(value) {
    const number = Number(value) || 0;
    let text = number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (text === "-0") text = "0";
    if (text.startsWith("0.")) text = text.slice(1);
    if (text.startsWith("-0.")) text = `-.${text.slice(3)}`;
    return text;
  }

  function formatCaptainEditorConfigEntry(shipId, config = null) {
    const key = getCaptainEditorBoatKey(shipId);
    const current = sanitizeCaptainEditorConfig(config || getPirateCharacterBoatConfig(shipId) || PIRATE_CHARACTER_CONFIG[key] || {});
    return `${key}: { scale: ${formatCaptainEditorNumber(current.scale)}, offsetX: ${formatCaptainEditorNumber(current.offsetX)}, offsetY: ${formatCaptainEditorNumber(current.offsetY)}, deckY: ${formatCaptainEditorNumber(current.deckY)}, anchor: "deck", maxHeight: ${Math.round(current.maxHeight)}, embed: ${formatCaptainEditorNumber(current.embed)}, railOverlap: ${formatCaptainEditorNumber(current.railOverlap)}, legCut: ${formatCaptainEditorNumber(current.legCut)}, layer: "${current.layer}" }`;
  }

  function getPirateCharacterBoatConfig(shipId) {
    const key = getCaptainEditorBoatKey(shipId);
    const base = PIRATE_CHARACTER_CONFIG[key] || null;
    if (!base || !isCaptainEditorEnabled() || !captainEditorDrafts[key]) return base;
    return sanitizeCaptainEditorConfig({ ...base, ...captainEditorDrafts[key] });
  }

  function getCaptainCharacterFile(level, gender) {
    const cleanGender = normalizeCaptainGender(gender) || "male";
    const fileGender = CAPTAIN_CHARACTER_GENDER_FILE_KEYS[cleanGender] || CAPTAIN_CHARACTER_GENDER_FILE_KEYS.male;
    return `pirata_${fileGender}_tier_${String(clamp(Math.floor(Number(level) || 1), 1, CAPTAIN_MAX_LEVEL)).padStart(2, "0")}_3sprites.png`;
  }

  function createCaptainCharacterSpritesheet(level, gender) {
    const cleanGender = normalizeCaptainGender(gender) || "male";
    const file = getCaptainCharacterFile(level, cleanGender);
    const sprite = {
      key: `${cleanGender}:${level}`,
      image: createLazyImage(),
      canvas: null,
      file,
      columns: 3,
      frames: 3,
      ready: false,
      processing: false,
      requested: false,
      loadFailed: false,
      frameBounds: null,
      referenceBounds: null,
      frameBodyBounds: null,
      referenceBodyBounds: null,
      cleanupLightArtifacts: true
    };
    return sprite;
  }

  const CAPTAIN_CHARACTER_SPRITESHEETS = Object.fromEntries(
    ["male", "female"].flatMap(gender => Array.from({ length: CAPTAIN_MAX_LEVEL }, (_, index) => {
      const level = index + 1;
      return [`${gender}:${level}`, createCaptainCharacterSpritesheet(level, gender)];
    }))
  );

  function getCaptainCharacterSpritesheet(level, gender) {
    const cleanGender = normalizeCaptainGender(gender) || "male";
    const cleanLevel = clamp(Math.floor(Number(level) || 1), 1, CAPTAIN_MAX_LEVEL);
    return CAPTAIN_CHARACTER_SPRITESHEETS[`${cleanGender}:${cleanLevel}`] || CAPTAIN_CHARACTER_SPRITESHEETS["male:1"];
  }

  function getActiveCaptainCharacterSpritesheet() {
    return getCaptainCharacterSpritesheet(getCaptainLevel() || 1, getCaptainGender() || "male");
  }

  function requestCaptainCharacterSprite(sprite) {
    return requestSpriteImage(sprite, `${CAPTAIN_CHARACTER_ASSET_PATH}${sprite.file}`, item => {
      prepareCaptainCharacterSpritesheet(item);
      requestAnimationFrame(() => renderCaptainPreviewCanvases());
    });
  }

  function isCaptainCharacterBackgroundPixel(r, g, b, backgroundSamples) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const average = (r + g + b) / 3;
    if (max - min < 18 && average > 218) return true;
    return backgroundSamples.some(sample => Math.hypot(r - sample.r, g - sample.g, b - sample.b) < 32);
  }

  function isCaptainCharacterHaloPixel(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const average = (r + g + b) / 3;
    return max - min <= 28 && average >= 96;
  }

  function collectCaptainCharacterBackgroundSamples(data, width, height) {
    const points = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width * .25), 0], [Math.floor(width * .5), 0], [Math.floor(width * .75), 0],
      [Math.floor(width * .25), height - 1], [Math.floor(width * .5), height - 1], [Math.floor(width * .75), height - 1],
      [0, Math.floor(height * .25)], [0, Math.floor(height * .5)], [0, Math.floor(height * .75)],
      [width - 1, Math.floor(height * .25)], [width - 1, Math.floor(height * .5)], [width - 1, Math.floor(height * .75)]
    ];
    return points.map(([x, y]) => {
      const index = (y * width + x) * 4;
      return { r: data[index], g: data[index + 1], b: data[index + 2] };
    });
  }

  function cleanupCaptainCharacterLightArtifacts(data, width, height, backgroundSamples) {
    const total = width * height;
    const visited = new Uint8Array(total);
    const isBackgroundCandidate = point => {
      const index = point * 4;
      if (data[index + 3] <= 8) return false;
      return isCaptainCharacterBackgroundPixel(data[index], data[index + 1], data[index + 2], backgroundSamples);
    };
    const isCandidate = point => {
      const index = point * 4;
      if (data[index + 3] <= 8) return false;
      return isBackgroundCandidate(point) || isCaptainCharacterHaloPixel(data[index], data[index + 1], data[index + 2]);
    };
    const touchesTransparent = (x, y) => {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
          if (data[(ny * width + nx) * 4 + 3] <= 8) return true;
        }
      }
      return false;
    };
    for (let start = 0; start < total; start++) {
      if (visited[start] || !isCandidate(start)) continue;
      const queue = [start];
      const component = [];
      let head = 0;
      let nearTransparent = false;
      let backgroundPixels = 0;
      visited[start] = 1;
      while (head < queue.length) {
        const point = queue[head++];
        const x = point % width;
        const y = Math.floor(point / width);
        component.push(point);
        if (isBackgroundCandidate(point)) backgroundPixels++;
        if (touchesTransparent(x, y)) nearTransparent = true;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = y + oy;
          if (ny < 0 || ny >= height) continue;
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            const nx = x + ox;
            if (nx < 0 || nx >= width) continue;
            const next = ny * width + nx;
            if (visited[next] || !isCandidate(next)) continue;
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
      if (!nearTransparent && backgroundPixels < 120) continue;
      component.forEach(point => { data[point * 4 + 3] = 0; });
    }
  }

  function measureCaptainCharacterFrameBounds(sprite, data, width, height) {
    const frameWidth = Math.floor(width / sprite.columns);
    const frameHeight = height;
    const bounds = [];
    const bodyBounds = [];
    for (let frame = 0; frame < sprite.frames; frame++) {
      const frameX = frame * frameWidth;
      let left = frameWidth, top = frameHeight, right = -1, bottom = -1;
      const rowCounts = Array(frameHeight).fill(0);
      const colCounts = Array(frameWidth).fill(0);
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = (y * width + frameX + x) * 4;
          if (data[index + 3] <= 8) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
      const fallback = right >= left && bottom >= top
        ? { left, top, right, bottom, centerX: (left + right) / 2, bottomY: bottom, visibleHeight: bottom - top + 1 }
        : { left: frameWidth * .34, top: frameHeight * .16, right: frameWidth * .66, bottom: frameHeight * .92, centerX: frameWidth * .5, bottomY: frameHeight * .92, visibleHeight: frameHeight * .76 };
      bounds[frame] = fallback;

      const maxRow = Math.max(0, ...rowCounts);
      const maxCol = Math.max(0, ...colCounts);
      const rowThreshold = Math.max(4, Math.floor(maxRow * .1));
      const colThreshold = Math.max(4, Math.floor(maxCol * .08));
      let bodyTop = frameHeight, bodyBottom = -1, bodyLeft = frameWidth, bodyRight = -1;
      for (let y = fallback.top; y <= fallback.bottom; y++) {
        if (rowCounts[y] >= rowThreshold) {
          if (y < bodyTop) bodyTop = y;
          if (y > bodyBottom) bodyBottom = y;
        }
      }
      for (let x = fallback.left; x <= fallback.right; x++) {
        if (colCounts[x] >= colThreshold) {
          if (x < bodyLeft) bodyLeft = x;
          if (x > bodyRight) bodyRight = x;
        }
      }
      const body = bodyRight >= bodyLeft && bodyBottom >= bodyTop
        ? { left: bodyLeft, top: bodyTop, right: bodyRight, bottom: bodyBottom, centerX: (bodyLeft + bodyRight) / 2, bottomY: bodyBottom, visibleHeight: bodyBottom - bodyTop + 1 }
        : fallback;
      const bodyLooksValid = body.visibleHeight >= fallback.visibleHeight * .55 && body.visibleHeight <= fallback.visibleHeight * 1.05;
      bodyBounds[frame] = bodyLooksValid ? body : fallback;
    }
    sprite.frameBounds = bounds;
    sprite.referenceBounds = bounds[CAPTAIN_CHARACTER_POSES.idle] || bounds[0];
    sprite.frameBodyBounds = bodyBounds;
    sprite.referenceBodyBounds = bodyBounds[CAPTAIN_CHARACTER_POSES.idle] || bodyBounds[0] || sprite.referenceBounds;
  }

  function prepareCaptainCharacterSpritesheet(sprite) {
    const image = sprite.image;
    if (!image?.complete || !image.naturalWidth || sprite.ready || sprite.processing) return;
    sprite.processing = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      const width = canvas.width;
      const height = canvas.height;
      const backgroundSamples = collectCaptainCharacterBackgroundSamples(data, width, height);
      const visited = new Uint8Array(width * height);
      const queue = [];
      let head = 0;
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const point = y * width + x;
        if (visited[point]) return;
        const index = point * 4;
        if (data[index + 3] <= 8 || isCaptainCharacterBackgroundPixel(data[index], data[index + 1], data[index + 2], backgroundSamples)) {
          visited[point] = 1;
          data[index + 3] = 0;
          queue.push(point);
        }
      };
      for (let x = 0; x < width; x++) {
        push(x, 0);
        push(x, height - 1);
      }
      for (let y = 1; y < height - 1; y++) {
        push(0, y);
        push(width - 1, y);
      }
      while (head < queue.length) {
        const point = queue[head++];
        const x = point % width;
        const y = Math.floor(point / width);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            push(x + ox, y + oy);
          }
        }
      }
      if (sprite.cleanupLightArtifacts) cleanupCaptainCharacterLightArtifacts(data, width, height, backgroundSamples);
      measureCaptainCharacterFrameBounds(sprite, data, width, height);
      context.putImageData(pixels, 0, 0);
      sprite.canvas = canvas;
      sprite.ready = true;
    } catch (error) {
      sprite.canvas = null;
      sprite.ready = true;
    } finally {
      sprite.processing = false;
    }
  }

  function isPetSpritesheetBackgroundPixel(r, g, b, backgroundSamples, sprite = {}) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const average = (r + g + b) / 3;
    return backgroundSamples.some(sample => Math.hypot(r - sample.r, g - sample.g, b - sample.b) < 34)
      || (!sprite.preserveNeutralPixels && max - min <= 24 && average >= 86 && average <= 220);
  }

  function measurePetFrameBounds(sprite, data, width, height) {
    const frameWidth = Math.floor(width / sprite.columns);
    const frameHeight = height;
    const bounds = [];
    const bodyBounds = [];
    for (let frame = 0; frame < sprite.frames; frame++) {
      const frameX = frame * frameWidth;
      let left = frameWidth, top = frameHeight, right = -1, bottom = -1;
      const rowCounts = Array(frameHeight).fill(0);
      const colCounts = Array(frameWidth).fill(0);
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = (y * width + frameX + x) * 4;
          if (data[index + 3] <= 8) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
      const fallback = right >= left && bottom >= top
        ? { left, top, right, bottom, centerX: (left + right) / 2, bottomY: bottom, visibleHeight: bottom - top + 1 }
        : { left: frameWidth * .24, top: frameHeight * .12, right: frameWidth * .76, bottom: frameHeight * .9, centerX: frameWidth * .5, bottomY: frameHeight * .9, visibleHeight: frameHeight * .78 };
      bounds[frame] = fallback;

      const maxRow = Math.max(0, ...rowCounts);
      const maxCol = Math.max(0, ...colCounts);
      const rowThreshold = Math.max(5, Math.floor(maxRow * .12));
      const colThreshold = Math.max(5, Math.floor(maxCol * .14));
      let bodyTop = frameHeight, bodyBottom = -1, bodyLeft = frameWidth, bodyRight = -1;
      for (let y = fallback.top; y <= fallback.bottom; y++) {
        if (rowCounts[y] >= rowThreshold) {
          if (y < bodyTop) bodyTop = y;
          if (y > bodyBottom) bodyBottom = y;
        }
      }
      for (let x = fallback.left; x <= fallback.right; x++) {
        if (colCounts[x] >= colThreshold) {
          if (x < bodyLeft) bodyLeft = x;
          if (x > bodyRight) bodyRight = x;
        }
      }
      const body = bodyRight >= bodyLeft && bodyBottom >= bodyTop
        ? { left: bodyLeft, top: bodyTop, right: bodyRight, bottom: bodyBottom, centerX: (bodyLeft + bodyRight) / 2, bottomY: bodyBottom, visibleHeight: bodyBottom - bodyTop + 1 }
        : fallback;
      const bodyLooksValid = body.visibleHeight >= fallback.visibleHeight * .45 && body.visibleHeight <= fallback.visibleHeight * 1.08;
      bodyBounds[frame] = bodyLooksValid ? body : fallback;
    }
    const idleBodies = [bodyBounds[0], bodyBounds[1]].filter(Boolean);
    const average = key => idleBodies.reduce((sum, item) => sum + item[key], 0) / Math.max(1, idleBodies.length);
    sprite.frameBounds = bounds;
    sprite.referenceBounds = bounds[0] || bounds.find(Boolean);
    sprite.frameBodyBounds = bodyBounds;
    sprite.referenceBodyBounds = idleBodies.length
      ? {
          left: average("left"),
          top: average("top"),
          right: average("right"),
          bottom: average("bottom"),
          centerX: average("centerX"),
          bottomY: average("bottomY"),
          visibleHeight: average("visibleHeight")
        }
      : bodyBounds[0] || sprite.referenceBounds;
  }

  function preparePetSpritesheet(sprite) {
    const image = sprite?.image;
    if (!image?.complete || !image.naturalWidth || sprite.ready || sprite.processing) return;
    sprite.processing = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      const width = canvas.width;
      const height = canvas.height;
      const backgroundSamples = collectCaptainCharacterBackgroundSamples(data, width, height);
      const visited = new Uint8Array(width * height);
      const queue = [];
      let head = 0;
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const point = y * width + x;
        if (visited[point]) return;
        const index = point * 4;
        if (data[index + 3] <= 8 || isPetSpritesheetBackgroundPixel(data[index], data[index + 1], data[index + 2], backgroundSamples, sprite)) {
          visited[point] = 1;
          data[index + 3] = 0;
          queue.push(point);
        }
      };
      for (let x = 0; x < width; x++) {
        push(x, 0);
        push(x, height - 1);
      }
      for (let y = 1; y < height - 1; y++) {
        push(0, y);
        push(width - 1, y);
      }
      while (head < queue.length) {
        const point = queue[head++];
        const x = point % width;
        const y = Math.floor(point / width);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            push(x + ox, y + oy);
          }
        }
      }
      const frameWidth = Math.floor(width / (sprite.frames || 3));
      const seamWidth = Math.max(2, Math.floor(Number(sprite.seamWidth || 4)));
      for (let seam = frameWidth; seam < width; seam += frameWidth) {
        for (let x = Math.max(0, seam - seamWidth); x <= Math.min(width - 1, seam + seamWidth); x++) {
          for (let y = 0; y < height; y++) data[(y * width + x) * 4 + 3] = 0;
        }
      }
      measurePetFrameBounds(sprite, data, width, height);
      context.putImageData(pixels, 0, 0);
      sprite.canvas = canvas;
      sprite.ready = true;
    } catch (error) {
      sprite.canvas = null;
      sprite.ready = true;
    } finally {
      sprite.processing = false;
    }
  }

  function setupSpritePreviewCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 64));
    const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || width));
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    return { context, width, height };
  }

  function drawSpritesheetPreview(canvas, sprite, options = {}) {
    const image = sprite?.image;
    if (!canvas || !image?.complete || !image.naturalWidth) return false;
    if (!sprite.ready && !sprite.processing) (options.prepareSpritesheet || prepareCaptainCharacterSpritesheet)(sprite);
    const source = sprite.canvas || image;
    const columns = sprite.columns || sprite.frames || 3;
    const frame = clamp(Math.floor(Number(options.frame ?? 0) || 0), 0, (sprite.frames || columns) - 1);
    const sourceWidth = source.width || image.naturalWidth;
    const sourceHeight = source.height || image.naturalHeight;
    const frameWidth = Math.floor(sourceWidth / columns);
    const frameHeight = sourceHeight;
    const fallbackBounds = {
      left: frameWidth * .2,
      top: frameHeight * .08,
      right: frameWidth * .8,
      bottom: frameHeight * .94,
      centerX: frameWidth * .5,
      bottomY: frameHeight * .94,
      visibleHeight: frameHeight * .86
    };
    const bounds = options.useBodyBounds
      ? sprite.frameBodyBounds?.[frame] || sprite.referenceBodyBounds || sprite.frameBounds?.[frame] || sprite.referenceBounds || fallbackBounds
      : sprite.frameBounds?.[frame] || sprite.referenceBounds || fallbackBounds;
    const visibleWidth = Math.max(1, bounds.right - bounds.left + 1);
    const visibleHeight = Math.max(1, bounds.bottom - bounds.top + 1);
    const { context, width, height } = setupSpritePreviewCanvas(canvas);
    const fill = options.fill ?? .9;
    const maxWidthScale = width * fill / visibleWidth;
    const maxHeightScale = height * fill / visibleHeight;
    const scale = options.scale || Math.min(maxWidthScale, maxHeightScale);
    let drawX = width * (options.centerX ?? .5) - bounds.centerX * scale;
    let drawY;
    if (options.center) {
      drawY = height * (options.centerY ?? .5) - (bounds.top + visibleHeight / 2) * scale;
    } else {
      drawY = height * (options.alignY ?? .95) - bounds.bottomY * scale;
    }
    drawX += (options.offsetX || 0) * width;
    drawY += (options.offsetY || 0) * height;
    context.drawImage(source, frame * frameWidth, 0, frameWidth, frameHeight, drawX, drawY, frameWidth * scale, frameHeight * scale);
    return true;
  }

  function captainSpriteCanvasHtml(level, gender, variant = "portrait") {
    return `<canvas class="captain-sprite-canvas ${variant}" data-captain-preview-level="${level}" data-captain-preview-gender="${normalizeCaptainGender(gender) || "male"}" data-captain-preview-variant="${variant}" aria-hidden="true"></canvas>`;
  }

  function drawPreviewCanvas(canvas) {
    if (canvas.dataset.captainPreviewLevel) return drawCaptainPreviewCanvas(canvas);
    if (canvas.dataset.petPreview !== undefined) return drawPetPreviewCanvas(canvas);
    return false;
  }

  const previewCanvasObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const canvas = entry.target;
          previewCanvasObserver.unobserve(canvas);
          delete canvas.dataset.previewObserved;
          drawPreviewCanvas(canvas);
        });
      }, { root: $("#app"), rootMargin: "180px 0px" })
    : null;

  function queuePreviewCanvas(canvas) {
    if (!previewCanvasObserver) {
      drawPreviewCanvas(canvas);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const visibleSoon = rect.width > 0 && rect.height > 0 && rect.bottom >= -180 && rect.top <= window.innerHeight + 180;
    if (visibleSoon) {
      previewCanvasObserver.unobserve(canvas);
      delete canvas.dataset.previewObserved;
      drawPreviewCanvas(canvas);
      return;
    }
    if (!canvas.dataset.previewObserved) {
      canvas.dataset.previewObserved = "1";
      previewCanvasObserver.observe(canvas);
    }
  }

  function drawCaptainPreviewCanvas(canvas) {
    const level = Number(canvas.dataset.captainPreviewLevel || 1);
    const gender = canvas.dataset.captainPreviewGender || "male";
    const variant = canvas.dataset.captainPreviewVariant || "portrait";
    const sprite = getCaptainCharacterSpritesheet(level, gender);
    requestCaptainCharacterSprite(sprite);
    const options = variant === "topbar"
      ? { fill: 1.28, alignY: .98, offsetY: 0, useBodyBounds: true }
      : variant === "next"
        ? { fill: .86, alignY: .96, useBodyBounds: true }
        : { fill: .92, alignY: .98, useBodyBounds: true };
    return drawSpritesheetPreview(canvas, sprite, options);
  }

  function renderCaptainPreviewCanvases(root = document) {
    root.querySelectorAll?.("canvas[data-captain-preview-level]").forEach(queuePreviewCanvas);
  }

  function drawPetPreviewCanvas(canvas) {
    const visual = canvas.dataset.petPreview;
    const sprite = getPetSprite(visual);
    requestPetSprite(sprite);
    return drawSpritesheetPreview(canvas, sprite, { fill: .86, center: true, centerY: .5, useBodyBounds: true, prepareSpritesheet: preparePetSpritesheet });
  }

  function renderPetPreviewCanvases(root = document) {
    root.querySelectorAll?.("canvas[data-pet-preview]").forEach(queuePreviewCanvas);
  }

  const TODAY_KEY = () => new Date().toLocaleDateString("sv-SE");
  const WEEK_KEY = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    const day = Math.floor((now - first) / 86400000);
    return `${now.getFullYear()}-W${String(Math.ceil((day + first.getDay() + 1) / 7)).padStart(2, "0")}`;
  };
  const MISSION_FILTERS = ["Próximas de concluir", "Em andamento", "Concluídas", "Diárias", "Semanais", "História / Principal", "Todas"];
  const ENDGAME_REQUIREMENTS = {
    11: { power: 25000, dps: 8000, maxHp: 20000, upgrades: 30, tier: 3, prestiges: 2, label: "Endgame imperial" },
    12: { power: 50000, dps: 18000, maxHp: 45000, upgrades: 50, tier: 4, prestiges: 3, label: "Endgame vulcânico" },
    13: { power: 100000, dps: 40000, maxHp: 90000, upgrades: 80, tier: 4, prestiges: 4, label: "Endgame congelado" },
    14: { power: 250000, dps: 100000, maxHp: 250000, upgrades: 120, tier: 5, prestiges: 5, label: "Desafio final do Kraken" }
  };
  const ENDGAME_ENEMY_MODS = {
    11: { hp: 1.75, damage: 1.45, armor: 1.55, evasion: .015, attackSpeed: .9, skillResist: .12, bossHp: 1.8, bossDamage: 1.45, bossArmor: 1.45, special: "blindagem imperial" },
    12: { hp: 2.25, damage: 2.05, armor: 1.25, evasion: .02, attackSpeed: .82, skillResist: .2, bossHp: 2.35, bossDamage: 2.1, bossArmor: 1.35, special: "chamas vulcânicas" },
    13: { hp: 2.85, damage: 2.35, armor: 1.85, evasion: .025, attackSpeed: .78, skillResist: .28, bossHp: 3.15, bossDamage: 2.55, bossArmor: 1.85, special: "controle glacial" },
    14: { hp: 4.2, damage: 3.7, armor: 2.45, evasion: .04, attackSpeed: .68, skillResist: .4, bossHp: 7.02, bossDamage: 5.525, bossArmor: 2.6, special: "maldição abissal" }
  };
  let activeMissionFilter = "Próximas de concluir";
  let captainPetsExpanded = false;
  let captainOverviewExpanded = false;
  let captainManualSkillsExpanded = false;
  let captainEquipmentExpanded = false;
  const statsPanelsExpanded = { quests: false, combat: false, progression: false, career: false, reset: false };

  function rewardText(reward = {}) {
    const parts = Object.entries(goldOnlyBundle(reward.resources || {})).filter(([, value]) => value > 0).map(([, value]) => `${formatNumber(calculateGoldReward(value))} Gold`);
    if (reward.xp) parts.push(`${formatNumber(calculateXpReward(reward.xp))} XP`);
    if (reward.title) parts.push(`Título "${reward.title}"`);
    if (reward.cosmetic) parts.push(reward.cosmetic);
    return parts.join(" + ") || "Glória pirata";
  }

  function makeProgressionDefaults() {
    return {
      totalUpgrades: 0, upgradesByType: { ship: 0, cannons: 0, sails: 0, hull: 0 },
      skillUses: { total: 0, fire: 0, ice: 0, ghost: 0, chain: 0 },
      trade: { transactions: 0, buys: 0, sells: 0, resourcesBought: 0, resourcesSold: 0 },
      offline: { claims: 0, seconds: 0, maxClaimSeconds: 0 },
      repairs: 0, shipSwitches: 0, krakenSightings: 0, onlyGoldBattles: 0, multiResourceDrops: 0,
      resourcesByKey: Object.fromEntries(Object.keys(RESOURCE_META).map(key => [key, 0])),
      resourceTypesSeen: {}, dayKey: TODAY_KEY(), weekKey: WEEK_KEY(),
      daily: { enemies: 0, gold: 0, upgrades: 0, skillUses: 0, trades: 0 },
      weekly: { enemies: 0, bosses: 0, upgrades: 0, resources: 0, trades: 0 }
    };
  }

  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const missionDefinitions = (() => {
    const defs = [];
    const shortNumber = value => Number(value).toLocaleString("pt-BR");
    const balanceReward = reward => {
      const resources = Object.fromEntries(Object.entries(reward.resources || {}).map(([key, value]) => {
        if (key === "ouro") return [key, Math.max(25, Math.round(value * .28))];
        return [key, Math.max(0, Math.round(value * .75))];
      }));
      return { ...reward, resources, xp: reward.xp ? Math.max(5, Math.round(reward.xp * .8)) : reward.xp };
    };
    const add = item => defs.push({ id: `m${String(defs.length + 1).padStart(3, "0")}`, icon: "✦", level: 1, category: "Principal", type: "main", reward: { resources: { ouro: 100 } }, ...item });
    [
      ["Primeiro Comando", "Inicie o jogo e equipe o primeiro navio.", { kind: "started" }, { ouro: 100, madeira: 10 }],
      ["Primeiro Combate", "Entre em combate pela primeira vez.", { kind: "firstCombat" }, { ouro: 150 }],
      ["Primeiro Inimigo Afundado", "Derrote 5 inimigos na jornada.", { kind: "enemies", target: 5 }, { ouro: 200, madeira: 10 }],
      ["Primeiros Saques", "Colete 750 Ouro.", { kind: "gold", target: 750 }, { ouro: 100, ferro: 10 }],
      ["Melhorar Canhões I", "Compre 5 upgrades de canhão.", { kind: "upgrade", type: "cannons", target: 5 }, { ouro: 300, polvora: 15 }],
      ["Melhorar Velas I", "Compre 5 upgrades de vela.", { kind: "upgrade", type: "sails", target: 5 }, { ouro: 300, tecido: 15 }],
      ["Melhorar Casco I", "Compre 5 upgrades de casco.", { kind: "upgrade", type: "hull", target: 5 }, { ouro: 300, madeira: 15 }],
      ["Preparado para o Mar", "Tenha 5 upgrades em canhões, velas e casco.", { kind: "allCoreUpgrades", target: 5 }, { ouro: 750 }],
      ["Caçada Regional", "Derrote 75 inimigos na jornada.", { kind: "enemies", target: 75 }, { ouro: 500, madeira: 25, ferro: 25 }],
      ["Pirata Iniciante", "Alcance nível 3 de pirata.", { kind: "pirateLevel", target: 3 }, { ouro: 1000 }]
    ].forEach(([name, description, objective, resources], index) => add({ name, description, objective, reward: { resources, xp: index < 3 ? 10 : 50 }, recommendedLevel: Math.max(1, Math.ceil((index + 1) / 2)), icon: "☠", earlyReward: true }));
    [75, 200, 500, 1000, 2500, 5000, 10000].forEach((target, i) => add({ name: `Caçador dos Mares ${roman[i]}`, description: `Derrote ${shortNumber(target)} inimigos no total.`, category: "Combate", type: "combat", objective: { kind: "enemies", target }, reward: { resources: { ouro: 750 * (i + 1), polvora: i < 3 ? 25 * (i + 1) : 0, cristal: i >= 4 ? i : 0 }, xp: 25 * (i + 1) }, recommendedLevel: 2 + i * 4, icon: "⚔" }));
    [1, 3, 5, 10, REGIONS.length].forEach((target, i) => add({ name: `Boss Hunter ${roman[i]}`, description: i === 0 ? "Derrote o primeiro boss regional." : `Derrote ${target} bosses regionais.`, category: "Boss", type: "boss", objective: { kind: "bosses", target }, reward: { resources: { ouro: 2500 * (i + 1), cristal: i >= 1 ? 3 * i : 0, fragmentos: i >= 3 ? i : 0 }, xp: 100 * (i + 1) }, recommendedLevel: 8 + i * 8, icon: "👑" }));
    MAIN_REGIONS.slice(0, 10).forEach((region, i) => add({ name: region.name, description: `Desbloqueie ${region.name}.`, category: "Mapas", type: "map", objective: { kind: "regionUnlocked", target: PRIMITIVE_REGIONS.length + i + 1 }, reward: { resources: { ouro: 1800 * (i + 1), ...(i > 6 ? { fragmentos: 1 } : i > 3 ? { perola: 2 } : { madeira: 40 }) }, xp: 75 * (i + 1) }, recommendedLevel: 3 + i * 5, icon: "⌖" }));
    Object.entries({ madeira: [1000, 5000], ferro: [1000, 5000], tecido: [1000, 5000], polvora: [500, 1500], cristal: [500], perola: [100], ambar: [100], fragmentos: [25] }).forEach(([key, targets]) => targets.forEach((target, i) => add({ name: `${RESOURCE_META[key].name} ${roman[i]}`, description: `Colete ${shortNumber(target)} ${RESOURCE_META[key].name}.`, category: "Recursos", type: "resource", objective: { kind: "resource", key, target }, reward: { resources: { ouro: target * 8, [key]: Math.max(2, Math.round(target * .08)) }, xp: Math.round(target / 4) }, recommendedLevel: key === "fragmentos" ? 70 : key === "ambar" ? 45 : key === "cristal" ? 18 : 5, icon: RESOURCE_META[key].icon })));
    ["cannons", "sails", "hull"].forEach(type => [5, 10, 20, 35, 50, 75, 100].forEach((target, i) => add({ name: `${type === "cannons" ? "Canhões" : type === "sails" ? "Velas" : "Casco"} ${roman[i]}`, description: `Compre ${target} upgrades de ${type === "cannons" ? "canhões" : type === "sails" ? "velas" : "casco"}.`, category: "Upgrades", type: "upgrade", objective: { kind: "upgrade", type, target }, reward: { resources: { ouro: 600 * target, [type === "cannons" ? "polvora" : type === "sails" ? "tecido" : "madeira"]: 20 * (i + 1) }, xp: 40 * (i + 1) }, recommendedLevel: 4 + i * 7, icon: type === "cannons" ? "☄" : type === "sails" ? "◒" : "⬡" })));
    [2, 5, 10, 15, SHIPS.length].forEach((target, i) => add({ name: ["Novo Navio", "Pequena Frota", "Frota de Guerra", "Estaleiro Pirata", "Dono da Frota"][i], description: `Compre ${target === SHIPS.length ? "todos os navios" : `${target} navios`}.`, category: "Navios", type: "ship", objective: { kind: "shipsOwned", target }, reward: { resources: { ouro: 2000 * (i + 1) ** 2, madeira: 100 * (i + 1), fragmentos: i === 4 ? 10 : 0 }, xp: 100 * (i + 1) }, recommendedLevel: 5 + i * 15, icon: "⛵" }));
    Object.keys(SKILL_META).forEach((key, i) => add({ name: `${SKILL_META[key].name} em Ação`, description: `Use ${SKILL_META[key].name} ${[100, 250, 500, 1000][i]} vezes em combate.`, category: "Skills", type: "skill", objective: { kind: "skillUse", key, target: [100, 250, 500, 1000][i] }, reward: { resources: { ouro: 2000 + i * 1000, [SKILL_META[key].materials[0]]: 25 }, xp: 75 }, recommendedLevel: SKILL_META[key].unlock, icon: SKILL_META[key].icon }));
    add({ name: "Skills Automáticas", description: "Ative auto lançamento em 3 skills.", category: "Skills", type: "skill", objective: { kind: "skillAuto", target: 3 }, reward: { resources: { ouro: 5000 }, xp: 100 }, recommendedLevel: 20, icon: "⚙" });
    [["Primeiro Negócio", "Realize 5 compras no Comércio.", "tradeBuys", 5], ["Venda no Porto", "Realize 5 vendas no Comércio.", "tradeSells", 5], ["Mercador Iniciante", "Faça 25 transações no Comércio.", "tradeTransactions", 25], ["Mestre Mercador", "Faça 150 transações no Comércio.", "tradeTransactions", 150]].forEach(([name, description, kind, target], i) => add({ name, description, category: "Comércio", type: "trade", objective: { kind, target }, reward: { resources: { ouro: 500 * (i + 1) ** 2, comida: i > 1 ? 50 : 0 }, xp: 40 * (i + 1) }, recommendedLevel: 10 + i * 6, icon: "⚖" }));
    [[1, "Recompensa Offline"], [3600, "Capitão Ausente"], [28800, "Viagem Longa"], [86400, "Maratona Idle"]].forEach(([target, name], i) => add({ name, description: i === 0 ? "Colete recompensa offline pela primeira vez." : `Acumule ${formatDuration(target)} de recompensa offline.`, category: "Idle", type: "idle", objective: { kind: i === 0 ? "offlineClaims" : "offlineSeconds", target }, reward: { resources: { ouro: 1000 * (i + 1), comida: i ? 50 * i : 0, cristal: i >= 2 ? 3 : 0, fragmentos: i === 3 ? 3 : 0 }, xp: 50 * (i + 1) }, recommendedLevel: 3 + i * 10, icon: "☾" }));
    [[100, "DPS Inicial", "dps"], [1000, "DPS Forte", "dps"], [10000, "DPS Absurdo", "dps"], [1000, "Vida Reforçada", "maxHp"], [10000, "Casco Imortal", "maxHp"]].forEach(([target, name, kind], i) => add({ name, description: `Atinja ${shortNumber(target)} ${kind === "dps" ? "DPS" : "HP máximo"}.`, category: "Endgame", type: "stats", objective: { kind, target }, reward: { resources: { ouro: 1000 * (i + 1) ** 2, cristal: i > 0 ? 5 : 0, fragmentos: i === 2 ? 5 : 0 }, xp: 80 * (i + 1) }, recommendedLevel: 8 + i * 12, icon: "◆" }));
    [
      ["Preparado para o Boss", "Derrote, melhore canhões/casco e alcance Poder Naval mínimo.", { kind: "all", objectives: [{ kind: "enemies", target: 300 }, { kind: "upgrade", type: "cannons", target: 10 }, { kind: "upgrade", type: "hull", target: 10 }, { kind: "power", target: 5000 }] }, 18],
      ["Domínio da Região", "Domine a fase atual antes de buscar o próximo grande salto.", { kind: "all", objectives: [{ kind: "bosses", target: 3 }, { kind: "resourceTotal", target: 1000 }, { kind: "enemies", target: 500 }, { kind: "totalUpgrades", target: 20 }] }, 25],
      ["Navio de Guerra", "Equipe um navio forte, alcance DPS alto e derrote boss preparado.", { kind: "all", objectives: [{ kind: "shipTier", target: 4 }, { kind: "dps", target: 10000 }, { kind: "totalUpgrades", target: 25 }, { kind: "bosses", target: 5 }] }, 35]
    ].forEach(([name, description, objective, recommendedLevel], i) => add({ name, description, category: "Principal", type: "main", objective, reward: { resources: { ouro: 20000 * (i + 1), cristal: 10 * (i + 1), fragmentos: i ? i : 0 }, xp: 250 * (i + 1) }, recommendedLevel, icon: "✦" }));
    [["Caçada Diária", "Derrote 75 inimigos hoje.", "dailyEnemies", 75], ["Saque Diário", "Colete 3.000 Ouro hoje.", "dailyGold", 3000], ["Upgrade Diário", "Faça 3 upgrades hoje.", "dailyUpgrades", 3], ["Skill Diária", "Use skills 100 vezes hoje.", "dailySkillUses", 100], ["Comércio Diário", "Faça 10 transações hoje.", "dailyTrades", 10]].forEach(([name, description, kind, target]) => add({ name, description, category: "Diária", type: "daily", objective: { kind, target }, reward: { resources: { ouro: 500, polvora: kind === "dailySkillUses" ? 25 : 0, comida: kind === "dailyTrades" ? 25 : 0 }, xp: 50 }, recommendedLevel: 1, icon: "☀", resets: "daily" }));
    [["Semana de Guerra", "Derrote 1.500 inimigos na semana.", "weeklyEnemies", 1500], ["Semana de Boss", "Derrote 5 bosses na semana.", "weeklyBosses", 5], ["Semana de Upgrades", "Faça 35 upgrades na semana.", "weeklyUpgrades", 35], ["Semana de Recursos", "Colete 5.000 recursos na semana.", "weeklyResources", 5000], ["Semana Mercante", "Realize 75 transações na semana.", "weeklyTrades", 75]].forEach(([name, description, kind, target]) => add({ name, description, category: "Semanal", type: "weekly", objective: { kind, target }, reward: { resources: { ouro: 10000, cristal: 5, perola: kind === "weeklyBosses" ? 3 : 0, gema: kind === "weeklyUpgrades" ? 3 : 0 }, xp: 250 }, recommendedLevel: 10, icon: "☽", resets: "weekly" }));
    [["Black Abyss", "Compre o navio Black Abyss.", { kind: "shipName", name: "Black Abyss" }, "Black Abyss"], ["Poder Lendário", "Equipe um navio lendário e alcance 10.000 DPS.", { kind: "legendaryPower", target: 10000 }, "Poder Lendário"], ["Rei dos Bosses", "Derrote todos os bosses regionais.", { kind: "allBosses" }, "Rei dos Bosses"], ["Mestre dos Recursos", "Colete todos os tipos de recursos pelo menos uma vez.", { kind: "allResourcesSeen" }, "Mestre dos Recursos"], ["Arsenal Final", "Desbloqueie todas as skills base.", { kind: "allSkillsUnlocked" }, "Arsenal Final"], ["Navio Perfeito", "Tenha canhões, velas e casco no nível 25.", { kind: "perfectShip", target: 25 }, "Navio Perfeito"], ["Missão Final", "Complete 99 missões.", { kind: "missionsCompleted", target: 99 }, "Lenda das Missões"]].forEach(([name, description, objective, title], i) => add({ name, description, category: "Endgame", type: "endgame", objective, reward: { resources: { ouro: 100000 * (i + 1), fragmentos: 5 + i }, title, xp: 500 }, recommendedLevel: 60, icon: "✹" }));
    [["Testemunha do Abismo", "Veja a animação rara do Kraken no cenário.", { kind: "krakenSightings", target: 1 }, "Testemunha do Abismo"], ["Sorte do Pirata", "Receba múltiplos recursos em uma única batalha.", { kind: "multiResourceDrops", target: 1 }, null], ["Sem Materiais", "Receba apenas Ouro em 100 batalhas.", { kind: "onlyGoldBattles", target: 100 }, null], ["Sobrevivente", "Vença uma batalha com menos de 5% de HP.", { kind: "survivorWins", target: 1 }, "Sobrevivente"]].forEach(([name, description, objective, title]) => add({ name, description, category: "Secretas", type: "secret", objective, reward: { resources: { ouro: 25000, cristal: 5 }, title, xp: 100 }, recommendedLevel: 20, icon: "?" }));
    const selected = defs.length > 100 ? [...defs.slice(0, 89), ...defs.slice(-11)] : defs;
    return selected.map((item, index, all) => ({ ...item, reward: balanceReward(item.reward), prevId: all[index - 1]?.type === item.type ? all[index - 1].id : null, nextId: all[index + 1]?.type === item.type ? all[index + 1].id : null }));
  })();

  function normalizeGoldEconomyObjective(objective) {
    if (!objective) return objective;
    if (objective.kind === "resource") {
      return { kind: "gold", target: Math.max(1000, Math.round(convertResourceAmountToGold(objective.key, objective.target))) };
    }
    if (["tradeBuys", "tradeSells", "tradeTransactions", "dailyTrades", "weeklyTrades"].includes(objective.kind)) {
      return { kind: "gold", target: Math.max(2500, Math.round((objective.target || 1) * 1200)) };
    }
    if (objective.kind === "weeklyResources") return { kind: "gold", target: 25000 };
    if (objective.kind === "resourceTotal") return { kind: "gold", target: Math.max(5000, Math.round((objective.target || 1) * 20)) };
    if (objective.kind === "allResourcesSeen") return { kind: "gold", target: 100000 };
    if (objective.kind === "multiResourceDrops") return { kind: "onlyGoldBattles", target: 25 };
    if (objective.kind === "all") return { ...objective, objectives: objective.objectives.map(normalizeGoldEconomyObjective) };
    return objective;
  }

  function normalizeGoldEconomyMission(item) {
    if (item.reward?.resources) item.reward.resources = goldOnlyBundle(item.reward.resources);
    if (item.earlyReward) item.reward = scaleReward(item.reward, EARLY_GAME_REWARD_MULTIPLIER);
    const oldKind = item.objective?.kind;
    item.objective = normalizeGoldEconomyObjective(item.objective);
    if (oldKind === "resource") {
      item.category = "Gold";
      item.type = "gold";
      SECONDARY_RESOURCE_KEYS.forEach(key => {
        const name = RESOURCE_META[key]?.name;
        if (name) item.name = item.name.split(name).join("Gold");
      });
      item.name = item.name.replace(/Madeira|Ferro|Tecido|Polvora|Cristal|Perola|Ambar|Fragmentos|Pedra|Comida/gi, "Gold");
      item.description = `Colete ${item.objective.target} Gold ao longo da jornada.`;
      item.icon = RESOURCE_META.ouro.icon;
    }
    if (item.category === "Recursos" || item.type === "resource") {
      item.category = "Gold";
      item.type = "gold";
      item.description = item.description.replace(/recursos|materiais/gi, "Gold");
      item.icon = RESOURCE_META.ouro.icon;
    }
    if (item.category === "Comercio" || item.category === "Comércio" || item.type === "trade") {
      item.category = "Gold";
      item.type = "gold";
      item.name = item.name.replace(/Comercio|Comércio|Mercador|Negocio|Negócio|Venda no Porto/gi, "Saque");
      item.description = `Colete ${item.objective.target} Gold ao longo da jornada.`;
      item.icon = RESOURCE_META.ouro.icon;
    }
    if (oldKind === "weeklyResources") {
      item.name = "Semana de Gold";
      item.description = "Colete Gold suficiente durante a semana.";
      item.category = "Semanal";
      item.icon = RESOURCE_META.ouro.icon;
    }
    if (oldKind === "allResourcesSeen") {
      item.name = "Mestre do Gold";
      item.description = "Colete uma grande quantia de Gold na jornada.";
      item.icon = RESOURCE_META.ouro.icon;
    }
    if (oldKind === "multiResourceDrops") {
      item.name = "Mar de Gold";
      item.description = "Receba apenas Gold em 25 batalhas.";
      item.icon = RESOURCE_META.ouro.icon;
    }
    return item;
  }

  function normalizeGoldEconomyDefinitions() {
    SHIPS.forEach(ship => { ship.costs = goldOnlyBundle(ship.costs); });
    PETS.forEach(pet => { pet.costs = goldOnlyBundle(pet.costs); });
    Object.values(EQUIPMENT_META).forEach(item => { item.costs = goldOnlyBundle(item.costs); });
    Object.values(ENEMY_CATEGORIES).forEach(profile => {
      profile.goldDrops = { ...(profile.drops || {}) };
      profile.drops = {};
    });
    REGIONS.forEach(region => {
      region.goldDrops = { ...(region.drops || {}) };
      region.drops = {};
    });
    missionDefinitions.forEach(normalizeGoldEconomyMission);
  }

  normalizeGoldEconomyDefinitions();

  function createDefaultState() {
    return {
      version: 12,
      playerId: createPlayerId(),
      pirateName: "",
      resources: { ouro: 1200 },
      resourcesConvertedToGold: true,
      pirateCoins: 0,
      prestiges: 0,
      totalActivePlaySeconds: 0,
      prestigeHistory: [],
      captainSelectedGender: null,
      captainLevel: 0,
      captainVisualImage: "",
      captainBonuses: createCaptainBonuses(),
      captainUpgradePurchased: [],
      captainProgressPersistsAfterPrestige: true,
      captainRuntimeLevel: 1,
      captainCurrentXp: 0,
      captainXpToNextLevel: 100,
      totalLevelPointsEarned: 0,
      spentLevelPoints: 0,
      availableLevelPoints: 0,
      captainManualSkills: createCaptainManualSkillState(),
      captainEquipment: createCaptainEquipmentState(),
      captainEquipmentBonuses: createCaptainEquipmentBonuses(),
      journeyStartedAt: Date.now(),
      maxRegionReached: 0,
      pirateLevel: 1,
      xp: 0,
      regionIndex: 0,
      unlockedRegions: 1,
      regionKills: Array(REGIONS.length).fill(0),
      bossesDefeated: Array(REGIONS.length).fill(false),
      shipId: 0,
      ownedShips: [0],
      shipEnemyKills: { 0: 0 },
      ownedPets: [],
      equippedPetId: null,
      petLevels: {},
      levels: { ship: 1, cannons: 1, sails: 1, hull: 1 },
      equipment: { compass: false, spyglass: false, anchor: false, amulet: false },
      skills: {
        fire: { level: 1, auto: true, remaining: 1.5 },
        ice: { level: 1, auto: true, remaining: 4 },
        ghost: { level: 1, auto: true, remaining: 6 },
        chain: { level: 1, auto: true, remaining: 8 }
      },
      lifetime: { enemies: 0, bosses: 0, resources: 0, gold: 0, highestDamage: 0, playSeconds: 0, petsBought: 0, petAttacks: 0, petKills: 0, bossesWithPet: 0 },
      progression: makeProgressionDefaults(),
      quests: { completed: {}, claimed: {} },
      titles: [],
      combat: { running: false, repairing: false, repairStarted: 0, repairDuration: AUTO_REPAIR_DURATION_MS, repairStartHp: 0, repairTargetHp: 140, repairSource: "", repairResumeRunning: false, pausedRegenTimer: 0, hpRegenTimer: 0, specialCombatResumeRunning: false, playerHp: 140, enemy: null, attackTimer: 0, petAttackTimer: 0, enemyAttackTimer: 0, spawnTimer: 0 },
      autoChallengeBoss: false,
      logs: [],
      hasStarted: false,
      lastSeen: Date.now()
    };
  }

  function migrateResourcesToGold(target, saved = {}) {
    const savedResources = saved.resources || {};
    const hadSecondaryResources = Object.entries(savedResources).some(([key, amount]) => key !== "ouro" && Number(amount) > 0);
    const shouldConvert = saved.resourcesConvertedToGold !== true;
    const secondaryGold = shouldConvert
      ? SECONDARY_RESOURCE_KEYS.reduce((sum, key) => sum + convertResourceAmountToGold(key, savedResources[key] || 0), 0)
      : 0;
    const currentGold = Math.max(0, Number(target.resources?.ouro ?? savedResources.ouro ?? 0) || 0);
    target.resources = { ouro: Math.round(currentGold + secondaryGold) };
    target.resourcesConvertedToGold = true;
    return shouldConvert || hadSecondaryResources;
  }

  function normalizeSavedLogText(target) {
    if (!Array.isArray(target.logs)) {
      target.logs = [];
      return false;
    }
    let changed = false;
    target.logs = target.logs.slice(0, 100).map(item => {
      if (!item || typeof item.message !== "string") return item;
      const message = item.message.replace(/Gold\s+extra/g, "Ouro extra");
      if (message === item.message) return item;
      changed = true;
      return { ...item, message };
    });
    return changed;
  }

  function loadState() {
    const defaults = createDefaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return defaults;
      const merged = { ...defaults, ...saved };
      merged.playerId = typeof saved.playerId === "string" && saved.playerId.trim() ? saved.playerId.trim().slice(0, 80) : createPlayerId();
      merged.pirateName = sanitizePirateName(saved.pirateName || "");
      merged.resources = { ...defaults.resources, ...(saved.resources || {}) };
      merged.levels = { ...defaults.levels, ...(saved.levels || {}) };
      merged.equipment = { ...defaults.equipment, ...(saved.equipment || {}) };
      merged.captainEquipment = { ...defaults.captainEquipment, ...(saved.captainEquipment || {}) };
      merged.captainManualSkills = { ...defaults.captainManualSkills, ...(saved.captainManualSkills || {}) };
      merged.skills = Object.fromEntries(Object.keys(SKILL_META).map(key => [key, { ...defaults.skills[key], ...((saved.skills || {})[key] || {}) }]));
      merged.lifetime = { ...defaults.lifetime, ...(saved.lifetime || {}) };
      const resourcesNeedSave = migrateResourcesToGold(merged, saved);
      const logsNeedSave = normalizeSavedLogText(merged);
      merged.progression = mergeProgression(saved.progression, defaults.progression);
      merged.quests = { completed: { ...(saved.quests?.completed || {}) }, claimed: { ...(saved.quests?.claimed || {}) } };
      const identityNeedSave = merged.playerId !== saved.playerId || merged.pirateName !== (saved.pirateName || "");
      delete merged.achievements;
      merged.titles = Array.isArray(saved.titles) ? [...new Set(saved.titles)].slice(0, 80) : [];
      merged.combat = { ...defaults.combat, ...(saved.combat || {}), enemy: null, repairing: false, spawnTimer: 0 };
      const previousVersion = Number(saved.version || 1);
      if (previousVersion < 4) {
        merged.regionKills = [...Array(PRIMITIVE_REGIONS.length).fill(100), ...MAIN_REGIONS.map((_, i) => Number(saved.regionKills?.[i] || 0))];
        merged.bossesDefeated = [...Array(PRIMITIVE_REGIONS.length).fill(true), ...MAIN_REGIONS.map((_, i) => Boolean(saved.bossesDefeated?.[i]))];
        merged.regionIndex = clamp(Number(saved.regionIndex || 0) + PRIMITIVE_REGIONS.length, PRIMITIVE_REGIONS.length, REGIONS.length - 1);
        merged.unlockedRegions = clamp(Number(saved.unlockedRegions || 1) + PRIMITIVE_REGIONS.length, PRIMITIVE_REGIONS.length + 1, REGIONS.length);
      } else {
        merged.regionKills = defaults.regionKills.map((_, i) => Number(saved.regionKills?.[i] || 0));
        merged.bossesDefeated = defaults.bossesDefeated.map((_, i) => Boolean(saved.bossesDefeated?.[i]));
      }
      const shipOffset = previousVersion < 4 ? PRIMITIVE_SHIPS.length : 0;
      const migratedOwned = Array.isArray(saved.ownedShips) ? saved.ownedShips.map(id => (previousVersion < 2 && Number(id) === 19 ? 20 : Number(id)) + shipOffset) : [0];
      merged.ownedShips = [...new Set([0, ...migratedOwned])].filter(id => Number.isInteger(id) && id >= 0 && id < SHIPS.length);
      merged.shipId = (previousVersion < 2 && Number(saved.shipId) === 19 ? 20 : Number(saved.shipId || 0)) + shipOffset;
      if (!merged.ownedShips.includes(merged.shipId) || !SHIPS[merged.shipId]) merged.shipId = 0;
      const savedShipEnemyKills = saved.shipEnemyKills && typeof saved.shipEnemyKills === "object" && !Array.isArray(saved.shipEnemyKills) ? saved.shipEnemyKills : {};
      merged.shipEnemyKills = {};
      Object.entries(savedShipEnemyKills).forEach(([rawId, value]) => {
        const id = Number(rawId);
        if (Number.isInteger(id) && id >= 0 && id < SHIPS.length) merged.shipEnemyKills[id] = Math.max(0, Math.floor(Number(value) || 0));
      });
      merged.ownedShips.forEach(id => {
        if (merged.shipEnemyKills[id] === undefined) merged.shipEnemyKills[id] = 0;
      });
      merged.ownedPets = [...new Set((saved.ownedPets || []).map(Number))].filter(id => Number.isInteger(id) && PETS[id]);
      merged.equippedPetId = saved.equippedPetId === null || saved.equippedPetId === undefined ? null : Number(saved.equippedPetId);
      if (!merged.ownedPets.includes(merged.equippedPetId) || !PETS[merged.equippedPetId]) merged.equippedPetId = null;
      const savedPetLevels = saved.petLevels || {};
      merged.petLevels = {};
      merged.ownedPets.forEach(id => {
        merged.petLevels[id] = clamp(Math.floor(Number(savedPetLevels[id] || 1)), 1, PET_MAX_LEVEL);
      });
      merged.pirateCoins = Math.max(0, Math.floor(Number(saved.pirateCoins || 0)));
      merged.prestiges = Math.max(0, Math.floor(Number(saved.prestiges || 0)));
      merged.prestigeHistory = Array.isArray(saved.prestigeHistory) ? saved.prestigeHistory.slice(0, 20) : [];
      const prestigeActiveSeconds = merged.prestigeHistory.reduce((sum, item) => sum + Math.max(0, Number(item.activeDuration || 0)), 0);
      merged.totalActivePlaySeconds = Math.max(0, Number(saved.totalActivePlaySeconds || 0), Number(merged.lifetime.playSeconds || 0) + prestigeActiveSeconds);
      syncCaptainState(merged);
      syncCaptainManualSkillState(merged);
      syncCaptainRuntimeState(merged, saved);
      syncCaptainEquipmentState(merged);
      merged.journeyStartedAt = Number(saved.journeyStartedAt || Date.now());
      merged.maxRegionReached = clamp(Math.max(Number(saved.maxRegionReached || 0), merged.regionIndex), 0, REGIONS.length - 1);
      merged.version = 12;
      if (resourcesNeedSave || logsNeedSave || identityNeedSave) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(merged)); } catch (error) {}
      }
      return merged;
    } catch (error) {
      console.warn("Não foi possível carregar o save.", error);
      return defaults;
    }
  }

  function getCaptainVisualAuditConfig() {
    if (typeof location === "undefined") return null;
    const localHost = ["localhost", "127.0.0.1", ""].includes(location.hostname);
    if (!localHost) return null;
    const params = new URLSearchParams(location.search);
    if (params.get("visualAudit") !== "captain") return null;
    const shipId = clamp(Math.floor(Number(params.get("ship") || 0)), 0, SHIPS.length - 1);
    const level = clamp(Math.floor(Number(params.get("level") || 1)), 1, CAPTAIN_MAX_LEVEL);
    const gender = normalizeCaptainGender(params.get("gender")) || "male";
    const pose = ["idle", "celebrate", "hit"].includes(params.get("pose")) ? params.get("pose") : "idle";
    const editCaptain = ["1", "true", "yes", "on"].includes(String(params.get("editCaptain") || params.get("captainEdit") || "").toLowerCase());
    const unlockFleet = ["1", "true", "yes", "on"].includes(String(params.get("unlockFleet") || "").toLowerCase());
    const pirateCoinsParam = params.get("pirateCoins");
    const pirateCoins = pirateCoinsParam === null ? null : Math.max(0, Math.floor(Number(pirateCoinsParam) || 0));
    const regionIndexParam = params.get("regionIndex");
    const regionParam = regionIndexParam ?? params.get("region") ?? params.get("map");
    let regionIndex = null;
    if (regionParam !== null) {
      const normalizedRegion = String(regionParam).toLowerCase();
      if (["last", "ultimo", "último", "final"].includes(normalizedRegion)) {
        regionIndex = REGIONS.length - 1;
      } else {
        const numericRegion = Math.floor(Number(regionParam));
        if (Number.isFinite(numericRegion)) {
          regionIndex = clamp(regionIndexParam !== null ? numericRegion : numericRegion - 1, 0, REGIONS.length - 1);
        }
      }
    }
    const unlockMaps = ["1", "true", "yes", "on"].includes(String(params.get("unlockMaps") || "").toLowerCase());
    const screenParam = String(params.get("screen") || "home");
    const screenAliases = { map: "maps", resources: "upgrades", missions: "stats", pets: "captain" };
    const normalizedScreen = screenAliases[screenParam] || screenParam;
    const screen = ["home", "upgrades", "maps", "captain", "prestige", "stats"].includes(normalizedScreen) ? normalizedScreen : "home";
    return { shipId, level, gender, pose, editCaptain, unlockFleet, pirateCoins, regionIndex, unlockMaps, screen };
  }

  const VISUAL_AUDIT_CONFIG = getCaptainVisualAuditConfig();
  const captainEditorDrafts = VISUAL_AUDIT_CONFIG?.editCaptain ? loadCaptainEditorDrafts() : {};
  if (VISUAL_AUDIT_CONFIG?.editCaptain && typeof window !== "undefined") window.__captainEditorDrafts = captainEditorDrafts;

  function applyCaptainVisualAuditState(target) {
    if (!VISUAL_AUDIT_CONFIG) return target;
    const { shipId, level, gender, unlockFleet, pirateCoins, regionIndex, unlockMaps } = VISUAL_AUDIT_CONFIG;
    target.shipId = shipId;
    const auditShips = unlockFleet ? SHIPS.map(ship => ship.id) : [shipId];
    target.ownedShips = [...new Set([...(target.ownedShips || []), ...auditShips])].filter(id => SHIPS[id]);
    target.captainSelectedGender = gender;
    target.captainLevel = level;
    if (pirateCoins !== null) target.pirateCoins = pirateCoins;
    if (regionIndex !== null || unlockMaps) {
      const maxAuditRegion = unlockMaps ? REGIONS.length - 1 : regionIndex;
      target.regionIndex = regionIndex ?? maxAuditRegion;
      target.unlockedRegions = Math.max(Number(target.unlockedRegions || 1), maxAuditRegion + 1);
      target.maxRegionReached = Math.max(Number(target.maxRegionReached || 0), maxAuditRegion);
      target.regionKills = REGIONS.map((_, index) => Math.max(Number(target.regionKills?.[index] || 0), index < maxAuditRegion ? 100 : 0));
      target.bossesDefeated = REGIONS.map((_, index) => Boolean(target.bossesDefeated?.[index]) || index < maxAuditRegion);
    }
    target.combat = { ...target.combat, running: false, repairing: false, enemy: null, spawnTimer: 0, playerHp: Number.MAX_SAFE_INTEGER };
    return syncCaptainState(target);
  }

  let state = applyCaptainVisualAuditState(loadState());
  let currentScreen = VISUAL_AUDIT_CONFIG?.screen || "home";
  let combatMinimized = loadCombatMinimizedPreference();
  let combatFullscreen = false;
  let combatFullscreenSource = "";
  let combatFullscreenHistoryActive = false;
  let mobileCombatFullscreen = false;
  let mobileCombatPreviousMinimized = false;
  let lastFrame = performance.now();
  let lastUiRefresh = 0;
  let lastSave = performance.now();
  let hiddenAt = 0;
  let offlineModalAutoHideTimer = 0;
  const tradeQuantities = Object.fromEntries(Object.keys(TRADE_PRICES).map(key => [key, 1]));
  let pendingTrade = null;
  let pendingMissingPurchase = null;
  let prestigeConfirmationStage = 0;
  const leaderboardState = { status: "idle", entries: [], error: "", loadingPromise: null, lastLoadedAt: 0 };
  const arenaState = { expanded: false, status: "idle", opponents: [], error: "", loadingPromise: null, lastLoadedAt: 0, battle: null, previousCombat: null, result: null };
  let leaderboardActiveTab = "ranking";
  let tradeHoldTimeout = 0;
  let tradeHoldInterval = 0;
  let lastCaptainEquipmentUpgrade = null;
  let lastCaptainManualSkillUpgrade = null;
  let activeCaptainEquipmentKey = "sword";
  let activeShipUpgradeCategory = "improvements";
  let activeMapInfoIndex = null;
  let pendingBossMapAdvanceTimer = 0;
  let pendingSurpriseBossTimer = 0;
  let manualAttackTutorialStartedAt = Date.now();
  let manualAttackTutorialDismissed = false;

  const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  function formatNumber(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1000) return numberFormatter.format(Math.round(n));
    const units = [[1e12, " tri"], [1e9, " bi"], [1e6, " mi"], [1e3, " mil"]];
    const [size, suffix] = units.find(([size]) => n >= size);
    const scaled = n / size;
    return scaled.toLocaleString("pt-BR", { maximumFractionDigits: scaled < 10 ? 1 : 0 }) + suffix;
  }
  function formatCaptainPercent(value) {
    const percent = Math.max(0, Number(value) || 0) * 100;
    return `${percent.toLocaleString("pt-BR", { maximumFractionDigits: percent < 10 ? 1 : 0 })}%`;
  }
  function isCaptainSelected() { return Boolean(normalizeCaptainGender(state.captainSelectedGender) && state.captainLevel > 0); }
  function canUpgradeCaptainSystems() { return isCaptainSelected(); }
  function shouldShowInitialCaptainGate() {
    return Math.floor(Number(state.pirateLevel || 1)) === 1 && !isCaptainSelected() && Math.floor(Number(state.prestiges || 0)) === 0 && !state.hasStarted;
  }
  function getCaptainGender() { return normalizeCaptainGender(state.captainSelectedGender); }
  function getCaptainLevel() { return isCaptainSelected() ? clamp(Math.floor(Number(state.captainLevel) || 1), 1, CAPTAIN_MAX_LEVEL) : 0; }
  function getCaptainBonuses(level = getCaptainLevel()) { return getCaptainBonusesForLevel(level); }
  function getCurrentCaptain() {
    const gender = getCaptainGender();
    const level = getCaptainLevel();
    if (!gender || !level) return null;
    return {
      ...getCaptainLevelData(level),
      gender,
      name: getCaptainName(level, gender),
      image: getCaptainImageUrl(level, gender),
      bonuses: getCaptainBonuses(level)
    };
  }
  function getNextCaptain() {
    const current = getCurrentCaptain();
    if (!current || current.level >= CAPTAIN_MAX_LEVEL) return null;
    const nextLevel = current.level + 1;
    return {
      ...getCaptainLevelData(nextLevel),
      gender: current.gender,
      name: getCaptainName(nextLevel, current.gender),
      image: getCaptainImageUrl(nextLevel, current.gender),
      bonuses: getCaptainBonuses(nextLevel)
    };
  }
  function getCaptainUpgradeCost() {
    const next = getNextCaptain();
    return next ? next.cost : null;
  }
  function getCaptainInvestedPirateCoins(level = state.captainLevel) {
    return CAPTAIN_LEVELS.slice(1, clamp(Math.floor(Number(level) || 0), 0, CAPTAIN_MAX_LEVEL)).reduce((sum, entry) => sum + entry.cost, 0);
  }
  function captainLevelPips(level) {
    return Array.from({ length: CAPTAIN_MAX_LEVEL }, (_, index) => `<i class="${index < level ? "on" : ""}"></i>`).join("");
  }
  function captainHomeSummary(bonuses = getCaptainBonuses()) {
    if (!isCaptainSelected()) return "Escolha seu visual";
    return `Spawn +${formatCaptainPercent(bonuses.spawnBonus)}`;
  }

  function xpNeeded(level = state.pirateLevel) { return Math.round(100 * Math.pow(level, 1.42)); }
  function bossesCount() { return state.bossesDefeated.filter(Boolean).length; }
  function isSkillUnlocked(key) { return state.pirateLevel >= SKILL_META[key].unlock; }
  function getPetLevel(id) {
    return clamp(Math.floor(Number(state.petLevels?.[id] || 1)), 1, PET_MAX_LEVEL);
  }
  function getPetMultiplier(level = 1) {
    return PET_BASE_STRENGTH_MULTIPLIER * (1 + (level - 1) * PET_UPGRADE_POWER_STEP);
  }
  function getPetUpgradeCost(id, level = getPetLevel(id)) {
    if (level >= PET_MAX_LEVEL) return null;
    return Math.round(PET_PIRATE_COIN_COSTS[id] * (1.8 + level * .7) * Math.pow(1.35, level - 1));
  }
  function percentFromPetBonus(value) {
    return Math.max(0, Number(value) || 0) / 100;
  }
  function formatPetBonusPercent(value) {
    const percent = Math.max(0, Number(value) || 0);
    return `${percent.toLocaleString("pt-BR", { maximumFractionDigits: percent % 1 ? 1 : 0 })}%`;
  }
  function getPetPrestigeRequirement(pet) {
    return Math.max(0, Math.floor(Number(pet?.prestigeReq ?? ((pet?.id ?? 0) + 1)) || 0));
  }
  function getPetBonuses(petId, level = 1) {
    const id = Math.floor(Number(petId));
    const config = PET_BONUS_CONFIG[id];
    const safeLevel = clamp(Math.floor(Number(level) || 1), 1, PET_MAX_LEVEL);
    return { ...PET_EMPTY_BONUSES, ...(config?.bonusesByLevel?.[safeLevel] || {}) };
  }
  function getPetBonusSummaryRows(petOrId, level = 1) {
    const id = typeof petOrId === "object" ? petOrId?.id : petOrId;
    const bonuses = getPetBonuses(id, level);
    return PET_BONUS_DISPLAY
      .filter(([key]) => Number(bonuses[key] || 0) > 0)
      .map(([key, label]) => ({
        label,
        value: key === "hpRegenPercentPer5s" ? `+${formatPetBonusPercent(bonuses[key])}/5s` : `+${formatPetBonusPercent(bonuses[key])}`
      }));
  }
  function getPetBonusInlineText(petOrId, level = 1, limit = 6) {
    return getPetBonusSummaryRows(petOrId, level).slice(0, limit).map(row => `${row.label} ${row.value}`).join(" • ");
  }
  function getActivePetBonuses(activePet = getEquippedPet()) {
    return activePet ? getPetBonuses(activePet.id, activePet.level) : { ...PET_EMPTY_BONUSES };
  }
  function applyActivePetBonuses(playerStats, activePet) {
    const bonuses = getActivePetBonuses(activePet);
    return {
      ...playerStats,
      damage: playerStats.damage * (1 + percentFromPetBonus(bonuses.shipAttackPercent)),
      attackSpeedBonus: (playerStats.attackSpeedBonus || 0) + percentFromPetBonus(bonuses.attackSpeedPercent),
      hpRegenPercentPer5s: (playerStats.hpRegenPercentPer5s || 0) + bonuses.hpRegenPercentPer5s,
      goldGainBonus: (playerStats.goldGainBonus || 0) + percentFromPetBonus(bonuses.goldPercent),
      xpGainBonus: (playerStats.xpGainBonus || 0) + percentFromPetBonus(bonuses.xpPercent),
      monsterSpawnBonusPercent: (playerStats.monsterSpawnBonusPercent || 0) + bonuses.monsterSpawnPercent,
      petBonuses: bonuses
    };
  }
  function getPetWithLevel(pet, level = getPetLevel(pet.id)) {
    const multiplier = getPetMultiplier(level);
    const scaled = {
      ...pet,
      level,
      maxLevel: PET_MAX_LEVEL,
      multiplier,
      damage: Math.round(pet.damage * multiplier),
      power: Math.round(pet.power * multiplier)
    };
    scaled.dps = scaled.damage / scaled.interval;
    scaled.bonuses = getPetBonuses(pet.id, level);
    scaled.bonus = getPetBonusInlineText(pet.id, level);
    return scaled;
  }
  function getPetAuraStyle(pet) {
    const level = pet?.level || 1;
    return `${getPetSpriteStyle(pet?.visual)}--pet-color:${pet?.color || "#6eefe2"};--pet-aura-size:${44 + level * 7}px;--pet-aura-glow:${5 + level * 1.5}px;--pet-aura-alpha:${Math.min(.12, .045 + level * .012)};`;
  }
  function petLevelPips(level) {
    return Array.from({ length: PET_MAX_LEVEL }, (_, index) => `<i class="${index < level ? "on" : ""}"></i>`).join("");
  }
  function getEquippedPet() {
    if (state.equippedPetId === null) return null;
    const pet = PETS[state.equippedPetId];
    return pet && state.ownedPets.includes(pet.id) && isPetUnlocked(pet) ? getPetWithLevel(pet) : null;
  }
  function isPetUnlocked(pet) {
    return state.prestiges >= getPetPrestigeRequirement(pet) && (!pet.regionReq || state.unlockedRegions >= pet.regionReq) && (pet.bossReq === undefined || state.bossesDefeated[pet.bossReq]);
  }

  function prestigeRegionIndex() { return REGIONS.findIndex(region => region.name === PRESTIGE_REGION_NAME); }
  function canPrestige() {
    const index = prestigeRegionIndex();
    return index >= 0 && state.unlockedRegions > index && state.bossesDefeated[index] && REGIONS[index].boss === PRESTIGE_BOSS_NAME;
  }
  function getPrestigeBonuses() {
    return { gold: state.prestiges * .04, xp: state.prestiges * .04, dps: state.prestiges * .02, speed: state.prestiges * .02, shipDamage: state.prestiges * .10, idle: state.prestiges * .02 };
  }
  function getCaptainEquipmentRewardBonuses(source = state) {
    const bonuses = getCaptainEquipmentBonuses(source);
    return { gold: bonuses.goldGainBonus || 0, xp: bonuses.xpGainBonus || 0 };
  }
  function getGoldGainMultiplier() {
    const prestige = getPrestigeBonuses();
    const equipment = getCaptainEquipmentRewardBonuses();
    const petBonuses = getActivePetBonuses();
    return (1 + prestige.gold) * (1 + equipment.gold + percentFromPetBonus(petBonuses.goldPercent));
  }
  function getXpGainMultiplier() {
    const prestige = getPrestigeBonuses();
    const equipment = getCaptainEquipmentRewardBonuses();
    const petBonuses = getActivePetBonuses();
    return (1 + prestige.xp) * (1 + equipment.xp + percentFromPetBonus(petBonuses.xpPercent));
  }
  function calculateGoldReward(amount) {
    return Math.round(Math.max(0, Number(amount) || 0) * getGoldGainMultiplier());
  }
  function calculateXpReward(amount) {
    return Math.max(0, Number(amount) || 0) * getXpGainMultiplier();
  }
  function getPrestigeMonsterCoinBonus() {
    return Math.floor(Math.max(0, Number(state.lifetime.enemies) || 0) / PRESTIGE_MONSTER_COIN_STEP) * PRESTIGE_MONSTER_COIN_BONUS;
  }
  function getPrestigeReward() {
    if (!canPrestige()) return 0;
    const stats = getStats();
    const resourceScore = Object.values(state.resources).reduce((sum, value) => sum + Math.log10(1 + Math.max(0, value)), 0);
    const upgradeScore = Object.values(state.levels).reduce((sum, value) => sum + Math.max(0, value - 1), 0);
    const nextPetCost = PET_PIRATE_COIN_COSTS[Math.min(state.prestiges, PET_PIRATE_COIN_COSTS.length - 1)];
    const progressScore = (state.maxRegionReached - prestigeRegionIndex()) * 3 + bossesCount() * .8 + state.pirateLevel * .12;
    const strengthScore = Math.sqrt(stats.power) / 14 + Math.sqrt(stats.dps) / 18 + Math.sqrt(stats.maxHp) / 30;
    const journeyScore = upgradeScore * .12 + Math.log10(1 + state.lifetime.enemies) * 1.5 + resourceScore * .08 + state.ownedPets.length;
    const baseReward = Math.max(nextPetCost, Math.floor(nextPetCost + Math.max(0, progressScore + strengthScore + journeyScore - 8)));
    return Math.floor(baseReward * PRESTIGE_PIRATE_COIN_REWARD_MULTIPLIER + getPrestigeMonsterCoinBonus());
  }

  function getSkillCooldown(key, level = state.skills[key].level, speed = getStats().speed) {
    const meta = SKILL_META[key];
    const levelReduction = Math.max(.75, 1 - (level - 1) * .015);
    return meta.cooldown * levelReduction / Math.min(1.8, Math.sqrt(speed / 100));
  }

  function getSkillValues(key, level = state.skills[key].level, stats = getStats()) {
    const meta = SKILL_META[key];
    const damage = stats.damage * (meta.factor + (level - 1) * .24);
    const duration = key === "fire" ? meta.burnDuration + (level - 1) * .25 : key === "ice" ? meta.slowDuration + (level - 1) * .2 : 0;
    const extraDps = key === "fire" ? stats.damage * (meta.burnFactor + (level - 1) * .04) : 0;
    const cooldown = getSkillCooldown(key, level, stats.speed);
    return { damage: Math.round(damage), duration, extraDps: Math.round(extraDps), cooldown, dps: Math.round((damage + extraDps * duration) / cooldown) };
  }

  function getNavalPowerV2Breakdown(stats = {}) {
    const basePower = 700;
    const dps = Math.max(0, Number(stats.dps) || 0);
    const damage = Math.max(0, Number(stats.damage) || 0);
    const maxHp = Math.max(0, Number(stats.maxHp ?? stats.max_hp ?? stats.hp) || 0);
    const attackIntervalMs = clamp(Number(stats.attackIntervalMs ?? stats.attack_interval_ms ?? stats.attackInterval) || 1400, 700, 3000);
    const attackSpeedFactor = clamp(1400 / attackIntervalMs, .6, 2);
    const defense = Math.max(0, Number(stats.defense ?? stats.armor) || 0);
    const damageReduction = clamp(Number(stats.damageReduction ?? stats.damage_reduction ?? stats.armorReduction) || 0, 0, .75);
    const dodgeChance = clamp(Number(stats.dodgeChance ?? stats.dodge_chance ?? stats.evasion) || 0, 0, .5);
    const critChance = clamp(Number(stats.critChance ?? stats.crit_chance ?? stats.crit) || 0, 0, 1);
    const critMultiplier = Math.max(1, Number(stats.critMultiplier ?? stats.crit_multiplier) || 1);
    const estimatedDpsFromHit = damage * (1000 / attackIntervalMs);
    const effectiveDps = dps > 0 ? dps : estimatedDpsFromHit;
    const defenseReduction = defense > 0 ? defense / (defense + 100) : 0;
    const totalReduction = clamp(damageReduction + defenseReduction, 0, .85);
    const effectiveHp = maxHp / Math.max(.15, 1 - totalReduction);
    const effectiveHpWithDodge = effectiveHp / Math.max(.5, 1 - dodgeChance);
    const critBonus = effectiveDps * critChance * Math.max(0, critMultiplier - 1);
    const speedBonus = damage * (attackSpeedFactor - 1) * 6;
    const offensePower = effectiveDps * 15.6;
    const damagePower = damage * 8;
    const survivalPower = effectiveHpWithDodge * 1.5;
    const critPower = critBonus * 6;
    const petPower = Math.max(0, Number(stats.petPower ?? stats.pet_power) || 0);
    const skillPower = Math.max(0, Number(stats.skillPower ?? stats.skill_power) || 0);
    const prestigePower = Math.max(0, Number(stats.prestigePower ?? stats.prestige_power) || 0);
    const offense = Math.max(0, Math.round(offensePower + damagePower + speedBonus + critPower));
    const survival = Math.max(0, Math.round(survivalPower));
    const bonuses = Math.max(0, Math.round(basePower + petPower + skillPower + prestigePower));
    const total = Math.max(0, Math.round(basePower + offensePower + damagePower + survivalPower + speedBonus + critPower + petPower + skillPower + prestigePower));
    return { total, offense, survival, bonuses, formulaVersion: POWER_FORMULA_VERSION };
  }

  function calculateNavalPowerV2(stats = {}) {
    return getNavalPowerV2Breakdown(stats).total;
  }

  function getStats(shipId = state.shipId) {
    const ship = SHIPS[shipId];
    const overall = 1 + (state.levels.ship - 1) * .06;
    const damageBonus = 1 + (state.levels.cannons - 1) * .13;
    const speedBonus = 1 + (state.levels.sails - 1) * .075;
    const hpBonus = 1 + (state.levels.hull - 1) * .15;
    const prestigeBonuses = getPrestigeBonuses();
    const captainEquipmentBonuses = getCaptainEquipmentBonuses();
    let damage = ship.damage * overall * damageBonus * (1 + prestigeBonuses.dps) * (1 + prestigeBonuses.shipDamage) * (1 + captainEquipmentBonuses.shipDamageBonus);
    let speed = ship.speed * overall * speedBonus * (1 + prestigeBonuses.speed);
    let maxHp = ship.hp * overall * hpBonus * (1 + captainEquipmentBonuses.shipHpBonus);
    let armor = ship.armor + (state.levels.hull - 1) * 2.2 + (state.levels.ship - 1) * .7;
    let precision = Math.min(.98, .83 + (state.levels.cannons - 1) * .006);
    let crit = Math.min(.55, .06 + (state.levels.cannons - 1) * .005);
    if (state.equipment.compass) speed *= 1.12;
    if (state.equipment.spyglass) { precision = Math.min(1, precision + .08); crit = Math.min(.7, crit + .07); }
    if (state.equipment.anchor) { armor += 20; maxHp *= 1.1; }
    if (state.equipment.amulet) damage *= 1.25;
    const pet = getEquippedPet();
    if (captainEquipmentBonuses.shipArmorBonus) armor *= 1 + captainEquipmentBonuses.shipArmorBonus;
    crit = Math.min(.75, crit + captainEquipmentBonuses.critChance);
    const evasion = Math.min(.6, Math.min(.3, .03 + speed / 5000) + captainEquipmentBonuses.dodgeChance);
    const doubleAttackChance = Math.min(.5, captainEquipmentBonuses.doubleAttackChance);
    let attackSpeedBonus = captainEquipmentBonuses.shipAttackSpeedBonus;
    ({ damage, speed, maxHp, armor, attackSpeedBonus } = applyActivePetBonuses({ damage, speed, maxHp, armor, attackSpeedBonus }, pet));
    const armorReduction = Math.min(.75, (1 - 100 / (100 + armor * 4)) + captainEquipmentBonuses.shipArmorBonus);
    const attackInterval = Math.max(190, 100000 / speed / (1 + attackSpeedBonus));
    const basicDps = damage / (attackInterval / 1000) * precision * (1 + crit) * (1 + doubleAttackChance);
    let skillDps = 0;
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      if (!isSkillUnlocked(key) || !state.skills[key].auto) return;
      const level = state.skills[key].level;
      const effectiveCooldown = getSkillCooldown(key, level, speed);
      skillDps += damage * (meta.factor + (level - 1) * .24) / effectiveCooldown;
      if (key === "fire") skillDps += damage * (meta.burnFactor + (level - 1) * .04) * meta.burnDuration / effectiveCooldown;
    });
    const shipDps = basicDps;
    const boostedSkillDps = skillDps;
    const petDps = pet?.dps || 0;
    const navalDps = shipDps + boostedSkillDps;
    const totalDps = Math.round(navalDps + petDps);
    const unlockedSkillLevels = Object.entries(state.skills).reduce((sum, [key, skill]) => sum + (isSkillUnlocked(key) ? skill.level : 0), 0);
    const powerBreakdown = getNavalPowerV2Breakdown({
      dps: totalDps,
      damage,
      maxHp,
      attackIntervalMs: attackInterval,
      defense: armor,
      damageReduction: armorReduction,
      dodgeChance: evasion,
      critChance: crit,
      critMultiplier: 2,
      petPower: pet?.power || 0,
      skillPower: unlockedSkillLevels * 55
    });
    const power = powerBreakdown.total;
    return {
      damage: Math.round(damage), speed: Math.round(speed), maxHp: Math.round(maxHp), armor: Math.round(armor),
      precision, crit, evasion, armorReduction, attackSpeedBonus, doubleAttackChance, attackInterval,
      shipDps: Math.round(shipDps), skillDps: Math.round(boostedSkillDps), petDps: Math.round(petDps),
      dps: totalDps, power, powerBreakdown
    };
  }

  function getSpawnDelay() {
    const baseSpawnInterval = 5000 * Math.pow(100 / getStats().speed, .72);
    const petBonuses = getActivePetBonuses();
    return Math.max(PET_MIN_MONSTER_SPAWN_INTERVAL_MS, baseSpawnInterval / (1 + getCaptainBonuses().spawnBonus + percentFromPetBonus(petBonuses.monsterSpawnPercent)));
  }

  function getCombatRegionLabel(region = REGIONS[state.regionIndex]) {
    const regionIndex = REGIONS.indexOf(region);
    const number = regionIndex >= 0 ? regionIndex + 1 : state.regionIndex + 1;
    return `${number} - ${region.name}`;
  }

  function isAutoAttackUnlocked(source = state) {
    return Math.floor(Number(source.captainRuntimeLevel || 1)) >= AUTO_ATTACK_CAPTAIN_LEVEL_REQUIRED;
  }

  function isCurrentBossChallengeAvailable() {
    return !isArenaSceneActive() && state.regionKills[state.regionIndex] >= 100 && !state.bossesDefeated[state.regionIndex] && !state.combat.enemy;
  }

  function maybeAutoChallengeBoss() {
    if (!state.autoChallengeBoss || !state.combat.running || !isCurrentBossChallengeAvailable()) return false;
    return challengeBoss({ automatic: true });
  }

  function shouldShowManualAttackTutorial(now = Date.now()) {
    return !shouldShowInitialCaptainGate() && !isArenaSceneActive() && state.pirateLevel < 2 && !manualAttackTutorialDismissed && now - manualAttackTutorialStartedAt <= MANUAL_ATTACK_TUTORIAL_DURATION_MS;
  }

  function completeManualAttackTutorial() {
    manualAttackTutorialDismissed = true;
    $("#manual-attack-tutorial")?.classList.add("hidden");
  }

  function getUpgradeCost(type, level = state.levels[type]) {
    const pow = (base, growth) => Math.round(base * Math.pow(growth, level - 1));
    if (type === "ship") {
      const cost = { ouro: pow(120, 1.54), madeira: pow(12, 1.42) };
      if (level >= 3) cost.comida = pow(5, 1.35);
      if (level >= 10) cost.perola = pow(1, 1.25);
      return goldOnlyBundle(cost);
    }
    if (type === "cannons") {
      const cost = { ouro: pow(150, 1.55), ferro: pow(15, 1.43), polvora: pow(10, 1.43) };
      if (level >= 7) cost.cristal = pow(2, 1.3);
      if (level >= 13) cost.gema = pow(1, 1.22);
      return goldOnlyBundle(cost);
    }
    if (type === "sails") {
      const cost = { ouro: pow(100, 1.52), tecido: pow(10, 1.44) };
      if (level >= 7) cost.cristal = pow(2, 1.28);
      if (level >= 13) cost.gema = pow(1, 1.2);
      return goldOnlyBundle(cost);
    }
    const cost = { ouro: pow(150, 1.56), madeira: pow(25, 1.42), ferro: pow(10, 1.4) };
    if (level >= 5) cost.pedra = pow(4, 1.35);
    if (level >= 9) cost.cristal = pow(2, 1.28);
    if (level >= 14) cost.perola = pow(1, 1.2);
    return goldOnlyBundle(cost);
  }

  function getSkillCost(key) {
    const level = state.skills[key].level;
    const meta = SKILL_META[key];
    const cost = { ouro: Math.round(300 * Math.pow(1.62, level - 1)) };
    cost[meta.materials[0]] = Math.round(12 * Math.pow(1.48, level - 1));
    cost[meta.materials[1]] = Math.round(6 * Math.pow(1.42, level - 1));
    return goldOnlyBundle(cost);
  }

  function canAfford(cost) { return Object.entries(goldOnlyBundle(cost)).every(([key, amount]) => (state.resources[key] || 0) >= amount); }
  function spend(cost) { Object.entries(goldOnlyBundle(cost)).forEach(([key, amount]) => { state.resources[key] = Math.max(0, (state.resources[key] || 0) - amount); }); }
  function isDirectlyPurchasableResource(key) { return key !== "ouro" && key !== "fragmentos" && Boolean(TRADE_PRICES[key]); }
  function getMissingResourceEntries(cost) {
    const normalized = goldOnlyBundle(cost);
    return Object.entries(normalized).map(([key, amount]) => ({ key, amount, owned: state.resources[key] || 0, missing: Math.max(0, amount - (state.resources[key] || 0)) })).filter(item => item.missing > 0);
  }
  function getMissingPurchaseInfo(cost) {
    const missing = getMissingResourceEntries(cost);
    const purchasable = missing.filter(item => isDirectlyPurchasableResource(item.key)).map(item => {
      const unitPrice = TRADE_PRICES[item.key].buy;
      return { ...item, unitPrice, total: item.missing * unitPrice };
    });
    const blocked = missing.filter(item => !isDirectlyPurchasableResource(item.key));
    const total = purchasable.reduce((sum, item) => sum + item.total, 0);
    const goldAfterPurchase = state.resources.ouro - total;
    const goldCost = cost.ouro || 0;
    return {
      missing,
      purchasable,
      blocked,
      total,
      canBuyMissing: purchasable.length > 0 && state.resources.ouro >= total,
      canBuyAndExecute: purchasable.length > 0 && state.resources.ouro >= total + goldCost && blocked.every(item => item.key === "ouro")
    };
  }

  function mergeProgression(saved = {}, defaults = makeProgressionDefaults()) {
    const merged = {
      ...defaults,
      ...saved,
      upgradesByType: { ...defaults.upgradesByType, ...(saved.upgradesByType || {}) },
      skillUses: { ...defaults.skillUses, ...(saved.skillUses || {}) },
      trade: { ...defaults.trade, ...(saved.trade || {}) },
      offline: { ...defaults.offline, ...(saved.offline || {}) },
      resourcesByKey: { ...defaults.resourcesByKey, ...(saved.resourcesByKey || {}) },
      resourceTypesSeen: { ...(saved.resourceTypesSeen || {}) },
      daily: { ...defaults.daily, ...(saved.daily || {}) },
      weekly: { ...defaults.weekly, ...(saved.weekly || {}) }
    };
    return merged;
  }

  function resetPeriodicProgressIfNeeded() {
    const defaults = makeProgressionDefaults();
    if (state.progression.dayKey !== defaults.dayKey) {
      state.progression.dayKey = defaults.dayKey;
      state.progression.daily = defaults.daily;
      missionDefinitions.filter(item => item.resets === "daily").forEach(item => {
        delete state.quests.completed[item.id];
        delete state.quests.claimed[item.id];
      });
    }
    if (state.progression.weekKey !== defaults.weekKey) {
      state.progression.weekKey = defaults.weekKey;
      state.progression.weekly = defaults.weekly;
      missionDefinitions.filter(item => item.resets === "weekly").forEach(item => {
        delete state.quests.completed[item.id];
        delete state.quests.claimed[item.id];
      });
    }
  }
  function buyMissingResources(cost) {
    const info = getMissingPurchaseInfo(cost);
    if (!info.purchasable.length) return { ok: false, message: "Nenhum recurso faltante pode ser comprado direto." };
    if (state.resources.ouro < info.total) return { ok: false, message: "Ouro insuficiente para comprar os recursos faltantes." };
    state.resources.ouro -= info.total;
    info.purchasable.forEach(item => { state.resources[item.key] += item.missing; });
    const bought = info.purchasable.map(item => `${formatNumber(item.missing)} ${RESOURCE_META[item.key].name}`).join(" • ");
    addLog(`Compra direta: ${bought} por ${formatNumber(info.total)} Ouro.`, "loot");
    return { ok: true, total: info.total, bought };
  }

  function addLog(message, type = "") {
    const importantPatterns = [
      /Vit/i,
      /Derrota/i,
      /Drop/i,
      /Boss derrotado/i,
      /Novo mapa/i,
      /Miss/i,
      /Capit/i,
      /acompanha/i,
      /Prest/i,
      /ba[uú]/i
    ];
    if (!importantPatterns.some(pattern => pattern.test(message))) return;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.logs.unshift({ message, type, time });
    state.logs = state.logs.slice(0, 100);
  }

  function shouldSuppressMobileToast(options = {}) {
    if (options.mobileAllowed) return false;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  }

  function toast(message, type = "", options = {}) {
    if (shouldSuppressMobileToast(options)) return;
    const region = $("#toast-region");
    if (!region) return;
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    region.append(node);
    setTimeout(() => node.remove(), 3300);
  }

  function gainXp(amount) {
    const earnedXp = calculateXpReward(amount);
    state.xp += earnedXp;
    addCaptainRuntimeXp(earnedXp);
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.pirateLevel += 1;
      const unlocked = Object.entries(SKILL_META).find(([, meta]) => meta.unlock === state.pirateLevel);
      scene.celebrateCaptain(1.8);
      toast(unlocked ? `Nível ${state.pirateLevel}! ${unlocked[1].name} foi desbloqueado.` : `Nível ${state.pirateLevel} alcançado!`, "gold-toast");
      addLog(`Seu capitão alcançou o nível ${state.pirateLevel}.`, "loot");
    }
  }

  function saveGame() {
    if (VISUAL_AUDIT_CONFIG) return;
    const lastSeen = Date.now();
    state.lastSeen = lastSeen;
    const saveState = isArenaSceneActive() && arenaState.previousCombat?.combat
      ? { ...state, combat: JSON.parse(JSON.stringify(arenaState.previousCombat.combat)), lastSeen }
      : state;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveState)); } catch (error) { console.warn("Não foi possível salvar.", error); }
  }

  function closeOfflineModal() {
    clearTimeout(offlineModalAutoHideTimer);
    offlineModalAutoHideTimer = 0;
    $("#offline-modal")?.classList.add("hidden");
  }

  function showOfflineModal() {
    const modal = $("#offline-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    clearTimeout(offlineModalAutoHideTimer);
    offlineModalAutoHideTimer = window.setTimeout(closeOfflineModal, OFFLINE_MODAL_AUTO_HIDE_MS);
  }

  function commitGame(expensive = true) {
    renderAll(expensive);
    saveGame();
  }

  function getPirateRankTitle(source = state) {
    const level = Math.floor(Number(source?.pirateLevel || 1));
    return level >= 50 ? "Lenda Abissal" : level >= 30 ? "Almirante" : level >= 15 ? "Capitão" : level >= 5 ? "Corsário" : "Marujo";
  }

  function getCaptainPublicTitle(source = state) {
    return Array.isArray(source?.titles) && source.titles.length ? source.titles[0] : getPirateRankTitle(source);
  }

  function getOnlineConfig() {
    const raw = typeof window !== "undefined" ? (window.PIRATES_ONLINE_CONFIG || {}) : {};
    const supabaseUrl = String(raw.supabaseUrl || raw.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const supabaseAnonKey = String(raw.supabaseAnonKey || raw.SUPABASE_ANON_KEY || "").trim();
    const apiBaseUrl = String(raw.apiBaseUrl || raw.API_BASE_URL || "").trim().replace(/\/+$/, "");
    const provider = String(raw.provider || (supabaseUrl && supabaseAnonKey ? "supabase" : apiBaseUrl ? "rest" : "")).trim().toLowerCase();
    return {
      provider,
      supabaseUrl,
      supabaseAnonKey,
      apiBaseUrl,
      tableName: String(raw.tableName || "pirate_leaderboard").trim() || "pirate_leaderboard",
      readRelationName: String(raw.readRelationName || raw.readTableName || "pirate_leaderboard_public").trim() || "pirate_leaderboard_public",
      arenaRelationName: String(raw.arenaRelationName || raw.arenaReadRelationName || "pirate_arena_public").trim() || "pirate_arena_public",
      limit: clamp(Math.floor(Number(raw.limit || LEADERBOARD_LIMIT)), 1, 100)
    };
  }

  function isLeaderboardConfigured(config = getOnlineConfig()) {
    if (config.provider === "supabase") return Boolean(config.supabaseUrl && config.supabaseAnonKey);
    if (config.provider === "rest") return Boolean(config.apiBaseUrl);
    return false;
  }

  function getLeaderboardSelectColumns() {
    return [
      "player_id",
      "pirate_name",
      "selected_pirate_id",
      "selected_pirate_name",
      "prestige_count",
      "best_prestige_level",
      "best_prestige_power",
      "ship_name",
      "ship_level",
      "highest_map_unlocked",
      "highest_map_name",
      "last_prestige_at",
      "updated_at"
    ].join(",");
  }

  function leaderboardHeaders(config) {
    if (config.provider !== "supabase") return { "Content-Type": "application/json" };
    return {
      "Content-Type": "application/json",
      "apikey": config.supabaseAnonKey,
      "Authorization": `Bearer ${config.supabaseAnonKey}`
    };
  }

  async function requestLeaderboardRows(config) {
    if (config.provider === "supabase") {
      const params = new URLSearchParams({
        select: getLeaderboardSelectColumns(),
        best_prestige_level: "gte.1",
        order: "best_prestige_power.desc,best_prestige_level.desc,prestige_count.desc,last_prestige_at.desc",
        limit: String(config.limit)
      });
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.readRelationName}?${params}`, {
        headers: leaderboardHeaders(config)
      });
      if (!response.ok) throw new Error(`Ranking indisponível (${response.status})`);
      return response.json();
    }
    const response = await fetch(`${config.apiBaseUrl}/leaderboard?limit=${config.limit}`);
    if (!response.ok) throw new Error(`Ranking indisponível (${response.status})`);
    return response.json();
  }

  async function sendLeaderboardRow(config, record) {
    if (config.provider === "supabase") {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/upsert_pirate_leaderboard`, {
        method: "POST",
        headers: leaderboardHeaders(config),
        body: JSON.stringify({
          p_player_id: record.player_id,
          p_pirate_name: record.pirate_name,
          p_selected_pirate_id: record.selected_pirate_id,
          p_selected_pirate_name: record.selected_pirate_name,
          p_prestige_count: record.prestige_count,
          p_best_prestige_level: record.best_prestige_level,
          p_best_prestige_power: record.best_prestige_power,
          p_last_prestige_at: record.last_prestige_at,
          p_pvp_snapshot: record.pvp_snapshot
        })
      });
      if (!response.ok) throw new Error(`Falha ao enviar ranking (${response.status})`);
      return;
    }
    const response = await fetch(`${config.apiBaseUrl}/leaderboard`, {
      method: "POST",
      headers: leaderboardHeaders(config),
      body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error(`Falha ao enviar ranking (${response.status})`);
  }

  function normalizeLeaderboardRow(row = {}) {
    return {
      player_id: String(row.player_id || row.playerId || ""),
      pirate_name: sanitizePirateName(row.pirate_name || row.pirateName || "Pirata sem nome") || "Pirata sem nome",
      selected_pirate_name: String(row.selected_pirate_name || row.selectedPirateName || ""),
      prestige_count: Math.max(0, Math.floor(Number(row.prestige_count ?? row.prestigeCount ?? 0))),
      best_prestige_level: Math.max(0, Math.floor(Number(row.best_prestige_level ?? row.bestPrestigeLevel ?? row.prestige_count ?? 0))),
      best_prestige_power: Math.max(0, Math.floor(Number(row.best_prestige_power ?? row.bestPrestigePower ?? row.combat_power ?? row.combatPower ?? row.naval_power ?? row.navalPower ?? 0))),
      ship_name: String(row.ship_name || row.shipName || "").trim(),
      ship_level: Math.max(0, Math.floor(Number(row.ship_level ?? row.shipLevel ?? 0) || 0)),
      highest_map_unlocked: Math.max(0, Math.floor(Number(row.highest_map_unlocked ?? row.highestMapUnlocked ?? 0) || 0)),
      highest_map_name: String(row.highest_map_name || row.highestMapName || "").trim(),
      last_prestige_at: row.last_prestige_at || row.lastPrestigeAt || row.updated_at || row.updatedAt || ""
    };
  }

  function compareLeaderboardEntries(a = {}, b = {}) {
    const dateA = Date.parse(a.last_prestige_at || "") || 0;
    const dateB = Date.parse(b.last_prestige_at || "") || 0;
    return Math.max(0, Number(b.best_prestige_power || 0)) - Math.max(0, Number(a.best_prestige_power || 0))
      || Math.max(0, Number(b.best_prestige_level || b.prestige_count || 0)) - Math.max(0, Number(a.best_prestige_level || a.prestige_count || 0))
      || Math.max(0, Number(b.prestige_count || 0)) - Math.max(0, Number(a.prestige_count || 0))
      || dateB - dateA;
  }

  function formatLeaderboardDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  function leaderboardProgressMeta(entry = {}) {
    const ship = entry.ship_name ? entry.ship_name : "Barco não informado";
    const shipLevel = entry.ship_level ? `Nv. ${formatNumber(entry.ship_level)}` : "Nv. ?";
    const map = entry.highest_map_name
      ? entry.highest_map_name
      : entry.highest_map_unlocked
        ? `Mapa ${formatNumber(entry.highest_map_unlocked)}`
        : "Mapa não informado";
    return `${ship} • ${shipLevel} • ${map}`;
  }

  function renderLeaderboardTabs() {
    const active = leaderboardActiveTab === "arena" ? "arena" : "ranking";
    $$("[data-leaderboard-tab]").forEach(button => {
      const selected = button.dataset.leaderboardTab === active;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    $("#leaderboard-ranking-panel")?.classList.toggle("hidden", active !== "ranking");
    $("#leaderboard-ranking-panel")?.classList.toggle("active", active === "ranking");
    $("#leaderboard-arena-panel")?.classList.toggle("hidden", active !== "arena");
    $("#leaderboard-arena-panel")?.classList.toggle("active", active === "arena");
    $("#leaderboard-refresh")?.classList.toggle("hidden", active !== "ranking");
  }

  function selectLeaderboardTab(tab) {
    leaderboardActiveTab = tab === "arena" ? "arena" : "ranking";
    renderLeaderboardTabs();
    renderLeaderboard();
    renderArenaPanel();
  }

  function renderLeaderboard() {
    const status = $("#leaderboard-status");
    const list = $("#leaderboard-list");
    if (!status || !list) return;
    renderLeaderboardTabs();
    const refresh = $("#leaderboard-refresh");
    if (refresh) refresh.disabled = leaderboardState.status === "loading";
    list.innerHTML = "";
    if (leaderboardState.status === "loading") {
      status.textContent = "Carregando ranking...";
      return;
    }
    if (leaderboardState.status === "unavailable") {
      status.textContent = leaderboardState.error || "Ranking online indisponível no momento.";
      return;
    }
    if (!leaderboardState.entries.length) {
      status.textContent = "Nenhum pirata realizou Prestígio ainda. Seja o primeiro!";
      return;
    }
    status.textContent = "";
    list.innerHTML = leaderboardState.entries.map((entry, index) => {
      const prestige = entry.best_prestige_level || entry.prestige_count || 0;
      const power = entry.best_prestige_power || 0;
      const date = formatLeaderboardDate(entry.last_prestige_at);
      const isCurrentPlayer = entry.player_id && entry.player_id === state.playerId;
      return `<div class="leaderboard-row ${isCurrentPlayer ? "current-player" : ""}">
        <strong>#${index + 1}</strong>
        <div class="leaderboard-player"><span>${escapeHtml(entry.pirate_name)}</span><small>${escapeHtml(leaderboardProgressMeta(entry))}</small></div>
        <span class="leaderboard-score">Poder ${formatNumber(power)}</span>
        <small class="leaderboard-date">Prestígio ${formatNumber(prestige)}${date ? ` • ${date}` : ""}</small>
      </div>`;
    }).join("");
  }

  async function refreshLeaderboard(options = {}) {
    const config = getOnlineConfig();
    if (!isLeaderboardConfigured(config)) {
      leaderboardState.status = "unavailable";
      leaderboardState.error = "Ranking online indisponível no momento.";
      renderLeaderboard();
      return [];
    }
    if (leaderboardState.loadingPromise) return leaderboardState.loadingPromise;
    if (!options.force && leaderboardState.status === "ready" && Date.now() - leaderboardState.lastLoadedAt < 30000) {
      renderLeaderboard();
      return leaderboardState.entries;
    }
    leaderboardState.status = "loading";
    leaderboardState.error = "";
    renderLeaderboard();
    leaderboardState.loadingPromise = requestLeaderboardRows(config)
      .then(rows => {
        const entries = (Array.isArray(rows) ? rows : rows?.entries || []).map(normalizeLeaderboardRow).sort(compareLeaderboardEntries);
        leaderboardState.entries = entries;
        leaderboardState.status = "ready";
        leaderboardState.lastLoadedAt = Date.now();
        return entries;
      })
      .catch(error => {
        console.warn("Ranking online indisponível.", error);
        leaderboardState.entries = [];
        leaderboardState.status = "unavailable";
        leaderboardState.error = "Ranking online indisponível no momento.";
        return [];
      })
      .finally(() => {
        leaderboardState.loadingPromise = null;
        renderLeaderboard();
      });
    return leaderboardState.loadingPromise;
  }

  function getArenaSelectColumns() {
    return [
      "player_id",
      "pirate_name",
      "selected_pirate_id",
      "selected_pirate_name",
      "prestige_count",
      "best_prestige_level",
      "best_prestige_power",
      "pvp_snapshot",
      "last_prestige_at",
      "updated_at"
    ].join(",");
  }

  async function requestArenaRows(config) {
    if (config.provider === "supabase") {
      const params = new URLSearchParams({
        select: getArenaSelectColumns(),
        best_prestige_level: "gte.1",
        order: "best_prestige_power.desc,best_prestige_level.desc,prestige_count.desc,last_prestige_at.desc",
        limit: String(ARENA_OPPONENT_LIMIT * 2)
      });
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.arenaRelationName}?${params}`, {
        headers: leaderboardHeaders(config)
      });
      if (!response.ok) throw new Error(`Arena indisponível (${response.status})`);
      return response.json();
    }
    const response = await fetch(`${config.apiBaseUrl}/arena/opponents?limit=${ARENA_OPPONENT_LIMIT * 2}`);
    if (!response.ok) throw new Error(`Arena indisponível (${response.status})`);
    return response.json();
  }

  function findShipByName(name = "") {
    const normalized = normalizeText(name);
    return SHIPS.find(ship => normalizeText(ship.name) === normalized)
      || SHIPS.find(ship => normalized && normalizeText(ship.name).includes(normalized))
      || SHIPS.find(ship => normalized && normalized.includes(normalizeText(ship.name)))
      || null;
  }

  function parseShipId(value, fallbackName = "") {
    if (Number.isFinite(Number(value))) return clamp(Math.floor(Number(value)), 0, SHIPS.length - 1);
    const match = String(value || "").match(/(\d+)/);
    if (match) return clamp(Math.floor(Number(match[1])), 0, SHIPS.length - 1);
    return findShipByName(fallbackName)?.id ?? null;
  }

  function normalizeArenaAttackIntervalMs(source = {}) {
    const combat = source.combat || {};
    const ship = source.ship || {};
    const explicit = Number(source.attack_interval_ms ?? combat.attack_interval_ms ?? ship.attack_interval_ms);
    if (Number.isFinite(explicit) && explicit > 0) return clamp(Math.round(explicit), ARENA_ATTACK_INTERVAL_MIN_MS, ARENA_ATTACK_INTERVAL_MAX_MS);
    const speed = Number(source.attack_speed ?? combat.attack_speed ?? ship.attack_speed);
    if (Number.isFinite(speed) && speed > 0) {
      const interval = speed <= 20 ? speed * 1000 : ARENA_ATTACK_INTERVAL_DEFAULT_MS / speed;
      return clamp(Math.round(interval), ARENA_ATTACK_INTERVAL_MIN_MS, ARENA_ATTACK_INTERVAL_MAX_MS);
    }
    return ARENA_ATTACK_INTERVAL_DEFAULT_MS;
  }

  function arenaBandForPower(power = 0) {
    const safePower = Math.max(0, Number(power) || 0);
    const first = ARENA_NORMALIZATION_BANDS[0];
    const last = ARENA_NORMALIZATION_BANDS[ARENA_NORMALIZATION_BANDS.length - 1];
    const band = ARENA_NORMALIZATION_BANDS.find(item => safePower <= item.max) || last;
    const ratio = band.max > band.min ? clamp((clamp(safePower, band.min, band.max) - band.min) / (band.max - band.min), 0, 1) : 0;
    const lerp = ([min, max]) => Math.round(min + (max - min) * ratio);
    return {
      hp: band.hp,
      damage: band.damage,
      preferredHp: lerp(band.hp),
      preferredDamage: lerp(band.damage),
      minHp: first.hp[0],
      maxHp: last.hp[1],
      minDamage: first.damage[0],
      maxDamage: last.damage[1]
    };
  }

  function arenaNormalizedStat(value, [preferred, max], fallback) {
    const numeric = Math.round(Number(value) || 0);
    const safeFallback = Math.max(1, Math.round(Number(fallback) || preferred || 1));
    if (numeric <= 0) return clamp(safeFallback, preferred, max);
    return clamp(numeric, preferred, max);
  }

  function getArenaHp(value) {
    return Math.max(1, Math.round((Number(value) || 1) * ARENA_HP_MULTIPLIER));
  }

  function createArenaBotSnapshot([playerId, pirateName, botType, shipName, prestigeCount, shipLevel, maxHp, damage, referenceDps, attackIntervalMs]) {
    const ship = findShipByName(shipName);
    const safeAttackIntervalMs = clamp(Math.round(attackIntervalMs), ARENA_ATTACK_INTERVAL_MIN_MS, ARENA_ATTACK_INTERVAL_MAX_MS);
    const navalPower = calculateNavalPowerV2({
      dps: referenceDps,
      damage,
      maxHp,
      attackIntervalMs: safeAttackIntervalMs
    });
    return {
      snapshot_version: PVP_SNAPSHOT_VERSION,
      power_formula_version: POWER_FORMULA_VERSION,
      player_id: playerId,
      pirate_name: pirateName,
      is_bot: true,
      bot_type: botType,
      prestige: {
        prestige_count: prestigeCount,
        best_prestige_level: prestigeCount,
        best_prestige_power: navalPower
      },
      captain: {
        selected_pirate_id: `arena_${playerId}`,
        selected_pirate_name: pirateName,
        pirate_level: Math.max(1, Math.round(shipLevel / 4)),
        captain_title: botType
      },
      ship: {
        ship_id: ship ? `ship_${ship.id}` : playerId.replace("bot_arena_", "arena_ship_"),
        ship_name: shipName,
        ship_level: shipLevel,
        tier: ship?.tier ?? Math.min(5, Math.max(1, Math.ceil(shipLevel / 35))),
        max_hp: maxHp,
        damage,
        dps: referenceDps,
        naval_power: navalPower,
        combat_power: navalPower,
        attack_speed: safeAttackIntervalMs / 1000,
        attack_interval_ms: safeAttackIntervalMs
      },
      combat: {
        max_hp: maxHp,
        damage,
        dps: referenceDps,
        naval_power: navalPower,
        combat_power: navalPower,
        attack_speed: safeAttackIntervalMs / 1000,
        attack_interval_ms: safeAttackIntervalMs,
        defense: 0,
        damage_reduction: 0,
        dodge_chance: 0,
        crit_chance: 0,
        crit_multiplier: 1
      },
      bonuses: { pet_power: 0, skill_power: 0, prestige_power: 0 },
      upgrades: {
        ship_level: shipLevel,
        cannons_level: Math.max(1, Math.round(shipLevel * .55)),
        hull_level: Math.max(1, Math.round(shipLevel * .52)),
        sails_level: Math.max(1, Math.round(shipLevel * .45))
      },
      equipments: { ship_equipment: {}, captain_equipment_levels: {} },
      skills: { sabotage_enemy_level: Math.max(1, Math.min(20, Math.round(prestigeCount / 2))), sabotage_enemy_multiplier: 1 + prestigeCount * .08, ship_skill_levels: {} },
      pet: null,
      progression: { highest_map_unlocked: Math.min(15, Math.max(1, Math.ceil(prestigeCount / 2))), highest_map_name: null },
      updated_at: new Date().toISOString()
    };
  }

  function normalizeArenaOpponent(row = {}, index = 0) {
    const snapshot = row.pvp_snapshot || row.snapshot || row;
    const ship = snapshot.ship || {};
    const combat = snapshot.combat || {};
    const bonuses = snapshot.bonuses || {};
    const prestige = snapshot.prestige || {};
    const pirateName = sanitizeArenaDisplayName(snapshot.pirate_name || row.pirate_name || "Pirata da Arena");
    const shipName = String(ship.ship_name || snapshot.ship_name || row.ship_name || "Navio Pirata").trim() || "Navio Pirata";
    const shipId = ship.ship_id || snapshot.ship_id || row.ship_id || null;
    const parsedShipId = parseShipId(shipId, shipName);
    const matchedShip = parsedShipId !== null ? SHIPS[parsedShipId] : findShipByName(shipName);
    const attackIntervalMs = normalizeArenaAttackIntervalMs(snapshot);
    const rawMaxHp = Math.round(Number(combat.max_hp ?? ship.max_hp ?? snapshot.max_hp) || 0);
    const rawDamage = Math.round(Number(combat.damage ?? ship.damage ?? snapshot.damage) || 0);
    const dps = Math.max(1, Math.round(Number(combat.dps ?? ship.dps ?? snapshot.dps ?? rawDamage / (attackIntervalMs / 1000)) || rawDamage || 1));
    const fallbackPower = Math.round(Number(combat.naval_power ?? combat.combat_power ?? ship.naval_power ?? ship.combat_power ?? snapshot.naval_power ?? snapshot.combat_power ?? row.best_prestige_power) || 0);
    const recalculatedPower = calculateNavalPowerV2({
      dps,
      damage: rawDamage,
      maxHp: rawMaxHp,
      attackIntervalMs,
      defense: combat.defense ?? combat.armor ?? ship.armor,
      damageReduction: combat.damage_reduction ?? combat.damageReduction ?? combat.armorReduction,
      dodgeChance: combat.dodge_chance ?? combat.dodgeChance ?? combat.evasion,
      critChance: combat.crit_chance ?? combat.critChance ?? combat.crit,
      critMultiplier: combat.crit_multiplier ?? combat.critMultiplier ?? 1,
      petPower: bonuses.pet_power ?? snapshot.pet?.power,
      skillPower: bonuses.skill_power,
      prestigePower: bonuses.prestige_power
    });
    const hasPowerStats = rawMaxHp > 0 || rawDamage > 0 || dps > 1;
    const combatPower = Math.max(1, hasPowerStats ? recalculatedPower : fallbackPower || recalculatedPower);
    const arenaRange = arenaBandForPower(combatPower);
    const baseArenaMaxHp = arenaNormalizedStat(rawMaxHp, arenaRange.hp, arenaRange.preferredHp);
    const maxHp = getArenaHp(baseArenaMaxHp);
    const damage = arenaNormalizedStat(rawDamage, arenaRange.damage, arenaRange.preferredDamage);
    const arenaDps = Math.max(1, Math.round(damage * 1000 / ARENA_BALANCED_ATTACK_INTERVAL_MS));
    const prestigeCount = Math.max(1, Math.floor(Number(prestige.prestige_count ?? row.prestige_count ?? row.best_prestige_level ?? 1) || 1));
    return {
      id: String(snapshot.player_id || row.player_id || `arena_${index}`),
      player_id: String(snapshot.player_id || row.player_id || `arena_${index}`),
      pirate_name: pirateName,
      selected_pirate_id: snapshot.captain?.selected_pirate_id || row.selected_pirate_id || null,
      selected_pirate_name: snapshot.captain?.selected_pirate_name || row.selected_pirate_name || null,
      ship_id: shipId || (matchedShip ? `ship_${matchedShip.id}` : null),
      ship_name: shipName,
      ship_level: Math.max(1, Math.floor(Number(ship.ship_level ?? snapshot.ship_level ?? 1) || 1)),
      ship_tier: Math.max(0, Math.floor(Number(ship.tier ?? matchedShip?.tier ?? 1) || 1)),
      max_hp: maxHp,
      damage,
      dps: arenaDps,
      source_dps: dps,
      naval_power: combatPower,
      combat_power: combatPower,
      attack_speed: ARENA_BALANCED_ATTACK_INTERVAL_MS / 1000,
      attack_interval_ms: ARENA_BALANCED_ATTACK_INTERVAL_MS,
      source_attack_interval_ms: attackIntervalMs,
      prestige_count: prestigeCount,
      best_prestige_level: Math.max(prestigeCount, Math.floor(Number(prestige.best_prestige_level ?? row.best_prestige_level ?? prestigeCount) || prestigeCount)),
      best_prestige_power: combatPower,
      snapshot_version: Number(snapshot.snapshot_version || PVP_SNAPSHOT_VERSION),
      is_bot: Boolean(snapshot.is_bot || row.is_bot),
      source_snapshot: snapshot,
      sort_jitter: randomBetween(-.015, .015)
    };
  }

  function getArenaBotOpponents() {
    return ARENA_BOT_DEFINITIONS.map((definition, index) => normalizeArenaOpponent(createArenaBotSnapshot(definition), index));
  }

  function sortArenaOpponentsByPower(opponents = []) {
    return [...opponents].sort((a, b) => (a.combat_power * (1 + a.sort_jitter)) - (b.combat_power * (1 + b.sort_jitter)));
  }

  function pickArenaBotOpponents(count) {
    const bots = getArenaBotOpponents();
    if (count <= 0) return [];
    if (count >= bots.length) return bots;
    if (count === 1) return [bots[bots.length - 1]];
    const selected = [];
    const used = new Set();
    for (let i = 0; i < count; i += 1) {
      const index = Math.round(i * (bots.length - 1) / (count - 1));
      const bot = bots[index];
      if (bot && !used.has(bot.player_id)) {
        selected.push(bot);
        used.add(bot.player_id);
      }
    }
    for (let i = bots.length - 1; selected.length < count && i >= 0; i -= 1) {
      if (!used.has(bots[i].player_id)) selected.push(bots[i]);
    }
    return selected;
  }

  function buildArenaOpponentList(rows = []) {
    const seen = new Set();
    const real = (Array.isArray(rows) ? rows : rows?.entries || [])
      .map((row, index) => normalizeArenaOpponent(row, index))
      .filter(opponent => opponent.player_id && opponent.player_id !== state.playerId && !opponent.is_bot)
      .filter(opponent => {
        if (seen.has(opponent.player_id)) return false;
        seen.add(opponent.player_id);
        return true;
      })
      .sort((a, b) => (b.combat_power * (1 + b.sort_jitter)) - (a.combat_power * (1 + a.sort_jitter)))
      .slice(0, ARENA_OPPONENT_LIMIT);
    const bots = pickArenaBotOpponents(Math.max(0, ARENA_OPPONENT_LIMIT - real.length)).filter(bot => !seen.has(bot.player_id));
    const combined = [...sortArenaOpponentsByPower(real), ...sortArenaOpponentsByPower(bots)];
    return combined.slice(0, Math.max(ARENA_MIN_OPPONENTS, ARENA_OPPONENT_LIMIT));
  }

  async function refreshArenaOpponents(options = {}) {
    if (arenaState.loadingPromise) return arenaState.loadingPromise;
    if (!options.force && arenaState.status === "ready" && Date.now() - arenaState.lastLoadedAt < 30000) {
      renderArenaPanel();
      return arenaState.opponents;
    }
    const config = getOnlineConfig();
    arenaState.status = "loading";
    arenaState.error = "";
    renderArenaPanel();
    arenaState.loadingPromise = (async () => {
      try {
        const rows = isLeaderboardConfigured(config) ? await requestArenaRows(config) : [];
        arenaState.opponents = buildArenaOpponentList(rows);
        arenaState.status = "ready";
        arenaState.lastLoadedAt = Date.now();
      } catch (error) {
        console.warn("Arena online indisponível. Usando bots.", error);
        arenaState.opponents = buildArenaOpponentList([]);
        arenaState.status = "ready";
        arenaState.error = "Ranking online indisponível. Exibindo inimigos da Arena.";
        arenaState.lastLoadedAt = Date.now();
      } finally {
        arenaState.loadingPromise = null;
        renderArenaPanel();
      }
      return arenaState.opponents;
    })();
    return arenaState.loadingPromise;
  }

  function buildCaptainEquipmentSnapshot() {
    return Object.fromEntries(Object.entries(CAPTAIN_EQUIPMENT_META).map(([key, meta]) => [
      `${key}_level`,
      getCaptainEquipmentTier(key)
    ]).concat([
      ["sword_style_level", getCaptainEquipmentTier("sword")],
      ["light_hands_level", getCaptainEquipmentTier("lightHands")]
    ]));
  }

  function buildPvpSnapshot({ nowIso, nextPrestigeCount, prestigePower }) {
    const stats = getStats();
    const ship = SHIPS[state.shipId];
    const captain = getCurrentCaptain();
    const pet = getEquippedPet();
    const manualLevel = getCaptainManualSkillLevel(CAPTAIN_MANUAL_SKILL_KEY);
    const highestMap = getJourneyMaxUnlockedMap();
    return {
      snapshot_version: PVP_SNAPSHOT_VERSION,
      power_formula_version: POWER_FORMULA_VERSION,
      player_id: state.playerId,
      pirate_name: sanitizePirateName(state.pirateName),
      prestige: {
        prestige_count: nextPrestigeCount,
        best_prestige_level: nextPrestigeCount,
        best_prestige_power: prestigePower
      },
      captain: {
        selected_pirate_id: captain ? `captain_${captain.gender}_${captain.level}` : null,
        selected_pirate_name: captain?.name || null,
        pirate_level: state.pirateLevel,
        captain_runtime_level: state.captainRuntimeLevel,
        captain_title: getCaptainPublicTitle(state)
      },
      ship: {
        ship_id: `ship_${ship.id}`,
        ship_name: ship.name,
        ship_level: state.levels.ship,
        tier: ship.tier,
        max_hp: stats.maxHp,
        damage: stats.damage,
        dps: stats.dps,
        ship_dps: stats.shipDps,
        skill_dps: stats.skillDps,
        pet_dps: stats.petDps,
        naval_power: stats.power,
        combat_power: stats.power,
        attack_speed: Math.round(stats.attackInterval) / 1000,
        attack_interval_ms: Math.round(stats.attackInterval),
        speed: stats.speed,
        armor: stats.armor
      },
      combat: {
        max_hp: stats.maxHp,
        damage: stats.damage,
        dps: stats.dps,
        naval_power: stats.power,
        combat_power: stats.power,
        attack_speed: Math.round(stats.attackInterval) / 1000,
        attack_interval_ms: Math.round(stats.attackInterval),
        defense: stats.armor,
        damage_reduction: stats.armorReduction,
        dodge_chance: stats.evasion,
        crit_chance: stats.crit,
        crit_multiplier: 2
      },
      upgrades: {
        ship_level: state.levels.ship,
        cannons_level: state.levels.cannons,
        hull_level: state.levels.hull,
        sails_level: state.levels.sails
      },
      equipments: {
        ship_equipment: { ...state.equipment },
        captain_equipment_levels: buildCaptainEquipmentSnapshot()
      },
      skills: {
        sabotage_enemy_level: manualLevel,
        sabotage_enemy_multiplier: getCaptainManualSkillMultiplier(CAPTAIN_MANUAL_SKILL_KEY, manualLevel),
        ship_skill_levels: Object.fromEntries(Object.entries(state.skills).map(([key, skill]) => [key, Math.max(0, Math.floor(Number(skill.level || 0)))]))
      },
      pet: pet ? {
        pet_id: `pet_${pet.id}`,
        pet_name: pet.name,
        pet_level: pet.level,
        dps: Math.round(pet.dps || 0),
        power: Math.round(pet.power || 0)
      } : null,
      bonuses: {
        pet_power: Math.round(pet?.power || 0),
        skill_power: Math.max(0, Math.round(stats.powerBreakdown?.bonuses || 0) - 700 - Math.round(pet?.power || 0)),
        prestige_power: 0
      },
      permanent_bonuses: {
        prestige_bonuses: getPrestigeBonuses(),
        captain_bonuses: { ...state.captainBonuses },
        titles: Array.isArray(state.titles) ? state.titles.slice(0, 8) : [],
        owned_pet_ids: state.ownedPets.map(id => `pet_${id}`)
      },
      progression: {
        highest_map_unlocked: highestMap,
        highest_map_name: REGIONS[highestMap - 1]?.name || null
      },
      updated_at: nowIso
    };
  }

  function buildLeaderboardPrestigeRecord({ nowIso, nextPrestigeCount, prestigePower }) {
    const captain = getCurrentCaptain();
    return {
      player_id: state.playerId,
      pirate_name: sanitizePirateName(state.pirateName),
      selected_pirate_id: captain ? `captain_${captain.gender}_${captain.level}` : null,
      selected_pirate_name: captain?.name || null,
      prestige_count: nextPrestigeCount,
      best_prestige_level: nextPrestigeCount,
      best_prestige_power: prestigePower,
      last_prestige_at: nowIso,
      pvp_snapshot: buildPvpSnapshot({ nowIso, nextPrestigeCount, prestigePower })
    };
  }

  async function submitPrestigeLeaderboard(record) {
    const config = getOnlineConfig();
    if (!isLeaderboardConfigured(config)) {
      leaderboardState.status = "unavailable";
      leaderboardState.error = "Ranking online indisponível no momento.";
      renderLeaderboard();
      return;
    }
    try {
      await sendLeaderboardRow(config, record);
      await refreshLeaderboard({ force: true });
    } catch (error) {
      console.warn("Não foi possível atualizar o ranking online.", error);
      leaderboardState.status = "unavailable";
      leaderboardState.error = "Ranking online indisponível no momento.";
      renderLeaderboard();
      toast("Prestígio salvo localmente. Ranking online indisponível no momento.", "danger-toast");
    }
  }

  function loadCombatMinimizedPreference() {
    try { return localStorage.getItem(COMBAT_MINIMIZED_KEY) === "1"; } catch (error) { return false; }
  }

  function setCombatMinimized(minimized, persist = true) {
    combatMinimized = Boolean(minimized);
    const shell = $(".persistent-combat");
    const stage = $("#battle-stage");
    const button = $("#combat-collapse-toggle");
    shell?.classList.toggle("combat-minimized", combatMinimized);
    stage?.classList.toggle("combat-minimized", combatMinimized);
    if (button) {
      const label = combatMinimized ? "Maximizar combate" : "Minimizar combate";
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(combatMinimized));
      button.title = label;
      const icon = button.querySelector("span");
      if (icon) icon.textContent = combatMinimized ? "+" : "-";
    }
    if (persist) {
      try { localStorage.setItem(COMBAT_MINIMIZED_KEY, combatMinimized ? "1" : "0"); } catch (error) {}
    }
    scene?.resize?.();
  }

  function toggleCombatMinimized() {
    setCombatMinimized(!combatMinimized);
  }

  function getCombatFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function requestCombatFullscreen(element) {
    const request = element?.requestFullscreen || element?.webkitRequestFullscreen || element?.mozRequestFullScreen || element?.msRequestFullscreen;
    if (!request) return Promise.resolve(false);
    try {
      return Promise.resolve(request.call(element)).then(() => true);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function exitNativeCombatFullscreen() {
    if (!getCombatFullscreenElement()) return Promise.resolve(false);
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (!exit) return Promise.resolve(false);
    try {
      return Promise.resolve(exit.call(document)).then(() => true);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function resizeCombatViewport() {
    scene?.resize?.();
    requestAnimationFrame(() => scene?.resize?.());
    window.setTimeout(() => scene?.resize?.(), 180);
  }

  function getCombatViewportSize() {
    const viewport = window.visualViewport;
    const width = Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    const height = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    return { width, height };
  }

  function isMobileCombatDevice() {
    const { width, height } = getCombatViewportSize();
    const minSide = Math.min(width, height);
    const maxSide = Math.max(width, height);
    const touchDevice = Number(navigator.maxTouchPoints || 0) > 0;
    const coarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
    const compactMobileViewport = minSide <= 768 && maxSide <= 1024;
    return Boolean(touchDevice || coarsePointer || mobileUa || compactMobileViewport);
  }

  function isCombatLandscapeOrientation() {
    const { width, height } = getCombatViewportSize();
    const mediaLandscape = Boolean(window.matchMedia?.("(orientation: landscape)")?.matches);
    const screenLandscape = String(window.screen?.orientation?.type || "").includes("landscape");
    if (Math.abs(width - height) > 8) return width > height;
    return Boolean(mediaLandscape || screenLandscape);
  }

  function shouldUseMobileCombatFullscreen() {
    return isMobileCombatDevice() && isCombatLandscapeOrientation();
  }

  function syncCombatFullscreenVisualState() {
    const mobileDevice = isMobileCombatDevice();
    const app = $("#app");
    const shell = $(".persistent-combat");
    const stage = $("#battle-stage");
    const collapseButton = $("#combat-collapse-toggle");
    const fullscreenButton = $("#combat-fullscreen-toggle");
    const exitButton = $("#combat-fullscreen-exit");
    document.documentElement.classList.toggle("is-combat-fullscreen", combatFullscreen);
    document.body.classList.toggle("is-combat-fullscreen", combatFullscreen);
    app?.classList.toggle("is-combat-fullscreen", combatFullscreen);
    document.documentElement.classList.toggle("is-mobile-combat-device", mobileDevice);
    document.body.classList.toggle("is-mobile-combat-device", mobileDevice);
    app?.classList.toggle("is-mobile-combat-device", mobileDevice);
    document.documentElement.classList.toggle("mobile-combat-fullscreen", mobileCombatFullscreen);
    document.body.classList.toggle("mobile-combat-fullscreen", mobileCombatFullscreen);
    app?.classList.toggle("mobile-combat-fullscreen", mobileCombatFullscreen);
    document.documentElement.classList.toggle("is-mobile-landscape-combat", mobileCombatFullscreen);
    document.body.classList.toggle("is-mobile-landscape-combat", mobileCombatFullscreen);
    app?.classList.toggle("is-mobile-landscape-combat", mobileCombatFullscreen);
    shell?.classList.toggle("combat-fullscreen-mode", combatFullscreen);
    stage?.classList.toggle("combat-fullscreen-stage", combatFullscreen);
    collapseButton?.classList.toggle("hidden", combatFullscreen);
    fullscreenButton?.classList.toggle("hidden", combatFullscreen || mobileDevice);
    exitButton?.classList.toggle("hidden", !combatFullscreen || mobileCombatFullscreen);
    if (fullscreenButton) fullscreenButton.setAttribute("aria-pressed", String(combatFullscreen));
    resizeCombatViewport();
  }

  function pushCombatFullscreenHistoryState() {
    if (combatFullscreenHistoryActive) return;
    try {
      const current = history.state && typeof history.state === "object" ? history.state : {};
      history.pushState({ ...current, combatFullscreenMode: true }, "", location.href);
      combatFullscreenHistoryActive = true;
    } catch (error) {}
  }

  function clearCombatFullscreenHistoryState() {
    if (!combatFullscreenHistoryActive) return;
    try {
      const current = history.state && typeof history.state === "object" ? history.state : {};
      if (current.combatFullscreenMode) history.replaceState({ ...current, combatFullscreenMode: false }, "", location.href);
    } catch (error) {}
    combatFullscreenHistoryActive = false;
  }

  async function enterCombatFullscreen() {
    if (isMobileCombatDevice()) {
      updateMobileCombatFullscreen();
      return;
    }
    if (combatFullscreen) return;
    if (combatMinimized) setCombatMinimized(false);
    combatFullscreen = true;
    combatFullscreenSource = "manual";
    syncCombatFullscreenVisualState();
    pushCombatFullscreenHistoryState();
    const target = $("#app") || document.documentElement;
    try {
      await requestCombatFullscreen(target);
    } catch (error) {}
    resizeCombatViewport();
  }

  async function exitCombatFullscreen(options = {}) {
    if (!combatFullscreen && !options.force) return;
    const wasManual = combatFullscreenSource === "manual";
    combatFullscreen = false;
    combatFullscreenSource = "";
    mobileCombatFullscreen = false;
    syncCombatFullscreenVisualState();
    if (wasManual && options.fromHistory) combatFullscreenHistoryActive = false;
    else if (wasManual) clearCombatFullscreenHistoryState();
    if (wasManual && !options.skipNative) {
      try { await exitNativeCombatFullscreen(); } catch (error) {}
    }
    resizeCombatViewport();
  }

  function handleCombatFullscreenChange() {
    if (combatFullscreenSource === "manual" && !getCombatFullscreenElement()) {
      exitCombatFullscreen({ skipNative: true });
      return;
    }
    resizeCombatViewport();
  }

  function handleCombatFullscreenKeydown(event) {
    if (event.key !== "Escape" || combatFullscreenSource !== "manual") return;
    event.preventDefault();
    exitCombatFullscreen();
  }

  function handleCombatFullscreenPopState() {
    if (combatFullscreenSource === "manual") exitCombatFullscreen({ fromHistory: true });
  }

  function setMobileCombatFullscreen(active) {
    active = Boolean(active);
    if (active === mobileCombatFullscreen) {
      syncCombatFullscreenVisualState();
      return;
    }
    if (active) {
      if (combatFullscreenSource === "manual") return;
      mobileCombatPreviousMinimized = combatMinimized;
      if (combatMinimized) setCombatMinimized(false, false);
      mobileCombatFullscreen = true;
      combatFullscreen = true;
      combatFullscreenSource = "mobile";
      syncCombatFullscreenVisualState();
      return;
    }
    mobileCombatFullscreen = false;
    if (combatFullscreenSource === "mobile") {
      combatFullscreen = false;
      combatFullscreenSource = "";
    }
    if (mobileCombatPreviousMinimized) setCombatMinimized(true, false);
    mobileCombatPreviousMinimized = false;
    syncCombatFullscreenVisualState();
  }

  function updateMobileCombatFullscreen() {
    setMobileCombatFullscreen(shouldUseMobileCombatFullscreen());
  }

  function clearCurrentEnemy() {
    state.combat.enemy = null;
    state.combat.spawnTimer = 0;
  }

  function clearPendingChests() {
    scene?.clearChests?.();
  }

  function cancelPendingBossMapAdvance() {
    if (!pendingBossMapAdvanceTimer) return;
    window.clearTimeout(pendingBossMapAdvanceTimer);
    pendingBossMapAdvanceTimer = 0;
  }

  function cancelPendingSurpriseBoss() {
    if (!pendingSurpriseBossTimer) return;
    window.clearTimeout(pendingSurpriseBossTimer);
    pendingSurpriseBossTimer = 0;
  }

  function chooseWeightedChest(pool = []) {
    const total = pool.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= Math.max(0, Number(item.weight) || 0);
      if (roll <= 0) return CHEST_DEFINITIONS[item.id] || null;
    }
    return CHEST_DEFINITIONS[pool[pool.length - 1]?.id] || null;
  }

  function getBossChestPirateCoinRange(regionIndex = state.regionIndex) {
    const mapNumber = clamp(Math.floor(Number(regionIndex) || 0) + 1, 1, REGIONS.length);
    if (mapNumber <= 5) return [3, 30];
    if (mapNumber <= 10) return [31, 40];
    return [40, 70];
  }

  function getBossChestPirateCoins(regionIndex = state.regionIndex) {
    const [min, max] = getBossChestPirateCoinRange(regionIndex);
    return integerBetween(min, max);
  }

  function getChestRewardMultiplier(dropType, regionIndex = state.regionIndex) {
    const mapNumber = clamp(Math.floor(Number(regionIndex) || 0) + 1, 1, REGIONS.length);
    return mapNumber <= EARLY_GAME_REWARD_MAP_COUNT && (dropType === "monster" || dropType === "boss")
      ? EARLY_GAME_REWARD_MULTIPLIER
      : 1;
  }

  function trySpawnChestDrop(dropType, enemy = null) {
    const chance = CHEST_DROP_CHANCES[dropType] || 0;
    if (!chance || scene?.hasPendingChest?.(dropType) || Math.random() >= chance) return false;
    const definition = chooseWeightedChest(CHEST_DROP_POOLS[dropType]);
    if (!definition) return false;
    return scene.spawnChest(definition, dropType, state.regionIndex, enemy);
  }

  function openTreasureChest(chest) {
    if (!chest || chest.opened) return false;
    const definition = CHEST_DEFINITIONS[chest.chestId];
    if (!definition) return false;
    chest.opened = true;
    chest.openAge = 0;
    const isBossChest = chest.dropType === "boss";
    const rewardMultiplier = getChestRewardMultiplier(chest.dropType, chest.regionIndex);
    const gold = Math.max(1, Math.round(definition.gold * rewardMultiplier));
    const pirateCoins = isBossChest && Math.random() < CHEST_PIRATE_COIN_CHANCE
      ? Math.max(1, Math.round(getBossChestPirateCoins(chest.regionIndex) * rewardMultiplier))
      : 0;
    state.resources.ouro += gold;
    state.lifetime.gold += gold;
    trackAction("gold", { amount: gold });
    if (pirateCoins > 0) state.pirateCoins += pirateCoins;
    scene?.celebrateCaptain?.(1.15);
    scene?.floatChestReward?.(chest, [
      { text: `+${formatNumber(gold)} Ouro`, color: RARITY_COLORS[definition.rarityKey] || "#ffe268" },
      ...(pirateCoins > 0 ? [{ text: `+${formatNumber(pirateCoins)} Moedas Pirata`, color: "#ffb349" }] : [])
    ]);
    const logReward = pirateCoins > 0
      ? `+${formatNumber(gold)} ouro e +${formatNumber(pirateCoins)} moedas pirata`
      : `+${formatNumber(gold)} ouro`;
    addLog(`${isBossChest ? "Baú de Boss" : "Baú"} aberto: ${logReward}.`, "loot");
    toast(`${isBossChest ? "Baú de Boss" : "Baú"} aberto! ${logReward}.`, "gold-toast");
    renderAll(false);
    saveGame();
    return true;
  }

  function setActiveShip(id) {
    state.shipId = id;
    state.combat.playerHp = getStats().maxHp;
    scene?.resetPlayerShipAnimation();
    clearCurrentEnemy();
  }

  function addCollectedResource(key, amount) {
    if (!RESOURCE_META[key] || amount <= 0) return;
    state.progression.resourcesByKey[key] = (state.progression.resourcesByKey[key] || 0) + amount;
    state.progression.resourceTypesSeen[key] = true;
    state.progression.weekly.resources += amount;
  }

  function trackAction(kind, payload = {}) {
    resetPeriodicProgressIfNeeded();
    if (kind === "enemy") {
      state.progression.daily.enemies += payload.count || 1;
      state.progression.weekly.enemies += payload.count || 1;
      if (payload.onlyGold) state.progression.onlyGoldBattles += 1;
      if (payload.multiResource) state.progression.multiResourceDrops += 1;
      if (payload.survivor) state.progression.survivorWins = (state.progression.survivorWins || 0) + 1;
    }
    if (kind === "boss") state.progression.weekly.bosses += 1;
    if (kind === "gold") state.progression.daily.gold += payload.amount || 0;
    if (kind === "upgrade") {
      state.progression.totalUpgrades += 1;
      state.progression.upgradesByType[payload.type] = (state.progression.upgradesByType[payload.type] || 0) + 1;
      state.progression.daily.upgrades += 1;
      state.progression.weekly.upgrades += 1;
    }
    if (kind === "skill") {
      state.progression.skillUses.total += 1;
      state.progression.skillUses[payload.key] = (state.progression.skillUses[payload.key] || 0) + 1;
      state.progression.daily.skillUses += 1;
    }
    if (kind === "trade") {
      state.progression.trade.transactions += 1;
      state.progression.trade[payload.action === "buy" ? "buys" : "sells"] += 1;
      state.progression.trade[payload.action === "buy" ? "resourcesBought" : "resourcesSold"] += payload.quantity || 0;
      state.progression.daily.trades += 1;
      state.progression.weekly.trades += 1;
    }
    if (kind === "offline") {
      state.progression.offline.claims += 1;
      state.progression.offline.seconds += payload.seconds || 0;
      state.progression.offline.maxClaimSeconds = Math.max(state.progression.offline.maxClaimSeconds || 0, payload.seconds || 0);
    }
    if (kind === "repair") state.progression.repairs += 1;
    if (kind === "shipSwitch") state.progression.shipSwitches += 1;
    if (kind === "kraken") state.progression.krakenSightings += 1;
    checkProgressionUnlocks();
  }

  function completedCount(store, definitions) {
    return definitions.filter(item => store.completed[item.id] || store.claimed[item.id]).length;
  }

  function objectiveProgress(objective) {
    const stats = getStats();
    const p = state.progression;
    const values = {
      started: state.hasStarted || state.journeyStartedAt > 0 ? 1 : 0,
      firstCombat: state.hasStarted ? 1 : 0,
      enemies: state.lifetime.enemies,
      bosses: state.lifetime.bosses,
      gold: state.lifetime.gold,
      pirateLevel: state.pirateLevel,
      regionUnlocked: state.unlockedRegions,
      shipsOwned: state.ownedShips.length,
      shipTier: SHIPS[state.shipId].tier,
      tradeTransactions: p.trade.transactions,
      tradeBuys: p.trade.buys,
      tradeSells: p.trade.sells,
      offlineClaims: p.offline.claims,
      offlineSeconds: p.offline.seconds,
      dps: stats.dps,
      maxHp: stats.maxHp,
      power: stats.power,
      totalUpgrades: p.totalUpgrades || Math.max(0, state.levels.ship + state.levels.cannons + state.levels.sails + state.levels.hull - 4),
      prestiges: state.prestiges,
      resourceTotal: Object.values(p.resourcesByKey || {}).reduce((sum, value) => sum + Number(value || 0), 0),
      dailyEnemies: p.daily.enemies,
      dailyGold: p.daily.gold,
      dailyUpgrades: p.daily.upgrades,
      dailySkillUses: p.daily.skillUses,
      dailyTrades: p.daily.trades,
      weeklyEnemies: p.weekly.enemies,
      weeklyBosses: p.weekly.bosses,
      weeklyUpgrades: p.weekly.upgrades,
      weeklyResources: p.weekly.resources,
      weeklyTrades: p.weekly.trades,
      krakenSightings: p.krakenSightings,
      multiResourceDrops: p.multiResourceDrops,
      onlyGoldBattles: p.onlyGoldBattles,
      survivorWins: p.survivorWins || 0,
      missionsCompleted: completedCount(state.quests, missionDefinitions)
    };
    if (objective.kind === "all") return Math.floor(Math.min(...objective.objectives.map(entry => objectiveProgress(entry) / Math.max(1, objectiveTarget(entry)))) * 100);
    if (objective.kind === "upgrade") return p.upgradesByType[objective.type] || Math.max(0, state.levels[objective.type] - 1);
    if (objective.kind === "allCoreUpgrades") return Math.min(p.upgradesByType.cannons || 0, p.upgradesByType.sails || 0, p.upgradesByType.hull || 0);
    if (objective.kind === "resource") return p.resourcesByKey[objective.key] || 0;
    if (objective.kind === "skillUse") return p.skillUses[objective.key] || 0;
    if (objective.kind === "skillAuto") return Object.keys(SKILL_META).filter(key => isSkillUnlocked(key) && state.skills[key].auto).length;
    if (objective.kind === "shipName") return state.ownedShips.some(id => SHIPS[id]?.name === objective.name) ? 1 : 0;
    if (objective.kind === "legendaryPower") return SHIPS[state.shipId].tier >= 5 && stats.dps >= objective.target ? objective.target : Math.min(stats.dps, objective.target - 1);
    if (objective.kind === "allBosses") return bossesCount();
    if (objective.kind === "allResourcesSeen") return Object.keys(RESOURCE_META).filter(key => p.resourceTypesSeen[key] || (state.resources[key] || 0) > 0).length;
    if (objective.kind === "allSkillsUnlocked") return Object.keys(SKILL_META).filter(isSkillUnlocked).length;
    if (objective.kind === "perfectShip") return Math.min(state.levels.cannons, state.levels.sails, state.levels.hull);
    return values[objective.kind] || 0;
  }

  function objectiveTarget(objective) {
    if (objective.kind === "all") return 100;
    if (objective.kind === "started" || objective.kind === "firstCombat" || objective.kind === "shipName" || objective.kind === "legendaryPower") return objective.target || 1;
    if (objective.kind === "allBosses") return REGIONS.length;
    if (objective.kind === "allResourcesSeen") return Object.keys(RESOURCE_META).length;
    if (objective.kind === "allSkillsUnlocked") return Object.keys(SKILL_META).length;
    return objective.target || 1;
  }

  function isProgressionUnlocked(item, definitions, storeName) {
    if (item.secret && !state[storeName].completed[item.id] && objectiveProgress(item.objective) < objectiveTarget(item.objective)) return false;
    if (state.pirateLevel < (item.level || item.recommendedLevel || 1)) return false;
    if (item.prevId && !state[storeName].claimed[item.prevId]) return false;
    if (item.objective.kind === "resource" && ["cristal", "perola", "ambar", "pedra", "fragmentos"].includes(item.objective.key)) {
      const index = REGIONS.findIndex(region => region.drops[item.objective.key]);
      if (index >= 0 && state.unlockedRegions <= index) return false;
    }
    return true;
  }

  function checkProgressionUnlocks(notify = true) {
    if (!state?.quests) return;
    resetPeriodicProgressIfNeeded();
    missionDefinitions.forEach(item => {
      if (state.quests.completed[item.id] || state.quests.claimed[item.id] || !isProgressionUnlocked(item, missionDefinitions, "quests")) return;
      if (objectiveProgress(item.objective) >= objectiveTarget(item.objective)) {
        state.quests.completed[item.id] = Date.now();
        if (notify) {
          toast(`Missão concluída: ${item.name}`, "gold-toast");
          addLog(`Missão concluída: ${item.name}. Recompensa disponível: ${rewardText(item.reward)}.`, "loot");
        }
      }
    });
  }

  function isMissionRewardReady(item) {
    const store = state.quests;
    return Boolean(item && !store.claimed[item.id] && (store.completed[item.id] || (isProgressionUnlocked(item, missionDefinitions, "quests") && objectiveProgress(item.objective) >= objectiveTarget(item.objective))));
  }

  function grantMissionReward(item) {
    const store = state.quests;
    if (!isMissionRewardReady(item)) return false;
    if (!store.completed[item.id]) store.completed[item.id] = Date.now();
    Object.entries(goldOnlyBundle(item.reward.resources || {})).forEach(([key, amount]) => {
      if (!amount) return;
      const finalAmount = key === "ouro" ? calculateGoldReward(amount) : amount;
      state.resources[key] = (state.resources[key] || 0) + finalAmount;
      if (key !== "ouro") {
        state.lifetime.resources += finalAmount;
        addCollectedResource(key, finalAmount);
      } else {
        state.lifetime.gold += finalAmount;
      }
    });
    if (item.reward.xp) gainXp(item.reward.xp);
    if (item.reward.title && !state.titles.includes(item.reward.title)) state.titles.push(item.reward.title);
    store.claimed[item.id] = Date.now();
    delete store.completed[item.id];
    return true;
  }

  function claimProgressionReward(kind, id) {
    if (kind !== "mission") return;
    const item = missionDefinitions.find(entry => entry.id === id);
    if (!grantMissionReward(item)) return;
    toast(`Missão recompensada: ${item.name}`, "gold-toast");
    addLog(`Recompensa coletada: ${item.name} — ${rewardText(item.reward)}.`, "loot");
    checkProgressionUnlocks();
    commitGame(true);
  }

  function claimAllMissionRewards() {
    resetPeriodicProgressIfNeeded();
    checkProgressionUnlocks(false);
    const claimed = [];
    let guard = missionDefinitions.length + 1;
    while (guard-- > 0) {
      const ready = missionDefinitions.filter(isMissionRewardReady);
      if (!ready.length) break;
      ready.forEach(item => {
        if (grantMissionReward(item)) claimed.push(item);
      });
      checkProgressionUnlocks(false);
    }
    if (!claimed.length) {
      renderMissions();
      return toast("Nenhuma recompensa disponível no momento.");
    }
    const suffix = claimed.length === 1 ? "" : "s";
    toast(`${claimed.length} recompensa${suffix} coletada${suffix}!`, "gold-toast");
    addLog(`Coletar tudo: ${claimed.length} recompensa${suffix} de missão coletada${suffix}.`, "loot");
    commitGame(true);
  }

  function normalizeText(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function normalizeSpriteKey(value = "") {
    return normalizeText(value).replace(/[_\-.:"']/g, " ").replace(/\s+/g, " ").trim();
  }

  const SPRITE_HP_STATES = Object.freeze({
    normal: "normal",
    damaged: "damaged",
    defeated: "defeated"
  });
  const ENEMY_STATE_SPRITES = { normal: 0, damaged: 6, defeated: 8 };
  const PLAYER_SHIP_STATE_SPRITES = { normal: 0, damaged: 0, defeated: 8 };
  const PET_STATE_SPRITES = { normal: 0, damaged: 1, defeated: 2 };
  const PRESTIGE_PIRATE_COIN_REWARD_MULTIPLIER = 6;
  const PRESTIGE_MONSTER_COIN_STEP = 100;
  const PRESTIGE_MONSTER_COIN_BONUS = 10;
  const SPRITE_STATE_SPRITES = {
    enemy: ENEMY_STATE_SPRITES,
    playerShip: PLAYER_SHIP_STATE_SPRITES,
    pet: PET_STATE_SPRITES
  };
  const SPRITE_BREATHING_PRESETS = {
    enemy: { normal: .018, damaged: .012, defeated: .0025, speed: 1.85 },
    playerShip: { normal: 0, damaged: 0, defeated: 0, speed: 1 },
    pet: { normal: .022, damaged: .014, defeated: .003, speed: 2.05 }
  };
  if (typeof window !== "undefined") {
    window.PIRATES_SPRITE_HP_STATES = SPRITE_HP_STATES;
    window.PIRATES_STATE_SPRITES = SPRITE_STATE_SPRITES;
    window.PIRATES_BREATHING_PRESETS = SPRITE_BREATHING_PRESETS;
  }

  const PLAYER_SHIP_SPRITESHEET_PATH = "assets/spritesships/";
  const REPAIR_EFFECT_SPRITE = {
    key: "repairShip",
    image: createLazyImage(),
    file: "reparo_barco_3sprites.png",
    frames: 3,
    requested: false,
    loadFailed: false,
    frameBounds: null,
    referenceBounds: null
  };
  const PLAYER_SHIP_SPRITESHEET_FILES = [
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
    "PLAYER-02_08_Navio_Mercante_Armado_sprite_9frames.png",
    "PLAYER-03_01_Galeao_Mercante_sprite_9frames.png",
    "PLAYER-03_02_Galeao_Pirata_sprite_9frames.png",
    "PLAYER-03_03_Fragata_Real_sprite_9frames.png",
    "PLAYER-03_04_Fragata_Corsaria_sprite_9frames.png",
    "PLAYER-03_05_Galeao_de_Guerra_sprite_9frames.png",
    "PLAYER-03_06_Encouracado_Imperial_sprite_9frames.png",
    "PLAYER-03_07_Fragata_Fantasma_sprite_9frames.png",
    "PLAYER-03_08_Kraken_Hunter_sprite_9frames.png",
    "PLAYER-03_09_Black_Abyss_sprite_9frames.png"
  ];
  const PLAYER_SHIP_ATTACK_ANIMATION_SECONDS = .42;
  const PLAYER_SHIP_ATTACK_FRAMES = [3, 4, 5, 4];
  const PLAYER_SHIP_DEFAULT_ANIMATIONS = {
    idle: { frames: [0], fps: 1, loop: true, blend: false },
    moving: { frames: [0], fps: 1, loop: true, blend: false },
    attack: { frames: PLAYER_SHIP_ATTACK_FRAMES, fps: 9, loop: false, blend: true },
    hit: { frames: [6], fps: 1, loop: false, blend: false },
    death: { frames: [8], fps: 1, loop: false, blend: false }
  };
  const PLAYER_SHIP_TALL_ANIMATIONS = {
    idle: { frames: [0], fps: 1, loop: true, blend: false },
    moving: { frames: [0], fps: 1, loop: true, blend: false },
    attack: { frames: PLAYER_SHIP_ATTACK_FRAMES, fps: 8.5, loop: false, blend: true },
    hit: { frames: [6], fps: 7, loop: false, blend: false },
    death: { frames: [8], fps: 1, loop: false, blend: false }
  };
  const PLAYER_SHIP_SPRITESHEET_OPTIONS = {
    Bote_de_Tronco: { width: 230, anchorY: .63 },
    Jangada_de_Cipó: { width: 245, anchorY: .66 },
    Canoa_de_Caça: { width: 240, anchorY: .58, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Jangada_Reforçada_Primitiva: { width: 255, anchorY: .64, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Canoa_do_Titã: { width: 265, anchorY: .63 },
    Bote_Armado: { width: 260, anchorY: .66, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Jangada_Reforçada: { width: 270, anchorY: .66, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Barco_de_Pesca_Adaptado: { width: 275, anchorY: .64 },
    Escuna_Leve: { width: 285, anchorY: .66 },
    Escuna_Mercante: { width: 295, anchorY: .66, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Cutter_Real: { width: 300, anchorY: .64, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Brigantina_Pequena: { width: 305, anchorY: .64, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Corveta_Simples: { width: 310, anchorY: .66 },
    Brigantina_Pirata: { width: 320, anchorY: .64, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Corveta_Armada: { width: 320, anchorY: .64 },
    Galeota: { width: 310, anchorY: .61 },
    Navio_Mercante_Armado: { width: 330, anchorY: .64, animations: PLAYER_SHIP_TALL_ANIMATIONS },
    Galeao_Mercante: { width: 335, anchorY: .64, captainAnchorX: .47, captainAnchorY: .68 },
    Galeao_Pirata: { width: 335, anchorY: .63, captainAnchorX: .46, captainAnchorY: .67 },
    Fragata_Real: { width: 340, anchorY: .63, captainAnchorX: .48, captainAnchorY: .66 },
    Fragata_Corsaria: { width: 345, anchorY: .66, captainAnchorX: .47, captainAnchorY: .68 },
    Galeao_de_Guerra: { width: 350, anchorY: .66, captainAnchorX: .47, captainAnchorY: .68 },
    Encouracado_Imperial: { width: 355, anchorY: .63, captainAnchorX: .49, captainAnchorY: .66 },
    Fragata_Fantasma: { width: 355, anchorY: .63, captainAnchorX: .48, captainAnchorY: .66 },
    Kraken_Hunter: { width: 365, anchorY: .64, captainAnchorX: .49, captainAnchorY: .66 },
    Black_Abyss: { width: 370, anchorY: .64, captainAnchorX: .49, captainAnchorY: .66 }
  };

  function getPlayerShipSpritesheetNameFromFile(file) {
    return file
      .replace(/\.png$/i, "")
      .replace(/^PLAYER-\d+_\d+_/i, "")
      .replace(/_sprite_\d+frames?$/i, "");
  }

  function getSpritesheetFrameCountFromFile(file) {
    const match = String(file).match(/_sprite_(\d+)frames?\.png$/i);
    return match ? Math.max(1, Number(match[1]) || 0) : 0;
  }

  const PLAYER_SHIP_SPRITESHEETS = PLAYER_SHIP_SPRITESHEET_FILES.reduce((sprites, file) => {
    const name = getPlayerShipSpritesheetNameFromFile(file);
    const options = PLAYER_SHIP_SPRITESHEET_OPTIONS[name] || {};
    const fileFrameCount = getSpritesheetFrameCountFromFile(file);
    const usesNineFrameLayout = fileFrameCount === 9;
    const baseAnimations = usesNineFrameLayout ? PLAYER_SHIP_DEFAULT_ANIMATIONS : options.animations || PLAYER_SHIP_DEFAULT_ANIMATIONS;
    const animations = { ...baseAnimations };
    if (options.attackFrames?.length) {
      animations.attack = { ...(animations.attack || PLAYER_SHIP_DEFAULT_ANIMATIONS.attack), frames: options.attackFrames };
    }
    const sprite = {
      key: name,
      role: "playerShip",
      image: createLazyImage(),
      canvas: null,
      file,
      frames: fileFrameCount || options.frames || 9,
      columns: options.columns || 3,
      rows: usesNineFrameLayout ? 3 : options.rows || 3,
      animations,
      width: options.width || 280,
      anchorX: options.anchorX ?? .5,
      anchorY: options.anchorY ?? .64,
      captainAnchorX: options.captainAnchorX ?? .48,
      captainAnchorY: options.captainAnchorY ?? .67,
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0,
      stateFrames: { ...PLAYER_SHIP_STATE_SPRITES },
      ready: false,
      processing: false,
      requested: false,
      loadFailed: false
    };
    sprites[normalizeSpriteKey(name)] = sprite;
    return sprites;
  }, {});
  const PLAYER_SHIP_SPRITESHEET_KEYS = Object.keys(PLAYER_SHIP_SPRITESHEETS);
  const PLAYER_SHIP_MISSING_SPRITESHEET_WARNINGS = new Set();

  function getPlayerShipSpritesheetMatchScore(key, candidate) {
    if (!key || !candidate) return 0;
    if (key === candidate) return 1;
    if (key.includes(candidate) || candidate.includes(key)) {
      return Math.min(key.length, candidate.length) / Math.max(key.length, candidate.length);
    }
    const sourceTokens = key.split(" ").filter(Boolean);
    const targetTokens = candidate.split(" ").filter(Boolean);
    const targetSet = new Set(targetTokens);
    const shared = sourceTokens.filter(token => targetSet.has(token)).length;
    return shared / Math.max(sourceTokens.length, targetTokens.length, 1);
  }

  function findClosestPlayerShipSpritesheet(key) {
    let bestKey = "";
    let bestScore = 0;
    PLAYER_SHIP_SPRITESHEET_KEYS.forEach(candidate => {
      const score = getPlayerShipSpritesheetMatchScore(key, candidate);
      if (score > bestScore) {
        bestKey = candidate;
        bestScore = score;
      }
    });
    return bestScore >= .78 ? PLAYER_SHIP_SPRITESHEETS[bestKey] : null;
  }

  function getPlayerShipSpritesheet(name) {
    const key = normalizeSpriteKey(name);
    const sprite = PLAYER_SHIP_SPRITESHEETS[key] || findClosestPlayerShipSpritesheet(key);
    if (sprite) return sprite;
    if (key && !PLAYER_SHIP_MISSING_SPRITESHEET_WARNINGS.has(key)) {
      PLAYER_SHIP_MISSING_SPRITESHEET_WARNINGS.add(key);
      console.warn(`[Pirates of Abyss] Sprite sheet de barco do jogador nao encontrada para: ${name}`);
    }
    return null;
  }

  function requestPlayerShipSpritesheet(sprite) {
    return requestSpriteImage(sprite, `${PLAYER_SHIP_SPRITESHEET_PATH}${sprite.file}`, prepareEnemySpritesheet);
  }

  function requestRepairEffectSprite() {
    return requestSpriteImage(REPAIR_EFFECT_SPRITE, `${EFFECT_ASSET_PATH}${REPAIR_EFFECT_SPRITE.file}`);
  }

  const ENEMY_SPRITE_LAYOUTS = [
    ["Remador Rival", { width: 250, anchorY: .68 }],
    ["Pescador Primitivo", { width: 265, anchorY: .7 }],
    ["Jacare da Lagoa", { width: 270, anchorY: .58 }],
    ["Crocomar Anciao", { width: 380, anchorY: .58 }],
    ["Canoa Tribal", { width: 275, anchorY: .64 }],
    ["Cacador do Mangue", { width: 275, anchorY: .67 }],
    ["Reptil das Raizes", { width: 315, anchorY: .6 }],
    ["Deinosuchus do Mangue", { width: 390, anchorY: .59 }],
    ["Canoa de Couro", { width: 260, anchorY: .58 }],
    ["Pterodactilo Cacador", { width: 300, anchorY: .56, offsetY: -52 }],
    ["Remador das Ilhas", { width: 255, anchorY: .65 }],
    ["Rei Pteranodonte", { width: 330, anchorY: .55, offsetY: -55 }],
    ["Jangada de Caca", { width: 285, anchorY: .65 }],
    ["Ictiossauro", { width: 315, anchorY: .56 }],
    ["Saqueador da Selva", { width: 285, anchorY: .66 }],
    ["Mosasaurus Jovem", { width: 380, anchorY: .56 }],
    ["Canoa de Guerra", { width: 290, anchorY: .61 }],
    ["Plesiossauro", { width: 310, anchorY: .58 }],
    ["Guardiao do Canal", { width: 300, anchorY: .66 }],
    ["Leviata Jurassico", { width: 390, anchorY: .56 }],
    ["Jangada de Pescador", { width: 285, anchorY: .68 }],
    ["Barco Costeiro", { width: 310, anchorY: .62 }],
    ["Bote Pirata", { width: 315, anchorY: .62 }],
    ["Pequeno Contrabandista", { width: 270, anchorY: .62 }],
    ["Escuna Pirata", { width: 335, anchorY: .62 }],
    ["Capitao Barba de Ferro", { width: 350, anchorY: .58 }],
    ["Bote de Pesca Hostil", { width: 310, anchorY: .64 }],
    ["Traineira Saqueadora", { width: 330, anchorY: .62 }],
    ["Barco Mercante Pequeno", { width: 315, anchorY: .64 }],
    ["Navio de Carga", { width: 330, anchorY: .62 }],
    ["Escuna Rapida", { width: 330, anchorY: .6 }],
    ["Patrulha Naval", { width: 330, anchorY: .6 }],
    ["Transporte de Ouro", { width: 335, anchorY: .6 }],
    ["Rainha Corsaria Scarlet", { width: 360, anchorY: .58 }],
    ["Brigantina Pirata", { width: 340, anchorY: .6 }],
    ["Corveta da Marinha", { width: 360, anchorY: .6 }],
    ["Navio Quebra-Bloqueio", { width: 345, anchorY: .58 }],
    ["Navio Danificado", { width: 345, anchorY: .6 }],
    ["Cacador da Tormenta", { width: 335, anchorY: .62 }],
    ["Tempestade Viva", { width: 330, anchorY: .56, offsetY: -15 }],
    ["Corsario Disfarcado", { width: 315, anchorY: .64 }],
    ["Transporte Ilegal", { width: 330, anchorY: .62 }],
    ["Fragata Pirata", { width: 350, anchorY: .61 }],
    ["Almirante Negro", { width: 380, anchorY: .58 }],
    ["Baleeiro Sombrio", { width: 340, anchorY: .6 }],
    ["Navio de Suprimentos", { width: 345, anchorY: .62 }],
    ["Contrabandista Abissal", { width: 335, anchorY: .62 }],
    ["Serpente Marinha", { width: 360, anchorY: .58 }],
    ["Galeao Pirata", { width: 350, anchorY: .6 }],
    ["Megalodon Ancestral", { width: 400, anchorY: .56 }],
    ["Escuna Fantasma", { width: 350, anchorY: .62 }],
    ["Nau Espectral", { width: 355, anchorY: .61 }],
    ["Navio Amaldicoado", { width: 355, anchorY: .61 }],
    ["Corsario Perdido", { width: 345, anchorY: .6 }],
    ["Vulto do Triangulo", { width: 345, anchorY: .62 }],
    ["Holandes Voador", { width: 390, anchorY: .6 }],
    ["Bote da Marinha", { width: 330, anchorY: .6 }],
    ["Cutter Real", { width: 340, anchorY: .6 }],
    ["Fragata Imperial", { width: 365, anchorY: .62 }],
    ["Galeao Real", { width: 365, anchorY: .62 }],
    ["Navio de Linha", { width: 365, anchorY: .62 }],
    ["Navio Almirante", { width: 370, anchorY: .62 }],
    ["Grande Armada Imperial", { width: 410, anchorY: .62 }],
    ["Saqueador de Cinzas", { width: 340, anchorY: .62 }],
    ["Transporte de Obsidiana", { width: 345, anchorY: .6 }],
    ["Corveta Vulcanica", { width: 350, anchorY: .62 }],
    ["Carapaca Vulcanica", { width: 360, anchorY: .6 }],
    ["Dragao Marinho Jovem", { width: 360, anchorY: .62 }],
    ["Dragao Marinho Vulcanico", { width: 405, anchorY: .58 }],
    ["Barco Costeiro Congelado", { width: 345, anchorY: .62 }],
    ["Corsario Boreal", { width: 340, anchorY: .62 }],
    ["Fragata Congelada", { width: 365, anchorY: .62 }],
    ["Navio Fantasma do Gelo", { width: 355, anchorY: .62 }],
    ["Serpente de Gelo", { width: 360, anchorY: .58 }],
    ["Jormungandr de Gelo", { width: 410, anchorY: .58 }],
    ["Cultista do Kraken", { width: 345, anchorY: .62 }],
    ["Dreadnought Afundado", { width: 365, anchorY: .62 }],
    ["Frota Imperial Perdida", { width: 360, anchorY: .58 }],
    ["Leviata Menor", { width: 360, anchorY: .58 }],
    ["Navio Fantasma Lendario", { width: 365, anchorY: .62 }],
    ["Kraken Primordial", { width: 405, anchorY: .6 }]
  ].reduce((layouts, [name, options]) => {
    layouts[normalizeText(name)] = options;
    layouts[normalizeEnemySpriteKey(name)] = options;
    return layouts;
  }, {});

  const ENEMY_SPRITESHEET_PATH = "assets/spritesenemies/";
  const ENEMY_SPRITESHEET_FILES = [
    "01_Canoa_de_Couro_sprite_9frames.png",
    "01_Remador_Rival_sprite_9frames.png",
    "02_Pescador_Primitivo_sprite_9frames.png",
    "02_Pterodactilo_Cacador_sprite_9frames.png",
    "03_Jacare_da_Lagoa_sprite_9frames.png",
    "03_Remador_das_Ilhas_sprite_9frames.png",
    "04_Boss_Crocomar_Anciao_sprite_9frames.png",
    "04_Boss_Rei_Pteranodonte_sprite_9frames.png",
    "05_Canoa_Tribal_sprite_9frames.png",
    "05_Jangada_de_Caca_sprite_9frames.png",
    "06_Cacador_do_Mangue_sprite_9frames.png",
    "06_Ictiossauro_sprite_9frames.png",
    "07_Reptil_das_Raizes_sprite_9frames.png",
    "07_Saqueador_da_Selva_sprite_9frames.png",
    "08_Boss_Deinosuchus_do_Mangue_sprite_9frames.png",
    "08_Boss_Mosasaurus_Jovem_sprite_9frames.png",
    "MAP-03_01_Canoa_de_Guerra_sprite_9frames.png",
    "MAP-03_02_Plesiossauro_sprite_9frames.png",
    "MAP-03_03_Guardiao_do_Canal_sprite_9frames.png",
    "MAP-03_04_Boss_Leviata_Jurassico_sprite_9frames.png",
    "MAP-03_05_Jangada_de_Pescador_sprite_9frames.png",
    "MAP-03_06_Barco_Costeiro_sprite_9frames.png",
    "MAP-03_07_Bote_Pirata_sprite_9frames.png",
    "MAP-03_08_Pequeno_Contrabandista_sprite_9frames.png",
    "MAP-03_09_Escuna_Pirata_sprite_9frames.png",
    "MAP-03_10_Boss_Capitao_Barba_de_Ferro_sprite_9frames.png",
    "MAP-04_01_Bote_de_Pesca_Hostil_sprite_9frames.png",
    "MAP-04_02_Traineira_Saqueadora_sprite_9frames.png",
    "MAP-04_03_Barco_Mercante_Pequeno_sprite_9frames.png",
    "MAP-04_04_Navio_de_Carga_sprite_9frames.png",
    "MAP-04_05_Escuna_Rapida_sprite_9frames.png",
    "MAP-04_06_Patrulha_Naval_sprite_9frames.png",
    "MAP-04_07_Transporte_de_Ouro_sprite_9frames.png",
    "MAP-04_08_Boss_Rainha_Corsaria_Scarlet_sprite_9frames.png",
    "MAP-05_01_Canoinha_Saqueadora_sprite_9frames.png",
    "MAP-05_02_Jangada_de_Ferro_sprite_9frames.png",
    "MAP-05_03_Canoa_dos_Saqueadores_sprite_9frames.png",
    "MAP-05_04_Jangada_Espinhosa_sprite_9frames.png",
    "MAP-05_05_Canoa_do_Carnical_sprite_9frames.png",
    "MAP-05_06_Bote_de_Guerra_sprite_9frames.png",
    "MAP-05_07_Jangada_Blindada_sprite_9frames.png",
    "MAP-05_08_Barco_de_Assalto_sprite_9frames.png",
    "MAP-05_09_Galeao_Sombrio_sprite_9frames.png",
    "MAP-06_01_Canoa_Corrompida_sprite_9frames.png",
    "MAP-06_02_Jangada_Abissal_sprite_9frames.png",
    "MAP-06_03_Canoa_dos_Devoradores_sprite_9frames.png",
    "MAP-06_04_Jangada_Fantasma_sprite_9frames.png",
    "MAP-06_05_Canoa_das_Almas_Perdidas_sprite_9frames.png",
    "MAP-06_06_Bote_do_Executor_sprite_9frames.png",
    "MAP-06_07_Jangada_Necromante_sprite_9frames.png",
    "MAP-06_08_Barco_do_Leviata_sprite_9frames.png",
    "MAP-06_09_Galeao_Profano_sprite_9frames.png",
    "MAP-07_01_Baleeiro_Sombrio_sprite_9frames.png",
    "MAP-07_02_Navio_de_Suprimentos_sprite_9frames.png",
    "MAP-07_03_Contrabandista_Abissal_sprite_9frames.png",
    "MAP-07_04_Serpente_Marinha_sprite_9frames.png",
    "MAP-07_05_Galeao_Pirata_sprite_9frames.png",
    "MAP-07_06_Bote_de_Caca_Abissal_sprite_9frames.png",
    "MAP-07_07_Carcaca_Flutuante_sprite_9frames.png",
    "MAP-07_08_Corveta_do_Abismo_sprite_9frames.png",
    "MAP-07_09_Boss_Megalodon_Ancestral_sprite_9frames.png",
    "MAP-08_01_Escuna_Fantasma_sprite_9frames.png",
    "MAP-08_02_Nau_Espectral_sprite_9frames.png",
    "MAP-08_03_Navio_Amaldicoado_sprite_9frames.png",
    "MAP-08_04_Corsario_Perdido_sprite_9frames.png",
    "MAP-08_05_Vulto_do_Triangulo_sprite_9frames.png",
    "MAP-08_06_Barca_Condenada_sprite_9frames.png",
    "MAP-08_07_Fragata_Nebulosa_sprite_9frames.png",
    "MAP-08_08_Ceifador_das_Brumas_sprite_9frames.png",
    "MAP-08_09_Boss_Holandes_Voador_sprite_9frames.png",
    "MAP-09_01_Bote_da_Marinha_sprite_9frames.png",
    "MAP-09_02_Cutter_Real_sprite_9frames.png",
    "MAP-09_03_Corveta_Real_sprite_9frames.png",
    "MAP-09_04_Fragata_Imperial_sprite_9frames.png",
    "MAP-09_05_Galeao_Real_sprite_9frames.png",
    "MAP-09_06_Navio_de_Linha_sprite_9frames.png",
    "MAP-09_07_Navio_Almirante_sprite_9frames.png",
    "MAP-09_08_Patrulha_Imperial_sprite_9frames.png",
    "MAP-09_09_Boss_Grande_Armada_Imperial_sprite_9frames.png",
    "MAP-10_01_Saqueador_de_Cinzas_sprite_9frames.png",
    "MAP-10_02_Transporte_de_Obsidiana_sprite_9frames.png",
    "MAP-10_03_Corveta_Vulcanica_sprite_9frames.png",
    "MAP-10_04_Carapaca_Vulcanica_sprite_9frames.png",
    "MAP-10_05_Dragao_Marinho_Jovem_sprite_9frames.png",
    "MAP-10_06_Barca_de_Lava_sprite_9frames.png",
    "MAP-10_07_Monitor_de_Basalto_sprite_9frames.png",
    "MAP-10_08_Fragata_das_Cinzas_sprite_9frames.png",
    "MAP-10_09_Boss_Dragao_Marinho_Vulcanico_sprite_9frames.png",
    "MAP-11_01_Barco_Costeiro_Congelado_sprite_9frames.png",
    "MAP-11_02_Corsario_Boreal_sprite_9frames.png",
    "MAP-11_03_Fragata_Congelada_sprite_9frames.png",
    "MAP-11_04_Navio_Fantasma_do_Gelo_sprite_9frames.png",
    "MAP-11_05_Serpente_de_Gelo_sprite_9frames.png",
    "MAP-11_06_Drakkar_Boreal_sprite_9frames.png",
    "MAP-11_07_Baleeiro_Glacial_sprite_9frames.png",
    "MAP-11_08_Patrulha_Polar_sprite_9frames.png",
    "MAP-11_09_Boss_Jormungandr_de_Gelo_sprite_9frames.png",
    "MAP-12_01_Cultista_do_Kraken_sprite_9frames.png",
    "MAP-12_02_Dreadnought_Afundado_sprite_9frames.png",
    "MAP-12_03_Frota_Imperial_Perdida_sprite_9frames.png",
    "MAP-12_04_Leviata_Menor_sprite_9frames.png",
    "MAP-12_05_Navio_Fantasma_Lendario_sprite_9frames.png",
    "MAP-12_06_Barca_Ritualista_sprite_9frames.png",
    "MAP-12_07_Nau_dos_Condenados_sprite_9frames.png",
    "MAP-12_08_Tentaculo_Guardiao_sprite_9frames.png",
    "MAP-12_09_Boss_Kraken_Primordial_sprite_9frames.png"
  ];
  const ENEMY_SPRITESHEET_FILE_ALIASES = {
    "MAP-05_01_Canoinha_Saqueadora_sprite_9frames.png": { name: "Brigantina_Pirata", regionIndex: 7 },
    "MAP-05_02_Jangada_de_Ferro_sprite_9frames.png": { name: "Corveta_da_Marinha", regionIndex: 7 },
    "MAP-05_03_Canoa_dos_Saqueadores_sprite_9frames.png": { name: "Navio_Quebra-Bloqueio", regionIndex: 7 },
    "MAP-05_04_Jangada_Espinhosa_sprite_9frames.png": { name: "Navio_Danificado", regionIndex: 7 },
    "MAP-05_05_Canoa_do_Carnical_sprite_9frames.png": { name: "Cacador_da_Tormenta", regionIndex: 7 },
    "MAP-05_06_Bote_de_Guerra_sprite_9frames.png": { name: "Tempestade_Viva", regionIndex: 7 },
    "MAP-06_01_Canoa_Corrompida_sprite_9frames.png": { name: "Escuna_Pirata", regionIndex: 8 },
    "MAP-06_02_Jangada_Abissal_sprite_9frames.png": { name: "Corsario_Disfarcado", regionIndex: 8 },
    "MAP-06_03_Canoa_dos_Devoradores_sprite_9frames.png": { name: "Brigantina_Pirata", regionIndex: 8 },
    "MAP-06_04_Jangada_Fantasma_sprite_9frames.png": { name: "Transporte_Ilegal", regionIndex: 8 },
    "MAP-06_05_Canoa_das_Almas_Perdidas_sprite_9frames.png": { name: "Fragata_Pirata", regionIndex: 8 },
    "MAP-06_06_Bote_do_Executor_sprite_9frames.png": { name: "Almirante_Negro", regionIndex: 8 }
  };
  const BOSS_FIVE_POSE_ANIMATIONS = {
    spawn: { frames: [0, 1], fps: 3.4, loop: false, blend: true },
    idle: { frames: [1], fps: 1, loop: true, blend: false },
    walking: { frames: [1], fps: 1, loop: true, blend: false },
    attack: { frames: [2], fps: 1, loop: false, blend: false },
    hit: { frames: [3], fps: 1, loop: false, blend: false },
    death: { frames: [4], fps: 1, loop: false, blend: false }
  };
  const BOSS_FIVE_POSE_LAYOUT = {
    frames: 5,
    columns: 5,
    rows: 1,
    explicitGrid: true,
    stateFrames: { normal: 1, damaged: 3, defeated: 4 },
    animations: BOSS_FIVE_POSE_ANIMATIONS
  };
  const ENEMY_SPRITESHEET_OPTIONS = {
    Remador_Rival: { width: 250, anchorY: .68 },
    Pescador_Primitivo: { width: 265, anchorY: .7 },
    Jacare_da_Lagoa: {
      width: 270,
      anchorY: .58,
      animations: {
        idle: { frames: [0, 1, 2, 1], fps: 3, loop: true, blend: true },
        walking: { frames: [0, 1, 2, 1], fps: 5.5, loop: true, blend: true },
        attack: { frames: [3, 4, 5, 4], fps: 8.5, loop: false, blend: true },
        hit: { frames: [0], fps: 1, loop: false, blend: false },
        death: { frames: [8], fps: 1, loop: false, blend: false }
      }
    },
    Boss_Crocomar_Anciao: { width: 380, anchorY: .58, ...BOSS_FIVE_POSE_LAYOUT },
    Canoa_Tribal: { width: 275, anchorY: .64 },
    Cacador_do_Mangue: { width: 275, anchorY: .67 },
    Reptil_das_Raizes: {
      width: 315,
      anchorY: .6,
      animations: {
        idle: { frames: [0, 1, 2, 1], fps: 3, loop: true, blend: true },
        walking: { frames: [0, 1, 2, 1], fps: 5.2, loop: true, blend: true },
        attack: { frames: [3, 4, 5, 4], fps: 8.2, loop: false, blend: true },
        hit: { frames: [6, 7], fps: 7.5, loop: false, blend: true },
        death: { frames: [8], fps: 1, loop: false, blend: false }
      }
    },
    Boss_Deinosuchus_do_Mangue: {
      width: 390,
      anchorY: .59,
      ...BOSS_FIVE_POSE_LAYOUT
    },
    Canoa_de_Couro: { width: 260, anchorY: .58 },
    Pterodactilo_Cacador: { width: 300, anchorY: .56, offsetY: -52 },
    Remador_das_Ilhas: { width: 255, anchorY: .65 },
    Boss_Rei_Pteranodonte: { width: 330, anchorY: .55, offsetY: -55 },
    Jangada_de_Caca: { width: 285, anchorY: .65 },
    Ictiossauro: { width: 315, anchorY: .56 },
    Saqueador_da_Selva: { width: 285, anchorY: .66 },
    Boss_Mosasaurus_Jovem: { width: 380, anchorY: .56 },
    Boss_Megalodon_Ancestral: { preserveNeutralDetails: true }
  };
  const ENEMY_SPRITESHEET_OPTIONS_BY_KEY = Object.entries(ENEMY_SPRITESHEET_OPTIONS).reduce((map, [name, options]) => {
    map[normalizeEnemySpriteKey(name)] = options;
    return map;
  }, {});
  const ENEMY_SPRITESHEET_ANIMATIONS = {
    idle: { frames: [0, 1, 2, 1], fps: 3, loop: true, blend: true },
    walking: { frames: [0, 1, 2, 1], fps: 4.8, loop: true, blend: true },
    attack: { frames: [3, 4, 5, 4], fps: 8.5, loop: false, blend: true },
    hit: { frames: [6, 7], fps: 9, loop: false, blend: true },
    death: { frames: [6, 7, 8], fps: 4.8, loop: false, blend: true }
  };
  const ENEMY_HIT_ANIMATION_SECONDS = .34;
  const ENEMY_ATTACK_ANIMATION_SECONDS = .46;
  const ENEMY_DEATH_ANIMATION_SECONDS = .95;
  const BOSS_SPAWN_ANIMATION_SECONDS = 1;
  const BOSS_DEATH_ANIMATION_SECONDS = 1;
  const BOSS_MAP_ADVANCE_DELAY_MS = 1000;
  const BOSS_SURPRISE_CHANCE = .1;
  const BOSS_SURPRISE_SPAWN_DELAY_MS = 2000;
  const BOSS_SURPRISE_MESSAGE = "Você fisgou um peixe estranho...";
  const BOSS_SURPRISE_LOOT_KINDS = new Set(["fish", "shark", "kraken"]);
  const MAP_3_BOSS_SURPRISE_LOOT_KINDS = new Set(["bird"]);

  function normalizeEnemySpriteKey(value = "") {
    return normalizeSpriteKey(value)
      .replace(/^map\s+\d+\s+\d+\s+/, "")
      .replace(/^\d+\s+/, "")
      .replace(/\b(?:boss|sprite|final|pack|bloco|png)\b/g, " ")
      .replace(/\b\d+\s*frames?\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getEnemyRegionalSpritesheetKey(key, regionIndex) {
    return `${Math.floor(Number(regionIndex) || 0)}::${key}`;
  }

  function getEnemySpritesheetAlias(file) {
    return ENEMY_SPRITESHEET_FILE_ALIASES[file] || null;
  }

  function getEnemySpritesheetNameFromFile(file) {
    return getEnemySpritesheetAlias(file)?.name || file
      .replace(/\.png$/i, "")
      .replace(/^MAP-\d+_\d+_/i, "")
      .replace(/^\d+_/, "")
      .replace(/_sprite_\d+frames$/i, "");
  }

  function getEnemySpritesheetOptions(name) {
    const key = normalizeEnemySpriteKey(name);
    const legacyKey = normalizeText(name).replace(/_/g, " ").replace(/\s+/g, " ").trim();
    const base = ENEMY_SPRITE_LAYOUTS[key] || ENEMY_SPRITE_LAYOUTS[legacyKey] || {};
    const override = ENEMY_SPRITESHEET_OPTIONS_BY_KEY[key] || {};
    return {
      frames: base.frames,
      columns: base.columns,
      rows: base.rows,
      width: base.width,
      anchorX: base.anchorX,
      anchorY: base.anchorY,
      offsetX: base.offsetX,
      offsetY: base.offsetY,
      explicitGrid: base.explicitGrid,
      stateFrames: base.stateFrames,
      animations: base.animations,
      ...override
    };
  }

  function measureEnemyFrameBounds(sprite, data, width, height) {
    const frameWidth = Math.floor(width / sprite.columns);
    const frameHeight = Math.floor(height / sprite.rows);
    sprite.frameWidth = frameWidth;
    sprite.frameHeight = frameHeight;
    const bounds = [];
    for (let frame = 0; frame < sprite.frames; frame++) {
      const frameX = (frame % sprite.columns) * frameWidth;
      const frameY = Math.floor(frame / sprite.columns) * frameHeight;
      let left = frameWidth, top = frameHeight, right = -1, bottom = -1;
      let area = 0, sumX = 0, sumY = 0, upperArea = 0, lowerArea = 0;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = ((frameY + y) * width + frameX + x) * 4;
          if (data[index + 3] <= 8) continue;
          area += 1;
          sumX += x;
          sumY += y;
          if (y < frameHeight * .4) upperArea += 1;
          if (y > frameHeight * .62) lowerArea += 1;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      bounds[frame] = right >= left && bottom >= top
        ? {
          left,
          top,
          right,
          bottom,
          area,
          width: right - left + 1,
          height: bottom - top + 1,
          centerX: sumX / area,
          centerY: sumY / area,
          bottomY: bottom,
          upperRatio: upperArea / area,
          lowerRatio: lowerArea / area
        }
        : {
          left: 0,
          top: 0,
          right: frameWidth,
          bottom: frameHeight,
          area: 0,
          width: frameWidth,
          height: frameHeight,
          centerX: frameWidth / 2,
          centerY: frameHeight / 2,
          bottomY: frameHeight,
          upperRatio: 0,
          lowerRatio: 0
        };
    }
    const referenceFrames = [0, 1, 2].map(frame => bounds[frame]).filter(Boolean);
    const average = key => referenceFrames.reduce((sum, item) => sum + item[key], 0) / Math.max(1, referenceFrames.length);
    sprite.frameBounds = bounds;
    sprite.referenceBounds = {
      area: average("area"),
      width: average("width"),
      height: average("height"),
      top: average("top"),
      bottom: average("bottom"),
      centerX: average("centerX"),
      centerY: average("centerY"),
      bottomY: average("bottomY"),
      upperRatio: average("upperRatio"),
      lowerRatio: average("lowerRatio")
    };
  }

  function frameFeatureDistance(a, b, frameWidth, frameHeight) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    const safeArea = Math.max(1, b.area || a.area || 1);
    const safeWidth = Math.max(1, b.width || a.width || 1);
    const safeHeight = Math.max(1, b.height || a.height || 1);
    return Math.abs((a.area - b.area) / safeArea) * .8 +
      Math.abs((a.width - b.width) / safeWidth) * .65 +
      Math.abs((a.height - b.height) / safeHeight) * .85 +
      Math.abs((a.centerX - b.centerX) / Math.max(1, frameWidth)) * 1.2 +
      Math.abs((a.centerY - b.centerY) / Math.max(1, frameHeight)) * 1.25 +
      Math.abs((a.bottomY - b.bottomY) / Math.max(1, frameHeight)) * 1.35 +
      Math.abs((a.upperRatio || 0) - (b.upperRatio || 0)) * .8 +
      Math.abs((a.lowerRatio || 0) - (b.lowerRatio || 0)) * .8;
  }

  function getSpritesheetAnimation(sprite, key) {
    return sprite?.animations?.[key] || ENEMY_SPRITESHEET_ANIMATIONS[key] || null;
  }

  function isFrameStableForAnimation(sprite, frame, referenceFrame = 0, options = {}) {
    const frameWidth = sprite.frameWidth || 1;
    const frameHeight = sprite.frameHeight || 1;
    const reference = sprite.frameBounds?.[referenceFrame] || sprite.referenceBounds;
    const candidate = sprite.frameBounds?.[frame];
    if (!reference || !candidate || !candidate.area) return frame === referenceFrame;
    if (frame === referenceFrame) return true;
    const areaRatio = candidate.area / Math.max(1, reference.area || candidate.area);
    const heightRatio = candidate.height / Math.max(1, reference.height || candidate.height);
    const widthRatio = candidate.width / Math.max(1, reference.width || candidate.width);
    const centerShift = Math.abs(candidate.centerX - reference.centerX) / Math.max(1, frameWidth);
    const bottomShift = Math.abs(candidate.bottomY - reference.bottomY) / Math.max(1, frameHeight);
    const topShift = Math.abs(candidate.top - reference.top) / Math.max(1, frameHeight);
    const minArea = options.minArea ?? .56;
    const maxArea = options.maxArea ?? 1.42;
    const minHeight = options.minHeight ?? .68;
    const maxHeight = options.maxHeight ?? 1.36;
    const minWidth = options.minWidth ?? .62;
    const maxWidth = options.maxWidth ?? 1.34;
    const maxCenterShift = options.centerShift ?? .17;
    const maxBottomShift = options.bottomShift ?? .18;
    const maxTopShift = options.topShift ?? .24;
    return areaRatio >= minArea && areaRatio <= maxArea &&
      heightRatio >= minHeight && heightRatio <= maxHeight &&
      widthRatio >= minWidth && widthRatio <= maxWidth &&
      centerShift <= maxCenterShift &&
      bottomShift <= maxBottomShift &&
      topShift <= maxTopShift;
  }

  function getSafeAnimationFrames(sprite, key, fallbackFrame, referenceFrame = fallbackFrame, options = {}) {
    const animation = getSpritesheetAnimation(sprite, key);
    const maxFrame = Math.max(0, (sprite?.frames || 1) - 1);
    const fallback = clamp(Math.floor(Number(fallbackFrame) || 0), 0, maxFrame);
    const rawFrames = animation?.frames?.length ? animation.frames : [fallback];
    const frames = rawFrames.map(frame => clamp(Math.floor(Number(frame) || 0), 0, maxFrame));
    if (sprite?.explicitGrid) return frames;
    if (key === "death") return [fallback];
    const stableFrames = frames.filter(frame => isFrameStableForAnimation(sprite, frame, referenceFrame, options));
    return stableFrames.length === frames.length ? frames : [fallback];
  }

  function getAnimationFrameAtTime(sprite, key, elapsed, fallbackFrame, referenceFrame = fallbackFrame, options = {}) {
    const animation = getSpritesheetAnimation(sprite, key);
    const frames = getSafeAnimationFrames(sprite, key, fallbackFrame, referenceFrame, options);
    if (!animation || frames.length <= 1) return frames[0] ?? fallbackFrame;
    const frameIndex = animation.loop
      ? Math.floor(Math.max(0, elapsed) * animation.fps) % frames.length
      : Math.min(frames.length - 1, Math.floor(Math.max(0, elapsed) * animation.fps));
    return frames[frameIndex] ?? frames[0] ?? fallbackFrame;
  }

  function isAliveDamagedFrame(sprite, frame, normalFrame, defeatedFrame) {
    const frameWidth = sprite.frameWidth || 1;
    const frameHeight = sprite.frameHeight || 1;
    const normal = sprite.referenceBounds || sprite.frameBounds?.[normalFrame];
    const candidate = sprite.frameBounds?.[frame];
    const defeated = sprite.frameBounds?.[defeatedFrame];
    if (!normal || !candidate || !candidate.area || frame === defeatedFrame) return false;
    const areaRatio = candidate.area / Math.max(1, normal.area || candidate.area);
    const heightRatio = candidate.height / Math.max(1, normal.height || candidate.height);
    const widthRatio = candidate.width / Math.max(1, normal.width || candidate.width);
    const centerShift = Math.abs(candidate.centerX - normal.centerX) / Math.max(1, frameWidth);
    const bottomShift = Math.abs(candidate.bottomY - normal.bottomY) / Math.max(1, frameHeight);
    const topShift = Math.abs(candidate.top - normal.top) / Math.max(1, frameHeight);
    const normalDistance = frameFeatureDistance(candidate, normal, frameWidth, frameHeight);
    const defeatedDistance = defeated ? frameFeatureDistance(candidate, defeated, frameWidth, frameHeight) : Number.POSITIVE_INFINITY;
    if (areaRatio < .58 || areaRatio > 1.35) return false;
    if (heightRatio < .72 || heightRatio > 1.32) return false;
    if (widthRatio < .72 || widthRatio > 1.22) return false;
    if (centerShift > .15 || bottomShift > .2 || topShift > .22) return false;
    if (candidate.top > normal.top + frameHeight * .12 && heightRatio < .94) return false;
    if (defeated && defeated.area && defeatedDistance < normalDistance * .92) return false;
    return true;
  }

  function configureSpritesheetStateFrames(sprite) {
    const role = sprite.role || "enemy";
    const defaults = SPRITE_STATE_SPRITES[role] || ENEMY_STATE_SPRITES;
    const maxFrame = Math.max(0, (sprite.frames || 1) - 1);
    if (sprite.customStateFrames) {
      sprite.stateFrames = {
        normal: clamp(Math.floor(Number(sprite.customStateFrames.normal) || 0), 0, maxFrame),
        damaged: clamp(Math.floor(Number(sprite.customStateFrames.damaged ?? sprite.customStateFrames.normal) || 0), 0, maxFrame),
        defeated: clamp(Math.floor(Number(sprite.customStateFrames.defeated ?? sprite.customStateFrames.normal) || 0), 0, maxFrame)
      };
      return;
    }
    const normalFrame = clamp(Math.floor(defaults.normal || 0), 0, maxFrame);
    const defeatedFrame = clamp(Math.floor(defaults.defeated ?? normalFrame), 0, maxFrame);
    if (role !== "enemy") {
      sprite.stateFrames = {
        normal: normalFrame,
        damaged: clamp(Math.floor(defaults.damaged ?? normalFrame), 0, maxFrame),
        defeated: defeatedFrame
      };
      return;
    }
    const damagedCandidates = [defaults.damaged, 7, 6]
      .map(frame => clamp(Math.floor(Number(frame) || 0), 0, maxFrame))
      .filter((frame, index, list) => frame !== normalFrame && frame !== defeatedFrame && list.indexOf(frame) === index);
    const damagedFrame = damagedCandidates.find(frame => isAliveDamagedFrame(sprite, frame, normalFrame, defeatedFrame)) ?? normalFrame;
    sprite.stateFrames = { normal: normalFrame, damaged: damagedFrame, defeated: defeatedFrame };
  }

  function normalizeSpritesheetGrid(sprite, width, height) {
    if (sprite.explicitGrid) return;
    const fileFrameCount = getSpritesheetFrameCountFromFile(sprite.file);
    if (fileFrameCount === 9 && width === height && width % 3 === 0 && height % 3 === 0) {
      sprite.columns = 3;
      sprite.rows = 3;
      sprite.frames = 9;
    }
  }

  function cleanupSpritesheetLightArtifacts(data, width, height) {
    const total = width * height;
    const visited = new Uint8Array(total);
    const maxArtifactSize = 72;
    const isCandidate = pixel => {
      const index = pixel * 4;
      if (data[index + 3] <= 8) return false;
      const r = data[index], g = data[index + 1], b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const average = (r + g + b) / 3;
      return max - min <= 18 && average >= 226;
    };
    const touchesTransparent = (x, y) => {
      if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return true;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          if (data[((y + oy) * width + x + ox) * 4 + 3] <= 8) return true;
        }
      }
      return false;
    };
    for (let start = 0; start < total; start++) {
      if (visited[start] || !isCandidate(start)) continue;
      const queue = [start];
      const component = [];
      let head = 0;
      let tooLarge = false;
      let nearTransparent = false;
      visited[start] = 1;
      while (head < queue.length) {
        const pixel = queue[head++];
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        if (component.length <= maxArtifactSize) component.push(pixel);
        if (component.length > maxArtifactSize) tooLarge = true;
        if (touchesTransparent(x, y)) nearTransparent = true;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = y + oy;
          if (ny < 0 || ny >= height) continue;
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            const nx = x + ox;
            if (nx < 0 || nx >= width) continue;
            const next = ny * width + nx;
            if (visited[next] || !isCandidate(next)) continue;
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
      if (tooLarge || !nearTransparent) continue;
      component.forEach(pixel => { data[pixel * 4 + 3] = 0; });
    }
  }

  function cleanupSpritesheetDetachedFrameArtifacts(sprite, data, width, height) {
    const columns = sprite.columns || 1;
    const rows = sprite.rows || 1;
    const frames = sprite.frames || columns * rows;
    if (frames <= 1 || columns <= 1 || rows <= 1) return;
    const frameWidth = Math.floor(width / columns);
    const frameHeight = Math.floor(height / rows);
    const significantArea = Math.max(72, Math.floor(frameWidth * frameHeight * .00035));
    const componentScore = component => {
      let score = component.area;
      if (component.top <= 1) score *= .35;
      if (component.left <= 1 || component.right >= frameWidth - 2) score *= .72;
      if (component.bottom >= frameHeight - 2 && component.visibleHeight < frameHeight * .35) score *= .78;
      return score * (1 + component.bottom / Math.max(1, frameHeight) * .18);
    };
    for (let frame = 0; frame < frames; frame++) {
      const frameX = (frame % columns) * frameWidth;
      const frameY = Math.floor(frame / columns) * frameHeight;
      const visited = new Uint8Array(frameWidth * frameHeight);
      const components = [];
      const isOpaque = (x, y) => data[((frameY + y) * width + frameX + x) * 4 + 3] > 8;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const start = y * frameWidth + x;
          if (visited[start] || !isOpaque(x, y)) continue;
          const queue = [start];
          const pixels = [];
          let head = 0;
          let left = x, right = x, top = y, bottom = y;
          visited[start] = 1;
          while (head < queue.length) {
            const point = queue[head++];
            const px = point % frameWidth;
            const py = Math.floor(point / frameWidth);
            pixels.push(point);
            if (px < left) left = px;
            if (px > right) right = px;
            if (py < top) top = py;
            if (py > bottom) bottom = py;
            for (let oy = -1; oy <= 1; oy++) {
              const ny = py + oy;
              if (ny < 0 || ny >= frameHeight) continue;
              for (let ox = -1; ox <= 1; ox++) {
                if (!ox && !oy) continue;
                const nx = px + ox;
                if (nx < 0 || nx >= frameWidth) continue;
                const next = ny * frameWidth + nx;
                if (visited[next] || !isOpaque(nx, ny)) continue;
                visited[next] = 1;
                queue.push(next);
              }
            }
          }
          components.push({
            pixels,
            area: pixels.length,
            left,
            right,
            top,
            bottom,
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2,
            visibleHeight: bottom - top + 1
          });
        }
      }
      if (components.length <= 1) continue;
      const primary = components.reduce((best, component) => componentScore(component) > componentScore(best) ? component : best, components[0]);
      components.forEach(component => {
        if (component === primary) return;
        const clipped = component.top <= 1 || component.bottom >= frameHeight - 2 || component.left <= 1 || component.right >= frameWidth - 2;
        const separatedY = component.bottom < primary.top - frameHeight * .035 || component.top > primary.bottom + frameHeight * .035;
        const separatedX = component.right < primary.left - frameWidth * .035 || component.left > primary.right + frameWidth * .035;
        const largeEnough = component.area >= significantArea || component.area >= primary.area * .018;
        if (!clipped && !separatedY && !separatedX && !largeEnough) return;
        component.pixels.forEach(point => {
          const px = point % frameWidth;
          const py = Math.floor(point / frameWidth);
          data[((frameY + py) * width + frameX + px) * 4 + 3] = 0;
        });
      });
    }
  }

  function removeConnectedSpritesheetBackground(sprite, data, width, height, bg, bgIsLightNeutral) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    let head = 0;
    const preserveNeutralDetails = Boolean(sprite?.preserveNeutralDetails);
    const columns = Math.max(1, sprite?.columns || 1);
    const rows = Math.max(1, sprite?.rows || 1);
    const frameWidth = Math.floor(width / columns);
    const frameHeight = Math.floor(height / rows);
    const isConnectedBackground = index => {
      if (data[index + 3] <= 8) return true;
      const r = data[index], g = data[index + 1], b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const average = (r + g + b) / 3;
      const distance = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
      return distance < (preserveNeutralDetails ? 58 : 50) ||
        (saturation < 9 && average > 88 && average < 190 && distance < (preserveNeutralDetails ? 96 : 82)) ||
        (bgIsLightNeutral && saturation < 16 && average > 176 && distance < (preserveNeutralDetails ? 92 : 78));
    };
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const point = y * width + x;
      if (visited[point]) return;
      const index = point * 4;
      if (!isConnectedBackground(index)) return;
      visited[point] = 1;
      data[index + 3] = 0;
      queue.push(point);
    };
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const left = column * frameWidth;
        const top = row * frameHeight;
        const right = column === columns - 1 ? width - 1 : left + frameWidth - 1;
        const bottom = row === rows - 1 ? height - 1 : top + frameHeight - 1;
        for (let x = left; x <= right; x++) {
          push(x, top);
          push(x, bottom);
        }
        for (let y = top + 1; y < bottom; y++) {
          push(left, y);
          push(right, y);
        }
      }
    }
    while (head < queue.length) {
      const point = queue[head++];
      const x = point % width;
      const y = Math.floor(point / width);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          push(x + ox, y + oy);
        }
      }
    }
  }

  function removeInternalSpritesheetBackgroundPockets(sprite, data, width, height, bg) {
    const columns = Math.max(1, sprite?.columns || 1);
    const rows = Math.max(1, sprite?.rows || 1);
    const frameWidth = Math.floor(width / columns);
    const frameHeight = Math.floor(height / rows);
    const bgAverage = (bg.r + bg.g + bg.b) / 3;
    const preserveNeutralDetails = Boolean(sprite?.preserveNeutralDetails);
    const frameArea = Math.max(1, frameWidth * frameHeight);
    const distanceLimit = preserveNeutralDetails ? 26 : 34;
    const averageDeltaLimit = preserveNeutralDetails ? 18 : 24;
    const maxComponentRatio = preserveNeutralDetails ? .085 : .16;
    const isPocketPixel = index => {
      if (data[index + 3] <= 8) return false;
      const r = data[index], g = data[index + 1], b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const average = (r + g + b) / 3;
      if (average > 205 && bgAverage < 190) return false;
      if (average < 70) return false;
      const saturation = max - min;
      const distance = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
      return distance <= distanceLimit ||
        (saturation <= 7 && Math.abs(average - bgAverage) <= averageDeltaLimit && distance <= distanceLimit + 12);
    };
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const frameX = column * frameWidth;
        const frameY = row * frameHeight;
        const visited = new Uint8Array(frameWidth * frameHeight);
        for (let y = 0; y < frameHeight; y++) {
          for (let x = 0; x < frameWidth; x++) {
            const start = y * frameWidth + x;
            const startIndex = ((frameY + y) * width + frameX + x) * 4;
            if (visited[start] || !isPocketPixel(startIndex)) continue;
            const queue = [start];
            const component = [];
            let head = 0;
            let distanceSum = 0;
            let distanceMax = 0;
            let touchesTransparent = false;
            visited[start] = 1;
            while (head < queue.length) {
              const point = queue[head++];
              const px = point % frameWidth;
              const py = Math.floor(point / frameWidth);
              const index = ((frameY + py) * width + frameX + px) * 4;
              const distance = Math.hypot(data[index] - bg.r, data[index + 1] - bg.g, data[index + 2] - bg.b);
              distanceSum += distance;
              distanceMax = Math.max(distanceMax, distance);
              component.push(point);
              for (let oy = -1; oy <= 1; oy++) {
                const ny = py + oy;
                if (ny < 0 || ny >= frameHeight) continue;
                for (let ox = -1; ox <= 1; ox++) {
                  if (!ox && !oy) continue;
                  const nx = px + ox;
                  if (nx < 0 || nx >= frameWidth) continue;
                  const nextIndex = ((frameY + ny) * width + frameX + nx) * 4;
                  if (data[nextIndex + 3] <= 8) touchesTransparent = true;
                  const next = ny * frameWidth + nx;
                  if (visited[next] || !isPocketPixel(nextIndex)) continue;
                  visited[next] = 1;
                  queue.push(next);
                }
              }
            }
            const averageDistance = distanceSum / Math.max(1, component.length);
            const smallEnough = component.length <= frameArea * maxComponentRatio;
            const exactBackground = averageDistance <= (preserveNeutralDetails ? 14 : 18) && distanceMax <= distanceLimit + 8;
            const edgePocket = touchesTransparent && averageDistance <= distanceLimit;
            if (!smallEnough || (!exactBackground && !edgePocket)) continue;
            component.forEach(point => {
              const px = point % frameWidth;
              const py = Math.floor(point / frameWidth);
              data[((frameY + py) * width + frameX + px) * 4 + 3] = 0;
            });
          }
        }
      }
    }
  }

  function cleanSpriteTransparency(sprite, data, width, height) {
    const samplePoints = [
      0,
      (width - 1) * 4,
      ((height - 1) * width) * 4,
      ((height - 1) * width + width - 1) * 4
    ];
    const opaqueSamples = samplePoints.filter(index => data[index + 3] > 8);
    const bgSamples = opaqueSamples.length ? opaqueSamples : samplePoints;
    const bg = bgSamples.reduce((color, index) => {
      color.r += data[index];
      color.g += data[index + 1];
      color.b += data[index + 2];
      return color;
    }, { r: 0, g: 0, b: 0 });
    bg.r /= bgSamples.length;
    bg.g /= bgSamples.length;
    bg.b /= bgSamples.length;
    const hasOpaqueBackground = opaqueSamples.length > 0;
    const bgMax = Math.max(bg.r, bg.g, bg.b);
    const bgMin = Math.min(bg.r, bg.g, bg.b);
    const bgAverage = (bg.r + bg.g + bg.b) / 3;
    const bgIsLightNeutral = bgMax - bgMin < 36 && bgAverage > 196;
    if (hasOpaqueBackground) {
      removeConnectedSpritesheetBackground(sprite, data, width, height, bg, bgIsLightNeutral);
      removeInternalSpritesheetBackgroundPockets(sprite, data, width, height, bg);
      cleanupSpritesheetLightArtifacts(data, width, height);
      return;
    }
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const average = (r + g + b) / 3;
      const distance = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
      if (
        (hasOpaqueBackground && distance < 44) ||
        (hasOpaqueBackground && saturation < 9 && average > 88 && average < 190) ||
        (bgIsLightNeutral && saturation < 16 && average > 176 && distance < 92)
      ) data[i + 3] = 0;
    }
    cleanupSpritesheetLightArtifacts(data, width, height);
  }

  function prepareEnemySpritesheet(sprite) {
    const image = sprite.image;
    if (!image?.complete || !image.naturalWidth || sprite.ready || sprite.processing) return;
    sprite.processing = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      normalizeSpritesheetGrid(sprite, canvas.width, canvas.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      cleanSpriteTransparency(sprite, data, canvas.width, canvas.height);
      cleanupSpritesheetDetachedFrameArtifacts(sprite, data, canvas.width, canvas.height);
      measureEnemyFrameBounds(sprite, data, canvas.width, canvas.height);
      configureSpritesheetStateFrames(sprite);
      context.putImageData(pixels, 0, 0);
      sprite.canvas = canvas;
      sprite.ready = true;
    } catch (error) {
      sprite.canvas = null;
      sprite.ready = true;
    } finally {
      sprite.processing = false;
    }
  }

  const ENEMY_ANIMATED_SPRITESHEETS = ENEMY_SPRITESHEET_FILES.reduce((sprites, file) => {
    const alias = getEnemySpritesheetAlias(file);
    const name = getEnemySpritesheetNameFromFile(file);
    const options = getEnemySpritesheetOptions(name);
    const fileFrameCount = getSpritesheetFrameCountFromFile(file);
    const optionFrameCount = Math.floor(Number(options.frames) || 0);
    const usesNineFrameLayout = !options.explicitGrid && !optionFrameCount && fileFrameCount === 9;
    const key = normalizeEnemySpriteKey(name);
    const regionalKey = alias?.regionIndex != null ? getEnemyRegionalSpritesheetKey(key, alias.regionIndex) : key;
    const sprite = {
      key: name,
      sheetKey: regionalKey,
      role: "enemy",
      image: createLazyImage(),
      canvas: null,
      file,
      regionIndex: alias?.regionIndex ?? null,
      frames: optionFrameCount || fileFrameCount || 9,
      columns: options.columns || 3,
      rows: usesNineFrameLayout ? 3 : options.rows || 3,
      animations: options.animations || null,
      explicitGrid: Boolean(options.explicitGrid),
      customStateFrames: options.stateFrames || null,
      width: options.width || 285,
      anchorX: options.anchorX ?? .5,
      anchorY: options.anchorY ?? .64,
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0,
      stateFrames: null,
      frameBounds: null,
      referenceBounds: null,
      ready: false,
      processing: false,
      requested: false,
      loadFailed: false
    };
    if (!sprites[key]) sprites[key] = sprite;
    sprites[regionalKey] = sprite;
    return sprites;
  }, {});
  const ENEMY_SPRITESHEET_KEYS = Object.keys(ENEMY_ANIMATED_SPRITESHEETS).filter(key => !key.includes("::"));
  const ENEMY_MISSING_SPRITESHEET_WARNINGS = new Set();

  function getEnemySpritesheetMatchScore(key, candidate) {
    if (!key || !candidate) return 0;
    if (key === candidate) return 1;
    if (key.includes(candidate) || candidate.includes(key)) {
      return Math.min(key.length, candidate.length) / Math.max(key.length, candidate.length);
    }
    const sourceTokens = key.split(" ").filter(Boolean);
    const targetTokens = candidate.split(" ").filter(Boolean);
    const targetSet = new Set(targetTokens);
    const shared = sourceTokens.filter(token => targetSet.has(token)).length;
    return shared / Math.max(sourceTokens.length, targetTokens.length, 1);
  }

  function findClosestEnemySpritesheet(key) {
    let bestKey = "";
    let bestScore = 0;
    ENEMY_SPRITESHEET_KEYS.forEach(candidate => {
      const score = getEnemySpritesheetMatchScore(key, candidate);
      if (score > bestScore) {
        bestKey = candidate;
        bestScore = score;
      }
    });
    return bestScore >= .78 ? ENEMY_ANIMATED_SPRITESHEETS[bestKey] : null;
  }

  function getEnemyAnimatedSpritesheet(enemyOrName, regionIndex = state.regionIndex) {
    const animationKey = typeof enemyOrName === "object" ? enemyOrName?.animation?.sheetKey : null;
    if (animationKey && ENEMY_ANIMATED_SPRITESHEETS[animationKey]) return ENEMY_ANIMATED_SPRITESHEETS[animationKey];
    const name = typeof enemyOrName === "object" ? enemyOrName?.name : enemyOrName;
    const key = normalizeEnemySpriteKey(name);
    const regionalKey = getEnemyRegionalSpritesheetKey(key, regionIndex);
    const sprite = ENEMY_ANIMATED_SPRITESHEETS[regionalKey] || ENEMY_ANIMATED_SPRITESHEETS[key] || findClosestEnemySpritesheet(key);
    if (sprite) return sprite;
    if (key && !ENEMY_MISSING_SPRITESHEET_WARNINGS.has(key)) {
      ENEMY_MISSING_SPRITESHEET_WARNINGS.add(key);
      console.warn(`[Pirates of Abyss] Sprite sheet de inimigo nao encontrada para: ${name}`);
    }
    return null;
  }

  function requestEnemySpritesheet(sprite) {
    return requestSpriteImage(sprite, `${ENEMY_SPRITESHEET_PATH}${sprite.file}`, prepareEnemySpritesheet);
  }

  const PRELOAD_REGION_LOOKAHEAD = 1;
  const COMBAT_ASSET_PRELOAD_TIMEOUT_MS = 6500;
  const preloadedRegionAssets = new Set();
  const pendingRegionPreloads = new Set();
  let regionPreloadScheduled = false;
  const combatAssetPreload = {
    key: "",
    loading: false,
    ready: false,
    promise: null
  };

  function preloadRegionAssets(regionIndex) {
    const index = Math.floor(Number(regionIndex));
    if (index < 0 || index >= REGIONS.length || preloadedRegionAssets.has(index)) return;
    preloadedRegionAssets.add(index);

    getFixedBackgroundSprite(REGIONS[index]);

    const names = new Set((REGION_ENCOUNTERS[index] || []).map(enemy => enemy.name));
    if (REGIONS[index]?.boss) names.add(REGIONS[index].boss);
    names.forEach(name => {
      const sprite = getEnemyAnimatedSpritesheet(name, index);
      if (sprite) requestEnemySpritesheet(sprite);
    });
  }

  function flushRegionPreloads() {
    regionPreloadScheduled = false;
    const indices = [...pendingRegionPreloads].sort((a, b) => a - b);
    pendingRegionPreloads.clear();
    indices.forEach(preloadRegionAssets);
  }

  function queueRegionPreload(regionIndex) {
    const index = Math.floor(Number(regionIndex));
    if (index < 0 || index >= REGIONS.length || preloadedRegionAssets.has(index)) return;
    pendingRegionPreloads.add(index);
    if (regionPreloadScheduled) return;
    regionPreloadScheduled = true;
    if ("requestIdleCallback" in window) window.requestIdleCallback(flushRegionPreloads, { timeout: 1600 });
    else window.setTimeout(flushRegionPreloads, 350);
  }

  function scheduleNearbyRegionPreload() {
    const current = clamp(Math.floor(Number(state.regionIndex) || 0), 0, REGIONS.length - 1);
    for (let offset = 0; offset <= PRELOAD_REGION_LOOKAHEAD; offset += 1) queueRegionPreload(current + offset);
  }

  function getCombatAssetPreloadKey(regionIndex = state.regionIndex) {
    return `${Math.floor(Number(regionIndex) || 0)}:${state.shipId}:${state.equippedPetId ?? "none"}`;
  }

  function collectCriticalCombatAssetSprites(regionIndex = state.regionIndex) {
    const index = clamp(Math.floor(Number(regionIndex) || 0), 0, REGIONS.length - 1);
    const sprites = [];
    const addSprite = sprite => {
      if (sprite && !sprites.includes(sprite)) sprites.push(sprite);
    };

    addSprite(getFixedBackgroundSprite(REGIONS[index]));

    const shipSprite = getPlayerShipSpritesheet(SHIPS[state.shipId]?.name);
    if (shipSprite) {
      requestPlayerShipSpritesheet(shipSprite);
      addSprite(shipSprite);
    }
    requestRepairEffectSprite();
    addSprite(REPAIR_EFFECT_SPRITE);

    const enemyNames = new Set((REGION_ENCOUNTERS[index] || []).map(enemy => enemy.name).filter(Boolean));
    if (REGIONS[index]?.boss) enemyNames.add(REGIONS[index].boss);
    enemyNames.forEach(name => {
      const sprite = getEnemyAnimatedSpritesheet(name, index);
      if (sprite) {
        requestEnemySpritesheet(sprite);
        addSprite(sprite);
      }
    });

    const pet = getEquippedPet();
    const petSprite = pet ? getPetSprite(pet.visual) : null;
    if (petSprite) {
      requestPetSprite(petSprite);
      addSprite(petSprite);
    }

    return sprites;
  }

  function waitForSpriteAsset(sprite) {
    if (!sprite || sprite.loadFailed) return Promise.resolve(false);
    const image = sprite.image;
    if (image?.complete && image.naturalWidth) return Promise.resolve(true);
    return sprite.loadPromise || Promise.resolve(Boolean(sprite.ready));
  }

  function waitForCriticalCombatAssets(sprites) {
    const waits = sprites.map(waitForSpriteAsset);
    const timeout = new Promise(resolve => window.setTimeout(resolve, COMBAT_ASSET_PRELOAD_TIMEOUT_MS));
    return Promise.race([Promise.allSettled(waits), timeout]);
  }

  function areCriticalCombatAssetsReady() {
    return combatAssetPreload.key === getCombatAssetPreloadKey() && combatAssetPreload.ready;
  }

  function beginCombatAssetPreload(options = {}) {
    const key = getCombatAssetPreloadKey();
    if (!options.force && combatAssetPreload.key === key && combatAssetPreload.promise) return combatAssetPreload.promise;
    combatAssetPreload.key = key;
    combatAssetPreload.loading = true;
    combatAssetPreload.ready = false;
    const sprites = collectCriticalCombatAssetSprites();
    combatAssetPreload.promise = waitForCriticalCombatAssets(sprites).then(() => {
      if (combatAssetPreload.key !== key) return false;
      combatAssetPreload.loading = false;
      combatAssetPreload.ready = true;
      renderCombatHud();
      return true;
    });
    renderCombatHud();
    return combatAssetPreload.promise;
  }

  function ensureCriticalCombatAssetsReady() {
    if (areCriticalCombatAssetsReady()) return true;
    beginCombatAssetPreload();
    return false;
  }

  function getCombatHudRegionLabel() {
    const shouldShowLoading = combatAssetPreload.loading && !areCriticalCombatAssetsReady() && state.combat.running && !state.combat.enemy && !isArenaSceneActive();
    return shouldShowLoading ? "Carregando imagens..." : getActiveCombatRegionLabel();
  }

  function createEnemySpriteAnimation(name, regionIndex = state.regionIndex) {
    const sprite = getEnemyAnimatedSpritesheet(name, regionIndex);
    if (!sprite) return null;
    return {
      sheetKey: sprite.sheetKey || normalizeEnemySpriteKey(sprite.key),
      frameSeed: randomBetween(0, 5),
      spawnStartedAt: -999,
      spawnUntil: 0,
      attackStartedAt: -999,
      attackUntil: 0,
      hitStartedAt: -999,
      hitUntil: 0,
      deathStartedAt: 0,
      poseName: "",
      poseChangedAt: -999
    };
  }

  function ensureEnemySpriteAnimation(enemy) {
    const sprite = getEnemyAnimatedSpritesheet(enemy);
    if (!sprite) return null;
    if (!enemy.animation || enemy.animation.sheetKey !== (sprite.sheetKey || normalizeEnemySpriteKey(sprite.key))) enemy.animation = createEnemySpriteAnimation(enemy.name, state.regionIndex);
    return enemy.animation;
  }

  function inferEnemyVisual(name, region = {}, fallback = "PIRATA", tier = 1, isBoss = false) {
    const raw = `${name} ${region.name || ""} ${region.kind || ""}`;
    const text = normalizeText(raw);
    const has = (...words) => words.some(word => text.includes(word));
    const volcanic = has("vulcan", "lava", "cinza", "flamejante", "obsidiana");
    const glacial = has("gelo", "glacial", "congel", "artic", "boreal");
    const spectral = has("fantasma", "espectral", "amaldic", "holandes", "vulto", "perdida", "maldito", "afundado", "abismo");
    let type = "pirate-ship";
    let label = ENEMY_CATEGORIES[fallback]?.label || fallback || "INIMIGO";
    let attack = "cannon";
    let scale = 1;

    if (has("kraken", "tentaculo")) { type = "kraken"; label = "KRAKEN"; attack = "tentacle"; scale = 1.22; }
    else if (has("megalodon", "tubarao")) { type = "megalodon"; label = "PREDADOR MARINHO"; attack = "bite"; scale = 1.16; }
    else if (has("leviata", "jormungandr", "serpente")) { type = "sea-serpent"; label = "SERPENTE MARINHA"; attack = glacial ? "ice" : spectral ? "abyss" : volcanic ? "fire" : "wave"; scale = 1.1; }
    else if (has("mosasaurus", "mosassauro", "plesiossauro", "ictiossauro", "reptil", "jacare", "crocomar", "deinosuchus", "carapaca", "dragao marinho")) { type = "marine-reptile"; label = "CRIATURA MARINHA"; attack = volcanic ? "fire" : "bite"; scale = has("dragao", "mosasaurus", "deinosuchus") ? 1.18 : 1; }
    else if (has("pterodactilo", "pteranodonte", "passaro", "aereo")) { type = "flying-creature"; label = "CRIATURA VOADORA"; attack = "dive"; scale = isBoss ? 1.18 : 1; }
    else if (has("foca")) { type = "seal"; label = "CRIATURA MARINHA"; attack = "splash"; scale = .72; }
    else if (has("criatura", "guardiao do abismo")) { type = "abyssal-creature"; label = "CRIATURA ABISSAL"; attack = "abyss"; scale = 1.12; }
    else if (has("jangada")) { type = "raft"; label = has("pescador") ? "PESCADOR" : "JANGADA"; attack = has("caca", "tribal") ? "arrow" : "harpoon"; scale = .82; }
    else if (has("canoa")) { type = "canoe"; label = has("guerra") ? "CANOA DE GUERRA" : "CANOA"; attack = "arrow"; scale = .86; }
    else if (has("bote")) { type = has("tribal") ? "tribal-boat" : "small-boat"; label = has("tribal") ? "BOTE TRIBAL" : "BOTE"; attack = has("pesca", "pescador") ? "harpoon" : "cannon"; scale = .88; }
    else if (has("pescador", "pesca", "baleeiro", "traineira", "remador")) { type = "fishing-boat"; label = "PESCADOR"; attack = has("baleeiro") ? "harpoon" : "net"; scale = .86; }
    else if (has("cacador", "tribal", "mangue", "guardiao", "cultista", "saqueador", "arqueiro", "guerreiro")) { type = region.kind === "PRIMITIVO" || has("mangue", "tribal") ? "tribal-boat" : "raider-boat"; label = has("guardiao") ? "GUARDIAO" : has("cacador") ? "CACADOR" : "SAQUEADOR"; attack = region.kind === "PRIMITIVO" || has("tribal", "mangue") ? "arrow" : "cannon"; scale = .93; }
    else if (spectral) { type = has("tripulacao", "vulto") ? "specter" : "ghost-ship"; label = has("frota") ? "FROTA FANTASMA" : "SOBRENATURAL"; attack = "ghost"; scale = has("frota", "dreadnought") ? 1.2 : 1; }
    else if (has("fragata", "galeao", "linha", "encouracado", "armada", "frota", "imperial", "marinha", "cutter", "patrulha", "corveta", "almirante")) { type = "imperial-ship"; label = has("frota", "armada") ? "ARMADA" : "MARINHA"; attack = "barrage"; scale = has("encouracado", "armada", "linha") ? 1.18 : 1.05; }
    else if (has("mercante", "transporte", "carga", "contrabandista", "suprimentos")) { type = has("contrabandista") ? "smuggler-ship" : "merchant-ship"; label = has("contrabandista") ? "CONTRABANDISTA" : "MERCANTE"; attack = has("contrabandista") ? "cannon" : "harpoon"; scale = .98; }

    if (volcanic && !["sea-serpent", "marine-reptile"].includes(type)) attack = "fire";
    if (glacial && !["sea-serpent"].includes(type)) attack = "ice";
    if (spectral && type.includes("ship")) attack = "ghost";
    if (isBoss) scale *= 1.18;
    return { type, label, attack, scale: clamp(scale + Math.max(0, tier - 3) * .04, .68, 1.48), theme: volcanic ? "volcanic" : glacial ? "glacial" : spectral ? "spectral" : region.kind === "PRIMITIVO" ? "primitive" : normalizeText(region.kind || "") };
  }

  class SeaScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.time = 0;
      this.projectiles = [];
      this.bursts = [];
      this.sabotageEffects = [];
      this.aquaticBursts = [];
      this.bossSurpriseAlerts = [];
      this.petLunge = 0;
      this.floaters = [];
      this.lootFloaters = [];
      this.chests = [];
      this.enemyDeathAnimations = [];
      this.playerShipAnimation = null;
      this.playerCaptainReaction = { state: "idle", until: 0 };
      this.repairEffect = { startedAt: -999, until: 0 };
      this.captainEditorDrag = null;
      this.captainEditorInfo = null;
      this.environmentEvents = [];
      this.environmentTimers = { bird: 2.5, fish: 3.5, shark: 19, kraken: 72 };
      this.resize = this.resize.bind(this);
      this.handleEnvironmentPointer = this.handleEnvironmentPointer.bind(this);
      this.handleCaptainEditorPointerMove = this.handleCaptainEditorPointerMove.bind(this);
      this.handleCaptainEditorPointerUp = this.handleCaptainEditorPointerUp.bind(this);
      new ResizeObserver(this.resize).observe(canvas);
      canvas.addEventListener("pointerdown", this.handleEnvironmentPointer);
      if (isCaptainEditorEnabled()) {
        canvas.addEventListener("pointermove", this.handleCaptainEditorPointerMove);
        canvas.addEventListener("pointerup", this.handleCaptainEditorPointerUp);
        canvas.addEventListener("pointercancel", this.handleCaptainEditorPointerUp);
      }
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = Math.max(320, rect.width);
      this.height = Math.max(120, rect.height);
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    fire(fromPlayer, color = "#ffd37a") {
      const start = fromPlayer ? { x: this.width * .31, y: this.height * .64 } : { x: this.width * .71, y: this.height * .49 };
      const end = fromPlayer ? { x: this.width * .68, y: this.height * .50 } : { x: this.width * .32, y: this.height * .65 };
      this.projectiles.push({ start, end, age: 0, duration: .52, color, fromPlayer });
    }

    burst(atEnemy = true, color = "#f4a34c") {
      this.bursts.push({ x: this.width * (atEnemy ? .70 : .30), y: this.height * (atEnemy ? .52 : .65), age: 0, color });
    }

    sabotageEnemy(color = "#b68cff") {
      this.sabotageEffects.push({ x: this.width * .70, y: this.height * .52, age: 0, color });
      this.sabotageEffects = this.sabotageEffects.slice(-4);
    }

    triggerBossSurpriseAlert() {
      this.bossSurpriseAlerts.push({ age: 0, duration: .85 });
      this.bossSurpriseAlerts = this.bossSurpriseAlerts.slice(-2);
      this.bursts.push({ x: this.width * .70, y: this.height * .52, age: 0, color: "#ff5a4e" });
      this.aquaticBursts.push({ x: this.width * .69, y: this.height * .56, age: 0, color: "#ff5a4e", kind: "boss-surprise" });
      const stage = $("#battle-stage");
      if (stage) {
        stage.classList.remove("boss-surprise-shake");
        void stage.offsetWidth;
        stage.classList.add("boss-surprise-shake");
        window.setTimeout(() => stage.classList.remove("boss-surprise-shake"), 720);
      }
    }

    petStrike(pet) {
      this.petLunge = 1;
      this.aquaticBursts.push({ x: this.width * .69, y: this.height * .54, age: 0, color: pet.color, kind: pet.visual });
    }

    manualAttackFeedback(color = "#9ff4e9") {
      this.bursts.push({ x: this.width * .31, y: this.height * .64, age: 0, color });
    }

    floatDamage(amount, atEnemy = true, color = "#fff0bc") {
      this.floaters.push({ text: amount, x: this.width * (atEnemy ? .70 : .30) + randomBetween(-25, 25), y: this.height * (atEnemy ? .47 : .60), age: 0, color });
    }

    markEnemyHit(enemy) {
      const animation = ensureEnemySpriteAnimation(enemy);
      if (!animation || enemy.defeated) return;
      animation.hitStartedAt = this.time;
      animation.hitUntil = this.time + ENEMY_HIT_ANIMATION_SECONDS;
    }

    markEnemyAttack(enemy) {
      const animation = ensureEnemySpriteAnimation(enemy);
      if (!animation || enemy.defeated || animation.deathStartedAt) return;
      animation.attackStartedAt = this.time;
      animation.attackUntil = this.time + ENEMY_ATTACK_ANIMATION_SECONDS;
    }

    ensurePlayerShipAnimation(ship) {
      const sprite = getPlayerShipSpritesheet(ship?.name);
      if (!sprite) return null;
      if (!this.playerShipAnimation || this.playerShipAnimation.sheetKey !== sprite.key) {
        this.playerShipAnimation = { sheetKey: sprite.key, frameSeed: randomBetween(0, 5), attackStartedAt: -999, attackUntil: 0, deathStartedAt: 0 };
      }
      return this.playerShipAnimation;
    }

    markPlayerShipAttack() {
      const animation = this.ensurePlayerShipAnimation(SHIPS[state.shipId]);
      if (!animation || animation.deathStartedAt) return;
      animation.attackStartedAt = this.time;
      animation.attackUntil = this.time + PLAYER_SHIP_ATTACK_ANIMATION_SECONDS;
    }

    markPlayerShipHit() {
      this.markPlayerCaptainHit();
    }

    markPlayerShipDeath() {
      const animation = this.ensurePlayerShipAnimation(SHIPS[state.shipId]);
      if (!animation || animation.deathStartedAt) return;
      animation.deathStartedAt = this.time;
      this.markPlayerCaptainHit();
    }

    resetPlayerShipAnimation() {
      if (this.playerShipAnimation) {
        this.playerShipAnimation.attackUntil = 0;
        this.playerShipAnimation.deathStartedAt = 0;
      }
      this.playerCaptainReaction = { state: "idle", until: 0 };
    }

    showRepairEffect(seconds = 1.25) {
      this.repairEffect.startedAt = this.time;
      this.repairEffect.until = Math.max(this.repairEffect.until || 0, this.time + Math.max(.2, Number(seconds) || 1.25));
    }

    hideRepairEffect() {
      this.repairEffect.until = 0;
    }

    updateRepairEffect() {
      if (this.repairEffect.until <= this.time) this.repairEffect.until = 0;
    }

    isRepairEffectActive() {
      return Boolean(state.combat.repairing || this.repairEffect.until > this.time);
    }

    markPlayerCaptainHit() {
      this.playerCaptainReaction = { state: "hit", until: this.time + CAPTAIN_CHARACTER_REACTION_SECONDS.hit };
    }

    celebrateCaptain(seconds = CAPTAIN_CHARACTER_REACTION_SECONDS.celebrate) {
      this.playerCaptainReaction = { state: "celebrate", until: this.time + seconds };
    }

    getPlayerCaptainPose() {
      if (VISUAL_AUDIT_CONFIG?.pose) return VISUAL_AUDIT_CONFIG.pose;
      return this.playerCaptainReaction.until > this.time ? this.playerCaptainReaction.state : "idle";
    }

    queueEnemyDeath(enemy, delay = 0) {
      const animation = ensureEnemySpriteAnimation(enemy);
      if (!animation) return;
      this.enemyDeathAnimations.push({
        age: -delay,
        duration: enemy.isBoss ? BOSS_DEATH_ANIMATION_SECONDS : ENEMY_DEATH_ANIMATION_SECONDS,
        enemy: {
          name: enemy.name,
          kind: enemy.kind,
          category: enemy.category,
          visual: enemy.visual,
          visualKind: enemy.visualKind,
          visualTier: enemy.visualTier,
          isBoss: enemy.isBoss,
          isSurpriseBoss: enemy.isSurpriseBoss,
          defeated: true,
          animation: { ...animation, attackUntil: 0, hitUntil: 0, deathStartedAt: this.time + delay }
        }
      });
      this.enemyDeathAnimations = this.enemyDeathAnimations.slice(-3);
    }

    clearChests(dropType = null) {
      this.chests = dropType ? this.chests.filter(chest => chest.dropType !== dropType) : [];
    }

    hasPendingChest(dropType = null) {
      return this.chests.some(chest => !chest.opened && (!dropType || chest.dropType === dropType));
    }

    getChestScale() {
      return Math.min(1.08, Math.max(.62, Math.min(this.width / 850, this.height / 280)));
    }

    getChestRect(chest, x = null, y = null) {
      const definition = CHEST_DEFINITIONS[chest?.chestId];
      const targetWidth = (definition?.width || 74) * this.getChestScale();
      const targetHeight = targetWidth;
      const centerX = x ?? (chest?.xRatio ?? .52) * this.width;
      const waterlineY = y ?? (chest?.yRatio ?? .66) * this.height;
      return {
        x: centerX - targetWidth * .5,
        y: waterlineY - targetHeight * .72,
        width: targetWidth,
        height: targetHeight * .9
      };
    }

    findChestSpawnPoint(dropType, definition) {
      const w = this.width;
      const h = this.height;
      const horizon = h * .42;
      const compactStage = w < 620 || h < 240;
      const playerX = w * .29;
      const enemyX = w * .71;
      const playerY = h * (compactStage ? .73 : .69);
      const enemyY = h * (compactStage ? .64 : .60);
      const playerScale = Math.min(1.15, w / 950, h / 300);
      const enemyScale = Math.min(1.02, w / 1050, h / 300);
      const chestWidth = (definition?.width || 74) * this.getChestScale();
      const baseX = w * (dropType === "boss" ? .56 : .50);
      const directProgress = clamp((baseX - playerX) / Math.max(1, enemyX - playerX), 0, 1);
      const directY = playerY + (enemyY - playerY) * directProgress;
      const naturalOffset = (dropType === "boss" ? -1 : 1) * (18 + state.regionIndex % 3 * 4);
      const waterTop = horizon + Math.max(58, chestWidth * .72);
      const waterBottom = h - Math.max(14, chestWidth * .22);
      const offsets = dropType === "boss"
        ? [[0, 0], [w * .035, h * .035], [-w * .045, h * .06], [w * .075, h * .07], [-w * .02, -h * .035], [w * .105, -h * .015]]
        : [[0, 0], [-w * .04, h * .04], [w * .035, h * .065], [-w * .075, h * .08], [w * .06, -h * .025], [-w * .02, -h * .045]];
      const protectedBoxes = [
        { x: playerX - 132 * playerScale, y: playerY - 88 * playerScale, width: 264 * playerScale, height: 138 * playerScale },
        { x: enemyX - 142 * enemyScale, y: enemyY - 108 * enemyScale, width: 284 * enemyScale, height: 154 * enemyScale },
        { x: w * .06, y: horizon - 78, width: w * .72, height: 108 }
      ];
      if (getEquippedPet()) {
        const petScale = Math.min(1.1, w / 850, h / 290);
        const desiredWaterline = playerY + Math.max(58, playerScale * (compactStage ? 78 : 92));
        const minimumWaterline = playerY + Math.max(24, playerScale * (compactStage ? 34 : 42));
        const maximumWaterline = h - Math.max(18, petScale * 18);
        const petY = maximumWaterline > minimumWaterline ? clamp(desiredWaterline, minimumWaterline, maximumWaterline) : maximumWaterline;
        protectedBoxes.push({ x: w * .43 - 62 * petScale, y: petY - 56 * petScale, width: 124 * petScale, height: 84 * petScale });
      }
      this.chests.filter(chest => !chest.opened).forEach(chest => protectedBoxes.push(this.getChestRect(chest)));
      const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      const pointFor = (dx, dy) => {
        const x = clamp(baseX + dx, chestWidth * .65, w - chestWidth * .65);
        const y = clamp(directY + naturalOffset + dy, waterTop, waterBottom);
        return { x, y, rect: this.getChestRect({ chestId: definition.id }, x, y) };
      };
      for (const [dx, dy] of offsets) {
        const point = pointFor(dx, dy);
        if (!protectedBoxes.some(box => overlaps(point.rect, box))) return point;
      }
      for (let radius = 18; radius <= 90; radius += 18) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const point = pointFor(Math.cos(angle) * radius, Math.sin(angle) * radius * .7);
          if (!protectedBoxes.some(box => overlaps(point.rect, box))) return point;
        }
      }
      return pointFor(0, h * .1);
    }

    spawnChest(definition, dropType, regionIndex, enemy = null) {
      if (!definition || this.hasPendingChest(dropType)) return false;
      const point = this.findChestSpawnPoint(dropType, definition, enemy);
      this.chests.push({
        chestId: definition.id,
        dropType,
        regionIndex,
        xRatio: point.x / Math.max(1, this.width),
        yRatio: point.y / Math.max(1, this.height),
        age: 0,
        openAge: 0,
        opened: false,
        seed: randomBetween(0, 10),
        hitbox: null
      });
      this.chests = this.chests.slice(-4);
      addLog(dropType === "boss" ? "Você encontrou um baú de Boss!" : "Você encontrou um baú!", "loot");
      toast(dropType === "boss" ? "Você encontrou um baú de Boss!" : "Você encontrou um baú!", "gold-toast");
      return true;
    }

    getPointerScenePosition(pointer) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (pointer.clientX - rect.left) * (this.width / Math.max(1, rect.width)),
        y: (pointer.clientY - rect.top) * (this.height / Math.max(1, rect.height))
      };
    }

    handleCaptainEditorPointerDown(pointer, x, y) {
      if (!isCaptainEditorEnabled() || !this.captainEditorInfo) return false;
      const box = this.captainEditorInfo.dragBox;
      const margin = pointer.pointerType === "touch" ? 22 : 12;
      if (!box || x < box.x - margin || x > box.x + box.width + margin || y < box.y - margin || y > box.y + box.height + margin) return false;
      this.captainEditorDrag = {
        pointerId: pointer.pointerId,
        startX: x,
        startY: y,
        startConfig: { ...this.captainEditorInfo.config },
        targetWidth: Math.max(1, this.captainEditorInfo.targetWidth),
        renderScale: Math.max(.1, this.captainEditorInfo.renderScale)
      };
      if (this.canvas.setPointerCapture) {
        try { this.canvas.setPointerCapture(pointer.pointerId); } catch (error) {}
      }
      if (pointer.cancelable) pointer.preventDefault();
      return true;
    }

    handleCaptainEditorPointerMove(pointer) {
      if (!isCaptainEditorEnabled() || !this.captainEditorDrag || pointer.pointerId !== this.captainEditorDrag.pointerId) return;
      const point = this.getPointerScenePosition(pointer);
      const drag = this.captainEditorDrag;
      const config = setCaptainEditorDraft(state.shipId, {
        offsetX: drag.startConfig.offsetX + (point.x - drag.startX) / drag.targetWidth,
        offsetY: drag.startConfig.offsetY + (point.y - drag.startY) / drag.renderScale
      });
      updateCaptainEditorPanel(this.captainEditorInfo, config);
      if (pointer.cancelable) pointer.preventDefault();
    }

    handleCaptainEditorPointerUp(pointer) {
      if (!isCaptainEditorEnabled() || !this.captainEditorDrag || pointer.pointerId !== this.captainEditorDrag.pointerId) return;
      if (this.canvas.releasePointerCapture) {
        try { this.canvas.releasePointerCapture(pointer.pointerId); } catch (error) {}
      }
      this.captainEditorDrag = null;
      updateCaptainEditorPanel(this.captainEditorInfo);
      if (pointer.cancelable) pointer.preventDefault();
    }

    handleChestPointer(pointer, x, y) {
      const chest = [...this.chests].reverse().find(item => {
        if (item.opened) return false;
        const box = item.hitbox || this.getChestRect(item);
        const margin = pointer.pointerType === "touch" ? 14 : 7;
        return x >= box.x - margin && x <= box.x + box.width + margin && y >= box.y - margin && y <= box.y + box.height + margin;
      });
      if (!chest) return false;
      if (pointer.cancelable) pointer.preventDefault();
      return openTreasureChest(chest);
    }

    getPlayerManualAttackHitbox(pointerType = "mouse") {
      const compactStage = this.width < 620 || this.height < 240;
      const playerX = this.width * .29;
      const playerY = this.height * (compactStage ? .73 : .69);
      const playerScale = Math.min(1.15, this.width / 950, this.height / 300);
      const touchBoost = pointerType === "touch" ? 1.28 : 1;
      const width = clamp(250 * playerScale * touchBoost, 108, this.width * .58);
      const height = clamp(154 * playerScale * touchBoost, 88, this.height * .72);
      return {
        x: clamp(playerX - width * .52, 0, this.width - width),
        y: clamp(playerY - height * .62, 0, this.height - height),
        width,
        height
      };
    }

    handleManualShipPointer(pointer, x, y) {
      const box = this.getPlayerManualAttackHitbox(pointer.pointerType);
      if (x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height) return false;
      if (!manualShipAttack()) return false;
      if (pointer.cancelable) pointer.preventDefault();
      return true;
    }

    floatChestReward(chest, rewards = []) {
      const x = (chest?.xRatio ?? .52) * this.width;
      const y = (chest?.yRatio ?? .66) * this.height - 8;
      const color = rewards[0]?.color || "#ffe268";
      this.bursts.push({ x, y: y - 24, age: 0, color });
      this.aquaticBursts.push({ x, y: y + 4, age: 0, color, kind: "chest" });
      rewards.forEach((reward, index) => {
        this.lootFloaters.push({ text: reward.text, x, y: y + index * 24, age: 0, color: reward.color || color });
      });
    }

    handleEnvironmentPointer(pointer) {
      const { x, y } = this.getPointerScenePosition(pointer);
      if (this.handleCaptainEditorPointerDown(pointer, x, y)) return;
      if (this.handleChestPointer(pointer, x, y)) return;
      const event = [...this.environmentEvents].reverse().find(item => {
        if (item.collected || !item.hitbox) return false;
        const box = item.hitbox;
        const margin = pointer.pointerType === "touch" ? 14 : 7;
        return x >= box.x - margin && x <= box.x + box.width + margin && y >= box.y - margin && y <= box.y + box.height + margin;
      });
      if (event) {
        if (pointer.cancelable) pointer.preventDefault();
        this.collectEnvironmentEvent(event);
        return;
      }
      this.handleManualShipPointer(pointer, x, y);
    }

    collectEnvironmentEvent(event, options = {}) {
      if (!event || event.collected) return false;
      const reward = ENVIRONMENT_LOOT[event.kind];
      if (!reward) return false;
      const automatic = Boolean(options.automatic);
      const alreadyCollected = clamp(Number(event.autoCollectedPercent || 0), 0, 1);
      const targetPercent = automatic ? clamp(Number(options.percent ?? 0), 0, 1) : 1;
      const percent = automatic ? clamp(targetPercent - alreadyCollected, 0, 1 - alreadyCollected) : clamp(targetPercent - alreadyCollected, 0, 1);
      if (percent <= 0) return false;
      const totalCollected = alreadyCollected + percent;
      event.autoCollectedPercent = totalCollected;
      if (!automatic || totalCollected >= .999) {
        event.collected = true;
        event.age = event.duration;
      }
      const burstX = event.screenX ?? this.width * .5;
      const burstY = event.screenY ?? this.height * .5;
      const baseAmount = automatic ? Math.max(1, Math.round(reward.food * percent)) : Math.max(1, reward.food - Math.round(reward.food * alreadyCollected));
      const foodEquivalent = automatic ? Math.max(1, Math.round(baseAmount * (1 + getCaptainBonuses().autoFoodBonus))) : baseAmount;
      const amount = calculateGoldReward(foodEquivalent * FOOD_LOOT_SELL_GOLD_VALUE);
      this.bursts.push({ x: burstX, y: burstY, age: 0, color: reward.color });
      this.lootFloaters.push({ text: `${automatic ? "Auto " : ""}+${formatNumber(amount)} Gold`, x: burstX, y: burstY, age: 0, color: reward.color });
      state.resources.ouro += amount;
      state.lifetime.gold += amount;
      trackAction("gold", { amount });
      if (event.kind === "kraken") trackAction("kraken");
      addLog(`${reward.name} capturado${automatic ? " automaticamente" : ""}: +${formatNumber(amount)} Gold.`, "loot");
      if (!automatic) {
        toast(`+${formatNumber(amount)} Gold - ${reward.name}`, "gold-toast");
        tryTriggerSurpriseBossFromLoot(event.kind);
        commitGame(false);
        return true;
      }
      commitGame(false);
      return true;
    }

    autoCollectEnvironmentEvents() {
      const bonuses = getCaptainBonuses();
      this.environmentEvents.forEach(event => {
        if (event.collected || event.screenX === undefined || event.screenY === undefined) return;
        const percent = event.kind === "bird" ? bonuses.birdAutoCollect : event.kind === "shark" ? bonuses.sharkAutoCollect : 0;
        if (percent > 0) this.collectEnvironmentEvent(event, { automatic: true, percent });
      });
    }

    update(dt) {
      this.time += dt;
      this.petLunge = Math.max(0, this.petLunge - dt * 1.8);
      this.projectiles.forEach(item => item.age += dt);
      this.bursts.forEach(item => item.age += dt);
      this.sabotageEffects.forEach(item => item.age += dt);
      this.aquaticBursts.forEach(item => item.age += dt);
      this.bossSurpriseAlerts.forEach(item => item.age += dt);
      this.floaters.forEach(item => item.age += dt);
      this.lootFloaters.forEach(item => item.age += dt);
      this.chests.forEach(item => {
        item.age += dt;
        if (item.opened) item.openAge += dt;
      });
      this.enemyDeathAnimations.forEach(item => item.age += dt);
      this.environmentEvents.forEach(item => item.age += dt);
      this.updateRepairEffect();
      this.autoCollectEnvironmentEvents();
      this.projectiles = this.projectiles.filter(item => item.age < item.duration);
      this.bursts = this.bursts.filter(item => item.age < .75);
      this.sabotageEffects = this.sabotageEffects.filter(item => item.age < .85);
      this.aquaticBursts = this.aquaticBursts.filter(item => item.age < .9);
      this.bossSurpriseAlerts = this.bossSurpriseAlerts.filter(item => item.age < item.duration);
      this.floaters = this.floaters.filter(item => item.age < 1.05);
      this.lootFloaters = this.lootFloaters.filter(item => item.age < 1.35);
      this.chests = this.chests.filter(item => !item.opened || item.openAge < CHEST_OPEN_DURATION);
      this.enemyDeathAnimations = this.enemyDeathAnimations.filter(item => item.age < item.duration);
      this.environmentEvents = this.environmentEvents.filter(item => item.age < item.duration);
      Object.keys(this.environmentTimers).forEach(kind => {
        this.environmentTimers[kind] -= dt;
        if (this.environmentTimers[kind] <= 0) {
          this.spawnEnvironmentEvent(kind);
          this.environmentTimers[kind] = kind === "bird" ? randomBetween(7, 13) : kind === "fish" ? randomBetween(5, 10) : kind === "shark" ? randomBetween(28, 52) : randomBetween(90, 160);
        }
      });
    }

    spawnEnvironmentEvent(kind) {
      const direction = Math.random() < .5 ? 1 : -1;
      const durations = { bird: randomBetween(8, 13), fish: randomBetween(4, 7), shark: randomBetween(7, 10), kraken: randomBetween(6, 9) };
      if (kind === "kraken") trackAction("kraken");
      this.environmentEvents.push({
        kind, direction, age: 0, duration: durations[kind],
        depth: kind === "bird" ? randomBetween(.18, .72) : kind === "kraken" ? randomBetween(.06, .14) : kind === "shark" ? randomBetween(.78, .9) : randomBetween(.52, .88),
        offset: Math.random(), scale: randomBetween(.75, 1.25), side: Math.random() < .5 ? .1 : .9
      });
    }

    getDayState(region = REGIONS[state.regionIndex]) {
      if (region?.dayNightCycle === false) {
        return { cycle: 0, label: "", sky: region.sky, water: region.sea, darkness: 0, fixed: true };
      }
      const cycle = ((Date.now() / 1000) % 480) / 480;
      const phases = [
        { t: 0, label: "Manhã", sky: "#9ac9df", water: "#3b8ca4", darkness: 0 },
        { t: .18, label: "Meio-dia", sky: "#4daee2", water: "#267f9b", darkness: 0 },
        { t: .38, label: "Pôr do sol", sky: "#da796d", water: "#665c70", darkness: .12 },
        { t: .55, label: "Noite", sky: "#172b4c", water: "#112f49", darkness: .62 },
        { t: .72, label: "Madrugada", sky: "#101c39", water: "#0b2940", darkness: .7 },
        { t: .87, label: "Amanhecer", sky: "#bd8c9b", water: "#526e87", darkness: .25 },
        { t: 1, label: "Manhã", sky: "#9ac9df", water: "#3b8ca4", darkness: 0 }
      ];
      let start = phases[0], end = phases[1];
      for (let i = 0; i < phases.length - 1; i++) if (cycle >= phases[i].t && cycle <= phases[i + 1].t) { start = phases[i]; end = phases[i + 1]; break; }
      const progress = (cycle - start.t) / Math.max(.001, end.t - start.t);
      return { cycle, label: start.label, sky: this.mix(start.sky, end.sky, progress), water: this.mix(start.water, end.water, progress), darkness: start.darkness + (end.darkness - start.darkness) * progress };
    }

    drawChestFallback(ctx, targetWidth, frame, definition) {
      const open = frame === 2;
      const glow = frame === 1;
      const rarityColor = RARITY_COLORS[definition.rarityKey] || "#ffd37a";
      ctx.save();
      ctx.translate(0, -targetWidth * .28);
      ctx.fillStyle = open ? "#6c3e21" : "#8a5128";
      ctx.strokeStyle = "#2b1a12";
      ctx.lineWidth = Math.max(2, targetWidth * .035);
      ctx.beginPath();
      ctx.roundRect(-targetWidth * .34, -targetWidth * .12, targetWidth * .68, targetWidth * .34, targetWidth * .045);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = open ? "#2b1a12" : rarityColor;
      ctx.beginPath();
      ctx.roundRect(-targetWidth * .39, -targetWidth * .27, targetWidth * .78, targetWidth * .23, targetWidth * .09);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = glow ? "#fff1ba" : "#edc36f";
      ctx.fillRect(-targetWidth * .045, -targetWidth * .22, targetWidth * .09, targetWidth * .43);
      if (open) {
        ctx.globalAlpha = .7;
        ctx.fillStyle = rarityColor;
        ctx.beginPath();
        ctx.arc(0, -targetWidth * .17, targetWidth * .16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawChest(ctx, chest) {
      const definition = CHEST_DEFINITIONS[chest.chestId];
      if (!definition) return;
      const sprite = getChestSprite(definition.id);
      const image = requestChestSprite(sprite);
      const loaded = image?.complete && image.naturalWidth;
      const x = clamp((chest.xRatio ?? .52) * this.width, 24, this.width - 24);
      const baseY = clamp((chest.yRatio ?? .66) * this.height, this.height * .42 + 34, this.height - 12);
      const bob = Math.sin(this.time * 2.25 + chest.seed) * 3.2;
      const y = baseY + bob;
      const targetWidth = definition.width * this.getChestScale();
      const targetHeight = targetWidth;
      const frame = chest.opened ? 2 : Math.floor((this.time + chest.seed) / .42) % 2;
      const openPulse = chest.opened ? Math.sin(clamp(chest.openAge / .28, 0, 1) * Math.PI) * .08 : 0;
      const fade = chest.opened && chest.openAge > .56 ? clamp(1 - (chest.openAge - .56) / Math.max(.01, CHEST_OPEN_DURATION - .56), 0, 1) : 1;
      chest.hitbox = this.getChestRect(chest, x, y);
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = fade;
      ctx.fillStyle = "rgba(3,18,28,.24)";
      ctx.beginPath();
      ctx.ellipse(0, targetWidth * .09, targetWidth * .42, targetWidth * .105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(223,255,247,.58)";
      ctx.lineWidth = Math.max(1.2, targetWidth * .022);
      for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = fade * (.46 - i * .16);
        ctx.beginPath();
        ctx.ellipse(0, targetWidth * (.08 + i * .035), targetWidth * (.35 + i * .13), targetWidth * (.045 + i * .015), 0, Math.PI * .04, Math.PI * .96);
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      ctx.scale(1 + openPulse, 1 + openPulse);
      ctx.shadowColor = RARITY_COLORS[definition.rarityKey] || "#ffd37a";
      ctx.shadowBlur = chest.opened ? 16 : frame === 1 ? 10 : 4;
      if (loaded) {
        const source = sprite.canvas || image;
        const sourceWidth = source.width || image.naturalWidth;
        const sourceHeight = source.height || image.naturalHeight;
        const frameWidth = Math.floor(sourceWidth / 3);
        const frameHeight = sourceHeight;
        const frameScale = targetWidth / frameWidth;
        measureChestSpriteFrameBounds(sprite, source);
        const frameBounds = sprite.frameBounds?.[frame];
        const referenceBounds = sprite.referenceBounds;
        const anchorOffsetX = frameBounds && referenceBounds ? (referenceBounds.centerX - frameBounds.centerX) * frameScale : 0;
        const anchorOffsetY = frameBounds && referenceBounds ? (referenceBounds.bottomY - frameBounds.bottomY) * frameScale : 0;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, frame * frameWidth, 0, frameWidth, frameHeight, -targetWidth * .5 + anchorOffsetX, -targetHeight * .72 + anchorOffsetY, targetWidth, targetHeight);
      } else {
        this.drawChestFallback(ctx, targetWidth, frame, definition);
      }
      ctx.restore();
    }

    drawChests(ctx) {
      this.chests.forEach(chest => this.drawChest(ctx, chest));
    }

    draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const region = getActiveCombatRegion();
      const horizon = h * .42;
      const day = this.getDayState(region);
      if (isCaptainEditorEnabled()) this.captainEditorInfo = null;
      ctx.clearRect(0, 0, w, h);

      if (this.drawFixedBackground(ctx, w, h, region)) {
        this.drawEnvironmentEvents(ctx, horizon, w, h);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, this.mix(region.sky, day.darkness > .4 ? "#08162d" : "#d9ecf1", .28 + day.darkness * .35));
        sky.addColorStop(.58, day.sky);
        sky.addColorStop(1, this.mix(region.sky, day.darkness > .4 ? "#263352" : "#f5d9ad", .38));
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon + 2);

        if (day.darkness > .3) this.drawStars(ctx, w, horizon, day.darkness);
        const celestialNight = day.cycle >= .5 && day.cycle < .92;
        const celestialProgress = celestialNight ? (day.cycle - .5) / .42 : day.cycle < .5 ? day.cycle / .5 : (day.cycle - .92) / .08;
        const sunX = w * (.08 + clamp(celestialProgress, 0, 1) * .84);
        const celestialY = horizon * (.7 - Math.sin(clamp(celestialProgress, 0, 1) * Math.PI) * .5);
        const sunRadius = Math.min(w, h) * (celestialNight ? .035 : .055);
        const sunGlow = ctx.createRadialGradient(sunX, celestialY, 2, sunX, celestialY, sunRadius * 2.4);
        sunGlow.addColorStop(0, celestialNight ? "rgba(225,240,244,.88)" : "rgba(255,245,190,.9)");
        sunGlow.addColorStop(.28, celestialNight ? "rgba(192,218,230,.15)" : "rgba(255,211,114,.18)");
        sunGlow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sunGlow; ctx.fillRect(sunX - sunRadius * 2.5, celestialY - sunRadius * 2.5, sunRadius * 5, sunRadius * 5);
        if (celestialNight) { ctx.fillStyle = "rgba(230,242,242,.8)"; ctx.beginPath(); ctx.arc(sunX, celestialY, sunRadius * .55, 0, Math.PI * 2); ctx.fill(); }

        this.drawCloud(ctx, ((w * .06 + this.time * 2.4) % (w + 180)) - 90, h * .16, 1.18, day.darkness);
        this.drawCloud(ctx, ((w * .51 + this.time * 1.5) % (w + 160)) - 80, h * .095, .78, day.darkness);
        this.drawCloud(ctx, ((w * .82 + this.time * 1.1) % (w + 140)) - 70, h * .22, .56, day.darkness);

        const sea = ctx.createLinearGradient(0, horizon, 0, h);
        sea.addColorStop(0, day.water);
        sea.addColorStop(.3, this.mix(region.sea, day.darkness > .4 ? "#102c46" : "#6fbac1", .22));
        sea.addColorStop(1, this.mix(region.sea, "#02101c", .52 + day.darkness * .18));
        ctx.fillStyle = sea;
        ctx.fillRect(0, horizon, w, h - horizon);
        this.drawOceanTexture(ctx, horizon, w, h, day.darkness);
        if (!celestialNight && day.cycle < .58) this.drawSunPath(ctx, sunX, horizon, h);
        this.drawWaves(ctx, horizon, w, h);
        this.drawEnvironmentEvents(ctx, horizon, w, h);

        if (!this.drawRegionIslandSprite(ctx, w, h, horizon, state.regionIndex)) {
          this.drawIsland(ctx, w * .27, horizon + 16, w * .46, region.land, 1.12, 0);
        }

        if (state.regionIndex === 2) this.drawRain(ctx, w, h);
        if (state.regionIndex === 8) this.drawSnow(ctx, w, h);
        if (state.regionIndex === 5) this.drawFog(ctx, w, h);
      }

      const bobPlayer = Math.sin(this.time * 1.55) * 3;
      const compactStage = w < 620 || h < 240;
      const playerY = h * (compactStage ? .73 : .69);
      const enemyY = h * (compactStage ? .64 : .60);
      const playerScale = Math.min(1.15, w / 950, h / 300);
      const enemyScale = Math.min(1.02, w / 1050, h / 300);
      this.drawPlayerShip(ctx, w * .29, playerY + bobPlayer, playerScale, SHIPS[state.shipId]);
      const pet = getEquippedPet();
      if (pet) {
        const attackAdvance = Math.sin(this.petLunge * Math.PI) * w * .12;
        const petScale = Math.min(1.1, w / 850, h / 290);
        const desiredWaterline = playerY + Math.max(58, playerScale * (compactStage ? 78 : 92));
        const minimumWaterline = playerY + Math.max(24, playerScale * (compactStage ? 34 : 42));
        const maximumWaterline = h - Math.max(18, petScale * 18);
        const petWaterlineY = maximumWaterline > minimumWaterline ? clamp(desiredWaterline, minimumWaterline, maximumWaterline) : maximumWaterline;
        this.drawPet(ctx, w * .43 + attackAdvance, petWaterlineY, pet, petScale);
      }
      if (!isArenaSceneActive()) this.drawChests(ctx);
      this.enemyDeathAnimations.forEach(item => {
        if (item.age < 0) return;
        this.drawEnemy(ctx, w * .71, enemyY, enemyScale, item.enemy);
      });
      const enemy = state.combat.enemy;
      if (enemy) this.drawEnemy(ctx, w * .71, enemyY, enemyScale, enemy);

      this.projectiles.forEach(item => {
        const t = item.age / item.duration;
        const x = item.start.x + (item.end.x - item.start.x) * t;
        const y = item.start.y + (item.end.y - item.start.y) * t - Math.sin(t * Math.PI) * h * .10;
        ctx.strokeStyle = "rgba(255,238,195,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const prevT = Math.max(0, t - .1);
        ctx.moveTo(item.start.x + (item.end.x - item.start.x) * prevT, item.start.y + (item.end.y - item.start.y) * prevT - Math.sin(prevT * Math.PI) * h * .10);
        ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = item.color; ctx.shadowColor = item.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      });

      this.sabotageEffects.forEach(item => {
        const t = item.age / .85;
        const pulse = Math.sin(t * Math.PI);
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.globalAlpha = 1 - t;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 18 * pulse;
        const radius = 18 + pulse * 42;
        const sabotageGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
        sabotageGlow.addColorStop(0, `${item.color}99`);
        sabotageGlow.addColorStop(.48, "rgba(18,12,36,.58)");
        sabotageGlow.addColorStop(1, "rgba(18,12,36,0)");
        ctx.fillStyle = sabotageGlow;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.4 + pulse * 2;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          const offset = (i - 1) * 10;
          ctx.beginPath();
          ctx.moveTo(-34 - pulse * 16, -20 + offset);
          ctx.lineTo(32 + pulse * 18, 18 + offset);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,241,199,.86)";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 4, 36 + pulse * 22, 10 + pulse * 6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });

      this.bursts.forEach(item => {
        const t = item.age / .75;
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 9; i++) {
          const angle = i * .7 + this.time;
          const radius = t * 38;
          ctx.fillStyle = i % 2 ? item.color : "#fff2bd";
          ctx.beginPath(); ctx.arc(item.x + Math.cos(angle) * radius, item.y + Math.sin(angle) * radius, (1 - t) * 7 + 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      this.aquaticBursts.forEach(item => {
        const t = item.age / .9;
        ctx.save(); ctx.globalAlpha = 1 - t; ctx.strokeStyle = item.color; ctx.fillStyle = "rgba(216,252,255,.76)"; ctx.lineWidth = 2.5;
        for (let i = 0; i < (item.kind === "kraken" ? 14 : 8); i++) {
          const angle = -Math.PI + i / 7 * Math.PI;
          const distance = 10 + t * (item.kind === "kraken" ? 72 : 44);
          ctx.beginPath(); ctx.arc(item.x + Math.cos(angle) * distance, item.y - Math.abs(Math.sin(angle)) * distance * .7 + t * 13, Math.max(1, (1 - t) * (i % 3 + 3)), 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.ellipse(item.x, item.y + 7, 16 + t * 58, 5 + t * 12, 0, Math.PI, Math.PI * 2); ctx.stroke();
        if (item.kind === "kraken") { ctx.lineWidth = 8 * (1 - t) + 2; ctx.beginPath(); ctx.moveTo(item.x - 35, item.y + 30); ctx.quadraticCurveTo(item.x - 10, item.y - 90 * Math.sin(t * Math.PI), item.x + 22, item.y - 8); ctx.stroke(); }
        ctx.restore();
      });

      this.floaters.forEach(item => {
        ctx.globalAlpha = 1 - item.age / 1.05;
        ctx.fillStyle = item.color;
        ctx.font = `800 ${14 + item.age * 4}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 4;
        ctx.fillText(`-${formatNumber(item.text)}`, item.x, item.y - item.age * 32);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      });

      this.lootFloaters.forEach(item => {
        ctx.globalAlpha = 1 - item.age / 1.35;
        ctx.fillStyle = item.color;
        ctx.font = `900 ${15 + item.age * 3}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 7;
        ctx.fillText(item.text, item.x, item.y - 18 - item.age * 34);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      });
      this.drawCaptainEditorOverlay(ctx);
      this.drawBossSurpriseAlerts(ctx, w, h);
    }

    drawCaptainEditorOverlay(ctx) {
      if (!isCaptainEditorEnabled() || !this.captainEditorInfo) return;
      const info = this.captainEditorInfo;
      const box = info.dragBox;
      const foot = info.foot;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "rgba(111,239,226,.92)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,210,111,.95)";
      ctx.beginPath();
      ctx.moveTo(foot.x - 8, foot.y);
      ctx.lineTo(foot.x + 8, foot.y);
      ctx.moveTo(foot.x, foot.y - 8);
      ctx.lineTo(foot.x, foot.y + 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(5,18,25,.82)";
      ctx.strokeStyle = "rgba(111,239,226,.38)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(Math.max(8, box.x), Math.max(8, box.y - 24), 92, 19, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#dffefa";
      ctx.font = "900 10px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ARRASTE", Math.max(8, box.x) + 46, Math.max(8, box.y - 24) + 9.5);
      ctx.restore();
    }

    drawBossSurpriseAlerts(ctx, w, h) {
      this.bossSurpriseAlerts.forEach(item => {
        const t = clamp(item.age / item.duration, 0, 1);
        const pulse = Math.sin(t * Math.PI);
        ctx.save();
        ctx.globalAlpha = (1 - t) * .55;
        ctx.fillStyle = "#9a1f26";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#ffca6a";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 10]);
        ctx.strokeRect(18 + pulse * 8, 18 + pulse * 8, w - 36 - pulse * 16, h - 36 - pulse * 16);
        ctx.setLineDash([]);
        ctx.shadowColor = "#ff5a4e";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#fff2c4";
        ctx.font = `900 ${Math.max(18, Math.min(32, w * .036))}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.min(1, pulse * 1.25);
        ctx.fillText(BOSS_SURPRISE_MESSAGE, w * .5, h * .36);
        ctx.restore();
      });
    }

    mix(a, b, amount) {
      const parse = hex => hex.match(/\w\w/g).map(v => parseInt(v, 16));
      const ca = parse(a), cb = parse(b);
      return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * amount)).join(",")})`;
    }

    drawFixedBackground(ctx, w, h, region) {
      if (!region?.fixedBackground) return false;
      const sprite = getFixedBackgroundSprite(region);
      const image = sprite?.image;
      if (!image?.complete || !image.naturalWidth) {
        ctx.fillStyle = region.sea || "#126f88";
        ctx.fillRect(0, 0, w, h);
        return true;
      }
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = w / Math.max(1, h);
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;
      if (canvasRatio < imageRatio) {
        sourceWidth = image.naturalHeight * canvasRatio;
        sourceX = clamp(image.naturalWidth * .5 - sourceWidth * .5, 0, image.naturalWidth - sourceWidth);
      } else if (canvasRatio > imageRatio) {
        sourceHeight = image.naturalWidth / canvasRatio;
        sourceY = clamp(image.naturalHeight * .5 - sourceHeight * .5, 0, image.naturalHeight - sourceHeight);
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, w, h);
      ctx.restore();
      return true;
    }

    drawOceanTexture(ctx, horizon, w, h, darkness = 0) {
      return false;
    }

    drawRegionIslandSprite(ctx, w, h, horizon, regionIndex) {
      return false;
    }

    drawCloud(ctx, x, y, scale, darkness = 0) {
      ctx.save();
      ctx.globalAlpha = .22 + darkness * .08;
      const cloud = ctx.createLinearGradient(0, y - 35 * scale, 0, y + 24 * scale);
      cloud.addColorStop(0, darkness > .4 ? "rgba(115,134,157,.62)" : "rgba(255,255,255,.95)");
      cloud.addColorStop(1, darkness > .4 ? "rgba(36,53,78,.45)" : "rgba(188,211,215,.42)");
      ctx.fillStyle = cloud;
      ctx.shadowColor = "rgba(255,255,255,.16)"; ctx.shadowBlur = 18 * scale;
      [[0, 8, 25], [24, -1, 31], [52, 5, 27], [76, 12, 18]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(x + dx * scale, y + dy * scale, r * 1.24 * scale, r * .72 * scale, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    drawSunPath(ctx, sunX, horizon, h) {
      ctx.strokeStyle = "rgba(255,245,208,.12)"; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const depth = i / 6;
        const y = horizon + Math.pow(depth, 1.45) * (h - horizon) * .68;
        const half = 3 + depth * 23;
        ctx.beginPath(); ctx.moveTo(sunX - half + Math.sin(i + this.time) * 4, y); ctx.lineTo(sunX + half, y); ctx.stroke();
      }
    }

    drawStars(ctx, w, horizon, darkness) {
      ctx.save(); ctx.globalAlpha = clamp((darkness - .25) * 1.55, 0, .72);
      for (let i = 0; i < 52; i++) {
        const x = (i * 137.7) % w;
        const y = 8 + (i * 67.3) % Math.max(20, horizon * .74);
        const glow = .45 + Math.sin(this.time * .65 + i) * .25;
        ctx.fillStyle = `rgba(232,245,249,${glow})`;
        ctx.beginPath(); ctx.arc(x, y, .5 + (i % 4 === 0 ? .9 : .2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    drawEnvironmentEvents(ctx, horizon, w, h) {
      const waterHeight = h - horizon;
      this.environmentEvents.forEach(event => {
        const progress = clamp(event.age / event.duration, 0, 1);
        const fade = Math.min(1, event.age * 1.5, (event.duration - event.age) * 1.5);
        const travel = event.direction > 0 ? progress : 1 - progress;
        if (event.kind === "bird") {
          const x = -w * .08 + travel * w * 1.16;
          const y = horizon * event.depth + Math.sin(event.age * 2.1 + event.offset * 5) * 6;
          event.screenX = x - event.direction * 18;
          event.screenY = y + 3;
          event.hitbox = { x: event.screenX - 43 * event.scale, y: event.screenY - 18 * event.scale, width: 86 * event.scale, height: 36 * event.scale };
          ctx.save(); ctx.globalAlpha = fade * .62; ctx.strokeStyle = "#203b48"; ctx.lineWidth = 1.25 * event.scale;
          for (let i = 0; i < 4; i++) { const bx = x - i * event.direction * 14; const by = y + (i % 2) * 6; const size = (4 - i * .35) * event.scale; const flap = Math.sin(event.age * 6 + i) * 2; ctx.beginPath(); ctx.moveTo(bx - size, by); ctx.quadraticCurveTo(bx, by - size - flap, bx + size, by); ctx.quadraticCurveTo(bx + size * 1.7, by - size + flap, bx + size * 2.5, by); ctx.stroke(); }
          ctx.restore();
          return;
        }
        if (event.kind === "kraken") {
          const x = w * event.side;
          const baseY = horizon + waterHeight * event.depth;
          const rise = Math.sin(progress * Math.PI) * 38 * event.scale;
          event.screenX = x;
          event.screenY = baseY - rise * .48;
          event.hitbox = { x: x - 58 * event.scale, y: baseY - Math.max(46 * event.scale, rise + 18 * event.scale), width: 116 * event.scale, height: Math.max(62 * event.scale, rise + 38 * event.scale) };
          ctx.save(); ctx.globalAlpha = fade * .34; ctx.strokeStyle = "#25213e"; ctx.lineCap = "round";
          for (let i = 0; i < 4; i++) { ctx.lineWidth = (7 + i * 1.4) * event.scale; const tx = x + (i - 1.5) * 18; ctx.beginPath(); ctx.moveTo(tx, baseY + 18); ctx.bezierCurveTo(tx - 9, baseY - rise * .35, tx + Math.sin(event.age * 1.8 + i) * 17, baseY - rise * .72, tx + (i - 1.5) * 4, baseY - rise); ctx.stroke(); }
          ctx.lineCap = "butt"; ctx.restore();
          return;
        }

        let x = -w * .1 + travel * w * 1.2;
        let y = horizon + waterHeight * event.depth + Math.sin(event.age * 2.4 + event.offset * 6) * 5;
        const normalizedX = x / w;
        if ((normalizedX > .17 && normalizedX < .41) || (normalizedX > .61 && normalizedX < .82)) y += 24;
        event.screenX = x - event.direction * (event.kind === "fish" ? 24 : 0);
        event.screenY = y;
        event.hitbox = event.kind === "fish"
          ? { x: event.screenX - 58 * event.scale, y: y - 22 * event.scale, width: 116 * event.scale, height: 44 * event.scale }
          : { x: x - 48 * event.scale, y: y - 29 * event.scale, width: 96 * event.scale, height: 58 * event.scale };
        ctx.save(); ctx.globalAlpha = fade * (event.kind === "shark" ? .32 : .22); ctx.fillStyle = event.kind === "shark" ? "#092b3d" : "#0c4860";
        ctx.translate(x, y); ctx.scale(event.direction * event.scale, event.scale);
        if (event.kind === "fish") {
          for (let i = 0; i < 4; i++) { const fx = -i * 19; const fy = (i % 2) * 10; ctx.beginPath(); ctx.ellipse(fx, fy, 9, 3.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx - 14, fy - 5); ctx.lineTo(fx - 14, fy + 5); ctx.closePath(); ctx.fill(); }
        } else {
          ctx.beginPath(); ctx.moveTo(-28, 3); ctx.quadraticCurveTo(0, -8, 28, 2); ctx.quadraticCurveTo(0, 11, -28, 3); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(8, -20); ctx.lineTo(15, -2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-27, 3); ctx.lineTo(-38, -7); ctx.lineTo(-36, 12); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      });
    }

    drawIsland(ctx, x, y, width, color, heightScale, seed = 0) {
      ctx.save();
      const baseY = y + 4;
      ctx.fillStyle = "rgba(231,231,195,.62)";
      ctx.beginPath(); ctx.ellipse(x + width * .5, baseY + 6, width * .53, 10 * heightScale, 0, 0, Math.PI * 2); ctx.fill();
      const rock = ctx.createLinearGradient(0, y - 68 * heightScale, 0, y + 12);
      rock.addColorStop(0, this.mix(color, "#d2d5bd", .22));
      rock.addColorStop(.48, this.mix(color, "#52605b", .48));
      rock.addColorStop(1, "#253b3d");
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(x + width * .04, baseY);
      ctx.lineTo(x + width * .15, y - 19 * heightScale);
      ctx.lineTo(x + width * .29, y - (38 + seed * 4) * heightScale);
      ctx.lineTo(x + width * .42, y - 27 * heightScale);
      ctx.lineTo(x + width * .58, y - (61 - seed * 6) * heightScale);
      ctx.lineTo(x + width * .72, y - 34 * heightScale);
      ctx.lineTo(x + width * .88, y - 14 * heightScale);
      ctx.lineTo(x + width * .98, baseY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(230,237,218,.16)"; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { const rx = x + width * (i * .16); ctx.beginPath(); ctx.moveTo(rx, baseY - 3); ctx.lineTo(rx + width * .04, y - (14 + (i % 3) * 12) * heightScale); ctx.stroke(); }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x + width * .49, y - 18 * heightScale, width * .32, 13 * heightScale, -.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.mix(color, "#b6d866", .24);
      ctx.beginPath(); ctx.ellipse(x + width * .47, y - 25 * heightScale, width * .23, 8 * heightScale, -.08, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < Math.max(2, Math.round(width / 70)); i++) {
        const px = x + width * (.27 + i * .16);
        const py = y - (25 + (i % 2) * 8) * heightScale;
        this.drawPalm(ctx, px, py, (.55 + heightScale * .24) * (seed === 2 ? .65 : 1));
      }
      ctx.strokeStyle = "rgba(235,249,240,.68)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x + width * .5, baseY + 8, width * .52, 8, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }

    drawPalm(ctx, x, y, scale) {
      ctx.strokeStyle = "#4b3426"; ctx.lineWidth = 3 * scale; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y + 8 * scale); ctx.quadraticCurveTo(x - 2 * scale, y - 10 * scale, x + 3 * scale, y - 25 * scale); ctx.stroke();
      ctx.strokeStyle = "#2f703d"; ctx.lineWidth = 3.2 * scale;
      for (let i = 0; i < 6; i++) { const angle = -Math.PI + i * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x + 3 * scale, y - 25 * scale); ctx.quadraticCurveTo(x + Math.cos(angle) * 11 * scale, y - 30 * scale + Math.sin(angle) * 4, x + Math.cos(angle) * 20 * scale, y - 22 * scale + Math.sin(angle) * 8); ctx.stroke(); }
      ctx.lineCap = "butt";
    }

    drawWaves(ctx, horizon, w, h) {
      for (let row = 0; row < 18; row++) {
        const depth = row / 17;
        const y = horizon + Math.pow(depth, 1.5) * (h - horizon);
        const gap = 20 + depth * 92;
        ctx.lineWidth = .7 + depth * 1.25;
        ctx.strokeStyle = `rgba(211,248,242,${.1 + depth * .14})`;
        for (let x = -gap; x < w + gap; x += gap) {
          const move = (this.time * (7 + depth * 17) + row * 13) % gap;
          const wobble = Math.sin(x * .017 + this.time * (1 + depth)) * (1.2 + depth * 2.8);
          ctx.beginPath(); ctx.moveTo(x + move, y + wobble); ctx.bezierCurveTo(x + move + gap * .14, y - 2 - depth * 5, x + move + gap * .31, y - 2 - depth * 4, x + move + gap * .52, y + wobble); ctx.stroke();
        }
      }
      ctx.globalAlpha = .12;
      for (let i = 0; i < 34; i++) { const x = (i * 137 + this.time * 15) % w; const y = horizon + ((i * 83) % Math.max(1, h - horizon)); const r = 2 + (y - horizon) / Math.max(1, h - horizon) * 9; ctx.fillStyle = "#d8fff7"; ctx.beginPath(); ctx.ellipse(x, y, r * 2.4, r * .25, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    drawPetWaterSplash(ctx, x, y, width = 44, pet = {}, baseScale = 1, lift = 0) {
      const scale = Math.max(.65, baseScale);
      const pulse = 1 + Math.sin(this.time * 3.2 + (pet.id || 0)) * .08;
      const height = Math.max(4, width * .12);
      ctx.save();
      ctx.translate(x, y);
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.strokeStyle = "rgba(224,255,250,.74)";
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = .5 - i * .12;
        ctx.beginPath();
        ctx.ellipse(0, i * 2, width * (.52 + i * .16) * pulse, height * (.45 + i * .14), 0, Math.PI * .04, Math.PI * .96);
        ctx.stroke();
      }
      ctx.fillStyle = pet.color || "#d8fffb";
      for (let i = 0; i < 7; i++) {
        const angle = -Math.PI + i * Math.PI / 6;
        const distance = width * (.18 + (i % 3) * .045) * pulse;
        const drop = Math.max(1.2, width * (.018 + (i % 2) * .008));
        ctx.globalAlpha = .18 + Math.max(0, lift) * .16 + (i % 2) * .08;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * distance, -Math.abs(Math.sin(angle)) * height * (1.6 + lift) + Math.sin(this.time * 4 + i) * 1.5, drop, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawPet(ctx, x, y, pet, baseScale = 1) {
      if (this.drawPetSprite(ctx, x, y, pet, baseScale)) return;
      const size = [0.48, 0.55, 0.68, 0.7, 0.82, 0.9, 1, 1.18, 1.38, 1.55][pet.id] * baseScale;
      const jump = pet.visual === "dolphin" || pet.visual === "seal" ? Math.max(0, Math.sin(this.time * 1.25 + pet.id)) * 15 : 0;
      const bodyY = y - 14 * size;
      ctx.save(); ctx.translate(x, bodyY - jump); ctx.scale(size, size);
      if (pet.visual === "kraken") {
        ctx.strokeStyle = "#713b91"; ctx.lineCap = "round";
        for (let i = 0; i < 5; i++) { ctx.lineWidth = 8 - i * .45; ctx.beginPath(); ctx.moveTo(-28 + i * 14, 18); ctx.bezierCurveTo(-42 + i * 18, -3, -25 + i * 13 + Math.sin(this.time * 1.4 + i) * 8, -35 - i * 3, -12 + i * 8, -48); ctx.stroke(); }
        ctx.fillStyle = "#432653"; ctx.beginPath(); ctx.ellipse(0, 4, 27, 20, 0, Math.PI, Math.PI * 2); ctx.fill();
      } else if (pet.visual === "jelly") {
        ctx.fillStyle = "rgba(124,220,255,.72)"; ctx.beginPath(); ctx.arc(0, -5, 22, Math.PI, 0); ctx.quadraticCurveTo(17, 15, 0, 12); ctx.quadraticCurveTo(-17, 15, -22, -5); ctx.fill();
        ctx.strokeStyle = "#7ce8ff"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 9); ctx.quadraticCurveTo(i * 9 + Math.sin(this.time * 2 + i) * 4, 24, i * 6, 34); ctx.stroke(); }
      } else if (pet.visual === "turtle") {
        ctx.fillStyle = "#4e8e5e"; ctx.beginPath(); ctx.ellipse(0, 0, 27, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#a5d278"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#78b779"; ctx.beginPath(); ctx.arc(29, 0, 9, 0, Math.PI * 2); ctx.fill(); for (const [lx,ly] of [[-15,-14],[-15,14],[14,-14],[14,14]]) { ctx.beginPath(); ctx.ellipse(lx,ly,11,5,ly > 0 ? .45 : -.45,0,Math.PI*2); ctx.fill(); }
      } else if (pet.visual === "ray") {
        ctx.fillStyle = "#287fa2"; ctx.beginPath(); ctx.moveTo(-38, 0); ctx.quadraticCurveTo(0, -27, 38, 0); ctx.quadraticCurveTo(0, 25, -38, 0); ctx.fill(); ctx.strokeStyle="#64eaff"; ctx.beginPath(); ctx.moveTo(34,1); ctx.quadraticCurveTo(55,7,64,18); ctx.stroke();
      } else {
        const blackWhite = pet.visual === "orca";
        ctx.fillStyle = blackWhite ? "#15232c" : pet.visual === "fish" ? "#f37c31" : pet.visual === "seal" ? "#9db7bd" : pet.visual === "dolphin" ? "#3989ae" : pet.visual === "megalodon" ? "#354f5b" : "#536f7a";
        ctx.beginPath(); ctx.moveTo(-35, 1); ctx.quadraticCurveTo(-5, -20, 34, -4); ctx.quadraticCurveTo(12, 18, -34, 10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-32, 5); ctx.lineTo(-52, -10); ctx.lineTo(-49, 18); ctx.closePath(); ctx.fill();
        if (["shark","megalodon","orca","dolphin"].includes(pet.visual)) { ctx.beginPath(); ctx.moveTo(-2,-13); ctx.lineTo(11,-35); ctx.lineTo(18,-10); ctx.fill(); }
        if (blackWhite) { ctx.fillStyle="#eef5f2"; ctx.beginPath(); ctx.ellipse(9,5,17,7,-.2,0,Math.PI*2); ctx.fill(); }
        if (pet.visual === "fish") { ctx.fillStyle="#fff1cf"; ctx.fillRect(-8,-13,7,27); ctx.fillRect(9,-10,6,21); }
        ctx.fillStyle="#07131a"; ctx.beginPath(); ctx.arc(24,-5,2.3,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    getSpriteHpState(currentHp, maxHp, defeated = false) {
      const hp = Math.max(0, Number(currentHp) || 0);
      if (defeated || hp <= 0) return SPRITE_HP_STATES.defeated;
      const ratio = hp / Math.max(1, Number(maxHp) || hp || 1);
      return ratio <= .5 ? SPRITE_HP_STATES.damaged : SPRITE_HP_STATES.normal;
    }

    getPlayerShipHpState(currentHp, maxHp, defeated = false) {
      const hp = Math.max(0, Number(currentHp) || 0);
      if (defeated || hp <= 0) return SPRITE_HP_STATES.defeated;
      const ratio = hp / Math.max(1, Number(maxHp) || hp || 1);
      return ratio <= .01 ? SPRITE_HP_STATES.defeated : SPRITE_HP_STATES.normal;
    }

    getStateSpriteFrame(sprite, stateName, role = "enemy") {
      const frames = sprite?.stateFrames || SPRITE_STATE_SPRITES[role] || ENEMY_STATE_SPRITES;
      const selected = frames[stateName] ?? frames.normal ?? 0;
      return clamp(Math.floor(Number(selected) || 0), 0, Math.max(0, (sprite?.frames || 1) - 1));
    }

    getBreathingIdleTransform(role, stateName, seed = 0) {
      const preset = SPRITE_BREATHING_PRESETS[role] || SPRITE_BREATHING_PRESETS.enemy;
      const intensity = preset[stateName] ?? preset.normal ?? .01;
      const t = this.time * (preset.speed || 1.8) + seed;
      return {
        scaleX: 1 + Math.sin(t) * intensity * .55,
        scaleY: 1 + Math.sin(t * 1.17 + 1.35) * intensity
      };
    }

    drawPetSprite(ctx, x, y, pet, baseScale = 1) {
      const sprite = getPetSprite(pet.visual);
      requestPetSprite(sprite);
      const image = sprite?.image;
      if (!image?.complete || !image.naturalWidth) return false;
      if (!sprite.ready && !sprite.processing) preparePetSpritesheet(sprite);
      const source = sprite.canvas || image;
      const frameCount = sprite.frames || 3;
      const sourceWidth = source.width || image.naturalWidth;
      const sourceHeight = source.height || image.naturalHeight;
      const frameWidth = Math.floor(sourceWidth / frameCount);
      const frameHeight = sourceHeight;
      const attackFrame = Math.min(2, frameCount - 1);
      const idleFrame = Math.floor((this.time + (pet.id || 0) * .23) * 2.1) % Math.min(2, frameCount);
      const frame = this.petLunge > .06 ? attackFrame : idleFrame;
      const targetWidth = sprite.width * baseScale;
      const targetHeight = targetWidth * (frameHeight / frameWidth);
      const frameScale = targetWidth / frameWidth;
      const drawX = -targetWidth * sprite.anchorX;
      const drawY = -targetHeight * sprite.anchorY;
      const referenceBounds = sprite.referenceBodyBounds || sprite.referenceBounds;
      const frameBounds = sprite.frameBodyBounds?.[frame] || sprite.frameBounds?.[frame];
      const anchorOffsetX = frameBounds && referenceBounds ? (referenceBounds.centerX - frameBounds.centerX) * frameScale : 0;
      const anchorOffsetY = frameBounds && referenceBounds ? (referenceBounds.bottomY - frameBounds.bottomY) * frameScale : 0;
      const breath = this.getBreathingIdleTransform("pet", SPRITE_HP_STATES.normal, (pet.id || 0) * .73);
      const offsetY = (sprite.offsetY || 0) * baseScale;
      const bodyY = y - targetHeight * (1 - sprite.anchorY) - offsetY;
      ctx.save();
      ctx.translate(x, bodyY + offsetY);
      ctx.scale(breath.scaleX, breath.scaleY);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, frame * frameWidth, 0, frameWidth, frameHeight, drawX + anchorOffsetX, drawY + anchorOffsetY, targetWidth, targetHeight);
      ctx.restore();
      return true;
    }

    getBossSpritesheetPose(enemy, sprite, animation, hp, maxHp, isDefeated, hpStateName) {
      const maxFrame = Math.max(0, (sprite?.frames || 1) - 1);
      const normalFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.normal, "enemy");
      const damagedFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.damaged, "enemy");
      const defeatedFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.defeated, "enemy");
      const now = this.time;
      let actionName = hpStateName;
      let elapsed = now + (animation.frameSeed || 0);
      let actionProgress = 1;
      let frame = hpStateName === SPRITE_HP_STATES.damaged ? damagedFrame : normalFrame;
      let stateName = hpStateName;

      if (isDefeated) {
        stateName = SPRITE_HP_STATES.defeated;
        actionName = "death";
        elapsed = animation.deathStartedAt ? Math.max(0, now - animation.deathStartedAt) : 0;
        actionProgress = clamp(elapsed / BOSS_DEATH_ANIMATION_SECONDS, 0, 1);
        frame = clamp(defeatedFrame, 0, maxFrame);
      } else if (animation.spawnUntil > now) {
        actionName = "spawn";
        elapsed = Math.max(0, now - animation.spawnStartedAt);
        actionProgress = clamp(elapsed / BOSS_SPAWN_ANIMATION_SECONDS, 0, 1);
        frame = getAnimationFrameAtTime(sprite, "spawn", elapsed, normalFrame, normalFrame, { centerShift: .24, bottomShift: .24, topShift: .3, minArea: .45, maxArea: 1.6 });
      } else if (animation.attackUntil > now) {
        actionName = "attack";
        elapsed = Math.max(0, now - animation.attackStartedAt);
        actionProgress = clamp(elapsed / ENEMY_ATTACK_ANIMATION_SECONDS, 0, 1);
        frame = getAnimationFrameAtTime(sprite, "attack", elapsed, frame, normalFrame, { centerShift: .2, bottomShift: .2, topShift: .26, minArea: .5, maxArea: 1.5 });
      } else if (animation.hitUntil > now) {
        actionName = "hit";
        elapsed = Math.max(0, now - animation.hitStartedAt);
        actionProgress = clamp(elapsed / ENEMY_HIT_ANIMATION_SECONDS, 0, 1);
        frame = getAnimationFrameAtTime(sprite, "hit", elapsed, damagedFrame, normalFrame, { centerShift: .16, bottomShift: .16, topShift: .2, minArea: .56, maxArea: 1.34 });
      } else if (stateName === SPRITE_HP_STATES.damaged) {
        actionName = "damaged";
        elapsed = now + (animation.frameSeed || 0);
        frame = damagedFrame;
      } else {
        actionName = "idle";
        elapsed = now + (animation.frameSeed || 0);
        frame = getAnimationFrameAtTime(sprite, "idle", elapsed, normalFrame, normalFrame, { centerShift: .12, bottomShift: .12, topShift: .16, minArea: .72, maxArea: 1.18, minHeight: .82, maxHeight: 1.16, minWidth: .82, maxWidth: 1.16 });
      }

      if (animation.poseName !== actionName) {
        animation.poseName = actionName;
        animation.poseChangedAt = now;
      }

      return {
        stateName,
        frame,
        blend: 0,
        elapsed,
        seed: animation.frameSeed || 0,
        actionName,
        actionProgress,
        transitionProgress: clamp((now - (animation.poseChangedAt || now)) / .18, 0, 1),
        hpRatio: hp / Math.max(1, maxHp)
      };
    }

    getEnemySpritesheetPose(enemy, sprite) {
      const animation = ensureEnemySpriteAnimation(enemy);
      if (!animation) return null;
      if (sprite.image?.complete && sprite.image.naturalWidth && !sprite.ready && !sprite.processing) prepareEnemySpritesheet(sprite);
      const maxHp = Math.max(1, Number(enemy.maxHp) || Number(enemy.hp) || 1);
      const hp = enemy.defeated ? 0 : Math.max(0, Number(enemy.hp ?? maxHp) || 0);
      const isDefeated = enemy.defeated || hp <= 0;
      const stateName = this.getSpriteHpState(hp, maxHp, isDefeated);
      if (!isDefeated && animation.deathStartedAt) animation.deathStartedAt = 0;
      if (enemy.isBoss) return this.getBossSpritesheetPose(enemy, sprite, animation, hp, maxHp, isDefeated, stateName);
      return {
        stateName,
        frame: this.getStateSpriteFrame(sprite, stateName, "enemy"),
        blend: 0,
        elapsed: stateName === SPRITE_HP_STATES.defeated && animation.deathStartedAt ? Math.max(0, this.time - animation.deathStartedAt) : this.time + (animation.frameSeed || 0),
        seed: animation.frameSeed || 0
      };
    }

    getEnemyPoseVisualTransform(enemy, pose, scale) {
      const transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1, filter: "" };
      if (!enemy.isBoss || !pose?.actionName) return transform;
      const progress = clamp(pose.actionProgress ?? 1, 0, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      if (pose.actionName === "spawn") {
        transform.x = 28 * (1 - ease) * scale;
        transform.y = 6 * (1 - ease) * scale;
        transform.scaleX = .9 + ease * .1;
        transform.scaleY = .9 + ease * .1;
        transform.alpha = clamp(ease * 1.12, 0, 1);
        transform.filter = `brightness(${.82 + ease * .18}) saturate(${.82 + ease * .18})`;
      } else if (pose.actionName === "attack") {
        const lunge = Math.sin(progress * Math.PI);
        transform.x = -14 * lunge * scale;
        transform.y = -2 * lunge * scale;
        transform.scaleX = 1 + .028 * lunge;
        transform.scaleY = 1 - .016 * lunge;
        transform.filter = `brightness(${1 + .16 * lunge}) saturate(${1 + .08 * lunge})`;
      } else if (pose.actionName === "hit") {
        const recoil = Math.sin(progress * Math.PI);
        transform.x = 7 * recoil * scale;
        transform.filter = `brightness(${1 + .26 * recoil}) saturate(${1 - .14 * recoil})`;
      } else if (pose.actionName === "damaged") {
        transform.filter = "brightness(.92) saturate(.86)";
      } else if (pose.actionName === "death") {
        transform.y = 8 * ease * scale;
        transform.rotate = -.024 * ease;
        transform.scaleY = 1 - .08 * ease;
        transform.filter = `brightness(${1 - .22 * ease}) saturate(${1 - .35 * ease})`;
      }
      return transform;
    }

    drawEnemySpritesheet(ctx, x, y, scale, enemy, sprite) {
      requestEnemySpritesheet(sprite);
      const image = sprite.image;
      if (!image?.complete || !image.naturalWidth) return false;
      const pose = this.getEnemySpritesheetPose(enemy, sprite);
      if (!pose) return false;
      const source = sprite.canvas || image;
      const sourceWidth = source.width || image.naturalWidth;
      const sourceHeight = source.height || image.naturalHeight;
      const frameWidth = Math.floor(sourceWidth / sprite.columns);
      const frameHeight = Math.floor(sourceHeight / sprite.rows);
      const targetWidth = sprite.width * scale;
      const targetHeight = targetWidth * (frameHeight / frameWidth);
      const referenceBounds = sprite.referenceBounds;
      const frameScale = targetWidth / frameWidth;
      const drawX = -targetWidth * sprite.anchorX;
      const drawY = -targetHeight * sprite.anchorY;
      const breath = this.getBreathingIdleTransform("enemy", pose.stateName, pose.seed || 0);
      const visualTransform = this.getEnemyPoseVisualTransform(enemy, pose, scale);
      ctx.save();
      ctx.translate(x + sprite.offsetX * scale, y + sprite.offsetY * scale);
      ctx.translate(visualTransform.x, visualTransform.y);
      if (visualTransform.rotate) ctx.rotate(visualTransform.rotate);
      ctx.scale(breath.scaleX * visualTransform.scaleX, breath.scaleY * visualTransform.scaleY);
      if (visualTransform.filter) ctx.filter = visualTransform.filter;
      let baseAlpha = visualTransform.alpha;
      if (pose.stateName === SPRITE_HP_STATES.defeated) {
        const deathDuration = enemy.isBoss ? BOSS_DEATH_ANIMATION_SECONDS : ENEMY_DEATH_ANIMATION_SECONDS;
        const fadeStart = deathDuration * .72;
        if (pose.elapsed > fadeStart) baseAlpha *= clamp(1 - (pose.elapsed - fadeStart) / Math.max(.001, deathDuration - fadeStart), 0, 1);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = "rgba(0,0,0,.34)";
      ctx.shadowBlur = 7 * scale;
      const drawFrame = (frame, alpha) => {
        const frameX = (frame % sprite.columns) * frameWidth;
        const frameY = Math.floor(frame / sprite.columns) * frameHeight;
        const frameBounds = sprite.frameBounds?.[frame];
        const anchorOffsetX = frameBounds && referenceBounds ? (referenceBounds.centerX - frameBounds.centerX) * frameScale : 0;
        const anchorOffsetY = frameBounds && referenceBounds ? (referenceBounds.bottomY - frameBounds.bottomY) * frameScale : 0;
        ctx.globalAlpha = baseAlpha * alpha;
        ctx.drawImage(source, frameX, frameY, frameWidth, frameHeight, drawX + anchorOffsetX, drawY + anchorOffsetY, targetWidth, targetHeight);
      };
      drawFrame(pose.frame, 1);
      ctx.restore();
      return true;
    }

    getPlayerShipSpritesheetPose(ship, sprite, options = {}) {
      const animation = options.preview
        ? { sheetKey: sprite.key, frameSeed: (Number(ship?.id) || 0) * .47, attackStartedAt: -999, attackUntil: 0, deathStartedAt: 0 }
        : this.ensurePlayerShipAnimation(ship);
      if (!animation) return null;
      if (sprite.image?.complete && sprite.image.naturalWidth && !sprite.ready && !sprite.processing) prepareEnemySpritesheet(sprite);
      if (!options.preview && state.combat.repairing && state.combat.playerHp <= 0 && !animation.deathStartedAt) animation.deathStartedAt = this.time;
      const maxHp = Math.max(1, Number(options.maxHp ?? getActivePlayerMaxHp()) || 1);
      const hp = options.preview ? Math.max(0, Number(options.hp ?? maxHp) || 0) : Math.max(0, Number(state.combat.playerHp) || 0);
      const isDefeated = Boolean(options.defeated) || (!options.preview && Boolean(animation.deathStartedAt) && hp <= maxHp * .01);
      let stateName = this.getPlayerShipHpState(hp, maxHp, isDefeated);
      if (!options.preview && animation.deathStartedAt && stateName !== SPRITE_HP_STATES.defeated) animation.deathStartedAt = 0;
      const maxFrame = Math.max(0, (sprite?.frames || 1) - 1);
      const normalFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.normal, "playerShip");
      const damagedFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.damaged, "playerShip");
      const defeatedFrame = this.getStateSpriteFrame(sprite, SPRITE_HP_STATES.defeated, "playerShip");
      const now = this.time;
      let actionName = stateName;
      let elapsed = animation.deathStartedAt ? Math.max(0, now - animation.deathStartedAt) : now + (animation.frameSeed || 0);
      let actionProgress = 1;
      let frame = stateName === SPRITE_HP_STATES.damaged ? damagedFrame : normalFrame;

      if (stateName === SPRITE_HP_STATES.defeated) {
        actionName = "death";
        elapsed = animation.deathStartedAt ? Math.max(0, now - animation.deathStartedAt) : 0;
        frame = clamp(defeatedFrame, 0, maxFrame);
      } else if (!options.preview && animation.attackUntil > now) {
        actionName = "attack";
        elapsed = Math.max(0, now - animation.attackStartedAt);
        actionProgress = clamp(elapsed / PLAYER_SHIP_ATTACK_ANIMATION_SECONDS, 0, 1);
        frame = getAnimationFrameAtTime(sprite, "attack", elapsed, normalFrame, normalFrame, { centerShift: .34, bottomShift: .38, topShift: .42, minArea: .26, maxArea: 2.15, minHeight: .38, maxHeight: 1.95, minWidth: .38, maxWidth: 1.95 });
      } else if (stateName === SPRITE_HP_STATES.damaged) {
        actionName = "damaged";
        frame = damagedFrame;
      } else {
        actionName = !options.preview && state.combat.running && !state.combat.enemy ? "moving" : "idle";
        elapsed = now + (animation.frameSeed || 0);
        frame = getAnimationFrameAtTime(sprite, actionName, elapsed, normalFrame, normalFrame, { centerShift: .16, bottomShift: .16, topShift: .22, minArea: .55, maxArea: 1.42, minHeight: .68, maxHeight: 1.34, minWidth: .66, maxWidth: 1.34 });
      }

      if (animation.poseName !== actionName) {
        animation.poseName = actionName;
        animation.poseChangedAt = now;
      }

      return {
        stateName,
        frame,
        blend: 0,
        elapsed,
        seed: animation.frameSeed || 0,
        actionName,
        actionProgress,
        transitionProgress: clamp((now - (animation.poseChangedAt || now)) / .18, 0, 1),
        hpRatio: hp / Math.max(1, maxHp)
      };
    }

    getCaptainCharacterDeckPlacement(ship, shipSprite, targetWidth, targetHeight, scale) {
      const config = sanitizeCaptainEditorConfig(getPirateCharacterBoatConfig(ship?.id) || {
        scale: .3,
        offsetX: (shipSprite.captainAnchorX ?? .48) - (shipSprite.anchorX ?? .5),
        offsetY: 4,
        deckY: shipSprite.captainAnchorY ?? .67,
        anchor: "deck",
        maxHeight: 98
      });
      const footX = targetWidth * (config.offsetX || 0);
      const footY = -targetHeight * (shipSprite.anchorY ?? .64) + targetHeight * (config.deckY ?? .55) + (config.offsetY || 0) * scale;
      return { config, footX, footY };
    }

    drawCaptainCharacter(ctx, ship, shipSprite, targetWidth, targetHeight, scale, options = {}) {
      if (options.preview) return false;
      if (!isCaptainSelected()) return false;
      const { config, footX, footY } = this.getCaptainCharacterDeckPlacement(ship, shipSprite, targetWidth, targetHeight, scale);
      const sprite = getActiveCaptainCharacterSpritesheet();
      requestCaptainCharacterSprite(sprite);
      const image = sprite?.image;
      if (!image?.complete || !image.naturalWidth) return false;
      if (!sprite.ready && !sprite.processing) prepareCaptainCharacterSpritesheet(sprite);
      const source = sprite.canvas || image;
      const sourceWidth = source.width || image.naturalWidth;
      const sourceHeight = source.height || image.naturalHeight;
      const frameWidth = Math.floor(sourceWidth / sprite.columns);
      const frameHeight = sourceHeight;
      const poseName = this.getPlayerCaptainPose();
      const frame = CAPTAIN_CHARACTER_POSES[poseName] ?? CAPTAIN_CHARACTER_POSES.idle;
      const fullBounds = sprite.frameBounds?.[frame] || sprite.referenceBounds;
      const bodyBounds = sprite.frameBodyBounds?.[frame] || sprite.referenceBodyBounds || fullBounds;
      const referenceBody = sprite.referenceBodyBounds || bodyBounds || fullBounds;
      if (!fullBounds || !bodyBounds || !referenceBody) return false;
      const bodyHeight = Math.max(1, referenceBody.visibleHeight || referenceBody.bottom - referenceBody.top + 1);
      const visualHeight = Math.min(targetWidth * config.scale, (config.maxHeight || 38) * scale);
      const frameScale = visualHeight / bodyHeight;
      const targetFrameHeight = frameHeight * frameScale;
      const targetFrameWidth = frameWidth * frameScale;
      const drawX = footX - referenceBody.centerX * frameScale;
      const drawY = footY - referenceBody.bottomY * frameScale;
      const frameX = frame * frameWidth;
      const legCut = clamp(Number(config.legCut ?? 0) || 0, 0, .5);
      const clipBottom = footY + Math.max(4 * scale, visualHeight * .05) - visualHeight * legCut;
      const shadowY = footY + Math.max(1, 1.5 * scale);
      if (isCaptainEditorEnabled()) {
        const matrix = ctx.getTransform();
        const dpr = this.dpr || 1;
        const toScene = (px, py) => ({
          x: (matrix.a * px + matrix.c * py + matrix.e) / dpr,
          y: (matrix.b * px + matrix.d * py + matrix.f) / dpr
        });
        const corners = [
          toScene(drawX + bodyBounds.left * frameScale, drawY + bodyBounds.top * frameScale),
          toScene(drawX + bodyBounds.right * frameScale, drawY + bodyBounds.top * frameScale),
          toScene(drawX + bodyBounds.right * frameScale, drawY + bodyBounds.bottom * frameScale),
          toScene(drawX + bodyBounds.left * frameScale, drawY + bodyBounds.bottom * frameScale)
        ];
        const minX = Math.min(...corners.map(point => point.x));
        const maxX = Math.max(...corners.map(point => point.x));
        const minY = Math.min(...corners.map(point => point.y));
        const maxY = Math.max(...corners.map(point => point.y));
        this.captainEditorInfo = {
          shipId: ship?.id ?? state.shipId,
          key: getCaptainEditorBoatKey(ship?.id ?? state.shipId),
          shipName: ship?.name || SHIPS[state.shipId]?.name || "",
          config: sanitizeCaptainEditorConfig(config),
          targetWidth,
          targetHeight,
          renderScale: scale,
          foot: toScene(footX, footY),
          dragBox: {
            x: minX,
            y: minY,
            width: Math.max(16, maxX - minX),
            height: Math.max(24, maxY - minY)
          }
        };
        updateCaptainEditorPanel(this.captainEditorInfo);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(-targetWidth, -targetHeight * 1.4, targetWidth * 2, clipBottom + targetHeight * 1.4);
      ctx.clip();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .24;
      ctx.fillStyle = "rgba(0,0,0,.72)";
      ctx.beginPath();
      ctx.ellipse(footX, shadowY, Math.max(5, visualHeight * .22), Math.max(1.8, visualHeight * .045), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (poseName === "hit") ctx.filter = "brightness(1.14) saturate(1.08)";
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = "rgba(0,0,0,.34)";
      ctx.shadowBlur = 3.5 * scale;
      ctx.drawImage(source, frameX, 0, frameWidth, frameHeight, drawX, drawY, targetFrameWidth, targetFrameHeight);
      ctx.restore();
      return true;
    }

    drawRepairEffect(ctx, ship, shipSprite, targetWidth, targetHeight, scale, options = {}) {
      if (options.preview || !this.isRepairEffectActive()) return false;
      const image = requestRepairEffectSprite();
      if (!image?.complete || !image.naturalWidth) return false;
      const sprite = REPAIR_EFFECT_SPRITE;
      const source = image;
      const sourceWidth = source.width || source.naturalWidth;
      const sourceHeight = source.height || source.naturalHeight;
      const frameCount = Math.max(1, sprite.frames || 3);
      const frameWidth = Math.floor(sourceWidth / frameCount);
      const frameHeight = sourceHeight;
      if (!frameWidth || !frameHeight) return false;
      measureChestSpriteFrameBounds(sprite, source);
      const elapsed = state.combat.repairing && state.combat.repairStarted
        ? Math.max(0, (performance.now() - Number(state.combat.repairStarted || 0)) / 1000)
        : Math.max(0, this.time - (this.repairEffect.startedAt || this.time));
      const frame = Math.floor(elapsed * 8.5) % frameCount;
      const { footX, footY } = this.getCaptainCharacterDeckPlacement(ship, shipSprite, targetWidth, targetHeight, scale);
      const targetSize = clamp(targetWidth * .48, 86 * scale, 178 * scale);
      const frameScale = targetSize / frameWidth;
      const frameBounds = sprite.frameBounds?.[frame];
      const referenceBounds = sprite.referenceBounds || frameBounds;
      const anchorOffsetX = frameBounds && referenceBounds ? (referenceBounds.centerX - frameBounds.centerX) * frameScale : 0;
      const anchorOffsetY = frameBounds && referenceBounds ? (referenceBounds.bottomY - frameBounds.bottomY) * frameScale : 0;
      const pulse = .5 + .5 * Math.sin(elapsed * Math.PI * 2.4);
      ctx.save();
      ctx.translate(footX, footY);
      ctx.globalAlpha = .84 + pulse * .12;
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = "rgba(255,239,179,.46)";
      ctx.shadowBlur = (8 + pulse * 6) * scale;
      ctx.drawImage(
        source,
        frame * frameWidth,
        0,
        frameWidth,
        frameHeight,
        -targetSize * .5 + anchorOffsetX,
        -targetSize * .78 + anchorOffsetY,
        targetSize,
        targetSize * (frameHeight / frameWidth)
      );
      ctx.restore();
      return true;
    }

    drawPlayerShipSpritesheet(ctx, x, y, scale, ship, sprite, options = {}) {
      requestPlayerShipSpritesheet(sprite);
      const image = sprite.image;
      if (!image?.complete || !image.naturalWidth) return false;
      const pose = this.getPlayerShipSpritesheetPose(ship, sprite, options);
      if (!pose) return false;
      const source = sprite.canvas || image;
      const sourceWidth = source.width || image.naturalWidth;
      const sourceHeight = source.height || image.naturalHeight;
      const frameWidth = Math.floor(sourceWidth / sprite.columns);
      const frameHeight = Math.floor(sourceHeight / sprite.rows);
      const targetWidth = sprite.width * scale;
      const targetHeight = targetWidth * (frameHeight / frameWidth);
      const referenceBounds = sprite.referenceBounds;
      const frameScale = targetWidth / frameWidth;
      const drawX = -targetWidth * sprite.anchorX;
      const drawY = -targetHeight * sprite.anchorY;
      const breath = this.getBreathingIdleTransform("playerShip", pose.stateName, pose.seed || 0);
      ctx.save();
      ctx.translate(x + sprite.offsetX * scale * (options.flipX ? -1 : 1), y + sprite.offsetY * scale);
      ctx.scale((options.flipX ? -1 : 1) * breath.scaleX, breath.scaleY);
      let baseAlpha = 1;
      if (pose.stateName === SPRITE_HP_STATES.defeated) {
        const fadeStart = 1.05;
        if (pose.elapsed > fadeStart) baseAlpha = clamp(1 - (pose.elapsed - fadeStart) / .45, 0, 1);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = "rgba(0,0,0,.34)";
      ctx.shadowBlur = 8 * scale;
      const drawFrame = (frame, alpha, clip = null) => {
        const frameX = (frame % sprite.columns) * frameWidth;
        const frameY = Math.floor(frame / sprite.columns) * frameHeight;
        const frameBounds = sprite.frameBounds?.[frame];
        const anchorOffsetX = frameBounds && referenceBounds ? (referenceBounds.centerX - frameBounds.centerX) * frameScale : 0;
        const anchorOffsetY = frameBounds && referenceBounds ? (referenceBounds.bottomY - frameBounds.bottomY) * frameScale : 0;
        ctx.save();
        if (clip) {
          ctx.beginPath();
          ctx.rect(clip.x, clip.y, clip.width, clip.height);
          ctx.clip();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = baseAlpha * alpha;
        ctx.drawImage(source, frameX, frameY, frameWidth, frameHeight, drawX + anchorOffsetX, drawY + anchorOffsetY, targetWidth, targetHeight);
        ctx.restore();
      };
      const shouldDrawCaptain = pose.stateName !== SPRITE_HP_STATES.defeated;
      const captainLayer = shouldDrawCaptain
        ? this.getCaptainCharacterDeckPlacement(ship, sprite, targetWidth, targetHeight, scale).config.layer
        : "front";
      if (shouldDrawCaptain && captainLayer === "behind") {
        this.drawCaptainCharacter(ctx, ship, sprite, targetWidth, targetHeight, scale, options);
      }
      drawFrame(pose.frame, 1);
      if (shouldDrawCaptain && captainLayer !== "behind") {
        this.drawCaptainCharacter(ctx, ship, sprite, targetWidth, targetHeight, scale, options);
      }
      this.drawRepairEffect(ctx, ship, sprite, targetWidth, targetHeight, scale, options);
      ctx.restore();
      return true;
    }

    drawPlayerShip(ctx, x, y, scale, ship, options = {}) {
      const animatedSprite = getPlayerShipSpritesheet(ship.name);
      if (animatedSprite && this.drawPlayerShipSpritesheet(ctx, x, y, scale, ship, animatedSprite, options)) return;
      this.drawShip(ctx, x, y, scale, Boolean(options.flipX), ship.tier, false, ship.id, ship.type);
    }

    enemySizeFactor(enemy) {
      if (enemy.isArena) return .94;
      if (enemy.isBoss) return 1.06;
      const text = normalizeText(`${enemy.name} ${enemy.category || ""}`);
      if (/canoa|jangada|remador|pescador|bote|tribal|cacador|saqueador|contrabandista pequeno|pequeno contrabandista/.test(text)) return .62;
      if (/jacare|reptil|pterodactilo|ictiossauro|plesiossauro|serpente|carapaca|dragao|leviata|baleeiro/.test(text)) return .68;
      if (enemy.category === "PESCADOR") return .64;
      if (enemy.category === "CRIATURA") return .68;
      if (enemy.category === "MERCANTE" || enemy.category === "CONTRABANDISTA") return .72;
      if (enemy.category === "MARINHA" || enemy.category === "FANTASMA") return .76;
      return .72;
    }

    enemySceneScale(baseScale, enemy, sourceWidth = 280) {
      const sizedScale = baseScale * this.enemySizeFactor(enemy);
      if (enemy.isBoss) return sizedScale;
      const playerSprite = getPlayerShipSpritesheet(SHIPS[state.shipId].name);
      const playerSceneScale = Math.min(1.15, this.width / 950);
      const playerWidth = (playerSprite?.width || 250) * playerSceneScale;
      const maxEnemyWidth = playerWidth * .82;
      const projectedWidth = sourceWidth * sizedScale;
      return projectedWidth > maxEnemyWidth ? sizedScale * (maxEnemyWidth / projectedWidth) : sizedScale;
    }

    drawEnemy(ctx, x, y, scale, enemy) {
      if (enemy.isArena) {
        const ship = getArenaEnemyShip(enemy) || { id: 0, name: enemy.ship_name || "Navio Pirata", tier: enemy.visualTier || 3, type: enemy.visualKind || "Pirata" };
        const sprite = getPlayerShipSpritesheet(ship.name);
        const arenaScale = Math.min(1.04, scale * 1.02);
        if (sprite && this.drawPlayerShipSpritesheet(ctx, x, y, arenaScale, ship, sprite, { preview: true, flipX: true, hp: enemy.hp, maxHp: enemy.maxHp, defeated: enemy.defeated })) return;
        this.drawShip(ctx, x, y, arenaScale, true, ship.tier || enemy.visualTier || 3, false, ship.id || 0, ship.type || enemy.visualKind || "Pirata");
        return;
      }
      const animatedSprite = getEnemyAnimatedSpritesheet(enemy);
      if (animatedSprite && this.drawEnemySpritesheet(ctx, x, y, this.enemySceneScale(scale, enemy, animatedSprite.width), enemy, animatedSprite)) return;
      const visual = enemy.visual || inferEnemyVisual(enemy.name, REGIONS[state.regionIndex], enemy.category, enemy.visualTier, enemy.isBoss);
      const finalScale = this.enemySceneScale(scale * (visual.scale || 1), enemy, 250 * (visual.scale || 1));
      const type = visual.type;
      if (["pirate-ship", "imperial-ship", "merchant-ship", "smuggler-ship", "ghost-ship"].includes(type)) {
        const faction = type === "imperial-ship" ? "MARINHA" : type === "merchant-ship" ? "MERCANTE" : type === "smuggler-ship" ? "CONTRABANDISTA" : type === "ghost-ship" ? "FANTASMA" : visual.theme === "volcanic" ? "VULCÂNICO" : enemy.visualKind || enemy.kind;
        this.drawShip(ctx, x, y, finalScale, true, enemy.visualTier, enemy.isBoss, state.regionIndex + enemy.visualTier + 20, faction);
        return;
      }
      ctx.save(); ctx.translate(x, y); ctx.scale(-finalScale, finalScale);
      if (type === "raft") this.drawRaft(ctx, visual);
      else if (type === "canoe") this.drawCanoe(ctx, visual, enemy.isBoss);
      else if (type === "small-boat" || type === "tribal-boat" || type === "raider-boat") this.drawOpenBoat(ctx, visual, type, enemy.isBoss);
      else if (type === "fishing-boat") this.drawFishingBoat(ctx, visual);
      else if (type === "flying-creature") this.drawFlyingCreature(ctx, enemy.isBoss, visual);
      else if (type === "sea-serpent") this.drawSeaSerpent(ctx, enemy.isBoss, visual);
      else if (type === "marine-reptile") this.drawMarineReptile(ctx, enemy.isBoss, visual);
      else if (type === "megalodon") this.drawMegalodon(ctx, enemy.isBoss, visual);
      else if (type === "kraken") this.drawKrakenEnemy(ctx, enemy.isBoss, visual);
      else if (type === "seal") this.drawSealEnemy(ctx, visual);
      else if (type === "specter") this.drawSpecter(ctx, visual);
      else if (type === "abyssal-creature") this.drawAbyssalCreature(ctx, enemy.isBoss, visual);
      else this.drawShip(ctx, 0, 0, 1, false, enemy.visualTier, enemy.isBoss, state.regionIndex + 20, enemy.visualKind || enemy.kind);
      ctx.restore();
    }

    waterShadow(ctx, width = 82, y = 28) {
      ctx.globalAlpha = .18; ctx.fillStyle = "#04141d"; ctx.beginPath(); ctx.ellipse(0, y, width, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(226,255,248,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, y - 2, width * .7, 6, 0, 0, Math.PI); ctx.stroke();
    }

    drawStickHuman(ctx, x, y, scale = 1, color = "#312315", accent = "#d7b56a") {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -18, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 5); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(11, -3); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-7, 18); ctx.moveTo(0, 5); ctx.lineTo(8, 18); ctx.stroke(); ctx.lineCap = "butt";
      ctx.restore();
    }

    drawRaft(ctx, visual) {
      this.waterShadow(ctx, 64, 24);
      ctx.strokeStyle = "#2c1f16"; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = -2 + i * 7;
        ctx.fillStyle = i % 2 ? "#6b4528" : "#7b5232";
        ctx.beginPath(); ctx.roundRect(-48, y, 92, 8, 4); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = "#cfb16b"; ctx.lineWidth = 2;
      [-28, 4, 34].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x - 8, 37); ctx.stroke(); });
      ctx.strokeStyle = "#5b3b23"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(5, -58); ctx.stroke();
      ctx.fillStyle = visual.theme === "primitive" ? "#d5c08b" : "#ded7ba"; ctx.beginPath(); ctx.moveTo(8, -54); ctx.lineTo(41, -33); ctx.lineTo(8, -18); ctx.closePath(); ctx.fill();
      this.drawStickHuman(ctx, -18, -9, .78, "#2b1d12", "#b95d3c");
    }

    drawCanoe(ctx, visual, boss = false) {
      this.waterShadow(ctx, boss ? 85 : 70, 24);
      const hull = visual.theme === "primitive" ? "#5a351f" : "#6e3f29";
      ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-72, 4); ctx.quadraticCurveTo(-30, 31, 70, 5); ctx.quadraticCurveTo(28, 14, -58, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#26160e"; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = "#e0c37c"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-42 + i * 25, 7); ctx.lineTo(-34 + i * 25, 17); ctx.stroke(); }
      this.drawStickHuman(ctx, -28, -2, .75, "#21160f", "#cc6840");
      this.drawStickHuman(ctx, 18, -4, boss ? .82 : .68, "#21160f", "#cc6840");
      ctx.strokeStyle = "#d4b56d"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(38, -20); ctx.lineTo(64, -35); ctx.stroke();
    }

    drawOpenBoat(ctx, visual, type, boss = false) {
      this.waterShadow(ctx, boss ? 78 : 62, 27);
      const tribal = type === "tribal-boat";
      ctx.fillStyle = tribal ? "#654023" : visual.theme === "volcanic" ? "#6f2f22" : "#64402e";
      ctx.beginPath(); ctx.moveTo(-58, -4); ctx.quadraticCurveTo(-44, 27, 50, 22); ctx.lineTo(65, -2); ctx.quadraticCurveTo(8, 10, -58, -4); ctx.fill();
      ctx.strokeStyle = tribal ? "#d8b85f" : "#261711"; ctx.lineWidth = 3; ctx.stroke();
      if (tribal) {
        ctx.fillStyle = "#ead58a"; [-31, -8, 15, 38].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 7, 8); ctx.lineTo(x - 6, 9); ctx.closePath(); ctx.fill(); });
      }
      this.drawStickHuman(ctx, -16, -9, .78, "#23170f", tribal ? "#d65f3d" : "#d7b56a");
      ctx.strokeStyle = visual.theme === "volcanic" ? "#ff8650" : "#c8a15f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(50, -27); ctx.stroke();
    }

    drawFishingBoat(ctx, visual) {
      this.waterShadow(ctx, 70, 28);
      ctx.fillStyle = "#496e76"; ctx.beginPath(); ctx.moveTo(-66, -6); ctx.quadraticCurveTo(-48, 30, 53, 22); ctx.lineTo(68, -7); ctx.quadraticCurveTo(6, 6, -66, -6); ctx.fill();
      ctx.strokeStyle = "#d6e3dc"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = "#8a6339"; ctx.fillRect(-22, -22, 27, 18); ctx.strokeRect(-22, -22, 27, 18);
      this.drawStickHuman(ctx, 24, -13, .78, "#2b2118", "#d7d4b5");
      ctx.strokeStyle = "rgba(220,236,232,.75)"; ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-48 + i * 7, -3); ctx.quadraticCurveTo(-62 + i * 4, 18, -37 + i * 6, 27); ctx.stroke(); }
      ctx.strokeStyle = "#d9c47a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, -27); ctx.quadraticCurveTo(60, -41, 70, -16); ctx.stroke();
    }

    drawFlyingCreature(ctx, boss, visual) {
      const flap = Math.sin(this.time * 5) * 10;
      ctx.translate(0, -58 - Math.sin(this.time * 2) * 8);
      ctx.globalAlpha = .12; ctx.fillStyle = "#03121a"; ctx.beginPath(); ctx.ellipse(0, 87, boss ? 70 : 54, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = visual.theme === "glacial" ? "#95c0c6" : "#6b4a34";
      ctx.beginPath(); ctx.ellipse(0, 0, boss ? 29 : 23, boss ? 13 : 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -3); ctx.lineTo(67, -14); ctx.lineTo(31, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#3b281e"; ctx.lineWidth = 4; ctx.lineJoin = "round";
      [-1, 1].forEach(side => { ctx.beginPath(); ctx.moveTo(-8 * side, -3); ctx.quadraticCurveTo(-64 * side, -45 - flap, -112 * side, 8 + flap); ctx.quadraticCurveTo(-54 * side, 15, -8 * side, 4); ctx.stroke(); });
      ctx.fillStyle = "rgba(116,74,45,.72)"; [-1, 1].forEach(side => { ctx.beginPath(); ctx.moveTo(-9 * side, -3); ctx.quadraticCurveTo(-60 * side, -38 - flap, -102 * side, 7 + flap); ctx.quadraticCurveTo(-50 * side, 10, -7 * side, 5); ctx.fill(); });
      ctx.strokeStyle = "#2a1b13"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(-15, 24); ctx.moveTo(8, 9); ctx.lineTo(22, 23); ctx.stroke();
    }

    drawSeaSerpent(ctx, boss, visual) {
      this.waterShadow(ctx, boss ? 112 : 88, 30);
      const body = visual.theme === "glacial" ? "#8fc7d7" : visual.theme === "volcanic" ? "#8b3b2f" : visual.theme === "spectral" ? "#294c61" : "#245f65";
      ctx.strokeStyle = body; ctx.lineCap = "round"; ctx.lineWidth = boss ? 22 : 17;
      ctx.beginPath(); ctx.moveTo(-92, 18); ctx.bezierCurveTo(-61, -29, -27, 39, 5, 0); ctx.bezierCurveTo(29, -31, 62, -13, 82, -43); ctx.stroke();
      ctx.strokeStyle = this.mix(body, "#e9f4d8", .28); ctx.lineWidth = boss ? 7 : 5; ctx.beginPath(); ctx.moveTo(-78, 16); ctx.bezierCurveTo(-48, -17, -23, 26, 4, -1); ctx.stroke();
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(95, -50, boss ? 29 : 23, boss ? 18 : 14, -.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8fff1"; ctx.beginPath(); ctx.arc(105, -56, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7eee1"; ctx.beginPath(); ctx.moveTo(112, -43); ctx.lineTo(128, -38); ctx.lineTo(110, -35); ctx.closePath(); ctx.fill();
      ctx.lineCap = "butt";
    }

    drawMarineReptile(ctx, boss, visual) {
      this.waterShadow(ctx, boss ? 96 : 78, 28);
      const skin = visual.theme === "volcanic" ? "#783f32" : visual.theme === "primitive" ? "#43694c" : "#3d6971";
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 2, boss ? 72 : 58, boss ? 22 : 18, -.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(61, -8, boss ? 31 : 24, boss ? 17 : 13, -.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-62, 5); ctx.lineTo(-95, -13); ctx.lineTo(-86, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.mix(skin, "#d8d17e", .18); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-32 + i * 16, -16); ctx.lineTo(-22 + i * 16, -32); ctx.lineTo(-12 + i * 16, -13); ctx.fill(); }
      ctx.fillStyle = "#f5fff0"; ctx.beginPath(); ctx.arc(70, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#143036"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, 1); ctx.lineTo(93, 4); ctx.stroke();
    }

    drawMegalodon(ctx, boss, visual) {
      this.waterShadow(ctx, boss ? 118 : 96, 31);
      ctx.fillStyle = "#314f5d"; ctx.beginPath(); ctx.moveTo(-102, 2); ctx.quadraticCurveTo(-36, -39, 86, -8); ctx.quadraticCurveTo(42, 34, -92, 17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-92, 8); ctx.lineTo(-126, -18); ctx.lineTo(-120, 28); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, -26); ctx.lineTo(19, -63); ctx.lineTo(31, -20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#dce7e4"; ctx.beginPath(); ctx.moveTo(48, 4); ctx.quadraticCurveTo(73, 15, 99, 6); ctx.quadraticCurveTo(74, 32, 42, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(57 + i * 6, 8); ctx.lineTo(61 + i * 6, 18); ctx.lineTo(65 + i * 6, 8); ctx.fill(); }
      ctx.fillStyle = "#07131a"; ctx.beginPath(); ctx.arc(67, -13, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    drawKrakenEnemy(ctx, boss, visual) {
      this.waterShadow(ctx, boss ? 118 : 88, 34);
      const color = visual.theme === "spectral" ? "#3b315f" : "#5a2f68";
      ctx.strokeStyle = color; ctx.lineCap = "round";
      for (let i = 0; i < (boss ? 7 : 5); i++) {
        const start = -70 + i * 24;
        ctx.lineWidth = boss ? 13 - i * .35 : 10 - i * .4;
        ctx.beginPath(); ctx.moveTo(start, 32); ctx.bezierCurveTo(start - 28, -12, start + Math.sin(this.time * 1.5 + i) * 26, -69, start + 18, -93 + Math.sin(i) * 18); ctx.stroke();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(5, 2, boss ? 48 : 36, boss ? 31 : 24, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4e6b1"; [-13, 18].forEach(x => { ctx.beginPath(); ctx.arc(x, -13, 4, 0, Math.PI * 2); ctx.fill(); });
      ctx.lineCap = "butt";
    }

    drawSealEnemy(ctx, visual) {
      this.waterShadow(ctx, 48, 20);
      ctx.fillStyle = "#9db7bd"; ctx.beginPath(); ctx.ellipse(0, -2, 38, 16, -.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(34, -11, 15, 11, -.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(-58, -9); ctx.lineTo(-50, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#07131a"; ctx.beginPath(); ctx.arc(39, -14, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    drawSpecter(ctx, visual) {
      ctx.save(); ctx.globalAlpha = .72 + Math.sin(this.time * 3) * .08; ctx.shadowColor = "#6df5e8"; ctx.shadowBlur = 16;
      ctx.fillStyle = "rgba(110,232,220,.54)"; ctx.beginPath(); ctx.arc(0, -34, 22, Math.PI, 0); ctx.lineTo(22, 7); ctx.quadraticCurveTo(13, -1, 4, 8); ctx.quadraticCurveTo(-5, -1, -16, 8); ctx.quadraticCurveTo(-23, -8, -22, -34); ctx.fill();
      ctx.fillStyle = "#dffefa"; [-7, 8].forEach(x => { ctx.beginPath(); ctx.arc(x, -36, 3, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    drawAbyssalCreature(ctx, boss, visual) {
      this.waterShadow(ctx, boss ? 96 : 76, 29);
      ctx.fillStyle = "#222945"; ctx.beginPath(); ctx.ellipse(0, -1, boss ? 65 : 50, boss ? 28 : 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#30225a"; ctx.lineCap = "round"; for (let i = 0; i < 6; i++) { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-38 + i * 15, 13); ctx.quadraticCurveTo(-55 + i * 19, 42 + Math.sin(this.time * 2 + i) * 9, -29 + i * 15, 51); ctx.stroke(); }
      ctx.fillStyle = "#8ef9e8"; [-16, 13].forEach(x => { ctx.beginPath(); ctx.arc(x, -8, 4, 0, Math.PI * 2); ctx.fill(); });
      ctx.lineCap = "butt";
    }

    drawShip(ctx, x, y, scale, flipped, tier, boss, variant = 0, faction = "Pirata") {
      const direction = flipped ? -1 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(direction * scale, scale);
      const spectral = /Espectral|FANTASMA|ABISSAL/.test(faction) || variant === 20;
      const imperial = /Marinha|MARINHA/.test(faction);
      const fisher = /Pescador|PESCADOR/.test(faction);
      const civil = /Civil|Mercante|MERCANTE/.test(faction) || fisher;
      const smuggler = /CONTRABANDISTA/.test(faction);
      const hunter = /Caçador|CAÇADOR/.test(faction);
      const fiery = /VULCÂNICO/.test(faction);
      const length = (76 + tier * 8 + (boss ? 19 : 0)) * (fisher ? .78 : smuggler ? .9 : hunter ? 1.08 : 1);
      const hull = spectral ? "#173f43" : imperial ? "#173d68" : fisher ? "#426c78" : civil ? "#416047" : smuggler ? "#2b3234" : hunter ? "#3e3030" : fiery ? "#672d25" : boss ? "#281a25" : ["#70452d", "#5b3728", "#6e3c2b", "#47352c"][variant % 4];
      const trim = spectral ? "#52e5da" : imperial ? "#d3a73f" : fisher ? "#d9e4df" : civil ? "#d2b16a" : smuggler ? "#9b7453" : hunter ? "#e29b4c" : fiery ? "#e46b36" : boss ? "#bf4655" : "#c08a45";
      const sail = spectral ? "#95d8ce" : imperial ? "#eee8d6" : fisher ? "#dce4df" : civil ? "#ddd4b9" : smuggler ? "#343337" : hunter ? "#cbb28d" : fiery ? "#4a2925" : boss ? "#28232e" : "#d6c9aa";

      ctx.globalAlpha = .18; ctx.fillStyle = "#04141d"; ctx.beginPath(); ctx.ellipse(0, 27, length * .95, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .72; ctx.strokeStyle = "#e6fff8"; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.moveTo(-length * .93, 22); ctx.quadraticCurveTo(-length * .55, 30, -length * .12, 25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(length * .4, 24); ctx.quadraticCurveTo(length * .75, 31, length * 1.02, 19); ctx.stroke(); ctx.globalAlpha = 1;

      const hullGradient = ctx.createLinearGradient(0, -10, 0, 35);
      hullGradient.addColorStop(0, this.mix(hull, "#f0c178", .2)); hullGradient.addColorStop(.45, hull); hullGradient.addColorStop(1, this.mix(hull, "#080d12", .58));
      ctx.fillStyle = hullGradient;
      ctx.beginPath(); ctx.moveTo(-length, -4); ctx.quadraticCurveTo(-length * .72, -10, -length * .46, -8); ctx.lineTo(length * .87, -12); ctx.lineTo(length, -5); ctx.lineTo(length * .7, 22); ctx.quadraticCurveTo(0, 37, -length * .72, 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = this.mix(hull, "#05090d", .62); ctx.lineWidth = 3; ctx.stroke();

      ctx.fillStyle = this.mix(hull, "#f2c26a", .15); ctx.beginPath(); ctx.moveTo(-length * .84, -7); ctx.lineTo(length * .86, -13); ctx.lineTo(length * .72, -3); ctx.lineTo(-length * .79, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = 2.1; ctx.beginPath(); ctx.moveTo(-length * .82, 3); ctx.quadraticCurveTo(0, 10, length * .73, -2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,234,190,.2)"; ctx.lineWidth = 1;
      for (let p = 0; p < 3; p++) { ctx.beginPath(); ctx.moveTo(-length * .7, 9 + p * 5); ctx.quadraticCurveTo(0, 18 + p * 4, length * (.62 - p * .03), 5 + p * 4); ctx.stroke(); }

      const portCount = Math.min(9, Math.max(1, tier + 3 + (boss ? 2 : 0) - (civil ? 2 : 0) - (fisher ? 2 : 0)));
      ctx.fillStyle = "#081015";
      for (let i = 0; i < portCount; i++) { const px = -length * .57 + i * (length * 1.08 / Math.max(1, portCount - 1)); ctx.fillRect(px - 3.2, 6, 6.4, 5.2); ctx.fillStyle = trim; ctx.fillRect(px - 3.2, 5.2, 6.4, 1); ctx.fillStyle = "#081015"; }

      const sternX = -length * .63;
      if (tier >= 2 || boss) {
        ctx.fillStyle = hull; ctx.fillRect(sternX, -22 - tier * 2, length * .29, 18 + tier * 2);
        ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.strokeRect(sternX, -22 - tier * 2, length * .29, 18 + tier * 2);
        ctx.fillStyle = "#ffd77b"; for (let i = 0; i < 2; i++) ctx.fillRect(sternX + 7 + i * 13, -16 - tier, 6, 6);
      }

      if (civil || fisher) {
        const cargoCount = fisher ? 2 : Math.min(5, 2 + tier);
        for (let i = 0; i < cargoCount; i++) {
          const cx = -length * .2 + i * 13;
          ctx.fillStyle = i % 2 ? "#8b5d36" : "#a17643";
          ctx.fillRect(cx, -17 - (i % 2) * 5, 11, 10);
          ctx.strokeStyle = "rgba(43,29,20,.65)"; ctx.lineWidth = 1; ctx.strokeRect(cx, -17 - (i % 2) * 5, 11, 10);
        }
      }
      if (fisher) {
        ctx.strokeStyle = "rgba(220,232,225,.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-length * .54, -2); ctx.quadraticCurveTo(-length * .72, 15, -length * .48, 23); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-length * (.68 - i * .05), 10 + i * 2); ctx.lineTo(-length * (.55 - i * .04), 20); ctx.stroke(); }
      }

      const mastCount = tier >= 4 ? 3 : tier >= 2 ? 2 : 1;
      const masts = mastCount === 3 ? [-38, 7, 46] : mastCount === 2 ? [-23, 35] : [12];
      ctx.strokeStyle = "#352319"; ctx.lineCap = "round";
      masts.forEach((mx, index) => {
        const mastH = 72 + tier * 7 - Math.abs(index - (masts.length - 1) / 2) * 9;
        ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(mx, 1); ctx.lineTo(mx, -mastH); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 30, -mastH * .69); ctx.lineTo(mx + 34, -mastH * .69); ctx.stroke();
        const sailGradient = ctx.createLinearGradient(mx, -mastH + 8, mx + 38, -17);
        sailGradient.addColorStop(0, this.mix(sail, "#ffffff", .26)); sailGradient.addColorStop(.55, sail); sailGradient.addColorStop(1, this.mix(sail, "#67523b", .22));
        ctx.fillStyle = sailGradient;
        ctx.beginPath(); ctx.moveTo(mx + 3, -mastH + 8); ctx.quadraticCurveTo(mx + 47, -mastH * .68, mx + 9, -mastH * .35); ctx.lineTo(mx + 4, -mastH * .36); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(54,40,31,.56)"; ctx.lineWidth = 1; ctx.stroke();
        if (tier >= 3) { ctx.fillStyle = spectral ? "rgba(10,43,46,.45)" : imperial ? "rgba(26,59,107,.13)" : "rgba(61,35,28,.13)"; ctx.beginPath(); ctx.ellipse(mx + 19, -mastH * .61, 9, 14, -.2, 0, Math.PI * 2); ctx.fill(); }
      });

      ctx.strokeStyle = spectral ? "rgba(111,232,218,.55)" : "rgba(73,52,37,.72)"; ctx.lineWidth = 1;
      masts.forEach((mx, i) => { const mastH = 72 + tier * 7 - Math.abs(i - (masts.length - 1) / 2) * 9; ctx.beginPath(); ctx.moveTo(-length * .87, -4); ctx.lineTo(mx, -mastH + 2); ctx.lineTo(length * .92, -8); ctx.stroke(); if (i < masts.length - 1) { ctx.beginPath(); ctx.moveTo(mx, -mastH * .72); ctx.lineTo(masts[i + 1], -(72 + tier * 7) * .72); ctx.stroke(); } });
      ctx.lineCap = "butt";

      const firstMastH = 72 + tier * 7;
      ctx.fillStyle = spectral ? "#3ae2d5" : imperial ? "#255ea3" : fiery ? "#e25331" : "#17191b";
      ctx.beginPath(); ctx.moveTo(masts[0], -firstMastH); ctx.lineTo(masts[0] + 27, -firstMastH + 8); ctx.lineTo(masts[0], -firstMastH + 17); ctx.closePath(); ctx.fill();
      if (!imperial && !civil && !hunter && tier >= 2) { ctx.fillStyle = "rgba(245,242,214,.82)"; ctx.font = "12px Georgia"; ctx.textAlign = "center"; ctx.fillText("☠", masts[Math.floor(masts.length / 2)] + 20, -(70 + tier * 6) * .57); }
      if (hunter) { ctx.fillStyle = "#e6b04f"; ctx.font = "12px Georgia"; ctx.textAlign = "center"; ctx.fillText("⚔", masts[Math.floor(masts.length / 2)] + 20, -(70 + tier * 6) * .57); }

      if (spectral) { ctx.shadowColor = "#43e1d4"; ctx.shadowBlur = 14; ctx.strokeStyle = "rgba(83,236,221,.65)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.shadowBlur = 0; }
      if (boss) { ctx.strokeStyle = trim; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(length * .45, -8); ctx.quadraticCurveTo(length * .82, -43, length * 1.04, -24); ctx.stroke(); }
      const sceneDarkness = this.getDayState().darkness;
      if (sceneDarkness > .28 && !spectral) {
        ctx.shadowColor = "#ffc75b"; ctx.shadowBlur = 10; ctx.fillStyle = `rgba(255,199,91,${Math.min(.9, sceneDarkness + .2)})`;
        [-length * .48, length * .54].forEach(lx => { ctx.beginPath(); ctx.arc(lx, -2, 2.2, 0, Math.PI * 2); ctx.fill(); });
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    drawRain(ctx, w, h) { ctx.strokeStyle = "rgba(207,229,236,.22)"; ctx.lineWidth = 1; for (let i = 0; i < 50; i++) { const x = (i * 97 + this.time * 190) % (w + 80) - 40; const y = (i * 53 + this.time * 320) % h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 24); ctx.stroke(); } }
    drawSnow(ctx, w, h) { ctx.fillStyle = "rgba(238,249,250,.65)"; for (let i = 0; i < 36; i++) { const x = (i * 83 + Math.sin(this.time + i) * 30) % w; const y = (i * 49 + this.time * (19 + i % 8)) % h; ctx.beginPath(); ctx.arc(x, y, 1 + i % 3, 0, Math.PI * 2); ctx.fill(); } }
    drawFog(ctx, w, h) { const fog = ctx.createLinearGradient(0, h * .25, 0, h); fog.addColorStop(0, "rgba(210,226,220,.12)"); fog.addColorStop(.55, "rgba(210,226,220,.28)"); fog.addColorStop(1, "rgba(210,226,220,.04)"); ctx.fillStyle = fog; ctx.fillRect(0, h * .2, w, h * .7); }
    drawTentacles(ctx, w, h) { ctx.strokeStyle = "rgba(60,24,74,.72)"; ctx.lineWidth = 18; ctx.lineCap = "round"; [w * .58, w * .82].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x, h); ctx.bezierCurveTo(x - 45, h * .72, x + 60, h * .62, x + Math.sin(this.time + i) * 15, h * .5); ctx.stroke(); }); ctx.lineCap = "butt"; }
  }

  const scene = new SeaScene($("#sea-canvas"));

  let captainEditorPanel = null;
  let captainEditorPanelSnapshot = "";

  function setCaptainEditorUrlParam(key, value) {
    const params = new URLSearchParams(location.search);
    params.set("visualAudit", "captain");
    params.set("editCaptain", "1");
    params.set(key, String(value));
    location.search = params.toString();
  }

  function setCaptainEditorInputValue(input, value) {
    if (!input || input === document.activeElement) return;
    input.value = value;
  }

  function getCaptainEditorCurrentConfig() {
    return sanitizeCaptainEditorConfig(getPirateCharacterBoatConfig(state.shipId) || PIRATE_CHARACTER_CONFIG[getCaptainEditorBoatKey(state.shipId)] || {});
  }

  function updateCaptainEditorPanel(info = null, configOverride = null) {
    if (!isCaptainEditorEnabled() || !captainEditorPanel) return;
    const config = sanitizeCaptainEditorConfig(configOverride || getCaptainEditorCurrentConfig());
    const ship = SHIPS[state.shipId];
    const entry = formatCaptainEditorConfigEntry(state.shipId, config);
    const snapshot = JSON.stringify({
      shipId: state.shipId,
      level: state.captainLevel,
      gender: state.captainSelectedGender,
      pose: VISUAL_AUDIT_CONFIG?.pose,
      config,
      foot: info?.foot ? [Math.round(info.foot.x), Math.round(info.foot.y)] : null
    });
    if (snapshot === captainEditorPanelSnapshot) return;
    captainEditorPanelSnapshot = snapshot;
    captainEditorPanel.querySelector("[data-captain-editor-boat]").textContent = `${getCaptainEditorBoatKey(state.shipId)} - ${ship?.name || ""}`;
    captainEditorPanel.querySelector("[data-captain-editor-foot]").textContent = info?.foot ? `${Math.round(info.foot.x)}, ${Math.round(info.foot.y)}` : "-";
    captainEditorPanel.querySelector("[data-captain-editor-code]").value = `${entry},`;
    setCaptainEditorInputValue(captainEditorPanel.querySelector("[data-captain-editor-ship]"), state.shipId);
    setCaptainEditorInputValue(captainEditorPanel.querySelector("[data-captain-editor-level]"), state.captainLevel || 1);
    setCaptainEditorInputValue(captainEditorPanel.querySelector("[data-captain-editor-gender]"), state.captainSelectedGender || "male");
    setCaptainEditorInputValue(captainEditorPanel.querySelector("[data-captain-editor-pose]"), VISUAL_AUDIT_CONFIG?.pose || "idle");
    setCaptainEditorInputValue(captainEditorPanel.querySelector("[data-captain-editor-layer]"), config.layer || "front");
    captainEditorPanel.querySelectorAll("[data-captain-editor-field]").forEach(input => {
      const field = input.dataset.captainEditorField;
      const value = field === "maxHeight" ? Math.round(config[field]) : Number(config[field]).toFixed(field === "offsetY" ? 1 : 3);
      setCaptainEditorInputValue(input, value);
    });
  }

  function setupCaptainPositionEditor() {
    if (!isCaptainEditorEnabled()) return;
    document.body.classList.add("captain-editor-active");
    captainEditorPanel = document.createElement("aside");
    captainEditorPanel.className = "captain-editor-panel";
    captainEditorPanel.innerHTML = `
      <div class="captain-editor-head">
        <strong>Editor Capitao</strong>
        <span data-captain-editor-boat></span>
      </div>
      <div class="captain-editor-row captain-editor-row-tight">
        <button type="button" data-captain-editor-prev>Anterior</button>
        <button type="button" data-captain-editor-next>Proximo</button>
      </div>
      <label>Barco
        <select data-captain-editor-ship>
          ${SHIPS.map((ship, index) => `<option value="${index}">${getCaptainEditorBoatKey(index)} - ${ship.name}</option>`).join("")}
        </select>
      </label>
      <div class="captain-editor-grid">
        <label>Nivel<input type="number" min="1" max="${CAPTAIN_MAX_LEVEL}" step="1" data-captain-editor-level></label>
        <label>Genero<select data-captain-editor-gender><option value="male">Masc.</option><option value="female">Fem.</option></select></label>
        <label>Pose<select data-captain-editor-pose><option value="idle">Idle</option><option value="celebrate">Vitoria</option><option value="hit">Dano</option></select></label>
      </div>
      <div class="captain-editor-grid">
        <label>X<input type="number" step="0.001" data-captain-editor-field="offsetX"></label>
        <label>Y<input type="number" step="0.1" data-captain-editor-field="offsetY"></label>
        <label>Conves<input type="number" step="0.001" data-captain-editor-field="deckY"></label>
        <label>Escala<input type="number" step="0.001" data-captain-editor-field="scale"></label>
        <label>Altura<input type="number" step="1" data-captain-editor-field="maxHeight"></label>
        <label>Dentro<input type="number" step="0.001" data-captain-editor-field="embed"></label>
        <label>Borda<input type="number" step="0.001" data-captain-editor-field="railOverlap"></label>
        <label>Corte pernas<input type="number" min="0" max="0.5" step="0.001" data-captain-editor-field="legCut"></label>
        <label>Camada<select data-captain-editor-layer><option value="front">Frente</option><option value="behind">Atras</option></select></label>
      </div>
      <p class="captain-editor-foot">Pe: <span data-captain-editor-foot>-</span></p>
      <textarea data-captain-editor-code readonly rows="3"></textarea>
      <div class="captain-editor-row">
        <button type="button" data-captain-editor-copy>Copiar config</button>
        <button type="button" data-captain-editor-reset>Reset barco</button>
      </div>
    `;
    document.body.appendChild(captainEditorPanel);
    captainEditorPanel.addEventListener("input", event => {
      const field = event.target?.dataset?.captainEditorField;
      if (!field) return;
      setCaptainEditorDraft(state.shipId, { [field]: Number(event.target.value) });
      updateCaptainEditorPanel(scene.captainEditorInfo);
    });
    captainEditorPanel.addEventListener("change", event => {
      const target = event.target;
      if (target.matches("[data-captain-editor-ship]")) setCaptainEditorUrlParam("ship", clamp(Math.floor(Number(target.value) || 0), 0, SHIPS.length - 1));
      if (target.matches("[data-captain-editor-level]")) setCaptainEditorUrlParam("level", clamp(Math.floor(Number(target.value) || 1), 1, CAPTAIN_MAX_LEVEL));
      if (target.matches("[data-captain-editor-gender]")) setCaptainEditorUrlParam("gender", normalizeCaptainGender(target.value) || "male");
      if (target.matches("[data-captain-editor-pose]")) setCaptainEditorUrlParam("pose", target.value || "idle");
      if (target.matches("[data-captain-editor-layer]")) {
        const config = setCaptainEditorDraft(state.shipId, { layer: target.value === "behind" ? "behind" : "front" });
        captainEditorPanelSnapshot = "";
        updateCaptainEditorPanel(scene.captainEditorInfo, config);
      }
    });
    captainEditorPanel.addEventListener("click", async event => {
      const target = event.target;
      if (target.matches("[data-captain-editor-prev]")) setCaptainEditorUrlParam("ship", Math.max(0, state.shipId - 1));
      if (target.matches("[data-captain-editor-next]")) setCaptainEditorUrlParam("ship", Math.min(SHIPS.length - 1, state.shipId + 1));
      if (target.matches("[data-captain-editor-reset]")) {
        clearCaptainEditorDraft(state.shipId);
        captainEditorPanelSnapshot = "";
        updateCaptainEditorPanel(scene.captainEditorInfo);
      }
      if (target.matches("[data-captain-editor-copy]")) {
        const text = `${formatCaptainEditorConfigEntry(state.shipId, getCaptainEditorCurrentConfig())},`;
        captainEditorPanel.querySelector("[data-captain-editor-code]").value = text;
        try { await navigator.clipboard?.writeText(text); } catch (error) {}
        target.textContent = "Copiado";
        window.setTimeout(() => { target.textContent = "Copiar config"; }, 900);
      }
    });
    window.__captainEditor = {
      getCurrent: () => ({
        shipId: state.shipId,
        key: getCaptainEditorBoatKey(state.shipId),
        shipName: SHIPS[state.shipId]?.name || "",
        config: getCaptainEditorCurrentConfig(),
        entry: `${formatCaptainEditorConfigEntry(state.shipId, getCaptainEditorCurrentConfig())},`
      }),
      getDrafts: () => ({ ...captainEditorDrafts }),
      setCurrent: patch => {
        const config = setCaptainEditorDraft(state.shipId, patch);
        captainEditorPanelSnapshot = "";
        updateCaptainEditorPanel(scene.captainEditorInfo, config);
        return config;
      },
      clearCurrent: () => {
        const config = clearCaptainEditorDraft(state.shipId);
        captainEditorPanelSnapshot = "";
        updateCaptainEditorPanel(scene.captainEditorInfo, config);
        return config;
      }
    };
    updateCaptainEditorPanel();
  }

  setupCaptainPositionEditor();

  function pickEncounter(roster) {
    const totalWeight = roster.reduce((sum, encounter) => sum + (encounter.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const encounter of roster) {
      roll -= encounter.weight || 1;
      if (roll < 0) return encounter;
    }
    return roster[roster.length - 1];
  }

  function getEndgameStageMultiplier(index) {
    if (!ENDGAME_ENEMY_MODS[index]) return 1;
    const kills = state.regionKills[index] || 0;
    if (kills >= 76) return 1.55;
    if (kills >= 51) return 1.32;
    if (kills >= 26) return 1.16;
    return 1;
  }

  function getCommonMonsterBalanceMultiplier(regionIndex) {
    const index = Math.floor(Number(regionIndex) || 0);
    return index >= 0 && index <= COMMON_MONSTER_BALANCE_LAST_REGION ? COMMON_MONSTER_BALANCE_MULTIPLIER : 1;
  }

  function getCommonMonsterDamageBalanceMultiplier(regionIndex, isBoss = false) {
    const index = Math.floor(Number(regionIndex) || 0);
    return !isBoss && index === 0 ? MAP_ONE_COMMON_MONSTER_DAMAGE_MULTIPLIER : 1;
  }

  function endgameRequirementIssues(index) {
    const req = ENDGAME_REQUIREMENTS[index];
    if (!req) return [];
    const stats = getStats();
    const upgrades = state.levels.ship + state.levels.cannons + state.levels.sails + state.levels.hull - 4;
    const tier = SHIPS[state.shipId].tier;
    const checks = [
      ["Poder Naval", stats.power, req.power],
      ["DPS", stats.dps, req.dps],
      ["HP", stats.maxHp, req.maxHp],
      ["Upgrades", upgrades, req.upgrades],
      ["Tier do navio", tier, req.tier],
      ["Prestígios", state.prestiges, req.prestiges]
    ];
    return checks.filter(([, owned, needed]) => owned < needed).map(([label, owned, needed]) => `${label}: ${formatNumber(owned)} / ${formatNumber(needed)}`);
  }

  function spawnEnemy(isBoss = false, options = {}) {
    const region = getActiveCombatRegion();
    const variation = randomBetween(.9, 1.14);
    const roster = REGION_ENCOUNTERS[state.regionIndex] || [];
    const encounter = isBoss ? null : pickEncounter(roster);
    const profile = isBoss ? null : ENEMY_CATEGORIES[encounter.category];
    const mod = ENDGAME_ENEMY_MODS[state.regionIndex] || {};
    const stage = getEndgameStageMultiplier(state.regionIndex);
    const commonBalance = isBoss ? 1 : getCommonMonsterBalanceMultiplier(state.regionIndex);
    const damageBalance = getCommonMonsterDamageBalanceMultiplier(state.regionIndex, isBoss);
    const enemyName = isBoss ? region.boss : encounter.name;
    const visual = inferEnemyVisual(enemyName, region, isBoss ? "BOSS" : encounter.category, isBoss ? 5 : encounter.tier, isBoss);
    const hp = Math.round(region.baseHp * variation * (isBoss ? 34 * (mod.bossHp || 1) : profile.hp * stage * (mod.hp || 1) * commonBalance));
    const spawnEndsAt = isBoss ? scene.time + BOSS_SPAWN_ANIMATION_SECONDS : 0;
    state.combat.enemy = {
      name: enemyName,
      kind: isBoss ? `BOSS ${visual.label}` : visual.label,
      category: isBoss ? "BOSS" : encounter.category,
      visual,
      animation: createEnemySpriteAnimation(enemyName),
      visualKind: isBoss ? region.kind : profile.visual,
      visualTier: isBoss ? 5 : encounter.tier,
      isBoss,
      isSurpriseBoss: Boolean(options.surprise),
      spawnEndsAt,
      maxHp: hp,
      hp,
      damage: Math.round(region.baseDamage * variation * (isBoss ? 3.5 * (mod.bossDamage || 1) : profile.damage * stage * (mod.damage || 1) * commonBalance * damageBalance)),
      armor: Math.round((isBoss ? 22 + state.regionIndex * 9 : (2 + state.regionIndex * 5) * profile.armor) * (isBoss ? (mod.bossArmor || 1) : (mod.armor || 1))),
      evasion: Math.min(.28, (isBoss ? .035 : profile.evasion) + (mod.evasion || 0)),
      attackSpeed: (isBoss ? .82 : profile.attackSpeed) * (mod.attackSpeed || 1),
      skillResist: mod.skillResist || 0,
      special: mod.special || "",
      goldMultiplier: isBoss ? 1 : profile.gold,
      xpMultiplier: isBoss ? 1 : profile.xp,
      bonusGoldDrops: isBoss ? {} : profile.goldDrops || profile.drops || {},
      burnTime: 0,
      burnDps: 0,
      slowed: 0,
      defeated: false
    };
    if (state.combat.enemy.animation && isBoss) {
      state.combat.enemy.animation.spawnStartedAt = scene.time;
      state.combat.enemy.animation.spawnUntil = spawnEndsAt;
      state.combat.enemy.animation.poseName = "spawn";
      state.combat.enemy.animation.poseChangedAt = scene.time;
    }
    state.combat.attackTimer = 0;
    state.combat.petAttackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    addLog(isBoss ? `${options.surprise ? "Boss surpresa: " : ""}${region.boss} emergiu para o duelo!` : `${state.combat.enemy.name} avistado a estibordo.`, isBoss ? "danger-text" : "");
  }

  function isBossIntroActive(enemy = state.combat.enemy) {
    return Boolean(enemy?.isBoss && !enemy.defeated && Number(enemy.spawnEndsAt || 0) > scene.time);
  }

  function canTriggerSurpriseBoss() {
    const enemy = state.combat.enemy;
    if (state.combat.repairing || state.combat.playerHp <= 0) return false;
    if (pendingBossMapAdvanceTimer || pendingSurpriseBossTimer || isBossIntroActive(enemy)) return false;
    if (enemy?.isBoss || enemy?.defeated) return false;
    return true;
  }

  function canLootKindTriggerSurpriseBoss(kind, regionIndex = state.regionIndex) {
    const mapNumber = Math.floor(Number(regionIndex) || 0) + 1;
    const allowedKinds = mapNumber === 3 ? MAP_3_BOSS_SURPRISE_LOOT_KINDS : BOSS_SURPRISE_LOOT_KINDS;
    return allowedKinds.has(kind);
  }

  function tryTriggerSurpriseBossFromLoot(kind) {
    if (!canLootKindTriggerSurpriseBoss(kind)) return false;
    if (Math.random() >= BOSS_SURPRISE_CHANCE) return false;
    if (!canTriggerSurpriseBoss()) return false;
    state.combat.specialCombatResumeRunning = Boolean(state.combat.running);
    state.combat.running = true;
    state.hasStarted = true;
    state.combat.repairing = false;
    state.combat.enemy = null;
    state.combat.spawnTimer = -BOSS_SURPRISE_SPAWN_DELAY_MS;
    scene.resetPlayerShipAnimation();
    scene.triggerBossSurpriseAlert();
    toast(BOSS_SURPRISE_MESSAGE, "danger-toast");
    addLog(BOSS_SURPRISE_MESSAGE, "danger-text");
    const spawnSurpriseBossWhenReady = () => {
      pendingSurpriseBossTimer = 0;
      if (!canTriggerSurpriseBoss()) return;
      if (!ensureCriticalCombatAssetsReady()) {
        pendingSurpriseBossTimer = window.setTimeout(spawnSurpriseBossWhenReady, 350);
        return;
      }
      state.combat.spawnTimer = 0;
      spawnEnemy(true, { surprise: true });
      renderAll(false);
    };
    pendingSurpriseBossTimer = window.setTimeout(spawnSurpriseBossWhenReady, BOSS_SURPRISE_SPAWN_DELAY_MS);
    return true;
  }

  function dealToEnemy(rawDamage, options = {}) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    if (isBossIntroActive(enemy)) return;
    const mitigation = options.ignoreArmor ? 1 : 100 / (100 + enemy.armor);
    const skillPenalty = options.skill ? 1 - (enemy.skillResist || 0) : 1;
    const damage = Math.max(1, Math.round(rawDamage * mitigation * skillPenalty));
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.isArena && arenaState.battle) arenaState.battle.damageDealt += damage;
    state.lifetime.highestDamage = Math.max(state.lifetime.highestDamage, damage);
    const hitTarget = enemy;
    const markHit = () => {
      if (state.combat.enemy === hitTarget && hitTarget.hp > 0 && !hitTarget.defeated) scene.markEnemyHit(hitTarget);
    };
    if (options.pet) {
      scene.petStrike(options.pet);
      setTimeout(() => { markHit(); scene.floatDamage(damage, true, options.color || "#bff7ff"); }, 180);
    } else if (options.sabotage) {
      scene.sabotageEnemy(options.color || "#b68cff");
      setTimeout(() => { markHit(); scene.floatDamage(damage, true, options.color || "#f1c7ff"); }, 120);
    } else {
      if (options.manual) scene.manualAttackFeedback(options.color || "#9ff4e9");
      scene.fire(true, options.color || "#ffd37a");
      setTimeout(() => { markHit(); scene.burst(true, options.color || "#f4a34c"); scene.floatDamage(damage, true, options.color || "#fff0bc"); }, 340);
    }
    if (enemy.hp <= 0) defeatEnemy();
  }

  function basicAttack(options = {}) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const stats = getStats();
    const hitChance = stats.precision * (1 - (enemy.evasion || 0));
    if (Math.random() > hitChance) {
      if (options.manual) scene.manualAttackFeedback("#9ff4e9");
      scene.fire(true, options.manual ? "#9ff4e9" : "#cbd6d0");
      addLog(enemy.evasion > .08 ? `${enemy.name} escapou com uma manobra veloz.` : "O disparo passou longe do alvo.");
      return;
    }
    const critical = Math.random() < stats.crit;
    const raw = stats.damage * randomBetween(.91, 1.09) * (critical ? 2 : 1);
    const attackColor = options.manual ? (critical ? "#fff19a" : "#9ff4e9") : critical ? "#ffe268" : "#ffd37a";
    dealToEnemy(raw, { color: attackColor, manual: options.manual });
    if (critical) {
      scene.floatDamage("Crítico!", true, attackColor);
      addLog(`Acerto crítico de ${formatNumber(raw)}!`, "loot");
    }
    if (options.allowDoubleStrike !== false && !options.doubleStrike && state.combat.enemy && !state.combat.enemy.defeated && Math.random() < stats.doubleAttackChance) {
      scene.floatDamage("Ataque Duplo!", true, "#9ff4e9");
      addLog("Ataque duplo do Capitão!", "loot");
      setTimeout(() => basicAttack({ doubleStrike: true }), 90);
    }
  }

  function manualShipAttack() {
    if (shouldShowInitialCaptainGate()) {
      toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
      return false;
    }
    if (state.combat.repairing || state.combat.playerHp <= 0) return false;
    if (!state.combat.running) {
      state.combat.running = true;
      state.hasStarted = true;
      trackAction("firstCombat");
    }
    if (!state.combat.enemy) {
      if (isArenaSceneActive()) return false;
      if (!ensureCriticalCombatAssetsReady()) {
        renderCombatHud();
        return false;
      }
      state.combat.spawnTimer = 0;
      spawnEnemy(false);
    }
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated || isBossIntroActive(enemy)) return false;
    if (enemy.isArena || isArenaBattleActive()) return false;
    if (isArenaBattleWaiting()) {
      toast(`Arena começa em ${formatSeconds(getArenaStartRemainingSeconds())}.`, "gold-toast");
      return false;
    }
    basicAttack({ manual: true, allowDoubleStrike: false });
    completeManualAttackTutorial();
    renderCombatHud();
    return true;
  }

  function castSkill(key) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const meta = SKILL_META[key];
    const level = state.skills[key].level;
    const base = getStats().damage * (meta.factor + (level - 1) * .24);
    if (key === "fire") { dealToEnemy(base, { color: "#ff6d3a", skill: true }); enemy.burnTime = meta.burnDuration + (level - 1) * .25; enemy.burnDps = getStats().damage * (meta.burnFactor + (level - 1) * .04) * (1 - (enemy.skillResist || 0)); }
    if (key === "ice") { dealToEnemy(base, { color: "#81e8ff", skill: true }); enemy.slowed = meta.slowDuration + (level - 1) * .2; }
    if (key === "ghost") dealToEnemy(base, { color: "#c58cff", ignoreArmor: true, skill: true });
    if (key === "chain") { dealToEnemy(base, { color: "#d9e4df", skill: true }); state.combat.enemyAttackTimer = Math.max(0, state.combat.enemyAttackTimer - meta.attackDelay); }
    trackAction("skill", { key });
    addLog(`${meta.name} disparado automaticamente.`, "loot");
  }

  function castCaptainManualSkill(key = CAPTAIN_MANUAL_SKILL_KEY) {
    const meta = CAPTAIN_MANUAL_SKILL_META[key];
    if (!meta) return;
    if (key === CAPTAIN_REPAIR_SKILL_KEY) return castEmergencyRepairSkill();
    if (!canUpgradeCaptainSystems()) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return toast("Sabotar Inimigo precisa de um alvo vivo.", "danger-toast");
    if (enemy.isArena || isArenaBattleActive()) return;
    if (isArenaBattleWaiting()) return toast(`Arena começa em ${formatSeconds(getArenaStartRemainingSeconds())}.`, "gold-toast");
    const remaining = getCaptainManualSkillCooldownRemaining(key);
    if (remaining > 0) return toast(`Sabotar Inimigo recarrega em ${formatSeconds(remaining)}.`, "danger-toast");
    const skill = getCaptainManualSkillState(key);
    skill.nextReadyAt = Date.now() + meta.cooldown * 1000;
    const stats = getStats();
    const damage = getCaptainManualSkillDamage(key, stats);
    if (key === CAPTAIN_MANUAL_SKILL_KEY) scene.markPlayerShipAttack();
    scene.celebrateCaptain(.9);
    dealToEnemy(damage, { sabotage: true, ignoreArmor: true, color: "#b68cff" });
    trackAction("skill", { key });
    addLog(`Sabotar Inimigo causou ${formatNumber(damage)} de dano direto.`, "loot");
    renderAll(false);
    saveGame();
  }

  function castEmergencyRepairSkill() {
    const meta = CAPTAIN_MANUAL_SKILL_META[CAPTAIN_REPAIR_SKILL_KEY];
    if (!canUpgradeCaptainSystems()) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    if (isArenaBattleActive()) return toast("Restaurar Navio indisponível durante a Arena.", "danger-toast");
    if (isArenaBattleWaiting()) return toast(`Arena começa em ${formatSeconds(getArenaStartRemainingSeconds())}.`, "gold-toast");
    if (state.combat.repairing) return toast("Restaurar Navio já está em andamento.", "danger-toast");
    if (state.combat.playerHp <= 0) return toast("O navio está destruído. Aguarde o reparo automático.", "danger-toast");
    const maxHp = getStats().maxHp;
    if (state.combat.playerHp >= maxHp) return toast("Navio já está com vida máxima.", "gold-toast");
    const remaining = getCaptainManualSkillCooldownRemaining(CAPTAIN_REPAIR_SKILL_KEY);
    if (remaining > 0) return toast(`Restaurar Navio recarrega em ${formatSeconds(remaining)}.`, "danger-toast");
    const skill = getCaptainManualSkillState(CAPTAIN_REPAIR_SKILL_KEY);
    skill.nextReadyAt = Date.now() + meta.cooldown * 1000;
    startEmergencyRepair();
    saveGame();
  }

  function petAttack() {
    const enemy = state.combat.enemy;
    const pet = getEquippedPet();
    if (!enemy || enemy.defeated || !pet) return;
    dealToEnemy(pet.damage * randomBetween(.94, 1.06), { pet, color: pet.color });
    state.lifetime.petAttacks += 1;
  }

  function applyShipDamageReduction(rawDamage, stats = getStats()) {
    return rawDamage * (1 - Math.min(.75, stats.armorReduction || 0));
  }

  function enemyAttack() {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    scene.markEnemyAttack(enemy);
    const stats = getStats();
    if (Math.random() < stats.evasion) {
      scene.floatDamage("Esquivou!", false, "#9ff4e9");
      addLog("Esquivou! Ataque inimigo evitado.", "loot");
      return;
    }
    const damage = Math.max(1, Math.round(applyShipDamageReduction(enemy.damage * randomBetween(.87, 1.12), stats)));
    state.combat.playerHp = Math.max(0, state.combat.playerHp - damage);
    let totalDamage = damage;
    if (enemy.special && state.combat.playerHp > 0 && Math.random() < (enemy.isBoss ? .36 : .18)) {
      const extra = enemy.special.includes("chamas") ? Math.round(enemy.damage * .18) : enemy.special.includes("glacial") ? Math.round(enemy.damage * .12) : enemy.special.includes("abissal") ? Math.round(enemy.damage * .22) : Math.round(enemy.damage * .1);
      const extraDamage = Math.max(1, Math.round(applyShipDamageReduction(extra, stats)));
      state.combat.playerHp = Math.max(0, state.combat.playerHp - extraDamage);
      totalDamage += extraDamage;
      if (enemy.special.includes("glacial")) state.combat.attackTimer = Math.max(0, state.combat.attackTimer - 450);
      if (enemy.special.includes("abissal")) state.combat.petAttackTimer = Math.max(0, state.combat.petAttackTimer - 650);
      addLog(`${enemy.name} aplica ${enemy.special}.`, "danger-text");
    }
    if (enemy.isArena && arenaState.battle) arenaState.battle.damageReceived += totalDamage;
    if (state.combat.playerHp > 0) scene.markPlayerShipHit();
    const attackColor = enemy.visual?.attack === "ghost" ? "#9ff4e9" : enemy.visual?.attack === "ice" ? "#8ee8ff" : enemy.visual?.attack === "fire" ? "#ff7048" : enemy.visual?.attack === "abyss" ? "#b18cff" : enemy.visual?.attack === "wave" || enemy.visual?.attack === "splash" ? "#7bdfff" : enemy.visual?.attack === "arrow" || enemy.visual?.attack === "harpoon" ? "#e3c06f" : "#ff8c68";
    scene.fire(false, attackColor);
    setTimeout(() => { scene.burst(false, attackColor); scene.floatDamage(damage, false, attackColor); }, 340);
    if (state.combat.playerHp <= 0) {
      if (enemy.isArena) {
        finishArenaBattle(false);
        return;
      }
      if (enemy.isBoss) cancelBossBattle();
      else { scene.markPlayerShipDeath(); beginRepair(); }
    }
  }

  function clearCombatTimers() {
    state.combat.attackTimer = 0;
    state.combat.petAttackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    Object.entries(SKILL_META).forEach(([key, meta]) => { state.skills[key].remaining = getSkillCooldown(key, state.skills[key].level); });
  }

  function getAutoRepairFee(regionIndex = state.regionIndex) {
    const map = clamp(Math.floor(Number(regionIndex) || 0) + 1, 1, REGIONS.length);
    return AUTO_REPAIR_FEES.find(entry => map <= entry.maxMap)?.gold || 25000;
  }

  function chargeAutoRepairFee(regionIndex = state.regionIndex, retreatedToPreviousMap = false) {
    const fee = getAutoRepairFee(regionIndex);
    const retreatText = retreatedToPreviousMap ? " e retornando ao mapa anterior" : "";
    if (state.resources.ouro >= fee) {
      state.resources.ouro -= fee;
      addLog(`Voce afundou: -${formatNumber(fee)} Ouro para recuperar o navio${retreatText}.`, "danger-text");
      toast(`Voce afundou: -${formatNumber(fee)} Ouro${retreatText}.`, "danger-toast repair-cost-toast", { mobileAllowed: true });
      return true;
    }
    addLog(`Voce afundou, esta pobre${retreatText}. Reparo automatico gratuito aplicado.`, "danger-text");
    toast(`Voce afundou, esta pobre${retreatText}. Reparo gratuito aplicado.`, "danger-toast repair-cost-toast", { mobileAllowed: true });
    return false;
  }

  function moveToPreviousMapAfterSinking() {
    const previousRegion = state.regionIndex;
    if (previousRegion <= 0) return false;
    state.regionIndex = Math.max(0, previousRegion - 1);
    state.combat.enemy = null;
    state.combat.spawnTimer = 0;
    addLog(`Navio recuou para ${getCombatRegionLabel(REGIONS[state.regionIndex])} apos afundar.`, "danger-text");
    queueRegionPreload(state.regionIndex);
    scheduleNearbyRegionPreload();
    return true;
  }

  function applyPausedHpRegen(dt) {
    if (state.combat.running || state.combat.repairing || isArenaSceneActive() || state.combat.playerHp <= 0) return;
    const bonus = (getCaptainBonuses().hpRegenPercentPerSecond || 0) + percentFromPetBonus(getActivePetBonuses().hpRegenPercentPer5s);
    if (bonus <= 0) {
      state.combat.pausedRegenTimer = 0;
      return;
    }
    const maxHp = getStats().maxHp;
    if (state.combat.playerHp >= maxHp) {
      state.combat.pausedRegenTimer = 0;
      return;
    }
    state.combat.pausedRegenTimer = Math.max(0, Number(state.combat.pausedRegenTimer || 0)) + dt;
    let healed = false;
    while (state.combat.pausedRegenTimer >= CAPTAIN_HP_REGEN_INTERVAL_SECONDS) {
      state.combat.pausedRegenTimer -= CAPTAIN_HP_REGEN_INTERVAL_SECONDS;
      state.combat.playerHp = Math.min(maxHp, state.combat.playerHp + maxHp * bonus);
      healed = true;
    }
    if (healed) saveGame();
  }

  function cancelBossBattle(options = {}) {
    const bossName = state.combat.enemy?.name || "Boss";
    const voluntary = Boolean(options.voluntary);
    const disabledAuto = state.autoChallengeBoss;
    state.autoChallengeBoss = false;
    state.combat.enemy = null;
    state.combat.repairing = false;
    state.combat.repairStarted = 0;
    state.combat.repairDuration = AUTO_REPAIR_DURATION_MS;
    state.combat.repairStartHp = 0;
    state.combat.repairTargetHp = getStats().maxHp;
    state.combat.repairSource = "";
    state.combat.repairResumeRunning = false;
    state.combat.playerHp = getStats().maxHp;
    state.combat.spawnTimer = 0;
    state.combat.running = voluntary ? Boolean(state.combat.specialCombatResumeRunning) : true;
    state.combat.specialCombatResumeRunning = false;
    clearCombatTimers();
    if (!voluntary) scene.showRepairEffect(1.25);
    if (voluntary || disabledAuto) {
      addLog(voluntary ? `Voce saiu do combate contra ${bossName}.` : `Derrota contra ${bossName}. Navio restaurado.`, "danger-text");
      toast(voluntary ? "Combate contra boss encerrado." : "Derrota para o boss. Boss Auto foi desligado.", "danger-toast");
      renderAll(false);
      saveGame();
      return;
    }
    addLog(`Derrota contra ${bossName}. Navio restaurado.`, "danger-text");
    toast("Derrota para o boss — navio restaurado para uma nova tentativa.", "danger-toast");
    saveGame();
  }

  function beginRepair() {
    const maxHp = getStats().maxHp;
    const defeatedBy = state.combat.enemy?.name || "inimigo";
    const defeatedRegionIndex = state.regionIndex;
    const resumeRunning = Boolean(state.combat.running);
    const willRetreat = defeatedRegionIndex > 0;
    chargeAutoRepairFee(defeatedRegionIndex, willRetreat);
    moveToPreviousMapAfterSinking();
    state.combat.repairing = true;
    state.combat.repairStarted = performance.now();
    state.combat.repairDuration = AUTO_REPAIR_DURATION_MS;
    state.combat.repairStartHp = Math.max(0, Number(state.combat.playerHp || 0));
    state.combat.repairTargetHp = maxHp;
    state.combat.repairSource = "auto";
    state.combat.repairResumeRunning = resumeRunning;
    state.combat.running = false;
    scene.showRepairEffect(AUTO_REPAIR_DURATION_MS / 1000);
    trackAction("repair");
    addLog(`Derrota contra ${defeatedBy}. Reparo iniciado.`, "danger-text");
    toast("Navio destruído — reparo automático em andamento.", "danger-toast");
  }

  function finishRepair(forced = false) {
    state.combat.repairing = false;
    const maxHp = getStats().maxHp;
    const targetHp = Math.max(1, Number(state.combat.repairTargetHp || maxHp) || maxHp);
    const repairSource = state.combat.repairSource || "auto";
    const resumeRunning = Boolean(state.combat.repairResumeRunning);
    state.combat.playerHp = clamp(Math.round(targetHp), 1, maxHp);
    state.combat.repairStarted = 0;
    state.combat.repairDuration = AUTO_REPAIR_DURATION_MS;
    state.combat.repairStartHp = 0;
    state.combat.repairTargetHp = maxHp;
    state.combat.repairSource = "";
    state.combat.repairResumeRunning = false;
    state.combat.attackTimer = 0;
    state.combat.running = resumeRunning;
    scene.resetPlayerShipAnimation();
    scene.hideRepairEffect();
    addLog(forced ? "Protocolo de segurança concluiu o reparo." : repairSource === "manual" ? "Restaurar Navio concluído." : "Reparo concluído. Retomando o combate.", "loot");
  }

  function startEmergencyRepair() {
    const maxHp = getStats().maxHp;
    const currentHp = clamp(Number(state.combat.playerHp || 0), 0, maxHp);
    const repairPercent = getCaptainRepairPercent();
    const targetHp = Math.min(maxHp, currentHp + maxHp * repairPercent);
    const resumeRunning = Boolean(state.combat.running);
    state.combat.repairing = true;
    state.combat.repairStarted = performance.now();
    state.combat.repairDuration = EMERGENCY_REPAIR_DURATION_MS;
    state.combat.repairStartHp = currentHp;
    state.combat.repairTargetHp = targetHp;
    state.combat.repairSource = "manual";
    state.combat.repairResumeRunning = resumeRunning;
    state.combat.running = false;
    state.hasStarted = true;
    scene.resetPlayerShipAnimation();
    scene.showRepairEffect(EMERGENCY_REPAIR_DURATION_MS / 1000);
    trackAction("repair");
    addLog(`Restaurar Navio iniciado: ${Math.round(repairPercent * 100)}% da vida máxima em 5s.`, "loot");
    toast("Restaurar Navio iniciado.", "gold-toast");
    commitGame(false);
  }

  function rewardMaterials(multiplier = 1, enemy = state.combat.enemy) {
    const region = REGIONS[state.regionIndex];
    const lootBonus = state.equipment.compass ? 1.08 : 1;
    let extraGold = 0;
    const regionDrops = region.goldDrops || region.drops || {};
    const enemyDrops = enemy?.bonusGoldDrops || enemy?.bonusDrops || {};
    const dropKeys = new Set([...Object.keys(regionDrops), ...Object.keys(enemyDrops)]);
    dropKeys.forEach(key => {
      const chance = Math.min(.88, (regionDrops[key] || 0) + (enemyDrops[key] || 0));
      if (Math.random() < chance * lootBonus * (multiplier > 1 ? 1.65 : 1)) {
        const amount = Math.max(1, Math.round(integerBetween(1, 1 + Math.floor(state.regionIndex / 2)) * multiplier));
        extraGold += Math.round(convertResourceAmountToGold(key, amount));
      }
    });
    if (extraGold <= 0) return [];
    const gold = calculateGoldReward(extraGold);
    state.resources.ouro += gold;
    state.lifetime.gold += gold;
    trackAction("gold", { amount: gold });
    return [`${formatNumber(gold)} Ouro extra`];
  }

  function scheduleBossMapAdvance(defeatedRegionIndex) {
    if (pendingBossMapAdvanceTimer) window.clearTimeout(pendingBossMapAdvanceTimer);
    const advanceDelay = scene?.hasPendingChest?.("boss") ? Math.max(BOSS_MAP_ADVANCE_DELAY_MS, 6500) : BOSS_MAP_ADVANCE_DELAY_MS;
    state.combat.enemy = null;
    state.combat.spawnTimer = -advanceDelay;
    pendingBossMapAdvanceTimer = window.setTimeout(() => {
      pendingBossMapAdvanceTimer = 0;
      if (defeatedRegionIndex < REGIONS.length - 1) {
        const completedPrologue = defeatedRegionIndex === PRIMITIVE_REGIONS.length - 1;
        const nextRegionIndex = defeatedRegionIndex + 1;
        const shouldAutoTravel = state.regionIndex === defeatedRegionIndex;
        state.unlockedRegions = Math.max(state.unlockedRegions, nextRegionIndex + 1);
        state.maxRegionReached = Math.max(state.maxRegionReached, nextRegionIndex);
        if (shouldAutoTravel) {
          state.regionIndex = nextRegionIndex;
          state.combat.enemy = null;
          state.combat.spawnTimer = -700;
        }
        queueRegionPreload(nextRegionIndex);
        scheduleNearbyRegionPreload();
        toast(`${REGIONS[nextRegionIndex].name} foi desbloqueada.`, "gold-toast");
        addLog(`Novo mapa desbloqueado: ${REGIONS[nextRegionIndex].name}.`, "loot");
        if (completedPrologue) setTimeout(() => toast("A Era Primitiva ficou para trás. Agora começa a verdadeira jornada pirata.", "gold-toast"), 450);
      } else {
        state.combat.enemy = null;
        if (state.regionIndex === defeatedRegionIndex) state.combat.running = false;
        toast("Você conquistou o Abismo e se tornou uma lenda!", "gold-toast");
      }
      renderAll(false);
      saveGame();
    }, advanceDelay);
  }

  function defeatEnemy(options = {}) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    enemy.defeated = true;
    if (enemy.isArena) {
      scene.queueEnemyDeath(enemy);
      scene.celebrateCaptain(1.8);
      finishArenaBattle(true);
      return;
    }
    scene.queueEnemyDeath(enemy);
    scene.celebrateCaptain(enemy.isBoss ? 2.8 : 1.65);
    const region = REGIONS[state.regionIndex];
    if (getEquippedPet()) state.lifetime.petKills += 1;
    if (enemy.isBoss) {
      const isSurpriseBoss = Boolean(enemy.isSurpriseBoss);
      const reward = calculateGoldReward(integerBetween(region.bossGold[0], region.bossGold[1]));
      state.resources.ouro += reward;
      state.lifetime.gold += reward;
      state.lifetime.bosses += 1;
      trackAction("gold", { amount: reward });
      trackAction("boss");
      if (getEquippedPet()) state.lifetime.bossesWithPet += 1;
      if (!isSurpriseBoss) state.bossesDefeated[state.regionIndex] = true;
      gainXp(region.xp * 35);
      const materials = rewardMaterials(8, enemy);
      trySpawnChestDrop("boss", enemy);
      addLog(`${isSurpriseBoss ? "Boss surpresa derrotado" : "Boss derrotado"}: ${region.boss}. Drop: ${formatNumber(reward)} Ouro.`, "loot");
      toast(`${region.boss}${isSurpriseBoss ? " surpresa" : ""} foi derrotado!`, "gold-toast");
      if (isSurpriseBoss) {
        state.combat.enemy = null;
        state.combat.spawnTimer = -BOSS_MAP_ADVANCE_DELAY_MS;
      } else {
        scheduleBossMapAdvance(state.regionIndex);
      }
      if (materials.length) addLog(`Drop do boss: ${materials.join(", ")}.`, "loot");
    } else {
      const weightedGold = region.gold * (enemy.goldMultiplier || 1) * randomBetween(.88, 1.15);
      const gold = calculateGoldReward(clamp(weightedGold, region.goldRange[0], region.goldRange[1]));
      state.resources.ouro += gold;
      state.lifetime.gold += gold;
      state.lifetime.enemies += 1;
      addShipEnemyKills(state.shipId, 1);
      state.regionKills[state.regionIndex] += 1;
      trackAction("gold", { amount: gold });
      gainXp(Math.round(region.xp * (enemy.xpMultiplier || 1) * randomBetween(.92, 1.08)));
      const materials = rewardMaterials(1, enemy);
      trySpawnChestDrop("monster", enemy);
      trackAction("enemy", { onlyGold: materials.length === 0, multiResource: materials.length >= 2, survivor: state.combat.playerHp > 0 && state.combat.playerHp <= getStats().maxHp * .05 });
      addLog(materials.length ? `Vitória contra ${enemy.name}. Drop: ${formatNumber(gold)} Ouro + ${materials.join(", ")}.` : `Vitória contra ${enemy.name}. Drop: ${formatNumber(gold)} Ouro.`, materials.length ? "loot" : "");
      if (state.regionKills[state.regionIndex] === 100 && !state.bossesDefeated[state.regionIndex]) toast(`${region.boss} está disponível para desafio!`, "gold-toast");
      state.combat.enemy = null;
      state.combat.spawnTimer = 0;
    }
    renderAll(false);
  }

  function resetShip() {
    if (isArenaBattleActive()) {
      toast("Conclua ou aguarde o resultado da Arena antes de reparar o navio.", "danger-toast");
      return;
    }
    state.combat.repairing = false;
    state.combat.repairStarted = 0;
    state.combat.repairDuration = AUTO_REPAIR_DURATION_MS;
    state.combat.repairStartHp = 0;
    state.combat.repairTargetHp = getStats().maxHp;
    state.combat.repairSource = "";
    state.combat.playerHp = getStats().maxHp;
    state.combat.enemy = null;
    scene.resetPlayerShipAnimation();
    clearCombatTimers();
    state.combat.spawnTimer = getSpawnDelay();
    state.combat.running = true;
    state.hasStarted = true;
    addLog("Estado do navio restaurado com segurança.", "loot");
    toast("Navio restaurado. O combate foi reiniciado.");
  }

  function getEnemyAttackInterval(enemy) {
    if (enemy?.isArena) return ARENA_BALANCED_ATTACK_INTERVAL_MS;
    return (enemy?.isBoss ? 1450 : 1900) * (enemy?.attackSpeed || 1) * (enemy?.slowed > 0 ? 1.65 : 1);
  }

  function combatTick(dt, now) {
    const arenaBattleActive = isArenaBattleActive();
    if (!arenaBattleActive) {
      state.lifetime.playSeconds += dt;
      state.totalActivePlaySeconds = Math.max(0, Number(state.totalActivePlaySeconds) || 0) + dt;
    }
    if (state.combat.repairing) {
      const elapsed = now - state.combat.repairStarted;
      const duration = Math.max(1, Number(state.combat.repairDuration || AUTO_REPAIR_DURATION_MS));
      const progress = clamp(elapsed / duration, 0, 1);
      const maxHp = getStats().maxHp;
      const startHp = clamp(Number(state.combat.repairStartHp || 0), 0, maxHp);
      const targetHp = clamp(Number(state.combat.repairTargetHp || maxHp), 1, maxHp);
      state.combat.playerHp = Math.min(maxHp, startHp + (targetHp - startHp) * progress);
      if (elapsed >= duration || elapsed > duration + 2000) finishRepair(elapsed > duration + 2000);
      return;
    }
    if (!state.combat.running) {
      applyPausedHpRegen(dt);
      state.combat.hpRegenTimer = 0;
      return;
    }
    state.combat.pausedRegenTimer = 0;
    const captainBonuses = getCaptainBonuses();
    const petHpRegenPer5s = percentFromPetBonus(getActivePetBonuses().hpRegenPercentPer5s);
    if (!arenaBattleActive && (captainBonuses.hpRegenPercentPerSecond > 0 || petHpRegenPer5s > 0) && state.combat.playerHp > 0) {
      const maxHp = getStats().maxHp;
      if (captainBonuses.hpRegenPercentPerSecond > 0 && state.combat.playerHp < maxHp) {
        const hpRegenPerSecond = captainBonuses.hpRegenPercentPerSecond / CAPTAIN_HP_REGEN_INTERVAL_SECONDS;
        state.combat.playerHp = Math.min(maxHp, state.combat.playerHp + maxHp * hpRegenPerSecond * dt);
      }
      if (petHpRegenPer5s > 0 && state.combat.playerHp < maxHp) {
        state.combat.hpRegenTimer = Math.max(0, Number(state.combat.hpRegenTimer || 0)) + dt;
        while (state.combat.hpRegenTimer >= CAPTAIN_HP_REGEN_INTERVAL_SECONDS && state.combat.playerHp < maxHp) {
          state.combat.hpRegenTimer -= CAPTAIN_HP_REGEN_INTERVAL_SECONDS;
          state.combat.playerHp = Math.min(maxHp, state.combat.playerHp + maxHp * petHpRegenPer5s);
        }
      } else {
        state.combat.hpRegenTimer = 0;
      }
    } else {
      state.combat.hpRegenTimer = 0;
    }
    if (!state.combat.enemy) {
      if (isArenaSceneActive()) return;
      if (!ensureCriticalCombatAssetsReady()) {
        state.combat.spawnTimer = 0;
        return;
      }
      if (maybeAutoChallengeBoss()) return;
      state.combat.spawnTimer += dt * 1000;
      if (state.combat.spawnTimer >= getSpawnDelay()) { state.combat.spawnTimer = 0; spawnEnemy(false); }
      return;
    }
    const enemy = state.combat.enemy;
    if (enemy.defeated) return;
    if (isBossIntroActive(enemy)) return;
    const arenaEnemyActive = Boolean(enemy.isArena && arenaBattleActive);
    if (isArenaBattleWaiting()) {
      state.combat.attackTimer = 0;
      state.combat.petAttackTimer = 0;
      state.combat.enemyAttackTimer = 0;
      return;
    }
    if (enemy.burnTime > 0) {
      enemy.burnTime -= dt;
      enemy.hp = Math.max(0, enemy.hp - enemy.burnDps * dt);
      if (enemy.hp <= 0) defeatEnemy();
    }
    if (enemy.slowed > 0) enemy.slowed -= dt;
    const stats = getStats();
    const playerAttackInterval = arenaEnemyActive ? ARENA_BALANCED_ATTACK_INTERVAL_MS : stats.attackInterval;
    if (arenaEnemyActive || isAutoAttackUnlocked()) {
      state.combat.attackTimer += dt * 1000;
      let shots = 0;
      while (state.combat.attackTimer >= playerAttackInterval && shots < 4 && state.combat.enemy) {
        state.combat.attackTimer -= playerAttackInterval;
        basicAttack({ allowDoubleStrike: !arenaEnemyActive });
        shots++;
      }
    } else {
      state.combat.attackTimer = 0;
    }
    if (!state.combat.enemy) return;
    const pet = getEquippedPet();
    if (!arenaEnemyActive && pet) {
      state.combat.petAttackTimer += dt * 1000;
      let petStrikes = 0;
      while (state.combat.petAttackTimer >= pet.interval * 1000 && petStrikes < 3 && state.combat.enemy) { state.combat.petAttackTimer -= pet.interval * 1000; petAttack(); petStrikes++; }
    }
    if (!state.combat.enemy) return;
    const enemyInterval = getEnemyAttackInterval(enemy);
    state.combat.enemyAttackTimer += dt * 1000;
    if (state.combat.enemyAttackTimer >= enemyInterval) { state.combat.enemyAttackTimer -= enemyInterval; enemyAttack(); }
    if (arenaEnemyActive) return;
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      if (!isSkillUnlocked(key) || !state.skills[key].auto || !state.combat.enemy) return;
      state.skills[key].remaining -= dt;
      if (state.skills[key].remaining <= 0) {
        castSkill(key);
        state.skills[key].remaining = getSkillCooldown(key, state.skills[key].level, stats.speed);
      }
    });
  }

  function gameLoop(timestamp) {
    const dt = Math.min(.12, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    scene.update(dt);
    combatTick(dt, timestamp);
    scene.draw();
    if (timestamp - lastUiRefresh > 110) { renderCombatHud(); updateSkillCooldowns(); lastUiRefresh = timestamp; }
    if (timestamp - lastSave > 5000) { saveGame(); lastSave = timestamp; }
    requestAnimationFrame(gameLoop);
  }

  function applyOfflineProgress(seconds, showModal = true) {
    if (!state.hasStarted || seconds < 30) return;
    const capped = Math.min(86400, seconds);
    const region = REGIONS[state.regionIndex];
    const stats = getStats();
    const prestigeIdle = getPrestigeBonuses().idle;
    const efficiency = .62 * (1 + prestigeIdle);
    const cycle = (region.baseHp * getCommonMonsterBalanceMultiplier(state.regionIndex)) / Math.max(1, stats.dps) + getSpawnDelay() / 1000;
    const kills = Math.max(1, Math.floor(capped / cycle * efficiency * OFFLINE_REWARD_RATE));
    const gold = calculateGoldReward(kills * region.gold * .94);
    const xp = Math.round(kills * region.xp * .94);
    state.resources.ouro += gold;
    state.lifetime.gold += gold;
    state.lifetime.enemies += kills;
    addShipEnemyKills(state.shipId, kills);
    state.regionKills[state.regionIndex] += kills;
    trackAction("gold", { amount: gold });
    trackAction("enemy", { count: kills });
    trackAction("offline", { seconds: capped });
    gainXp(xp);
    const rewards = [{ name: "Ouro", amount: gold }, { name: "XP", amount: calculateXpReward(xp) }, { name: "Vitórias", amount: kills }];
    let extraGold = 0;
    Object.entries(region.goldDrops || region.drops || {}).forEach(([key, chance]) => {
      const amount = Math.floor(kills * chance * randomBetween(.75, 1.15));
      if (amount > 0) extraGold += Math.round(convertResourceAmountToGold(key, amount));
    });
    if (extraGold > 0) {
      const extraGoldReward = calculateGoldReward(extraGold);
      state.resources.ouro += extraGoldReward;
      state.lifetime.gold += extraGoldReward;
      trackAction("gold", { amount: extraGoldReward });
      rewards.push({ name: "Ouro extra", amount: extraGoldReward });
    }
    if (showModal) {
      $("#offline-time").textContent = `Sua frota navegou por ${formatDuration(capped)} (limite de 24 horas). Eficiência offline: ${Math.round(OFFLINE_REWARD_RATE * (1 + prestigeIdle) * 100)}% do combate ativo.`;
      $("#offline-rewards").innerHTML = rewards.map(item => `<div><span>${item.name}</span><strong>+${formatNumber(item.amount)}</strong></div>`).join("");
      showOfflineModal();
    }
    addLog(`Progresso idle recolhido após ${formatDuration(capped)} com 30% de eficiência.`, "loot");
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours) return `${hours}h ${minutes}min`;
    return `${Math.max(1, minutes)}min`;
  }

  function formatArenaDuration(seconds) {
    const total = Math.max(1, Math.round(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    if (hours) return `${hours}h ${minutes}min`;
    if (minutes) return remainingSeconds ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
    return `${remainingSeconds || total}s`;
  }

  // Renderização da interface
  function resourceCostHtml(cost) {
    return Object.entries(goldOnlyBundle(cost)).map(([key, amount]) => `<span class="cost-chip ${(state.resources[key] || 0) < amount ? "missing" : ""}">${RESOURCE_META[key].icon} ${formatNumber(amount)} Gold</span>`).join("");
  }

  function missingResourcesText(cost) {
    const missingGold = Math.max(0, (goldOnlyBundle(cost).ouro || 0) - (state.resources.ouro || 0));
    return missingGold ? `Faltam: ${formatNumber(missingGold)} Gold` : "Gold suficiente para melhorar";
  }

  function missingPurchasePanelHtml(cost, context) {
    const info = getMissingPurchaseInfo(cost);
    if (!info.missing.length) return `<div class="missing-purchase-panel ready">Recursos suficientes para continuar.</div>`;
    const missingLines = info.missing.map(item => `<span class="${item.key === "ouro" || !isDirectlyPurchasableResource(item.key) ? "blocked" : ""}">${RESOURCE_META[item.key].name}: ${formatNumber(item.owned)} / ${formatNumber(item.amount)} <strong>faltam ${formatNumber(item.missing)}</strong></span>`).join("");
    const purchasableLines = info.purchasable.length ? info.purchasable.map(item => `<span>${RESOURCE_META[item.key].name}: ${formatNumber(item.missing)} × ${formatNumber(item.unitPrice)} = <strong>${formatNumber(item.total)} Ouro</strong></span>`).join("") : `<span>Nenhum material faltante pode ser comprado direto.</span>`;
    const blockedLines = info.blocked.filter(item => item.key !== "ouro").map(item => `<small>${RESOURCE_META[item.key].name} deve ser conquistado jogando.</small>`).join("");
    const goldWarning = info.total > 0 && state.resources.ouro < info.total ? `<small class="danger">Ouro insuficiente: precisa de ${formatNumber(info.total)} Ouro, possui ${formatNumber(state.resources.ouro)}. Faltam ${formatNumber(info.total - state.resources.ouro)} Ouro.</small>` : "";
    const afterBuyWarning = info.canBuyMissing && !info.canBuyAndExecute && (cost.ouro || 0) > state.resources.ouro - info.total ? `<small class="danger">Depois da compra ainda faltara Ouro para concluir esta melhoria.</small>` : "";
    return `<div class="missing-purchase-panel"><strong>Voce nao possui recursos suficientes.</strong><div class="missing-lines">${missingLines}</div><div class="missing-buy-lines">${purchasableLines}</div>${blockedLines}${goldWarning}${afterBuyWarning}<div class="missing-actions"><button class="button primary" data-buy-missing="${context.kind}" data-buy-missing-id="${context.id}" ${info.canBuyMissing ? "" : "disabled"}>Comprar recursos faltantes${info.total ? ` (${formatNumber(info.total)} Ouro)` : ""}</button><button class="button" data-screen-target="resources">Ir para Recursos</button><button class="button prestige-button" data-buy-missing="${context.kind}" data-buy-missing-id="${context.id}" data-buy-missing-then="1" ${info.canBuyAndExecute ? "" : "disabled"}>Comprar e melhorar agora</button></div></div>`;
  }

  function insertMissingPurchasePanel(button, cost, context, allowed = true) {
    if (!allowed || canAfford(cost) || isGoldOnlyCost(goldOnlyBundle(cost)) || button.parentElement.querySelector(".missing-purchase-panel")) return;
    button.insertAdjacentHTML("beforebegin", missingPurchasePanelHtml(cost, context));
  }

  function decorateMissingPurchasePanels(root = document) {
    $$("[data-upgrade]", root).forEach(button => insertMissingPurchasePanel(button, getUpgradeCost(button.dataset.upgrade), { kind: "upgrade", id: button.dataset.upgrade }));
    $$("[data-upgrade-skill]", root).forEach(button => {
      const key = button.dataset.upgradeSkill;
      if (isSkillUnlocked(key)) insertMissingPurchasePanel(button, getSkillCost(key), { kind: "skill", id: key });
    });
    $$("[data-craft-equipment]", root).forEach(button => {
      const key = button.dataset.craftEquipment;
      const item = EQUIPMENT_META[key];
      if (item && !state.equipment[key]) insertMissingPurchasePanel(button, item.costs, { kind: "equipment", id: key });
    });
    $$("[data-buy-ship]", root).forEach(button => {
      const id = Number(button.dataset.buyShip);
      const ship = SHIPS[id];
      if (!ship || state.ownedShips.includes(id)) return;
      const progressionOk = getShipProgressionIssues(ship).length === 0;
      insertMissingPurchasePanel(button, ship.costs, { kind: "ship", id }, progressionOk);
    });
    $$("[data-buy-pet]", root).forEach(button => {
      const id = Number(button.dataset.buyPet);
      const pet = PETS[id];
      if (!pet || state.ownedPets.includes(id)) return;
      const progressionOk = isPetUnlocked(pet) && state.pirateCoins >= PET_PIRATE_COIN_COSTS[id];
      insertMissingPurchasePanel(button, pet.costs, { kind: "pet", id }, progressionOk);
    });
  }

  function getMissingPurchaseContext(kind, rawId) {
    const id = ["ship", "pet"].includes(kind) ? Number(rawId) : rawId;
    if (kind === "upgrade") {
      const names = { ship: "Conves e Estrutura", cannons: "Canhoes", sails: "Velas", hull: "Casco" };
      return { cost: getUpgradeCost(id), label: `${names[id] || "Melhoria"} nivel ${state.levels[id] + 1}`, execute: () => upgrade(id) };
    }
    if (kind === "skill" && SKILL_META[id] && isSkillUnlocked(id)) return { cost: getSkillCost(id), label: `${SKILL_META[id].name} nivel ${state.skills[id].level + 1}`, execute: () => upgradeSkill(id) };
    if (kind === "equipment" && EQUIPMENT_META[id] && !state.equipment[id]) return { cost: EQUIPMENT_META[id].costs, label: EQUIPMENT_META[id].name, execute: () => craftEquipment(id) };
    if (kind === "ship" && SHIPS[id] && !state.ownedShips.includes(id)) {
      const issues = getShipProgressionIssues(SHIPS[id]);
      return { cost: SHIPS[id].costs, label: SHIPS[id].name, blocked: issues.length > 0, blockedMessage: issues.length ? `Compra bloqueada: ${issues.join(" • ")}.` : "", execute: () => buyShip(id) };
    }
    if (kind === "pet" && PETS[id] && !state.ownedPets.includes(id)) return { cost: PETS[id].costs, label: PETS[id].name, execute: () => buyPet(id) };
    return null;
  }

  function openMissingPurchaseConfirmation(kind, id, completeAfterPurchase = false) {
    const context = getMissingPurchaseContext(kind, id);
    if (!context) return toast("Compra direta indisponivel.", "danger-toast");
    if (context.blocked) return toast(context.blockedMessage || "Compra bloqueada.", "danger-toast");
    const info = getMissingPurchaseInfo(context.cost);
    if (!info.purchasable.length) return toast("Nenhum recurso faltante pode ser comprado direto.", "danger-toast");
    if (state.resources.ouro < info.total) return toast(`Ouro insuficiente. Faltam ${formatNumber(info.total - state.resources.ouro)} Ouro.`, "danger-toast");
    if (completeAfterPurchase && !info.canBuyAndExecute) return toast("Ainda faltara Ouro ou requisito especial para concluir agora.", "danger-toast");
    pendingMissingPurchase = { kind, id, label: context.label, completeAfterPurchase };
    $("#trade-modal-icon").textContent = "⚖";
    $("#trade-modal-title").textContent = completeAfterPurchase ? `Comprar e melhorar ${context.label}?` : `Comprar recursos para ${context.label}?`;
    const lines = info.purchasable.map(item => `<span>${RESOURCE_META[item.key].name}</span><strong>${formatNumber(item.missing)} × ${formatNumber(item.unitPrice)} = ${formatNumber(item.total)} Ouro</strong>`).join("");
    $("#trade-summary").innerHTML = `<span>Objetivo</span><strong>${context.label}</strong>${lines}<span>Total</span><strong>${formatNumber(info.total)} Ouro</strong><span>Ouro atual</span><strong>${formatNumber(state.resources.ouro)}</strong><span>Ouro apos compra</span><strong>${formatNumber(state.resources.ouro - info.total)}</strong>`;
    $("#trade-modal-message").textContent = completeAfterPurchase ? "O jogo comprara os recursos faltantes e tentara concluir a melhoria imediatamente." : "O Ouro sera descontado e os recursos entrarao no seu porao agora.";
    $("#trade-confirm").textContent = completeAfterPurchase ? "Comprar e melhorar agora" : "Confirmar compra";
    $("#trade-modal").classList.remove("hidden");
  }

  function executeMissingPurchase() {
    if (!pendingMissingPurchase) return;
    const context = getMissingPurchaseContext(pendingMissingPurchase.kind, pendingMissingPurchase.id);
    if (!context) { closeTradeModal(); return; }
    const result = buyMissingResources(context.cost);
    if (!result.ok) { toast(result.message, "danger-toast"); closeTradeModal(); return; }
    const shouldComplete = pendingMissingPurchase.completeAfterPurchase;
    closeTradeModal();
    if (shouldComplete) context.execute();
    else {
      toast(`Recursos comprados: ${result.bought}.`, "gold-toast");
      commitGame(true);
    }
  }

  function getSpritesheetFrameAspect(sprite, fallback = .72) {
    if (!sprite) return fallback;
    const source = sprite.canvas || sprite.image;
    const sourceWidth = source?.width || source?.naturalWidth || 0;
    const sourceHeight = source?.height || source?.naturalHeight || 0;
    const columns = Math.max(1, sprite.columns || 1);
    const rows = Math.max(1, sprite.rows || 1);
    if (!sourceWidth || !sourceHeight) return fallback;
    return (sourceHeight / rows) / Math.max(1, sourceWidth / columns);
  }

  function getCombatEntityHudAnchors() {
    const stage = $("#battle-stage");
    const w = scene.width || stage?.clientWidth || 320;
    const h = scene.height || stage?.clientHeight || 180;
    const compactStage = w < 620 || h < 240;
    const playerY = h * (compactStage ? .73 : .69) + Math.sin(scene.time * 1.55) * 3;
    const enemyY = h * (compactStage ? .64 : .60);
    const playerScale = Math.min(1.15, w / 950, h / 300);
    const enemyBaseScale = Math.min(1.02, w / 1050, h / 300);
    const playerSprite = getPlayerShipSpritesheet(SHIPS[state.shipId].name);
    const playerHeight = (playerSprite?.width || 240) * playerScale * getSpritesheetFrameAspect(playerSprite, .72);
    const playerAnchorY = playerSprite?.anchorY ?? .64;
    const playerTop = playerY + (playerSprite?.offsetY || 0) * playerScale - playerHeight * playerAnchorY;
    let enemyTop = enemyY - 92 * enemyBaseScale;
    const enemy = state.combat.enemy;

    if (enemy) {
      const arenaShip = enemy.isArena ? getArenaEnemyShip(enemy) : null;
      const arenaSprite = arenaShip ? getPlayerShipSpritesheet(arenaShip.name) : null;
      const enemySprite = enemy.isArena ? arenaSprite : getEnemyAnimatedSpritesheet(enemy);
      if (enemySprite) {
        const scale = scene.enemySceneScale(enemyBaseScale, enemy, enemySprite.width);
        const enemyHeight = enemySprite.width * scale * getSpritesheetFrameAspect(enemySprite, .72);
        enemyTop = enemyY + (enemySprite.offsetY || 0) * scale - enemyHeight * (enemySprite.anchorY ?? .64);
      } else {
        const visual = enemy.visual || inferEnemyVisual(enemy.name, REGIONS[state.regionIndex], enemy.category, enemy.visualTier, enemy.isBoss);
        const scale = scene.enemySceneScale(enemyBaseScale * (visual?.scale || 1), enemy, 250 * (visual?.scale || 1));
        enemyTop = enemyY - (enemy.isBoss ? 132 : 108) * scale;
      }
    }

    return {
      width: w,
      height: h,
      compactStage,
      player: { x: w * .29, y: playerTop - (compactStage ? 7 : 12) },
      enemy: { x: w * .71, y: enemyTop - (compactStage ? 7 : 12) }
    };
  }

  function positionFloatingHealth(node, anchor, bounds) {
    if (!node || !anchor || !bounds) return;
    const nodeWidth = node.offsetWidth || 150;
    const nodeHeight = node.offsetHeight || 38;
    const edge = bounds.compactStage ? 6 : 12;
    const topClearance = bounds.compactStage ? 30 : 52;
    const bottomClearance = bounds.compactStage ? 40 : 76;
    const minY = topClearance + nodeHeight;
    const maxY = Math.max(minY, bounds.height - bottomClearance);
    node.style.left = `${clamp(anchor.x, nodeWidth / 2 + edge, bounds.width - nodeWidth / 2 - edge)}px`;
    node.style.top = `${clamp(anchor.y, minY, maxY)}px`;
  }

  function positionManualAttackTutorial(bounds) {
    const node = $("#manual-attack-tutorial");
    if (!node || !bounds) return;
    const visible = shouldShowManualAttackTutorial();
    node.classList.toggle("hidden", !visible);
    if (!visible) return;
    const hitbox = scene.getPlayerManualAttackHitbox?.("mouse");
    if (!hitbox) return;
    const nodeWidth = node.offsetWidth || 130;
    const nodeHeight = node.offsetHeight || 30;
    const edge = bounds.compactStage ? 8 : 14;
    const playerHealthBottom = Number.parseFloat($("#player-floating-health")?.style.top || "") || bounds.player.y;
    const targetX = hitbox.x + hitbox.width * .54;
    const targetY = Math.max(hitbox.y + hitbox.height * .62, playerHealthBottom + nodeHeight + (bounds.compactStage ? 8 : 14));
    node.style.left = `${clamp(targetX, nodeWidth / 2 + edge, bounds.width - nodeWidth / 2 - edge)}px`;
    node.style.top = `${clamp(targetY, nodeHeight + 8, bounds.height - (bounds.compactStage ? 50 : 86))}px`;
  }

  function updateFloatingCombatHudPositions() {
    const anchors = getCombatEntityHudAnchors();
    positionFloatingHealth($("#player-floating-health"), anchors.player, anchors);
    positionFloatingHealth($("#enemy-floating-health"), anchors.enemy, anchors);
    positionManualAttackTutorial(anchors);
  }

  function updateSpecialCombatExitButton() {
    const button = $("#combat-exit-button");
    const nextMapButton = $("#combat-next-map-button");
    const enemy = state.combat.enemy;
    const visible = Boolean(enemy?.isBoss || (enemy?.isArena && (isArenaBattleWaiting() || isArenaBattleActive())));
    if (button) {
      button.classList.toggle("hidden", !visible);
      button.disabled = !visible;
      button.title = enemy?.isArena ? "Sair do duelo PvP sem aplicar vitoria." : "Sair da batalha contra o boss.";
    }
    if (nextMapButton) {
      const nextVisible = !visible && !isArenaSceneActive() && state.regionIndex + 1 < state.unlockedRegions;
      nextMapButton.classList.toggle("hidden", !nextVisible);
      nextMapButton.disabled = !nextVisible;
      nextMapButton.title = nextVisible ? `Avançar para ${REGIONS[state.regionIndex + 1]?.name || "próximo mapa"}` : "Nenhum próximo mapa liberado.";
    }
  }

  function renderCombatHud() {
    const stats = getStats();
    const ship = SHIPS[state.shipId];
    const enemy = state.combat.enemy;
    const region = REGIONS[state.regionIndex];
    const maxHp = getActivePlayerMaxHp(stats);
    $("#battle-stage")?.classList.toggle("fixed-background", isArenaSceneActive() || regionUsesFixedBackground(state.regionIndex));
    $("#scene-region").textContent = getCombatHudRegionLabel();
    state.combat.playerHp = clamp(state.combat.playerHp, 0, maxHp);
    $("#player-health-fill").style.width = `${state.combat.playerHp / Math.max(1, maxHp) * 100}%`;
    $("#player-health-text").textContent = `${formatNumber(state.combat.playerHp)} / ${formatNumber(maxHp)}`;
    const hpMetric = $("#metric-hp");
    const damageMetric = $("#metric-damage");
    const dpsMetric = $("#metric-dps");
    if (hpMetric) hpMetric.textContent = `${formatNumber(state.combat.playerHp)} / ${formatNumber(maxHp)}`;
    if (damageMetric) damageMetric.textContent = formatNumber(stats.damage);
    if (dpsMetric) dpsMetric.textContent = formatNumber(stats.dps);
    const repairStatus = $("#repair-status");
    const repairProgressFill = $("#repair-progress-fill");
    if (repairStatus && repairProgressFill) {
      const manualRepairActive = Boolean(state.combat.repairing && state.combat.repairSource === "manual");
      repairStatus.classList.toggle("hidden", !manualRepairActive);
      if (manualRepairActive) {
        const elapsed = Math.max(0, performance.now() - Number(state.combat.repairStarted || 0));
        const duration = Math.max(1, Number(state.combat.repairDuration || EMERGENCY_REPAIR_DURATION_MS));
        repairProgressFill.style.width = `${clamp(elapsed / duration, 0, 1) * 100}%`;
      } else {
        repairProgressFill.style.width = "0%";
      }
    }
    $("#ship-name").textContent = ship.name;
    $("#enemy-floating-health")?.classList.toggle("hidden", !enemy);
    if (enemy) {
      $("#enemy-name").textContent = enemy.name;
      $("#enemy-health-fill").style.width = `${Math.max(0, enemy.hp / Math.max(1, enemy.maxHp) * 100)}%`;
      $("#enemy-health-text").textContent = `${formatNumber(enemy.hp)} / ${formatNumber(enemy.maxHp)}`;
    } else {
      $("#enemy-name").textContent = "Sem inimigo";
      $("#enemy-health-fill").style.width = "0%";
      $("#enemy-health-text").textContent = "";
    }
    updateSpecialCombatExitButton();
    updateFloatingCombatHudPositions();
  }

  function renderTopbar() {
    const bar = $("#top-resources");
    const entries = [
      ["ouro", { name: "Gold", icon: RESOURCE_META.ouro.icon, rarityKey: "legendary", uses: "Moeda principal" }],
      ["pirateCoins", { name: "Moedas Pirata", icon: "☠", rarityKey: "legendary", uses: "Pets e progresso permanente" }]
    ];
    const amountFor = key => key === "pirateCoins" ? state.pirateCoins : state.resources[key];
    if (bar.childElementCount !== entries.length) {
      bar.innerHTML = entries.map(([key, meta]) => `<div class="top-resource-chip" data-top-resource="${key}" title="${meta.name}: ${meta.uses}" style="--resource-color:${RARITY_COLORS[meta.rarityKey]}"><span class="resource-symbol">${meta.icon}</span><span class="top-resource-copy"><span class="top-resource-name">${meta.name}</span><strong class="top-resource-amount">${formatNumber(amountFor(key))}</strong></span></div>`).join("");
    } else {
      entries.forEach(([key]) => { const amount = $(`[data-top-resource="${key}"] .top-resource-amount`, bar); if (amount) amount.textContent = formatNumber(amountFor(key)); });
    }
    $("#top-naval-power").textContent = formatNumber(getStats().power);
    syncCaptainRuntimeState(state);
    const captain = getCurrentCaptain();
    const runtimeNeeded = captainRuntimeXpNeeded(state.captainRuntimeLevel);
    const runtimeRatio = clamp(state.captainCurrentXp / runtimeNeeded, 0, 1);
    const topCaptain = $("#top-captain");
    const avatar = $("#top-captain-avatar");
    const pirateName = sanitizePirateName(state.pirateName);
    const title = isValidPirateName(pirateName) ? pirateName : captain?.name || "Capitão aguardando";
    const titleHint = captain && isValidPirateName(pirateName) ? `${pirateName} - ${captain.name}` : title;
    if (topCaptain) topCaptain.title = captain ? `${titleHint} - Nv. ${state.captainRuntimeLevel}` : "Escolher Capitão";
    if (avatar) {
      if (captain) {
        avatar.innerHTML = captainSpriteCanvasHtml(captain.level, captain.gender, "topbar");
        renderCaptainPreviewCanvases(avatar);
      }
      else avatar.textContent = "★";
    }
    $("#top-captain-title").textContent = title;
    $("#top-captain-level").textContent = captain ? `Nv. ${state.captainRuntimeLevel}` : "Escolha";
    $("#top-captain-xp-text").textContent = `${formatNumber(state.captainCurrentXp)} / ${formatNumber(runtimeNeeded)} XP`;
    $("#top-captain-xp-fill").style.width = `${runtimeRatio * 100}%`;
  }

  function renderShipPreview(canvas, ship, compact = false) {
    if (!canvas) return;
    const width = compact ? 150 : 260;
    const height = compact ? 96 : 118;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, height * .56);
    sky.addColorStop(0, ship.type === "Espectral" ? "#254958" : "#659baa");
    sky.addColorStop(1, ship.type === "Espectral" ? "#5d7479" : "#c8d8cb");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height * .57);
    const sea = ctx.createLinearGradient(0, height * .55, 0, height);
    sea.addColorStop(0, ship.type === "Espectral" ? "#174858" : "#2f7e91");
    sea.addColorStop(1, "#0b3449");
    ctx.fillStyle = sea; ctx.fillRect(0, height * .55, width, height * .45);
    ctx.strokeStyle = "rgba(225,251,246,.28)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = height * (.62 + i * .09); ctx.beginPath(); ctx.moveTo(i * 17, y); ctx.quadraticCurveTo(width * .32, y - 3, width * .62, y); ctx.lineTo(width, y - 2); ctx.stroke(); }
    const scale = compact ? .45 : .58;
    scene.drawPlayerShip(ctx, width * .5, height * .71, scale, ship, { preview: true });
  }

  function estimateCostValue(cost = {}) {
    return Object.entries(cost || {}).reduce((sum, [key, amount]) => sum + (key === "ouro" ? Number(amount) || 0 : convertResourceAmountToGold(key, amount || 0)), 0);
  }

  function recommendationScore(powerGain, costValue, canBuy, blocked = false) {
    const base = Math.max(1, Number(powerGain) || 0) / Math.max(1, Number(costValue) || 1);
    return base * (canBuy ? 100 : blocked ? .25 : 1);
  }

  function captainEquipmentProgressScore(key, currentTier, nextTier, currentStats, nextStats) {
    const cost = Math.max(1, Number(nextTier?.pointCost) || 1);
    const current = currentTier?.bonuses || {};
    const next = nextTier?.bonuses || {};
    const bonusDelta = bonusKey => Math.max(0, Number(next[bonusKey] || 0) - Number(current[bonusKey] || 0));
    if (key === "lightHands") {
      const currentRewardMultiplier = getGoldGainMultiplier() + getXpGainMultiplier();
      const rewardDelta = bonusDelta("goldGainBonus") + bonusDelta("xpGainBonus");
      return currentRewardMultiplier * rewardDelta * 100 / cost;
    }
    if (key === "sword") {
      return Math.max(1, Number(nextStats.damage || 0) - Number(currentStats.damage || 0)) / cost;
    }
    const dpsDelta = Math.max(0, Number(nextStats.dps || 0) - Number(currentStats.dps || 0));
    const damageDelta = Math.max(0, Number(nextStats.damage || 0) - Number(currentStats.damage || 0));
    const hpDelta = Math.max(0, Number(nextStats.maxHp || 0) - Number(currentStats.maxHp || 0));
    const attackSpeedDelta = bonusDelta("shipAttackSpeedBonus") * Math.max(1, Number(currentStats.shipDps || currentStats.dps || 1));
    const rewardDelta = (bonusDelta("goldGainBonus") + bonusDelta("xpGainBonus")) * 100;
    return (dpsDelta + damageDelta + hpDelta + attackSpeedDelta + rewardDelta) / cost;
  }

  function captainRecommendationPriority(candidate) {
    if (candidate?.kind === "captainEquipment" && candidate.key === "lightHands") return 0;
    if (candidate?.kind === "captainEquipment" && candidate.key === "sword") return 1;
    if (candidate?.kind === "captainEquipment") return 2;
    if (candidate?.kind === "captainManualSkill" && candidate.key === CAPTAIN_MANUAL_SKILL_KEY) return 4;
    if (candidate?.kind === "captainManualSkill") return 3;
    return 5;
  }

  function progressRecommendationPriority(candidate) {
    if (candidate?.kind === "fleetShip") return 0;
    if (candidate?.kind === "fleetUpgrade") return 1;
    if (candidate?.kind === "fleetSkill") return 2;
    return 3;
  }

  function recommendationActionMatches(candidate, attr) {
    return Boolean(candidate?.actionAttrs && candidate.actionAttrs.includes(attr));
  }

  function canRecommendFleetShip(ship) {
    if (!ship || state.ownedShips.includes(ship.id)) return false;
    if (!isShipUnlockedInCurrentJourney(ship)) return false;
    const nextShip = getNextFleetShip();
    if (!nextShip || ship.id !== nextShip.id) return false;
    if (getShipProgressionIssues(ship).length) return false;
    return true;
  }

  function buildProgressRecommendationCandidates() {
    const currentStats = getStats();
    const candidates = [];
    [["ship", "Convés e Estrutura", "Melhorias do Navio"], ["cannons", "Canhões", "Melhorias do Navio"], ["sails", "Velas", "Melhorias do Navio"], ["hull", "Casco", "Melhorias do Navio"]].forEach(([key, title, category]) => {
      const cost = getUpgradeCost(key);
      const nextStats = getStatsPreview({ [key]: state.levels[key] + 1 });
      const powerGain = Math.max(1, nextStats.power - currentStats.power);
      const action = upgradeTableActionState("upgrade", key, cost);
      const canBuy = canAfford(cost);
      candidates.push({ kind: "fleetUpgrade", category, title: `${title} Nv. ${state.levels[key] + 1}`, cost, powerGain, canBuy, blocked: false, actionLabel: action.label, actionAttrs: action.actionAttrs, disabled: action.disabled, note: recommendationImpactText(getImprovementRows(key), `${formatNumber(currentStats.power)} -> ${formatNumber(nextStats.power)} poder`), score: recommendationScore(powerGain, estimateCostValue(cost), canBuy) });
    });
    Object.entries(EQUIPMENT_META).forEach(([key, item]) => {
      if (state.equipment[key]) return;
      const cost = item.costs;
      const nextStats = getStatsWithTemporaryState(() => { state.equipment[key] = true; });
      const powerGain = Math.max(1, nextStats.power - currentStats.power);
      const action = upgradeTableActionState("equipment", key, cost);
      const canBuy = canAfford(cost);
      candidates.push({ kind: "fleetEquipment", category: "Equipamento do Navio", title: item.name, cost, powerGain, canBuy, blocked: false, actionLabel: action.label, actionAttrs: action.actionAttrs, disabled: action.disabled, note: recommendationImpactFromStats(currentStats, nextStats, item.effect), score: recommendationScore(powerGain, estimateCostValue(cost), canBuy) });
    });
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      const unlocked = isSkillUnlocked(key);
      const cost = getSkillCost(key);
      const nextStats = unlocked ? getStatsWithTemporaryState(() => { state.skills[key].level += 1; }) : currentStats;
      const powerGain = Math.max(1, unlocked ? nextStats.power - currentStats.power : 1);
      const action = upgradeTableActionState("skill", key, cost, { blocked: !unlocked });
      const canBuy = unlocked && canAfford(cost);
      candidates.push({ kind: "fleetSkill", category: "Skill do Navio", title: `${meta.name} Nv. ${state.skills[key].level + 1}`, cost, powerGain, canBuy, blocked: !unlocked, actionLabel: action.label, actionAttrs: action.actionAttrs, disabled: action.disabled, note: shipSkillRecommendationImpactText(key, state.skills[key].level), score: recommendationScore(powerGain, estimateCostValue(cost), canBuy, !unlocked) });
    });
    const nextShip = getNextFleetShip();
    if (canRecommendFleetShip(nextShip)) {
      const nextStats = getStats(nextShip.id);
      const powerGain = Math.max(1, nextStats.power - currentStats.power);
      const action = upgradeTableActionState("ship", nextShip.id, nextShip.costs);
      const canBuy = canAfford(nextShip.costs);
      candidates.push({ kind: "fleetShip", category: "Frota", title: nextShip.name, cost: nextShip.costs, powerGain, canBuy, blocked: false, actionLabel: action.label, actionAttrs: action.actionAttrs, disabled: action.disabled, note: recommendationImpactFromStats(currentStats, nextStats, `Novo navio: +${formatNumber(powerGain)} poder`, ["damage", "maxHp", "dps", "speed", "armor"]), score: Number.MAX_SAFE_INTEGER });
    }
    return candidates.sort((a, b) =>
      progressRecommendationPriority(a) - progressRecommendationPriority(b)
      || Number(b.canBuy) - Number(a.canBuy)
      || b.score - a.score
    );
  }

  function buildCaptainRecommendationCandidates() {
    if (!isCaptainSelected()) return [];
    syncCaptainRuntimeState(state);
    const available = getAvailableLevelPoints();
    const currentStats = getStats();
    const candidates = [];
    Object.entries(CAPTAIN_EQUIPMENT_META).forEach(([key, meta]) => {
      const next = getNextCaptainEquipmentTierData(key);
      if (!next) return;
      const current = getCaptainEquipmentTierData(key, getCaptainEquipmentTier(key));
      const nextStats = getStatsWithTemporaryState(() => {
        state.captainEquipment[meta.tierKey] = next.level;
        state.captainEquipmentBonuses = calculateCaptainEquipmentBonuses(state);
      });
      const powerGain = Math.max(1, nextStats.power - currentStats.power);
      const canBuy = available >= next.pointCost;
      const progressScore = captainEquipmentProgressScore(key, current, next, currentStats, nextStats);
      candidates.push({ kind: "captainEquipment", key, category: "Equipamento do Capitão", title: next.name, powerGain, canBuy, blocked: false, actionLabel: canBuy ? "Melhorar" : "Faltam pts", actionAttrs: `data-upgrade-captain-equipment="${key}"`, disabled: !canBuy, note: captainEquipmentRecommendationImpactText(key, current, next, currentStats, nextStats), costText: `${next.pointCost} Ponto${next.pointCost === 1 ? "" : "s"}`, score: progressScore * (canBuy ? 100 : 1) });
    });
    Object.entries(CAPTAIN_MANUAL_SKILL_META).forEach(([key, meta]) => {
      const level = getCaptainManualSkillLevel(key);
      const cost = getCaptainManualSkillCost(key, level);
      if (cost === null) return;
      const isRepair = key === CAPTAIN_REPAIR_SKILL_KEY;
      const powerGain = isRepair ? Math.round(getStats().maxHp * (getCaptainRepairPercent(level + 1) - getCaptainRepairPercent(level))) : Math.round(getStats().damage * (getCaptainManualSkillMultiplier(key, level + 1) - getCaptainManualSkillMultiplier(key, level)));
      const canBuy = available >= cost;
      candidates.push({ kind: "captainManualSkill", key, category: "Skill do Capitão", title: `${meta.name} Nv. ${level + 1}`, powerGain: Math.max(1, powerGain), canBuy, blocked: false, actionLabel: canBuy ? "Promover" : "Faltam pts", actionAttrs: `data-upgrade-captain-manual-skill="${key}"`, disabled: !canBuy, note: captainManualSkillRecommendationImpactText(key, level, currentStats), costText: `${cost} Ponto${cost === 1 ? "" : "s"}`, score: recommendationScore(powerGain, cost, canBuy) });
    });
    return candidates.sort((a, b) =>
      Number(b.canBuy) - Number(a.canBuy)
      || captainRecommendationPriority(a) - captainRecommendationPriority(b)
      || b.score - a.score
    );
  }

  function resourceCostText(cost = {}) {
    const entries = Object.entries(cost || {}).filter(([, amount]) => Number(amount) > 0);
    if (!entries.length) return "";
    const text = entries.slice(0, 2).map(([key, amount]) => `${formatNumber(amount)} ${RESOURCE_META[key]?.name || key}`).join(" + ");
    return entries.length > 2 ? `${text}...` : text;
  }

  function recommendationLineHtml(candidate, fallbackTitle) {
    if (!candidate) return `<div class="home-recommendation-row empty"><div class="recommendation-main"><span>${fallbackTitle}</span><strong>Nenhuma recomendação disponível</strong><small>Continue progredindo para liberar novas opções.</small></div><button class="button" disabled>Aguardar</button></div>`;
    const label = candidate.canBuy ? "Recomendado" : "Próxima recomendada";
    const costText = candidate.costText || resourceCostText(candidate.cost || {});
    return `<div class="home-recommendation-row ${candidate.canBuy ? "available" : "locked"}">
      <div class="recommendation-main"><span>${label} • ${candidate.category}</span><strong>${candidate.title}</strong><small>${candidate.note || ""}</small></div>
      <div class="recommendation-meta"><span>Ganho</span><strong>+${formatNumber(candidate.powerGain)}</strong></div>
      <div class="recommendation-meta"><span>Custo</span><strong>${costText || "Sem custo"}</strong></div>
      <button class="button ${candidate.canBuy ? "primary" : ""}" ${candidate.actionAttrs || ""} ${candidate.disabled ? "disabled" : ""}>${candidate.actionLabel || "Abrir"}</button>
    </div>`;
  }

  function renderHomeRecommendations() {
    const list = $("#home-recommendation-list");
    if (!list) return;
    list.innerHTML = [
      recommendationLineHtml(buildProgressRecommendationCandidates()[0], "Melhoria geral"),
      recommendationLineHtml(buildCaptainRecommendationCandidates()[0], "Capitão recomendado")
    ].join("");
  }

  function initialCaptainGateCardHtml([gender, meta]) {
    const level = getCaptainLevelData(1);
    return `<button class="initial-captain-card" type="button" data-select-captain-gender="${gender}" aria-label="Escolher ${meta.choice}">
      <span class="initial-captain-card-image">${captainSpriteCanvasHtml(1, gender, "choice")}</span>
      <span class="initial-captain-card-copy">
        <span class="eyebrow">CAPITÃO INICIAL</span>
        <strong>${meta.choice}</strong>
        <small>${getCaptainName(1, gender)}</small>
        <span class="initial-captain-card-bonus">${captainLevelBonusText(level)}</span>
      </span>
    </button>`;
  }

  function renderInitialCaptainGate() {
    const gate = $("#initial-captain-gate");
    const shell = $(".persistent-combat");
    const stage = $("#battle-stage");
    const show = shouldShowInitialCaptainGate();
    shell?.classList.toggle("captain-gate-active", show);
    stage?.setAttribute("aria-hidden", show ? "true" : "false");
    if (!gate) return;
    gate.classList.toggle("hidden", !show);
    if (!show) {
      gate.innerHTML = "";
      return;
    }
    gate.innerHTML = `<section class="initial-captain-gate-panel" aria-labelledby="initial-captain-title">
      <div class="initial-captain-gate-heading">
        <span class="eyebrow">COMANDO INICIAL</span>
        <h2 id="initial-captain-title">Escolha seu Capitão</h2>
        <p>Seu capitão liderará sua jornada pirata.</p>
      </div>
      <div class="initial-captain-options">${Object.entries(CAPTAIN_GENDERS).map(initialCaptainGateCardHtml).join("")}</div>
    </section>`;
    renderCaptainPreviewCanvases(gate);
  }

  function renderHome() {
    const region = getActiveCombatRegion();
    const stats = getStats();
    const kills = state.regionKills[state.regionIndex];
    $("#battle-stage")?.classList.toggle("fixed-background", isArenaSceneActive() || regionUsesFixedBackground(state.regionIndex));
    $("#scene-region").textContent = getCombatHudRegionLabel();
    $("#metric-damage").textContent = formatNumber(stats.damage);
    $("#metric-dps").textContent = formatNumber(stats.dps);
    const speedMetric = $("#metric-speed");
    if (speedMetric) speedMetric.textContent = formatNumber(stats.speed);
    $("#metric-hp").textContent = `${formatNumber(state.combat.playerHp)} / ${formatNumber(stats.maxHp)}`;
    const powerMetric = $("#metric-power");
    if (powerMetric) powerMetric.textContent = formatNumber(stats.power);
    renderHomeRecommendations();
    $("#kill-progress-text").textContent = `${Math.min(100, kills)} / 100`;
    $("#boss-progress-fill").style.width = `${Math.min(100, kills)}%`;
    $("#boss-name").textContent = region.boss;
    const defeated = state.bossesDefeated[state.regionIndex];
    const available = kills >= 100 && !defeated;
    $("#progress-title").textContent = defeated ? "Região conquistada" : available ? "O boss emergiu!" : "O boss aguarda";
    $("#boss-status").textContent = defeated ? "Boss derrotado • continue farmando" : available ? "Desafio disponível agora" : `Faltam ${Math.max(0, 100 - kills)} vitórias`;
    $("#boss-button").disabled = !available || Boolean(state.combat.enemy?.isBoss);
    $("#boss-button").textContent = defeated ? "Boss derrotado" : state.combat.enemy?.isBoss ? "Em combate" : "Desafiar boss";
    const prevMapButton = $("#boss-prev-map");
    const nextMapButton = $("#boss-next-map");
    if (prevMapButton) {
      const prevIndex = state.regionIndex - 1;
      prevMapButton.disabled = prevIndex < 0;
      prevMapButton.title = prevIndex >= 0 ? `Voltar para ${REGIONS[prevIndex].name}` : "Primeiro mapa";
      prevMapButton.setAttribute("aria-label", prevMapButton.title);
    }
    if (nextMapButton) {
      const nextIndex = state.regionIndex + 1;
      const unlocked = nextIndex < state.unlockedRegions && nextIndex < REGIONS.length;
      nextMapButton.disabled = !unlocked;
      nextMapButton.title = nextIndex >= REGIONS.length ? "Ultimo mapa" : unlocked ? `Avancar para ${REGIONS[nextIndex].name}` : "Proximo mapa bloqueado";
      nextMapButton.setAttribute("aria-label", nextMapButton.title);
    }
    const autoAttackUnlocked = isAutoAttackUnlocked();
    const startButton = $("#start-button");
    startButton.textContent = autoAttackUnlocked
      ? `Auto ${state.combat.running ? "ON" : "OFF"}`
      : state.combat.running ? "Auto bloqueado" : "Atacar";
    startButton.classList.toggle("on", Boolean(state.combat.running));
    startButton.setAttribute("aria-pressed", state.combat.running ? "true" : "false");
    startButton.title = autoAttackUnlocked ? "Liga ou desliga o combate automático." : "Auto ataque libera no nível 2 do Capitão. Até lá, clique no barco para atacar.";
    const autoBossButton = $("#auto-boss-button");
    if (autoBossButton) {
      autoBossButton.textContent = `Boss ${state.autoChallengeBoss ? "ON" : "OFF"}`;
      autoBossButton.classList.toggle("on", Boolean(state.autoChallengeBoss));
      autoBossButton.setAttribute("aria-pressed", state.autoChallengeBoss ? "true" : "false");
      autoBossButton.title = state.autoChallengeBoss ? "Desafio automático de boss ligado." : "Desafia automaticamente o boss quando atingir 100 vitórias.";
    }
    const needed = xpNeeded();
    const xpText = $("#xp-text");
    const pirateLevelText = $("#pirate-level-text");
    const xpFill = $("#xp-fill");
    if (xpText) xpText.textContent = `${formatNumber(state.xp)} / ${formatNumber(needed)} XP`;
    if (pirateLevelText) pirateLevelText.textContent = `Nível ${state.pirateLevel}`;
    if (xpFill) xpFill.style.width = `${state.xp / needed * 100}%`;
    const homeLogs = state.logs.slice(0, 5);
    $("#battle-log").innerHTML = homeLogs.length ? homeLogs.map(item => `<li class="${item.type}"><time>${item.time}</time>${item.message}</li>`).join("") : "<li>Sem eventos importantes ainda.</li>";
    renderLeaderboard();
    renderArenaPanel();
    if (currentScreen === "home") refreshLeaderboard();
    renderSkillDock();
  }

  function getPetIssues(pet) {
    const issues = [];
    const prestigeReq = getPetPrestigeRequirement(pet);
    if (state.prestiges < prestigeReq) issues.push(`Desbloqueia com ${prestigeReq} Prestígio${prestigeReq === 1 ? "" : "s"}`);
    if (pet.regionReq && state.unlockedRegions < pet.regionReq) issues.push(pet.id === 8 ? "Oceano Profundo desbloqueado" : "Abismo do Kraken desbloqueado");
    if (pet.bossReq !== undefined && !state.bossesDefeated[pet.bossReq]) issues.push("Kraken Primordial derrotado");
    return issues;
  }

  function renderPets() {
    const current = getEquippedPet();
    const ownedCount = $("#pets-owned-count");
    const banner = $("#pet-current-banner");
    const grid = $("#pets-grid");
    if (!banner || !grid) return;
    if (ownedCount) ownedCount.textContent = `${state.ownedPets.length} / ${PETS.length}`;
    banner.className = `pet-current-banner pet-current-compact${current ? " equipped" : ""}`;
    banner.setAttribute("style", current ? getPetAuraStyle(current) : "");
    banner.innerHTML = current ? `<div><span class="eyebrow">PET EQUIPADO</span><h2>${current.name}</h2><p>${getPetBonusInlineText(current.id, current.level) || current.description}</p></div><div class="pet-current-stats"><span>Nível <strong>${current.level}/${PET_MAX_LEVEL}</strong></span><span>Dano <strong>${formatNumber(current.damage)}</strong></span><span>DPS <strong>${current.dps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong></span><span>Poder <strong>+${formatNumber(current.power)}</strong></span></div>` : `<div><span class="eyebrow">SEM COMPANHEIRO</span><h2>Nenhum pet equipado</h2><p>Você pode navegar sem pet ou escolher um companheiro quando quiser.</p></div>`;
    grid.innerHTML = PETS.map(basePet => {
      const owned = state.ownedPets.includes(basePet.id);
      const level = owned ? getPetLevel(basePet.id) : 1;
      const pet = getPetWithLevel(basePet, level);
      const unlocked = isPetUnlocked(basePet);
      const equipped = state.equippedPetId === pet.id && unlocked;
      const issues = getPetIssues(basePet);
      const pirateCoinCost = PET_PIRATE_COIN_COSTS[pet.id];
      const affordable = canAfford(pet.costs) && state.pirateCoins >= pirateCoinCost;
      const status = equipped ? "EQUIPADO" : owned && !unlocked ? "BLOQUEADO" : owned ? `NÍVEL ${level}` : unlocked ? "DISPONÍVEL" : "BLOQUEADO";
      const upgradeCost = owned ? getPetUpgradeCost(pet.id, level) : null;
      const prestigeReq = getPetPrestigeRequirement(basePet);
      const prestigeLine = `Prestígio necessário: ${state.prestiges} / ${prestigeReq}`;
      const summaryRows = getPetBonusSummaryRows(pet.id, level);
      const costHtml = owned
        ? upgradeCost ? `<span class="cost-chip pirate-coin-cost">☠ ${formatNumber(upgradeCost)}</span>` : `<span class="cost-chip">Nível máximo</span>`
        : `<span class="cost-chip pirate-coin-cost">☠ ${formatNumber(pirateCoinCost)}</span>${resourceCostHtml(pet.costs)}`;
      const actionHtml = owned
        ? `${upgradeTableButtonHtml(state.equippedPetId === pet.id ? "Desequipar" : "Equipar", `data-equip-pet="${pet.id}"`, !unlocked && state.equippedPetId !== pet.id, equipped ? "" : "primary")}${upgradeTableButtonHtml(upgradeCost ? "Melhorar" : "Máximo", `data-upgrade-pet="${pet.id}"`, !unlocked || !(upgradeCost && state.pirateCoins >= upgradeCost), "prestige-button")}`
        : upgradeTableButtonHtml("Comprar", `data-buy-pet="${pet.id}"`, !unlocked || !affordable);
      const value = owned ? `Nível ${level}/${PET_MAX_LEVEL}` : unlocked ? `Prestígio ${prestigeReq}` : "Bloqueado";
      const valueSub = owned ? (equipped ? "Equipado" : unlocked ? "Comprado" : prestigeLine) : issues.length ? issues.join(" • ") : prestigeLine;
      const bonusText = getPetBonusInlineText(pet.id, level) || pet.description;
      const note = owned
        ? !unlocked && issues.length ? issues.join(" • ") : bonusText
        : issues.length ? `Requer: ${issues.join(" • ")}` : bonusText;
      return upgradeTableRowHtml({
        classes: `pet-card pet-list-card pet-table-row ${equipped ? "equipped" : owned && !unlocked ? "owned locked" : owned ? "owned" : unlocked ? "available" : "locked"}`,
        style: getPetAuraStyle(pet),
        icon: pet.icon,
        eyebrow: `${pet.rarity} • ${status}`,
        title: pet.name,
        note,
        power: `+${formatNumber(pet.power)}`,
        powerSub: pet.type,
        value,
        valueSub,
        summaryRows,
        summaryFallback: pet.description,
        costHtml,
        actionHtml
      });
    }).join("");
  }

  function captainBonusRowsHtml(bonuses) {
    const rows = [
      ["Spawn dos inimigos", `+${formatCaptainPercent(bonuses.spawnBonus)}`],
      ["Auto pássaros", formatCaptainPercent(bonuses.birdAutoCollect)],
      ["Auto tubarão", formatCaptainPercent(bonuses.sharkAutoCollect)],
      ["Regen. HP", `${formatCaptainPercent(bonuses.hpRegenPercentPerSecond)}/${CAPTAIN_HP_REGEN_INTERVAL_SECONDS}s`],
      ["Bônus auto Gold", `+${formatCaptainPercent(bonuses.autoFoodBonus)}`]
    ];
    return rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function captainLevelBonusText(levelData) {
    const b = levelData.bonuses;
    const parts = [];
    if (b.spawnBonus) parts.push(`+${formatCaptainPercent(b.spawnBonus)} spawn`);
    if (b.birdAutoCollect) parts.push(`+${formatCaptainPercent(b.birdAutoCollect)} auto pássaros`);
    if (b.sharkAutoCollect) parts.push(`+${formatCaptainPercent(b.sharkAutoCollect)} auto tubarão`);
    if (b.autoFoodBonus) parts.push(`+${formatCaptainPercent(b.autoFoodBonus)} Gold auto`);
    if (b.hpRegenPercentPerSecond) parts.push(`+${formatCaptainPercent(b.hpRegenPercentPerSecond)}/${CAPTAIN_HP_REGEN_INTERVAL_SECONDS}s HP`);
    return parts.join(" • ");
  }

  function captainEquipmentBonusText(key, bonuses = {}) {
    if (!bonuses || !Object.values(bonuses).some(Boolean)) return "Sem bônus ativo";
    if (key === "sword") return `+${formatCaptainPercent(bonuses.shipDamageBonus)} dano do barco`;
    if (key === "firearm") return `+${formatCaptainPercent(bonuses.shipAttackSpeedBonus)} velocidade de ataque`;
    if (key === "armor") return `+${formatCaptainPercent(bonuses.shipHpBonus)} vida, +${formatCaptainPercent(bonuses.shipArmorBonus)} armadura`;
    if (key === "trick") return `+${formatCaptainPercent(bonuses.dodgeChance)} esquiva, +${formatCaptainPercent(bonuses.critChance)} crítico, +${formatCaptainPercent(bonuses.doubleAttackChance)} ataque duplo`;
    if (key === "lightHands") return `+${formatCaptainPercent(bonuses.goldGainBonus)} ouro ganho, +${formatCaptainPercent(bonuses.xpGainBonus)} XP ganho`;
    return "Bônus ativo";
  }

  function captainEquipmentPointActionHtml(key, next) {
    if (!next) return upgradeTableButtonHtml("Máximo", "", true, "");
    const available = getAvailableLevelPoints();
    const cost = next.pointCost;
    const canUpgrade = available >= cost;
    return upgradeTableButtonHtml(canUpgrade ? "Evoluir" : "Faltam pts", `data-upgrade-captain-equipment="${key}"`, !canUpgrade);
  }

  function captainEquipmentTabHtml([key, meta]) {
    const tier = getCaptainEquipmentTier(key);
    const next = getNextCaptainEquipmentTierData(key);
    const available = getAvailableLevelPoints();
    const affordable = Boolean(next && available >= next.pointCost);
    const selected = key === activeCaptainEquipmentKey;
    return `<button class="captain-equipment-tab ${selected ? "selected" : ""} ${affordable ? "available" : ""} ${next ? "" : "completed"}" type="button" data-select-captain-equipment="${key}" aria-pressed="${selected ? "true" : "false"}">
      <span class="captain-equipment-tab-icon">${meta.icon}</span>
      <span class="captain-equipment-tab-copy"><strong>${meta.shortName || meta.category}</strong><small>Nv. ${tier}</small></span>
      ${next ? affordable ? `<span class="captain-equipment-tab-badge">UP</span>` : "" : `<span class="captain-equipment-tab-badge done">OK</span>`}
    </button>`;
  }

  function captainEquipmentDetailHtml(key) {
    const meta = CAPTAIN_EQUIPMENT_META[key];
    if (!meta) return "";
    const tier = getCaptainEquipmentTier(key);
    const current = getCaptainEquipmentTierData(key, tier);
    const next = getNextCaptainEquipmentTierData(key);
    const available = getAvailableLevelPoints();
    const affordable = Boolean(next && available >= next.pointCost);
    const upgraded = lastCaptainEquipmentUpgrade === key;
    const recommendation = buildCaptainRecommendationCandidates()[0];
    const recommended = next && recommendationActionMatches(recommendation, `data-upgrade-captain-equipment="${key}"`);
    const currentName = current?.name || "Ainda não comprado";
    const currentBonus = current ? captainEquipmentBonusText(key, current.bonuses) : "Sem bônus ativo";
    const nextBonus = next ? captainEquipmentBonusText(key, next.bonuses) : "Tier máximo alcançado";
    const summaryRows = [
      { label: "Atual", value: currentBonus },
      { label: "Próximo", value: nextBonus },
      { label: "Disponível", value: `${available} pts` }
    ];
    return upgradeTableRowHtml({
      classes: `captain-equipment-row captain-equipment-detail ${upgraded ? "recent-upgrade" : ""} ${next ? affordable ? "available" : "" : "completed"} ${recommended ? "recommended" : ""}`,
      icon: meta.icon,
      eyebrow: `NÍVEL ${tier} / ${CAPTAIN_EQUIPMENT_MAX_TIER}`,
      title: `${meta.shortName || meta.category}: ${currentName}`,
      note: upgraded ? "Upgrade realizado!" : currentBonus,
      power: next ? `Nv. ${next.level}` : "Máx.",
      powerSub: `Atual ${tier}/${CAPTAIN_EQUIPMENT_MAX_TIER}`,
      value: next ? next.name : "Completo",
      valueSub: next ? `Depois: ${nextBonus}` : "Todos os tiers",
      summaryRows,
      summaryFallback: currentBonus,
      costHtml: next ? `<span class="cost-chip">${next.pointCost} Ponto${next.pointCost === 1 ? "" : "s"}</span><span class="cost-chip">Saldo ${available}</span>` : `<span class="cost-chip">Completo</span>`,
      actionHtml: captainEquipmentPointActionHtml(key, next)
    });
  }

  function captainCollapsibleToggleHtml({ expanded, attr, icon, eyebrow, title, summary, countLabel, countValue }) {
    return `<button class="captain-pets-toggle captain-section-toggle" type="button" ${attr} aria-expanded="${expanded ? "true" : "false"}">
      <span class="captain-pets-toggle-icon" aria-hidden="true">${icon}</span>
      <span class="captain-pets-toggle-copy"><span class="eyebrow">${eyebrow}</span><strong>${title}</strong><small>${summary}</small></span>
      <span class="captain-pets-toggle-count"><small>${countLabel}</small><strong>${countValue}</strong></span>
      <i class="captain-pets-toggle-arrow" aria-hidden="true">${expanded ? "-" : "+"}</i>
    </button>`;
  }

  function renderCaptainManualSkillSection(locked = false) {
    const toggle = captainCollapsibleToggleHtml({
      expanded: captainManualSkillsExpanded,
      attr: "data-toggle-captain-manual-skills",
      icon: "✦",
      eyebrow: "HABILIDADES MANUAIS DO PIRATA",
      title: "Skills de combate",
      summary: locked ? CAPTAIN_REQUIRED_MESSAGE : `${Object.keys(CAPTAIN_MANUAL_SKILL_META).length} skills • pontos disponíveis ${getAvailableLevelPoints()}`,
      countLabel: "SKILLS",
      countValue: Object.keys(CAPTAIN_MANUAL_SKILL_META).length
    });
    if (locked) {
      return `<section class="captain-equipment-section captain-manual-skill-section captain-collapsible-section ${captainManualSkillsExpanded ? "expanded" : ""} locked">
        ${toggle}
        <div class="captain-section-body"><div class="section-heading compact"><div><span class="eyebrow">BLOQUEADO</span><h2>${CAPTAIN_REQUIRED_MESSAGE}</h2><p>Escolha um dos capitães iniciais para liberar Sabotar Inimigo e Restaurar Navio no combate.</p></div></div></div>
      </section>`;
    }
    syncCaptainRuntimeState(state);
    const available = getAvailableLevelPoints();
    const stats = getStats();
    const manualSkillRows = Object.entries(CAPTAIN_MANUAL_SKILL_META).map(([key, meta]) => {
      const level = getCaptainManualSkillLevel(key);
      const nextLevel = Math.min(meta.maxLevel, level + 1);
      const cost = getCaptainManualSkillCost(key, level);
      const canUpgrade = cost !== null && available >= cost;
      const upgraded = lastCaptainManualSkillUpgrade === key;
      const recommendation = buildCaptainRecommendationCandidates()[0];
      const recommended = cost !== null && recommendationActionMatches(recommendation, `data-upgrade-captain-manual-skill="${key}"`);
      const isRepair = key === CAPTAIN_REPAIR_SKILL_KEY;
      const currentEffect = isRepair ? formatCaptainRepairPercent(level) : formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key, level));
      const nextEffect = cost === null ? "Máximo" : isRepair ? formatCaptainRepairPercent(nextLevel) : formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key, nextLevel));
      const effectLabel = isRepair ? "Reparo atual" : "Multiplicador atual";
      const nextLabel = isRepair ? "Próximo reparo" : "Próximo multiplicador";
      const estimateLabel = isRepair ? "Cura estimada" : "Dano estimado";
      const currentEstimate = isRepair ? Math.round(stats.maxHp * getCaptainRepairPercent(level)) : getCaptainManualSkillDamage(key, stats);
      const nextEstimate = isRepair ? Math.round(stats.maxHp * getCaptainRepairPercent(nextLevel)) : Math.round(stats.damage * getCaptainManualSkillMultiplier(key, nextLevel));
      const completeText = isRepair ? "Restaurar Navio está totalmente promovida." : "Sabotar Inimigo está totalmente promovida.";
      const shortNote = isRepair
        ? `Restaura ${currentEffect}${cost === null ? " da vida máxima" : ` → ${nextEffect}`}`
        : meta.description;
      const summaryRows = [
        { label: effectLabel, value: currentEffect },
        { label: nextLabel, value: nextEffect },
        { label: estimateLabel, value: `${formatNumber(currentEstimate)}${cost === null ? "" : ` → ${formatNumber(nextEstimate)}`}` },
        { label: "Cooldown", value: formatSeconds(meta.cooldown) }
      ];
      return upgradeTableRowHtml({
        classes: `captain-manual-skill-row ${isRepair ? "captain-repair-skill-row" : ""} ${upgraded ? "recent-upgrade" : ""} ${cost === null ? "completed" : canUpgrade ? "available" : ""} ${recommended ? "recommended" : ""}`,
        icon: meta.icon,
        eyebrow: `NÍVEL ${level} / ${meta.maxLevel}`,
        title: meta.name,
        note: upgraded ? "Habilidade promovida!" : shortNote,
        power: currentEffect,
        powerSub: effectLabel,
        value: cost === null ? "Máximo" : `Nível ${nextLevel}`,
        valueSub: cost === null ? completeText : nextEffect,
        summaryRows,
        summaryFallback: meta.description,
        costHtml: cost === null ? `<span class="cost-chip">Completo</span>` : `<span class="cost-chip">${cost} Ponto${cost === 1 ? "" : "s"}</span><span class="cost-chip">Saldo ${available}</span>`,
        actionHtml: upgradeTableButtonHtml(cost === null ? "Máximo" : canUpgrade ? "Promover" : "Faltam pts", `data-upgrade-captain-manual-skill="${key}"`, !canUpgrade)
      });
    }).join("");
    return `<section class="captain-equipment-section captain-manual-skill-section captain-collapsible-section ${captainManualSkillsExpanded ? "expanded" : ""}">
      ${toggle}
      <div class="captain-section-body"><div class="captain-manual-skill-list upgrade-feed-list">${manualSkillRows}</div></div>
    </section>`;
  }

  function renderCaptainEquipmentSection(locked = false) {
    const equipmentTierTotal = Object.keys(CAPTAIN_EQUIPMENT_META).reduce((sum, key) => sum + getCaptainEquipmentTier(key), 0);
    const equipmentTierMax = Object.keys(CAPTAIN_EQUIPMENT_META).length * CAPTAIN_EQUIPMENT_MAX_TIER;
    const toggle = captainCollapsibleToggleHtml({
      expanded: captainEquipmentExpanded,
      attr: "data-toggle-captain-equipment",
      icon: "◆",
      eyebrow: "ARSENAL DO COMANDO",
      title: "Equipamentos do Capitão",
      summary: locked ? CAPTAIN_REQUIRED_MESSAGE : `${equipmentTierTotal}/${equipmentTierMax} níveis • pontos disponíveis ${getAvailableLevelPoints()}`,
      countLabel: "NÍVEIS",
      countValue: `${equipmentTierTotal}/${equipmentTierMax}`
    });
    if (locked) {
      return `<section class="captain-equipment-section captain-collapsible-section ${captainEquipmentExpanded ? "expanded" : ""} locked">
        ${toggle}
        <div class="captain-section-body"><div class="section-heading compact"><div><span class="eyebrow">BLOQUEADO</span><h2>${CAPTAIN_REQUIRED_MESSAGE}</h2><p>Os equipamentos do Capitão usam Pontos de Nível temporários e só podem evoluir depois da escolha.</p></div></div></div>
      </section>`;
    }
    syncCaptainRuntimeState(state);
    const runtimeNeeded = captainRuntimeXpNeeded(state.captainRuntimeLevel);
    const runtimeRatio = clamp(state.captainCurrentXp / runtimeNeeded, 0, 1);
    const equipmentRows = Object.keys(CAPTAIN_EQUIPMENT_META).map(captainEquipmentDetailHtml).join("");
    return `<section class="captain-equipment-section captain-collapsible-section ${captainEquipmentExpanded ? "expanded" : ""}">
      ${toggle}
      <div class="captain-section-body">
      <div class="captain-runtime-panel">
        <div><span>Nível temporário</span><strong>${state.captainRuntimeLevel}</strong></div>
        <div><span>XP do ciclo</span><strong>${formatNumber(state.captainCurrentXp)} / ${formatNumber(runtimeNeeded)}</strong><i><b style="width:${runtimeRatio * 100}%"></b></i></div>
        <div><span>Pontos ganhos</span><strong>${state.totalLevelPointsEarned}</strong></div>
        <div><span>Pontos gastos</span><strong>${state.spentLevelPoints}</strong></div>
      </div>
      <div class="captain-equipment-list upgrade-feed-list">${equipmentRows}</div>
      </div>
    </section>`;
  }

  function captainIdentityHtml() {
    const cleanName = sanitizePirateName(state.pirateName);
    const missing = !isValidPirateName(cleanName);
    return `<section class="captain-identity-panel ${missing ? "missing" : ""}">
      <div>
        <span class="eyebrow">IDENTIDADE ONLINE</span>
        <h2>${cleanName ? escapeHtml(cleanName) : "Nome de Pirata"}</h2>
        <p>${missing ? "Escolha seu Nome de Pirata para aparecer no ranking online." : "Esse nome será usado no Ranking dos Piratas no próximo Prestígio registrado."}</p>
      </div>
      <div class="captain-identity-form">
        <label for="pirate-name-input"><span>Nome de Pirata</span><input class="pirate-name-input" id="pirate-name-input" maxlength="${PIRATE_NAME_MAX_LENGTH}" value="${escapeHtml(cleanName)}" autocomplete="nickname" placeholder="3 a 20 caracteres"></label>
        <button class="button primary" type="button" data-save-pirate-name>Salvar</button>
        <small>Mínimo ${PIRATE_NAME_MIN_LENGTH}, máximo ${PIRATE_NAME_MAX_LENGTH} caracteres.</small>
      </div>
    </section>`;
  }

  function updateCaptainIdentityPreview(cleanName = sanitizePirateName(state.pirateName)) {
    const panel = $(".captain-identity-panel");
    if (!panel) return;
    const missing = !isValidPirateName(cleanName);
    panel.classList.toggle("missing", missing);
    const title = $("h2", panel);
    const copy = $("p", panel);
    if (title) title.textContent = cleanName || "Nome de Pirata";
    if (copy) copy.textContent = missing
      ? "Escolha seu Nome de Pirata para aparecer no ranking online."
      : "Esse nome será usado no Ranking dos Piratas no próximo Prestígio registrado.";
  }

  function persistPirateNameFromInput({ feedback = false, render = false } = {}) {
    const input = $("#pirate-name-input");
    const cleanName = sanitizePirateName(input?.value || "");
    if (!isValidPirateName(cleanName)) {
      if (input) input.value = cleanName;
      if (feedback) toast(`Nome de Pirata precisa ter entre ${PIRATE_NAME_MIN_LENGTH} e ${PIRATE_NAME_MAX_LENGTH} caracteres.`, "danger-toast");
      return false;
    }
    state.pirateName = cleanName;
    if (input) input.value = cleanName;
    saveGame();
    renderTopbar();
    if (render) renderCaptain();
    else updateCaptainIdentityPreview(cleanName);
    if (feedback) toast("Nome de Pirata salvo.", "gold-toast");
    return true;
  }

  function bindCaptainIdentityControls(root = document) {
    const input = $("#pirate-name-input", root);
    const button = $("[data-save-pirate-name]", root);
    const saveFromControl = event => {
      event.preventDefault();
      event.stopPropagation();
      savePirateNameFromInput();
    };
    button?.addEventListener("pointerdown", saveFromControl);
    button?.addEventListener("click", saveFromControl);
    input?.addEventListener("input", () => {
      const cleanName = sanitizePirateName(input.value || "");
      if (isValidPirateName(cleanName)) persistPirateNameFromInput();
      else updateCaptainIdentityPreview("");
    });
    input?.addEventListener("blur", () => {
      if (isValidPirateName(input.value || "")) persistPirateNameFromInput();
    });
    input?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      savePirateNameFromInput();
    });
  }

  function renderCaptainPetsSection() {
    const current = getEquippedPet();
    const summary = current
      ? `${current.name} Nv. ${current.level} • ${state.ownedPets.length} / ${PETS.length} comprados`
      : `${state.ownedPets.length} / ${PETS.length} comprados • nenhum equipado`;
    return `<section class="captain-pets-section ${captainPetsExpanded ? "expanded" : ""}">
      <button class="captain-pets-toggle" type="button" data-toggle-captain-pets aria-expanded="${captainPetsExpanded ? "true" : "false"}">
        <span class="captain-pets-toggle-icon" aria-hidden="true">🐾</span>
        <span class="captain-pets-toggle-copy"><span class="eyebrow">COMPANHEIROS MARÍTIMOS</span><strong>Pets</strong><small>${summary}</small></span>
        <span class="captain-pets-toggle-count"><small>PETS</small><strong id="pets-owned-count">${state.ownedPets.length} / ${PETS.length}</strong></span>
        <i class="captain-pets-toggle-arrow" aria-hidden="true">${captainPetsExpanded ? "-" : "+"}</i>
      </button>
      <div class="captain-pets-body">
        <div class="pet-prestige-notice">
          <div><span class="eyebrow">REQUISITO PERMANENTE</span><strong>Pets só liberam com Prestígio</strong><p>Cada pet exige Prestígios acumulados e Moedas Pirata. Megalodon libera com 10 Prestígios, e Kraken com 20.</p></div>
          <button class="button prestige-button" data-screen-target="prestige">Ir para Prestígio</button>
        </div>
        <div class="pet-current-banner" id="pet-current-banner"></div>
        <div class="pets-grid captain-pets-list" id="pets-grid"></div>
      </div>
    </section>`;
  }

  function renderCaptainOverviewSection(current, next, cost, canUpgrade, nextPreview) {
    const toggle = captainCollapsibleToggleHtml({
      expanded: captainOverviewExpanded,
      attr: "data-toggle-captain-overview",
      icon: "★",
      eyebrow: "CAPITÃO",
      title: current.name,
      summary: `Nível ${current.level}/${CAPTAIN_MAX_LEVEL} • ${formatNumber(state.pirateCoins)} moedas`,
      countLabel: "MOEDAS",
      countValue: formatNumber(state.pirateCoins)
    });
    return `<section class="captain-equipment-section captain-overview-section captain-collapsible-section ${captainOverviewExpanded ? "expanded" : ""}">
      ${toggle}
      <div class="captain-section-body">
        <div class="captain-layout">
          <section class="captain-hero-panel">
            <div class="captain-portrait">${captainSpriteCanvasHtml(current.level, current.gender, "portrait")}</div>
            <div class="captain-hero-copy">
              <span class="eyebrow">NÍVEL ATUAL</span>
              <h2>${current.name}</h2>
              <div class="captain-level-row"><strong>${current.level} / ${CAPTAIN_MAX_LEVEL}</strong><div class="captain-level-pips">${captainLevelPips(current.level)}</div></div>
              <div class="cost-list"><span class="cost-chip">Progresso permanente</span><span class="cost-chip">Visual salvo</span></div>
            </div>
          </section>
          <section class="captain-detail-panel">
            <div class="section-heading compact"><div><span class="eyebrow">BÔNUS ACUMULADOS</span><h2>Ativos agora</h2></div></div>
            <div class="captain-bonus-grid">${captainBonusRowsHtml(current.bonuses)}</div>
            ${nextPreview}
            <button class="button prestige-button captain-upgrade-button" data-upgrade-captain ${!canUpgrade ? "disabled" : ""}>${next ? "Evoluir Capitão" : "Nível máximo"}</button>
            ${next && !canUpgrade ? `<p class="captain-upgrade-hint">Faltam ${formatNumber(cost - state.pirateCoins)} Moedas Pirata.</p>` : ""}
            <div class="captain-mutiny-panel"><div><span class="eyebrow">MOTIM</span><strong>Trocar escolha visual</strong><p>Reseta Capitão, Pontos de Nível e equipamentos. Moedas Pirata investidas no Capitão voltam.</p></div><button class="button danger" data-open-captain-mutiny>Iniciar um Motim</button></div>
          </section>
        </div>
      </div>
    </section>`;
  }

  function finalizeCaptainRender(content) {
    bindCaptainIdentityControls(content);
    renderCaptainPreviewCanvases(content);
    renderPets();
    decorateMissingPurchasePanels(content);
  }

  function renderCaptain() {
    $("#captain-coins").textContent = formatNumber(state.pirateCoins);
    const content = $("#captain-content");
    const current = getCurrentCaptain();
    if (!current) {
      content.innerHTML = `${captainIdentityHtml()}<div class="captain-choice-grid">${Object.entries(CAPTAIN_GENDERS).map(([gender, meta]) => {
        const level = getCaptainLevelData(1);
        return `<article class="captain-choice"><div class="captain-choice-image">${captainSpriteCanvasHtml(1, gender, "choice")}</div><div><span class="eyebrow">VISUAL INICIAL</span><h2>${meta.choice}</h2><p>${getCaptainName(1, gender)}</p><div class="captain-choice-bonuses">${captainLevelBonusText(level)}</div></div><button class="button primary" data-select-captain-gender="${gender}">Escolher</button></article>`;
      }).join("")}</div>${renderCaptainPetsSection()}${renderCaptainManualSkillSection(true)}${renderCaptainEquipmentSection(true)}`;
      finalizeCaptainRender(content);
      return;
    }
    const next = getNextCaptain();
    const cost = getCaptainUpgradeCost();
    const canUpgrade = next && state.pirateCoins >= cost;
    const nextPreview = next
      ? `<div class="captain-next"><div class="captain-next-image">${captainSpriteCanvasHtml(next.level, next.gender, "next")}</div><div><span class="eyebrow">PRÓXIMO NÍVEL</span><h3>${next.name}</h3><p>${captainLevelBonusText(next)}</p><strong>☠ ${formatNumber(cost)} Moedas Pirata</strong></div></div>`
      : `<div class="captain-next max"><div><span class="eyebrow">NÍVEL MÁXIMO</span><h3>Pirata lendário completo</h3><p>Todos os bônus permanentes do Capitão estão ativos.</p></div></div>`;
    content.innerHTML = `${captainIdentityHtml()}${renderCaptainOverviewSection(current, next, cost, canUpgrade, nextPreview)}${renderCaptainPetsSection()}${renderCaptainManualSkillSection()}${renderCaptainEquipmentSection()}`;
    finalizeCaptainRender(content);
  }

  function captainManualSkillDockButtonHtml([key, meta]) {
    const repairClass = key === CAPTAIN_REPAIR_SKILL_KEY ? " repair-skill-orb" : "";
    return `<button class="skill-orb manual-skill-orb${repairClass}" data-manual-skill="${key}" title="${meta.name}" aria-label="${meta.name}"><span class="cooldown"></span><span class="icon">${key === CAPTAIN_MANUAL_SKILL_KEY ? "✦" : meta.icon}</span><small></small></button>`;
  }

  function captainManualSkillDockHtml() {
    return Object.entries(CAPTAIN_MANUAL_SKILL_META).map(captainManualSkillDockButtonHtml).join("");
  }

  function updateCaptainManualSkillDock() {
    Object.entries(CAPTAIN_MANUAL_SKILL_META).forEach(([key, meta]) => {
      const node = $(`[data-manual-skill="${key}"]`);
      if (!node) return;
      const unlocked = isCaptainSelected();
      const arenaLocked = isArenaBattleWaiting() || isArenaBattleActive();
      const remaining = unlocked ? getCaptainManualSkillCooldownRemaining(key) : meta.cooldown;
      const isRepair = key === CAPTAIN_REPAIR_SKILL_KEY;
      const hasTarget = Boolean(state.combat.enemy && !state.combat.enemy.defeated);
      const maxHp = getActivePlayerMaxHp();
      const needsRepair = state.combat.playerHp > 0 && state.combat.playerHp < maxHp && !state.combat.repairing;
      const ready = unlocked && !arenaLocked && remaining <= 0 && (isRepair ? needsRepair : hasTarget);
      node.classList.toggle("locked", !unlocked);
      node.classList.toggle("off", unlocked && !ready);
      node.disabled = !ready;
      node.querySelector(".cooldown").style.transform = `scaleY(${unlocked ? clamp(remaining / meta.cooldown, 0, 1) : 1})`;
      const label = node.querySelector("small");
      if (label) label.textContent = "";
      node.title = !unlocked
        ? `Selecione um pirata inicial para desbloquear ${meta.name}`
        : arenaLocked
          ? isArenaBattleWaiting()
            ? `Arena começa em ${formatSeconds(getArenaStartRemainingSeconds())}`
            : `${meta.name} indisponível durante a Arena`
          : remaining > 0
            ? `${meta.name} recarrega em ${formatSeconds(remaining)}`
            : isRepair
              ? needsRepair
                ? `${meta.name} - repara ${Math.round(getCaptainRepairPercent() * 100)}% da vida máxima em 5s`
                : state.combat.repairing
                  ? "Restaurar Navio já está em andamento"
                  : "Navio já está com vida máxima"
              : hasTarget
                ? `${meta.name} - manual - ${formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key))} do dano atual`
                : "Sabotar Inimigo precisa de um alvo vivo";
    });
  }

  function renderSkillDock() {
    const dock = $("#skill-dock");
    const manualDock = $("#manual-skill-dock");
    const skillKeys = Object.keys(SKILL_META);
    const manualSkillCount = Object.keys(CAPTAIN_MANUAL_SKILL_META).length;
    if (
      dock.childElementCount === skillKeys.length &&
      (!manualDock || (manualDock.childElementCount === manualSkillCount && $(`[data-manual-skill="${CAPTAIN_MANUAL_SKILL_KEY}"]`, manualDock) && $(`[data-manual-skill="${CAPTAIN_REPAIR_SKILL_KEY}"]`, manualDock)))
    ) {
      skillKeys.forEach(key => {
        const node = $(`[data-skill-dock="${key}"]`, dock);
        node.classList.toggle("off", !state.skills[key].auto);
        node.classList.toggle("locked", !isSkillUnlocked(key));
        node.querySelector("small").textContent = isSkillUnlocked(key) ? (state.skills[key].auto ? "AUTO" : "OFF") : `N${SKILL_META[key].unlock}`;
        node.title = isSkillUnlocked(key) ? `${SKILL_META[key].name} • auto ${state.skills[key].auto ? "ligado" : "desligado"}` : `Desbloqueia no nível ${SKILL_META[key].unlock}`;
      });
      updateCaptainManualSkillDock();
      return;
    }
    dock.innerHTML = Object.entries(SKILL_META).map(([key, meta]) => `<button class="skill-orb ${isSkillUnlocked(key) ? "" : "locked"}" data-skill-dock="${key}" title="${meta.name}"><span class="cooldown"></span><span class="icon">${meta.icon}</span><small>${isSkillUnlocked(key) ? (state.skills[key].auto ? "AUTO" : "OFF") : `N${meta.unlock}`}</small></button>`).join("");
    if (manualDock) manualDock.innerHTML = captainManualSkillDockHtml();
    else dock.insertAdjacentHTML("beforeend", captainManualSkillDockHtml());
    updateCaptainManualSkillDock();
  }

  function updateSkillCooldowns() {
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      const node = $(`[data-skill-dock="${key}"]`);
      if (!node) return;
      const cooldown = getSkillCooldown(key);
      const ratio = isSkillUnlocked(key) && state.skills[key].auto ? clamp(state.skills[key].remaining / cooldown, 0, 1) : 1;
      node.querySelector(".cooldown").style.transform = `scaleY(${ratio})`;
    });
    updateCaptainManualSkillDock();
  }

  function formatStatDelta(value) {
    const sign = value >= 0 ? "+" : "−";
    return `${sign}${formatNumber(Math.abs(value))}`;
  }

  function formatSeconds(value) {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  }

  function getShipNumber(shipOrId) {
    const rawId = typeof shipOrId === "number" ? shipOrId : Number(shipOrId?.id);
    const id = Number.isFinite(rawId) ? Math.floor(rawId) : 0;
    return id + 1;
  }

  function getJourneyMaxUnlockedMap(source = state) {
    const reached = Math.floor(Number(source?.maxRegionReached));
    const unlocked = Math.floor(Number(source?.unlockedRegions));
    const reachedMap = Number.isFinite(reached) ? reached + 1 : 1;
    const unlockedMap = Number.isFinite(unlocked) ? unlocked : 1;
    return clamp(Math.max(1, reachedMap, unlockedMap), 1, REGIONS.length);
  }

  function getMaxShipNumberForMap(mapNumber = getJourneyMaxUnlockedMap()) {
    const currentMap = clamp(Math.floor(Number(mapNumber) || 1), 1, REGIONS.length);
    let limit = SHIP_UNLOCK_BY_MAP[1];
    for (let map = 1; map <= currentMap; map += 1) {
      if (SHIP_UNLOCK_BY_MAP[map]) limit = SHIP_UNLOCK_BY_MAP[map];
    }
    return clamp(limit, 1, SHIPS.length);
  }

  function getCurrentJourneyShipLimit(source = state) {
    return getMaxShipNumberForMap(getJourneyMaxUnlockedMap(source));
  }

  function getRequiredMapForShip(shipOrId) {
    const shipNumber = getShipNumber(shipOrId);
    const entry = Object.entries(SHIP_UNLOCK_BY_MAP).find(([, maxShip]) => shipNumber <= maxShip);
    return entry ? Number(entry[0]) : REGIONS.length;
  }

  function isShipUnlockedInCurrentJourney(shipOrId, source = state) {
    return getShipNumber(shipOrId) <= getCurrentJourneyShipLimit(source);
  }

  function getShipMapLockIssue(ship) {
    if (!ship || isShipUnlockedInCurrentJourney(ship)) return "";
    return `Desbloqueia no Mapa ${getRequiredMapForShip(ship)}`;
  }

  function getStatsPreview(levelOverrides = {}, shipId = state.shipId) {
    const previousLevels = state.levels;
    state.levels = { ...state.levels, ...levelOverrides };
    try {
      return getStats(shipId);
    } finally {
      state.levels = previousLevels;
    }
  }

  function getStatsWithTemporaryState(mutator) {
    const previousEquipment = { ...state.equipment };
    const previousSkills = Object.fromEntries(Object.entries(state.skills).map(([key, value]) => [key, { ...value }]));
    const previousCaptainEquipment = { ...state.captainEquipment };
    const previousCaptainBonuses = { ...state.captainEquipmentBonuses };
    try {
      mutator();
      return getStats();
    } finally {
      state.equipment = previousEquipment;
      state.skills = previousSkills;
      state.captainEquipment = previousCaptainEquipment;
      state.captainEquipmentBonuses = previousCaptainBonuses;
    }
  }

  function getHighestOwnedShipId() {
    return state.ownedShips.reduce((highest, id) => SHIPS[id] ? Math.max(highest, Number(id)) : highest, 0);
  }

  function getNextFleetShip() {
    return SHIPS[getHighestOwnedShipId() + 1] || null;
  }

  function getShipEnemyKills(shipId = state.shipId) {
    return Math.max(0, Math.floor(Number(state.shipEnemyKills?.[shipId]) || 0));
  }

  function addShipEnemyKills(shipId = state.shipId, count = 1) {
    const id = Math.floor(Number(shipId));
    const amount = Math.max(0, Math.floor(Number(count) || 0));
    if (!SHIPS[id] || amount <= 0) return;
    if (!state.shipEnemyKills || typeof state.shipEnemyKills !== "object") state.shipEnemyKills = {};
    state.shipEnemyKills[id] = getShipEnemyKills(id) + amount;
  }

  function getShipUnlockKillProgress(shipOrId) {
    const targetId = typeof shipOrId === "object" ? Number(shipOrId?.id) : Number(shipOrId);
    const sourceId = targetId - 1;
    const count = getShipEnemyKills(sourceId);
    return {
      sourceId,
      count,
      required: SHIP_UNLOCK_KILL_REQUIREMENT,
      remaining: Math.max(0, SHIP_UNLOCK_KILL_REQUIREMENT - count),
      complete: count >= SHIP_UNLOCK_KILL_REQUIREMENT
    };
  }

  function getShipKillLockIssue(ship) {
    if (!ship || state.ownedShips.includes(ship.id)) return "";
    const progress = getShipUnlockKillProgress(ship);
    const sourceShip = SHIPS[progress.sourceId];
    if (!sourceShip || !state.ownedShips.includes(progress.sourceId)) return "";
    if (state.shipId !== progress.sourceId) return `Equipe ${sourceShip.name} para liberar o próximo navio`;
    if (progress.complete) return "";
    return `Vitórias com ${sourceShip.name}: ${Math.min(progress.required, progress.count)} / ${progress.required}`;
  }

  function getOwnedShipIds() {
    return [...new Set(state.ownedShips)].filter(id => SHIPS[id]).sort((a, b) => a - b);
  }

  function getAdjacentOwnedShipId(direction, shipId = state.shipId) {
    const ownedIds = getOwnedShipIds();
    const currentIndex = ownedIds.indexOf(shipId);
    if (currentIndex < 0) return null;
    const nextIndex = currentIndex + direction;
    return ownedIds[nextIndex] === undefined ? null : ownedIds[nextIndex];
  }

  function fleetPreviousButtonHtml(previousOwnedId = getAdjacentOwnedShipId(-1)) {
    return previousOwnedId === null
      ? `<button class="button fleet-nav-button" disabled>Anterior</button>`
      : `<button class="button fleet-nav-button" data-equip-ship="${previousOwnedId}">Anterior</button>`;
  }

  function fleetActionHtml({ mainLabel, mainAttrs = "", disabled = false, balance = "", hint = "", previousOwnedId = getAdjacentOwnedShipId(-1), primary = true }) {
    return `<div class="upgrade-row-action fleet-action-row">${fleetPreviousButtonHtml(previousOwnedId)}<button class="button ${primary ? "primary" : ""}" ${mainAttrs} ${disabled ? "disabled" : ""}>${mainLabel}</button>${balance}${hint ? `<small>${hint}</small>` : ""}</div>`;
  }

  function fleetPurchaseActionHtml(nextShip, blocked = false, hint = "") {
    const previousOwnedId = getAdjacentOwnedShipId(-1);
    const cost = nextShip.costs;
    const affordable = canAfford(cost);
    const info = cost && !affordable && !blocked ? getMissingPurchaseInfo(cost) : null;
    const goldCost = cost?.ouro || 0;
    const requiredGold = affordable ? goldCost : info ? info.total + goldCost : goldCost;
    const missingGold = Math.max(0, requiredGold - state.resources.ouro);
    const unavailableLabel = missingGold > 0 ? `Faltam ${formatNumber(missingGold)} Ouro` : "Faltam Gold";
    const smartTotal = affordable ? goldCost : info?.canBuyAndExecute ? requiredGold : 0;
    const afterGold = Math.max(0, state.resources.ouro - smartTotal);
    const label = blocked ? "Bloqueado" : affordable ? "Comprar" : info?.canBuyAndExecute ? "Comprar tudo" : unavailableLabel;
    const disabled = blocked || (!affordable && !info?.canBuyAndExecute);
    const attrs = affordable ? `data-buy-ship="${nextShip.id}"` : `data-smart-upgrade="ship" data-smart-upgrade-id="${nextShip.id}"`;
    const balanceClass = disabled && !blocked ? " danger" : "";
    const afterText = disabled && !blocked ? unavailableLabel : `${formatNumber(afterGold)} Ouro`;
    const balance = `<div class="upgrade-balance${balanceClass}"><span>Saldo atual: <strong>${formatNumber(state.resources.ouro)} Ouro</strong></span><span>Após compra: <strong>${afterText}</strong></span></div>`;
    return fleetActionHtml({ mainLabel: label, mainAttrs: attrs, disabled, balance, hint, previousOwnedId });
  }

  function statRowsHtml(rows) {
    return `<div class="upgrade-row-stats">${rows.map(row => `<div><span>${row.label}</span><strong>${row.value}</strong>${row.delta ? `<small>${row.delta}</small>` : ""}</div>`).join("")}</div>`;
  }

  function upgradeActionHtml(kind, id, cost, canExecute, options = {}) {
    if (options.completed) return `<div class="upgrade-row-action"><span class="upgrade-row-status">${options.completedText || "Comprado"}</span>${options.hint ? `<small>${options.hint}</small>` : ""}</div>`;
    const attrs = kind === "upgrade" ? `data-upgrade="${id}"` : kind === "ship" ? `data-buy-ship="${id}"` : kind === "equipment" ? `data-craft-equipment="${id}"` : `data-upgrade-skill="${id}"`;
    const affordable = cost && canAfford(cost);
    const info = cost && !affordable && !options.blocked ? getMissingPurchaseInfo(cost) : null;
    const goldCost = cost?.ouro || 0;
    const requiredGold = affordable ? goldCost : info ? info.total + goldCost : goldCost;
    const missingGold = Math.max(0, requiredGold - state.resources.ouro);
    const unavailableLabel = missingGold > 0 ? `Faltam ${formatNumber(missingGold)} Ouro` : "Faltam Gold";
    const smartTotal = affordable ? goldCost : info?.canBuyAndExecute ? requiredGold : 0;
    const afterGold = Math.max(0, state.resources.ouro - smartTotal);
    const directLabel = kind === "upgrade" || kind === "skill" ? "Melhorar" : "Comprar";
    const label = options.blocked ? "Bloqueado" : affordable ? directLabel : info?.canBuyAndExecute ? "Comprar tudo" : unavailableLabel;
    const disabled = options.blocked || (!affordable && !info?.canBuyAndExecute);
    const actionAttrs = affordable ? attrs : `data-smart-upgrade="${kind}" data-smart-upgrade-id="${id}"`;
    const balanceClass = disabled && !options.blocked ? " danger" : "";
    const afterText = disabled && !options.blocked ? unavailableLabel : `${formatNumber(afterGold)} Ouro`;
    return `<div class="upgrade-row-action"><button class="button primary" ${actionAttrs} ${disabled ? "disabled" : ""}>${label}</button><div class="upgrade-balance${balanceClass}"><span>Saldo atual: <strong>${formatNumber(state.resources.ouro)} Ouro</strong></span><span>Após compra: <strong>${afterText}</strong></span></div>${options.hint ? `<small>${options.hint}</small>` : ""}</div>`;
  }

  function getShipProgressionIssues(ship) {
    const issues = [];
    const mapLockIssue = getShipMapLockIssue(ship);
    if (mapLockIssue) issues.push(mapLockIssue);
    const killLockIssue = getShipKillLockIssue(ship);
    if (killLockIssue) issues.push(killLockIssue);
    const prologueComplete = state.bossesDefeated[PRIMITIVE_REGIONS.length - 1];
    if (ship.tier >= 1 && !prologueComplete) issues.push("Conclua o prólogo da Era Primitiva");
    const prestigeReq = Math.max(0, ship.tier - 1);
    if (state.prestiges < prestigeReq) issues.push(`Prestígios atuais: ${state.prestiges} / ${prestigeReq}`);
    if (state.pirateLevel < ship.levelReq) issues.push(`Requer nível ${ship.levelReq}`);
    return issues;
  }

  function getImprovementRows(type) {
    const current = getStats();
    const next = getStatsPreview({ [type]: state.levels[type] + 1 });
    const row = (label, key) => ({ label, value: `${formatNumber(current[key])} → ${formatNumber(next[key])}`, delta: formatStatDelta(next[key] - current[key]) });
    if (type === "ship") return [row("Dano", "damage"), row("Vida", "maxHp"), row("Veloc.", "speed"), row("Defesa", "armor")];
    if (type === "cannons") return [row("Dano", "damage"), { label: "Crítico", value: `${Math.round(current.crit * 100)}% → ${Math.round(next.crit * 100)}%`, delta: `+${Math.max(0, Math.round((next.crit - current.crit) * 100))}%` }, { label: "DPS", value: `${formatNumber(current.shipDps)} → ${formatNumber(next.shipDps)}`, delta: formatStatDelta(next.shipDps - current.shipDps) }];
    if (type === "sails") return [row("Veloc.", "speed"), { label: "Evasão", value: `${Math.round(current.evasion * 100)}% → ${Math.round(next.evasion * 100)}%`, delta: `+${Math.max(0, Math.round((next.evasion - current.evasion) * 100))}%` }, { label: "DPS", value: `${formatNumber(current.shipDps)} → ${formatNumber(next.shipDps)}`, delta: formatStatDelta(next.shipDps - current.shipDps) }];
    return [row("Vida", "maxHp"), row("Defesa", "armor"), { label: "Poder", value: `${formatNumber(current.power)} → ${formatNumber(next.power)}`, delta: formatStatDelta(next.power - current.power) }];
  }

  function formatPercentDelta(value) {
    const rounded = Math.round(Math.abs(value) * 100);
    return `${value >= 0 ? "+" : "−"}${rounded}%`;
  }

  function getPositiveStatRows(current, next, keys = ["damage", "maxHp", "speed", "armor", "crit", "evasion", "shipDps", "dps"]) {
    const meta = {
      damage: ["Dano", value => formatNumber(value), value => formatStatDelta(value)],
      maxHp: ["Vida", value => formatNumber(value), value => formatStatDelta(value)],
      speed: ["Veloc.", value => formatNumber(value), value => formatStatDelta(value)],
      armor: ["Defesa", value => formatNumber(value), value => formatStatDelta(value)],
      precision: ["Precisão", value => `${Math.round(value * 100)}%`, value => formatPercentDelta(value)],
      crit: ["Crítico", value => `${Math.round(value * 100)}%`, value => formatPercentDelta(value)],
      evasion: ["Evasão", value => `${Math.round(value * 100)}%`, value => formatPercentDelta(value)],
      shipDps: ["DPS navio", value => formatNumber(value), value => formatStatDelta(value)],
      skillDps: ["DPS skill", value => formatNumber(value), value => formatStatDelta(value)],
      dps: ["DPS", value => formatNumber(value), value => formatStatDelta(value)]
    };
    return keys
      .map(key => {
        const config = meta[key];
        if (!config) return null;
        const delta = (next[key] || 0) - (current[key] || 0);
        if (Math.abs(delta) < .0001) return null;
        const [label, formatValue, formatDelta] = config;
        return { label, value: `${formatValue(current[key] || 0)} → ${formatValue(next[key] || 0)}`, delta: formatDelta(delta) };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  function shortenRecommendationText(text, fallback = "") {
    const clean = String(text || fallback || "").replace(/\s+/g, " ").trim();
    return clean.length > 78 ? `${clean.slice(0, 75).trim()}...` : clean;
  }

  function recommendationImpactText(rows, fallback = "") {
    const usefulRows = (rows || []).filter(row => {
      if (!row) return false;
      const delta = String(row.delta || "").trim();
      if (delta && ["+0", "+0%", "-0", "-0%", "−0", "−0%"].includes(delta)) return false;
      const value = String(row.value || delta || "").trim();
      if (!value) return false;
      const parts = value.split(/\s*(?:->|→)\s*/);
      if (parts.length === 2 && parts[0] === parts[1]) return false;
      return true;
    });
    const row = usefulRows.find(item => item.value) || usefulRows[0];
    if (!row) return shortenRecommendationText(fallback);
    return shortenRecommendationText(`${row.label}: ${row.value || row.delta}`, fallback);
  }

  function recommendationImpactFromStats(current, next, fallback = "", keys = ["damage", "maxHp", "speed", "armor", "crit", "evasion", "shipDps", "dps"]) {
    return recommendationImpactText(getPositiveStatRows(current, next, keys), fallback);
  }

  function shipSkillRecommendationImpactText(key, level = state.skills[key]?.level || 1) {
    const stats = getStats();
    const current = getSkillValues(key, level, stats);
    const next = getSkillValues(key, level + 1, stats);
    return recommendationImpactText([
      { label: "Dano da skill", value: `${formatNumber(current.damage)} -> ${formatNumber(next.damage)}`, delta: formatStatDelta(next.damage - current.damage) },
      { label: "DPS da skill", value: `${formatNumber(current.dps)} -> ${formatNumber(next.dps)}`, delta: formatStatDelta(next.dps - current.dps) },
      { label: "Cooldown", value: `${formatSeconds(current.cooldown)} -> ${formatSeconds(next.cooldown)}` }
    ], SKILL_META[key]?.effect || "");
  }

  function recommendationBonusPercent(value) {
    const amount = Math.max(0, Number(value) || 0) * 100;
    return `+${amount.toLocaleString("pt-BR", { maximumFractionDigits: amount % 1 ? 1 : 0 })}%`;
  }

  function captainEquipmentRecommendationImpactText(key, currentTier, nextTier, currentStats = getStats(), nextStats = currentStats) {
    const current = currentTier?.bonuses || {};
    const next = nextTier?.bonuses || {};
    if (key === "lightHands") {
      return `Ouro e EXP ganhos: ${recommendationBonusPercent(current.goldGainBonus)} -> ${recommendationBonusPercent(next.goldGainBonus)}`;
    }
    if (key === "sword") {
      return `Dano do pirata: ${formatNumber(currentStats.damage)} -> ${formatNumber(nextStats.damage)}`;
    }
    const rows = [
      ["Dano do navio", "shipDamageBonus"],
      ["Velocidade de ataque", "shipAttackSpeedBonus"],
      ["Vida do navio", "shipHpBonus"],
      ["Defesa do navio", "shipArmorBonus"],
      ["Esquiva", "dodgeChance"],
      ["Critico", "critChance"],
      ["Ataque duplo", "doubleAttackChance"],
      ["Ouro ganho", "goldGainBonus"],
      ["EXP ganho", "xpGainBonus"]
    ]
      .filter(([, bonusKey]) => Math.abs((next[bonusKey] || 0) - (current[bonusKey] || 0)) > .0001)
      .map(([label, bonusKey]) => ({ label, value: `${recommendationBonusPercent(current[bonusKey])} -> ${recommendationBonusPercent(next[bonusKey])}` }));
    return recommendationImpactText(rows, nextTier?.name || "");
  }

  function captainManualSkillRecommendationImpactText(key, level = getCaptainManualSkillLevel(key), stats = getStats()) {
    const nextLevel = level + 1;
    if (key === CAPTAIN_REPAIR_SKILL_KEY) {
      return `Reparo do navio: ${formatCaptainRepairPercent(level)} -> ${formatCaptainRepairPercent(nextLevel)}`;
    }
    return `Dano da habilidade: ${formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key, level))} -> ${formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key, nextLevel))}`;
  }

  function upgradeSummaryHtml(rows, fallback = "") {
    const items = rows && rows.length ? rows : fallback ? [{ label: fallback, delta: "" }] : [];
    return items.map(row => `<span>${row.label}${row.delta || row.value ? ` <strong>${row.delta || row.value}</strong>` : ""}</span>`).join("");
  }

  function upgradeSummaryText(rows, fallback = "") {
    if (!rows?.length) return fallback;
    return rows.slice(0, 3).map(row => `${row.label} ${row.delta || row.value}`).join(" • ");
  }

  function upgradeTableButtonHtml(label, attrs = "", disabled = false, className = "primary") {
    return `<button class="button ${className}" ${attrs} ${disabled ? "disabled" : ""}>${label}</button>`;
  }

  function upgradeTableRowHtml({ classes = "", style = "", icon, eyebrow, title, note = "", power, powerSub = "", value, valueSub = "", summaryRows = [], summaryFallback = "", costHtml = "", actionHtml = "" }) {
    const summaryText = upgradeSummaryText(summaryRows, summaryFallback);
    const recommendedBadge = classes.includes("recommended") ? `<span class="recommendation-badge">Recomendado</span>` : "";
    return `<article class="upgrade-row upgrade-table-row ${classes}" ${style ? `style="${style}"` : ""}>
      <div class="upgrade-table-main"><div class="upgrade-row-icon">${icon}</div><div><span class="level-label">${eyebrow}</span><h3>${title}${recommendedBadge}</h3><p>${note || summaryText}</p></div></div>
      <div class="upgrade-table-power"><strong>${power}</strong>${powerSub ? `<small>${powerSub}</small>` : ""}</div>
      <div class="upgrade-table-value"><strong>${value}</strong>${valueSub ? `<small>${valueSub}</small>` : ""}</div>
      <div class="upgrade-table-summary">${upgradeSummaryHtml(summaryRows, summaryFallback)}</div>
      <div class="upgrade-table-cost">${costHtml}</div>
      <div class="upgrade-table-action">${actionHtml}</div>
    </article>`;
  }

  function legacyUpgradeLineHtml(item) {
    const cost = getUpgradeCost(item.key);
    const affordable = canAfford(cost);
    return `<article class="upgrade-row ${affordable ? "available" : ""}"><div class="upgrade-row-icon">${item.icon}</div><div class="upgrade-row-main"><span class="level-label">NÍVEL ${state.levels[item.key]}</span><h3>${item.name}</h3><p>${item.desc}</p>${statRowsHtml(getImprovementRows(item.key))}<div class="cost-list">${resourceCostHtml(cost)}</div><div class="resource-readiness ${affordable ? "ready" : "missing"}">${missingResourcesText(cost)}</div></div>${upgradeActionHtml("upgrade", item.key, cost, affordable, { hint: `Próximo: nível ${state.levels[item.key] + 1}` })}</article>`;
  }

  function upgradeTableActionState(kind, id, cost, options = {}) {
    const attrs = kind === "upgrade" ? `data-upgrade="${id}"` : kind === "ship" ? `data-buy-ship="${id}"` : kind === "equipment" ? `data-craft-equipment="${id}"` : `data-upgrade-skill="${id}"`;
    const affordable = cost && canAfford(cost);
    const info = cost && !affordable && !options.blocked ? getMissingPurchaseInfo(cost) : null;
    const goldCost = cost?.ouro || 0;
    const requiredGold = affordable ? goldCost : info ? info.total + goldCost : goldCost;
    const missingGold = Math.max(0, requiredGold - state.resources.ouro);
    const unavailableLabel = missingGold > 0 ? `Faltam ${formatNumber(missingGold)} Ouro` : "Faltam Gold";
    const smartTotal = affordable ? goldCost : info?.canBuyAndExecute ? requiredGold : 0;
    const afterGold = Math.max(0, state.resources.ouro - smartTotal);
    const directLabel = kind === "upgrade" || kind === "skill" ? "Melhorar" : "Comprar";
    const label = options.blocked ? "Bloqueado" : affordable ? directLabel : info?.canBuyAndExecute ? "Comprar tudo" : unavailableLabel;
    const disabled = options.blocked || (!affordable && !info?.canBuyAndExecute);
    const actionAttrs = affordable ? attrs : `data-smart-upgrade="${kind}" data-smart-upgrade-id="${id}"`;
    const afterText = disabled && !options.blocked ? unavailableLabel : `${formatNumber(afterGold)} Ouro`;
    return { actionAttrs, afterText, disabled, label };
  }

  function upgradeLineHtml(item) {
    const cost = getUpgradeCost(item.key);
    const affordable = canAfford(cost);
    const rows = getImprovementRows(item.key);
    const action = upgradeTableActionState("upgrade", item.key, cost);
    const currentStats = getStats();
    const nextStats = getStatsPreview({ [item.key]: state.levels[item.key] + 1 });
    const powerGain = Math.max(0, nextStats.power - currentStats.power);
    const summaryRows = rows
      .filter(row => row.label !== "Poder")
      .filter(row => row.delta && !["+0", "+0%"].includes(row.delta))
      .slice(0, 3);
    const visibleRows = summaryRows.length ? summaryRows : rows.filter(row => row.label !== "Poder").slice(0, 3);
    const recommendation = buildProgressRecommendationCandidates()[0];
    const recommended = recommendationActionMatches(recommendation, `data-upgrade="${item.key}"`) ||
      (recommendationActionMatches(recommendation, `data-smart-upgrade="upgrade"`) && recommendationActionMatches(recommendation, `data-smart-upgrade-id="${item.key}"`));
    return upgradeTableRowHtml({
      classes: `${affordable ? "available" : ""} ${recommended ? "recommended" : ""}`,
      icon: item.icon,
      eyebrow: `NÍVEL ${state.levels[item.key]}`,
      title: item.name,
      power: `+${formatNumber(powerGain)}`,
      powerSub: `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}`,
      value: `Nível ${state.levels[item.key] + 1}`,
      valueSub: `Atual ${state.levels[item.key]}`,
      summaryRows: visibleRows,
      summaryFallback: item.desc,
      costHtml: resourceCostHtml(cost),
      actionHtml: upgradeTableButtonHtml(action.label, action.actionAttrs, action.disabled)
    });
  }

  function fleetSelectionLineHtml() {
    const ownedIds = [...new Set(state.ownedShips)].filter(id => SHIPS[id]).sort((a, b) => a - b);
    const buttons = ownedIds.map(id => {
      const ship = SHIPS[id];
      const current = id === state.shipId;
      const stats = getStats(id);
      return `<button class="fleet-ship-option ${current ? "current" : ""}" data-equip-ship="${id}" aria-label="${current ? `${ship.name} equipado` : `Selecionar ${ship.name}`}" ${current ? "disabled" : ""}><span>${ship.name}</span><small>Tier ${ship.tier} • Poder ${formatNumber(stats.power)}</small><strong>${current ? "Atual" : "Selecionar"}</strong></button>`;
    }).join("");
    return `<article class="upgrade-row fleet-select-row completed"><div class="upgrade-row-icon">⛵</div><div class="upgrade-row-main"><span class="level-label">NAVIOS CONSTRUÍDOS</span><h3>Selecionar barco da frota</h3><p>Troque para qualquer barco já comprado sem gastar recursos.</p><div class="fleet-ship-selector">${buttons}</div></div><div class="upgrade-row-action"><span class="upgrade-row-status">Atual: ${SHIPS[state.shipId].name}</span><small>${ownedIds.length}/${SHIPS.length} construídos</small></div></article>`;
  }

  function fleetLineHtml() {
    const currentShip = SHIPS[state.shipId];
    const nextShip = getNextFleetShip();
    if (!nextShip) {
      return `<article class="upgrade-row completed"><div class="upgrade-row-icon">⛵</div><div class="upgrade-row-main"><span class="level-label">FROTA COMPLETA</span><h3>Frota: troque de barco!</h3><p>Todos os barcos da jornada já foram construídos.</p>${statRowsHtml([{ label: "Navio atual", value: currentShip.name }, { label: "Tier", value: currentShip.tier }, { label: "Poder", value: formatNumber(getStats().power) }])}</div><div class="upgrade-row-action"><button class="button" disabled>Completo</button></div></article>`;
    }
    const progressionIssues = getShipProgressionIssues(nextShip);
    const affordable = canAfford(nextShip.costs);
    const currentStats = getStats();
    const nextStats = getStats(nextShip.id);
    const canBuy = progressionIssues.length === 0 && affordable;
    const rows = [
      { label: "Novo barco", value: nextShip.name, delta: `Tier ${nextShip.tier}` },
      { label: "Dano", value: `${formatNumber(currentStats.damage)} → ${formatNumber(nextStats.damage)}`, delta: formatStatDelta(nextStats.damage - currentStats.damage) },
      { label: "Vida", value: `${formatNumber(currentStats.maxHp)} → ${formatNumber(nextStats.maxHp)}`, delta: formatStatDelta(nextStats.maxHp - currentStats.maxHp) },
      { label: "Poder", value: `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}`, delta: formatStatDelta(nextStats.power - currentStats.power) }
    ];
    const mapHint = getShipMapLockIssue(nextShip);
    return `<article class="upgrade-row fleet-upgrade ${canBuy ? "available" : ""}"><div class="upgrade-row-icon ship-preview-icon"><canvas data-next-ship-preview="${nextShip.id}" aria-label="Próximo barco: ${nextShip.name}"></canvas></div><div class="upgrade-row-main"><span class="level-label">FROTA ${state.ownedShips.length}/${SHIPS.length}</span><h3>Frota: troque de barco!</h3><p>Compre o próximo barco da sequência: ${nextShip.name}.</p>${statRowsHtml(rows)}<div class="cost-list">${resourceCostHtml(nextShip.costs)}</div><div class="resource-readiness ${canBuy ? "ready" : "missing"}">${progressionIssues.length ? `Requisito: ${progressionIssues.join(" • ")}` : missingResourcesText(nextShip.costs)}</div></div>${upgradeActionHtml("ship", nextShip.id, nextShip.costs, canBuy, { blocked: progressionIssues.length > 0, hint: mapHint || `Atual: ${currentShip.name}` })}</article>`;
  }

  function fleetLineCompactHtml() {
    const currentShip = SHIPS[state.shipId];
    const highestOwnedId = getHighestOwnedShipId();
    const previousOwnedId = getAdjacentOwnedShipId(-1);
    const nextOwnedId = getAdjacentOwnedShipId(1);
    const viewingLatest = currentShip.id === highestOwnedId;
    if (!viewingLatest && nextOwnedId !== null) {
      const nextOwnedShip = SHIPS[nextOwnedId];
      const currentStats = getStats();
      const nextStats = getStats(nextOwnedShip.id);
      const rows = [
        { label: "Navio seguinte", value: nextOwnedShip.name, delta: "Já construído" },
        { label: "Dano", value: `${formatNumber(currentStats.damage)} → ${formatNumber(nextStats.damage)}`, delta: formatStatDelta(nextStats.damage - currentStats.damage) },
        { label: "Vida", value: `${formatNumber(currentStats.maxHp)} → ${formatNumber(nextStats.maxHp)}`, delta: formatStatDelta(nextStats.maxHp - currentStats.maxHp) },
        { label: "Poder", value: `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}`, delta: formatStatDelta(nextStats.power - currentStats.power) }
      ];
      const balance = `<div class="upgrade-balance"><span>Atual: <strong>${currentShip.name}</strong></span><span>Mais recente: <strong>${SHIPS[highestOwnedId].name}</strong></span></div>`;
      return `<article class="upgrade-row fleet-upgrade fleet-browsing"><div class="upgrade-row-icon ship-preview-icon"><canvas data-next-ship-preview="${nextOwnedShip.id}" aria-label="Próximo barco: ${nextOwnedShip.name}"></canvas></div><div class="upgrade-row-main"><span class="level-label">FROTA ${getOwnedShipIds().length}/${SHIPS.length}</span><h3>Frota: ${currentShip.name}</h3><p>Você está navegando em um navio anterior. Volte ao navio mais recente para construir o próximo barco.</p>${statRowsHtml(rows)}<div class="cost-list"><span class="cost-chip">Navio já construído</span><span class="cost-chip">Sem custo para trocar</span></div><div class="resource-readiness ready">Use Próximo até chegar ao navio mais recente.</div></div>${fleetActionHtml({ mainLabel: "Próximo", mainAttrs: `data-equip-ship="${nextOwnedShip.id}"`, balance, hint: "A compra de novos navios libera no mais recente.", previousOwnedId })}</article>`;
    }
    const nextShip = getNextFleetShip();
    if (!nextShip) {
      const balance = `<div class="upgrade-balance"><span>Atual: <strong>${currentShip.name}</strong></span><span>Construídos: <strong>${getOwnedShipIds().length}/${SHIPS.length}</strong></span></div>`;
      return `<article class="upgrade-row completed"><div class="upgrade-row-icon">⛵</div><div class="upgrade-row-main"><span class="level-label">FROTA COMPLETA</span><h3>Frota: ${currentShip.name}</h3><p>Todos os barcos da jornada já foram construídos.</p>${statRowsHtml([{ label: "Navio atual", value: currentShip.name }, { label: "Tier", value: currentShip.tier }, { label: "Poder", value: formatNumber(getStats().power) }])}</div>${fleetActionHtml({ mainLabel: "Completo", disabled: true, balance, previousOwnedId, primary: false })}</article>`;
    }
    const progressionIssues = getShipProgressionIssues(nextShip);
    const affordable = canAfford(nextShip.costs);
    const currentStats = getStats();
    const nextStats = getStats(nextShip.id);
    const canBuy = progressionIssues.length === 0 && affordable;
    const rows = [
      { label: "Novo barco", value: nextShip.name, delta: `Tier ${nextShip.tier}` },
      { label: "Dano", value: `${formatNumber(currentStats.damage)} → ${formatNumber(nextStats.damage)}`, delta: formatStatDelta(nextStats.damage - currentStats.damage) },
      { label: "Vida", value: `${formatNumber(currentStats.maxHp)} → ${formatNumber(nextStats.maxHp)}`, delta: formatStatDelta(nextStats.maxHp - currentStats.maxHp) },
      { label: "Poder", value: `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}`, delta: formatStatDelta(nextStats.power - currentStats.power) }
    ];
    const mapHint = getShipMapLockIssue(nextShip);
    const recommendation = buildProgressRecommendationCandidates()[0];
    const recommended = recommendationActionMatches(recommendation, `data-buy-ship="${nextShip.id}"`) ||
      (recommendationActionMatches(recommendation, `data-smart-upgrade="ship"`) && recommendationActionMatches(recommendation, `data-smart-upgrade-id="${nextShip.id}"`));
    const recommendedBadge = recommended ? `<span class="recommendation-badge">Recomendado</span>` : "";
    return `<article class="upgrade-row fleet-upgrade ${canBuy ? "available" : ""} ${recommended ? "recommended" : ""}"><div class="upgrade-row-icon ship-preview-icon"><canvas data-next-ship-preview="${nextShip.id}" aria-label="Próximo barco: ${nextShip.name}"></canvas></div><div class="upgrade-row-main"><span class="level-label">FROTA ${getOwnedShipIds().length}/${SHIPS.length}</span><h3>Frota: ${currentShip.name}${recommendedBadge}</h3><p>Compre o próximo barco da sequência: ${nextShip.name}.</p>${statRowsHtml(rows)}<div class="cost-list">${resourceCostHtml(nextShip.costs)}</div><div class="resource-readiness ${canBuy ? "ready" : "missing"}">${progressionIssues.length ? `Requisito: ${progressionIssues.join(" • ")}` : missingResourcesText(nextShip.costs)}</div></div>${fleetPurchaseActionHtml(nextShip, progressionIssues.length > 0, mapHint || `Atual: ${currentShip.name}`)}</article>`;
  }

  function equipmentLineHtml([key, item]) {
    const equipped = state.equipment[key];
    const affordable = canAfford(item.costs);
    const currentStats = getStats();
    const nextStats = equipped ? currentStats : getStatsWithTemporaryState(() => { state.equipment[key] = true; });
    const powerGain = Math.max(0, nextStats.power - currentStats.power);
    const statRows = getPositiveStatRows(currentStats, nextStats, ["damage", "maxHp", "speed", "armor", "precision", "crit", "evasion", "shipDps", "dps"]);
    if (!equipped && key === "compass") statRows.push({ label: "Loot", value: "Chance de loot", delta: "+8%" });
    const action = equipped
      ? { actionAttrs: "", disabled: true, label: "Comprado" }
      : upgradeTableActionState("equipment", key, item.costs);
    const recommendation = buildProgressRecommendationCandidates()[0];
    const recommended = !equipped && (recommendationActionMatches(recommendation, `data-craft-equipment="${key}"`) ||
      (recommendationActionMatches(recommendation, `data-smart-upgrade="equipment"`) && recommendationActionMatches(recommendation, `data-smart-upgrade-id="${key}"`)));
    return upgradeTableRowHtml({
      classes: `${equipped ? "completed" : affordable ? "available" : ""} ${recommended ? "recommended" : ""}`,
      icon: item.icon,
      eyebrow: equipped ? "EQUIPAMENTO ATIVO" : "EQUIPAMENTO",
      title: item.name,
      power: equipped ? "Ativo" : `+${formatNumber(powerGain)}`,
      powerSub: equipped ? formatNumber(currentStats.power) : `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}`,
      value: equipped ? "Comprado" : "Permanente",
      valueSub: equipped ? "Bônus ativo" : "Compra única",
      summaryRows: statRows.slice(0, 4),
      summaryFallback: item.effect,
      costHtml: equipped ? `<span class="cost-chip">Ativo permanente</span>` : resourceCostHtml(item.costs),
      actionHtml: upgradeTableButtonHtml(action.label, action.actionAttrs, action.disabled)
    });
  }

  function skillLineHtml([key, meta]) {
    const unlocked = isSkillUnlocked(key);
    const skill = state.skills[key];
    const current = getSkillValues(key, skill.level);
    const next = getSkillValues(key, skill.level + 1);
    const cost = getSkillCost(key);
    const affordable = unlocked && canAfford(cost);
    const effectLine = key === "fire" ? `Queimadura: ${formatNumber(current.extraDps)} → ${formatNumber(next.extraDps)} DPS • ${formatSeconds(current.duration)} → ${formatSeconds(next.duration)}` : key === "ice" ? `Lentidão: ${formatSeconds(current.duration)} → ${formatSeconds(next.duration)}` : meta.effect;
    const rows = unlocked
      ? [
          { label: "Dano", value: `${formatNumber(current.damage)} → ${formatNumber(next.damage)}`, delta: formatStatDelta(next.damage - current.damage) },
          { label: "Cooldown", value: `${formatSeconds(current.cooldown)} → ${formatSeconds(next.cooldown)}`, delta: `−${formatSeconds(current.cooldown - next.cooldown)}` },
          { label: "DPS skill", value: `${formatNumber(current.dps)} → ${formatNumber(next.dps)}`, delta: formatStatDelta(next.dps - current.dps) }
        ]
      : [{ label: "Bloqueada", value: `Libera no nível ${meta.unlock}` }, { label: "Efeito", value: meta.effect }];
    const currentStats = getStats();
    const nextStats = unlocked ? getStatsWithTemporaryState(() => { state.skills[key].level += 1; }) : currentStats;
    const powerGain = Math.max(0, nextStats.power - currentStats.power);
    const action = upgradeTableActionState("skill", key, cost, { blocked: !unlocked });
    const recommendation = buildProgressRecommendationCandidates()[0];
    const recommended = unlocked && (recommendationActionMatches(recommendation, `data-upgrade-skill="${key}"`) ||
      (recommendationActionMatches(recommendation, `data-smart-upgrade="skill"`) && recommendationActionMatches(recommendation, `data-smart-upgrade-id="${key}"`)));
    const toggle = unlocked ? `<button class="toggle table-toggle ${skill.auto ? "on" : ""}" data-toggle-skill="${key}" aria-label="Alternar lançamento automático de ${meta.name}" title="Auto ${skill.auto ? "ligado" : "desligado"}"></button>` : "";
    return upgradeTableRowHtml({
      classes: `${affordable ? "available" : ""} ${unlocked ? "" : "locked"} ${recommended ? "recommended" : ""}`,
      icon: meta.icon,
      eyebrow: unlocked ? `NÍVEL ${skill.level}` : `LIBERA NO NÍVEL ${meta.unlock}`,
      title: meta.name,
      note: effectLine,
      power: unlocked ? `+${formatNumber(powerGain)}` : "Bloq.",
      powerSub: unlocked ? `${formatNumber(currentStats.power)} → ${formatNumber(nextStats.power)}` : "Pirata",
      value: unlocked ? `Nível ${skill.level + 1}` : `Nv. ${meta.unlock}`,
      valueSub: unlocked ? `Auto ${skill.auto ? "ON" : "OFF"}` : "Bloqueada",
      summaryRows: rows,
      summaryFallback: meta.effect,
      costHtml: unlocked ? resourceCostHtml(cost) : `<span class="cost-chip">Libera no Nv. ${meta.unlock}</span>`,
      actionHtml: `${toggle}${upgradeTableButtonHtml(action.label, action.actionAttrs, action.disabled)}`
    });
  }

  function legacyRenderUpgradeSection(title, rows) {
    return `<section class="upgrade-feed-section"><h2>${title}</h2><div class="upgrade-feed-list">${rows.join("")}</div></section>`;
  }

  function renderUpgradeSection(title, rows) {
    const isTable = ["Melhorias", "Equipamentos", "Skills"].includes(title);
    const tableHead = isTable ? `<div class="upgrade-table-head"><span>Melhoria</span><span>Poder Naval</span><span>Valor</span><span>Status principais</span><span>Custo</span><span>Ação</span></div>` : "";
    return `<section class="upgrade-feed-section ${isTable ? "upgrade-table-section" : ""}"><h2>${title}</h2>${tableHead}<div class="upgrade-feed-list">${rows.join("")}</div></section>`;
  }

  function shipUpgradeCategoryTabsHtml() {
    const tabs = [
      ["improvements", "Melhorias", "⚒", "Upgrade direto"],
      ["equipment", "Equipamentos", "✥", "Artefatos navais"],
      ["skills", "Skills", "✹", "Habilidades"]
    ];
    return `<div class="ship-upgrade-tabs" role="tablist" aria-label="Categorias do navio">${tabs.map(([key, label, icon, hint]) => `<button type="button" class="ship-upgrade-tab ${activeShipUpgradeCategory === key ? "selected" : ""}" data-ship-upgrade-category="${key}" role="tab" aria-selected="${activeShipUpgradeCategory === key}"><span class="ship-upgrade-tab-icon">${icon}</span><span class="ship-upgrade-tab-copy"><strong>${label}</strong><small>${hint}</small></span></button>`).join("")}</div>`;
  }

  function renderUpgrades() {
    const stats = getStats();
    $("#naval-power").textContent = formatNumber(stats.power);
    const improvements = [
      { key: "ship", name: "Convés e Estrutura", icon: "⛵", desc: "Melhora o nível geral do navio e aumenta todos os atributos principais." },
      { key: "cannons", name: "Canhões", icon: "☄", desc: "Aumenta dano, crítico e poder de artilharia." },
      { key: "sails", name: "Velas", icon: "◒", desc: "Acelera ataques, deslocamento, precisão e evasão." },
      { key: "hull", name: "Casco", icon: "⬡", desc: "Amplia vida, defesa e resistência em combate." }
    ].map(upgradeLineHtml);
    const categories = {
      improvements: renderUpgradeSection("Melhorias", improvements),
      equipment: renderUpgradeSection("Equipamentos", Object.entries(EQUIPMENT_META).map(equipmentLineHtml)),
      skills: renderUpgradeSection("Skills", Object.entries(SKILL_META).map(skillLineHtml))
    };
    if (!categories[activeShipUpgradeCategory]) activeShipUpgradeCategory = "improvements";
    $("#upgrade-feed").innerHTML = [
      renderUpgradeSection("Frota", [fleetLineCompactHtml()]),
      shipUpgradeCategoryTabsHtml(),
      `<div class="ship-upgrade-category-panel">${categories[activeShipUpgradeCategory]}</div>`
    ].join("");
    $$("[data-next-ship-preview]", $("#upgrade-feed")).forEach(canvas => renderShipPreview(canvas, SHIPS[Number(canvas.dataset.nextShipPreview)], true));
  }

  function getShipRequirements(ship) {
    const issues = [];
    const mapLockIssue = getShipMapLockIssue(ship);
    if (mapLockIssue) issues.push(mapLockIssue);
    const prologueComplete = state.bossesDefeated[PRIMITIVE_REGIONS.length - 1];
    if (ship.tier >= 1 && !prologueComplete) issues.push("Conclua o prólogo da Era Primitiva");
    const prestigeReq = Math.max(0, ship.tier - 1);
    if (state.prestiges < prestigeReq) issues.push(`Prestígios atuais: ${state.prestiges} / ${prestigeReq}`);
    if (state.pirateLevel < ship.levelReq) issues.push(`Requer nível ${ship.levelReq}`);
    Object.entries(ship.costs).forEach(([key, amount]) => {
      const missing = Math.max(0, amount - (state.resources[key] || 0));
      if (missing > 0) issues.push(`Faltam ${formatNumber(missing)} Gold`);
    });
    return issues;
  }

  function renderMaps() {
    preloadMapBoardAssets();
    $("#maps-unlocked").textContent = state.unlockedRegions;
    $("#maps-total").textContent = `de ${REGIONS.length} regiões`;
    const mapStatus = index => {
      const unlocked = index < state.unlockedRegions;
      const current = state.regionIndex === index;
      const completed = state.bossesDefeated[index];
      const key = current ? "current" : !unlocked ? "locked" : completed ? "completed" : "available";
      const label = current ? "Atual" : !unlocked ? "Bloqueado" : completed ? "Concluído" : "Disponível";
      return { unlocked, current, completed, key, label };
    };
    const mapDropsHtml = region => Object.entries(region.drops).map(([key, chance]) => {
      const meta = RESOURCE_META[key] || { name: key, icon: "◆", rarityKey: "common" };
      return `<span class="map-drop-chip" style="--rarity-color:${RARITY_COLORS[meta.rarityKey] || "#bdd0cf"}"><span>${meta.icon}</span>${meta.name} <b>${Math.round(chance * 100)}%</b></span>`;
    }).join("");
    const allMapPoints = [...PROLOGUE_MAP_POINTS, ...JOURNEY_MAP_PARTS.flatMap(part => part.points)];
    const mapPointByIndex = index => allMapPoints.find(point => point.mapIndex - 1 === index);
    const mapStepLabel = point => point.mapIndex <= PRIMITIVE_REGIONS.length
      ? `PRÓLOGO • MAPA ${point.mapIndex}/5`
      : `JORNADA PIRATA • MAPA ${point.mapIndex}/${REGIONS.length}`;
    const mapHotspotHtml = point => {
      const index = point.mapIndex - 1;
      const region = REGIONS[index];
      const status = mapStatus(index);
      const title = point.title || region.name;
      const shape = point.shape ? `--point-shape:${point.shape};` : "";
      return `<button class="prologue-map-marker ${status.key}" style="--point-x:${point.x}%;--point-y:${point.y}%;--point-w:${point.width}%;--point-h:${point.height}%;${shape}" data-map-hotspot="${index}" aria-label="${title} - ${status.label}" title="${title}"><span class="sr-only">${title}</span></button>`;
    };
    const mapInfoModalHtml = () => {
      if (activeMapInfoIndex === null) return "";
      const point = mapPointByIndex(activeMapInfoIndex);
      const region = REGIONS[activeMapInfoIndex];
      if (!point || !region) return "";
      const status = mapStatus(activeMapInfoIndex);
      const description = point.description || region.description;
      const extraChance = Math.min(.95, Object.values(region.goldDrops || {}).reduce((sum, chance) => sum + Number(chance || 0), 0));
      const drops = `<div class="map-drops prologue-map-modal-drops"><span class="map-drop-chip" style="--rarity-color:${RARITY_COLORS.legendary}"><span>${RESOURCE_META.ouro.icon}</span>Ouro extra <b>${Math.round(extraChance * 100)}%</b></span><span class="map-drop-chip" style="--rarity-color:${RARITY_COLORS.rare}"><span>Baú</span>Comum <b>${Math.round(CHEST_DROP_CHANCES.monster * 100)}%</b></span></div>`;
      return `<div class="prologue-map-modal-layer" data-close-map-info><article class="prologue-map-modal-card" role="dialog" aria-modal="true" aria-labelledby="map-info-title"><button class="prologue-map-close" data-close-map-info aria-label="Fechar">×</button><span class="map-number">${mapStepLabel(point)}</span><h3 id="map-info-title">${point.title || region.name}</h3><span class="map-status ${status.key}">${status.label}</span><p>${description}</p><div class="prologue-map-modal-meta"><span><small>Gold médio</small><strong>${RESOURCE_META.ouro.icon} ${formatNumber(region.gold)}</strong></span><span><small>XP média</small><strong>XP ${formatNumber(region.xp)}</strong></span></div>${drops}<div class="prologue-map-modal-actions"><button class="button primary" data-select-map="${activeMapInfoIndex}" ${!status.unlocked || status.current ? "disabled" : ""}>${status.unlocked ? status.current ? "Atual" : "Viajar" : "Bloqueado"}</button><button class="button" data-close-map-info>Fechar</button></div></article></div>`;
    };
    const mapCompactRowsHtml = () => REGIONS.map((region, index) => {
      const status = mapStatus(index);
      const point = mapPointByIndex(index);
      const kills = Math.min(100, state.regionKills[index] || 0);
      const progress = status.completed ? 100 : status.unlocked ? kills : 0;
      const missingWins = Math.max(0, 100 - progress);
      const subtitle = point ? mapStepLabel(point) : `MAPA ${index + 1}/${REGIONS.length}`;
      const requirement = !status.unlocked
        ? `Desbloqueie a região ${index} para viajar.`
        : status.current
          ? "Rota ativa agora."
          : status.completed
            ? "Boss derrotado. Rota liberada para farm."
            : `Faltam ${missingWins} vitórias para chamar o boss.`;
      const buttonText = status.current ? "Atual" : status.unlocked ? "Viajar" : "Bloqueado";
      return `<article class="map-card ${status.key}" style="--map-accent:${status.current ? "var(--cyan-2)" : status.completed ? "var(--gold)" : status.unlocked ? "var(--green)" : "var(--red)"}">
        <div class="map-row-main">
          <div class="map-title-line"><span class="map-number">${subtitle}</span><span class="map-status ${status.key}">${status.label}</span></div>
          <h3>${index + 1} - ${region.name}</h3>
          <p class="map-requirement">${requirement}</p>
        </div>
        <div class="map-progress-cell">
          <span>Progresso</span>
          <strong>${progress} / 100</strong>
          <div class="map-progress-bar"><i style="width:${progress}%"></i></div>
        </div>
        <div class="map-yields">
          <span><small>Gold médio</small><strong>${RESOURCE_META.ouro.icon} ${formatNumber(region.gold)}</strong></span>
          <span><small>XP média</small><strong>XP ${formatNumber(region.xp)}</strong></span>
        </div>
        <div class="map-drops">${mapDropsHtml(region)}</div>
        <div class="map-action"><button class="button ${status.unlocked && !status.current ? "primary" : ""}" data-select-map="${index}" ${!status.unlocked || status.current ? "disabled" : ""}>${buttonText}</button></div>
      </article>`;
    }).join("");
    const mapBoardHtml = ({ title, subtitle, asset, mobileAsset, alt, points }, sectionClass = "") => `<section class="map-section ${sectionClass}"><div class="map-section-heading"><h2>${title}</h2><span>${subtitle}</span></div><div class="prologue-map-board"><picture><source media="${MOBILE_ASSET_MEDIA}" srcset="${mobileAsset || asset}"><img src="${asset}" alt="${alt}" class="prologue-map-image" loading="eager" decoding="async" fetchpriority="high"></picture><div class="prologue-map-points">${points.map(mapHotspotHtml).join("")}</div></div></section>`;
    const prologueMapHtml = () => mapBoardHtml({ title: "Prólogo Pré-Histórico", subtitle: "5 mapas iniciais", asset: PROLOGUE_MAP_ASSET, mobileAsset: PROLOGUE_MAP_MOBILE_ASSET, alt: "Mapa animado do prólogo", points: PROLOGUE_MAP_POINTS }, "prologue-map-section");
    $("#maps-grid").innerHTML = [
      prologueMapHtml(),
      ...JOURNEY_MAP_PARTS.map(part => mapBoardHtml(part, "journey-map-section")),
      `<section class="map-section maps-compact-section"><div class="map-section-heading"><h2>Rotas e recompensas</h2><span>${state.unlockedRegions}/${REGIONS.length} disponíveis</span></div><div class="map-section-list compact-map-table">${mapCompactRowsHtml()}</div></section>`,
      mapInfoModalHtml()
    ].join("");
  }

  function renderResources() {
    $("#cargo-total").textContent = formatNumber(Object.entries(state.resources).filter(([key]) => key !== "ouro").reduce((sum, [, value]) => sum + value, 0));
    $("#resources-grid").innerHTML = Object.entries(RESOURCE_META).map(([key, meta]) => `<article class="resource-card" style="--rarity-color:${RARITY_COLORS[meta.rarityKey]}"><div class="resource-header"><div class="resource-big-icon">${meta.icon}</div><div><h3>${meta.name}</h3><strong class="resource-amount">${formatNumber(state.resources[key])}</strong></div></div><span class="resource-rarity">${meta.rarity}</span><p class="resource-detail"><strong>Onde:</strong> ${meta.regions}</p><p class="resource-detail"><strong>Chance:</strong> ${meta.chance}</p><p class="resource-detail"><strong>Uso:</strong> ${meta.uses}</p></article>`).join("");
    renderTrade();
  }

  function renderTrade() {
    if (!$("#trade-gold") || !$("#trade-grid")) return;
    $("#trade-gold").textContent = `${formatNumber(state.resources.ouro)} Ouro`;
    $("#trade-grid").innerHTML = Object.entries(TRADE_PRICES).map(([key, price]) => {
      const meta = RESOURCE_META[key];
      const selected = Math.max(1, Math.floor(Number(tradeQuantities[key]) || 1));
      const buyTotal = selected * price.buy;
      const sellTotal = selected * price.sell;
      const canBuy = state.resources.ouro >= buyTotal;
      const canSell = state.resources[key] >= selected;
      return `<article class="trade-card" data-trade-card="${key}" style="--trade-color:${RARITY_COLORS[meta.rarityKey]}"><div class="trade-card-header"><div class="trade-icon">${meta.icon}</div><div><h3>${meta.name}</h3><span class="trade-stock">No porão: <strong>${formatNumber(state.resources[key])}</strong></span></div><span class="trade-rarity">${meta.rarity}</span></div><div class="trade-prices"><div class="trade-price"><span>COMPRAR / UN.</span><strong>${formatNumber(price.buy)} Ouro</strong></div><div class="trade-price sell"><span>VENDER / UN.</span><strong>${formatNumber(price.sell)} Ouro</strong></div></div><label class="quantity-label" for="trade-qty-${key}">QUANTIDADE</label><div class="trade-quantity-control"><button type="button" data-trade-step="-1" data-trade-resource="${key}" aria-label="Diminuir quantidade">−</button><input class="trade-quantity-input" id="trade-qty-${key}" data-trade-input="${key}" type="number" inputmode="numeric" pattern="[0-9]*" min="1" step="1" value="${selected}" aria-label="Quantidade de ${meta.name}"><button type="button" data-trade-step="1" data-trade-resource="${key}" aria-label="Aumentar quantidade">+</button></div><div class="trade-live-totals"><div><span>Custo da compra</span><strong data-buy-total>${formatNumber(buyTotal)} Ouro</strong><small data-buy-balance>Saldo: ${formatNumber(state.resources.ouro)} → ${formatNumber(Math.max(0, state.resources.ouro - buyTotal))}</small></div><div><span>Receita da venda</span><strong data-sell-total>${formatNumber(sellTotal)} Ouro</strong><small data-sell-balance>Estoque: ${formatNumber(state.resources[key])} → ${formatNumber(Math.max(0, state.resources[key] - selected))}</small></div></div><div class="trade-error" data-trade-error>${!canBuy ? "Ouro insuficiente para comprar esta quantidade." : !canSell ? "Recurso insuficiente para vender esta quantidade." : "Quantidade válida para compra e venda."}</div><div class="trade-actions"><button class="button primary" data-trade-action="buy" data-trade-resource="${key}" ${canBuy ? "" : "disabled"}>Comprar</button><button class="button sell-button" data-trade-action="sell" data-trade-resource="${key}" ${canSell ? "" : "disabled"}>Vender</button></div></article>`;
    }).join("");
  }

  function updateTradeCard(key) {
    const card = $(`[data-trade-card="${key}"]`);
    const price = TRADE_PRICES[key];
    if (!card || !price) return;
    const quantity = Math.max(1, Math.floor(Number(tradeQuantities[key]) || 1));
    tradeQuantities[key] = quantity;
    const buyTotal = quantity * price.buy;
    const sellTotal = quantity * price.sell;
    const canBuy = state.resources.ouro >= buyTotal;
    const canSell = state.resources[key] >= quantity;
    $("[data-buy-total]", card).textContent = `${formatNumber(buyTotal)} Ouro`;
    $("[data-buy-balance]", card).textContent = `Saldo: ${formatNumber(state.resources.ouro)} → ${formatNumber(Math.max(0, state.resources.ouro - buyTotal))}`;
    $("[data-sell-total]", card).textContent = `${formatNumber(sellTotal)} Ouro`;
    $("[data-sell-balance]", card).textContent = `Estoque: ${formatNumber(state.resources[key])} → ${formatNumber(Math.max(0, state.resources[key] - quantity))}`;
    $("[data-trade-error]", card).textContent = !canBuy ? "Ouro insuficiente para comprar esta quantidade." : !canSell ? "Recurso insuficiente para vender esta quantidade." : "Quantidade válida para compra e venda.";
    $(`[data-trade-action="buy"]`, card).disabled = !canBuy;
    $(`[data-trade-action="sell"]`, card).disabled = !canSell;
  }

  function stepTradeQuantity(key, delta) {
    const input = $(`[data-trade-input="${key}"]`);
    if (!input) return;
    const next = Math.max(1, Math.floor((Number(tradeQuantities[key]) || 1) + delta));
    tradeQuantities[key] = next;
    input.value = String(next);
    updateTradeCard(key);
  }

  function stopTradeHold() {
    clearTimeout(tradeHoldTimeout);
    clearInterval(tradeHoldInterval);
    tradeHoldTimeout = 0;
    tradeHoldInterval = 0;
  }

  function openTradeConfirmation(key, action) {
    const price = TRADE_PRICES[key];
    const meta = RESOURCE_META[key];
    if (!price || !meta || !["buy", "sell"].includes(action)) return toast("Quantidade inválida.", "danger-toast");
    const selected = tradeQuantities[key];
    let quantity = Number(selected);
    quantity = Math.floor(quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const message = action === "buy" ? "Ouro insuficiente." : "Recurso insuficiente.";
      toast(message, "danger-toast");
      return;
    }
    const unitPrice = action === "buy" ? price.buy : price.sell;
    const total = quantity * unitPrice;
    if (action === "buy" && state.resources.ouro < total) return toast("Ouro insuficiente.", "danger-toast");
    if (action === "sell" && state.resources[key] < quantity) return toast("Recurso insuficiente.", "danger-toast");
    pendingTrade = { key, action, quantity, unitPrice, total };
    $("#trade-modal-icon").textContent = meta.icon;
    $("#trade-modal-title").textContent = action === "buy" ? `Comprar ${meta.name}?` : `Vender ${meta.name}?`;
    const currentAmount = action === "buy" ? state.resources.ouro : state.resources[key];
    const remaining = action === "buy" ? currentAmount - total : currentAmount - quantity;
    $("#trade-summary").innerHTML = `<span>Operação</span><strong>${action === "buy" ? "Compra" : "Venda"}</strong><span>Recurso</span><strong>${meta.name}</strong><span>Quantidade</span><strong>${formatNumber(quantity)} unidades</strong><span>Preço por unidade</span><strong>${formatNumber(unitPrice)} Ouro</strong><span>Valor total</span><strong>${formatNumber(total)} Ouro</strong><span>${action === "buy" ? "Ouro atual" : "Estoque atual"}</span><strong>${formatNumber(currentAmount)}</strong><span>${action === "buy" ? "Ouro restante" : "Estoque restante"}</span><strong>${formatNumber(remaining)}</strong>`;
    $("#trade-modal-message").textContent = action === "buy" ? "O Ouro será descontado imediatamente." : "Os recursos serão removidos do porão imediatamente.";
    $("#trade-confirm").textContent = action === "buy" ? "Confirmar compra" : "Confirmar venda";
    $("#trade-modal").classList.remove("hidden");
  }

  function executeTrade() {
    if (pendingMissingPurchase) return executeMissingPurchase();
    if (!pendingTrade) return;
    const { key, action, quantity, unitPrice } = pendingTrade;
    const total = quantity * unitPrice;
    if (!Number.isInteger(quantity) || quantity <= 0) { toast("Quantidade inválida.", "danger-toast"); closeTradeModal(); return; }
    if (action === "buy") {
      if (state.resources.ouro < total) { toast("Ouro insuficiente.", "danger-toast"); closeTradeModal(); return; }
      state.resources.ouro -= total;
      state.resources[key] += quantity;
      addCollectedResource(key, quantity);
      trackAction("trade", { action, quantity });
      toast("Compra realizada com sucesso.", "gold-toast");
      addLog(`Mercado: ${quantity} ${RESOURCE_META[key].name} comprados por ${formatNumber(total)} Ouro.`, "loot");
    } else {
      if (state.resources[key] < quantity) { toast("Recurso insuficiente.", "danger-toast"); closeTradeModal(); return; }
      state.resources[key] -= quantity;
      state.resources.ouro += total;
      state.lifetime.gold += total;
      trackAction("gold", { amount: total });
      trackAction("trade", { action, quantity });
      toast("Venda realizada com sucesso.", "gold-toast");
      addLog(`Mercado: ${quantity} ${RESOURCE_META[key].name} vendidos por ${formatNumber(total)} Ouro.`, "loot");
    }
    closeTradeModal();
    commitGame(true);
  }

  function closeTradeModal() {
    pendingTrade = null;
    pendingMissingPurchase = null;
    $("#trade-modal").classList.add("hidden");
  }

  function renderPrestige() {
    const unlocked = canPrestige();
    const stats = getStats();
    const reward = getPrestigeReward();
    const bonuses = getPrestigeBonuses();
    const bestShip = SHIPS[Math.max(...state.ownedShips)];
    $("#prestige-coins").textContent = formatNumber(state.pirateCoins);
    $("#prestige-locked").classList.toggle("hidden", unlocked);
    $("#prestige-content").classList.toggle("prestige-disabled", !unlocked);
    $("#prestige-summary").innerHTML = [
      ["Prestígios", state.prestiges], ["Moedas Pirata", state.pirateCoins], ["Mapa máximo", `${state.maxRegionReached + 1} • ${REGIONS[state.maxRegionReached].name}`],
      ["Bosses derrotados", bossesCount()], ["Monstros derrotados", state.lifetime.enemies], ["Bônus monstros", `+${formatNumber(getPrestigeMonsterCoinBonus())} Moedas Pirata`],
      ["Poder Naval", stats.power], ["DPS total", stats.dps], ["Nível pirata", state.pirateLevel], ["Melhor navio", bestShip.name]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : value}</strong></div>`).join("");
    $("#prestige-reward").textContent = `${formatNumber(reward)} Moedas Pirata`;
    $("#prestige-button").disabled = !unlocked;
    $("#prestige-bonuses").innerHTML = [["Ouro", bonuses.gold], ["XP", bonuses.xp], ["DPS", bonuses.dps], ["Velocidade", bonuses.speed], ["Dano de ataque da embarcação", bonuses.shipDamage], ["Eficiência idle", bonuses.idle]].map(([label, value]) => `<div><span>${label}</span><strong>+${Math.round(value * 100)}%</strong></div>`).join("");
    $("#prestige-history").innerHTML = state.prestigeHistory.length ? state.prestigeHistory.map(item => `<div class="prestige-history-row"><strong>#${item.number}</strong><span>${item.date}</span><span>Mapa ${item.map} • ${item.boss}</span><span>${formatNumber(item.power)} poder</span><span>+${formatNumber(item.coins)} ☠</span><small>${item.ship} • ${item.pet || "Sem pet"} • ${formatDuration(item.duration || 0)}</small></div>`).join("") : `<p class="empty-state">Seu primeiro ciclo aparecerá aqui.</p>`;
  }

  function progressionStatus(item, store, storeName) {
    const unlocked = isProgressionUnlocked(item, missionDefinitions, storeName);
    if (store.claimed[item.id]) return "claimed";
    if (store.completed[item.id] || (unlocked && objectiveProgress(item.objective) >= objectiveTarget(item.objective))) return "ready";
    return unlocked ? "progress" : "locked";
  }

  function renderProgressionFilters(rootId, filters, active) {
    $(`#${rootId}`).innerHTML = filters.map(filter => `<button class="${filter === active ? "active" : ""}" data-progression-filter="${rootId}" data-filter-value="${filter}">${filter}</button>`).join("");
  }

  function progressionRatio(item) {
    return clamp(objectiveProgress(item.objective) / Math.max(1, objectiveTarget(item.objective)), 0, 1);
  }

  function progressionPriority(item, status, kind) {
    const ratio = progressionRatio(item);
    const isMain = ["Principal", "Primeiros Passos", "Mapas", "Boss", "Bosses", "Endgame"].includes(item.category);
    const currentMapRelated = item.objective.kind === "regionUnlocked" && item.objective.target <= state.unlockedRegions + 1;
    const nearBoss = ["bosses", "allBosses"].includes(item.objective.kind) || item.category === "Boss" || item.category === "Bosses";
    if (status === "ready") return 1000 + ratio * 100;
    if (status === "locked") return -1000;
    let score = ratio * 100;
    if (ratio >= .1) score += 60;
    if (ratio >= .5) score += 80;
    if (isMain) score += 55;
    if (currentMapRelated || nearBoss) score += 35;
    if (item.resets === "daily" || item.resets === "weekly") score += 18;
    score -= Math.max(0, (item.recommendedLevel || item.level || 1) - state.pirateLevel) * 4;
    return score;
  }

  function progressionList(definitions, store, storeName, kind) {
    return definitions.map(item => [item, progressionStatus(item, store, storeName)])
      .map(([item, status]) => ({ item, status, ratio: progressionRatio(item), score: progressionPriority(item, status, kind) }));
  }

  function shouldShowProgression(entry, filter, kind) {
    const { item, status, ratio } = entry;
    if (filter === "Todas") return true;
    if (filter === "Próximas de concluir") return status === "ready" || (status === "progress" && ratio >= .1);
    if (filter === "Concluídas") return status === "ready" || status === "claimed";
    if (filter === "Em andamento") return status === "progress";
    if (filter === "Diárias") return item.resets === "daily";
    if (filter === "Semanais") return item.resets === "weekly";
    if (filter === "História / Principal") return item.category === "Principal" || item.type === "main" || item.category === "Mapas" || item.category === "Boss";
    if (filter === "Secretas") return item.secret || item.category === "Secretas";
    return item.category === filter;
  }

  function progressionLimit(filter, kind) {
    if (filter === "Concluídas" || filter === "Todas" || filter === "Secretas") return Infinity;
    if (filter === "Diárias" || filter === "Semanais") return 3;
    if (filter === "História / Principal") return 9;
    return 12;
  }

  function progressionCardHtml(item, store, status, kind) {
    const progress = objectiveProgress(item.objective);
    const target = objectiveTarget(item.objective);
    const ratio = clamp(progress / Math.max(1, target), 0, 1);
    const hiddenSecret = item.secret && status === "locked";
    const statusText = status === "claimed" ? "Coletada" : status === "ready" ? "Concluída" : status === "locked" ? "Bloqueada" : "Em andamento";
    const rarity = item.rarity ? `<span class="codex-rarity ${item.rarity.toLowerCase()}">${item.rarity}</span>` : "";
    const period = item.resets === "daily" ? "Diária" : item.resets === "weekly" ? "Semanal" : "Permanente";
    const claimedDate = status === "claimed" && store.claimed[item.id] ? new Date(store.claimed[item.id]).toLocaleDateString("pt-BR") : "";
    const actionText = status === "ready" ? "Coletar" : status === "claimed" ? "Coletada" : status === "locked" ? "Bloqueada" : "Pendente";
    return `<article class="mission-row ${status} ${hiddenSecret ? "secret" : ""}">
      <div class="mission-row-main"><div class="mission-row-title"><div class="mission-icon">${hiddenSecret ? "?" : item.icon}</div><div><div class="mission-name-line"><h3>${hiddenSecret ? "Missão secreta" : item.name}</h3><span class="codex-status">${statusText}</span></div><p>${hiddenSecret ? "Objetivo oculto até ser descoberto nos mares." : item.description}</p></div></div><div class="mission-row-meta"><span>${item.category}</span><span>Nível ${item.recommendedLevel || item.level || 1}</span><span>${claimedDate || period}</span>${rarity}</div></div>
      <div class="mission-row-progress"><span>Progresso</span><strong>${formatNumber(Math.min(progress, target))} / ${formatNumber(target)}</strong><div class="codex-progress"><i style="width:${Math.round(ratio * 100)}%"></i></div></div>
      <div class="mission-row-reward"><span>Recompensa</span><strong>${hiddenSecret ? "???" : rewardText(item.reward)}</strong></div>
      <button class="button primary mission-row-action" data-claim-${kind}="${item.id}" ${status === "ready" ? "" : "disabled"}>${actionText}</button>
    </article>`;
  }

  function renderMissions() {
    const filters = $("#mission-filters");
    const grid = $("#missions-grid");
    const summary = $("#missions-summary");
    if (!filters || !grid || !summary) return;
    resetPeriodicProgressIfNeeded();
    checkProgressionUnlocks();
    renderProgressionFilters("mission-filters", MISSION_FILTERS, activeMissionFilter);
    const complete = completedCount(state.quests, missionDefinitions);
    const readyCount = missionDefinitions.filter(item => progressionStatus(item, state.quests, "quests") === "ready").length;
    const claimAllButtons = $$("[data-claim-all-missions]");
    summary.textContent = `${complete} / ${missionDefinitions.length}`;
    const panelSummary = $("#stats-quests-summary");
    if (panelSummary) panelSummary.textContent = `${readyCount} pronta${readyCount === 1 ? "" : "s"} • ${complete} / ${missionDefinitions.length}`;
    claimAllButtons.forEach(button => {
      button.disabled = readyCount === 0;
      button.textContent = readyCount ? `Coletar tudo (${readyCount})` : "Coletar tudo";
    });
    const cards = progressionList(missionDefinitions, state.quests, "quests", "mission")
      .filter(entry => shouldShowProgression(entry, activeMissionFilter, "mission"))
      .sort((a, b) => b.score - a.score)
      .slice(0, progressionLimit(activeMissionFilter, "mission"));
    grid.innerHTML = cards.length ? cards.map(({ item, status }) => progressionCardHtml(item, state.quests, status, "mission")).join("") : `<p class="empty-state">Nenhuma missão relevante neste filtro por enquanto.</p>`;
  }

  function openPrestigeConfirmation() {
    if (!canPrestige()) return toast(`Derrote ${PRESTIGE_BOSS_NAME} em ${PRESTIGE_REGION_NAME} para liberar.`, "danger-toast");
    if (!isValidPirateName()) {
      toast("Defina seu Nome de Pirata na tela de Capitão para registrar seu Prestígio no ranking.", "danger-toast");
      navigate("captain");
      return;
    }
    prestigeConfirmationStage = 1;
    $("#prestige-confirm-step").textContent = "CONFIRMAÇÃO 1 DE 2";
    $("#prestige-modal-title").textContent = "Reiniciar esta jornada?";
    $("#prestige-modal-message").textContent = "Você manterá Prestígios, Moedas Pirata, estágio visual, título e bônus permanentes do Capitão, além dos pets. Level/XP temporário, Pontos de Nível, equipamentos e skills manuais serão reiniciados.";
    $("#prestige-modal-reward").innerHTML = `Você receberá <strong>+${formatNumber(getPrestigeReward())} Moedas Pirata</strong>`;
    $("#prestige-confirm").textContent = "Continuar";
    $("#prestige-modal").classList.remove("hidden");
  }

  function closePrestigeConfirmation() {
    prestigeConfirmationStage = 0;
    $("#prestige-modal").classList.add("hidden");
  }

  function confirmPrestige() {
    if (prestigeConfirmationStage === 1) {
      prestigeConfirmationStage = 2;
      $("#prestige-confirm-step").textContent = "CONFIRMAÇÃO 2 DE 2";
      $("#prestige-modal-title").textContent = "Confirma o Prestígio?";
      $("#prestige-modal-message").textContent = "Esta é a confirmação final. A jornada atual não poderá ser recuperada.";
      $("#prestige-confirm").textContent = "Confirmar Prestígio";
      return;
    }
    if (prestigeConfirmationStage !== 2 || !canPrestige()) return closePrestigeConfirmation();
    const reward = getPrestigeReward();
    const currentPet = getEquippedPet();
    const nowIso = new Date().toISOString();
    const nextPrestigeCount = state.prestiges + 1;
    const prestigePower = getStats().power;
    const leaderboardRecord = buildLeaderboardPrestigeRecord({ nowIso, nextPrestigeCount, prestigePower });
    const strongestBossIndex = state.bossesDefeated.reduce((best, defeated, index) => defeated ? index : best, 0);
    const entry = {
      number: nextPrestigeCount, date: new Date(nowIso).toLocaleDateString("pt-BR"), map: state.maxRegionReached + 1,
      boss: REGIONS[strongestBossIndex].boss, power: prestigePower, coins: reward,
      ship: SHIPS[Math.max(...state.ownedShips)].name, pet: currentPet?.name || null,
      duration: Math.max(0, Math.floor((Date.now() - state.journeyStartedAt) / 1000)),
      activeDuration: Math.max(0, Math.floor(Number(state.lifetime.playSeconds || 0)))
    };
    const permanent = {
      playerId: state.playerId,
      pirateName: state.pirateName,
      prestiges: nextPrestigeCount,
      pirateCoins: state.pirateCoins + reward,
      totalActivePlaySeconds: Math.max(0, Number(state.totalActivePlaySeconds) || 0),
      captainSelectedGender: state.captainSelectedGender,
      captainLevel: state.captainLevel,
      captainVisualImage: state.captainVisualImage,
      captainBonuses: { ...state.captainBonuses },
      captainUpgradePurchased: [...state.captainUpgradePurchased],
      captainProgressPersistsAfterPrestige: true,
      ownedPets: [...state.ownedPets],
      equippedPetId: state.equippedPetId,
      petLevels: { ...state.petLevels },
      prestigeHistory: [entry, ...state.prestigeHistory].slice(0, 20),
      titles: [...state.titles]
    };
    cancelPendingBossMapAdvance();
    cancelPendingSurpriseBoss();
    clearPendingChests();
    state = createDefaultState();
    Object.assign(state, permanent);
    syncCaptainState(state);
    syncCaptainManualSkillState(state);
    syncCaptainRuntimeState(state);
    syncCaptainEquipmentState(state);
    state.combat.playerHp = getStats().maxHp;
    addLog(`Prestígio #${state.prestiges} concluído. A nova jornada começou com ${formatNumber(reward)} Moedas Pirata.`, "loot");
    closePrestigeConfirmation();
    navigate("prestige");
    commitGame(true);
    submitPrestigeLeaderboard(leaderboardRecord);
    toast(`Prestígio concluído! +${formatNumber(reward)} Moedas Pirata.`, "gold-toast");
  }

  function arenaOpponentCardHtml(opponent) {
    const attackSpeed = (opponent.attack_interval_ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    const badge = opponent.is_bot ? `<span class="arena-bot-badge">Bot</span>` : `<span class="arena-real-badge">Real</span>`;
    return `<article class="arena-opponent-card arena-opponent-row ${opponent.is_bot ? "is-bot" : "is-real"}">
      <div class="arena-opponent-icon" aria-hidden="true">${opponent.is_bot ? "☠" : "★"}</div>
      <div class="arena-opponent-main">
        <div class="arena-opponent-title"><h3>${escapeHtml(opponent.pirate_name)}</h3>${badge}</div>
        <p>Prestígio ${formatNumber(opponent.prestige_count)} • ${escapeHtml(opponent.ship_name)} • Nv. ${formatNumber(opponent.ship_level)}</p>
        <div class="arena-opponent-stats">
          <div><span>HP</span><strong>${formatNumber(opponent.max_hp)}</strong></div>
          <div><span>Dano/ataque</span><strong>${formatNumber(opponent.damage)}</strong></div>
          <div><span>DPS</span><strong>${formatNumber(opponent.dps)}</strong></div>
          <div><span>Ataque</span><strong>${attackSpeed}s</strong></div>
          <div><span>Poder naval</span><strong>${formatNumber(opponent.combat_power)}</strong></div>
        </div>
      </div>
      <div class="arena-opponent-action">
        <button class="button primary" type="button" data-arena-challenge="${escapeHtml(opponent.player_id)}">Desafiar</button>
      </div>
    </article>`;
  }

  function renderArenaPanel() {
    const toggle = $("#arena-toggle");
    const refresh = $("#arena-refresh");
    const status = $("#arena-status");
    const list = $("#arena-list");
    if (!toggle || !status || !list) return;
    toggle.textContent = arenaState.expanded ? "Ocultar Arena" : "Desafiar Jogador";
    toggle.disabled = arenaState.status === "loading";
    if (refresh) {
      refresh.disabled = arenaState.status === "loading";
      refresh.textContent = arenaState.status === "loading" ? "Atualizando..." : "Atualizar";
    }
    list.classList.toggle("hidden", !arenaState.expanded);
    if (!arenaState.expanded) {
      status.textContent = "Clique para buscar inimigos da Arena.";
      list.innerHTML = "";
      return;
    }
    if (arenaState.status === "loading") {
      status.textContent = "Buscando jogadores e preparando bots da Arena...";
      list.innerHTML = "";
      return;
    }
    const opponents = arenaState.opponents.length ? arenaState.opponents : getArenaBotOpponents();
    status.textContent = arenaState.error || `${opponents.length} inimigos disponíveis para duelo assíncrono.`;
    list.innerHTML = opponents.map(arenaOpponentCardHtml).join("");
  }

  function toggleArenaPanel() {
    arenaState.expanded = !arenaState.expanded;
    renderArenaPanel();
    if (arenaState.expanded) refreshArenaOpponents({ force: arenaState.status === "idle" });
  }

  function isArenaSceneActive() {
    return Boolean(arenaState.battle || arenaState.result);
  }

  function isArenaBattleActive() {
    return Boolean(arenaState.battle?.active && !arenaState.battle.finished);
  }

  function isArenaBattleWaiting(now = Date.now()) {
    const battle = arenaState.battle;
    return Boolean(battle?.active && !battle.finished && Number(battle.startsAt || 0) > now);
  }

  function getArenaStartRemainingSeconds(now = Date.now()) {
    return Math.max(0, (Number(arenaState.battle?.startsAt || 0) - now) / 1000);
  }

  function getArenaSceneRegion() {
    return {
      name: "Arena - Duelo Pirata",
      weather: "Duelo Pirata",
      description: "Arena assíncrona entre navios salvos.",
      boss: "Arena",
      sky: "#23354c",
      sea: "#132e43",
      land: "#2e3340",
      kind: "ARENA",
      fixedBackground: true,
      fixedBackgroundFile: ARENA_BACKGROUND_FILE
    };
  }

  function getActiveCombatRegion() {
    return isArenaSceneActive() ? getArenaSceneRegion() : REGIONS[state.regionIndex];
  }

  function getActiveCombatRegionLabel() {
    return isArenaSceneActive() ? "Arena - Duelo Pirata" : getCombatRegionLabel(REGIONS[state.regionIndex]);
  }

  function getArenaPlayerMaxHp(stats = getStats()) {
    return getArenaHp(stats.maxHp);
  }

  function getActivePlayerMaxHp(stats = getStats()) {
    if (!isArenaSceneActive()) return stats.maxHp;
    return Math.max(1, Math.round(Number(arenaState.battle?.playerMaxHp) || getArenaPlayerMaxHp(stats)));
  }

  function getArenaOpponentById(id) {
    const opponents = arenaState.opponents.length ? arenaState.opponents : getArenaBotOpponents();
    return opponents.find(opponent => opponent.player_id === id) || null;
  }

  function getArenaEnemyShip(opponentOrEnemy = {}) {
    const shipName = opponentOrEnemy.ship_name || opponentOrEnemy.shipName || opponentOrEnemy.name || "";
    const parsedShipId = parseShipId(opponentOrEnemy.ship_id || opponentOrEnemy.shipId, shipName);
    return parsedShipId !== null ? SHIPS[parsedShipId] : findShipByName(shipName);
  }

  function createArenaEnemy(opponent) {
    const ship = getArenaEnemyShip(opponent);
    return {
      id: `arena_${opponent.player_id}`,
      name: opponent.pirate_name,
      category: "ARENA",
      kind: "ARENA",
      hp: opponent.max_hp,
      maxHp: opponent.max_hp,
      damage: opponent.damage,
      armor: 0,
      evasion: 0,
      skillResist: 0,
      attackSpeed: 1,
      attackIntervalMs: ARENA_BALANCED_ATTACK_INTERVAL_MS,
      visualTier: opponent.ship_tier || ship?.tier || 3,
      visualKind: ship?.type || "Pirata",
      ship_id: opponent.ship_id,
      ship_name: opponent.ship_name,
      ship_level: opponent.ship_level,
      combat_power: opponent.combat_power,
      prestige_count: opponent.prestige_count,
      isArena: true,
      isBot: opponent.is_bot,
      burnTime: 0,
      burnDps: 0,
      slowed: 0,
      defeated: false
    };
  }

  function startArenaChallenge(playerId) {
    if (pendingBossMapAdvanceTimer || pendingSurpriseBossTimer) return toast("Aguarde o evento atual terminar antes de entrar na Arena.", "danger-toast");
    if (isArenaSceneActive()) return toast("Um duelo da Arena já está em andamento.", "danger-toast");
    const opponent = getArenaOpponentById(playerId);
    if (!opponent) return toast("Esse inimigo da Arena não está mais disponível.", "danger-toast");
    const startsAt = Date.now() + ARENA_START_DELAY_MS;
    const arenaPlayerMaxHp = getArenaPlayerMaxHp();
    arenaState.previousCombat = {
      screen: currentScreen,
      hasStarted: state.hasStarted,
      combat: JSON.parse(JSON.stringify(state.combat))
    };
    arenaState.battle = {
      active: true,
      finished: false,
      opponent,
      startsAt,
      startedAt: startsAt,
      playerMaxHp: arenaPlayerMaxHp,
      damageDealt: 0,
      damageReceived: 0
    };
    state.combat.running = true;
    state.combat.repairing = false;
    state.combat.repairStarted = 0;
    state.combat.playerHp = arenaPlayerMaxHp;
    state.combat.enemy = createArenaEnemy(opponent);
    state.combat.attackTimer = 0;
    state.combat.petAttackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    state.combat.spawnTimer = 0;
    state.hasStarted = true;
    scene.resetPlayerShipAnimation();
    navigate("home");
    addLog(`Arena preparada contra ${opponent.pirate_name}. Combate começa em ${formatSeconds(ARENA_START_DELAY_MS / 1000)}.`, "danger-text");
    toast(`Arena começa em ${formatSeconds(ARENA_START_DELAY_MS / 1000)}: ${opponent.pirate_name}.`, "gold-toast");
    renderAll(false);
  }

  function renderArenaResultModal() {
    const result = arenaState.result;
    if (!result) return;
    $("#arena-result-icon").textContent = result.victory ? "⚑" : "☠";
    $("#arena-result-title").textContent = result.victory ? "Vitória na Arena!" : "Derrota na Arena!";
    $("#arena-result-message").textContent = `${result.enemyName} ${result.victory ? "foi derrotado em duelo assíncrono." : "venceu este duelo da Arena."}`;
    $("#arena-result-summary").innerHTML = [
      ["Inimigo", escapeHtml(result.enemyName)],
      ["Dano causado", formatNumber(result.damageDealt)],
      ["Dano recebido", formatNumber(result.damageReceived)],
      ["Duração", formatArenaDuration(result.durationSeconds)]
    ].map(([label, value]) => `<span>${label}</span><strong>${value}</strong>`).join("");
    $("#arena-result-modal").classList.remove("hidden");
  }

  function finishArenaBattle(victory) {
    const battle = arenaState.battle;
    if (!battle || battle.finished) return;
    battle.active = false;
    battle.finished = true;
    const enemyName = battle.opponent?.pirate_name || state.combat.enemy?.name || "Inimigo da Arena";
    const durationSeconds = Math.max(1, Math.round((Date.now() - battle.startedAt) / 1000));
    arenaState.result = {
      victory,
      enemyName,
      damageDealt: Math.round(battle.damageDealt || 0),
      damageReceived: Math.round(battle.damageReceived || 0),
      durationSeconds
    };
    state.combat.running = false;
    state.combat.enemyAttackTimer = 0;
    if (!victory) scene.markPlayerShipDeath();
    addLog(`${victory ? "Vitória" : "Derrota"} na Arena contra ${enemyName}.`, victory ? "loot" : "danger-text");
    toast(victory ? "Vitória na Arena!" : "Derrota na Arena!", victory ? "gold-toast" : "danger-toast");
    renderArenaResultModal();
    renderAll(false);
  }

  function cancelArenaBattleFromExit() {
    const battle = arenaState.battle;
    if (!battle) return false;
    const enemyName = battle.opponent?.pirate_name || state.combat.enemy?.name || "Inimigo da Arena";
    addLog(`Voce saiu da Arena contra ${enemyName}.`, "danger-text");
    toast("Voce saiu da Arena.", "danger-toast");
    if (arenaState.previousCombat?.combat) {
      state.combat = JSON.parse(JSON.stringify(arenaState.previousCombat.combat));
      state.combat.playerHp = clamp(Number(state.combat.playerHp) || getStats().maxHp, 0, getStats().maxHp);
      state.hasStarted = arenaState.previousCombat.hasStarted;
    } else {
      state.combat.enemy = null;
      state.combat.running = false;
    }
    const returnScreen = arenaState.previousCombat?.screen || "home";
    arenaState.battle = null;
    arenaState.previousCombat = null;
    arenaState.result = null;
    scene.resetPlayerShipAnimation();
    navigate(returnScreen === "stats" ? "home" : returnScreen);
    renderAll(false);
    saveGame();
    return true;
  }

  function exitSpecialCombat() {
    const enemy = state.combat.enemy;
    if (enemy?.isArena || isArenaBattleActive() || isArenaBattleWaiting()) return cancelArenaBattleFromExit();
    if (enemy?.isBoss) {
      cancelBossBattle({ voluntary: true });
      return true;
    }
    return false;
  }

  function closeArenaResultModal() {
    $("#arena-result-modal")?.classList.add("hidden");
    if (arenaState.previousCombat?.combat) {
      state.combat = JSON.parse(JSON.stringify(arenaState.previousCombat.combat));
      state.combat.playerHp = clamp(Number(state.combat.playerHp) || getStats().maxHp, 0, getStats().maxHp);
      state.hasStarted = arenaState.previousCombat.hasStarted;
    }
    const returnScreen = arenaState.previousCombat?.screen || "home";
    arenaState.battle = null;
    arenaState.previousCombat = null;
    arenaState.result = null;
    scene.resetPlayerShipAnimation();
    navigate(returnScreen === "stats" ? "home" : returnScreen);
    renderAll(false);
    if (voluntary) addLog(`Voce saiu do combate contra ${bossName}.`, "danger-text");
    if (voluntary || disabledAuto) toast(voluntary ? "Combate contra boss encerrado." : "Derrota para o boss. Boss Auto foi desligado.", "danger-toast");
    renderAll(false);
    saveGame();
  }

  function syncStatsPanelExpansion(root = document) {
    Object.entries(statsPanelsExpanded).forEach(([key, expanded]) => {
      const panel = $(`[data-stats-panel="${key}"]`, root);
      const toggle = $(`[data-toggle-stats-panel="${key}"]`, root);
      const indicator = $(".stats-panel-indicator", toggle);
      panel?.classList.toggle("expanded", expanded);
      toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (indicator) indicator.textContent = expanded ? "-" : "+";
    });
  }

  function toggleStatsPanel(key) {
    if (!(key in statsPanelsExpanded)) return;
    statsPanelsExpanded[key] = !statsPanelsExpanded[key];
    syncStatsPanelExpansion();
    if (key === "quests" && statsPanelsExpanded[key]) renderMissions();
  }

  function toggleCaptainPetsPanel() {
    captainPetsExpanded = !captainPetsExpanded;
    renderCaptain();
  }

  function toggleCaptainOverviewPanel() {
    captainOverviewExpanded = !captainOverviewExpanded;
    renderCaptain();
  }

  function toggleCaptainManualSkillsPanel() {
    captainManualSkillsExpanded = !captainManualSkillsExpanded;
    renderCaptain();
  }

  function toggleCaptainEquipmentPanel() {
    captainEquipmentExpanded = !captainEquipmentExpanded;
    renderCaptain();
  }

  function renderStats() {
    syncCaptainRuntimeState(state);
    const stats = getStats();
    const rewardBonuses = getCaptainEquipmentRewardBonuses();
    const captain = getCurrentCaptain();
    const skillLevels = Object.values(state.skills).reduce((sum, item) => sum + item.level, 0);
    const rank = getPirateRankTitle(state);
    $("#captain-rank").textContent = rank;
    $("#stats-combat-summary").textContent = `Poder ${formatNumber(stats.power)} • DPS ${formatNumber(stats.dps)}`;
    $("#stats-progression-summary").textContent = `Nível ${state.pirateLevel} • ${REGIONS[state.regionIndex].name}`;
    $("#stats-career-summary").textContent = `${formatNumber(state.prestiges)} Prestígio${state.prestiges === 1 ? "" : "s"} • ${formatNumber(state.lifetime.enemies)} vitórias`;
    const list = items => items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    const powerBreakdown = stats.powerBreakdown || getNavalPowerV2Breakdown(stats);
    $("#combat-stats").innerHTML = list([
      ["Poder Naval", formatNumber(stats.power)], ["Ofensiva", formatNumber(powerBreakdown.offense)], ["Resistência", formatNumber(powerBreakdown.survival)], ["Bônus", formatNumber(powerBreakdown.bonuses)], ["Vida atual / máxima", `${formatNumber(state.combat.playerHp)} / ${formatNumber(stats.maxHp)}`], ["Dano do navio", formatNumber(stats.damage)], ["DPS do navio", formatNumber(stats.shipDps)], ["DPS das skills", formatNumber(stats.skillDps)], ["DPS do pet", formatNumber(stats.petDps)], ["DPS total", formatNumber(stats.dps)], ["Velocidade", formatNumber(stats.speed)], ["Intervalo ataque", `${Math.round(stats.attackInterval)}ms`], ["Bônus vel. ataque", `+${Math.round(stats.attackSpeedBonus * 100)}%`], ["Armadura", formatNumber(stats.armor)], ["Redução de dano", `${Math.round(stats.armorReduction * 100)}%`], ["Precisão", `${Math.round(stats.precision * 100)}%`], ["Crítico", `${Math.round(stats.crit * 100)}%`], ["Evasão", `${Math.round(stats.evasion * 100)}%`], ["Ataque duplo", `${Math.round(stats.doubleAttackChance * 100)}%`]
    ]);
    $("#progression-stats").innerHTML = list([
      ["Navio atual", SHIPS[state.shipId].name], ["Capitão", captain ? `${captain.name} (${captain.level}/${CAPTAIN_MAX_LEVEL})` : "Não escolhido"], ["Nível temp. Capitão", state.captainRuntimeLevel], ["Pontos de Nível", getAvailableLevelPoints()], ["Bônus ouro equip.", `+${formatCaptainPercent(rewardBonuses.gold)}`], ["Bônus XP equip.", `+${formatCaptainPercent(rewardBonuses.xp)}`], ["Nível do navio", state.levels.ship], ["Nível dos canhões", state.levels.cannons], ["Nível das velas", state.levels.sails], ["Nível do casco", state.levels.hull], ["Nível do pirata", state.pirateLevel], ["XP atual / necessária", `${formatNumber(state.xp)} / ${formatNumber(xpNeeded())}`], ["Skills / níveis somados", `${Object.keys(SKILL_META).filter(isSkillUnlocked).length} / ${skillLevels}`], ["Região atual", REGIONS[state.regionIndex].name]
    ]);
    $("#career-stats").innerHTML = [["Prestígios", state.prestiges], ["Moedas Pirata", state.pirateCoins], ["Tempo ativo total", formatDuration(state.totalActivePlaySeconds || state.lifetime.playSeconds || 0)], ["Inimigos derrotados", state.lifetime.enemies], ["Bosses derrotados", state.lifetime.bosses], ["Recursos coletados", state.lifetime.resources], ["Ouro total", state.lifetime.gold], ["Maior dano", state.lifetime.highestDamage], ["Navios construídos", state.ownedShips.length], ["Pets comprados", state.ownedPets.length], ["Ataques de pets", state.lifetime.petAttacks], ["Vitórias com pet", state.lifetime.petKills], ["Bosses com pet", state.lifetime.bossesWithPet], ["Regiões abertas", state.unlockedRegions], ["Tempo navegando", formatDuration(state.lifetime.playSeconds)]].map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : value}</strong></div>`).join("");
    renderMissions();
    syncStatsPanelExpansion($("#screen-stats"));
    renderArenaPanel();
  }

  const SCREEN_ALIASES = { trade: "upgrades", resources: "upgrades", missions: "stats", pets: "captain" };
  const SCREEN_RENDERERS = {
    upgrades: renderUpgrades,
    maps: renderMaps,
    captain: renderCaptain,
    prestige: renderPrestige,
    stats: renderStats
  };

  function normalizeScreen(screen) {
    return SCREEN_ALIASES[screen] || screen;
  }

  function renderScreen(screen = currentScreen) {
    SCREEN_RENDERERS[screen]?.();
  }

  function setActiveScreen(screen) {
    $$(".screen").forEach(node => node.classList.toggle("active", node.id === `screen-${screen}`));
    $$("[data-screen-target]").forEach(node => node.classList.toggle("active", node.dataset.screenTarget === screen));
  }

  function shouldRenderInactiveScreens() {
    return window.innerWidth > 980 && window.innerHeight > 650;
  }

  function renderAll(expensive = false) {
    renderTopbar();
    renderHome();
    renderCombatHud();
    renderInitialCaptainGate();
    if (expensive && shouldRenderInactiveScreens()) Object.values(SCREEN_RENDERERS).forEach(render => render());
    else renderScreen();
    setActiveScreen(currentScreen);
  }

  function upgrade(type) {
    const oldStats = getStats();
    const oldRatio = state.combat.playerHp / oldStats.maxHp;
    const cost = getUpgradeCost(type);
    if (!canAfford(cost)) return toast("Gold insuficiente para essa melhoria.", "danger-toast");
    spend(cost); state.levels[type] += 1;
    trackAction("upgrade", { type });
    const newStats = getStats();
    if (type === "hull" || type === "ship") state.combat.playerHp = Math.max(state.combat.playerHp, Math.round(newStats.maxHp * oldRatio));
    addLog(`${type === "ship" ? "Navio" : type === "cannons" ? "Canhões" : type === "sails" ? "Velas" : "Casco"} melhorado para o nível ${state.levels[type]}.`, "loot");
    scene.celebrateCaptain(type === "ship" ? 2.4 : 1.55);
    const powerGain = Math.max(0, newStats.power - oldStats.power);
    toast(`Melhoria concluída! Poder Naval: ${formatNumber(oldStats.power)} → ${formatNumber(newStats.power)} (+${formatNumber(powerGain)}).`);
    commitGame(true);
  }

  function buyShip(id) {
    const ship = SHIPS[id];
    if (!ship || state.ownedShips.includes(id)) return;
    if (!isShipUnlockedInCurrentJourney(ship)) return toast("Este barco ainda não foi desbloqueado nesta jornada.", "danger-toast");
    const nextShip = getNextFleetShip();
    if (!nextShip || ship.id !== nextShip.id) return toast("A frota evolui em sequência: compre o próximo barco da lista.", "danger-toast");
    const killLockIssue = getShipKillLockIssue(ship);
    if (killLockIssue) return toast(`Libere o próximo navio: ${killLockIssue}.`, "danger-toast");
    if (ship.tier >= 1 && !state.bossesDefeated[PRIMITIVE_REGIONS.length - 1]) return toast("Conclua o prólogo da Era Primitiva para acessar navios piratas.", "danger-toast");
    const prestigeReq = Math.max(0, ship.tier - 1);
    if (state.prestiges < prestigeReq) return toast(`Tier ${ship.tier} requer ${prestigeReq} Prestígio${prestigeReq === 1 ? "" : "s"}.`, "danger-toast");
    if (state.pirateLevel < ship.levelReq) return toast(`Requer nível ${ship.levelReq} para comprar ${ship.name}.`, "danger-toast");
    if (!canAfford(ship.costs)) return toast("Ainda falta Gold para construir este navio.", "danger-toast");
    spend(ship.costs); state.ownedShips.push(id); state.shipEnemyKills[id] = getShipEnemyKills(id); setActiveShip(id);
    trackAction("shipSwitch");
    scene.celebrateCaptain(2.5);
    toast(`${ship.name} foi construído e equipado!`, "gold-toast"); addLog(`${ship.name} agora lidera sua frota.`, "loot"); commitGame(true);
  }

  function equipShip(id) {
    if (!state.ownedShips.includes(id)) return;
    setActiveShip(id);
    trackAction("shipSwitch");
    toast(`${SHIPS[id].name} selecionado.`); commitGame(true);
  }

  function buyPet(id) {
    const pet = PETS[id];
    if (!pet || state.ownedPets.includes(id)) return;
    const issues = getPetIssues(pet);
    if (issues.length) return toast(`Pet bloqueado: ${issues.join(" • ")}.`, "danger-toast");
    const pirateCoinCost = PET_PIRATE_COIN_COSTS[id];
    if (state.pirateCoins < pirateCoinCost) return toast("Moedas Pirata insuficientes para este pet.", "danger-toast");
    if (!canAfford(pet.costs)) return toast("Ainda falta Gold para adotar este pet.", "danger-toast");
    spend(pet.costs); state.pirateCoins -= pirateCoinCost; state.ownedPets.push(id); state.petLevels[id] = 1; state.equippedPetId = id; state.combat.petAttackTimer = 0; state.combat.hpRegenTimer = 0; state.lifetime.petsBought += 1;
    toast(`${pet.name} foi comprado e equipado!`, "gold-toast"); addLog(`${pet.name} agora acompanha seu navio.`, "loot"); commitGame(true);
  }

  function upgradePet(id) {
    const basePet = PETS[id];
    if (!state.ownedPets.includes(id) || !basePet) return;
    const issues = getPetIssues(basePet);
    if (issues.length) return toast(`Pet bloqueado: ${issues.join(" • ")}.`, "danger-toast");
    const level = getPetLevel(id);
    if (level >= PET_MAX_LEVEL) return toast("Este pet já está no nível máximo.", "gold-toast");
    const cost = getPetUpgradeCost(id, level);
    if (state.pirateCoins < cost) return toast(`Faltam ${formatNumber(cost - state.pirateCoins)} Moedas Pirata para evoluir este pet.`, "danger-toast");
    const oldPower = getStats().power;
    state.pirateCoins -= cost;
    state.petLevels[id] = level + 1;
    state.combat.playerHp = Math.min(state.combat.playerHp, getStats().maxHp);
    const pet = getPetWithLevel(PETS[id]);
    const powerGain = Math.max(0, getStats().power - oldPower);
    toast(`${pet.name} evoluiu para o nível ${pet.level}! Poder Naval +${formatNumber(powerGain)}.`, "gold-toast");
    addLog(`${pet.name} evoluiu para o nível ${pet.level} usando Moedas Pirata.`, "loot");
    commitGame(true);
  }

  function equipPet(id) {
    const pet = PETS[id];
    if (!state.ownedPets.includes(id) || !pet) return;
    if (state.equippedPetId === id) {
      state.equippedPetId = null;
      state.combat.petAttackTimer = 0;
      state.combat.hpRegenTimer = 0;
      state.combat.playerHp = Math.min(state.combat.playerHp, getStats().maxHp);
      toast("Pet desequipado. Seu navio seguirá sem companheiro.");
      commitGame(true);
      return;
    }
    const issues = getPetIssues(pet);
    if (issues.length) return toast(`Pet bloqueado: ${issues.join(" • ")}.`, "danger-toast");
    state.equippedPetId = id; state.combat.petAttackTimer = 0; state.combat.hpRegenTimer = 0; state.combat.playerHp = Math.min(state.combat.playerHp, getStats().maxHp);
    toast(`${pet.name} equipado como companheiro.`); commitGame(true);
  }

  function savePirateNameFromInput() {
    persistPirateNameFromInput({ feedback: true, render: true });
  }

  function selectCaptainGender(gender) {
    const cleanGender = normalizeCaptainGender(gender);
    if (!cleanGender || isCaptainSelected()) return;
    state.captainSelectedGender = cleanGender;
    state.captainLevel = 1;
    syncCaptainState(state);
    syncCaptainEquipmentState(state);
    manualAttackTutorialStartedAt = Date.now();
    manualAttackTutorialDismissed = false;
    scene.celebrateCaptain(2.4);
    addLog(`${getCaptainName(1, cleanGender)} assumiu o comando permanente.`, "loot");
    toast(`${CAPTAIN_GENDERS[cleanGender].label} escolhido!`, "gold-toast");
    commitGame(true);
  }

  function upgradeCaptain() {
    const current = getCurrentCaptain();
    const next = getNextCaptain();
    const cost = getCaptainUpgradeCost();
    if (!current) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    if (!next) return toast("O Capitão já está no nível máximo.", "gold-toast");
    if (state.pirateCoins < cost) return toast(`Faltam ${formatNumber(cost - state.pirateCoins)} Moedas Pirata para evoluir o Capitão.`, "danger-toast");
    state.pirateCoins -= cost;
    state.captainLevel = next.level;
    syncCaptainState(state);
    scene.celebrateCaptain(2.8);
    toast(`${next.name} desbloqueado!`, "gold-toast");
    addLog(`Capitão evoluiu para ${next.name} usando Moedas Pirata.`, "loot");
    commitGame(true);
  }

  function openCaptainMutinyConfirmation() {
    if (!canUpgradeCaptainSystems()) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    $("#captain-mutiny-modal").classList.remove("hidden");
  }

  function closeCaptainMutinyConfirmation() {
    $("#captain-mutiny-modal").classList.add("hidden");
  }

  function confirmCaptainMutiny() {
    if (!isCaptainSelected()) return closeCaptainMutinyConfirmation();
    const oldName = getCurrentCaptain()?.name || "Capitão";
    const refundedPirateCoins = getCaptainInvestedPirateCoins(state.captainLevel);
    state.pirateCoins += refundedPirateCoins;
    state.captainSelectedGender = null;
    state.captainLevel = 0;
    state.captainRuntimeLevel = 1;
    state.captainCurrentXp = 0;
    state.captainXpToNextLevel = captainRuntimeXpNeeded(1);
    state.totalLevelPointsEarned = 0;
    state.spentLevelPoints = 0;
    state.availableLevelPoints = 0;
    state.captainManualSkills = createCaptainManualSkillState();
    state.captainEquipment = createCaptainEquipmentState();
    syncCaptainState(state);
    syncCaptainManualSkillState(state);
    syncCaptainRuntimeState(state);
    syncCaptainEquipmentState(state);
    state.combat.playerHp = Math.min(state.combat.playerHp, getStats().maxHp);
    closeCaptainMutinyConfirmation();
    addLog(`Motim iniciado: ${oldName} foi resetado.${refundedPirateCoins ? ` Reembolso: ${formatNumber(refundedPirateCoins)} Moedas Pirata.` : ""}`, "loot");
    toast(refundedPirateCoins ? `Motim concluído. ${formatNumber(refundedPirateCoins)} Moedas Pirata devolvidas.` : "Motim concluído. Escolha o novo visual do Capitão.", "gold-toast");
    navigate("captain");
    commitGame(true);
  }

  function upgradeCaptainManualSkill(key = CAPTAIN_MANUAL_SKILL_KEY) {
    const meta = CAPTAIN_MANUAL_SKILL_META[key];
    if (!canUpgradeCaptainSystems()) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    if (!meta) return;
    syncCaptainRuntimeState(state);
    const level = getCaptainManualSkillLevel(key);
    if (level >= meta.maxLevel) return toast(`${meta.name} já está no nível máximo.`, "gold-toast");
    const cost = getCaptainManualSkillCost(key, level);
    const available = getAvailableLevelPoints();
    if (available < cost) return toast(`Faltam ${cost - available} Ponto${cost - available === 1 ? "" : "s"} de Nível para promover ${meta.name}.`, "danger-toast");
    state.spentLevelPoints += cost;
    getCaptainManualSkillState(key).level = level + 1;
    syncCaptainManualSkillState(state);
    syncCaptainRuntimeState(state);
    trackAction("upgrade", { type: `captain-${key}` });
    scene.celebrateCaptain(1.5);
    lastCaptainManualSkillUpgrade = key;
    setTimeout(() => {
      if (lastCaptainManualSkillUpgrade === key) {
        lastCaptainManualSkillUpgrade = null;
        if (currentScreen === "captain") renderCaptain();
      }
    }, 900);
    toast(`${meta.name} promovida para o nível ${level + 1}.`, "gold-toast");
    addLog(key === CAPTAIN_REPAIR_SKILL_KEY ? `${meta.name} agora repara ${Math.round(getCaptainRepairPercent(level + 1) * 100)}% da vida máxima.` : `${meta.name} agora causa ${formatCaptainManualMultiplier(getCaptainManualSkillMultiplier(key))} do dano atual do navio.`, "loot");
    commitGame(true);
  }

  function selectCaptainEquipment(key) {
    if (!CAPTAIN_EQUIPMENT_META[key]) return;
    activeCaptainEquipmentKey = key;
    if (currentScreen === "captain") renderCaptain();
  }

  function selectShipUpgradeCategory(key) {
    if (!["improvements", "equipment", "skills"].includes(key)) return;
    activeShipUpgradeCategory = key;
    if (currentScreen === "upgrades") renderUpgrades();
  }

  function upgradeCaptainEquipment(key) {
    const meta = CAPTAIN_EQUIPMENT_META[key];
    const next = getNextCaptainEquipmentTierData(key);
    if (!canUpgradeCaptainSystems()) return toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
    if (!meta || !next) return toast("Este equipamento já está no tier máximo.", "gold-toast");
    syncCaptainRuntimeState(state);
    const available = getAvailableLevelPoints();
    if (available < next.pointCost) return toast(`Faltam ${next.pointCost - available} Ponto${next.pointCost - available === 1 ? "" : "s"} de Nível para evoluir este equipamento.`, "danger-toast");
    const oldStats = getStats();
    const oldRatio = oldStats.maxHp ? state.combat.playerHp / oldStats.maxHp : 1;
    state.spentLevelPoints += next.pointCost;
    state.captainEquipment[meta.tierKey] = next.level;
    activeCaptainEquipmentKey = key;
    syncCaptainRuntimeState(state);
    syncCaptainEquipmentState(state);
    trackAction("upgrade", { type: `captain-${key}` });
    scene.celebrateCaptain(1.8);
    const newStats = getStats();
    state.combat.playerHp = clamp(Math.round(newStats.maxHp * oldRatio), state.combat.playerHp > 0 ? 1 : 0, newStats.maxHp);
    lastCaptainEquipmentUpgrade = key;
    setTimeout(() => {
      if (lastCaptainEquipmentUpgrade === key) {
        lastCaptainEquipmentUpgrade = null;
        if (currentScreen === "captain") renderCaptain();
      }
    }, 900);
    const powerGain = Math.max(0, newStats.power - oldStats.power);
    const gainText = powerGain > 0 ? `Poder Naval +${formatNumber(powerGain)}.` : key === "lightHands" ? "Ouro e XP ganhos aumentados." : "Bônus recalculados.";
    toast(`${next.name} comprado! ${gainText}`, "gold-toast");
    addLog(`${meta.category}: ${next.name} evoluiu para o nível ${next.level}.`, "loot");
    commitGame(true);
  }

  function craftEquipment(key) {
    const item = EQUIPMENT_META[key];
    if (!item || state.equipment[key] || !canAfford(item.costs)) return;
    spend(item.costs); state.equipment[key] = true; state.combat.playerHp = Math.min(getStats().maxHp, state.combat.playerHp);
    toast(`${item.name} forjado e equipado!`, "gold-toast"); addLog(`${item.name} agora fortalece o navio.`, "loot"); commitGame(true);
  }

  function upgradeSkill(key) {
    if (!isSkillUnlocked(key)) return;
    const cost = getSkillCost(key); if (!canAfford(cost)) return;
    const oldPower = getStats().power;
    spend(cost); state.skills[key].level += 1;
    trackAction("upgrade", { type: "skill" });
    const newPower = getStats().power;
    toast(`${SKILL_META[key].name} nível ${state.skills[key].level}. Poder Naval +${formatNumber(newPower - oldPower)}.`); commitGame(true);
  }

  function toggleSkill(key) {
    if (!isSkillUnlocked(key)) return toast(`Essa skill libera no nível ${SKILL_META[key].unlock}.`);
    state.skills[key].auto = !state.skills[key].auto;
    if (state.skills[key].auto) state.skills[key].remaining = Math.min(state.skills[key].remaining, 1.2);
    toast(`${SKILL_META[key].name}: automático ${state.skills[key].auto ? "ligado" : "desligado"}.`); commitGame(false);
  }

  function navigate(screen) {
    screen = normalizeScreen(screen);
    if (screen !== "maps") activeMapInfoIndex = null;
    currentScreen = screen;
    setActiveScreen(screen);
    renderScreen(screen);
    const appShell = $("#app") || $(".app-shell");
    const mainContent = $(".main-content");
    if (appShell) {
      appShell.scrollTop = 0;
      appShell.scrollTo?.({ top: 0, behavior: "auto" });
    }
    if (mainContent) {
      mainContent.scrollTop = 0;
      mainContent.scrollTo?.({ top: 0, behavior: "auto" });
    }
    window.scrollTo?.({ top: 0, behavior: "auto" });
    document.scrollingElement?.scrollTo?.({ top: 0, behavior: "auto" });
  }

  function handleTradeQuantityButton(target) {
    if (!target.dataset.tradeQty || !target.dataset.tradeResource) return;
    tradeQuantities[target.dataset.tradeResource] = target.dataset.tradeQty === "max" ? "max" : Number(target.dataset.tradeQty);
    renderTrade();
  }

  function handleMissionFilterButton(target) {
    if (target.dataset.progressionFilter !== "mission-filters") return;
    activeMissionFilter = target.dataset.filterValue;
    renderMissions();
  }

  function openMapInfo(index) {
    if (index < 0 || index >= REGIONS.length) return;
    activeMapInfoIndex = index;
    renderMaps();
  }

  function closeMapInfo() {
    activeMapInfoIndex = null;
    renderMaps();
  }

  function quickSelectRegionMap(index) {
    if (isArenaSceneActive()) return toast("Volte ao mapa normal antes de trocar de rota.", "danger-toast");
    index = Math.floor(Number(index));
    if (!Number.isInteger(index) || index < 0 || index >= REGIONS.length) return;
    if (!(index < state.unlockedRegions)) {
      toast("Esse mapa ainda nao foi desbloqueado.", "danger-toast");
      return;
    }
    if (index === state.regionIndex) return;
    cancelPendingBossMapAdvance();
    cancelPendingSurpriseBoss();
    const issues = endgameRequirementIssues(index);
    state.regionIndex = index;
    activeMapInfoIndex = null;
    syncCaptainEquipmentState(state);
    scheduleNearbyRegionPreload();
    clearCurrentEnemy();
    toast(issues.length ? `Rota definida: ${REGIONS[index].name}. Poder Naval baixo para essa regiao.` : `Rota definida: ${REGIONS[index].name}.`, issues.length ? "danger-toast" : "");
    if (issues.length) addLog(`Alerta de endgame: recomenda-se evoluir antes de avancar. ${issues.join(" - ")}.`, "danger-text");
    commitGame(true);
  }

  function handleMapSelection(target) {
    if (!target.dataset.selectMap) return;
    if (isArenaSceneActive()) return toast("Volte ao mapa normal antes de trocar de rota.", "danger-toast");
    const index = Number(target.dataset.selectMap);
    if (!(index < state.unlockedRegions)) return;
    cancelPendingBossMapAdvance();
    cancelPendingSurpriseBoss();
    const issues = endgameRequirementIssues(index);
    state.regionIndex = index;
    activeMapInfoIndex = null;
    syncCaptainEquipmentState(state);
    scheduleNearbyRegionPreload();
    clearCurrentEnemy();
    toast(issues.length ? `Rota definida: ${REGIONS[index].name}. Poder Naval baixo para essa região.` : `Rota definida: ${REGIONS[index].name}.`, issues.length ? "danger-toast" : "");
    if (issues.length) addLog(`Alerta de endgame: recomenda-se evoluir antes de avançar. ${issues.join(" • ")}.`, "danger-text");
    commitGame(true);
  }

  function handleGlobalButtonClick(event) {
    const mapCloseTarget = event.target.closest("[data-close-map-info]");
    if (mapCloseTarget && !event.target.closest(".prologue-map-modal-card")) {
      closeMapInfo();
      return;
    }
    const shipCategoryTarget = event.target.closest("[data-ship-upgrade-category]");
    if (shipCategoryTarget) {
      selectShipUpgradeCategory(shipCategoryTarget.dataset.shipUpgradeCategory);
      return;
    }
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.leaderboardTab) {
      selectLeaderboardTab(target.dataset.leaderboardTab);
      return;
    }
    if (target.dataset.manualBasicAttackTutorial !== undefined) {
      const handled = manualShipAttack();
      if (!handled && !isArenaSceneActive()) toast("Toque no barco quando houver alvo vivo.", "danger-toast");
      else if (handled) commitGame(false);
      return;
    }
    if (target.dataset.closeMapInfo !== undefined) {
      closeMapInfo();
      return;
    }
    if (target.dataset.mapHotspot !== undefined) {
      openMapInfo(Number(target.dataset.mapHotspot));
      return;
    }
    if (target.dataset.mapStep !== undefined) {
      quickSelectRegionMap(state.regionIndex + Number(target.dataset.mapStep));
      return;
    }
    if (target.id === "arena-toggle") {
      toggleArenaPanel();
      return;
    }
    if (target.id === "arena-refresh") {
      arenaState.expanded = true;
      renderArenaPanel();
      refreshArenaOpponents({ force: true });
      return;
    }
    if (target.dataset.arenaChallenge) {
      startArenaChallenge(target.dataset.arenaChallenge);
      return;
    }
    if (target.dataset.exitSpecialCombat !== undefined) {
      exitSpecialCombat();
      return;
    }
    if (target.dataset.toggleCaptainPets !== undefined) {
      toggleCaptainPetsPanel();
      return;
    }
    if (target.dataset.toggleCaptainOverview !== undefined) {
      toggleCaptainOverviewPanel();
      return;
    }
    if (target.dataset.toggleCaptainManualSkills !== undefined) {
      toggleCaptainManualSkillsPanel();
      return;
    }
    if (target.dataset.toggleCaptainEquipment !== undefined) {
      toggleCaptainEquipmentPanel();
      return;
    }
    if (target.dataset.toggleStatsPanel) {
      toggleStatsPanel(target.dataset.toggleStatsPanel);
      return;
    }
    if (target.dataset.screenTarget) navigate(target.dataset.screenTarget);
    if (target.dataset.smartUpgrade) executeSmartUpgrade(target.dataset.smartUpgrade, target.dataset.smartUpgradeId);
    if (target.dataset.upgrade) upgrade(target.dataset.upgrade);
    if (target.dataset.buyShip) buyShip(Number(target.dataset.buyShip));
    if (target.dataset.equipShip) equipShip(Number(target.dataset.equipShip));
    if (target.dataset.buyPet) buyPet(Number(target.dataset.buyPet));
    if (target.dataset.upgradePet) upgradePet(Number(target.dataset.upgradePet));
    if (target.dataset.equipPet) equipPet(Number(target.dataset.equipPet));
    if (target.dataset.savePirateName !== undefined) {
      savePirateNameFromInput();
      return;
    }
    if (target.dataset.selectCaptainGender) {
      selectCaptainGender(target.dataset.selectCaptainGender);
      return;
    }
    if (target.dataset.upgradeCaptain !== undefined) upgradeCaptain();
    if (target.dataset.openCaptainMutiny !== undefined) openCaptainMutinyConfirmation();
    if (target.dataset.upgradeCaptainManualSkill) upgradeCaptainManualSkill(target.dataset.upgradeCaptainManualSkill);
    if (target.dataset.selectCaptainEquipment) {
      selectCaptainEquipment(target.dataset.selectCaptainEquipment);
      return;
    }
    if (target.dataset.shipUpgradeCategory) {
      selectShipUpgradeCategory(target.dataset.shipUpgradeCategory);
      return;
    }
    if (target.dataset.upgradeCaptainEquipment) upgradeCaptainEquipment(target.dataset.upgradeCaptainEquipment);
    if (target.dataset.craftEquipment) craftEquipment(target.dataset.craftEquipment);
    if (target.dataset.upgradeSkill) upgradeSkill(target.dataset.upgradeSkill);
    if (target.dataset.buyMissing) openMissingPurchaseConfirmation(target.dataset.buyMissing, target.dataset.buyMissingId, target.dataset.buyMissingThen === "1");
    if (target.dataset.toggleSkill) toggleSkill(target.dataset.toggleSkill);
    if (target.dataset.skillDock) toggleSkill(target.dataset.skillDock);
    if (target.dataset.manualSkill) castCaptainManualSkill(target.dataset.manualSkill);
    handleTradeQuantityButton(target);
    if (target.dataset.tradeAction && target.dataset.tradeResource) openTradeConfirmation(target.dataset.tradeResource, target.dataset.tradeAction);
    if (target.dataset.tradeStep && target.dataset.tradeResource) stepTradeQuantity(target.dataset.tradeResource, Number(target.dataset.tradeStep));
    handleMissionFilterButton(target);
    if (target.dataset.claimAllMissions !== undefined) claimAllMissionRewards();
    if (target.dataset.claimMission) claimProgressionReward("mission", target.dataset.claimMission);
    if (target.id === "leaderboard-refresh") refreshLeaderboard({ force: true });
    handleMapSelection(target);
  }

  function preventInvalidTradeInput(event) {
    if (event.target.matches("[data-trade-input]") && ["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault();
    if (event.target.matches("#pirate-name-input") && event.key === "Enter") {
      event.preventDefault();
      savePirateNameFromInput();
    }
  }

  function handleTradeInput(event) {
    const input = event.target.closest("[data-trade-input]");
    if (!input) return;
    const key = input.dataset.tradeInput;
    const value = Math.max(1, Math.floor(Number(input.value) || 1));
    input.value = String(value);
    tradeQuantities[key] = value;
    updateTradeCard(key);
  }

  function startTradeHold(event) {
    const button = event.target.closest("[data-trade-step]");
    if (!button) return;
    stopTradeHold();
    const key = button.dataset.tradeResource;
    const delta = Number(button.dataset.tradeStep);
    tradeHoldTimeout = setTimeout(() => {
      tradeHoldInterval = setInterval(() => stepTradeQuantity(key, delta), 85);
    }, 350);
  }

  function executeSmartUpgrade(kind, id) {
    const context = getMissingPurchaseContext(kind, id);
    if (!context) return toast("Upgrade indisponível.", "danger-toast");
    if (context.blocked) return toast(context.blockedMessage || "Compra bloqueada.", "danger-toast");
    if (canAfford(context.cost)) return context.execute();
    const info = getMissingPurchaseInfo(context.cost);
    if (!info.canBuyAndExecute) {
      const missingGold = Math.max(0, info.total + (context.cost.ouro || 0) - state.resources.ouro);
      const message = missingGold > 0 ? `Faltam ${formatNumber(missingGold)} Ouro para comprar este upgrade.` : "Ainda falta Gold para este upgrade.";
      return toast(message, "danger-toast");
    }
    const result = buyMissingResources(context.cost);
    if (!result.ok) return toast(result.message, "danger-toast");
    context.execute();
  }

  function toggleAutoCombat() {
    if (shouldShowInitialCaptainGate()) {
      toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
      return;
    }
    state.combat.running = !state.combat.running;
    if (state.combat.running) {
      state.hasStarted = true;
      trackAction("firstCombat");
      if (state.combat.playerHp <= 0) finishRepair(true);
      if (!state.combat.enemy) state.combat.spawnTimer = getSpawnDelay();
      beginCombatAssetPreload();
      if (!isAutoAttackUnlocked()) toast("Auto ataque libera no nível 2 do Capitão. Clique no barco para atacar.", "gold-toast");
      maybeAutoChallengeBoss();
    }
    commitGame(false);
  }

  function toggleAutoChallengeBoss() {
    state.autoChallengeBoss = !state.autoChallengeBoss;
    toast(`Boss automático ${state.autoChallengeBoss ? "ligado" : "desligado"}.`, state.autoChallengeBoss ? "gold-toast" : "");
    if (maybeAutoChallengeBoss()) saveGame();
    else commitGame(false);
  }

  function challengeBoss(options = {}) {
    const automatic = Boolean(options?.automatic);
    if (shouldShowInitialCaptainGate()) {
      if (!automatic) toast(CAPTAIN_REQUIRED_MESSAGE, "danger-toast");
      return false;
    }
    if (isArenaSceneActive()) {
      if (!automatic) toast("Finalize a Arena antes de desafiar bosses do mapa.", "danger-toast");
      return false;
    }
    if (state.regionKills[state.regionIndex] < 100 || state.bossesDefeated[state.regionIndex]) return false;
    const issues = endgameRequirementIssues(state.regionIndex);
    state.combat.specialCombatResumeRunning = Boolean(state.combat.running);
    if (issues.length && !automatic) toast("Seu Poder Naval está baixo para esse boss. Recomenda-se evoluir antes de avançar.", "danger-toast");
    if (!ensureCriticalCombatAssetsReady()) {
      if (!automatic) toast("Carregando imagens do combate...", "gold-toast");
      renderAll(false);
      return false;
    }
    state.combat.running = true;
    state.hasStarted = true;
    trackAction("firstCombat");
    state.combat.repairing = false;
    scene.resetPlayerShipAnimation();
    spawnEnemy(true);
    renderAll(false);
    return true;
  }

  function wipeProgress() {
    localStorage.removeItem(SAVE_KEY);
    cancelPendingBossMapAdvance();
    cancelPendingSurpriseBoss();
    clearPendingChests();
    state = createDefaultState();
    $("#confirm-modal").classList.add("hidden");
    toast("Progresso apagado. Uma nova jornada começou.");
    commitGame(true);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      hiddenAt = Date.now();
      saveGame();
    } else if (hiddenAt) {
      const seconds = (Date.now() - hiddenAt) / 1000;
      hiddenAt = 0;
      applyOfflineProgress(seconds, seconds >= 30);
      renderAll(true);
      lastFrame = performance.now();
    }
  }

  document.addEventListener("click", handleGlobalButtonClick);
  document.addEventListener("keydown", preventInvalidTradeInput);
  document.addEventListener("input", handleTradeInput);
  document.addEventListener("pointerdown", startTradeHold);
  ["pointerup", "pointercancel"].forEach(type => document.addEventListener(type, stopTradeHold));

  $("#start-button").addEventListener("click", toggleAutoCombat);
  $("#auto-boss-button")?.addEventListener("click", toggleAutoChallengeBoss);
  $("#boss-button").addEventListener("click", challengeBoss);
  $("#combat-collapse-toggle")?.addEventListener("click", toggleCombatMinimized);
  $("#combat-fullscreen-toggle")?.addEventListener("click", enterCombatFullscreen);
  $("#combat-fullscreen-exit")?.addEventListener("click", () => exitCombatFullscreen());
  $("#offline-close").addEventListener("click", closeOfflineModal);
  $("#wipe-button").addEventListener("click", () => $("#confirm-modal").classList.remove("hidden"));
  $("#confirm-cancel").addEventListener("click", () => $("#confirm-modal").classList.add("hidden"));
  $("#confirm-wipe").addEventListener("click", wipeProgress);
  $("#trade-cancel").addEventListener("click", closeTradeModal);
  $("#trade-confirm").addEventListener("click", executeTrade);
  $("#prestige-button").addEventListener("click", openPrestigeConfirmation);
  $("#prestige-cancel").addEventListener("click", closePrestigeConfirmation);
  $("#prestige-confirm").addEventListener("click", confirmPrestige);
  $("#arena-result-close").addEventListener("click", closeArenaResultModal);
  $("#captain-mutiny-cancel").addEventListener("click", closeCaptainMutinyConfirmation);
  $("#captain-mutiny-confirm").addEventListener("click", confirmCaptainMutiny);

  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("keydown", handleCombatFullscreenKeydown);
  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(type => document.addEventListener(type, handleCombatFullscreenChange));
  window.addEventListener("popstate", handleCombatFullscreenPopState);
  window.addEventListener("resize", () => {
    renderCaptainPreviewCanvases();
    renderPetPreviewCanvases();
    updateMobileCombatFullscreen();
    if (combatFullscreen) resizeCombatViewport();
  });
  window.addEventListener("orientationchange", updateMobileCombatFullscreen);
  window.screen?.orientation?.addEventListener?.("change", updateMobileCombatFullscreen);
  window.visualViewport?.addEventListener?.("resize", updateMobileCombatFullscreen);
  window.addEventListener("beforeunload", saveGame);

  setCombatMinimized(combatMinimized, false);
  const offlineSeconds = (Date.now() - Number(state.lastSeen || Date.now())) / 1000;
  if (!VISUAL_AUDIT_CONFIG && offlineSeconds >= 30) applyOfflineProgress(offlineSeconds, true);
  state.combat.playerHp = clamp(state.combat.playerHp || getStats().maxHp, 1, getStats().maxHp);
  if (!state.logs.length) addLog(`${SHIPS[state.shipId].name} está pronto para sua primeira patrulha.`);
  renderAll(true);
  updateMobileCombatFullscreen();
  refreshLeaderboard({ force: true });
  beginCombatAssetPreload();
  preloadMapBoardAssets();
  scheduleNearbyRegionPreload();
  requestAnimationFrame(gameLoop);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(() => {});
})();
