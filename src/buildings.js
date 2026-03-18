// Satisfactory 1.0 – Building definitions
// Source: satisfactory.wiki.gg (March 2026)
//
// Each building object:
//   key       – unique camelCase key (matches recipe.building)
//   label     – short display label
//   color     – hex color for canvas rendering
//   w         – width in grid cells (foundations)
//   h         – height in grid cells (foundations)
//   inputs    – [{ type, position }]   type: 'belt' | 'pipe'
//   outputs   – [{ type, position }]   type: 'belt' | 'pipe'
//
// position is { side: 'north'|'south'|'east'|'west', offset: number }
// where offset is in grid cells from the center of that side.
// position: null means TBD — not yet mapped.

const BUILDINGS = [

  {
    key:    'smelter',
    label:  'Smelter',
    color:  '#e87c13',
    w: 5,
    h: 9,
    inputs: [
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'foundry',
    label:  'Foundry',
    color:  '#c06a10',
    w: 10,
    h: 9,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'constructor',
    label:  'Constructor',
    color:  '#e87c13',
    w: 8,
    h: 10,
    inputs: [
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'assembler',
    label:  'Assembler',
    color:  '#4a9eda',
    w: 10,
    h: 15,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'manufacturer',
    label:  'Manufacturer',
    color:  '#3a7abf',
    w: 18,
    h: 20,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'refinery',
    label:  'Refinery',
    color:  '#2a9d8f',
    w: 10,
    h: 20,
    inputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
  },

  {
    key:    'blender',
    label:  'Blender',
    color:  '#21867a',
    w: 18,
    h: 16,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
      { type: 'pipe', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
  },

  {
    key:    'packager',
    label:  'Packager',
    color:  '#e9c46a',
    w: 8,
    h: 8,
    inputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
  },

  {
    key:    'particleAccelerator',
    label:  'Part. Accel.',
    color:  '#9b5de5',
    w: 26,
    h: 38,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
    ],
  },

  {
    key:    'quantumEncoder',
    label:  'Quantum Enc.',
    color:  '#7b2d8b',
    w: 20,
    h: 20,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
      { type: 'pipe', position: null },
    ],
  },

  {
    key:    'converter',
    label:  'Converter',
    color:  '#f4a261',
    w: 10,
    h: 10,
    inputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
    ],
    outputs: [
      { type: 'belt', position: null },
      { type: 'belt', position: null },
    ],
  },

]

export default BUILDINGS
export const BUILDINGS_BY_KEY = Object.fromEntries(BUILDINGS.map(b => [b.key, b]))
