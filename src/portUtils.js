import { CELL_SIZE } from './constants'
import { BUILDINGS_BY_KEY } from './buildings'
import { CONNECTORS_BY_KEY } from './LayersPanel'
import { RECIPES_BY_ID } from './recipes'

export const ALL_BUILDINGS_BY_KEY = { ...BUILDINGS_BY_KEY, ...CONNECTORS_BY_KEY }

// ─── Belt group BFS ───────────────────────────────────────────────────────────

const PASS_THROUGH = new Set(['connection_point', 'splitter', 'merger'])

/**
 * BFS from one belt, expanding through pass-through connectors.
 * Returns { beltIds, connectorIds, connTypes, sources, sinks }
 */
export function computeBeltGroup(startBeltId, belts, objects) {
  const startBelt = belts.find(b => b.id === startBeltId)
  if (!startBelt) return null

  const objsById = Object.fromEntries(objects.map(o => [o.id, o]))

  const visitedBeltIds = new Set([startBeltId])
  const visitedConnIds = new Set()
  const queue = [startBelt]

  let i = 0
  while (i < queue.length) {
    const belt = queue[i++]

    for (const endObjId of [belt.toObjId, belt.fromObjId]) {
      const endObj = objsById[endObjId]
      if (!endObj || !PASS_THROUGH.has(endObj.type) || visitedConnIds.has(endObj.id)) continue
      visitedConnIds.add(endObj.id)
      for (const b of belts) {
        if ((b.fromObjId === endObj.id || b.toObjId === endObj.id) && !visitedBeltIds.has(b.id)) {
          visitedBeltIds.add(b.id)
          queue.push(b)
        }
      }
    }
  }

  // Tally connector types
  const connTypes = {}
  for (const connId of visitedConnIds) {
    const obj = objsById[connId]
    if (obj) connTypes[obj.type] = (connTypes[obj.type] ?? 0) + 1
  }

  // Compute sources and sinks
  const sources = []
  const sinks   = []

  for (const beltId of visitedBeltIds) {
    const belt    = belts.find(b => b.id === beltId)
    if (!belt) continue
    const fromObj = objsById[belt.fromObjId]
    const toObj   = objsById[belt.toObjId]

    if (fromObj && !PASS_THROUGH.has(fromObj.type)) {
      if (BUILDINGS_BY_KEY[fromObj.type] && fromObj.recipeId) {
        const recipe = RECIPES_BY_ID[fromObj.recipeId]
        const out    = recipe?.outputs[belt.fromPortIdx]
        if (out) sources.push({ item: out.item, rate: out.perMin * (fromObj.clockSpeed ?? 1) })
      } else if (fromObj.type === 'floor_input' && fromObj.item) {
        sources.push({ item: fromObj.item, rate: fromObj.ratePerMin ?? 60 })
      }
    }

    if (toObj && !PASS_THROUGH.has(toObj.type)) {
      if (BUILDINGS_BY_KEY[toObj.type] && toObj.recipeId) {
        const recipe = RECIPES_BY_ID[toObj.recipeId]
        const inp    = recipe?.inputs[belt.toPortIdx]
        if (inp) sinks.push({ item: inp.item, rate: inp.perMin * (toObj.clockSpeed ?? 1) })
      } else if (toObj.type === 'floor_output') {
        sinks.push({ item: null, rate: 0 })
      }
    }
  }

  return { beltIds: visitedBeltIds, connectorIds: visitedConnIds, connTypes, sources, sinks }
}

/**
 * Compute the world-space position of a port's attachment point (edge center).
 * obj must have { x, y, rotation, type }. portDef must have { position: { side, offset } }.
 */
export function getPortWorldPos(obj, portDef) {
  if (obj.type === 'connection_point') return { x: obj.x, y: obj.y }
  const def = ALL_BUILDINGS_BY_KEY[obj.type]
  if (!def) return { x: obj.x, y: obj.y }
  const hw = (def.w * CELL_SIZE) / 2
  const hh = (def.h * CELL_SIZE) / 2
  const { side, offset } = portDef.position
  const ox = offset * CELL_SIZE
  let lx, ly
  if (side === 'north')      { lx = ox;  ly = -hh }
  else if (side === 'south') { lx = ox;  ly =  hh }
  else if (side === 'east')  { lx =  hw; ly = ox  }
  else                       { lx = -hw; ly = ox  }
  const rad = (obj.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: obj.x + lx * cos - ly * sin,
    y: obj.y + lx * sin + ly * cos,
  }
}

const SNAP_DISTANCE = CELL_SIZE * 3

/**
 * Find the nearest unoccupied input port (matching portType) within SNAP_DISTANCE.
 * Returns { obj, portIdx } or null.
 */
export function findNearestInputPort(wx, wy, objects, layerId, portType, belts) {
  let best = null
  let bestDist = SNAP_DISTANCE
  for (const obj of objects) {
    if (obj.layerId !== layerId) continue
    const def = ALL_BUILDINGS_BY_KEY[obj.type]
    if (!def) continue
    def.inputs.forEach((portDef, idx) => {
      if (portDef.type !== portType) return
      if (belts.some(b => b.toObjId === obj.id && b.toPortIdx === idx)) return
      const pos = getPortWorldPos(obj, portDef)
      const dist = Math.hypot(wx - pos.x, wy - pos.y)
      if (dist < bestDist) {
        best = { obj, portIdx: idx }
        bestDist = dist
      }
    })
  }
  return best
}
