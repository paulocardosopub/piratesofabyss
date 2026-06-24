(() => {
  "use strict";

  const SAVE_KEY = "pirates-of-the-abyss-save-v1";
  const OFFLINE_REWARD_RATE = .1;
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
    { name: "Costa dos Náufragos", weather: "Brisa costeira", description: "Mar calmo, naufrágios e saqueadores inexperientes.", boss: "Capitão Barba de Ferro", enemies: ["Saqueador da Costa", "Bote Renegado", "Pescador Hostil", "Corsário Perdido"], drops: { madeira: .28, ferro: .16, tecido: .22 }, baseHp: 86.4, baseDamage: 8.4, gold: 18, xp: 14, sky: "#78b9c1", sea: "#167087", land: "#5d8b58", kind: "PIRATA" },
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

  const SHIPS = [
    { name: "Bote Armado", type: "Pirata", tier: 1, levelReq: 1, hp: 140, damage: 18, speed: 103, armor: 2, costs: { ouro: 0, madeira: 0 } },
    { name: "Jangada Reforçada", type: "Civil", tier: 1, levelReq: 2, hp: 175, damage: 21, speed: 108, armor: 3, costs: { ouro: 150, madeira: 25 } },
    { name: "Barco de Pesca Adaptado", type: "Pescador", tier: 1, levelReq: 3, hp: 215, damage: 24, speed: 116, armor: 4, costs: { ouro: 300, madeira: 40, tecido: 15 } },
    { name: "Escuna Leve", type: "Pirata", tier: 1, levelReq: 3, hp: 270, damage: 31, speed: 132, armor: 5, costs: { ouro: 500, madeira: 50 } },
    { name: "Escuna Mercante", type: "Mercante", tier: 2, levelReq: 5, hp: 390, damage: 43, speed: 140, armor: 8, costs: { ouro: 1200, madeira: 120, tecido: 30 } },
    { name: "Cutter Real", type: "Marinha", tier: 2, levelReq: 7, hp: 530, damage: 59, speed: 158, armor: 12, costs: { ouro: 2400, madeira: 190, ferro: 55, tecido: 45 } },
    { name: "Brigantina Pequena", type: "Pirata", tier: 2, levelReq: 9, hp: 720, damage: 80, speed: 150, armor: 15, costs: { ouro: 3800, madeira: 300, ferro: 90, polvora: 35 } },
    { name: "Corveta Simples", type: "Marinha", tier: 2, levelReq: 12, hp: 990, damage: 105, speed: 162, armor: 19, costs: { ouro: 6500, madeira: 520, ferro: 160, tecido: 80 } },
    { name: "Brigantina Pirata", type: "Pirata", tier: 3, levelReq: 15, hp: 1500, damage: 160, speed: 172, armor: 24, costs: { ouro: 12000, madeira: 750, ferro: 260, polvora: 100 } },
    { name: "Corveta Armada", type: "Marinha", tier: 3, levelReq: 18, hp: 2250, damage: 230, speed: 178, armor: 31, costs: { ouro: 22000, madeira: 1100, ferro: 500, polvora: 180 } },
    { name: "Galeota", type: "Corsário", tier: 3, levelReq: 20, hp: 3100, damage: 310, speed: 185, armor: 38, costs: { ouro: 32000, madeira: 1500, ferro: 650, tecido: 240, pedra: 90 } },
    { name: "Navio Mercante Armado", type: "Mercante", tier: 3, levelReq: 22, hp: 4300, damage: 390, speed: 176, armor: 46, costs: { ouro: 40000, madeira: 1800, ferro: 750, tecido: 350, comida: 250 } },
    { name: "Galeão Mercante", type: "Mercante", tier: 4, levelReq: 23, hp: 6100, damage: 520, speed: 180, armor: 57, costs: { ouro: 45000, madeira: 1900, ferro: 850, tecido: 450, perola: 25 } },
    { name: "Galeão Pirata", type: "Pirata", tier: 4, levelReq: 24, hp: 7800, damage: 680, speed: 187, armor: 64, costs: { ouro: 48000, madeira: 1950, ferro: 950, polvora: 280 } },
    { name: "Fragata Real", type: "Marinha", tier: 4, levelReq: 25, hp: 10500, damage: 890, speed: 202, armor: 78, costs: { ouro: 85000, madeira: 2600, ferro: 1400, polvora: 450, cristal: 40 } },
    { name: "Fragata Corsária", type: "Corsário", tier: 4, levelReq: 30, hp: 13900, damage: 1190, speed: 214, armor: 88, costs: { ouro: 140000, madeira: 3200, ferro: 1800, polvora: 650, cristal: 65, perola: 40 } },
    { name: "Galeão de Guerra", type: "Pirata", tier: 5, levelReq: 25, hp: 18500, damage: 1580, speed: 205, armor: 105, costs: { ouro: 50000, madeira: 2000, ferro: 1000, polvora: 300 } },
    { name: "Encouraçado Imperial", type: "Marinha", tier: 5, levelReq: 50, hp: 29500, damage: 2400, speed: 218, armor: 145, costs: { ouro: 300000, madeira: 4000, ferro: 2500, polvora: 1200, pedra: 400, cristal: 100 } },
    { name: "Fragata Fantasma", type: "Espectral", tier: 5, levelReq: 65, hp: 44000, damage: 3600, speed: 245, armor: 170, costs: { ouro: 600000, madeira: 4500, ferro: 2500, ambar: 150, perola: 150, gema: 50 } },
    { name: "Kraken Hunter", type: "Caçador", tier: 5, levelReq: 72, hp: 57000, damage: 4700, speed: 238, armor: 205, costs: { ouro: 800000, madeira: 4800, ferro: 2800, polvora: 1600, cristal: 180, gema: 75, fragmentos: 15 } },
    { name: "Black Abyss", type: "Espectral", tier: 5, levelReq: 80, hp: 78000, damage: 6500, speed: 260, armor: 250, costs: { ouro: 1000000, madeira: 5000, ferro: 3000, polvora: 2000, cristal: 250, gema: 100, fragmentos: 25 } }
  ].map((ship, id) => ({ id, bossReq: 0, ...ship }));

  const ENEMY_CATEGORIES = {
    PESCADOR: { label: "PESCADOR", visual: "PESCADOR", hp: .66, damage: .48, armor: .45, gold: .72, xp: .78, attackSpeed: 1.12, evasion: .01, drops: { comida: .34, tecido: .18, madeira: .22 } },
    MERCANTE: { label: "COMERCIANTE", visual: "MERCANTE", hp: 1.08, damage: .62, armor: .9, gold: 1.65, xp: .95, attackSpeed: 1.08, evasion: .02, drops: { comida: .22, tecido: .2, madeira: .18 } },
    CONTRABANDISTA: { label: "CONTRABANDISTA", visual: "CONTRABANDISTA", hp: .9, damage: 1.05, armor: .75, gold: 1.2, xp: 1.12, attackSpeed: .76, evasion: .12, drops: { polvora: .22, ferro: .18, cristal: .025 } },
    PIRATA: { label: "PIRATA", visual: "PIRATA", hp: .94, damage: 1.22, armor: .72, gold: 1.05, xp: 1.08, attackSpeed: .9, evasion: .055, drops: {} },
    MARINHA: { label: "MARINHA", visual: "MARINHA", hp: 1.42, damage: 1.02, armor: 1.65, gold: 1.35, xp: 1.28, attackSpeed: 1.08, evasion: .025, drops: { ferro: .24 } },
    FANTASMA: { label: "NAVIO FANTASMA", visual: "FANTASMA", hp: 1.18, damage: 1.28, armor: 1.1, gold: 1.45, xp: 1.42, attackSpeed: .88, evasion: .1, drops: { ambar: .08, cristal: .08 } },
    CRIATURA: { label: "CRIATURA MARÍTIMA", visual: "ABISSAL", hp: 1.3, damage: 1.36, armor: 1.2, gold: 1.25, xp: 1.5, attackSpeed: .92, evasion: .06, drops: { perola: .1, cristal: .05 } }
  };

  const REGION_ENCOUNTERS = [
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

  const SKILL_META = {
    fire: { name: "Canhão de Fogo", icon: "🔥", unlock: 5, cooldown: 8, factor: 1.8, burnDuration: 4, burnFactor: .22, effect: "1,8× de dano e incêndio por 4s.", materials: ["polvora", "ferro"] },
    ice: { name: "Canhão de Gelo", icon: "❄", unlock: 10, cooldown: 11, factor: 2.4, slowDuration: 5, effect: "2,4× de dano e ataque inimigo mais lento por 5s.", materials: ["cristal", "tecido"] },
    ghost: { name: "Canhão Fantasma", icon: "👻", unlock: 20, cooldown: 14, factor: 3.4, effect: "3,4× de dano espectral que ignora toda a armadura.", materials: ["ambar", "cristal"] },
    chain: { name: "Bolas de Corrente", icon: "⛓", unlock: 30, cooldown: 10, factor: 4.4, attackDelay: 2500, effect: "4,4× de dano e atrasa o próximo ataque em 2,5s.", materials: ["ferro", "perola"] }
  };

  const EQUIPMENT_META = {
    compass: { name: "Bússola Naval", icon: "✥", effect: "+12% velocidade e +8% chance de loot", costs: { cristal: 20, perola: 5, ouro: 5000 } },
    spyglass: { name: "Luneta Imperial", icon: "⌕", effect: "+8% precisão e +7% crítico", costs: { cristal: 30, gema: 10, ouro: 10000 } },
    anchor: { name: "Âncora Reforçada", icon: "⚓", effect: "+20 armadura e +10% de vida", costs: { ferro: 100, pedra: 20, ouro: 5000 } },
    amulet: { name: "Amuleto do Abismo", icon: "☠", effect: "+25% DPS e +20% contra bosses", costs: { ambar: 20, perola: 10, fragmentos: 5, ouro: 50000 } }
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

  const PETS = [
    { name: "Peixe-palhaço", icon: "🐠", type: "Pet inicial", rarity: "Comum", rarityKey: "common", damage: 5, interval: 2, power: 30, levelReq: 1, costs: { ouro: 500, comida: 20 }, description: "Pequeno, ligeiro e sempre perto do casco.", color: "#ff9c45", visual: "fish" },
    { name: "Água-viva", icon: "🪼", type: "Aquático mágico", rarity: "Incomum", rarityKey: "uncommon", damage: 8, interval: 2.2, power: 48, levelReq: 3, costs: { ouro: 1200, comida: 40 }, description: "Flutua com um brilho azul e lança bolhas elétricas.", color: "#75dcff", visual: "jelly" },
    { name: "Tartaruga Marinha", icon: "🐢", type: "Defensivo", rarity: "Incomum", rarityKey: "uncommon", damage: 12, interval: 2.5, power: 72, levelReq: 5, costs: { ouro: 2500, comida: 75, madeira: 25 }, description: "Casco resistente que concede +3% de defesa.", bonus: "+3% defesa do navio", defenseBonus: .03, color: "#67d997", visual: "turtle" },
    { name: "Foca", icon: "🦭", type: "Ágil", rarity: "Incomum", rarityKey: "uncommon", damage: 18, interval: 2, power: 105, levelReq: 8, costs: { ouro: 5000, comida: 120 }, description: "Emerge em saltos rápidos para atingir o alvo.", color: "#b9d5dc", visual: "seal" },
    { name: "Golfinho", icon: "🐬", type: "Veloz", rarity: "Raro", rarityKey: "rare", damage: 30, interval: 1.7, power: 170, levelReq: 12, costs: { ouro: 12000, comida: 250, perola: 5 }, description: "Nado elegante que concede +3% de velocidade.", bonus: "+3% velocidade do navio", speedBonus: .03, color: "#5ab9ed", visual: "dolphin" },
    { name: "Arraia Elétrica", icon: "⚡", type: "Controle", rarity: "Raro", rarityKey: "rare", damage: 42, interval: 2.3, power: 230, levelReq: 16, costs: { ouro: 20000, comida: 350, cristal: 10 }, description: "Descargas aquáticas podem desacelerar o inimigo.", bonus: "15% de chance de lentidão", slowChance: .15, color: "#57ddff", visual: "ray" },
    { name: "Tubarão", icon: "🦈", type: "Ofensivo", rarity: "Épico", rarityKey: "epic", damage: 75, interval: 2, power: 350, levelReq: 25, costs: { ouro: 50000, comida: 700, gema: 10 }, description: "Uma mordida brutal acompanhada por forte splash.", color: "#92aebb", visual: "shark" },
    { name: "Baleia Assassina", icon: "🐋", type: "Pesado", rarity: "Épico", rarityKey: "epic", damage: 120, interval: 2.7, power: 520, levelReq: 35, costs: { ouro: 100000, comida: 1200, gema: 15, perola: 10 }, description: "Orca imponente que concede +4% de vida máxima.", bonus: "+4% vida máxima", hpBonus: .04, color: "#e4f1f0", visual: "orca" },
    { name: "Megalodon", icon: "🦈", type: "Lendário ofensivo", rarity: "Lendário", rarityKey: "legendary", damage: 250, interval: 2.5, power: 1100, levelReq: 55, regionReq: 5, costs: { ouro: 500000, comida: 2500, gema: 50, perola: 25, fragmentos: 10 }, description: "Predador pré-histórico do Oceano Profundo.", bonus: "+3% DPS do navio", dpsBonus: .03, color: "#ffb349", visual: "megalodon" },
    { name: "Kraken", icon: "🐙", type: "Mítico", rarity: "Mítico", rarityKey: "legendary", damage: 500, interval: 3, power: 3500, levelReq: 75, regionReq: 10, bossReq: 9, costs: { ouro: 1500000, comida: 5000, gema: 100, ambar: 50, fragmentos: 25 }, description: "Tentáculos lendários com +15% de dano contra bosses.", bonus: "+15% contra bosses", bossBonus: .15, color: "#c485ff", visual: "kraken" }
  ].map((pet, id) => ({ id, dps: pet.damage / pet.interval, ...pet }));

  function createDefaultState() {
    return {
      version: 3,
      resources: { ouro: 1200, madeira: 90, ferro: 55, tecido: 45, comida: 22, polvora: 28, pedra: 0, cristal: 0, perola: 0, gema: 0, ambar: 0, fragmentos: 0 },
      pirateLevel: 1,
      xp: 0,
      regionIndex: 0,
      unlockedRegions: 1,
      regionKills: Array(10).fill(0),
      bossesDefeated: Array(10).fill(false),
      shipId: 0,
      ownedShips: [0],
      ownedPets: [],
      equippedPetId: null,
      levels: { ship: 1, cannons: 1, sails: 1, hull: 1 },
      equipment: { compass: false, spyglass: false, anchor: false, amulet: false },
      skills: {
        fire: { level: 1, auto: true, remaining: 1.5 },
        ice: { level: 1, auto: true, remaining: 4 },
        ghost: { level: 1, auto: true, remaining: 6 },
        chain: { level: 1, auto: true, remaining: 8 }
      },
      lifetime: { enemies: 0, bosses: 0, resources: 0, gold: 0, highestDamage: 0, playSeconds: 0, petsBought: 0, petAttacks: 0, petKills: 0, bossesWithPet: 0 },
      combat: { running: false, repairing: false, repairStarted: 0, playerHp: 140, enemy: null, attackTimer: 0, petAttackTimer: 0, enemyAttackTimer: 0, spawnTimer: 0 },
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
      const previousVersion = Number(saved.version || 1);
      const migratedOwned = Array.isArray(saved.ownedShips) ? saved.ownedShips.map(id => previousVersion < 2 && Number(id) === 19 ? 20 : Number(id)) : [0];
      merged.ownedShips = [...new Set([0, ...migratedOwned])].filter(id => Number.isInteger(id) && id >= 0 && id < SHIPS.length);
      merged.shipId = previousVersion < 2 && Number(saved.shipId) === 19 ? 20 : Number(saved.shipId || 0);
      if (!merged.ownedShips.includes(merged.shipId) || !SHIPS[merged.shipId]) merged.shipId = 0;
      merged.ownedPets = [...new Set((saved.ownedPets || []).map(Number))].filter(id => Number.isInteger(id) && PETS[id]);
      merged.equippedPetId = saved.equippedPetId === null || saved.equippedPetId === undefined ? null : Number(saved.equippedPetId);
      if (!merged.ownedPets.includes(merged.equippedPetId) || !PETS[merged.equippedPetId]) merged.equippedPetId = null;
      merged.version = 3;
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
  const tradeQuantities = Object.fromEntries(Object.keys(TRADE_PRICES).map(key => [key, 1]));
  let pendingTrade = null;

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
  function getEquippedPet() { return state.equippedPetId === null ? null : PETS[state.equippedPetId] || null; }
  function isPetUnlocked(pet) {
    return state.pirateLevel >= pet.levelReq && (!pet.regionReq || state.unlockedRegions >= pet.regionReq) && (pet.bossReq === undefined || state.bossesDefeated[pet.bossReq]);
  }

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
    const pet = getEquippedPet();
    if (pet?.speedBonus) speed *= 1 + pet.speedBonus;
    if (pet?.hpBonus) maxHp *= 1 + pet.hpBonus;
    if (pet?.defenseBonus) armor *= 1 + pet.defenseBonus;
    const attackInterval = Math.max(190, 100000 / speed);
    const basicDps = damage / (attackInterval / 1000) * precision * (1 + crit);
    let skillDps = 0;
    Object.entries(SKILL_META).forEach(([key, meta]) => {
      if (!isSkillUnlocked(key) || !state.skills[key].auto) return;
      const level = state.skills[key].level;
      const effectiveCooldown = meta.cooldown / Math.min(1.8, Math.sqrt(speed / 100));
      skillDps += damage * (meta.factor + (level - 1) * .24) / effectiveCooldown;
      if (key === "fire") skillDps += damage * (meta.burnFactor + (level - 1) * .04) * meta.burnDuration / effectiveCooldown;
    });
    const shipDps = basicDps;
    const boostedSkillDps = skillDps;
    const petDps = pet?.dps || 0;
    const navalDps = (shipDps + boostedSkillDps) * (1 + (pet?.dpsBonus || 0));
    return {
      damage: Math.round(damage), speed: Math.round(speed), maxHp: Math.round(maxHp), armor: Math.round(armor),
      precision, crit, evasion: Math.min(.3, .03 + speed / 5000), attackInterval,
      shipDps: Math.round(shipDps), skillDps: Math.round(boostedSkillDps), petDps: Math.round(petDps),
      dps: Math.round(navalDps + petDps), power: Math.round(navalDps * 4 + maxHp * .35 + armor * 8 + (pet?.power || 0))
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
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.logs.unshift({ message, type, time });
    state.logs = state.logs.slice(0, 100);
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
      this.aquaticBursts = [];
      this.floaters = [];
      this.lootFloaters = [];
      this.environmentEvents = [];
      this.environmentTimers = { bird: 2.5, fish: 3.5, shark: 19, kraken: 72 };
      this.resize = this.resize.bind(this);
      this.handleEnvironmentPointer = this.handleEnvironmentPointer.bind(this);
      new ResizeObserver(this.resize).observe(canvas);
      canvas.addEventListener("pointerdown", this.handleEnvironmentPointer);
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

    petStrike(pet) {
      this.aquaticBursts.push({ x: this.width * .69, y: this.height * .54, age: 0, color: pet.color, kind: pet.visual });
    }

    floatDamage(amount, atEnemy = true, color = "#fff0bc") {
      this.floaters.push({ text: amount, x: this.width * (atEnemy ? .70 : .30) + randomBetween(-25, 25), y: this.height * (atEnemy ? .47 : .60), age: 0, color });
    }

    handleEnvironmentPointer(pointer) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (pointer.clientX - rect.left) * (this.width / Math.max(1, rect.width));
      const y = (pointer.clientY - rect.top) * (this.height / Math.max(1, rect.height));
      const event = [...this.environmentEvents].reverse().find(item => {
        if (item.collected || !item.hitbox) return false;
        const box = item.hitbox;
        const margin = pointer.pointerType === "touch" ? 14 : 7;
        return x >= box.x - margin && x <= box.x + box.width + margin && y >= box.y - margin && y <= box.y + box.height + margin;
      });
      if (!event) return;
      if (pointer.cancelable) pointer.preventDefault();
      const reward = ENVIRONMENT_LOOT[event.kind];
      event.collected = true;
      event.age = event.duration;
      const burstX = event.screenX ?? x;
      const burstY = event.screenY ?? y;
      this.bursts.push({ x: burstX, y: burstY, age: 0, color: reward.color });
      this.lootFloaters.push({ text: `+${reward.food} Comida`, x: burstX, y: burstY, age: 0, color: reward.color });
      state.resources.comida += reward.food;
      state.lifetime.resources += reward.food;
      addLog(`${reward.name} capturado: +${reward.food} Comida.`, "loot");
      toast(`+${reward.food} Comida • ${reward.name}`, "gold-toast");
      renderAll(false);
      saveGame();
    }

    update(dt) {
      this.time += dt;
      this.projectiles.forEach(item => item.age += dt);
      this.bursts.forEach(item => item.age += dt);
      this.aquaticBursts.forEach(item => item.age += dt);
      this.floaters.forEach(item => item.age += dt);
      this.lootFloaters.forEach(item => item.age += dt);
      this.environmentEvents.forEach(item => item.age += dt);
      this.projectiles = this.projectiles.filter(item => item.age < item.duration);
      this.bursts = this.bursts.filter(item => item.age < .75);
      this.aquaticBursts = this.aquaticBursts.filter(item => item.age < .9);
      this.floaters = this.floaters.filter(item => item.age < 1.05);
      this.lootFloaters = this.lootFloaters.filter(item => item.age < 1.35);
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
      this.environmentEvents.push({
        kind, direction, age: 0, duration: durations[kind],
        depth: kind === "bird" ? randomBetween(.18, .72) : kind === "kraken" ? randomBetween(.06, .14) : kind === "shark" ? randomBetween(.78, .9) : randomBetween(.52, .88),
        offset: Math.random(), scale: randomBetween(.75, 1.25), side: Math.random() < .5 ? .1 : .9
      });
    }

    getDayState() {
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

    draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const region = REGIONS[state.regionIndex];
      const horizon = h * .42;
      const day = this.getDayState();
      ctx.clearRect(0, 0, w, h);

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
      if (!celestialNight && day.cycle < .58) this.drawSunPath(ctx, sunX, horizon, h);
      this.drawWaves(ctx, horizon, w, h);
      this.drawEnvironmentEvents(ctx, horizon, w, h);

      this.drawIsland(ctx, -w * .035, horizon + 8, w * .31, region.land, 1.18, 0);
      this.drawIsland(ctx, w * .73, horizon + 3, w * .29, region.land, .94, 1);
      this.drawIsland(ctx, w * .43, horizon - 3, w * .11, region.land, .48, 2);
      if (state.regionIndex === 6) this.drawFort(ctx, w * .82, horizon - 22);

      if (state.regionIndex === 2) this.drawRain(ctx, w, h);
      if (state.regionIndex === 8) this.drawSnow(ctx, w, h);
      if (state.regionIndex === 5) this.drawFog(ctx, w, h);

      const bobPlayer = Math.sin(this.time * 1.55) * 3;
      const bobEnemy = Math.sin(this.time * 1.35 + 1.4) * 3;
      this.drawShip(ctx, w * .29, h * .66 + bobPlayer, Math.min(1.15, w / 950), false, SHIPS[state.shipId].tier, false, state.shipId, SHIPS[state.shipId].type);
      const pet = getEquippedPet();
      if (pet) this.drawPet(ctx, w * .18, h * .76 + Math.sin(this.time * 2 + pet.id) * 4, pet, Math.min(1.1, w / 850));
      const enemy = state.combat.enemy;
      if (enemy) this.drawShip(ctx, w * .71, h * .52 + bobEnemy, Math.min(1.02, w / 1050), true, enemy.isBoss ? 5 : enemy.visualTier, enemy.isBoss, state.regionIndex + 20, enemy.visualKind || enemy.kind);

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
    }

    mix(a, b, amount) {
      const parse = hex => hex.match(/\w\w/g).map(v => parseInt(v, 16));
      const ca = parse(a), cb = parse(b);
      return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * amount)).join(",")})`;
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

    drawPet(ctx, x, y, pet, baseScale = 1) {
      const size = [0.48, 0.55, 0.68, 0.7, 0.82, 0.9, 1, 1.18, 1.38, 1.55][pet.id] * baseScale;
      const jump = pet.visual === "dolphin" || pet.visual === "seal" ? Math.max(0, Math.sin(this.time * 1.25 + pet.id)) * 15 : 0;
      ctx.save(); ctx.translate(x, y - jump); ctx.scale(size, size);
      ctx.globalAlpha = .18; ctx.fillStyle = "#dffcff"; ctx.beginPath(); ctx.ellipse(0, 17 + jump, 44, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
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
    drawFort(ctx, x, y) { ctx.fillStyle = "#6b6d67"; ctx.fillRect(x, y - 22, 65, 28); for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 18, y - 30, 12, 12); }
  }

  const scene = new SeaScene($("#sea-canvas"));

  function pickEncounter(roster) {
    const totalWeight = roster.reduce((sum, encounter) => sum + (encounter.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const encounter of roster) {
      roll -= encounter.weight || 1;
      if (roll < 0) return encounter;
    }
    return roster[roster.length - 1];
  }

  function spawnEnemy(isBoss = false) {
    const region = REGIONS[state.regionIndex];
    const variation = randomBetween(.9, 1.14);
    const roster = REGION_ENCOUNTERS[state.regionIndex] || [];
    const encounter = isBoss ? null : pickEncounter(roster);
    const profile = isBoss ? null : ENEMY_CATEGORIES[encounter.category];
    const hp = Math.round(region.baseHp * variation * (isBoss ? 34 : profile.hp));
    state.combat.enemy = {
      name: isBoss ? region.boss : encounter.name,
      kind: isBoss ? "BOSS" : profile.label,
      category: isBoss ? "BOSS" : encounter.category,
      visualKind: isBoss ? region.kind : profile.visual,
      visualTier: isBoss ? 5 : encounter.tier,
      isBoss,
      maxHp: hp,
      hp,
      damage: Math.round(region.baseDamage * variation * (isBoss ? 3.5 : profile.damage)),
      armor: isBoss ? 22 + state.regionIndex * 9 : Math.round((2 + state.regionIndex * 5) * profile.armor),
      evasion: isBoss ? .035 : profile.evasion,
      attackSpeed: isBoss ? .82 : profile.attackSpeed,
      goldMultiplier: isBoss ? 1 : profile.gold,
      xpMultiplier: isBoss ? 1 : profile.xp,
      bonusDrops: isBoss ? {} : profile.drops,
      burnTime: 0,
      burnDps: 0,
      slowed: 0,
      defeated: false
    };
    state.combat.attackTimer = 0;
    state.combat.petAttackTimer = 0;
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
    if (options.pet) {
      scene.petStrike(options.pet);
      setTimeout(() => scene.floatDamage(damage, true, options.color || "#bff7ff"), 180);
    } else {
      scene.fire(true, options.color || "#ffd37a");
      setTimeout(() => { scene.burst(true, options.color || "#f4a34c"); scene.floatDamage(damage, true, options.color || "#fff0bc"); }, 340);
    }
    if (enemy.hp <= 0) defeatEnemy();
  }

  function basicAttack() {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const stats = getStats();
    const hitChance = stats.precision * (1 - (enemy.evasion || 0));
    if (Math.random() > hitChance) { scene.fire(true, "#cbd6d0"); addLog(enemy.evasion > .08 ? `${enemy.name} escapou com uma manobra veloz.` : "O disparo passou longe do alvo."); return; }
    const critical = Math.random() < stats.crit;
    const raw = stats.damage * randomBetween(.91, 1.09) * (critical ? 2 : 1) * (1 + (getEquippedPet()?.dpsBonus || 0));
    dealToEnemy(raw, { color: critical ? "#ffe268" : "#ffd37a" });
    if (critical) addLog(`Acerto crítico de ${formatNumber(raw)}!`, "loot");
  }

  function castSkill(key) {
    const enemy = state.combat.enemy;
    if (!enemy || enemy.defeated) return;
    const meta = SKILL_META[key];
    const level = state.skills[key].level;
    const base = getStats().damage * (meta.factor + (level - 1) * .24) * (1 + (getEquippedPet()?.dpsBonus || 0));
    if (key === "fire") { dealToEnemy(base, { color: "#ff6d3a" }); enemy.burnTime = meta.burnDuration; enemy.burnDps = getStats().damage * (meta.burnFactor + (level - 1) * .04); }
    if (key === "ice") { dealToEnemy(base, { color: "#81e8ff" }); enemy.slowed = meta.slowDuration + (level - 1) * .2; }
    if (key === "ghost") dealToEnemy(base, { color: "#c58cff", ignoreArmor: true });
    if (key === "chain") { dealToEnemy(base, { color: "#d9e4df" }); state.combat.enemyAttackTimer = Math.max(0, state.combat.enemyAttackTimer - meta.attackDelay); }
    addLog(`${meta.name} disparado automaticamente.`, "loot");
  }

  function petAttack() {
    const enemy = state.combat.enemy;
    const pet = getEquippedPet();
    if (!enemy || enemy.defeated || !pet) return;
    const bossMultiplier = enemy.isBoss ? 1 + (pet.bossBonus || 0) : 1;
    dealToEnemy(pet.damage * randomBetween(.94, 1.06) * bossMultiplier, { pet, color: pet.color });
    state.lifetime.petAttacks += 1;
    if (pet.slowChance && Math.random() < pet.slowChance && state.combat.enemy) {
      state.combat.enemy.slowed = Math.max(state.combat.enemy.slowed, 2.5);
      addLog(`${pet.name} eletrizou a água e desacelerou o inimigo.`, "loot");
    }
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

  function rewardMaterials(multiplier = 1, enemy = state.combat.enemy) {
    const region = REGIONS[state.regionIndex];
    const lootBonus = state.equipment.compass ? 1.08 : 1;
    const found = [];
    const dropKeys = new Set([...Object.keys(region.drops), ...Object.keys(enemy?.bonusDrops || {})]);
    dropKeys.forEach(key => {
      const chance = Math.min(.88, (region.drops[key] || 0) + (enemy?.bonusDrops?.[key] || 0));
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
    if (getEquippedPet()) state.lifetime.petKills += 1;
    if (enemy.isBoss) {
      const reward = Math.round(region.gold * 45);
      state.resources.ouro += reward;
      state.lifetime.gold += reward;
      state.lifetime.bosses += 1;
      if (getEquippedPet()) state.lifetime.bossesWithPet += 1;
      state.bossesDefeated[state.regionIndex] = true;
      gainXp(region.xp * 35);
      const materials = rewardMaterials(8, enemy);
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
      const gold = Math.round(region.gold * (enemy.goldMultiplier || 1) * randomBetween(.88, 1.15));
      state.resources.ouro += gold;
      state.lifetime.gold += gold;
      state.lifetime.enemies += 1;
      state.regionKills[state.regionIndex] += 1;
      gainXp(Math.round(region.xp * (enemy.xpMultiplier || 1) * randomBetween(.92, 1.08)));
      const materials = rewardMaterials(1, enemy);
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
    state.combat.petAttackTimer = 0;
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
    const pet = getEquippedPet();
    if (pet) {
      state.combat.petAttackTimer += dt * 1000;
      let petStrikes = 0;
      while (state.combat.petAttackTimer >= pet.interval * 1000 && petStrikes < 3 && state.combat.enemy) { state.combat.petAttackTimer -= pet.interval * 1000; petAttack(); petStrikes++; }
    }
    if (!state.combat.enemy) return;
    const enemyInterval = (state.combat.enemy.isBoss ? 1450 : 1900) * (enemy.attackSpeed || 1) * (enemy.slowed > 0 ? 1.65 : 1);
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
    const kills = Math.max(1, Math.floor(capped / cycle * efficiency * OFFLINE_REWARD_RATE));
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
      $("#offline-time").textContent = `Sua frota navegou por ${formatDuration(capped)} (limite de 24 horas). Eficiência offline: 10% do combate ativo.`;
      $("#offline-rewards").innerHTML = rewards.map(item => `<div><span>${item.name}</span><strong>+${formatNumber(item.amount)}</strong></div>`).join("");
      $("#offline-modal").classList.remove("hidden");
    }
    addLog(`Progresso idle recolhido após ${formatDuration(capped)} com 10% de eficiência.`, "loot");
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
    $("#scene-weather").textContent = `${REGIONS[state.regionIndex].weather} • ${scene.getDayState().label}`;
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
    $("#top-naval-power").textContent = formatNumber(getStats().power);
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
    $("#battle-log").innerHTML = state.logs.length ? state.logs.map(item => `<li class="${item.type}"><time>${item.time}</time>${item.message}</li>`).join("") : "<li>O mar está calmo. Inicie a jornada quando estiver pronto.</li>";
    const pet = getEquippedPet();
    $("#home-pet-icon").textContent = pet?.icon || "🐾";
    $("#home-pet-name").textContent = pet?.name || "Nenhum pet equipado";
    $("#home-pet-card").classList.toggle("equipped", Boolean(pet));
    $("#home-pet-stats").innerHTML = pet ? `<span>DANO <strong>${formatNumber(pet.damage)}</strong></span><span>DPS <strong>${pet.dps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong></span><span>ATAQUE <strong>${pet.interval.toLocaleString("pt-BR")}s</strong></span>` : "Escolha um companheiro para ajudar no combate.";
    renderSkillDock();
  }

  function getPetIssues(pet) {
    const issues = [];
    if (state.pirateLevel < pet.levelReq) issues.push(`Nível ${pet.levelReq} do pirata`);
    if (pet.regionReq && state.unlockedRegions < pet.regionReq) issues.push(pet.id === 8 ? "Oceano Profundo desbloqueado" : "Abismo do Kraken desbloqueado");
    if (pet.bossReq !== undefined && !state.bossesDefeated[pet.bossReq]) issues.push("Kraken Primordial derrotado");
    return issues;
  }

  function renderPets() {
    const current = getEquippedPet();
    $("#pets-owned-count").textContent = `${state.ownedPets.length} / ${PETS.length}`;
    $("#pet-current-banner").innerHTML = current ? `<div class="pet-current-icon">${current.icon}</div><div><span class="eyebrow">PET EQUIPADO</span><h2>${current.name}</h2><p>${current.description}</p></div><div class="pet-current-stats"><span>Dano <strong>${formatNumber(current.damage)}</strong></span><span>DPS <strong>${current.dps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong></span><span>Poder <strong>+${formatNumber(current.power)}</strong></span></div>` : `<div class="pet-current-icon">🐾</div><div><span class="eyebrow">SEM COMPANHEIRO</span><h2>Equipe seu primeiro pet</h2><p>Pets atacam automaticamente e aumentam seu Poder Naval.</p></div>`;
    $("#pets-grid").innerHTML = PETS.map(pet => {
      const owned = state.ownedPets.includes(pet.id);
      const equipped = state.equippedPetId === pet.id;
      const issues = getPetIssues(pet);
      const unlocked = isPetUnlocked(pet);
      const affordable = canAfford(pet.costs);
      const status = equipped ? "EQUIPADO" : owned ? "COMPRADO" : unlocked ? "DISPONÍVEL" : "BLOQUEADO";
      const deltaDamage = current ? pet.damage - current.damage : pet.damage;
      const deltaDps = current ? pet.dps - current.dps : pet.dps;
      const comparison = equipped ? "Este é seu companheiro atual." : `<span class="${deltaDamage >= 0 ? "positive" : "negative"}">Dano ${deltaDamage >= 0 ? "+" : "-"}${formatNumber(Math.abs(deltaDamage))}</span><span class="${deltaDps >= 0 ? "positive" : "negative"}">DPS ${deltaDps >= 0 ? "+" : "-"}${Math.abs(deltaDps).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span><span>Ataque ${current && pet.interval > current.interval ? "mais lento" : current && pet.interval < current.interval ? "mais rápido" : "equivalente"}</span>`;
      const button = owned ? `<button class="button ${equipped ? "" : "primary"}" data-equip-pet="${pet.id}" ${equipped ? "disabled" : ""}>${equipped ? "Equipado" : "Equipar"}</button>` : `<button class="button primary" data-buy-pet="${pet.id}" ${!unlocked || !affordable ? "disabled" : ""}>Comprar</button>`;
      return `<article class="pet-card ${equipped ? "equipped" : owned ? "owned" : unlocked ? "available" : "locked"}" style="--pet-color:${pet.color}"><div class="pet-visual"><span>${pet.icon}</span><i></i></div><div class="pet-card-top"><div><span class="pet-rarity">${pet.rarity}</span><h3>${pet.name}</h3><small>${pet.type}</small></div><b>${status}</b></div><p>${pet.description}</p><div class="pet-stats"><span><small>DANO</small>${formatNumber(pet.damage)}</span><span><small>ATAQUE</small>${pet.interval.toLocaleString("pt-BR")}s</span><span><small>DPS</small>${pet.dps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span><span><small>PODER</small>+${formatNumber(pet.power)}</span></div>${pet.bonus ? `<div class="pet-bonus">✦ ${pet.bonus}</div>` : ""}<div class="pet-comparison">${comparison}</div><div class="cost-list">${owned ? "<span class=\"cost-chip\">Adoção permanente</span>" : resourceCostHtml(pet.costs)}</div>${issues.length ? `<div class="pet-requirements">Requer: ${issues.join(" • ")}</div>` : `<div class="pet-requirements ready">Nível ${pet.levelReq} • pronto para navegar</div>`}${button}</article>`;
    }).join("");
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
    $("#yard-ship-stats").innerHTML = `<div><span>VIDA</span><strong>${formatNumber(stats.maxHp)}</strong></div><div><span>DANO</span><strong>${formatNumber(stats.damage)}</strong></div><div><span>VELOCIDADE</span><strong>${formatNumber(stats.speed)}</strong></div><div><span>DEFESA</span><strong>${formatNumber(stats.armor)}</strong></div>`;
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

  function getShipRequirements(ship) {
    const issues = [];
    if (state.pirateLevel < ship.levelReq) issues.push(`Requer nível ${ship.levelReq}`);
    Object.entries(ship.costs).forEach(([key, amount]) => {
      const missing = Math.max(0, amount - (state.resources[key] || 0));
      if (missing > 0) issues.push(`Faltam ${formatNumber(missing)} ${RESOURCE_META[key].name}`);
    });
    return issues;
  }

  function renderFleet() {
    $("#fleet-owned-count").textContent = state.ownedShips.length;
    $("#fleet-total-count").textContent = SHIPS.length;
    const nextTarget = SHIPS.find(ship => !state.ownedShips.includes(ship.id));
    $("#fleet-next-goal").textContent = nextTarget ? `Próxima conquista: ${nextTarget.name} • nível ${nextTarget.levelReq}` : "Toda a frota foi conquistada. O Abismo reconhece seu almirante.";
    $("#fleet-grid").innerHTML = SHIPS.map(ship => {
      const owned = state.ownedShips.includes(ship.id);
      const current = state.shipId === ship.id;
      const issues = owned ? [] : getShipRequirements(ship);
      const levelMet = state.pirateLevel >= ship.levelReq;
      const affordable = canAfford(ship.costs);
      const status = current ? "EQUIPADO" : owned ? "COMPRADO" : levelMet && affordable ? "DISPONÍVEL" : "BLOQUEADO";
      const statusKey = current ? "equipped" : owned ? "purchased" : levelMet && affordable ? "available" : "blocked";
      const button = current ? `<button class="button" disabled>Equipado</button>` : owned ? `<button class="button primary" data-equip-ship="${ship.id}">Equipar navio</button>` : `<button class="button ${levelMet && affordable ? "primary" : ""}" data-buy-ship="${ship.id}" ${levelMet && affordable ? "" : "disabled"}>${levelMet && affordable ? "Comprar e equipar" : levelMet ? "Recursos insuficientes" : `Requer nível ${ship.levelReq}`}</button>`;
      const issueHtml = issues.length ? `<ul class="ship-issues">${issues.slice(0, 4).map(issue => `<li>${issue}</li>`).join("")}${issues.length > 4 ? `<li>+${issues.length - 4} requisitos</li>` : ""}</ul>` : `<p class="ship-ready">${owned ? "Disponível permanentemente na sua frota." : "Todos os requisitos foram atendidos."}</p>`;
      return `<article class="ship-card ${owned ? "owned" : statusKey === "blocked" ? "locked" : ""} ${current ? "current" : ""} ${statusKey}"><div class="ship-tier">TIER ${ship.tier}</div><div class="ship-status ${statusKey}">${status}</div><div class="ship-visual"><canvas data-ship-preview="${ship.id}" aria-label="Miniatura de ${ship.name}"></canvas></div><div class="ship-title-row"><div><h3>${ship.name}</h3><span>${ship.type}</span></div><span class="ship-level-req">NÍVEL ${ship.levelReq}</span></div><div class="ship-mini-stats"><span><small>VIDA</small>❤ ${formatNumber(ship.hp)}</span><span><small>DANO</small>☄ ${formatNumber(ship.damage)}</span><span><small>VELOC.</small>» ${formatNumber(ship.speed)}</span><span><small>DEFESA</small>⬡ ${formatNumber(ship.armor)}</span></div><div class="ship-costs"><span class="ship-section-label">CUSTO DE CONSTRUÇÃO</span><div class="cost-list">${resourceCostHtml(ship.costs)}</div></div>${issueHtml}${button}</article>`;
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
      const enemyTags = [...new Set(REGION_ENCOUNTERS[index].map(enemy => ENEMY_CATEGORIES[enemy.category].label))].map(label => `<span class="enemy-tag">⚔ ${label}</span>`).join("");
      return `<article class="map-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}"><div class="map-visual" style="--map-sky:${region.sky};--map-sea:${region.sea};--map-land:${region.land}"><span class="map-number">REGIÃO ${String(index + 1).padStart(2, "0")}</span>${unlocked ? "" : "<div class=\"map-lock\">▣</div>"}</div><div class="map-body"><h3>${region.name}</h3><p>${region.description}</p><div class="map-tags">${enemyTags}${tags}</div><div class="map-footer"><small>Boss: ${region.boss}<br>${state.bossesDefeated[index] ? "Derrotado" : `${Math.min(100, state.regionKills[index])}/100 inimigos`}</small><button class="button ${current ? "primary" : ""}" data-select-map="${index}" ${!unlocked || current ? "disabled" : ""}>${current ? "Navegando" : unlocked ? "Viajar" : "Bloqueado"}</button></div></div></article>`;
    }).join("");
  }

  function renderResources() {
    $("#cargo-total").textContent = formatNumber(Object.entries(state.resources).filter(([key]) => key !== "ouro").reduce((sum, [, value]) => sum + value, 0));
    $("#resources-grid").innerHTML = Object.entries(RESOURCE_META).map(([key, meta]) => `<article class="resource-card" style="--rarity-color:${RARITY_COLORS[meta.rarityKey]}"><div class="resource-header"><div class="resource-big-icon">${meta.icon}</div><div><h3>${meta.name}</h3><strong class="resource-amount">${formatNumber(state.resources[key])}</strong></div></div><span class="resource-rarity">${meta.rarity}</span><p class="resource-detail"><strong>Onde:</strong> ${meta.regions}</p><p class="resource-detail"><strong>Chance:</strong> ${meta.chance}</p><p class="resource-detail"><strong>Uso:</strong> ${meta.uses}</p></article>`).join("");
  }

  function renderTrade() {
    $("#trade-gold").textContent = `${formatNumber(state.resources.ouro)} Ouro`;
    $("#trade-grid").innerHTML = Object.entries(TRADE_PRICES).map(([key, price]) => {
      const meta = RESOURCE_META[key];
      const selected = tradeQuantities[key];
      const quantities = [1, 10, 50, 100, "max"];
      return `<article class="trade-card" style="--trade-color:${RARITY_COLORS[meta.rarityKey]}"><div class="trade-card-header"><div class="trade-icon">${meta.icon}</div><div><h3>${meta.name}</h3><span class="trade-stock">No porão: <strong>${formatNumber(state.resources[key])}</strong></span></div><span class="trade-rarity">${meta.rarity}</span></div><div class="trade-prices"><div class="trade-price"><span>COMPRAR / UN.</span><strong>${formatNumber(price.buy)} Ouro</strong></div><div class="trade-price sell"><span>VENDER / UN.</span><strong>${formatNumber(price.sell)} Ouro</strong></div></div><span class="quantity-label">QUANTIDADE</span><div class="quantity-selector">${quantities.map(quantity => `<button class="${selected === quantity ? "active" : ""}" data-trade-qty="${quantity}" data-trade-resource="${key}">${quantity === "max" ? "MÁX." : quantity}</button>`).join("")}</div><div class="trade-actions"><button class="button primary" data-trade-action="buy" data-trade-resource="${key}">Comprar</button><button class="button sell-button" data-trade-action="sell" data-trade-resource="${key}">Vender</button></div></article>`;
    }).join("");
  }

  function openTradeConfirmation(key, action) {
    const price = TRADE_PRICES[key];
    const meta = RESOURCE_META[key];
    if (!price || !meta || !["buy", "sell"].includes(action)) return toast("Quantidade inválida.", "danger-toast");
    const selected = tradeQuantities[key];
    let quantity = selected === "max" ? (action === "buy" ? Math.floor(state.resources.ouro / price.buy) : Math.floor(state.resources[key])) : Number(selected);
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
    $("#trade-summary").innerHTML = `<span>Operação</span><strong>${action === "buy" ? "Compra" : "Venda"}</strong><span>Quantidade</span><strong>${formatNumber(quantity)} unidades</strong><span>Preço por unidade</span><strong>${formatNumber(unitPrice)} Ouro</strong><span>Valor total</span><strong>${formatNumber(total)} Ouro</strong>`;
    $("#trade-modal-message").textContent = action === "buy" ? "O Ouro será descontado imediatamente." : "Os recursos serão removidos do porão imediatamente.";
    $("#trade-confirm").textContent = action === "buy" ? "Confirmar compra" : "Confirmar venda";
    $("#trade-modal").classList.remove("hidden");
  }

  function executeTrade() {
    if (!pendingTrade) return;
    const { key, action, quantity, unitPrice } = pendingTrade;
    const total = quantity * unitPrice;
    if (!Number.isInteger(quantity) || quantity <= 0) { toast("Quantidade inválida.", "danger-toast"); closeTradeModal(); return; }
    if (action === "buy") {
      if (state.resources.ouro < total) { toast("Ouro insuficiente.", "danger-toast"); closeTradeModal(); return; }
      state.resources.ouro -= total;
      state.resources[key] += quantity;
      toast("Compra realizada com sucesso.", "gold-toast");
      addLog(`Mercado: ${quantity} ${RESOURCE_META[key].name} comprados por ${formatNumber(total)} Ouro.`, "loot");
    } else {
      if (state.resources[key] < quantity) { toast("Recurso insuficiente.", "danger-toast"); closeTradeModal(); return; }
      state.resources[key] -= quantity;
      state.resources.ouro += total;
      state.lifetime.gold += total;
      toast("Venda realizada com sucesso.", "gold-toast");
      addLog(`Mercado: ${quantity} ${RESOURCE_META[key].name} vendidos por ${formatNumber(total)} Ouro.`, "loot");
    }
    closeTradeModal();
    renderAll(true);
    saveGame();
  }

  function closeTradeModal() {
    pendingTrade = null;
    $("#trade-modal").classList.add("hidden");
  }

  function renderStats() {
    const stats = getStats();
    const skillLevels = Object.values(state.skills).reduce((sum, item) => sum + item.level, 0);
    const rank = state.pirateLevel >= 50 ? "Lenda Abissal" : state.pirateLevel >= 30 ? "Almirante" : state.pirateLevel >= 15 ? "Capitão" : state.pirateLevel >= 5 ? "Corsário" : "Marujo";
    $("#captain-rank").textContent = rank;
    const list = items => items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    $("#combat-stats").innerHTML = list([
      ["Vida atual / máxima", `${formatNumber(state.combat.playerHp)} / ${formatNumber(stats.maxHp)}`], ["Dano do navio", formatNumber(stats.damage)], ["DPS do navio", formatNumber(stats.shipDps)], ["DPS das skills", formatNumber(stats.skillDps)], ["DPS do pet", formatNumber(stats.petDps)], ["DPS total", formatNumber(stats.dps)], ["Poder Naval", formatNumber(stats.power)], ["Velocidade", formatNumber(stats.speed)], ["Armadura", formatNumber(stats.armor)], ["Precisão", `${Math.round(stats.precision * 100)}%`], ["Crítico", `${Math.round(stats.crit * 100)}%`], ["Evasão", `${Math.round(stats.evasion * 100)}%`]
    ]);
    $("#progression-stats").innerHTML = list([
      ["Navio atual", SHIPS[state.shipId].name], ["Nível do navio", state.levels.ship], ["Nível dos canhões", state.levels.cannons], ["Nível das velas", state.levels.sails], ["Nível do casco", state.levels.hull], ["Nível do pirata", state.pirateLevel], ["XP atual / necessária", `${formatNumber(state.xp)} / ${formatNumber(xpNeeded())}`], ["Skills / níveis somados", `${Object.keys(SKILL_META).filter(isSkillUnlocked).length} / ${skillLevels}`], ["Região atual", REGIONS[state.regionIndex].name]
    ]);
    $("#career-stats").innerHTML = [["Inimigos derrotados", state.lifetime.enemies], ["Bosses derrotados", state.lifetime.bosses], ["Recursos coletados", state.lifetime.resources], ["Ouro total", state.lifetime.gold], ["Maior dano", state.lifetime.highestDamage], ["Navios construídos", state.ownedShips.length], ["Pets comprados", state.ownedPets.length], ["Ataques de pets", state.lifetime.petAttacks], ["Vitórias com pet", state.lifetime.petKills], ["Bosses com pet", state.lifetime.bossesWithPet], ["Regiões abertas", state.unlockedRegions], ["Tempo navegando", formatDuration(state.lifetime.playSeconds)]].map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : value}</strong></div>`).join("");
  }

  function renderAll(expensive = true) {
    renderTopbar(); renderHome(); renderCombatHud();
    if (expensive || currentScreen === "upgrades") renderUpgrades();
    if (expensive || currentScreen === "maps") renderMaps();
    if (expensive || currentScreen === "resources") renderResources();
    if (expensive || currentScreen === "trade") renderTrade();
    if (expensive || currentScreen === "pets") renderPets();
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
    if (!ship || state.ownedShips.includes(id)) return;
    if (state.pirateLevel < ship.levelReq) return toast(`Requer nível ${ship.levelReq} para comprar ${ship.name}.`, "danger-toast");
    if (!canAfford(ship.costs)) return toast("Ainda faltam recursos para construir este navio.", "danger-toast");
    spend(ship.costs); state.ownedShips.push(id); state.shipId = id; state.combat.playerHp = getStats().maxHp; state.combat.enemy = null; state.combat.spawnTimer = 0;
    toast(`${ship.name} foi construído e equipado!`, "gold-toast"); addLog(`${ship.name} agora lidera sua frota.`, "loot"); renderAll(true); saveGame();
  }

  function equipShip(id) {
    if (!state.ownedShips.includes(id)) return;
    state.shipId = id; state.combat.playerHp = getStats().maxHp; state.combat.enemy = null; state.combat.spawnTimer = 0;
    toast(`${SHIPS[id].name} selecionado.`); renderAll(true); saveGame();
  }

  function buyPet(id) {
    const pet = PETS[id];
    if (!pet || state.ownedPets.includes(id)) return;
    const issues = getPetIssues(pet);
    if (issues.length) return toast(`Pet bloqueado: ${issues.join(" • ")}.`, "danger-toast");
    if (!canAfford(pet.costs)) return toast("Ainda faltam recursos para adotar este pet.", "danger-toast");
    spend(pet.costs); state.ownedPets.push(id); state.equippedPetId = id; state.combat.petAttackTimer = 0; state.lifetime.petsBought += 1;
    toast(`${pet.name} foi comprado e equipado!`, "gold-toast"); addLog(`${pet.name} agora acompanha seu navio.`, "loot"); renderAll(true); saveGame();
  }

  function equipPet(id) {
    if (!state.ownedPets.includes(id) || !PETS[id]) return;
    state.equippedPetId = id; state.combat.petAttackTimer = 0; state.combat.playerHp = Math.min(state.combat.playerHp, getStats().maxHp);
    toast(`${PETS[id].name} equipado como companheiro.`); renderAll(true); saveGame();
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
    if (screen === "trade") renderTrade();
    if (screen === "pets") renderPets();
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
    if (target.dataset.buyPet) buyPet(Number(target.dataset.buyPet));
    if (target.dataset.equipPet) equipPet(Number(target.dataset.equipPet));
    if (target.dataset.craftEquipment) craftEquipment(target.dataset.craftEquipment);
    if (target.dataset.upgradeSkill) upgradeSkill(target.dataset.upgradeSkill);
    if (target.dataset.toggleSkill) toggleSkill(target.dataset.toggleSkill);
    if (target.dataset.skillDock) toggleSkill(target.dataset.skillDock);
    if (target.dataset.tradeQty && target.dataset.tradeResource) {
      tradeQuantities[target.dataset.tradeResource] = target.dataset.tradeQty === "max" ? "max" : Number(target.dataset.tradeQty);
      renderTrade();
    }
    if (target.dataset.tradeAction && target.dataset.tradeResource) openTradeConfirmation(target.dataset.tradeResource, target.dataset.tradeAction);
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
  $("#trade-cancel").addEventListener("click", closeTradeModal);
  $("#trade-confirm").addEventListener("click", executeTrade);

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
