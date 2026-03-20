import { CELL_SIZE, BELT_SPEEDS } from './constants'
import { BUILDINGS_BY_KEY } from './buildings'
import { CONNECTORS_BY_KEY, FOUNDATIONS_BY_KEY } from './LayersPanel'
import { RECIPES_BY_ID } from './recipes'

export const ALL_BUILDINGS_BY_KEY = { ...BUILDINGS_BY_KEY, ...CONNECTORS_BY_KEY, ...FOUNDATIONS_BY_KEY }

// ─── Belt group BFS ───────────────────────────────────────────────────────────

const PASS_THROUGH = new Set(['connection_point', 'splitter', 'merger'])

/**
 * BFS from one belt, expanding through pass-through connectors.
 * Returns { beltIds, connectorIds, connTypes, sources, sinks }
 */
export function computeBeltGroup(startBeltId, belts, objects, flowByBelt = null, portActualIn = null, itemByBelt = null) {
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
        if (out) {
          const rate = flowByBelt?.get(beltId) ?? out.perMin * (fromObj.clockSpeed ?? 1)
          sources.push({ item: out.item, rate })
        }
      } else if (fromObj.type === 'floor_input' && fromObj.item) {
        // Always use configured production rate — belt may carry less due to backpressure,
        // but the source is producing this much regardless
        sources.push({ item: fromObj.item, rate: fromObj.ratePerMin ?? 60 })
      }
    }

    if (toObj && !PASS_THROUGH.has(toObj.type)) {
      if (BUILDINGS_BY_KEY[toObj.type] && toObj.recipeId) {
        const recipe = RECIPES_BY_ID[toObj.recipeId]
        const inp    = recipe?.inputs[belt.toPortIdx]
        if (inp) {
          const rate = inp.perMin * (toObj.clockSpeed ?? 1)
          sinks.push({ item: inp.item, rate })
        }
      } else if (toObj.type === 'floor_output') {
        const rate = flowByBelt?.get(beltId) ?? 0
        const item = itemByBelt?.get(beltId) ?? null
        sinks.push({ item, rate })
      }
    }
  }

  return { beltIds: visitedBeltIds, connectorIds: visitedConnIds, connTypes, sources, sinks }
}

/**
 * Distribute `available` supply among outputs using fair-share with demand caps.
 * Outputs that demand less than their fair share free up their remainder for others.
 */
function distributeSplitter(available, demands) {
  const allocated = new Array(demands.length).fill(0)
  let remaining = available
  let pending   = demands.map((_, i) => i)
  while (pending.length > 0 && remaining > 1e-9) {
    const fairShare = remaining / pending.length
    const next = []
    let consumed = 0
    for (const i of pending) {
      if (demands[i] <= fairShare + 1e-9) { allocated[i] = demands[i]; consumed += demands[i] }
      else next.push(i)
    }
    if (next.length === pending.length) { for (const i of next) allocated[i] = fairShare; break }
    remaining -= consumed
    pending = next
  }
  return allocated
}

/**
 * Simulate belt flow with backpressure:
 *   1. Backward pass  — propagate downstream demand toward sources
 *   2. Forward pass   — route supply only as far as it is demanded
 *
 * Splitters redistribute excess capacity from low-demand outputs to high-demand ones.
 * Floor_inputs are throttled to actual demand (not configured rate) so belts reflect
 * steady-state flow; use `obj.ratePerMin` directly for configured-production figures.
 *
 * Returns:
 *   flowByBelt   — Map<beltId, rate>
 *   itemByBelt   — Map<beltId, itemString>
 *   portActualIn — Map<`${objId}:${portIdx}`, rate>  actual consumption at each input port
 */
export function simulateBeltFlow(belts, objects) {
  const objsById = Object.fromEntries(objects.map(o => [o.id, o]))
  const capBelt  = (belt, rate) => {
    const cap = belt.beltTier ? (BELT_SPEEDS[belt.beltTier] ?? Infinity) : Infinity
    return Math.min(rate, cap)
  }

  // Index belts by object
  const inBeltsForObj  = {}
  const outBeltsForObj = {}
  for (const obj of objects) { inBeltsForObj[obj.id] = []; outBeltsForObj[obj.id] = [] }
  for (const belt of belts) {
    if (inBeltsForObj[belt.toObjId])    inBeltsForObj[belt.toObjId].push(belt)
    if (outBeltsForObj[belt.fromObjId]) outBeltsForObj[belt.fromObjId].push(belt)
  }

  // Kahn's topological sort
  const inDegree = {}
  for (const obj of objects) inDegree[obj.id] = 0
  for (const belt of belts) { if (objsById[belt.toObjId]) inDegree[belt.toObjId]++ }
  const topoQ = objects.filter(o => inDegree[o.id] === 0).map(o => o.id)
  const order = []; const visited = new Set()
  while (topoQ.length > 0) {
    const id = topoQ.shift()
    if (visited.has(id)) continue
    visited.add(id); order.push(id)
    for (const belt of outBeltsForObj[id] ?? []) {
      if (--inDegree[belt.toObjId] === 0) topoQ.push(belt.toObjId)
    }
  }

  // ── Backward pass: compute how much each belt's downstream can absorb ────────
  const beltDemand = new Map() // beltId → rate demanded by downstream

  for (const id of [...order].reverse()) {
    const obj      = objsById[id]; if (!obj) continue
    const inBelts  = inBeltsForObj[id]  ?? []
    const outBelts = outBeltsForObj[id] ?? []

    if (obj.type === 'floor_input') {
      // Source — nothing upstream to inform
    } else if (obj.type === 'floor_output') {
      for (const b of inBelts) beltDemand.set(b.id, capBelt(b, Infinity))
    } else if (obj.type === 'splitter') {
      const totalOut = outBelts.reduce((s, b) => s + (beltDemand.get(b.id) ?? 0), 0)
      for (const b of inBelts) beltDemand.set(b.id, totalOut)
    } else if (obj.type === 'merger' || obj.type === 'connection_point') {
      const totalOut = outBelts.reduce((s, b) => s + (beltDemand.get(b.id) ?? 0), 0)
      for (const b of inBelts) beltDemand.set(b.id, totalOut)
    } else if (BUILDINGS_BY_KEY[obj.type]) {
      const recipe    = obj.recipeId ? RECIPES_BY_ID[obj.recipeId] : null
      const clockSpeed = obj.clockSpeed ?? 1
      for (const b of inBelts) {
        const inp = recipe?.inputs[b.toPortIdx]
        beltDemand.set(b.id, inp ? inp.perMin * clockSpeed : 0)
      }
      // Production buildings don't propagate output demand back to their inputs
    }
  }

  // ── Forward pass: route supply constrained by demand ─────────────────────────
  const flowByBelt   = new Map()
  const itemByBelt   = new Map()
  const portActualIn = new Map()

  for (const id of order) {
    const obj      = objsById[id]; if (!obj) continue
    const inBelts  = inBeltsForObj[id]  ?? []
    const outBelts = outBeltsForObj[id] ?? []
    const totalIn  = () => inBelts.reduce((s, b) => s + (flowByBelt.get(b.id) ?? 0), 0)
    const inItems  = () => [...new Set(inBelts.map(b => itemByBelt.get(b.id)).filter(Boolean))]

    if (obj.type === 'floor_input') {
      const supply = obj.ratePerMin ?? 60
      for (const b of outBelts) {
        flowByBelt.set(b.id, capBelt(b, Math.min(supply, beltDemand.get(b.id) ?? Infinity)))
        itemByBelt.set(b.id, obj.item ?? null)
      }

    } else if (obj.type === 'splitter') {
      const available = totalIn()
      const items     = inItems()
      if (outBelts.length > 0) {
        const demands   = outBelts.map(b => capBelt(b, beltDemand.get(b.id) ?? 0))
        const allocated = distributeSplitter(available, demands)
        for (let i = 0; i < outBelts.length; i++) {
          flowByBelt.set(outBelts[i].id, allocated[i])
          if (items.length === 1) itemByBelt.set(outBelts[i].id, items[0])
        }
      }

    } else if (obj.type === 'merger' || obj.type === 'connection_point') {
      const sum      = totalIn()
      const outDemand = outBelts.reduce((s, b) => s + (beltDemand.get(b.id) ?? 0), 0)
      const items    = inItems()
      for (const b of outBelts) {
        flowByBelt.set(b.id, capBelt(b, Math.min(sum, outDemand)))
        if (items.length === 1) itemByBelt.set(b.id, items[0])
      }

    } else if (BUILDINGS_BY_KEY[obj.type]) {
      const recipe     = obj.recipeId ? RECIPES_BY_ID[obj.recipeId] : null
      const clockSpeed = obj.clockSpeed ?? 1
      for (const b of inBelts) {
        const demanded      = beltDemand.get(b.id) ?? 0
        const rawFlow       = Math.min(flowByBelt.get(b.id) ?? 0, demanded)
        const expectedItem  = recipe?.inputs[b.toPortIdx]?.item
        const actualItem    = itemByBelt.get(b.id)
        const itemMismatch  = expectedItem && actualItem && actualItem !== expectedItem
        if (itemMismatch) {
          flowByBelt.set(b.id, 0)   // belt backs up — nothing accepted
          portActualIn.set(`${id}:${b.toPortIdx}`, 0)
        } else {
          portActualIn.set(`${id}:${b.toPortIdx}`, rawFlow)
        }
      }
      if (recipe) {
        let effectiveFactor = 1
        for (let i = 0; i < recipe.inputs.length; i++) {
          const required = recipe.inputs[i].perMin * clockSpeed
          if (required > 0) effectiveFactor = Math.min(effectiveFactor, (portActualIn.get(`${id}:${i}`) ?? 0) / required)
        }
        effectiveFactor = Math.max(0, Math.min(1, effectiveFactor))
        for (const b of outBelts) {
          const out = recipe.outputs[b.fromPortIdx]
          if (out) {
            const outRate   = out.perMin * clockSpeed * effectiveFactor
            const outDemand = beltDemand.get(b.id) ?? Infinity
            flowByBelt.set(b.id, capBelt(b, Math.min(outRate, outDemand)))
            itemByBelt.set(b.id, out.item)
          }
        }
      }
    }
  }

  return { flowByBelt, itemByBelt, portActualIn }
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
