/**
 * debug-sim.mjs  —  Belt flow simulation debugger
 * Run with:  node debug-sim.mjs [scenarioNumber]
 * e.g.       node debug-sim.mjs 3
 *            node debug-sim.mjs        (runs all scenarios)
 */

// ── Inline constants (mirrors src/) ──────────────────────────────────────────

const BELT_SPEEDS = { 1: 60, 2: 120, 3: 270, 4: 480, 5: 780, 6: 1200 }

// Building keys the sim recognises as production machines
const MACHINE_KEYS = new Set([
  'smelter', 'foundry', 'constructor', 'assembler',
  'manufacturer', 'refinery', 'blender', 'packager',
  'particleAccelerator', 'quantumEncoder', 'converter',
])

// Minimal recipe table for test scenarios
const RECIPES_BY_ID = {
  ironIngot:  { id: 'ironIngot',  inputs: [{ item: 'Iron Ore',   perMin: 30 }], outputs: [{ item: 'Iron Ingot',   perMin: 30 }] },
  ironPlate:  { id: 'ironPlate',  inputs: [{ item: 'Iron Ingot', perMin: 30 }], outputs: [{ item: 'Iron Plate',   perMin: 20 }] },
  ironRod:    { id: 'ironRod',    inputs: [{ item: 'Iron Ingot', perMin: 15 }], outputs: [{ item: 'Iron Rod',     perMin: 15 }] },
  steelIngot: { id: 'steelIngot', inputs: [{ item: 'Iron Ore',   perMin: 45 }, { item: 'Coal', perMin: 45 }], outputs: [{ item: 'Steel Ingot', perMin: 45 }] },
  screw:      { id: 'screw',      inputs: [{ item: 'Iron Rod',   perMin: 10 }], outputs: [{ item: 'Screw',        perMin: 40 }] },
  screws:     { id: 'screws',    inputs: [{ item: 'Iron Rod',   perMin: 10 }], outputs: [{ item: 'Screws',       perMin: 40 }] },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isMachine = (obj) => MACHINE_KEYS.has(obj.type) && obj.recipeId

const fmt = (v) => {
  if (Number.isNaN(v)) return 'NaN'
  if (!isFinite(v)) return '∞'
  return (v % 1 === 0 ? String(v) : v.toFixed(2))
}

function printEdgeTable(label, edgeFlow, edgeItem, belts, objects) {
  const objsById = Object.fromEntries(objects.map(o => [o.id, o]))
  console.log(`  ${label}:`)
  for (const belt of belts) {
    const flow = edgeFlow.get(belt.id) ?? 0
    const item = edgeItem?.get(belt.id) ?? '—'
    const from = objsById[belt.fromObjId]
    const to   = objsById[belt.toObjId]
    const cap  = belt.beltTier ? BELT_SPEEDS[belt.beltTier] : Infinity
    const capStr = isFinite(cap) ? `cap=${cap}` : 'uncapped'
    console.log(`    belt#${belt.id} [${from?.type ?? '?'}(${belt.fromObjId}) → ${to?.type ?? '?'}(${belt.toObjId})] ${capStr}  flow=${fmt(flow)}  item=${item}`)
  }
}

function printMachineTable(label, machineClockSpeed, machineStatus, objects) {
  const machines = objects.filter(isMachine)
  if (machines.length === 0) return
  console.log(`  ${label}:`)
  for (const obj of machines) {
    const speed  = machineClockSpeed.get(obj.id)
    const status = machineStatus.get(obj.id) ?? '—'
    console.log(`    obj#${obj.id} ${obj.type}(${obj.recipeId}) speed=${speed != null ? fmt(speed * 100) + '%' : '—'}  status=${status}`)
  }
}

// ── Core simulation with debug output ────────────────────────────────────────

function simulateDebug(belts, objects, { verbose = true, MAX_ITER = 20 } = {}) {
  const log = verbose ? (...a) => console.log(...a) : () => {}

  const objsById = Object.fromEntries(objects.map(o => [o.id, o]))
  const beltCap  = (belt) => belt.beltTier ? (BELT_SPEEDS[belt.beltTier] ?? Infinity) : Infinity

  // Adjacency
  const inBeltsForObj  = {}
  const outBeltsForObj = {}
  for (const obj of objects) { inBeltsForObj[obj.id] = []; outBeltsForObj[obj.id] = [] }
  for (const belt of belts) {
    if (inBeltsForObj[belt.toObjId])    inBeltsForObj[belt.toObjId].push(belt)
    if (outBeltsForObj[belt.fromObjId]) outBeltsForObj[belt.fromObjId].push(belt)
  }

  // Port-indexed belt lookup
  const inBeltByPort  = {}
  const outBeltByPort = {}
  for (const obj of objects) { inBeltByPort[obj.id] = {}; outBeltByPort[obj.id] = {} }
  for (const belt of belts) {
    if (inBeltByPort[belt.toObjId])    inBeltByPort[belt.toObjId][belt.toPortIdx]     = belt
    if (outBeltByPort[belt.fromObjId]) outBeltByPort[belt.fromObjId][belt.fromPortIdx] = belt
  }

  // Topological sort (Kahn's)
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
  log(`  Topo order: [${order.map(id => `${objsById[id]?.type}#${id}`).join(' → ')}]`)

  // Init edges at max throughput
  const edgeFlow = new Map()
  const edgeItem = new Map()
  for (const belt of belts) edgeFlow.set(belt.id, beltCap(belt))

  // Init machine clock speeds
  const machineClockSpeed = new Map()
  const machineStatus     = new Map()
  for (const obj of objects) {
    if (isMachine(obj)) machineClockSpeed.set(obj.id, 1.0)
  }

  log('')
  log(`  Initial edges (all at max throughput):`)
  printEdgeTable('edges', edgeFlow, edgeItem, belts, objects)

  let convergedAt = MAX_ITER

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const prevFlow = new Map(edgeFlow)
    log(`\n  ── Iteration ${iter + 1} ─────────────────────────────────────────`)

    // ── Backward pass ─────────────────────────────────────────────────────────
    for (const id of [...order].reverse()) {
      const obj      = objsById[id]; if (!obj) continue
      const inBelts  = inBeltsForObj[id]  ?? []
      const outBelts = outBeltsForObj[id] ?? []

      if (obj.type === 'floor_input') {
        // source — nothing

      } else if (obj.type === 'floor_output') {
        for (const b of inBelts) edgeFlow.set(b.id, beltCap(b))

      } else if (obj.type === 'splitter') {
        const totalOutDemand = outBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        for (const b of inBelts) edgeFlow.set(b.id, Math.min(beltCap(b), totalOutDemand))

      } else if (obj.type === 'merger' || obj.type === 'connection_point') {
        // Signal the full outgoing demand to every input belt (capped by that belt's capacity).
        // Each input should try to supply as much as needed — the forward pass caps the actual
        // total via min(beltCap, totalIn, outDemand). Dividing by N under-signals demand
        // through cascaded merger chains.
        const totalOutDemand = outBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        for (const b of inBelts) {
          edgeFlow.set(b.id, Math.min(beltCap(b), totalOutDemand))
        }

      } else if (isMachine(obj)) {
        const recipe    = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
        const userSpeed = obj.clockSpeed ?? 1

        let outCapFactor = 1
        for (let i = 0; i < recipe.outputs.length; i++) {
          const belt = outBeltByPort[id]?.[i]; if (!belt) continue
          const maxOut = recipe.outputs[i].perMin * userSpeed
          if (maxOut > 0) {
            const factor = (edgeFlow.get(belt.id) ?? 0) / maxOut
            log(`    [bwd] obj#${id} output[${i}]: edgeFlow=${fmt(edgeFlow.get(belt.id))} maxOut=${fmt(maxOut)} factor=${fmt(factor)}`)
            outCapFactor = Math.min(outCapFactor, factor)
          }
        }
        const localSpeed = outCapFactor  // no simSpeed — backward pass signals maximum demand
        log(`    [bwd] obj#${id} ${obj.type}: outCapFactor=${fmt(outCapFactor)} → localSpeed=${fmt(localSpeed)}`)

        for (let i = 0; i < recipe.inputs.length; i++) {
          const belt = inBeltByPort[id]?.[i]; if (!belt) continue
          const demanded = recipe.inputs[i].perMin * userSpeed * localSpeed
          const capped   = Math.min(beltCap(belt), demanded)
          log(`    [bwd] obj#${id} input[${i}] belt#${belt.id}: demand=${fmt(demanded)} → capped=${fmt(capped)}`)
          edgeFlow.set(belt.id, capped)
        }
      }
    }

    log('')
    printEdgeTable('after backward pass', edgeFlow, edgeItem, belts, objects)

    // ── Forward pass ──────────────────────────────────────────────────────────
    for (const id of order) {
      const obj      = objsById[id]; if (!obj) continue
      const inBelts  = inBeltsForObj[id]  ?? []
      const outBelts = outBeltsForObj[id] ?? []

      if (obj.type === 'floor_input') {
        const supply = obj.ratePerMin ?? 60
        for (const b of outBelts) {
          const demand = edgeFlow.get(b.id) ?? Infinity
          const flow   = Math.min(beltCap(b), supply, demand)
          log(`    [fwd] floor_input#${id}: supply=${fmt(supply)} demand=${fmt(demand)} cap=${fmt(beltCap(b))} → flow=${fmt(flow)}`)
          edgeFlow.set(b.id, flow)
          edgeItem.set(b.id, obj.item ?? null)
        }

      } else if (obj.type === 'floor_output') {
        // sink

      } else if (obj.type === 'splitter') {
        const available = inBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const items     = [...new Set(inBelts.map(b => edgeItem.get(b.id)).filter(Boolean))]
        log(`    [fwd] splitter#${id}: available=${fmt(available)}`)
        if (outBelts.length > 0) {
          const demands   = outBelts.map(b => Math.min(beltCap(b), edgeFlow.get(b.id) ?? 0))
          const allocated = distributeSplitter(available, demands)
          for (let i = 0; i < outBelts.length; i++) {
            log(`    [fwd] splitter#${id} out[${i}] belt#${outBelts[i].id}: demand=${fmt(demands[i])} allocated=${fmt(allocated[i])}`)
            edgeFlow.set(outBelts[i].id, allocated[i])
            if (items.length === 1) edgeItem.set(outBelts[i].id, items[0])
          }
        }

      } else if (obj.type === 'merger' || obj.type === 'connection_point') {
        const totalIn   = inBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const outDemand = outBelts.reduce((s, b) => s + (edgeFlow.get(b.id) ?? 0), 0)
        const items     = [...new Set(inBelts.map(b => edgeItem.get(b.id)).filter(Boolean))]
        log(`    [fwd] merger#${id}: totalIn=${fmt(totalIn)} outDemand=${fmt(outDemand)}`)
        for (const b of outBelts) {
          const flow = Math.min(beltCap(b), totalIn, outDemand)
          log(`    [fwd] merger#${id} belt#${b.id}: flow=${fmt(flow)}`)
          edgeFlow.set(b.id, flow)
          if (items.length === 1) edgeItem.set(b.id, items[0])
        }

      } else if (isMachine(obj)) {
        const recipe    = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
        const userSpeed = obj.clockSpeed ?? 1

        let inSupplyFactor = 1
        for (let i = 0; i < recipe.inputs.length; i++) {
          const inp   = recipe.inputs[i]
          const belt  = inBeltByPort[id]?.[i]
          const maxIn = inp.perMin * userSpeed
          if (maxIn > 0) {
            if (!belt) {
              log(`    [fwd] obj#${id} input[${i}]: NO BELT → supply=0`)
              inSupplyFactor = 0
            } else {
              const actualItem = edgeItem.get(belt.id)
              if (actualItem && actualItem !== inp.item) {
                log(`    [fwd] obj#${id} input[${i}] belt#${belt.id}: ITEM MISMATCH (got ${actualItem}, need ${inp.item}) → supply=0`)
                inSupplyFactor = 0
              } else {
                const available = edgeFlow.get(belt.id) ?? 0
                const factor    = available / maxIn
                log(`    [fwd] obj#${id} input[${i}] belt#${belt.id}: available=${fmt(available)} maxIn=${fmt(maxIn)} factor=${fmt(factor)}`)
                inSupplyFactor = Math.min(inSupplyFactor, factor)
              }
            }
          }
        }
        const localSpeed = inSupplyFactor  // no simSpeed — forward pass driven purely by supply
        log(`    [fwd] obj#${id} ${obj.type}: inSupplyFactor=${fmt(inSupplyFactor)} → localSpeed=${fmt(localSpeed)}`)

        for (let i = 0; i < recipe.outputs.length; i++) {
          const belt = outBeltByPort[id]?.[i]; if (!belt) continue
          const outRate  = recipe.outputs[i].perMin * userSpeed * localSpeed
          const capped   = Math.min(beltCap(belt), outRate)
          log(`    [fwd] obj#${id} output[${i}] belt#${belt.id}: outRate=${fmt(outRate)} → capped=${fmt(capped)}`)
          edgeFlow.set(belt.id, capped)
          edgeItem.set(belt.id, recipe.outputs[i].item)
        }
      }
    }

    log('')
    printEdgeTable('after forward pass', edgeFlow, edgeItem, belts, objects)

    // ── Resolve machines ──────────────────────────────────────────────────────
    log('')
    for (const id of order) {
      const obj = objsById[id]; if (!obj || !isMachine(obj)) continue
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

      let outputFactor = 1
      for (let i = 0; i < recipe.outputs.length; i++) {
        const belt   = outBeltByPort[id]?.[i]; if (!belt) continue
        const maxOut = recipe.outputs[i].perMin * userSpeed
        if (maxOut > 0) outputFactor = Math.min(outputFactor, (edgeFlow.get(belt.id) ?? 0) / maxOut)
      }

      const newSpeed = Math.max(0, Math.min(1, Math.min(inputFactor, outputFactor)))
      const status   = inputFactor < outputFactor - 1e-6 ? 'STARVED'
                     : outputFactor < inputFactor - 1e-6 ? 'BACKED_UP'
                     : 'OK'
      log(`  [resolve] obj#${id} ${obj.type}(${obj.recipeId}): inputFactor=${fmt(inputFactor)} outputFactor=${fmt(outputFactor)} → speed=${fmt(newSpeed * 100)}%  ${status}`)
      machineClockSpeed.set(id, newSpeed)
      machineStatus.set(id, status.toLowerCase())
    }

    // Convergence
    let maxDiff = 0
    for (const [id, f] of edgeFlow) maxDiff = Math.max(maxDiff, Math.abs(f - (prevFlow.get(id) ?? 0)))
    log(`\n  maxDiff=${fmt(maxDiff)} ${maxDiff < 1e-6 ? '✓ CONVERGED' : '(continuing...)'}`)
    if (maxDiff < 1e-6) { convergedAt = iter + 1; break }
  }

  // Final summary
  console.log('\n  ══ FINAL STATE ══')
  printEdgeTable('belt flows', edgeFlow, edgeItem, belts, objects)
  console.log('')
  printMachineTable('machine speeds', machineClockSpeed, machineStatus, objects)
  console.log(`\n  Converged in ${convergedAt} iteration(s)`)

  // Build portActualIn
  const portActualIn = new Map()
  for (const obj of objects) {
    if (!isMachine(obj)) continue
    const recipe = RECIPES_BY_ID[obj.recipeId]; if (!recipe) continue
    for (let i = 0; i < recipe.inputs.length; i++) {
      const inp  = recipe.inputs[i]
      const belt = inBeltByPort[obj.id]?.[i]
      if (!belt) portActualIn.set(`${obj.id}:${i}`, 0)
      else {
        const actualItem = edgeItem.get(belt.id)
        portActualIn.set(`${obj.id}:${i}`, (actualItem && actualItem !== inp.item) ? 0 : (edgeFlow.get(belt.id) ?? 0))
      }
    }
  }

  return { flowByBelt: edgeFlow, itemByBelt: edgeItem, portActualIn, machineStatus, machineClockSpeed }
}

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

// ── Test scenarios ────────────────────────────────────────────────────────────

const SCENARIOS = []

function scenario(name, fn) { SCENARIOS.push({ name, fn }) }

// 1. Simple fully-supplied chain: floor_input → smelter → floor_output
scenario('Simple full supply: floor_input(60) → smelter → output', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore', ratePerMin: 60 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 3, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },  // 120/m — plenty
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 2. Starved machine: only half the required ore
scenario('Starved: floor_input(15) → smelter(needs 30) → output', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore', ratePerMin: 15 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 3, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 3. Backed-up machine: output belt too slow
scenario('Backed up: smelter(30/m out) → tier-1 belt(60/m) → floor_output  [should be OK since 30 < 60]', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore', ratePerMin: 60 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 2 },  // 2x clock: needs 60 ore, produces 60 ingots
    { id: 3, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },  // 120/m — fine
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 1 },  // 60/m — exact match at 2x
  ]
  simulateDebug(belts, objects)
})

// 4. Backed-up: output belt genuinely too slow
scenario('Backed up: smelter at 2x clock produces 60/m but output belt caps at 30/m', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore', ratePerMin: 120 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 2 },  // needs 60 ore, makes 60 ingots
    { id: 3, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },  // 120/m input — fine
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 1 },  // 60/m output — exact match (smelter at 2x = 60 out)
  ]
  simulateDebug(belts, objects)
})

// 5. Two-stage chain: ore → smelter → constructor → output
scenario('Two-stage chain: floor_input → smelter → constructor → output', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore',   ratePerMin: 30 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },   // 30 ore → 30 ingots
    { id: 3, type: 'constructor',  recipeId: 'ironPlate', clockSpeed: 1 },   // 30 ingots → 20 plates
    { id: 4, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
    { id: 3, fromObjId: 3, fromPortIdx: 0, toObjId: 4, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 6. Splitter: one input feeds two machines
scenario('Splitter: 60/m → splitter → 2x constructors (each needs 30/m)', () => {
  // ironRod: 15 ingots → 15 rods; ironPlate: 30 ingots → 20 plates
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ingot', ratePerMin: 60 },
    { id: 2, type: 'splitter' },
    { id: 3, type: 'constructor',  recipeId: 'ironPlate', clockSpeed: 1 },  // needs 30/m
    { id: 4, type: 'constructor',  recipeId: 'ironRod',   clockSpeed: 1 },  // needs 15/m
    { id: 5, type: 'floor_output' },
    { id: 6, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
    { id: 3, fromObjId: 2, fromPortIdx: 1, toObjId: 4, toPortIdx: 0, beltTier: 2 },
    { id: 4, fromObjId: 3, fromPortIdx: 0, toObjId: 5, toPortIdx: 0, beltTier: 2 },
    { id: 5, fromObjId: 4, fromPortIdx: 0, toObjId: 6, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 7. Merger: two sources into one machine
scenario('Merger: 2 floor_inputs → merger → foundry (needs Iron Ore + Coal)', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore',   ratePerMin: 45 },
    { id: 2, type: 'floor_input',  item: 'Coal',       ratePerMin: 45 },
    { id: 3, type: 'foundry',      recipeId: 'steelIngot', clockSpeed: 1 },  // 45 ore + 45 coal → 45 steel
    { id: 4, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 1, beltTier: 2 },
    { id: 3, fromObjId: 3, fromPortIdx: 0, toObjId: 4, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 8. Wrong item: belt carries wrong item to machine
scenario('Item mismatch: floor_input(Coal) → smelter expecting Iron Ore', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Coal', ratePerMin: 60 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 3, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 9. Disconnected input: smelter with no input belt
scenario('Disconnected input: smelter with no input belt → should be starved at 0%', () => {
  const objects = [
    { id: 1, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 2, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
  ]
  simulateDebug(belts, objects)
})

// 10. Backpressure through chain: slow downstream chokes upstream
scenario('Backpressure: smelter(30 out) → constructor(needs 30 in, makes 20) → slow output belt(tier-1=60)', () => {
  const objects = [
    { id: 1, type: 'floor_input',  item: 'Iron Ore',   ratePerMin: 30 },
    { id: 2, type: 'smelter',      recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 3, type: 'constructor',  recipeId: 'ironPlate', clockSpeed: 1 },
    { id: 4, type: 'floor_output' },
  ]
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0, beltTier: 2 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0, beltTier: 2 },
    { id: 3, fromObjId: 3, fromPortIdx: 0, toObjId: 4, toPortIdx: 0, beltTier: 1 },  // 60/m — fine for 20 plates
  ]
  simulateDebug(belts, objects)
})

// 11. NaN bug: merger with two uncapped belts (no beltTier) — totalInCap = Infinity / Infinity = NaN
scenario('NaN bug: merger with 2 uncapped inputs — Infinity/Infinity = NaN poisons demand', () => {
  // Two rod constructors feed a merger, then a screw constructor
  // No belt tiers → beltCap = Infinity for all belts
  const objects = [
    { id: 1, type: 'floor_input', item: 'Iron Ingot', ratePerMin: 30 },
    { id: 2, type: 'floor_input', item: 'Iron Ingot', ratePerMin: 30 },
    { id: 3, type: 'constructor', recipeId: 'ironRod',  clockSpeed: 1 },  // 15 ingots → 15 rods
    { id: 4, type: 'constructor', recipeId: 'ironRod',  clockSpeed: 1 },
    { id: 5, type: 'merger' },
    { id: 6, type: 'constructor', recipeId: 'screws',   clockSpeed: 1 },  // 10 rods → 40 screws
    { id: 7, type: 'floor_output' },
  ]
  // No beltTier on any belt → all uncapped (Infinity)
  const belts = [
    { id: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 3, toPortIdx: 0 },
    { id: 2, fromObjId: 2, fromPortIdx: 0, toObjId: 4, toPortIdx: 0 },
    { id: 3, fromObjId: 3, fromPortIdx: 0, toObjId: 5, toPortIdx: 1 },
    { id: 4, fromObjId: 4, fromPortIdx: 0, toObjId: 5, toPortIdx: 2 },
    { id: 5, fromObjId: 5, fromPortIdx: 0, toObjId: 6, toPortIdx: 0 },
    { id: 6, fromObjId: 6, fromPortIdx: 0, toObjId: 7, toPortIdx: 0 },
  ]
  simulateDebug(belts, objects)
})

// ── Runner ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const chosen = args[0] ? parseInt(args[0], 10) : null

if (chosen !== null && (isNaN(chosen) || chosen < 1 || chosen > SCENARIOS.length)) {
  console.error(`Usage: node debug-sim.mjs [1..${SCENARIOS.length}]`)
  process.exit(1)
}

const toRun = chosen ? [SCENARIOS[chosen - 1]] : SCENARIOS
for (let i = 0; i < toRun.length; i++) {
  const idx = chosen ? chosen : i + 1
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  SCENARIO ${idx}: ${toRun[i].name}`)
  console.log('═'.repeat(70))
  toRun[i].fn()
}
