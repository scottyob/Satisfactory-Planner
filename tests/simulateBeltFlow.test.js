import { vi, describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// LayersPanel imports React and a PNG asset — neither are available in Node.
// simulateBeltFlow only uses BUILDINGS_BY_KEY (from buildings.js, imported directly),
// so the connector/foundation data from LayersPanel can be empty stubs.
vi.mock('../src/LayersPanel', () => ({
  CONNECTORS_BY_KEY: {},
  FOUNDATIONS_BY_KEY: {},
  floorTextureUrl: '',
}))

import { simulateBeltFlow } from '../src/portUtils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(__dirname, 'complexMerge.json'), 'utf8'))

// ─── Iron Plate (constructor, 100% clock) ────────────────────────────────────
// Recipe: 30 Iron Ingots/min → 20 Iron Plates/min
// Constructor 3 runs at 0.5× clock → needs 15/min
// Constructors 4, 6, 7, 9 run at 1× clock → each needs 30/min

// ─── Iron Rod (constructor, 100% clock) ──────────────────────────────────────
// Recipe: 15 Iron Ingots/min → 15 Iron Rods/min
// Constructors 32, 40, 50, 68, 69, 70, 77 — each needs 15/min

// ─── Supply ──────────────────────────────────────────────────────────────────
// Two floor_inputs: 120/min each → 240/min total
// Total demand: 135 (plates) + 105 (rods) = 240/min — supply exactly matches demand.
//
// Under demand-driven (backward-pass) flow:
//
//   Merger 108 needs 45/min for constructors 3+6.
//   With the equal-split merger fix, it draws 22.5/min from each of its two inputs
//   (splitter 12 and splitter 105), instead of 45/min from each (which was starving
//   the rods by diverting 45/min too many from splitter 105).
//
//   Result after fix:
//     • Plates: all 5 constructors exactly satisfied ✓
//     • Rods 68, 69, 70, 40, 32: exactly 15/min each ✓
//     • Rods 50, 77: 11.25/min each — genuine topology deficit.
//       Splitter 105 provides 22.5 to the merger and 97.5 to rods.
//       Rods need 105; the 7.5/min shortfall falls on the deepest machines
//       (constructors 50 and 77, fed through splitter 79) because there is
//       no path from the spare capacity on the input-1 side to those machines.

describe('simulateBeltFlow — complexMerge topology', () => {
  it('satisfies all plate constructors under demand-driven flow', () => {
    const { portActualIn } = simulateBeltFlow(fixture.belts, fixture.objects)

    // Iron Plate constructors — portActualIn key: `${objId}:${inputPortIdx}`
    expect(portActualIn.get('3:0')).toBeCloseTo(15)   // 0.5× clock
    expect(portActualIn.get('4:0')).toBeCloseTo(30)
    expect(portActualIn.get('6:0')).toBeCloseTo(30)
    expect(portActualIn.get('7:0')).toBeCloseTo(30)
    expect(portActualIn.get('9:0')).toBeCloseTo(30)
  })

  it('satisfies five of seven rod constructors under demand-driven flow', () => {
    const { portActualIn } = simulateBeltFlow(fixture.belts, fixture.objects)

    // Fully fed
    expect(portActualIn.get('68:0')).toBeCloseTo(15)
    expect(portActualIn.get('69:0')).toBeCloseTo(15)
    expect(portActualIn.get('70:0')).toBeCloseTo(15)
    expect(portActualIn.get('40:0')).toBeCloseTo(15)
    expect(portActualIn.get('32:0')).toBeCloseTo(15)

    // Topology deficit: splitter 105 can only route 97.5/min to rods (120 − 22.5 for merger).
    // The 7.5/min shortfall concentrates at the two deepest machines via splitter 79.
    expect(portActualIn.get('50:0')).toBeCloseTo(11.25)
    expect(portActualIn.get('77:0')).toBeCloseTo(11.25)
  })

  it('routes the correct items through each belt', () => {
    const { itemByBelt } = simulateBeltFlow(fixture.belts, fixture.objects)

    // Every belt should carry Iron Ingots (the only input item in this layout)
    // except for the output belts from constructors, which carry plates or rods.
    // Spot-check a few input belts going into constructors.
    const beltToConstructor3  = fixture.belts.find(b => b.toObjId === 3)
    const beltToConstructor68 = fixture.belts.find(b => b.toObjId === 68)
    expect(itemByBelt.get(beltToConstructor3.id)).toBe('Iron Ingot')
    expect(itemByBelt.get(beltToConstructor68.id)).toBe('Iron Ingot')
  })
})
