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
          const clockSpeed      = fromObj.clockSpeed ?? 1
          const effectiveFactor = (portActualIn && recipe.inputs.length > 0)
            ? Math.min(1, ...recipe.inputs.map((inp, portIdx) => {
                const req = inp.perMin * clockSpeed
                return req > 0 ? (portActualIn.get(`${fromObj.id}:${portIdx}`) ?? 0) / req : 1
              }))
            : 1
          sources.push({ item: out.item, rate: out.perMin * clockSpeed * effectiveFactor })
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
 * Simulate belt flow using iterative backward/forward passes until stable.
 *
 * All machines start at max production rate. A machine scales back proportionally
 * when it lacks input supply (starved) or output capacity (backed up). Splitters and
 * mergers are passive routers. Belt tiers cap throughput. Iterates until convergence.
 *
 * Returns:
 *   flowByBelt        — Map<beltId, rate>
 *   itemByBelt        — Map<beltId, itemString>
 *   portActualIn      — Map<`${objId}:${portIdx}`, rate>  actual consumption at each input port
 *   machineStatus     — Map<objId, 'ok'|'starved'|'backed_up'>
 *   machineClockSpeed — Map<objId, [0..1]>  simulated efficiency fraction
 */
export function simulateBeltFlow(belts, objects) {
  const objsById  = Object.fromEntries(objects.map(o => [o.id, o]))
  const beltCap   = (belt) => belt.beltTier ? (BELT_SPEEDS[belt.beltTier] ?? Infinity) : Infinity

  // Build adjacency lists
  const inBeltsForObj  = {}
  const outBeltsForObj = {}
  for (const obj of objects) { inBeltsForObj[obj.id] = []; outBeltsForObj[obj.id] = [] }
  for (const belt of belts) {
    if (inBeltsForObj[belt.toObjId])    inBeltsForObj[belt.toObjId].push(belt)
    if (outBeltsForObj[belt.fromObjId]) outBeltsForObj[belt.fromObjId].push(belt)
  }

  // Belt lookup by port index for O(1) access
  const inBeltByPort  = {}
  const outBeltByPort = {}
  for (const obj of objects) { inBeltByPort[obj.id] = {}; outBeltByPort[obj.id] = {} }
  for (const belt of belts) {
    if (inBeltByPort[belt.toObjId])    inBeltByPort[belt.toObjId][belt.toPortIdx]     = belt
    if (outBeltByPort[belt.fromObjId]) outBeltByPort[belt.fromObjId][belt.fromPortIdx] = belt
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = {}
  for (const obj of objects) inDegree[obj.id] = 0
  for (const belt of belts) { if (objsById[belt.toObjId]) inDegree[belt.toObjId]++ }
  const topoQ   = objects.filter(o => inDegree[o.id] === 0).map(o => o.id)
  const order   = []
  const visited = new Set()
  while (topoQ.length > 0) {
    const id = topoQ.shift()
    if (visited.has(id)) continue
    visited.add(id); order.push(id)
    for (const belt of outBeltsForObj[id] ?? []) {
      if (objsById[belt.toObjId] && --inDegree[belt.toObjId] === 0) topoQ.push(belt.toObjId)
    }
  }

  // Initialize all edges at max throughput
  const edgeFlow = new Map()
  const edgeItem = new Map()
  for (const belt of belts) edgeFlow.set(belt.id, beltCap(belt))

  // Initialize machine simulated clock speeds at 1.0 (full speed)
  const machineClockSpeed  = new Map()
  const machineStatus      = new Map()
  const lastOutCapFactor   = new Map()
  for (const obj of objects) {
    if (BUILDINGS_BY_KEY[obj.type] && obj.recipeId) machineClockSpeed.set(obj.id, 1.0)
  }

  const MAX_ITER = 20

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const prevFlow = new Map(edgeFlow)

    // ── Backward pass (reverse topo order): propagate demand from sinks to sources ──
    for (const id of [...order].reverse()) {
      const obj      = objsById[id]; if (!obj) continue
      const inBelts  = inBeltsForObj[id]  ?? []
      const outBelts = outBeltsForObj[id] ?? []

      if (obj.type === 'floor_input') {
        // Pure source — nothing to propagate backward

      } else if (obj.type === 'floor_output') {
        // Sink — demand up to belt capacity on each input
        for (const b of inBelts) edgeFlow.set(b.id, beltCap(b))

      } else if (obj.type === 'splitter') {
        // Input demand = sum of non-disabled output demands
        let totalOutDemand = 0
        for (const b of outBelts) {
          const filter = obj.outputFilters?.[b.fromPortIdx] ?? 'any'
          if (filter !== 'none') totalOutDemand += edgeFlow.get(b.id) ?? 0
        }
        for (const b of inBelts) edgeFlow.set(b.id, Math.min(beltCap(b), totalOutDemand))

      } else if (obj.type === 'merger' || obj.type === 'connection_point') {
        const totalOutDemand = outBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const totalInFlow    = inBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)

        if (isFinite(totalInFlow) && totalInFlow > 0) {
          // Scale each input's demand proportionally to match total output demand.
          // When supply > demand: scale < 1, throttles machines back (backpressure).
          // When supply = demand: scale = 1, no change.
          // When supply < demand: scale > 1, boosts demand signal upstream.
          // This avoids the divide-by-N decay in cascaded chains because the scale is
          // derived from actual forward-pass flows, not a fixed count of inputs.
          const scale = totalOutDemand / totalInFlow
          for (const b of inBelts) {
            edgeFlow.set(b.id, Math.min(beltCap(b), (edgeFlow.get(b.id) ?? 0) * scale))
          }
        } else {
          // First iteration (Infinity flows) or zero supply: signal full demand to each input.
          for (const b of inBelts) {
            edgeFlow.set(b.id, Math.min(beltCap(b), totalOutDemand))
          }
        }

      } else if (BUILDINGS_BY_KEY[obj.type] && obj.recipeId) {
        const recipe    = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
        const userSpeed = obj.clockSpeed ?? 1
        // Output capacity factor: how fast can we run given downstream demand?
        // Use 1.0 (not machineClockSpeed) so the backward pass always signals the
        // maximum possible demand — machineClockSpeed is only used for display.
        let outCapFactor = 1
        for (let i = 0; i < recipe.outputs.length; i++) {
          const belt = outBeltByPort[id]?.[i]; if (!belt) continue  // unconnected = no constraint
          const maxOut = recipe.outputs[i].perMin * userSpeed
          if (maxOut > 0) outCapFactor = Math.min(outCapFactor, (edgeFlow.get(belt.id) ?? 0) / maxOut)
        }
        lastOutCapFactor.set(id, outCapFactor)
        const localSpeed = outCapFactor

        // Signal demand to each connected input port
        for (let i = 0; i < recipe.inputs.length; i++) {
          const belt = inBeltByPort[id]?.[i]; if (!belt) continue
          const demanded = recipe.inputs[i].perMin * userSpeed * localSpeed
          edgeFlow.set(belt.id, Math.min(beltCap(belt), demanded))
        }
      }
    }

    // ── Forward pass (topo order): propagate supply from sources to sinks ──────
    for (const id of order) {
      const obj      = objsById[id]; if (!obj) continue
      const inBelts  = inBeltsForObj[id]  ?? []
      const outBelts = outBeltsForObj[id] ?? []

      if (obj.type === 'floor_input') {
        const supply = obj.ratePerMin ?? 60
        for (const b of outBelts) {
          // Cap by belt tier, configured supply, and downstream demand signal
          edgeFlow.set(b.id, Math.min(beltCap(b), supply, edgeFlow.get(b.id) ?? Infinity))
          edgeItem.set(b.id, obj.item ?? null)
        }

      } else if (obj.type === 'floor_output') {
        // Sink — no outputs

      } else if (obj.type === 'splitter') {
        const available    = inBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const items        = [...new Set(inBelts.map(b => edgeItem.get(b.id)).filter(Boolean))]
        const incomingItem = items[0] ?? null
        const filters      = obj.outputFilters

        if (!filters || filters.every(f => f === 'any')) {
          // Dumb splitter — existing fair-share behavior
          const demands   = outBelts.map(b => Math.min(beltCap(b), edgeFlow.get(b.id) ?? 0))
          const allocated = distributeSplitter(available, demands)
          for (let i = 0; i < outBelts.length; i++) {
            edgeFlow.set(outBelts[i].id, allocated[i])
            if (incomingItem) edgeItem.set(outBelts[i].id, incomingItem)
          }
        } else {
          // Smart splitter — tier-based routing by filter rule
          const hasSpecificMatch = incomingItem && filters.some(f => f === incomingItem)
          const tier1 = []  // specific-item match + active any_undefined
          const tier2 = []  // 'any'
          const tier3 = []  // 'overflow'

          for (let i = 0; i < outBelts.length; i++) {
            const f = filters[i] ?? 'any'
            if (f === 'none') { edgeFlow.set(outBelts[i].id, 0); continue }
            const cap = Math.min(beltCap(outBelts[i]), edgeFlow.get(outBelts[i].id) ?? 0)
            if (f === incomingItem || (f === 'any_undefined' && !hasSpecificMatch)) tier1.push({ i, cap })
            else if (f === 'any')      tier2.push({ i, cap })
            else if (f === 'overflow') tier3.push({ i, cap })
            else { edgeFlow.set(outBelts[i].id, 0) }  // specific filter that doesn't match input
          }

          let rem = available
          for (const tier of [tier1, tier2, tier3]) {
            if (tier.length === 0 || rem <= 0) continue
            const alloc = distributeSplitter(rem, tier.map(o => o.cap))
            let used = 0
            for (let j = 0; j < tier.length; j++) {
              edgeFlow.set(outBelts[tier[j].i].id, alloc[j])
              if (incomingItem) edgeItem.set(outBelts[tier[j].i].id, incomingItem)
              used += alloc[j]
            }
            rem -= used
          }
        }

      } else if (obj.type === 'merger' || obj.type === 'connection_point') {
        const totalIn   = inBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const outDemand = outBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const items     = [...new Set(inBelts.map(b => edgeItem.get(b.id)).filter(Boolean))]
        for (const b of outBelts) {
          edgeFlow.set(b.id, Math.min(beltCap(b), totalIn, outDemand))
          if (items.length === 1) edgeItem.set(b.id, items[0])
        }

      } else if (BUILDINGS_BY_KEY[obj.type] && obj.recipeId) {
        const recipe    = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
        const userSpeed = obj.clockSpeed ?? 1

        // Input supply factor: how fast can we run given what upstream provides?
        // Use inSupplyFactor directly — machineClockSpeed is only for display.
        let inSupplyFactor = 1
        for (let i = 0; i < recipe.inputs.length; i++) {
          const inp   = recipe.inputs[i]
          const belt  = inBeltByPort[id]?.[i]
          const maxIn = inp.perMin * userSpeed
          if (maxIn > 0) {
            if (!belt) {
              inSupplyFactor = 0  // required input port not connected
            } else {
              const actualItem = edgeItem.get(belt.id)
              if (actualItem && actualItem !== inp.item) {
                inSupplyFactor = 0  // wrong item on belt
              } else {
                inSupplyFactor = Math.min(inSupplyFactor, (edgeFlow.get(belt.id) ?? 0) / maxIn)
              }
            }
          }
        }
        const localSpeed = inSupplyFactor

        // Push supply to each connected output port
        for (let i = 0; i < recipe.outputs.length; i++) {
          const belt = outBeltByPort[id]?.[i]; if (!belt) continue
          const outRate = recipe.outputs[i].perMin * userSpeed * localSpeed
          edgeFlow.set(belt.id, Math.min(beltCap(belt), outRate))
          edgeItem.set(belt.id, recipe.outputs[i].item)
        }
      }
    }

    // ── Resolve machines: set clock speeds and status tags ─────────────────────
    for (const id of order) {
      const obj = objsById[id]; if (!obj) continue
      if (!BUILDINGS_BY_KEY[obj.type] || !obj.recipeId) continue
      const recipe    = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
      const userSpeed = obj.clockSpeed ?? 1

      let inputFactor = 1
      for (let i = 0; i < recipe.inputs.length; i++) {
        const inp   = recipe.inputs[i]
        const belt  = inBeltByPort[id]?.[i]
        const maxIn = inp.perMin * userSpeed
        if (maxIn > 0) {
          if (!belt) {
            inputFactor = 0
          } else {
            const actualItem = edgeItem.get(belt.id)
            if (actualItem && actualItem !== inp.item) {
              inputFactor = 0
            } else {
              inputFactor = Math.min(inputFactor, (edgeFlow.get(belt.id) ?? 0) / maxIn)
            }
          }
        }
      }

      let outputFactor = 1  // unconnected outputs don't constrain
      for (let i = 0; i < recipe.outputs.length; i++) {
        const belt   = outBeltByPort[id]?.[i]; if (!belt) continue
        const maxOut = recipe.outputs[i].perMin * userSpeed
        if (maxOut > 0) outputFactor = Math.min(outputFactor, (edgeFlow.get(belt.id) ?? 0) / maxOut)
      }

      machineClockSpeed.set(id, Math.max(0, Math.min(1, Math.min(inputFactor, outputFactor))))

      // outCapFactor < 1 means downstream demanded less than this machine could produce → backed up
      const outCap = lastOutCapFactor.get(id) ?? 1
      if (outCap < 1 - 1e-6)              machineStatus.set(id, 'backed_up')
      else if (inputFactor < 1 - 1e-6)    machineStatus.set(id, 'starved')
      else                                 machineStatus.set(id, 'ok')
    }

    // Convergence check
    let maxDiff = 0
    for (const [id, f] of edgeFlow) maxDiff = Math.max(maxDiff, Math.abs(f - (prevFlow.get(id) ?? 0)))
    if (maxDiff < 1e-6) break
  }

  // Build portActualIn for backward compatibility with App.jsx error detection
  const portActualIn = new Map()
  for (const obj of objects) {
    if (!BUILDINGS_BY_KEY[obj.type] || !obj.recipeId) continue
    const recipe = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
    for (let i = 0; i < recipe.inputs.length; i++) {
      const inp  = recipe.inputs[i]
      const belt = inBeltByPort[obj.id]?.[i]
      if (!belt) {
        portActualIn.set(`${obj.id}:${i}`, 0)
      } else {
        const actualItem = edgeItem.get(belt.id)
        portActualIn.set(`${obj.id}:${i}`, (actualItem && actualItem !== inp.item) ? 0 : (edgeFlow.get(belt.id) ?? 0))
      }
    }
  }

  return { flowByBelt: edgeFlow, itemByBelt: edgeItem, portActualIn, machineStatus, machineClockSpeed }
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
