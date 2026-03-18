// Satisfactory 1.0 – Standard (non-alternate) production recipes
// Source: satisfactory.wiki.gg (March 2026)
//
// Each recipe object:
//   id          – unique camelCase key
//   name        – display name
//   building    – building type key (matches BUILDING_DEFS)
//   craftTime   – seconds per craft cycle
//   inputs      – [{ item, perMin }]   (amounts at 100% clock speed)
//   outputs     – [{ item, perMin }]

// ─── Item name constants (to avoid typos) ────────────────────────────────────
// Raw resources
// 'Iron Ore', 'Copper Ore', 'Limestone', 'Coal', 'Caterium Ore',
// 'Raw Quartz', 'Sulfur', 'Bauxite', 'Uranium', 'SAM', 'Crude Oil',
// 'Water', 'Nitrogen Gas'

const RECIPES = [

  // ═══════════════════════════════════════════════════════════════════════════
  // SMELTER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'ironIngot',
    name: 'Iron Ingot',
    building: 'smelter',
    craftTime: 2,
    inputs:  [{ item: 'Iron Ore',     perMin: 30 }],
    outputs: [{ item: 'Iron Ingot',   perMin: 30 }],
  },
  {
    id: 'copperIngot',
    name: 'Copper Ingot',
    building: 'smelter',
    craftTime: 2,
    inputs:  [{ item: 'Copper Ore',   perMin: 30 }],
    outputs: [{ item: 'Copper Ingot', perMin: 30 }],
  },
  {
    id: 'cateriumIngot',
    name: 'Caterium Ingot',
    building: 'smelter',
    craftTime: 4,
    inputs:  [{ item: 'Caterium Ore',   perMin: 45 }],
    outputs: [{ item: 'Caterium Ingot', perMin: 15 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOUNDRY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'steelIngot',
    name: 'Steel Ingot',
    building: 'foundry',
    craftTime: 4,
    inputs:  [
      { item: 'Iron Ore', perMin: 45 },
      { item: 'Coal',     perMin: 45 },
    ],
    outputs: [{ item: 'Steel Ingot', perMin: 45 }],
  },
  {
    id: 'aluminumIngot',
    name: 'Aluminum Ingot',
    building: 'foundry',
    craftTime: 4,
    inputs:  [
      { item: 'Aluminum Scrap', perMin: 90 },
      { item: 'Silica',         perMin: 75 },
    ],
    outputs: [{ item: 'Aluminum Ingot', perMin: 60 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'ironPlate',
    name: 'Iron Plate',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Iron Ingot', perMin: 30 }],
    outputs: [{ item: 'Iron Plate', perMin: 20 }],
  },
  {
    id: 'ironRod',
    name: 'Iron Rod',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Iron Ingot', perMin: 15 }],
    outputs: [{ item: 'Iron Rod',   perMin: 15 }],
  },
  {
    id: 'screws',
    name: 'Screws',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Iron Rod', perMin: 10 }],
    outputs: [{ item: 'Screws',   perMin: 40 }],
  },
  {
    id: 'ironRebar',
    name: 'Iron Rebar',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Iron Rod',    perMin: 15 }],
    outputs: [{ item: 'Iron Rebar',  perMin: 15 }],
  },
  {
    id: 'wire',
    name: 'Wire',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Copper Ingot', perMin: 15 }],
    outputs: [{ item: 'Wire',         perMin: 30 }],
  },
  {
    id: 'cable',
    name: 'Cable',
    building: 'constructor',
    craftTime: 2,
    inputs:  [{ item: 'Wire',  perMin: 60 }],
    outputs: [{ item: 'Cable', perMin: 30 }],
  },
  {
    id: 'copperSheet',
    name: 'Copper Sheet',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Copper Ingot', perMin: 20 }],
    outputs: [{ item: 'Copper Sheet', perMin: 10 }],
  },
  {
    id: 'copperPowder',
    name: 'Copper Powder',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Copper Ingot',  perMin: 300 }],
    outputs: [{ item: 'Copper Powder', perMin:  50 }],
  },
  {
    id: 'concrete',
    name: 'Concrete',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Limestone', perMin: 45 }],
    outputs: [{ item: 'Concrete',  perMin: 15 }],
  },
  {
    id: 'quartzCrystal',
    name: 'Quartz Crystal',
    building: 'constructor',
    craftTime: 8,
    inputs:  [{ item: 'Raw Quartz',    perMin: 37.5 }],
    outputs: [{ item: 'Quartz Crystal', perMin: 22.5 }],
  },
  {
    id: 'silica',
    name: 'Silica',
    building: 'constructor',
    craftTime: 8,
    inputs:  [{ item: 'Raw Quartz', perMin: 22.5 }],
    outputs: [{ item: 'Silica',     perMin: 37.5 }],
  },
  {
    id: 'quickwire',
    name: 'Quickwire',
    building: 'constructor',
    craftTime: 5,
    inputs:  [{ item: 'Caterium Ingot', perMin: 12 }],
    outputs: [{ item: 'Quickwire',      perMin: 60 }],
  },
  {
    id: 'steelBeam',
    name: 'Steel Beam',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Steel Ingot', perMin: 60 }],
    outputs: [{ item: 'Steel Beam',  perMin: 15 }],
  },
  {
    id: 'steelPipe',
    name: 'Steel Pipe',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Steel Ingot', perMin: 30 }],
    outputs: [{ item: 'Steel Pipe',  perMin: 20 }],
  },
  {
    id: 'aluminumCasing',
    name: 'Aluminum Casing',
    building: 'constructor',
    craftTime: 2,
    inputs:  [{ item: 'Aluminum Ingot',  perMin: 90 }],
    outputs: [{ item: 'Aluminum Casing', perMin: 60 }],
  },
  {
    id: 'emptyCanister',
    name: 'Empty Canister',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Plastic',        perMin: 30 }],
    outputs: [{ item: 'Empty Canister', perMin: 60 }],
  },
  {
    id: 'emptyFluidTank',
    name: 'Empty Fluid Tank',
    building: 'constructor',
    craftTime: 1,
    inputs:  [{ item: 'Aluminum Ingot',  perMin: 60 }],
    outputs: [{ item: 'Empty Fluid Tank', perMin: 60 }],
  },
  {
    id: 'solidBiofuel',
    name: 'Solid Biofuel',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Biomass',       perMin: 120 }],
    outputs: [{ item: 'Solid Biofuel', perMin:  60 }],
  },
  {
    id: 'reanimatedSAM',
    name: 'Reanimated SAM',
    building: 'constructor',
    craftTime: 2,
    inputs:  [{ item: 'SAM',            perMin: 120 }],
    outputs: [{ item: 'Reanimated SAM', perMin:  30 }],
  },
  {
    id: 'ficsiteTrigon',
    name: 'Ficsite Trigon',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Ficsite Ingot',  perMin: 10 }],
    outputs: [{ item: 'Ficsite Trigon', perMin: 30 }],
  },
  {
    id: 'alienDNACapsule',
    name: 'Alien DNA Capsule',
    building: 'constructor',
    craftTime: 6,
    inputs:  [{ item: 'Alien Protein',    perMin: 10 }],
    outputs: [{ item: 'Alien DNA Capsule', perMin: 10 }],
  },
  {
    id: 'biomassAlienProtein',
    name: 'Biomass (Alien Protein)',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Alien Protein', perMin:   15 }],
    outputs: [{ item: 'Biomass',       perMin: 1500 }],
  },
  {
    id: 'biomassLeaves',
    name: 'Biomass (Leaves)',
    building: 'constructor',
    craftTime: 5,
    inputs:  [{ item: 'Leaves', perMin: 120 }],
    outputs: [{ item: 'Biomass', perMin:  60 }],
  },
  {
    id: 'biomassWood',
    name: 'Biomass (Wood)',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Wood',   perMin:  60 }],
    outputs: [{ item: 'Biomass', perMin: 300 }],
  },
  {
    id: 'biomassMycelia',
    name: 'Biomass (Mycelia)',
    building: 'constructor',
    craftTime: 4,
    inputs:  [{ item: 'Mycelia', perMin:  15 }],
    outputs: [{ item: 'Biomass', perMin: 150 }],
  },
  {
    id: 'hogProtein',
    name: 'Hog Protein',
    building: 'constructor',
    craftTime: 3,
    inputs:  [{ item: 'Hog Remains',   perMin: 20 }],
    outputs: [{ item: 'Alien Protein', perMin: 20 }],
  },
  {
    id: 'hatcherProtein',
    name: 'Hatcher Protein',
    building: 'constructor',
    craftTime: 3,
    inputs:  [{ item: 'Hatcher Remains', perMin: 20 }],
    outputs: [{ item: 'Alien Protein',   perMin: 20 }],
  },
  {
    id: 'spitterProtein',
    name: 'Spitter Protein',
    building: 'constructor',
    craftTime: 3,
    inputs:  [{ item: 'Spitter Remains', perMin: 20 }],
    outputs: [{ item: 'Alien Protein',   perMin: 20 }],
  },
  {
    id: 'stingerProtein',
    name: 'Stinger Protein',
    building: 'constructor',
    craftTime: 3,
    inputs:  [{ item: 'Stinger Remains', perMin: 20 }],
    outputs: [{ item: 'Alien Protein',   perMin: 20 }],
  },
  {
    id: 'powerShard1',
    name: 'Power Shard (1)',
    building: 'constructor',
    craftTime: 8,
    inputs:  [{ item: 'Blue Power Slug', perMin:  7.5 }],
    outputs: [{ item: 'Power Shard',     perMin:  7.5 }],
  },
  {
    id: 'powerShard2',
    name: 'Power Shard (2)',
    building: 'constructor',
    craftTime: 12,
    inputs:  [{ item: 'Yellow Power Slug', perMin:  5 }],
    outputs: [{ item: 'Power Shard',       perMin: 10 }],
  },
  {
    id: 'powerShard5',
    name: 'Power Shard (5)',
    building: 'constructor',
    craftTime: 24,
    inputs:  [{ item: 'Purple Power Slug', perMin:  2.5 }],
    outputs: [{ item: 'Power Shard',       perMin: 12.5 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSEMBLER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'reinforcedIronPlate',
    name: 'Reinforced Iron Plate',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Iron Plate', perMin: 30 },
      { item: 'Screws',     perMin: 60 },
    ],
    outputs: [{ item: 'Reinforced Iron Plate', perMin: 5 }],
  },
  {
    id: 'rotor',
    name: 'Rotor',
    building: 'assembler',
    craftTime: 15,
    inputs:  [
      { item: 'Iron Rod', perMin:  20 },
      { item: 'Screws',   perMin: 100 },
    ],
    outputs: [{ item: 'Rotor', perMin: 4 }],
  },
  {
    id: 'modularFrame',
    name: 'Modular Frame',
    building: 'assembler',
    craftTime: 60,
    inputs:  [
      { item: 'Reinforced Iron Plate', perMin:  3 },
      { item: 'Iron Rod',              perMin: 12 },
    ],
    outputs: [{ item: 'Modular Frame', perMin: 2 }],
  },
  {
    id: 'encasedIndustrialBeam',
    name: 'Encased Industrial Beam',
    building: 'assembler',
    craftTime: 10,
    inputs:  [
      { item: 'Steel Beam', perMin: 18 },
      { item: 'Concrete',   perMin: 36 },
    ],
    outputs: [{ item: 'Encased Industrial Beam', perMin: 6 }],
  },
  {
    id: 'stator',
    name: 'Stator',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Steel Pipe', perMin: 15 },
      { item: 'Wire',       perMin: 40 },
    ],
    outputs: [{ item: 'Stator', perMin: 5 }],
  },
  {
    id: 'motor',
    name: 'Motor',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Rotor',  perMin: 10 },
      { item: 'Stator', perMin: 10 },
    ],
    outputs: [{ item: 'Motor', perMin: 5 }],
  },
  {
    id: 'blackPowder',
    name: 'Black Powder',
    building: 'assembler',
    craftTime: 4,
    inputs:  [
      { item: 'Coal',   perMin: 15 },
      { item: 'Sulfur', perMin: 15 },
    ],
    outputs: [{ item: 'Black Powder', perMin: 30 }],
  },
  {
    id: 'nobelisk',
    name: 'Nobelisk',
    building: 'assembler',
    craftTime: 6,
    inputs:  [
      { item: 'Black Powder', perMin: 20 },
      { item: 'Steel Pipe',   perMin: 20 },
    ],
    outputs: [{ item: 'Nobelisk', perMin: 10 }],
  },
  {
    id: 'circuitBoard',
    name: 'Circuit Board',
    building: 'assembler',
    craftTime: 8,
    inputs:  [
      { item: 'Copper Sheet', perMin: 15 },
      { item: 'Plastic',      perMin: 30 },
    ],
    outputs: [{ item: 'Circuit Board', perMin: 7.5 }],
  },
  {
    id: 'aiLimiter',
    name: 'AI Limiter',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Copper Sheet', perMin:  25 },
      { item: 'Quickwire',    perMin: 100 },
    ],
    outputs: [{ item: 'AI Limiter', perMin: 5 }],
  },
  {
    id: 'alcladAluminumSheet',
    name: 'Alclad Aluminum Sheet',
    building: 'assembler',
    craftTime: 6,
    inputs:  [
      { item: 'Aluminum Ingot', perMin: 30 },
      { item: 'Copper Ingot',   perMin: 10 },
    ],
    outputs: [{ item: 'Alclad Aluminum Sheet', perMin: 30 }],
  },
  {
    id: 'heatSink',
    name: 'Heat Sink',
    building: 'assembler',
    craftTime: 8,
    inputs:  [
      { item: 'Alclad Aluminum Sheet', perMin: 37.5 },
      { item: 'Copper Sheet',          perMin: 22.5 },
    ],
    outputs: [{ item: 'Heat Sink', perMin: 7.5 }],
  },
  {
    id: 'electromagneticControlRod',
    name: 'Electromagnetic Control Rod',
    building: 'assembler',
    craftTime: 30,
    inputs:  [
      { item: 'Stator',     perMin: 6 },
      { item: 'AI Limiter', perMin: 4 },
    ],
    outputs: [{ item: 'Electromagnetic Control Rod', perMin: 4 }],
  },
  {
    id: 'automatedWiring',
    name: 'Automated Wiring',
    building: 'assembler',
    craftTime: 24,
    inputs:  [
      { item: 'Stator', perMin:  2.5 },
      { item: 'Cable',  perMin: 50 },
    ],
    outputs: [{ item: 'Automated Wiring', perMin: 2.5 }],
  },
  {
    id: 'versatileFramework',
    name: 'Versatile Framework',
    building: 'assembler',
    craftTime: 24,
    inputs:  [
      { item: 'Modular Frame', perMin:  2.5 },
      { item: 'Steel Beam',    perMin: 30 },
    ],
    outputs: [{ item: 'Versatile Framework', perMin: 5 }],
  },
  {
    id: 'smartPlating',
    name: 'Smart Plating',
    building: 'assembler',
    craftTime: 30,
    inputs:  [
      { item: 'Reinforced Iron Plate', perMin: 2 },
      { item: 'Rotor',                 perMin: 2 },
    ],
    outputs: [{ item: 'Smart Plating', perMin: 2 }],
  },
  {
    id: 'encasedPlutoniumCell',
    name: 'Encased Plutonium Cell',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Plutonium Pellet', perMin: 10 },
      { item: 'Concrete',         perMin: 20 },
    ],
    outputs: [{ item: 'Encased Plutonium Cell', perMin: 5 }],
  },
  {
    id: 'assemblyDirectorSystem',
    name: 'Assembly Director System',
    building: 'assembler',
    craftTime: 80,
    inputs:  [
      { item: 'Adaptive Control Unit', perMin: 1.5 },
      { item: 'Supercomputer',         perMin: 0.75 },
    ],
    outputs: [{ item: 'Assembly Director System', perMin: 0.75 }],
  },
  {
    id: 'magneticFieldGenerator',
    name: 'Magnetic Field Generator',
    building: 'assembler',
    craftTime: 120,
    inputs:  [
      { item: 'Versatile Framework',          perMin: 2.5 },
      { item: 'Electromagnetic Control Rod',  perMin: 1 },
    ],
    outputs: [{ item: 'Magnetic Field Generator', perMin: 1 }],
  },
  {
    id: 'pressureConversionCube',
    name: 'Pressure Conversion Cube',
    building: 'assembler',
    craftTime: 60,
    inputs:  [
      { item: 'Fused Modular Frame',  perMin: 1 },
      { item: 'Radio Control Unit',   perMin: 2 },
    ],
    outputs: [{ item: 'Pressure Conversion Cube', perMin: 1 }],
  },
  {
    id: 'fabric',
    name: 'Fabric',
    building: 'assembler',
    craftTime: 4,
    inputs:  [
      { item: 'Mycelia', perMin: 15 },
      { item: 'Biomass', perMin: 75 },
    ],
    outputs: [{ item: 'Fabric', perMin: 15 }],
  },
  {
    id: 'clusterNobelisk',
    name: 'Cluster Nobelisk',
    building: 'assembler',
    craftTime: 24,
    inputs:  [
      { item: 'Nobelisk',        perMin:  7.5 },
      { item: 'Smokeless Powder', perMin: 10 },
    ],
    outputs: [{ item: 'Cluster Nobelisk', perMin: 2.5 }],
  },
  {
    id: 'gasNobelisk',
    name: 'Gas Nobelisk',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Nobelisk', perMin:  5 },
      { item: 'Biomass',  perMin: 50 },
    ],
    outputs: [{ item: 'Gas Nobelisk', perMin: 5 }],
  },
  {
    id: 'pulseNobelisk',
    name: 'Pulse Nobelisk',
    building: 'assembler',
    craftTime: 60,
    inputs:  [
      { item: 'Nobelisk',           perMin: 5 },
      { item: 'Crystal Oscillator', perMin: 1 },
    ],
    outputs: [{ item: 'Pulse Nobelisk', perMin: 5 }],
  },
  {
    id: 'rifleAmmo',
    name: 'Rifle Ammo',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Copper Sheet',    perMin: 15 },
      { item: 'Smokeless Powder', perMin: 10 },
    ],
    outputs: [{ item: 'Rifle Ammo', perMin: 75 }],
  },
  {
    id: 'homingRifleAmmo',
    name: 'Homing Rifle Ammo',
    building: 'assembler',
    craftTime: 24,
    inputs:  [
      { item: 'Rifle Ammo',           perMin: 50 },
      { item: 'High-Speed Connector', perMin:  2.5 },
    ],
    outputs: [{ item: 'Homing Rifle Ammo', perMin: 25 }],
  },
  {
    id: 'shutterRebar',
    name: 'Shatter Rebar',
    building: 'assembler',
    craftTime: 12,
    inputs:  [
      { item: 'Iron Rebar',     perMin: 10 },
      { item: 'Quartz Crystal', perMin: 15 },
    ],
    outputs: [{ item: 'Shatter Rebar', perMin: 5 }],
  },
  {
    id: 'stunRebar',
    name: 'Stun Rebar',
    building: 'assembler',
    craftTime: 6,
    inputs:  [
      { item: 'Iron Rebar', perMin: 10 },
      { item: 'Quickwire',  perMin: 50 },
    ],
    outputs: [{ item: 'Stun Rebar', perMin: 10 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUFACTURER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'computer',
    name: 'Computer',
    building: 'manufacturer',
    craftTime: 24,
    inputs:  [
      { item: 'Circuit Board', perMin: 10 },
      { item: 'Cable',         perMin: 20 },
      { item: 'Plastic',       perMin: 40 },
    ],
    outputs: [{ item: 'Computer', perMin: 2.5 }],
  },
  {
    id: 'crystalOscillator',
    name: 'Crystal Oscillator',
    building: 'manufacturer',
    craftTime: 120,
    inputs:  [
      { item: 'Quartz Crystal',        perMin: 18 },
      { item: 'Cable',                 perMin: 14 },
      { item: 'Reinforced Iron Plate', perMin:  2.5 },
    ],
    outputs: [{ item: 'Crystal Oscillator', perMin: 1 }],
  },
  {
    id: 'heavyModularFrame',
    name: 'Heavy Modular Frame',
    building: 'manufacturer',
    craftTime: 30,
    inputs:  [
      { item: 'Modular Frame',          perMin:  10 },
      { item: 'Steel Pipe',             perMin:  40 },
      { item: 'Encased Industrial Beam', perMin: 10 },
      { item: 'Screws',                 perMin: 240 },
    ],
    outputs: [{ item: 'Heavy Modular Frame', perMin: 2 }],
  },
  {
    id: 'highSpeedConnector',
    name: 'High-Speed Connector',
    building: 'manufacturer',
    craftTime: 16,
    inputs:  [
      { item: 'Quickwire',     perMin: 210 },
      { item: 'Cable',         perMin:  37.5 },
      { item: 'Circuit Board', perMin:   3.75 },
    ],
    outputs: [{ item: 'High-Speed Connector', perMin: 3.75 }],
  },
  {
    id: 'supercomputer',
    name: 'Supercomputer',
    building: 'manufacturer',
    craftTime: 32,
    inputs:  [
      { item: 'Computer',             perMin:  7.5 },
      { item: 'AI Limiter',           perMin:  3.75 },
      { item: 'High-Speed Connector', perMin:  5.625 },
      { item: 'Plastic',              perMin: 52.5 },
    ],
    outputs: [{ item: 'Supercomputer', perMin: 1.875 }],
  },
  {
    id: 'radioControlUnit',
    name: 'Radio Control Unit',
    building: 'manufacturer',
    craftTime: 48,
    inputs:  [
      { item: 'Aluminum Casing',    perMin: 40 },
      { item: 'Crystal Oscillator', perMin:  1.25 },
      { item: 'Computer',           perMin:  2.5 },
    ],
    outputs: [{ item: 'Radio Control Unit', perMin: 2.5 }],
  },
  {
    id: 'adaptiveControlUnit',
    name: 'Adaptive Control Unit',
    building: 'manufacturer',
    craftTime: 60,
    inputs:  [
      { item: 'Automated Wiring', perMin: 5 },
      { item: 'Circuit Board',    perMin: 5 },
      { item: 'Heavy Modular Frame', perMin: 1 },
      { item: 'Computer',         perMin: 2 },
    ],
    outputs: [{ item: 'Adaptive Control Unit', perMin: 1 }],
  },
  {
    id: 'modularEngine',
    name: 'Modular Engine',
    building: 'manufacturer',
    craftTime: 60,
    inputs:  [
      { item: 'Motor',        perMin:  2 },
      { item: 'Rubber',       perMin: 15 },
      { item: 'Smart Plating', perMin:  2 },
    ],
    outputs: [{ item: 'Modular Engine', perMin: 1 }],
  },
  {
    id: 'turboMotor',
    name: 'Turbo Motor',
    building: 'manufacturer',
    craftTime: 32,
    inputs:  [
      { item: 'Cooling System',     perMin:  7.5 },
      { item: 'Radio Control Unit', perMin:  3.75 },
      { item: 'Motor',              perMin:  7.5 },
      { item: 'Rubber',             perMin: 45 },
    ],
    outputs: [{ item: 'Turbo Motor', perMin: 1.875 }],
  },
  {
    id: 'uraniumFuelRod',
    name: 'Uranium Fuel Rod',
    building: 'manufacturer',
    craftTime: 150,
    inputs:  [
      { item: 'Encased Uranium Cell',         perMin: 20 },
      { item: 'Encased Industrial Beam',      perMin:  1.2 },
      { item: 'Electromagnetic Control Rod',  perMin:  2 },
    ],
    outputs: [{ item: 'Uranium Fuel Rod', perMin: 0.4 }],
  },
  {
    id: 'plutoniumFuelRod',
    name: 'Plutonium Fuel Rod',
    building: 'manufacturer',
    craftTime: 240,
    inputs:  [
      { item: 'Encased Plutonium Cell',       perMin: 7.5 },
      { item: 'Steel Beam',                   perMin: 4.5 },
      { item: 'Electromagnetic Control Rod',  perMin: 1.5 },
      { item: 'Heat Sink',                    perMin: 2.5 },
    ],
    outputs: [{ item: 'Plutonium Fuel Rod', perMin: 0.25 }],
  },
  {
    id: 'thermalPropulsionRocket',
    name: 'Thermal Propulsion Rocket',
    building: 'manufacturer',
    craftTime: 120,
    inputs:  [
      { item: 'Modular Engine',     perMin: 2.5 },
      { item: 'Turbo Motor',        perMin: 1 },
      { item: 'Cooling System',     perMin: 3 },
      { item: 'Fused Modular Frame', perMin: 1 },
    ],
    outputs: [{ item: 'Thermal Propulsion Rocket', perMin: 1 }],
  },
  {
    id: 'ballisticWarpDrive',
    name: 'Ballistic Warp Drive',
    building: 'manufacturer',
    craftTime: 60,
    inputs:  [
      { item: 'Thermal Propulsion Rocket', perMin:  1 },
      { item: 'Singularity Cell',          perMin:  5 },
      { item: 'Superposition Oscillator',  perMin:  2 },
      { item: 'Dark Matter Crystal',       perMin: 40 },
    ],
    outputs: [{ item: 'Ballistic Warp Drive', perMin: 1 }],
  },
  {
    id: 'singularityCell',
    name: 'Singularity Cell',
    building: 'manufacturer',
    craftTime: 60,
    inputs:  [
      { item: 'Nuclear Pasta', perMin:   1 },
      { item: 'Dark Matter Crystal', perMin: 20 },
      { item: 'Iron Plate',    perMin: 100 },
      { item: 'Concrete',      perMin: 200 },
    ],
    outputs: [{ item: 'Singularity Cell', perMin: 10 }],
  },
  {
    id: 'samFluctuator',
    name: 'SAM Fluctuator',
    building: 'manufacturer',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin: 60 },
      { item: 'Wire',           perMin: 50 },
      { item: 'Steel Pipe',     perMin: 30 },
    ],
    outputs: [{ item: 'SAM Fluctuator', perMin: 10 }],
  },
  {
    id: 'gasFilter',
    name: 'Gas Filter',
    building: 'manufacturer',
    craftTime: 8,
    inputs:  [
      { item: 'Fabric',     perMin: 15 },
      { item: 'Coal',       perMin: 30 },
      { item: 'Iron Plate', perMin: 15 },
    ],
    outputs: [{ item: 'Gas Filter', perMin: 7.5 }],
  },
  {
    id: 'iodineInfusedFilter',
    name: 'Iodine-Infused Filter',
    building: 'manufacturer',
    craftTime: 16,
    inputs:  [
      { item: 'Gas Filter',      perMin:  3.75 },
      { item: 'Quickwire',       perMin: 30 },
      { item: 'Aluminum Casing', perMin:  3.75 },
    ],
    outputs: [{ item: 'Iodine-Infused Filter', perMin: 3.75 }],
  },
  {
    id: 'explosiveRebar',
    name: 'Explosive Rebar',
    building: 'manufacturer',
    craftTime: 12,
    inputs:  [
      { item: 'Iron Rebar',      perMin: 10 },
      { item: 'Smokeless Powder', perMin: 10 },
      { item: 'Steel Pipe',      perMin: 10 },
    ],
    outputs: [{ item: 'Explosive Rebar', perMin: 5 }],
  },
  {
    id: 'nukeNobelisk',
    name: 'Nuke Nobelisk',
    building: 'manufacturer',
    craftTime: 120,
    inputs:  [
      { item: 'Nobelisk',            perMin:  2.5 },
      { item: 'Encased Uranium Cell', perMin: 10 },
      { item: 'Smokeless Powder',    perMin:  5 },
      { item: 'AI Limiter',          perMin:  3 },
    ],
    outputs: [{ item: 'Nuke Nobelisk', perMin: 0.5 }],
  },
  {
    id: 'turboRifleAmmoMfr',
    name: 'Turbo Rifle Ammo',
    building: 'manufacturer',
    craftTime: 12,
    inputs:  [
      { item: 'Rifle Ammo',        perMin: 125 },
      { item: 'Aluminum Casing',   perMin:  15 },
      { item: 'Packaged Turbofuel', perMin:  15 },
    ],
    outputs: [{ item: 'Turbo Rifle Ammo', perMin: 250 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFINERY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'plastic',
    name: 'Plastic',
    building: 'refinery',
    craftTime: 6,
    inputs:  [{ item: 'Crude Oil', perMin: 30 }],
    outputs: [
      { item: 'Plastic',          perMin: 20 },
      { item: 'Heavy Oil Residue', perMin: 10 },
    ],
  },
  {
    id: 'rubber',
    name: 'Rubber',
    building: 'refinery',
    craftTime: 6,
    inputs:  [{ item: 'Crude Oil', perMin: 30 }],
    outputs: [
      { item: 'Rubber',           perMin: 20 },
      { item: 'Heavy Oil Residue', perMin: 20 },
    ],
  },
  {
    id: 'fuel',
    name: 'Fuel',
    building: 'refinery',
    craftTime: 6,
    inputs:  [{ item: 'Crude Oil', perMin: 60 }],
    outputs: [
      { item: 'Fuel',           perMin: 40 },
      { item: 'Polymer Resin',  perMin: 30 },
    ],
  },
  {
    id: 'residualFuel',
    name: 'Residual Fuel',
    building: 'refinery',
    craftTime: 6,
    inputs:  [{ item: 'Heavy Oil Residue', perMin: 60 }],
    outputs: [{ item: 'Fuel',              perMin: 40 }],
  },
  {
    id: 'residualPlastic',
    name: 'Residual Plastic',
    building: 'refinery',
    craftTime: 6,
    inputs:  [
      { item: 'Polymer Resin', perMin: 60 },
      { item: 'Water',         perMin: 20 },
    ],
    outputs: [{ item: 'Plastic', perMin: 20 }],
  },
  {
    id: 'residualRubber',
    name: 'Residual Rubber',
    building: 'refinery',
    craftTime: 6,
    inputs:  [
      { item: 'Polymer Resin', perMin: 40 },
      { item: 'Water',         perMin: 40 },
    ],
    outputs: [{ item: 'Rubber', perMin: 20 }],
  },
  {
    id: 'petroleumCoke',
    name: 'Petroleum Coke',
    building: 'refinery',
    craftTime: 6,
    inputs:  [{ item: 'Heavy Oil Residue', perMin: 40 }],
    outputs: [{ item: 'Petroleum Coke',    perMin: 120 }],
  },
  {
    id: 'liquidBiofuel',
    name: 'Liquid Biofuel',
    building: 'refinery',
    craftTime: 4,
    inputs:  [
      { item: 'Solid Biofuel', perMin: 60 },
      { item: 'Water',         perMin: 30 },
    ],
    outputs: [{ item: 'Liquid Biofuel', perMin: 40 }],
  },
  {
    id: 'sulfuricAcid',
    name: 'Sulfuric Acid',
    building: 'refinery',
    craftTime: 6,
    inputs:  [
      { item: 'Sulfur', perMin: 50 },
      { item: 'Water',  perMin: 50 },
    ],
    outputs: [{ item: 'Sulfuric Acid', perMin: 50 }],
  },
  {
    id: 'aluminaSolution',
    name: 'Alumina Solution',
    building: 'refinery',
    craftTime: 6,
    inputs:  [
      { item: 'Bauxite', perMin: 120 },
      { item: 'Water',   perMin: 180 },
    ],
    outputs: [
      { item: 'Alumina Solution', perMin: 120 },
      { item: 'Silica',           perMin:  50 },
    ],
  },
  {
    id: 'aluminumScrap',
    name: 'Aluminum Scrap',
    building: 'refinery',
    craftTime: 1,
    inputs:  [
      { item: 'Alumina Solution', perMin: 240 },
      { item: 'Coal',             perMin: 120 },
    ],
    outputs: [
      { item: 'Aluminum Scrap', perMin: 360 },
      { item: 'Water',          perMin: 120 },
    ],
  },
  {
    id: 'wetConcrete',
    name: 'Wet Concrete',
    building: 'refinery',
    craftTime: 3,
    inputs:  [
      { item: 'Limestone', perMin: 120 },
      { item: 'Water',     perMin: 100 },
    ],
    outputs: [{ item: 'Concrete', perMin: 80 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLENDER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'battery',
    name: 'Battery',
    building: 'blender',
    craftTime: 3,
    inputs:  [
      { item: 'Sulfuric Acid',    perMin: 50 },
      { item: 'Alumina Solution', perMin: 40 },
      { item: 'Aluminum Casing',  perMin: 20 },
    ],
    outputs: [
      { item: 'Battery', perMin: 20 },
      { item: 'Water',   perMin: 30 },
    ],
  },
  {
    id: 'coolingSystem',
    name: 'Cooling System',
    building: 'blender',
    craftTime: 10,
    inputs:  [
      { item: 'Heat Sink',    perMin:  12 },
      { item: 'Rubber',       perMin:  12 },
      { item: 'Water',        perMin:  30 },
      { item: 'Nitrogen Gas', perMin: 150 },
    ],
    outputs: [{ item: 'Cooling System', perMin: 6 }],
  },
  {
    id: 'encasedUraniumCell',
    name: 'Encased Uranium Cell',
    building: 'blender',
    craftTime: 12,
    inputs:  [
      { item: 'Uranium',       perMin: 50 },
      { item: 'Concrete',      perMin: 15 },
      { item: 'Sulfuric Acid', perMin: 40 },
    ],
    outputs: [
      { item: 'Encased Uranium Cell', perMin: 25 },
      { item: 'Sulfuric Acid',        perMin: 10 },
    ],
  },
  {
    id: 'fusedModularFrame',
    name: 'Fused Modular Frame',
    building: 'blender',
    craftTime: 40,
    inputs:  [
      { item: 'Heavy Modular Frame', perMin:  1.5 },
      { item: 'Aluminum Casing',     perMin: 75 },
      { item: 'Nitrogen Gas',        perMin: 37.5 },
    ],
    outputs: [{ item: 'Fused Modular Frame', perMin: 1.5 }],
  },
  {
    id: 'nitricAcid',
    name: 'Nitric Acid',
    building: 'blender',
    craftTime: 6,
    inputs:  [
      { item: 'Nitrogen Gas', perMin: 120 },
      { item: 'Water',        perMin:  30 },
      { item: 'Iron Plate',   perMin:  10 },
    ],
    outputs: [{ item: 'Nitric Acid', perMin: 30 }],
  },
  {
    id: 'nonFissileUranium',
    name: 'Non-Fissile Uranium',
    building: 'blender',
    craftTime: 24,
    inputs:  [
      { item: 'Uranium Waste', perMin: 37.5 },
      { item: 'Silica',        perMin: 25 },
      { item: 'Nitric Acid',   perMin: 15 },
      { item: 'Sulfuric Acid', perMin: 15 },
    ],
    outputs: [
      { item: 'Non-Fissile Uranium', perMin: 50 },
      { item: 'Water',               perMin: 15 },
    ],
  },
  {
    id: 'rocketFuel',
    name: 'Rocket Fuel',
    building: 'blender',
    craftTime: 6,
    inputs:  [
      { item: 'Turbofuel',  perMin: 60 },
      { item: 'Nitric Acid', perMin: 10 },
    ],
    outputs: [
      { item: 'Rocket Fuel',   perMin: 100 },
      { item: 'Compacted Coal', perMin:  10 },
    ],
  },
  {
    id: 'turboRifleAmmoBlender',
    name: 'Turbo Rifle Ammo (Blender)',
    building: 'blender',
    craftTime: 12,
    inputs:  [
      { item: 'Rifle Ammo',      perMin: 125 },
      { item: 'Aluminum Casing', perMin:  15 },
      { item: 'Turbofuel',       perMin:  15 },
    ],
    outputs: [{ item: 'Turbo Rifle Ammo', perMin: 250 }],
  },
  {
    id: 'biochemicalSculptor',
    name: 'Biochemical Sculptor',
    building: 'blender',
    craftTime: 120,
    inputs:  [
      { item: 'Assembly Director System', perMin:  0.5 },
      { item: 'Ficsite Trigon',           perMin: 40 },
      { item: 'Water',                    perMin: 10 },
    ],
    outputs: [{ item: 'Biochemical Sculptor', perMin: 2 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PACKAGER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'packagedWater',
    name: 'Packaged Water',
    building: 'packager',
    craftTime: 2,
    inputs:  [
      { item: 'Water',          perMin: 60 },
      { item: 'Empty Canister', perMin: 60 },
    ],
    outputs: [{ item: 'Packaged Water', perMin: 60 }],
  },
  {
    id: 'packagedOil',
    name: 'Packaged Oil',
    building: 'packager',
    craftTime: 4,
    inputs:  [
      { item: 'Crude Oil',      perMin: 30 },
      { item: 'Empty Canister', perMin: 30 },
    ],
    outputs: [{ item: 'Packaged Oil', perMin: 30 }],
  },
  {
    id: 'packagedFuel',
    name: 'Packaged Fuel',
    building: 'packager',
    craftTime: 3,
    inputs:  [
      { item: 'Fuel',           perMin: 40 },
      { item: 'Empty Canister', perMin: 40 },
    ],
    outputs: [{ item: 'Packaged Fuel', perMin: 40 }],
  },
  {
    id: 'packagedHeavyOilResidue',
    name: 'Packaged Heavy Oil Residue',
    building: 'packager',
    craftTime: 4,
    inputs:  [
      { item: 'Heavy Oil Residue', perMin: 30 },
      { item: 'Empty Canister',    perMin: 30 },
    ],
    outputs: [{ item: 'Packaged Heavy Oil Residue', perMin: 30 }],
  },
  {
    id: 'packagedLiquidBiofuel',
    name: 'Packaged Liquid Biofuel',
    building: 'packager',
    craftTime: 3,
    inputs:  [
      { item: 'Liquid Biofuel', perMin: 40 },
      { item: 'Empty Canister', perMin: 40 },
    ],
    outputs: [{ item: 'Packaged Liquid Biofuel', perMin: 40 }],
  },
  {
    id: 'packagedTurbofuel',
    name: 'Packaged Turbofuel',
    building: 'packager',
    craftTime: 6,
    inputs:  [
      { item: 'Turbofuel',      perMin: 20 },
      { item: 'Empty Canister', perMin: 20 },
    ],
    outputs: [{ item: 'Packaged Turbofuel', perMin: 20 }],
  },
  {
    id: 'packagedAluminaSolution',
    name: 'Packaged Alumina Solution',
    building: 'packager',
    craftTime: 1,
    inputs:  [
      { item: 'Alumina Solution', perMin: 120 },
      { item: 'Empty Canister',   perMin: 120 },
    ],
    outputs: [{ item: 'Packaged Alumina Solution', perMin: 120 }],
  },
  {
    id: 'packagedSulfuricAcid',
    name: 'Packaged Sulfuric Acid',
    building: 'packager',
    craftTime: 3,
    inputs:  [
      { item: 'Sulfuric Acid',  perMin: 40 },
      { item: 'Empty Canister', perMin: 40 },
    ],
    outputs: [{ item: 'Packaged Sulfuric Acid', perMin: 40 }],
  },
  {
    id: 'packagedNitricAcid',
    name: 'Packaged Nitric Acid',
    building: 'packager',
    craftTime: 2,
    inputs:  [
      { item: 'Nitric Acid',    perMin: 30 },
      { item: 'Empty Fluid Tank', perMin: 30 },
    ],
    outputs: [{ item: 'Packaged Nitric Acid', perMin: 30 }],
  },
  {
    id: 'packagedNitrogenGas',
    name: 'Packaged Nitrogen Gas',
    building: 'packager',
    craftTime: 1,
    inputs:  [
      { item: 'Nitrogen Gas',   perMin: 240 },
      { item: 'Empty Fluid Tank', perMin: 60 },
    ],
    outputs: [{ item: 'Packaged Nitrogen Gas', perMin: 60 }],
  },
  {
    id: 'packagedRocketFuel',
    name: 'Packaged Rocket Fuel',
    building: 'packager',
    craftTime: 1,
    inputs:  [
      { item: 'Rocket Fuel',    perMin: 120 },
      { item: 'Empty Fluid Tank', perMin: 60 },
    ],
    outputs: [{ item: 'Packaged Rocket Fuel', perMin: 60 }],
  },
  {
    id: 'packagedIonizedFuel',
    name: 'Packaged Ionized Fuel',
    building: 'packager',
    craftTime: 3,
    inputs:  [
      { item: 'Ionized Fuel',   perMin: 80 },
      { item: 'Empty Fluid Tank', perMin: 40 },
    ],
    outputs: [{ item: 'Packaged Ionized Fuel', perMin: 40 }],
  },
  // Unpackage recipes
  {
    id: 'unpackageWater',
    name: 'Unpackage Water',
    building: 'packager',
    craftTime: 1,
    inputs:  [{ item: 'Packaged Water', perMin: 120 }],
    outputs: [
      { item: 'Water',          perMin: 120 },
      { item: 'Empty Canister', perMin: 120 },
    ],
  },
  {
    id: 'unpackageOil',
    name: 'Unpackage Oil',
    building: 'packager',
    craftTime: 2,
    inputs:  [{ item: 'Packaged Oil', perMin: 60 }],
    outputs: [
      { item: 'Crude Oil',      perMin: 60 },
      { item: 'Empty Canister', perMin: 60 },
    ],
  },
  {
    id: 'unpackageFuel',
    name: 'Unpackage Fuel',
    building: 'packager',
    craftTime: 2,
    inputs:  [{ item: 'Packaged Fuel', perMin: 60 }],
    outputs: [
      { item: 'Fuel',           perMin: 60 },
      { item: 'Empty Canister', perMin: 60 },
    ],
  },
  {
    id: 'unpackageHeavyOilResidue',
    name: 'Unpackage Heavy Oil Residue',
    building: 'packager',
    craftTime: 6,
    inputs:  [{ item: 'Packaged Heavy Oil Residue', perMin: 20 }],
    outputs: [
      { item: 'Heavy Oil Residue', perMin: 20 },
      { item: 'Empty Canister',    perMin: 20 },
    ],
  },
  {
    id: 'unpackageLiquidBiofuel',
    name: 'Unpackage Liquid Biofuel',
    building: 'packager',
    craftTime: 2,
    inputs:  [{ item: 'Packaged Liquid Biofuel', perMin: 60 }],
    outputs: [
      { item: 'Liquid Biofuel', perMin: 60 },
      { item: 'Empty Canister', perMin: 60 },
    ],
  },
  {
    id: 'unpackageTurbofuel',
    name: 'Unpackage Turbofuel',
    building: 'packager',
    craftTime: 6,
    inputs:  [{ item: 'Packaged Turbofuel', perMin: 20 }],
    outputs: [
      { item: 'Turbofuel',      perMin: 20 },
      { item: 'Empty Canister', perMin: 20 },
    ],
  },
  {
    id: 'unpackageAluminaSolution',
    name: 'Unpackage Alumina Solution',
    building: 'packager',
    craftTime: 1,
    inputs:  [{ item: 'Packaged Alumina Solution', perMin: 120 }],
    outputs: [
      { item: 'Alumina Solution', perMin: 120 },
      { item: 'Empty Canister',   perMin: 120 },
    ],
  },
  {
    id: 'unpackageSulfuricAcid',
    name: 'Unpackage Sulfuric Acid',
    building: 'packager',
    craftTime: 1,
    inputs:  [{ item: 'Packaged Sulfuric Acid', perMin: 60 }],
    outputs: [
      { item: 'Sulfuric Acid',  perMin: 60 },
      { item: 'Empty Canister', perMin: 60 },
    ],
  },
  {
    id: 'unpackageNitricAcid',
    name: 'Unpackage Nitric Acid',
    building: 'packager',
    craftTime: 3,
    inputs:  [{ item: 'Packaged Nitric Acid', perMin: 20 }],
    outputs: [
      { item: 'Nitric Acid',    perMin: 20 },
      { item: 'Empty Fluid Tank', perMin: 20 },
    ],
  },
  {
    id: 'unpackageNitrogenGas',
    name: 'Unpackage Nitrogen Gas',
    building: 'packager',
    craftTime: 1,
    inputs:  [{ item: 'Packaged Nitrogen Gas', perMin: 60 }],
    outputs: [
      { item: 'Nitrogen Gas',   perMin: 240 },
      { item: 'Empty Fluid Tank', perMin: 60 },
    ],
  },
  {
    id: 'unpackageRocketFuel',
    name: 'Unpackage Rocket Fuel',
    building: 'packager',
    craftTime: 1,
    inputs:  [{ item: 'Packaged Rocket Fuel', perMin: 60 }],
    outputs: [
      { item: 'Rocket Fuel',    perMin: 120 },
      { item: 'Empty Fluid Tank', perMin: 60 },
    ],
  },
  {
    id: 'unpackageIonizedFuel',
    name: 'Unpackage Ionized Fuel',
    building: 'packager',
    craftTime: 3,
    inputs:  [{ item: 'Packaged Ionized Fuel', perMin: 40 }],
    outputs: [
      { item: 'Ionized Fuel',   perMin: 80 },
      { item: 'Empty Fluid Tank', perMin: 40 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTICLE ACCELERATOR
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'diamonds',
    name: 'Diamonds',
    building: 'particleAccelerator',
    craftTime: 2,
    inputs:  [{ item: 'Coal', perMin: 600 }],
    outputs: [{ item: 'Diamonds', perMin: 30 }],
  },
  {
    id: 'darkMatterCrystal',
    name: 'Dark Matter Crystal',
    building: 'particleAccelerator',
    craftTime: 2,
    inputs:  [
      { item: 'Diamonds',           perMin:  30 },
      { item: 'Dark Matter Residue', perMin: 150 },
    ],
    outputs: [{ item: 'Dark Matter Crystal', perMin: 30 }],
  },
  {
    id: 'nuclearPasta',
    name: 'Nuclear Pasta',
    building: 'particleAccelerator',
    craftTime: 120,
    inputs:  [
      { item: 'Copper Powder',         perMin: 100 },
      { item: 'Pressure Conversion Cube', perMin: 0.5 },
    ],
    outputs: [{ item: 'Nuclear Pasta', perMin: 0.5 }],
  },
  {
    id: 'plutoniumPellet',
    name: 'Plutonium Pellet',
    building: 'particleAccelerator',
    craftTime: 60,
    inputs:  [
      { item: 'Non-Fissile Uranium', perMin: 100 },
      { item: 'Uranium Waste',       perMin:  25 },
    ],
    outputs: [{ item: 'Plutonium Pellet', perMin: 30 }],
  },
  {
    id: 'ficsonium',
    name: 'Ficsonium',
    building: 'particleAccelerator',
    craftTime: 6,
    inputs:  [
      { item: 'Plutonium Waste',     perMin:  10 },
      { item: 'Singularity Cell',    perMin:  10 },
      { item: 'Dark Matter Residue', perMin: 200 },
    ],
    outputs: [{ item: 'Ficsonium', perMin: 10 }],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUANTUM ENCODER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'superpositionOscillator',
    name: 'Superposition Oscillator',
    building: 'quantumEncoder',
    craftTime: 12,
    inputs:  [
      { item: 'Dark Matter Crystal',   perMin:  30 },
      { item: 'Crystal Oscillator',    perMin:   5 },
      { item: 'Alclad Aluminum Sheet', perMin:  45 },
      { item: 'Excited Photonic Matter', perMin: 125 },
    ],
    outputs: [
      { item: 'Superposition Oscillator', perMin:   5 },
      { item: 'Dark Matter Residue',      perMin: 125 },
    ],
  },
  {
    id: 'neuralQuantumProcessor',
    name: 'Neural-Quantum Processor',
    building: 'quantumEncoder',
    craftTime: 20,
    inputs:  [
      { item: 'Time Crystal',           perMin:  15 },
      { item: 'Supercomputer',          perMin:   3 },
      { item: 'Ficsite Trigon',         perMin:  45 },
      { item: 'Excited Photonic Matter', perMin:  75 },
    ],
    outputs: [
      { item: 'Neural-Quantum Processor', perMin:   3 },
      { item: 'Dark Matter Residue',      perMin:  75 },
    ],
  },
  {
    id: 'aiExpansionServer',
    name: 'AI Expansion Server',
    building: 'quantumEncoder',
    craftTime: 15,
    inputs:  [
      { item: 'Magnetic Field Generator', perMin:   4 },
      { item: 'Neural-Quantum Processor', perMin:   4 },
      { item: 'Superposition Oscillator', perMin:   4 },
      { item: 'Excited Photonic Matter',  perMin: 100 },
    ],
    outputs: [
      { item: 'AI Expansion Server',  perMin:   4 },
      { item: 'Dark Matter Residue',  perMin: 100 },
    ],
  },
  {
    id: 'alienPowerMatrix',
    name: 'Alien Power Matrix',
    building: 'quantumEncoder',
    craftTime: 24,
    inputs:  [
      { item: 'SAM Fluctuator',         perMin: 12.5 },
      { item: 'Power Shard',            perMin:  7.5 },
      { item: 'Superposition Oscillator', perMin:  7.5 },
      { item: 'Excited Photonic Matter', perMin: 60 },
    ],
    outputs: [
      { item: 'Alien Power Matrix',  perMin:  2.5 },
      { item: 'Dark Matter Residue', perMin: 60 },
    ],
  },
  {
    id: 'ficsoniumFuelRod',
    name: 'Ficsonium Fuel Rod',
    building: 'quantumEncoder',
    craftTime: 24,
    inputs:  [
      { item: 'Ficsonium',               perMin:   5 },
      { item: 'Electromagnetic Control Rod', perMin: 5 },
      { item: 'Ficsite Trigon',          perMin: 100 },
      { item: 'Excited Photonic Matter', perMin:  50 },
    ],
    outputs: [
      { item: 'Ficsonium Fuel Rod',  perMin:  2.5 },
      { item: 'Dark Matter Residue', perMin: 50 },
    ],
  },
  {
    id: 'syntheticPowerShard',
    name: 'Synthetic Power Shard',
    building: 'quantumEncoder',
    craftTime: 12,
    inputs:  [
      { item: 'Time Crystal',           perMin: 10 },
      { item: 'Dark Matter Crystal',    perMin: 10 },
      { item: 'Quartz Crystal',         perMin: 60 },
      { item: 'Excited Photonic Matter', perMin: 60 },
    ],
    outputs: [
      { item: 'Power Shard',         perMin:  5 },
      { item: 'Dark Matter Residue', perMin: 60 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERTER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'excitedPhotonicMatter',
    name: 'Excited Photonic Matter',
    building: 'converter',
    craftTime: 3,
    inputs:  [],
    outputs: [{ item: 'Excited Photonic Matter', perMin: 200 }],
  },
  {
    id: 'darkMatterResidue',
    name: 'Dark Matter Residue',
    building: 'converter',
    craftTime: 6,
    inputs:  [{ item: 'Reanimated SAM', perMin: 50 }],
    outputs: [{ item: 'Dark Matter Residue', perMin: 100 }],
  },
  {
    id: 'timeCrystal',
    name: 'Time Crystal',
    building: 'converter',
    craftTime: 10,
    inputs:  [{ item: 'Diamonds', perMin: 12 }],
    outputs: [{ item: 'Time Crystal', perMin: 6 }],
  },
  {
    id: 'ficsiteIngotIron',
    name: 'Ficsite Ingot (Iron)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  40 },
      { item: 'Iron Ingot',     perMin: 240 },
    ],
    outputs: [{ item: 'Ficsite Ingot', perMin: 10 }],
  },
  {
    id: 'ficsiteIngotAluminum',
    name: 'Ficsite Ingot (Aluminum)',
    building: 'converter',
    craftTime: 2,
    inputs:  [
      { item: 'Reanimated SAM',  perMin:  60 },
      { item: 'Aluminum Ingot',  perMin: 120 },
    ],
    outputs: [{ item: 'Ficsite Ingot', perMin: 30 }],
  },
  {
    id: 'ficsiteIngotCaterium',
    name: 'Ficsite Ingot (Caterium)',
    building: 'converter',
    craftTime: 4,
    inputs:  [
      { item: 'Reanimated SAM',   perMin: 45 },
      { item: 'Caterium Ingot',   perMin: 60 },
    ],
    outputs: [{ item: 'Ficsite Ingot', perMin: 15 }],
  },
  // Ore conversion recipes (SAM-powered)
  {
    id: 'coalFromIron',
    name: 'Coal (Iron)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Iron Ore',       perMin: 180 },
    ],
    outputs: [{ item: 'Coal', perMin: 120 }],
  },
  {
    id: 'coalFromLimestone',
    name: 'Coal (Limestone)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Limestone',      perMin: 360 },
    ],
    outputs: [{ item: 'Coal', perMin: 120 }],
  },
  {
    id: 'bauxiteFromCaterium',
    name: 'Bauxite (Caterium)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Caterium Ore',   perMin: 150 },
    ],
    outputs: [{ item: 'Bauxite', perMin: 120 }],
  },
  {
    id: 'bauxiteFromCopper',
    name: 'Bauxite (Copper)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Copper Ore',     perMin: 180 },
    ],
    outputs: [{ item: 'Bauxite', perMin: 120 }],
  },
  {
    id: 'cateriumOreFromCopper',
    name: 'Caterium Ore (Copper)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Copper Ore',     perMin: 150 },
    ],
    outputs: [{ item: 'Caterium Ore', perMin: 120 }],
  },
  {
    id: 'cateriumOreFromQuartz',
    name: 'Caterium Ore (Quartz)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Raw Quartz',     perMin: 120 },
    ],
    outputs: [{ item: 'Caterium Ore', perMin: 120 }],
  },
  {
    id: 'copperOreFromQuartz',
    name: 'Copper Ore (Quartz)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Raw Quartz',     perMin: 100 },
    ],
    outputs: [{ item: 'Copper Ore', perMin: 120 }],
  },
  {
    id: 'copperOreFromSulfur',
    name: 'Copper Ore (Sulfur)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Sulfur',         perMin: 120 },
    ],
    outputs: [{ item: 'Copper Ore', perMin: 120 }],
  },
  {
    id: 'ironOreFromLimestone',
    name: 'Iron Ore (Limestone)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Limestone',      perMin: 240 },
    ],
    outputs: [{ item: 'Iron Ore', perMin: 120 }],
  },
  {
    id: 'limestoneFromSulfur',
    name: 'Limestone (Sulfur)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin: 10 },
      { item: 'Sulfur',         perMin: 20 },
    ],
    outputs: [{ item: 'Limestone', perMin: 120 }],
  },
  {
    id: 'nitrogenGasFromBauxite',
    name: 'Nitrogen Gas (Bauxite)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Bauxite',        perMin: 100 },
    ],
    outputs: [{ item: 'Nitrogen Gas', perMin: 120 }],
  },
  {
    id: 'nitrogenGasFromCaterium',
    name: 'Nitrogen Gas (Caterium)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Caterium Ore',   perMin: 120 },
    ],
    outputs: [{ item: 'Nitrogen Gas', perMin: 120 }],
  },
  {
    id: 'rawQuartzFromBauxite',
    name: 'Raw Quartz (Bauxite)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Bauxite',        perMin: 100 },
    ],
    outputs: [{ item: 'Raw Quartz', perMin: 120 }],
  },
  {
    id: 'rawQuartzFromCoal',
    name: 'Raw Quartz (Coal)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Coal',           perMin: 240 },
    ],
    outputs: [{ item: 'Raw Quartz', perMin: 120 }],
  },
  {
    id: 'sulfurFromCoal',
    name: 'Sulfur (Coal)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Coal',           perMin: 200 },
    ],
    outputs: [{ item: 'Sulfur', perMin: 120 }],
  },
  {
    id: 'sulfurFromIron',
    name: 'Sulfur (Iron)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Iron Ore',       perMin: 300 },
    ],
    outputs: [{ item: 'Sulfur', perMin: 120 }],
  },
  {
    id: 'uraniumOreFromBauxite',
    name: 'Uranium Ore (Bauxite)',
    building: 'converter',
    craftTime: 6,
    inputs:  [
      { item: 'Reanimated SAM', perMin:  10 },
      { item: 'Bauxite',        perMin: 480 },
    ],
    outputs: [{ item: 'Uranium', perMin: 120 }],
  },

]

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/** Map from recipe id → recipe */
export const RECIPES_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]))

/** Map from output item name → array of recipes that produce it */
export const RECIPES_BY_OUTPUT = RECIPES.reduce((acc, r) => {
  for (const { item } of r.outputs) {
    if (!acc[item]) acc[item] = []
    acc[item].push(r)
  }
  return acc
}, {})

/** All unique building type keys referenced by recipes */
export const RECIPE_BUILDINGS = [...new Set(RECIPES.map(r => r.building))]

export default RECIPES
