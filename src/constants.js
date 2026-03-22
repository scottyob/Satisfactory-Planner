export const CELL_SIZE = 40
export const GRID_CELLS = 250
export const GRID_PX = CELL_SIZE * GRID_CELLS
export const PANEL_WIDTH = 236
export const TOOLBAR_HEIGHT = 44

// Belt tier throughput limits (items/min)
export const BELT_SPEEDS = { 1: 60, 2: 120, 3: 270, 4: 480, 5: 780, 6: 1200 }

// Sorted [tier, speed] pairs for minimum-tier lookup
const _BELT_TIERS_SORTED = Object.entries(BELT_SPEEDS)
  .map(([t, s]) => [Number(t), s])
  .sort((a, b) => a[1] - b[1])

/**
 * Return the minimum belt tier whose speed covers `rate` items/min.
 * Falls back to the highest tier if rate exceeds all.
 */
export function effectiveBeltTier(rate) {
  for (const [tier, speed] of _BELT_TIERS_SORTED) {
    if (speed >= rate - 0.01) return tier
  }
  return _BELT_TIERS_SORTED[_BELT_TIERS_SORTED.length - 1][0]
}
