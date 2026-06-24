(() => {
  "use strict";

  const SAVE_KEY = "pirates-of-the-abyss-save-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const integerBetween = (min, max) => Math.floor(randomBetween(min, max + 1));

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

  const REGIONS = [
    { name: "Costa dos Náufragos", weather: "Brisa costeira", description: "Mar calmo, naufrágios e saqueadores inexperientes.", boss: "Capitão Barba de Ferro", enemies: ["Saqueador da Costa", "Bote Renegado", "Pescador Hostil", "Corsário Perdido"], drops: { madeira: .28, ferro: .16, tecido: .22 }, baseHp: 72, baseDamage: 7, gold: 18, xp: 14, sky: "#78b9c1", sea: "#167087", land: "#5d8b58", kind: "PIRATA" },
    { name: "Ilhas Comerciais", weather: "Céu aberto", description: "Portos ricos, mercantes e contrabandistas discretos.", boss: "Rainha Corsária Scarlet", enemies: ["Mercante Armado", "Contrabandista Veloz", "Guarda do Porto", "Corveta Mercante"], drops: { comida: .25, tecido: .24, madeira: .18 }, baseHp: 160, baseDamage: 15, gold: 42, xp: 31, sky: "#78b6d4", sea: "#17627e", land: "#659a61", kind: "MERCANTE" },
    { name: "Mar das Tempestades", weather: "Temporal elétrico", description: "Chuva, raios e embarcações endurecidas pelo caos.", boss: "Tempestade Viva", enemies: ["Brigue Trovejante", "Caçador da Tormenta", "Nau do Relâmpago", "Corsário das Nuvens"], drops: { polvora: .16, cristal: .065 }, baseHp: 350, baseDamage: 31, gold: 91, xp: 66, sky: "#394d61", sea: "#153d54", land: "#465a55", kind: "TEMPESTADE" },
    { name: "Baía dos Corsários", weather: "Fumaça de canhões", description: "Esconderijos rochosos e a elite dos contrabandistas.", boss: "Almirante Negro", enemies: ["Corveta Corsária", "Brigantina Negra", "Contrabandista de Armas", "Carrasco da Baía"], drops: { ferro: .20, polvora: .15 }, baseHp: 740, baseDamage: 61, gold: 190, xp: 135, sky: "#bd7964", sea: "#294b5d", land: "#4a4540", kind: "CORSÁRIO" },
    { name: "Oceano Profundo", weather: "Correntes abissais", description: "Águas escuras habitadas por feras e caçadores.", boss: "Megalodon Ancestral", enemies: ["Baleeiro Sombrio", "Caçador Abissal", "Serpente Marinha", "Nau do Recife"], drops: { perola: .075, cristal: .08 }, baseHp: 1550, baseDamage: 125, gold: 390, xp: 278, sky: "#2f6680", sea: "#092f48", land: "#364f52", kind: "CRIATURA" },
    { name: "Triângulo Maldito", weather: "Névoa espectral", description: "Navios fantasmas surgem e somem dentro da névoa.", boss: "Holandês Voador", enemies: ["Escuna Fantasma", "Tripulação Perdida", "Nau Espectral", "Vulto do Triângulo"], drops: { ambar: .045, cristal: .095 }, baseHp: 3250, baseDamage: 254, gold: 800, xp: 568, sky: "#536b6e", sea: "#173f4b", land: "#455653", kind: "FANTASMA" },
    { name: "Mar Imperial", weather: "Ventos de guerra", description: "Fortificações e frotas militares dominam o horizonte.", boss: "Grande Armada Imperial", enemies: ["Fragata Real", "Corveta Imperial", "Navio de Suprimentos", "Patrulha da Coroa"], drops: { ferro: .24, cristal: .085 }, baseHp: 6800, baseDamage: 520, gold: 1650, xp: 1170, sky: "#8ca7bb", sea: "#2b5c78", land: "#6c7568", kind: "MARINHA" },
    { name: "Arquipélago Vulcânico", weather: "Cinzas no ar", description: "Rochas negras, lava e criaturas cobertas de magma.", boss: "Dragão Marinho Vulcânico", enemies: ["Nau de Obsidiana", "Saqueador de Cinzas", "Carapaça Vulcânica", "Dragão Marinho Jovem"], drops: { pedra: .18, ferro: .21, cristal: .09 }, baseHp: 14200, baseDamage: 1070, gold: 3400, xp: 2400, sky: "#8c4d3e", sea: "#373743", land: "#342e2b", kind: "VULCÂNICO" },
    { name: "Reino Congelado", weather: "Nevasca cortante", description: "Icebergs, monstros gelados e navios presos no gelo.", boss: "Jormungandr de Gelo", enemies: ["Quebra-Gelo Hostil", "Corsário Boreal", "Serpente de Gelo", "Fragata Congelada"], drops: { cristal: .11, gema: .04 }, baseHp: 29800, baseDamage: 2200, gold: 7000, xp: 4950, sky: "#b4d4df", sea: "#447b91", land: "#d2e2e1", kind: "GLACIAL" },
    { name: "Abismo do Kraken", weather: "O abismo desperta", description: "Redemoinhos, tentáculos e riquezas lendárias.", boss: "Kraken Primordial", enemies: ["Cultista do Kraken", "Dreadnought Afundado", "Tentáculo Abissal", "Leviatã Menor"], drops: { fragmentos: .008, gema: .045, cristal: .12 }, baseHp: 62500, baseDamage: 4500, gold: 14500, xp: 10200, sky: "#18293f", sea: "#071f38", land: "#242b38", kind: "ABISSAL" }
  ];

  const SHIP_NAMES = [
    "Bote Armado", "Escuna Leve", "Escuna Mercante", "Cutter Real",
    "Brigantina", "Brigantina Militar", "Corveta Azul", "Corveta Negra",
    "Galeota", "Galeão Mercante", "Galeão de Guerra", "Fragata Imperial",
    "Fragata Fantasma", "Navio Dragão", "Cruzador Tempestade", "Encouraçado Imperial",
    "Leviathan", "Kraken Hunter", "Dreadnought dos Mares", "Black Abyss"
  ];

  const SHIPS = SHIP_NAMES.map((name, index) => {
    const tier = Math.floor(index / 4) + 1;
    const scale = Math.pow(1.72, index);
    const costs = index === 0 ? {} : {
      ouro: Math.round(450 * Math.pow(1.8, index - 1)),
      madeira: Math.round(50 * Math.pow(1.55, index - 1)),
      ferro: Math.round(20 * Math.pow(1.54, index - 1))
    };
    if (tier >= 2) costs.tecido = Math.round(35 * Math.pow(1.43, index - 4));
    if (tier >= 3) costs.cristal = Math.round(5 * Math.pow(1.38, index - 8));
    if (tier >= 4) costs.gema = Math.round(3 * Math.pow(1.3, index - 12));
    if (tier === 5) costs.fragmentos = 2 + (index - 16) * 3;
    return {
      id: index, name, tier,
      hp: Math.round(140 * scale),
      damage: Math.round(18 * scale),
      speed: Math.round(100 + index * 13 + tier * 3),
      armor: 2 + index * 2,
      levelReq: index === 0 ? 1 : 2 + index * 3,
      bossReq: Math.max(0, Math.ceil(index / 2) - 1),
      costs,
      type: name.includes("Imperial") || name.includes("Real") || name.includes("Militar") ? "Marinha" : name.includes("Mercante") ? "Civil" : name.includes("Fantasma") || name.includes("Abyss") ? "Espectral" : "Pirata"
    };
  });

  const SKILL_META = {
    fire: { name: "Canhão de Fogo", icon: "🔥", unlock: 1, cooldown: 8, factor: 1.8, effect: "Causa dano direto e incendeia o alvo por 4s.", materials: ["polvora", "ferro"] },
    ice: { name: "Canhão de Gelo", icon: "❄", unlock: 3, cooldown: 11, factor: 1.5, effect: "Causa dano e reduz o ritmo de ataque inimigo.", materials: ["cristal", "tecido"] },
    ghost: { name: "Canhão Fantasma", icon: "👻", unlock: 7, cooldown: 14, factor: 2.6, effect: "Um disparo espectral que ignora toda a armadura.", materials: ["ambar", "cristal"] },
    chain: { name: "Bolas de Corrente", icon: "⛓", unlock: 12, cooldown: 10, factor: 2.0, effect: "Dano pesado que atrasa o próximo ataque inimigo.", materials: ["ferro", "perola"] }
  };

  const EQUIPMENT_META = {
    compass: { name: "Bússola Naval", icon: "✥", effect: "+12% velocidade e +8% chance de loot", costs: { cristal: 20, perola: 5, ouro: 5000 } },
    spyglass: { name: "Luneta Imperial", icon: "⌕", effect: "+8% precisão e +7% crítico", costs: { cristal: 30, gema: 10, ouro: 10000 } },
    anchor: { name: "Âncora Reforçada", icon: "⚓", effect: "+20 armadura e +10% de vida", costs: { ferro: 100, pedra: 20, ouro: 5000 } },
    amulet: { name: "Amuleto do Abismo", icon: "☠", effect: "+25% DPS e +20% contra bosses", costs: { ambar: 20, perola: 10, fragmentos: 5, ouro: 50000 } }
  };

  function createDefaultState() {
    return {
      version: 1,
      resources: { ouro: 1200, madeira: 90, ferro: 55, tecido: 45, comida: 22, polvora: 28, pedra: 0, cristal: 0, perola: 0, gema: 0, ambar: 0, fragmentos: 0 },
      pirateLevel: 1,
      xp: 0,
      regionIndex: 0,
      unlockedRegions: 1,
      regionKills: Array(10).fill(0),
      bossesDefeated: Array(10).fill(false),
      shipId: 0,
      ownedShips: [0],
      levels: { ship: 1, cannons: 1, sails: 1, hull: 1 },
      equipment: { compass: false, spyglass: false, anchor: false, amulet: false },
      skills: {
        fire: { level: 1, auto: true, remaining: 1.5 },
        ice: { level: 1, auto: true, remaining: 4 },
        ghost: { level: 1, auto: true, remaining: 6 },
        chain: { level: 1, auto: true, remaining: 8 }
      },
      lifetime: { enemies: 0, bosses: 0, resources: 0, gold: 0, highestDamage: 0, playSeconds: 0 },
      combat: { running: false, repairing: false, repairStarted: 0, playerHp: 140, enemy: null, attackTimer: 0, enemyAttackTimer: 0, spawnTimer: 0 },
      logs: [],
      hasStarted: false,
      lastSeen: Date.now()
    };
  }

  function loadState() {
    const defaults = createDefaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return defaults;
      const merged = { ...defaults, ...saved };
      merged.resources = { ...defaults.resources, ...(saved.resources || {}) };
      merged.levels = { ...defaults.levels, ...(saved.levels || {}) };
      merged.equipment = { ...defaults.equipment, ...(saved.equipment || {}) };
      merged.skills = Object.fromEntries(Object.keys(SKILL_META).map(key => [key, { ...defaults.skills[key], ...((saved.skills || {})[key] || {}) }]));
      merged.lifetime = { ...defaults.lifetime, ...(saved.lifetime || {}) };
      merged.combat = { ...defaults.combat, ...(saved.combat || {}), enemy: null, repairing: false, spawnTimer: 0 };
      merged.regionKills = defaults.regionKills.map((_, i) => Number(saved.regionKills?.[i] || 0));
      merged.bossesDefeated = defaults.bossesDefeated.map((_, i) => Boolean(saved.bossesDefeated?.[i]));
      merged.ownedShips = Array.isArray(saved.ownedShips) ? saved.ownedShips : [0];
      return merged;
    } catch (error) {
      console.warn("Não foi possível carregar o save.", error);
      return defaults;
    }
  }

  let state = loadState();
  let currentScreen = "home";
  let activeUpgradeTab = "improvements";
  let lastFrame = performance.now();
  let lastUiRefresh = 0;
  let lastSave = performance.now();
  let hiddenAt = 0;

  const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  function formatNumber(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1000) return numberFormatter.format(Math.round(n));
    const units = [[1e12, " tri"], [1e9, " bi"], [1e6, " mi"], [1e3, " mil"]];
    const [size, suffix] = units.find(([size]) => n >= size);
    const scaled = n / size;
    return scaled.toLocaleString("pt-BR", { maximumFractionDigits: scaled < 10 ? 1 : 0 }) + suffix;
  }

  function xpNeeded(level = state.pirateLevel) { return Math.round(100 * Math.pow(level, 1.42)); }
  function bossesCount() { return state.bossesDefeated.filter(Boolean).length; }
  function isSkillUnlocked(key) { return state.pirateLevel >= SKILL_META[key].unlock; }

  function getStats() {
    const ship = SHIPS[state.shipId];
    const overall = 1 + (state.levels.ship - 1) * .06;
    const damageBonus = 1 + (state.levels.cannons - 1) * .13;
    const speedBonus = 1 + (state.levels.sails - 1) * .075;
    const hpBonus = 1 + (state.levels.hull - 1) * .15;
    let damage = ship.damage * overall * damageBonus;
    let speed = ship.speed * overall * speedBonus;
    let maxHp = ship.hp * overall * hpBonus;
    let armor = ship.armor + (state.levels.hull - 1) * 2.2 + (state.levels.ship - 1) * .7;
    let precision = Math.min(.98, .83 + (state.levels.cannons - 1) * .006);
    let crit = Math.min(.55, .06 + (state.levels.cannons - 1) * .005);
    if (state.equipment.compass) speed *= 1.12;
    if (state.equipment.spyglass) { precision = Math.min(1, precision + .08); crit = Math.min(.7, crit + .07); }
    if (state.equipment.anchor) { armor += 20; maxHp *= 1.1; }
    if (state.equipment.amulet) damage *= 1.25;
    const attackInterval = Math.max(190, 100000 / speed);
    const basicDps = damage / (attackInterval / 1000) * precision * (1 + crit);
    let skillDps = 0;
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      if (!isSkillUnlocked(key) || !state.skills[key].auto) return;
      const level = state.skills[key].level;
      skillDps += damage * (meta.factor + (level - 1) * .24) / (meta.cooldown / Math.min(1.8, Math.sqrt(speed / 100)));
      if (key === "fire") skillDps += damage * (.18 + level * .04);
    });
    return {
      damage: Math.round(damage), speed: Math.round(speed), maxHp: Math.round(maxHp), armor: Math.round(armor),
      precision, crit, evasion: Math.min(.3, .03 + speed / 5000), attackInterval,
      dps: Math.round(basicDps + skillDps), power: Math.round((basicDps + skillDps) * 4 + maxHp * .35 + armor * 8)
    };
  }

  function getSpawnDelay() { return Math.max(280, 5000 * Math.pow(100 / getStats().speed, .72)); }

  function getUpgradeCost(type, level = state.levels[type]) {
    const pow = (base, growth) => Math.round(base * Math.pow(growth, level - 1));
    if (type === "ship") {
      const cost = { ouro: pow(120, 1.54), madeira: pow(12, 1.42) };
      if (level >= 3) cost.comida = pow(5, 1.35);
      if (level >= 10) cost.perola = pow(1, 1.25);
      return cost;
    }
    if (type === "cannons") {
      const cost = { ouro: pow(150, 1.55), ferro: pow(15, 1.43), polvora: pow(10, 1.43) };
      if (level >= 7) cost.cristal = pow(2, 1.3);
      if (level >= 13) cost.gema = pow(1, 1.22);
      return cost;
    }
    if (type === "sails") {
      const cost = { ouro: pow(100, 1.52), tecido: pow(10, 1.44) };
      if (level >= 7) cost.cristal = pow(2, 1.28);
      if (level >= 13) cost.gema = pow(1, 1.2);
      return cost;
    }
    const cost = { ouro: pow(150, 1.56), madeira: pow(25, 1.42), ferro: pow(10, 1.4) };
    if (level >= 5) cost.pedra = pow(4, 1.35);
    if (level >= 9) cost.cristal = pow(2, 1.28);
    if (level >= 14) cost.perola = pow(1, 1.2);
    return cost;
  }

  function getSkillCost(key) {
    const level = state.skills[key].level;
    const meta = SKILL_META[key];
    const cost = { ouro: Math.round(300 * Math.pow(1.62, level - 1)) };
    cost[meta.materials[0]] = Math.round(12 * Math.pow(1.48, level - 1));
    cost[meta.materials[1]] = Math.round(6 * Math.pow(1.42, level - 1));
    return cost;
  }

  function canAfford(cost) { return Object.entries(cost).every(([key, amount]) => (state.resources[key] || 0) >= amount); }
  function spend(cost) { Object.entries(cost).forEach(([key, amount]) => { state.resources[key] -= amount; }); }

  function addLog(message, type = "") {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    state.logs.unshift({ message, type, time });
    state.logs = state.logs.slice(0, 8);
  }

  function toast(message, type = "") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    $("#toast-region").append(node);
    setTimeout(() => node.remove(), 3300);
  }

  function gainXp(amount) {
    state.xp += amount;
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.pirateLevel += 1;
      const unlocked = Object.entries(SKILL_META).find(([, meta]) => meta.unlock === state.pirateLevel);
      toast(unlocked ? `Nível ${state.pirateLevel}! ${unlocked[1].name} foi desbloqueado.` : `Nível ${state.pirateLevel} alcançado!`, "gold-toast");
      addLog(`Seu capitão alcançou o nível ${state.pirateLevel}.`, "loot");
    }
  }

  function saveGame() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (error) { console.warn("Não foi possível salvar.", error); }
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
      this.floaters = [];
      this.resize = this.resize.bind(this);
      new ResizeObserver(this.resize).observe(canvas);
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = Math.max(320, rect.width);
      this.height = Math.max(300, rect.height);
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

    floatDamage(amount, atEnemy = true, color = "#fff0bc") {
      this.floaters.push({ text: amount, x: this.width * (atEnemy ? .70 : .30) + randomBetween(-25, 25), y: this.height * (atEnemy ? .47 : .60), age: 0, color });
    }

    update(dt) {
      this.time += dt;
      this.projectiles.forEach(item => item.age += dt);
      this.bursts.forEach(item => item.age += dt);
      this.floaters.forEach(item => item.age += dt);
      this.projectiles = this.projectiles.filter(item => item.age < item.duration);
      this.bursts = this.bursts.filter(item => item.age < .75);
      this.floaters = this.floaters.filter(item => item.age < 1.05);
    }

    draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const region = REGIONS[state.regionIndex];
      const horizon = h * .42;
      ctx.clearRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, this.mix(region.sky, "#183249", .28));
      sky.addColorStop(.58, region.sky);
      sky.addColorStop(1, this.mix(region.sky, "#f5d9ad", .34));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon + 2);

      const sunX = state.regionIndex > 4 ? w * .18 : w * .76;
      const sunRadius = Math.min(w, h) * .075;
      const sunGlow = ctx.createRadialGradient(sunX, h * .15, 2, sunX, h * .15, sunRadius * 2.4);
      sunGlow.addColorStop(0, state.regionIndex > 4 ? "rgba(224,243,245,.8)" : "rgba(255,245,190,.92)");
      sunGlow.addColorStop(.28, state.regionIndex > 4 ? "rgba(205,232,236,.2)" : "rgba(255,211,114,.24)");
      sunGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sunGlow; ctx.fillRect(sunX - sunRadius * 2.5, h * .15 - sunRadius * 2.5, sunRadius * 5, sunRadius * 5);

      this.drawCloud(ctx, w * .06, h * .16, 1.18);
      this.drawCloud(ctx, w * .51, h * .095, .78);
      this.drawCloud(ctx, w * .82, h * .22, .56);

      const sea = ctx.createLinearGradient(0, horizon, 0, h);
      sea.addColorStop(0, this.mix(region.sea, "#c4eeea", .3));
      sea.addColorStop(.3, region.sea);
      sea.addColorStop(1, this.mix(region.sea, "#02101c", .52));
      ctx.fillStyle = sea;
      ctx.fillRect(0, horizon, w, h - horizon);
      this.drawSunPath(ctx, sunX, horizon, h);
      this.drawWaves(ctx, horizon, w, h);

      this.drawIsland(ctx, -w * .035, horizon + 8, w * .31, region.land, 1.18, 0);
      this.drawIsland(ctx, w * .73, horizon + 3, w * .29, region.land, .94, 1);
      this.drawIsland(ctx, w * .43, horizon - 3, w * .11, region.land, .48, 2);
      if (state.regionIndex === 6) this.drawFort(ctx, w * .82, horizon - 22);
      this.drawBirds(ctx, w, h);

      if (state.regionIndex === 2) this.drawRain(ctx, w, h);
      if (state.regionIndex === 8) this.drawSnow(ctx, w, h);
      if (state.regionIndex === 5) this.drawFog(ctx, w, h);
      if (state.regionIndex === 9) this.drawTentacles(ctx, w, h);

      const bobPlayer = Math.sin(this.time * 1.55) * 3;
      const bobEnemy = Math.sin(this.time * 1.35 + 1.4) * 3;
      this.drawShip(ctx, w * .29, h * .66 + bobPlayer, Math.min(1.15, w / 950), false, SHIPS[state.shipId].tier, false, state.shipId, SHIPS[state.shipId].type);
      const enemy = state.combat.enemy;
      if (enemy) this.drawShip(ctx, w * .71, h * .52 + bobEnemy, Math.min(1.02, w / 1050), true, enemy.isBoss ? 5 : Math.min(5, state.regionIndex / 2 + 1), enemy.isBoss, state.regionIndex + 20, enemy.kind);

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

      this.floaters.forEach(item => {
        ctx.globalAlpha = 1 - item.age / 1.05;
        ctx.fillStyle = item.color;
        ctx.font = `800 ${14 + item.age * 4}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 4;
        ctx.fillText(`-${formatNumber(item.text)}`, item.x, item.y - item.age * 32);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      });
    }

    mix(a, b, amount) {
      const parse = hex => hex.match(/\w\w/g).map(v => parseInt(v, 16));
      const ca = parse(a), cb = parse(b);
      return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * amount)).join(",")})`;
    }

    drawCloud(ctx, x, y, scale) {
      ctx.save();
      ctx.globalAlpha = .24;
      const cloud = ctx.createLinearGradient(0, y - 35 * scale, 0, y + 24 * scale);
      cloud.addColorStop(0, "rgba(255,255,255,.95)"); cloud.addColorStop(1, "rgba(188,211,215,.42)");
      ctx.fillStyle = cloud;
      ctx.shadowColor = "rgba(255,255,255,.16)"; ctx.shadowBlur = 18 * scale;
      [[0, 8, 25], [24, -1, 31], [52, 5, 27], [76, 12, 18]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(x + dx * scale, y + dy * scale, r * 1.24 * scale, r * .72 * scale, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    drawSunPath(ctx, sunX, horizon, h) {
      const reflection = ctx.createLinearGradient(0, horizon, 0, h);
      reflection.addColorStop(0, "rgba(255,236,178,.32)");
      reflection.addColorStop(1, "rgba(255,236,178,0)");
      ctx.fillStyle = reflection;
      ctx.beginPath();
      ctx.moveTo(sunX - 8, horizon); ctx.lineTo(sunX + 8, horizon); ctx.lineTo(sunX + 72, h); ctx.lineTo(sunX - 68, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,245,208,.3)"; ctx.lineWidth = 1;
      for (let i = 0; i < 11; i++) {
        const depth = i / 10;
        const y = horizon + Math.pow(depth, 1.35) * (h - horizon);
        const half = 5 + depth * 48;
        ctx.beginPath(); ctx.moveTo(sunX - half + Math.sin(i + this.time) * 8, y); ctx.lineTo(sunX + half, y); ctx.stroke();
      }
    }

    drawBirds(ctx, w, h) {
      ctx.strokeStyle = "rgba(25,51,62,.48)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const x = w * (.36 + i * .055) + Math.sin(this.time * .18 + i) * 8;
        const y = h * (.18 + (i % 3) * .025);
        const size = 3 + (i % 2) * 2;
        ctx.beginPath(); ctx.quadraticCurveTo(x, y - size, x + size, y); ctx.quadraticCurveTo(x + size * 2, y - size, x + size * 3, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
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

    drawShip(ctx, x, y, scale, flipped, tier, boss, variant = 0, faction = "Pirata") {
      const direction = flipped ? -1 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(direction * scale, scale);
      const spectral = /Espectral|FANTASMA|ABISSAL/.test(faction) || variant === 19;
      const imperial = /Marinha|MARINHA/.test(faction);
      const civil = /Civil|MERCANTE/.test(faction);
      const fiery = /VULCÂNICO/.test(faction);
      const length = 76 + tier * 8 + (boss ? 19 : 0);
      const hull = spectral ? "#173f43" : imperial ? "#173d68" : civil ? "#416047" : fiery ? "#672d25" : boss ? "#281a25" : ["#70452d", "#5b3728", "#6e3c2b", "#47352c"][variant % 4];
      const trim = spectral ? "#52e5da" : imperial ? "#d3a73f" : civil ? "#d2b16a" : fiery ? "#e46b36" : boss ? "#bf4655" : "#c08a45";
      const sail = spectral ? "#95d8ce" : imperial ? "#eee8d6" : civil ? "#ddd4b9" : fiery ? "#4a2925" : boss ? "#28232e" : "#d6c9aa";

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

      const portCount = Math.min(9, tier + 3 + (boss ? 2 : 0));
      ctx.fillStyle = "#081015";
      for (let i = 0; i < portCount; i++) { const px = -length * .57 + i * (length * 1.08 / Math.max(1, portCount - 1)); ctx.fillRect(px - 3.2, 6, 6.4, 5.2); ctx.fillStyle = trim; ctx.fillRect(px - 3.2, 5.2, 6.4, 1); ctx.fillStyle = "#081015"; }

      const sternX = -length * .63;
      if (tier >= 2 || boss) {
        ctx.fillStyle = hull; ctx.fillRect(sternX, -22 - tier * 2, length * .29, 18 + tier * 2);
        ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.strokeRect(sternX, -22 - tier * 2, length * .29, 18 + tier * 2);
        ctx.fillStyle = "#ffd77b"; for (let i = 0; i < 2; i++) ctx.fillRect(sternX + 7 + i * 13, -16 - tier, 6, 6);
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
      if (!imperial && !civil && tier >= 2) { ctx.fillStyle = "rgba(245,242,214,.82)"; ctx.font = "12px Georgia"; ctx.textAlign = "center"; ctx.fillText("☠", masts[Math.floor(masts.length / 2)] + 20, -(70 + tier * 6) * .57); }

      if (spectral) { ctx.shadowColor = "#43e1d4"; ctx.shadowBlur = 14; ctx.strokeStyle = "rgba(83,236,221,.65)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.shadowBlur = 0; }
      if (boss) { ctx.strokeStyle = trim; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(length * .45, -8); ctx.quadraticCurveTo(length * .82, -43, length * 1.04, -24); ctx.stroke(); }
      ctx.restore();
    }

    drawRain(ctx, w, h) { ctx.strokeStyle = "rgba(207,229,236,.22)"; ctx.lineWidth = 1; for (let i = 0; i < 50; i++) { const x = (i * 97 + this.time * 190) % (w + 80) - 40; const y = (i * 53 + this.time * 320) % h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 24); ctx.stroke(); } }
    drawSnow(ctx, w, h) { ctx.fillStyle = "rgba(238,249,250,.65)"; for (let i = 0; i < 36; i++) { const x = (i * 83 + Math.sin(this.time + i) * 30) % w; const y = (i * 49 + this.time * (19 + i % 8)) % h; ctx.beginPath(); ctx.arc(x, y, 1 + i % 3, 0, Math.PI * 2); ctx.fill(); } }
    drawFog(ctx, w, h) { const fog = ctx.createLinearGradient(0, h * .25, 0, h); fog.addColorStop(0, "rgba(210,226,220,.12)"); fog.addColorStop(.55, "rgba(210,226,220,.28)"); fog.addColorStop(1, "rgba(210,226,220,.04)"); ctx.fillStyle = fog; ctx.fillRect(0, h * .2, w, h * .7); }
    drawTentacles(ctx, w, h) { ctx.strokeStyle = "rgba(60,24,74,.72)"; ctx.lineWidth = 18; ctx.lineCap = "round"; [w * .58, w * .82].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x, h); ctx.bezierCurveTo(x - 45, h * .72, x + 60, h * .62, x + Math.sin(this.time + i) * 15, h * .5); ctx.stroke(); }); ctx.lineCap = "butt"; }
    drawFort(ctx, x, y) { ctx.fillStyle = "#6b6d67"; ctx.fillRect(x, y - 22, 65, 28); for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 18, y - 30, 12, 12); }
  }

  const scene = new SeaScene($("#sea-canvas"));

  function spawnEnemy(isBoss = false) {
    const region = REGIONS[state.regionIndex];
    const variation = randomBetween(.9, 1.14);
    const hp = Math.round(region.baseHp * variation * (isBoss ? 34 : 1));
    state.combat.enemy = {
      name: isBoss ? region.boss : region.enemies[integerBetween(0, region.enemies.length - 1)],
      kind: isBoss ? "BOSS" : region.kind,
      isBoss,
      maxHp: hp,
      hp,
      damage: Math.round(region.baseDamage * variation * (isBoss ? 3.5 : 1)),
      armor: state.regionIndex * 5 + (isBoss ? 22 + state.regionIndex * 4 : 0),
      burnTime: 0,
      burnDps: 0,
      slowed: 0,
      defeated: false
    };
    state.combat.attackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    addLog(isBoss ? `${region.boss} emergiu para o duelo!` : `${state.combat.enemy.name} avistado a estibordo.`, isBoss ? "danger-text" : "");
  }

  function dealToEnemy(rawDamage, options = {}) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const mitigation = options.ignoreArmor ? 1 : 100 / (100 + enemy.armor);
    const damage = Math.max(1, Math.round(rawDamage * mitigation));
    enemy.hp = Math.max(0, enemy.hp - damage);
    state.lifetime.highestDamage = Math.max(state.lifetime.highestDamage, damage);
    scene.fire(true, options.color || "#ffd37a");
    setTimeout(() => { scene.burst(true, options.color || "#f4a34c"); scene.floatDamage(damage, true, options.color || "#fff0bc"); }, 340);
    if (enemy.hp <= 0) defeatEnemy();
  }

  function basicAttack() {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const stats = getStats();
    if (Math.random() > stats.precision) { scene.fire(true, "#cbd6d0"); addLog("O disparo passou longe do alvo."); return; }
    const critical = Math.random() < stats.crit;
    const raw = stats.damage * randomBetween(.91, 1.09) * (critical ? 2 : 1);
    dealToEnemy(raw, { color: critical ? "#ffe268" : "#ffd37a" });
    if (critical) addLog(`Acerto crítico de ${formatNumber(raw)}!`, "loot");
  }

  function castSkill(key) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const meta = SKILL_META[key];
    const level = state.skills[key].level;
    const base = getStats().damage * (meta.factor + (level - 1) * .24);
    if (key === "fire") { dealToEnemy(base, { color: "#ff6d3a" }); enemy.burnTime = 4; enemy.burnDps = getStats().damage * (.18 + level * .04); }
    if (key === "ice") { dealToEnemy(base, { color: "#81e8ff" }); enemy.slowed = 4 + level * .2; }
    if (key === "ghost") dealToEnemy(base, { color: "#c58cff", ignoreArmor: true });
    if (key === "chain") { dealToEnemy(base, { color: "#d9e4df" }); state.combat.enemyAttackTimer = Math.max(0, state.combat.enemyAttackTimer - 1200); }
    addLog(`${meta.name} disparado automaticamente.`, "loot");
  }

  function enemyAttack() {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const stats = getStats();
    if (Math.random() < stats.evasion) { addLog("Manobra perfeita: ataque inimigo evitado.", "loot"); return; }
    const damage = Math.max(1, Math.round(enemy.damage * randomBetween(.87, 1.12) * 100 / (100 + stats.armor * 4)));
    state.combat.playerHp = Math.max(0, state.combat.playerHp - damage);
    scene.fire(false, "#ff8c68");
    setTimeout(() => { scene.burst(false, "#ff7657"); scene.floatDamage(damage, false, "#ffb09b"); }, 340);
    if (state.combat.playerHp <= 0) beginRepair();
  }

  function beginRepair() {
    state.combat.repairing = true;
    state.combat.repairStarted = performance.now();
    addLog("Casco destruído. Reparo automático iniciado!", "danger-text");
    toast("Navio destruído — reparo automático em andamento.", "danger-toast");
  }

  function finishRepair(forced = false) {
    state.combat.repairing = false;
    state.combat.playerHp = getStats().maxHp;
    state.combat.attackTimer = 0;
    addLog(forced ? "Protocolo de segurança concluiu o reparo." : "Reparo concluído. Retomando o combate.", "loot");
  }

  function rewardMaterials(multiplier = 1) {
    const region = REGIONS[state.regionIndex];
    const lootBonus = state.equipment.compass ? 1.08 : 1;
    const found = [];
    Object.entries(region.drops).forEach(([key, chance]) => {
      if (Math.random() < chance * lootBonus * (multiplier > 1 ? 1.65 : 1)) {
        const amount = Math.max(1, Math.round(integerBetween(1, 1 + Math.floor(state.regionIndex / 2)) * multiplier));
        state.resources[key] += amount;
        state.lifetime.resources += amount;
        found.push(`${amount} ${RESOURCE_META[key].name}`);
      }
    });
    return found;
  }

  function defeatEnemy() {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    enemy.defeated = true;
    const region = REGIONS[state.regionIndex];
    if (enemy.isBoss) {
      const reward = Math.round(region.gold * 45);
      state.resources.ouro += reward;
      state.lifetime.gold += reward;
      state.lifetime.bosses += 1;
      state.bossesDefeated[state.regionIndex] = true;
      gainXp(region.xp * 35);
      const materials = rewardMaterials(8);
      addLog(`${region.boss} derrotado! Tesouro: ${formatNumber(reward)} ouro.`, "loot");
      toast(`${region.boss} foi derrotado!`, "gold-toast");
      if (state.regionIndex < REGIONS.length - 1) {
        state.unlockedRegions = Math.max(state.unlockedRegions, state.regionIndex + 2);
        state.regionIndex += 1;
        state.combat.enemy = null;
        state.combat.spawnTimer = -700;
        toast(`${REGIONS[state.regionIndex].name} foi desbloqueada.`, "gold-toast");
      } else {
        state.combat.running = false;
        toast("Você conquistou o Abismo e se tornou uma lenda!", "gold-toast");
      }
      if (materials.length) addLog(`Tesouro do boss: ${materials.join(", ")}.`, "loot");
    } else {
      const gold = Math.round(region.gold * randomBetween(.88, 1.15));
      state.resources.ouro += gold;
      state.lifetime.gold += gold;
      state.lifetime.enemies += 1;
      state.regionKills[state.regionIndex] += 1;
      gainXp(Math.round(region.xp * randomBetween(.92, 1.08)));
      const materials = rewardMaterials(1);
      addLog(materials.length ? `Vitória: +${formatNumber(gold)} ouro, ${materials.join(", ")}.` : `Vitória: +${formatNumber(gold)} ouro. Nenhum material.`, materials.length ? "loot" : "");
      if (state.regionKills[state.regionIndex] === 100 && !state.bossesDefeated[state.regionIndex]) toast(`${region.boss} está disponível para desafio!`, "gold-toast");
      state.combat.enemy = null;
      state.combat.spawnTimer = 0;
    }
    renderAll(false);
  }

  function resetShip() {
    state.combat.repairing = false;
    state.combat.repairStarted = 0;
    state.combat.playerHp = getStats().maxHp;
    state.combat.enemy = null;
    state.combat.attackTimer = 0;
    state.combat.enemyAttackTimer = 0;
    state.combat.spawnTimer = getSpawnDelay();
    state.combat.running = true;
    state.hasStarted = true;
    addLog("Estado do navio restaurado com segurança.", "loot");
    toast("Navio restaurado. O combate foi reiniciado.");
  }

  function combatTick(dt, now) {
    if (!state.combat.running) return;
    state.lifetime.playSeconds += dt;
    if (state.combat.repairing) {
      const elapsed = now - state.combat.repairStarted;
      if (elapsed >= 4000 || elapsed > 6000) finishRepair(elapsed > 6000);
      return;
    }
    if (!state.combat.enemy) {
      state.combat.spawnTimer += dt * 1000;
      if (state.combat.spawnTimer >= getSpawnDelay()) { state.combat.spawnTimer = 0; spawnEnemy(false); }
      return;
    }
    const enemy = state.combat.enemy;
    if (enemy.defeated) return;
    if (enemy.burnTime > 0) {
      enemy.burnTime -= dt;
      enemy.hp = Math.max(0, enemy.hp - enemy.burnDps * dt);
      if (enemy.hp <= 0) defeatEnemy();
    }
    if (enemy.slowed > 0) enemy.slowed -= dt;
    const stats = getStats();
    state.combat.attackTimer += dt * 1000;
    let shots = 0;
    while (state.combat.attackTimer >= stats.attackInterval && shots < 4 && state.combat.enemy) { state.combat.attackTimer -= stats.attackInterval; basicAttack(); shots++; }
    if (!state.combat.enemy) return;
    const enemyInterval = (state.combat.enemy.isBoss ? 1450 : 1900) * (enemy.slowed > 0 ? 1.65 : 1);
    state.combat.enemyAttackTimer += dt * 1000;
    if (state.combat.enemyAttackTimer >= enemyInterval) { state.combat.enemyAttackTimer -= enemyInterval; enemyAttack(); }
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      if (!isSkillUnlocked(key) || !state.skills[key].auto || !state.combat.enemy) return;
      state.skills[key].remaining -= dt;
      if (state.skills[key].remaining <= 0) {
        castSkill(key);
        state.skills[key].remaining = meta.cooldown / Math.min(1.8, Math.sqrt(stats.speed / 100));
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
    const efficiency = .55 + Math.min(.25, (state.resources.comida || 0) / 5000);
    const cycle = region.baseHp / Math.max(1, stats.dps) + getSpawnDelay() / 1000;
    const kills = Math.max(1, Math.floor(capped / cycle * efficiency));
    const gold = Math.round(kills * region.gold * .94);
    const xp = Math.round(kills * region.xp * .94);
    state.resources.ouro += gold;
    state.lifetime.gold += gold;
    state.lifetime.enemies += kills;
    state.regionKills[state.regionIndex] += kills;
    gainXp(xp);
    const rewards = [{ name: "Ouro", amount: gold }, { name: "XP", amount: xp }, { name: "Vitórias", amount: kills }];
    Object.entries(region.drops).forEach(([key, chance]) => {
      const amount = Math.floor(kills * chance * randomBetween(.75, 1.15));
      if (amount > 0) {
        state.resources[key] += amount;
        state.lifetime.resources += amount;
        rewards.push({ name: RESOURCE_META[key].name, amount });
      }
    });
    if (showModal) {
      $("#offline-time").textContent = `Sua frota navegou por ${formatDuration(capped)} (limite de 24 horas).`;
      $("#offline-rewards").innerHTML = rewards.map(item => `<div><span>${item.name}</span><strong>+${formatNumber(item.amount)}</strong></div>`).join("");
      $("#offline-modal").classList.remove("hidden");
    }
    addLog(`Progresso idle recolhido após ${formatDuration(capped)}.`, "loot");
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours) return `${hours}h ${minutes}min`;
    return `${Math.max(1, minutes)}min`;
  }

  // Renderização da interface
  function resourceCostHtml(cost) {
    return Object.entries(cost).map(([key, amount]) => `<span class="cost-chip ${(state.resources[key] || 0) < amount ? "missing" : ""}">${RESOURCE_META[key].icon} ${formatNumber(amount)} ${RESOURCE_META[key].name}</span>`).join("");
  }

  function renderCombatHud() {
    const stats = getStats();
    const ship = SHIPS[state.shipId];
    const enemy = state.combat.enemy;
    const maxHp = stats.maxHp;
    state.combat.playerHp = clamp(state.combat.playerHp, 0, maxHp);
    $("#player-health-fill").style.width = `${state.combat.playerHp / maxHp * 100}%`;
    $("#player-health-text").textContent = `${formatNumber(state.combat.playerHp)} / ${formatNumber(maxHp)}`;
    $("#ship-name").textContent = ship.name;
    $("#ship-level-badge").textContent = `NV. ${state.levels.ship}`;
    if (enemy) {
      $("#enemy-name").textContent = enemy.name;
      $("#enemy-kind").textContent = enemy.kind;
      $("#enemy-level").textContent = enemy.isBoss ? "BOSS" : `NV. ${1 + state.regionIndex * 10}`;
      $("#enemy-health-fill").style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
      $("#enemy-health-text").textContent = `${formatNumber(enemy.hp)} / ${formatNumber(enemy.maxHp)}`;
    } else {
      $("#enemy-name").textContent = state.combat.running ? "Vasculhando o horizonte..." : "Nenhum alvo avistado";
      $("#enemy-kind").textContent = "ALTO-MAR";
      $("#enemy-level").textContent = "—";
      $("#enemy-health-fill").style.width = "0%";
      $("#enemy-health-text").textContent = "Aguardando inimigo";
    }
    const status = $("#combat-state");
    status.className = "combat-state";
    if (state.combat.repairing) { status.classList.add("repairing"); status.querySelector("strong").textContent = "REPARANDO NAVIO"; }
    else if (state.combat.running) { status.classList.add("running"); status.querySelector("strong").textContent = enemy?.isBoss ? "BOSS EM COMBATE" : "COMBATE AUTOMÁTICO"; }
    else status.querySelector("strong").textContent = "COMBATE PAUSADO";
  }

  function renderTopbar() {
    const bar = $("#top-resources");
    const entries = Object.entries(RESOURCE_META);
    if (bar.childElementCount !== entries.length) {
      bar.innerHTML = entries.map(([key, meta]) => `<div class="top-resource-chip" data-top-resource="${key}" title="${meta.name}: ${meta.uses}" style="--resource-color:${RARITY_COLORS[meta.rarityKey]}"><span class="resource-symbol">${meta.icon}</span><span class="top-resource-copy"><span class="top-resource-name">${meta.name}</span><strong class="top-resource-amount">${formatNumber(state.resources[key])}</strong></span></div>`).join("");
    } else {
      entries.forEach(([key]) => { const amount = $(`[data-top-resource="${key}"] .top-resource-amount`, bar); if (amount) amount.textContent = formatNumber(state.resources[key]); });
    }
    $("#top-level").textContent = state.pirateLevel;
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
    scene.drawShip(ctx, width * .5, height * .71, scale, false, ship.tier, false, ship.id, ship.type);
  }

  function renderHome() {
    const region = REGIONS[state.regionIndex];
    const stats = getStats();
    const kills = state.regionKills[state.regionIndex];
    $("#scene-region").textContent = region.name;
    $("#scene-weather").textContent = region.weather;
    $("#metric-damage").textContent = formatNumber(stats.damage);
    $("#metric-dps").textContent = formatNumber(stats.dps);
    $("#metric-speed").textContent = formatNumber(stats.speed);
    $("#metric-hp").textContent = formatNumber(stats.maxHp);
    $("#kill-progress-text").textContent = `${Math.min(100, kills)} / 100`;
    $("#boss-progress-fill").style.width = `${Math.min(100, kills)}%`;
    $("#boss-name").textContent = region.boss;
    const defeated = state.bossesDefeated[state.regionIndex];
    const available = kills >= 100 && !defeated;
    $("#progress-title").textContent = defeated ? "Região conquistada" : available ? "O boss emergiu!" : "O boss aguarda";
    $("#boss-status").textContent = defeated ? "Boss derrotado • continue farmando" : available ? "Desafio disponível agora" : `Faltam ${Math.max(0, 100 - kills)} vitórias`;
    $("#boss-button").disabled = !available || Boolean(state.combat.enemy?.isBoss);
    $("#boss-button").textContent = defeated ? "Boss derrotado" : state.combat.enemy?.isBoss ? "Em combate" : "Desafiar boss";
    $("#start-button").textContent = state.combat.running ? "▶ Em andamento" : state.hasStarted ? "▶ Continuar" : "▶ Iniciar";
    $("#start-button").disabled = state.combat.running;
    $("#pause-button").disabled = !state.combat.running;
    const needed = xpNeeded();
    $("#xp-text").textContent = `${formatNumber(state.xp)} / ${formatNumber(needed)} XP`;
    $("#pirate-level-text").textContent = `Nível ${state.pirateLevel}`;
    $("#xp-fill").style.width = `${state.xp / needed * 100}%`;
    $("#battle-log").innerHTML = state.logs.length ? state.logs.slice(0, 4).map(item => `<li class="${item.type}"><time>${item.time}</time>${item.message}</li>`).join("") : "<li>O mar está calmo. Inicie a jornada quando estiver pronto.</li>";
    renderSkillDock();
  }

  function renderSkillDock() {
    const dock = $("#skill-dock");
    if (dock.childElementCount === Object.keys(SKILL_META).length) {
      Object.keys(SKILL_META).forEach(key => {
        const node = $(`[data-skill-dock="${key}"]`, dock);
        node.classList.toggle("off", !state.skills[key].auto);
        node.classList.toggle("locked", !isSkillUnlocked(key));
        node.querySelector("small").textContent = isSkillUnlocked(key) ? `N${state.skills[key].level}` : `N${SKILL_META[key].unlock}`;
        node.title = isSkillUnlocked(key) ? `${SKILL_META[key].name} • auto ${state.skills[key].auto ? "ligado" : "desligado"}` : `Desbloqueia no nível ${SKILL_META[key].unlock}`;
      });
      return;
    }
    dock.innerHTML = Object.entries(SKILL_META).map(([key, meta]) => `<button class="skill-orb ${isSkillUnlocked(key) ? "" : "locked"}" data-skill-dock="${key}" title="${meta.name}"><span class="cooldown"></span><span class="icon">${meta.icon}</span><small>${isSkillUnlocked(key) ? `N${state.skills[key].level}` : `N${meta.unlock}`}</small></button>`).join("");
  }

  function updateSkillCooldowns() {
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      const node = $(`[data-skill-dock="${key}"]`);
      if (!node) return;
      const cooldown = meta.cooldown / Math.min(1.8, Math.sqrt(getStats().speed / 100));
      const ratio = isSkillUnlocked(key) && state.skills[key].auto ? clamp(state.skills[key].remaining / cooldown, 0, 1) : 1;
      node.querySelector(".cooldown").style.transform = `scaleY(${ratio})`;
    });
  }

  function renderUpgrades() {
    const ship = SHIPS[state.shipId];
    const stats = getStats();
    $("#naval-power").textContent = formatNumber(stats.power);
    $("#yard-ship-name").textContent = ship.name;
    $("#yard-ship-tier").textContent = `Tier ${ship.tier} • Embarcação ${ship.type.toLowerCase()}`;
    $("#yard-ship-stats").innerHTML = `<div><span>VIDA</span><strong>${formatNumber(stats.maxHp)}</strong></div><div><span>DANO</span><strong>${formatNumber(stats.damage)}</strong></div><div><span>VELOCIDADE</span><strong>${formatNumber(stats.speed)}</strong></div>`;
    renderShipPreview($("#yard-ship-canvas"), ship, true);
    const cards = [
      { key: "ship", name: "Convés e Estrutura", icon: "⛵", desc: "Eleva o nível geral do navio e melhora todos os atributos.", bonus: "+6% atributos" },
      { key: "cannons", name: "Canhões", icon: "☄", desc: "Mais dano, precisão e chance de acerto crítico.", bonus: "+13% dano" },
      { key: "sails", name: "Velas", icon: "◒", desc: "Acelera ataques, skills e a chegada de novos inimigos.", bonus: "+7,5% velocidade" },
      { key: "hull", name: "Casco", icon: "⬡", desc: "Aumenta a vida máxima, armadura e resistência do navio.", bonus: "+15% vida" }
    ];
    $("#upgrade-grid").innerHTML = cards.map(card => {
      const cost = getUpgradeCost(card.key);
      return `<article class="upgrade-card"><div class="upgrade-icon">${card.icon}</div><span class="level-label">NÍVEL ${state.levels[card.key]}</span><h3>${card.name}</h3><p>${card.desc}</p><div class="bonus-line"><span>Próximo nível</span><strong>${card.bonus}</strong></div><div class="cost-list">${resourceCostHtml(cost)}</div><button class="button primary" data-upgrade="${card.key}" ${canAfford(cost) ? "" : "disabled"}>Melhorar para nível ${state.levels[card.key] + 1}</button></article>`;
    }).join("");
    renderFleet(); renderEquipment(); renderSkills();
  }

  function renderFleet() {
    $("#fleet-grid").innerHTML = SHIPS.map(ship => {
      const owned = state.ownedShips.includes(ship.id);
      const current = state.shipId === ship.id;
      const requirementsMet = state.pirateLevel >= ship.levelReq && bossesCount() >= ship.bossReq;
      const button = current ? `<button class="button" disabled>Navio atual</button>` : owned ? `<button class="button primary" data-equip-ship="${ship.id}">Usar navio</button>` : requirementsMet ? `<button class="button" data-buy-ship="${ship.id}" ${canAfford(ship.costs) ? "" : "disabled"}>Construir</button>` : `<button class="button" disabled>Nível ${ship.levelReq} • ${ship.bossReq} bosses</button>`;
      return `<article class="ship-card ${owned ? "owned" : "locked"} ${current ? "current" : ""}"><div class="ship-tier">TIER ${ship.tier}</div><div class="ship-visual"><canvas data-ship-preview="${ship.id}" aria-label="Miniatura realista de ${ship.name}"></canvas></div><h3>${ship.name}</h3><p>${owned ? "Embarcação construída e pronta para navegar." : requirementsMet ? resourceCostHtml(ship.costs) : `Requer nível ${ship.levelReq} e ${ship.bossReq} bosses derrotados.`}</p><div class="ship-mini-stats"><span>❤ ${formatNumber(ship.hp)}</span><span>☄ ${formatNumber(ship.damage)}</span><span>» ${formatNumber(ship.speed)}</span></div>${button}</article>`;
    }).join("");
    $$('[data-ship-preview]', $("#fleet-grid")).forEach(canvas => renderShipPreview(canvas, SHIPS[Number(canvas.dataset.shipPreview)]));
  }

  function renderEquipment() {
    $("#equipment-grid").innerHTML = Object.entries(EQUIPMENT_META).map(([key, item]) => {
      const equipped = state.equipment[key];
      return `<article class="equipment-card ${equipped ? "equipped" : ""}"><div class="equipment-icon">${item.icon}</div><span class="level-label">${equipped ? "EQUIPADO" : "ARTEFATO"}</span><h3>${item.name}</h3><p>${item.effect}</p><div class="cost-list">${equipped ? "<span class=\"cost-chip\">Bônus ativo permanentemente</span>" : resourceCostHtml(item.costs)}</div><button class="button ${equipped ? "" : "primary"}" data-craft-equipment="${key}" ${equipped || !canAfford(item.costs) ? "disabled" : ""}>${equipped ? "Equipado" : "Forjar equipamento"}</button></article>`;
    }).join("");
  }

  function renderSkills() {
    $("#skills-grid").innerHTML = Object.entries(SKILL_META).map(([key, meta]) => {
      const unlocked = isSkillUnlocked(key);
      const skill = state.skills[key];
      const cost = getSkillCost(key);
      return `<article class="skill-card ${unlocked ? "" : "locked"}"><div class="skill-card-icon">${meta.icon}</div><div><span class="level-label">${unlocked ? `NÍVEL ${skill.level}` : `LIBERA NO NÍVEL ${meta.unlock}`}</span><h3>${meta.name}</h3><p>${meta.effect}</p></div><div class="skill-controls">${unlocked ? `<div class="auto-switch"><span>Lançamento automático</span><button class="toggle ${skill.auto ? "on" : ""}" data-toggle-skill="${key}" aria-label="Alternar lançamento automático"></button></div><div class="cost-list">${resourceCostHtml(cost)}</div><button class="button" data-upgrade-skill="${key}" ${canAfford(cost) ? "" : "disabled"}>Melhorar skill</button>` : `<div class="auto-switch"><span>Continue derrotando inimigos para desbloquear.</span></div>`}</div></article>`;
    }).join("");
  }

  function renderMaps() {
    $("#maps-unlocked").textContent = state.unlockedRegions;
    $("#maps-grid").innerHTML = REGIONS.map((region, index) => {
      const unlocked = index < state.unlockedRegions;
      const current = state.regionIndex === index;
      const tags = Object.keys(region.drops).map(key => `<span>${RESOURCE_META[key].name} • ${Math.round(region.drops[key] * 100)}%</span>`).join("");
      return `<article class="map-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}"><div class="map-visual" style="--map-sky:${region.sky};--map-sea:${region.sea};--map-land:${region.land}"><span class="map-number">REGIÃO ${String(index + 1).padStart(2, "0")}</span>${unlocked ? "" : "<div class=\"map-lock\">▣</div>"}</div><div class="map-body"><h3>${region.name}</h3><p>${region.description}</p><div class="map-tags">${tags}</div><div class="map-footer"><small>Boss: ${region.boss}<br>${state.bossesDefeated[index] ? "Derrotado" : `${Math.min(100, state.regionKills[index])}/100 inimigos`}</small><button class="button ${current ? "primary" : ""}" data-select-map="${index}" ${!unlocked || current ? "disabled" : ""}>${current ? "Navegando" : unlocked ? "Viajar" : "Bloqueado"}</button></div></div></article>`;
    }).join("");
  }

  function renderResources() {
    $("#cargo-total").textContent = formatNumber(Object.entries(state.resources).filter(([key]) => key !== "ouro").reduce((sum, [, value]) => sum + value, 0));
    $("#resources-grid").innerHTML = Object.entries(RESOURCE_META).map(([key, meta]) => `<article class="resource-card" style="--rarity-color:${RARITY_COLORS[meta.rarityKey]}"><div class="resource-header"><div class="resource-big-icon">${meta.icon}</div><div><h3>${meta.name}</h3><strong class="resource-amount">${formatNumber(state.resources[key])}</strong></div></div><span class="resource-rarity">${meta.rarity}</span><p class="resource-detail"><strong>Onde:</strong> ${meta.regions}</p><p class="resource-detail"><strong>Chance:</strong> ${meta.chance}</p><p class="resource-detail"><strong>Uso:</strong> ${meta.uses}</p></article>`).join("");
  }

  function renderStats() {
    const stats = getStats();
    const skillLevels = Object.values(state.skills).reduce((sum, item) => sum + item.level, 0);
    const rank = state.pirateLevel >= 50 ? "Lenda Abissal" : state.pirateLevel >= 30 ? "Almirante" : state.pirateLevel >= 15 ? "Capitão" : state.pirateLevel >= 5 ? "Corsário" : "Marujo";
    $("#captain-rank").textContent = rank;
    const list = items => items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    $("#combat-stats").innerHTML = list([
      ["Vida atual / máxima", `${formatNumber(state.combat.playerHp)} / ${formatNumber(stats.maxHp)}`], ["Dano", formatNumber(stats.damage)], ["DPS estimado", formatNumber(stats.dps)], ["Velocidade", formatNumber(stats.speed)], ["Armadura", formatNumber(stats.armor)], ["Precisão", `${Math.round(stats.precision * 100)}%`], ["Crítico", `${Math.round(stats.crit * 100)}%`], ["Evasão", `${Math.round(stats.evasion * 100)}%`]
    ]);
    $("#progression-stats").innerHTML = list([
      ["Navio atual", SHIPS[state.shipId].name], ["Nível do navio", state.levels.ship], ["Nível dos canhões", state.levels.cannons], ["Nível das velas", state.levels.sails], ["Nível do casco", state.levels.hull], ["Nível do pirata", state.pirateLevel], ["XP atual / necessária", `${formatNumber(state.xp)} / ${formatNumber(xpNeeded())}`], ["Skills / níveis somados", `${Object.keys(SKILL_META).filter(isSkillUnlocked).length} / ${skillLevels}`], ["Região atual", REGIONS[state.regionIndex].name]
    ]);
    $("#career-stats").innerHTML = [["Inimigos derrotados", state.lifetime.enemies], ["Bosses derrotados", state.lifetime.bosses], ["Recursos coletados", state.lifetime.resources], ["Ouro total", state.lifetime.gold], ["Maior dano", state.lifetime.highestDamage], ["Navios construídos", state.ownedShips.length], ["Regiões abertas", state.unlockedRegions], ["Tempo navegando", formatDuration(state.lifetime.playSeconds)]].map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : value}</strong></div>`).join("");
  }

  function renderAll(expensive = true) {
    renderTopbar(); renderHome(); renderCombatHud();
    if (expensive || currentScreen === "upgrades") renderUpgrades();
    if (expensive || currentScreen === "maps") renderMaps();
    if (expensive || currentScreen === "resources") renderResources();
    if (expensive || currentScreen === "stats") renderStats();
  }

  function upgrade(type) {
    const oldStats = getStats();
    const oldRatio = state.combat.playerHp / oldStats.maxHp;
    const cost = getUpgradeCost(type);
    if (!canAfford(cost)) return toast("Recursos insuficientes para essa melhoria.", "danger-toast");
    spend(cost); state.levels[type] += 1;
    const newStats = getStats();
    if (type === "hull" || type === "ship") state.combat.playerHp = Math.max(state.combat.playerHp, Math.round(newStats.maxHp * oldRatio));
    addLog(`${type === "ship" ? "Navio" : type === "cannons" ? "Canhões" : type === "sails" ? "Velas" : "Casco"} melhorado para o nível ${state.levels[type]}.`, "loot");
    toast("Melhoria concluída no estaleiro.");
    renderAll(true); saveGame();
  }

  function buyShip(id) {
    const ship = SHIPS[id];
    if (state.ownedShips.includes(id) || !canAfford(ship.costs) || state.pirateLevel < ship.levelReq || bossesCount() < ship.bossReq) return;
    spend(ship.costs); state.ownedShips.push(id); state.shipId = id; state.levels = { ship: 1, cannons: 1, sails: 1, hull: 1 }; state.combat.playerHp = getStats().maxHp;
    toast(`${ship.name} foi construído e equipado!`, "gold-toast"); addLog(`${ship.name} agora lidera sua frota.`, "loot"); renderAll(true); saveGame();
  }

  function equipShip(id) {
    if (!state.ownedShips.includes(id)) return;
    state.shipId = id; state.combat.playerHp = getStats().maxHp; state.combat.enemy = null; state.combat.spawnTimer = 0;
    toast(`${SHIPS[id].name} selecionado.`); renderAll(true); saveGame();
  }

  function craftEquipment(key) {
    const item = EQUIPMENT_META[key];
    if (!item || state.equipment[key] || !canAfford(item.costs)) return;
    spend(item.costs); state.equipment[key] = true; state.combat.playerHp = Math.min(getStats().maxHp, state.combat.playerHp);
    toast(`${item.name} forjado e equipado!`, "gold-toast"); addLog(`${item.name} agora fortalece o navio.`, "loot"); renderAll(true); saveGame();
  }

  function upgradeSkill(key) {
    if (!isSkillUnlocked(key)) return;
    const cost = getSkillCost(key); if (!canAfford(cost)) return;
    spend(cost); state.skills[key].level += 1; toast(`${SKILL_META[key].name} alcançou o nível ${state.skills[key].level}.`); renderAll(true); saveGame();
  }

  function toggleSkill(key) {
    if (!isSkillUnlocked(key)) return toast(`Essa skill libera no nível ${SKILL_META[key].unlock}.`);
    state.skills[key].auto = !state.skills[key].auto;
    if (state.skills[key].auto) state.skills[key].remaining = Math.min(state.skills[key].remaining, 1.2);
    toast(`${SKILL_META[key].name}: automático ${state.skills[key].auto ? "ligado" : "desligado"}.`); renderAll(false); saveGame();
  }

  function navigate(screen) {
    currentScreen = screen;
    $$(".screen").forEach(node => node.classList.toggle("active", node.id === `screen-${screen}`));
    $$('[data-screen-target]').forEach(node => node.classList.toggle("active", node.dataset.screenTarget === screen));
    if (screen === "upgrades") renderUpgrades();
    if (screen === "maps") renderMaps();
    if (screen === "resources") renderResources();
    if (screen === "stats") renderStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.screenTarget) navigate(target.dataset.screenTarget);
    if (target.dataset.upgradeTab) {
      activeUpgradeTab = target.dataset.upgradeTab;
      $$("[data-upgrade-tab]").forEach(node => node.classList.toggle("active", node.dataset.upgradeTab === activeUpgradeTab));
      $$(".upgrade-section").forEach(node => node.classList.toggle("active", node.id === `upgrade-${activeUpgradeTab}`));
    }
    if (target.dataset.upgrade) upgrade(target.dataset.upgrade);
    if (target.dataset.buyShip) buyShip(Number(target.dataset.buyShip));
    if (target.dataset.equipShip) equipShip(Number(target.dataset.equipShip));
    if (target.dataset.craftEquipment) craftEquipment(target.dataset.craftEquipment);
    if (target.dataset.upgradeSkill) upgradeSkill(target.dataset.upgradeSkill);
    if (target.dataset.toggleSkill) toggleSkill(target.dataset.toggleSkill);
    if (target.dataset.skillDock) toggleSkill(target.dataset.skillDock);
    if (target.dataset.selectMap) {
      const index = Number(target.dataset.selectMap);
      if (index < state.unlockedRegions) { state.regionIndex = index; state.combat.enemy = null; state.combat.spawnTimer = 0; toast(`Rota definida: ${REGIONS[index].name}.`); renderAll(true); saveGame(); navigate("home"); }
    }
  });

  $("#start-button").addEventListener("click", () => { state.combat.running = true; state.hasStarted = true; if (state.combat.playerHp <= 0) finishRepair(true); if (!state.combat.enemy) state.combat.spawnTimer = getSpawnDelay(); addLog("A frota iniciou a patrulha automática."); renderAll(false); });
  $("#pause-button").addEventListener("click", () => { state.combat.running = false; addLog("Combate pausado pelo capitão."); renderAll(false); saveGame(); });
  $("#reset-button").addEventListener("click", () => { resetShip(); renderAll(false); });
  $("#boss-button").addEventListener("click", () => { if (state.regionKills[state.regionIndex] >= 100 && !state.bossesDefeated[state.regionIndex]) { state.combat.running = true; state.hasStarted = true; state.combat.repairing = false; spawnEnemy(true); renderAll(false); } });
  $("#offline-close").addEventListener("click", () => $("#offline-modal").classList.add("hidden"));
  $("#wipe-button").addEventListener("click", () => $("#confirm-modal").classList.remove("hidden"));
  $("#confirm-cancel").addEventListener("click", () => $("#confirm-modal").classList.add("hidden"));
  $("#confirm-wipe").addEventListener("click", () => { localStorage.removeItem(SAVE_KEY); state = createDefaultState(); $("#confirm-modal").classList.add("hidden"); toast("Progresso apagado. Uma nova jornada começou."); renderAll(true); saveGame(); });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); saveGame(); }
    else if (hiddenAt) { const seconds = (Date.now() - hiddenAt) / 1000; hiddenAt = 0; applyOfflineProgress(seconds, seconds >= 30); renderAll(true); lastFrame = performance.now(); }
  });
  window.addEventListener("beforeunload", saveGame);

  const offlineSeconds = (Date.now() - Number(state.lastSeen || Date.now())) / 1000;
  if (offlineSeconds >= 30) applyOfflineProgress(offlineSeconds, true);
  state.combat.playerHp = clamp(state.combat.playerHp || getStats().maxHp, 1, getStats().maxHp);
  if (!state.logs.length) addLog("O Bote Armado está pronto para sua primeira patrulha.");
  renderAll(true);
  requestAnimationFrame(gameLoop);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(() => {});
})();
