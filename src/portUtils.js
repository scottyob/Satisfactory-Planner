import { CELL_SIZE, BELT_SPEEDS } from './constants'
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
 * Simulate belt flow through the network using a topological propagation.
 * Respects splitter even-distribution, merger summation, and belt tier speed caps.
 *
 * Returns:
 *   flowByBelt  — Map<beltId, rate>               actual rate flowing through each belt
 *   portActualIn — Map<`${objId}:${portIdx}`, rate>  actual rate arriving at each building input port
 */
export function simulateBeltFlow(belts, objects) {
  const objsById = Object.fromEntries(objects.map(o => [o.id, o]))
  const capBelt = (belt, rate) => {
    const cap = belt.beltTier ? (BELT_SPEEDS[belt.beltTier] ?? Infinity) : Infinity
    return Math.min(rate, cap)
  }

  // Index belts by object
  const inBeltsForObj  = {}
  const outBeltsForObj = {}
  for (const obj of objects) {
    inBeltsForObj[obj.id]  = []
    outBeltsForObj[obj.id] = []
  }
  for (const belt of belts) {
    if (inBeltsForObj[belt.toObjId])    inBeltsForObj[belt.toObjId].push(belt)
    if (outBeltsForObj[belt.fromObjId]) outBeltsForObj[belt.fromObjId].push(belt)
  }

  // Kahn's topological sort (handles cycles by skipping unresolved nodes)
  const inDegree = {}
  for (const obj of objects) inDegree[obj.id] = 0
  for (const belt of belts) {
    if (objsById[belt.toObjId]) inDegree[belt.toObjId]++
  }
  const queue = objects.filter(o => inDegree[o.id] === 0).map(o => o.id)
  const order = []
  const visited = new Set()
  while (queue.length > 0) {
    const id = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    order.push(id)
    for (const belt of outBeltsForObj[id] ?? []) {
      inDegree[belt.toObjId]--
      if (inDegree[belt.toObjId] === 0) queue.push(belt.toObjId)
    }
  }

  // Propagate flows in topological order
  const flowByBelt   = new Map() // beltId → rate
  const portActualIn = new Map() // `${objId}:${portIdx}` → rate

  for (const id of order) {
    const obj = objsById[id]
    if (!obj) continue
    const inBelts  = inBeltsForObj[id]  ?? []
    const outBelts = outBeltsForObj[id] ?? []
    const totalIn  = () => inBelts.reduce((s, b) => s + (flowByBelt.get(b.id) ?? 0), 0)

    if (obj.type === 'floor_input') {
      const rate = obj.ratePerMin ?? 60
      for (const b of outBelts) flowByBelt.set(b.id, capBelt(b, rate))

    } else if (obj.type === 'splitter') {
      const nOut = outBelts.length
      if (nOut > 0) {
        const perOut = totalIn() / nOut
        for (const b of outBelts) flowByBelt.set(b.id, capBelt(b, perOut))
      }

    } else if (obj.type === 'merger' || obj.type === 'connection_point') {
      const sum = totalIn()
      for (const b of outBelts) flowByBelt.set(b.id, capBelt(b, sum))

    } else if (BUILDINGS_BY_KEY[obj.type]) {
      // Record actual input rates at each port
      for (const b of inBelts) {
        portActualIn.set(`${id}:${b.toPortIdx}`, flowByBelt.get(b.id) ?? 0)
      }
      const recipe = obj.recipeId ? RECIPES_BY_ID[obj.recipeId] : null
      if (recipe) {
        const clockSpeed = obj.clockSpeed ?? 1
        // Effective factor = bottleneck input ratio across all inputs
        let effectiveFactor = 1
        for (let i = 0; i < recipe.inputs.length; i++) {
          const required = recipe.inputs[i].perMin * clockSpeed
          if (required > 0) {
            const actual = portActualIn.get(`${id}:${i}`) ?? 0
            effectiveFactor = Math.min(effectiveFactor, actual / required)
          }
        }
        effectiveFactor = Math.max(0, Math.min(1, effectiveFactor))
        for (const b of outBelts) {
          const out = recipe.outputs[b.fromPortIdx]
          if (out) flowByBelt.set(b.id, capBelt(b, out.perMin * clockSpeed * effectiveFactor))
        }
      }
    }
  }

  return { flowByBelt, portActualIn }
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
