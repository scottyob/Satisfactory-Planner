/**
 * worldUtils.js — utility functions for the World View
 */

/**
 * Scans a factory snapshot's objects for buildings with recipeId,
 * sums all inputs and outputs, then subtracts internal items
 * (items that are both produced and consumed within the factory).
 *
 * Returns { inputs: [{item, perMin}], outputs: [{item, perMin}] }
 * representing the factory's net external I/O.
 */
export function discoverFactoryIO(snapshot, RECIPES_BY_ID) {
  if (!snapshot || !snapshot.objects) return { inputs: [], outputs: [] }

  const totalIn  = {}  // item -> total perMin consumed
  const totalOut = {}  // item -> total perMin produced

  for (const obj of snapshot.objects) {
    if (!obj.recipeId) continue
    const recipe = RECIPES_BY_ID[obj.recipeId]
    if (!recipe) continue
    const clockSpeed = obj.clockSpeed ?? 1

    for (const inp of recipe.inputs) {
      totalIn[inp.item] = (totalIn[inp.item] ?? 0) + inp.perMin * clockSpeed
    }
    for (const out of recipe.outputs) {
      totalOut[out.item] = (totalOut[out.item] ?? 0) + out.perMin * clockSpeed
    }
  }

  // Also check floor_input / floor_output objects (they carry item + ratePerMin)
  for (const obj of snapshot.objects) {
    if (obj.type === 'floor_input' && obj.item && obj.ratePerMin) {
      totalOut[obj.item] = (totalOut[obj.item] ?? 0) + obj.ratePerMin
    }
    if (obj.type === 'floor_output' && obj.item && obj.ratePerMin) {
      totalIn[obj.item] = (totalIn[obj.item] ?? 0) + obj.ratePerMin
    }
  }

  // Net: items produced in excess of internal consumption are outputs
  // Items consumed in excess of internal production are inputs
  const allItems = new Set([...Object.keys(totalIn), ...Object.keys(totalOut)])
  const netInputs  = []
  const netOutputs = []

  for (const item of allItems) {
    const produced  = totalOut[item] ?? 0
    const consumed  = totalIn[item]  ?? 0
    const net       = produced - consumed

    if (net > 0.01) {
      netOutputs.push({ item, perMin: Math.round(net * 100) / 100 })
    } else if (net < -0.01) {
      netInputs.push({ item, perMin: Math.round(-net * 100) / 100 })
    }
  }

  netInputs.sort((a, b) => a.item.localeCompare(b.item))
  netOutputs.sort((a, b) => a.item.localeCompare(b.item))

  return { inputs: netInputs, outputs: netOutputs }
}

/**
 * Computes flow segments along a bus between its taps.
 * Returns an array of { from, to, flow } objects.
 * 'from' / 'to' are tap IDs or null for bus endpoints.
 * 'flow' is net items/min flowing in that segment (positive = bus direction).
 */
export function computeSegmentFlows(bus, taps, worldFactories) {
  if (!bus || !taps || taps.length === 0) return []

  // Get taps that belong to this bus
  const busTaps = taps.filter(t => t.busId === bus.id)
  if (busTaps.length === 0) return []

  // Sort taps along the bus axis
  const isHorizontal = bus.axis === 'h'
  const sorted = [...busTaps].sort((a, b) =>
    isHorizontal ? a.snapPos.x - b.snapPos.x : a.snapPos.y - b.snapPos.y
  )

  // Build segments between taps
  const segments = []
  let cumulativeFlow = 0

  for (let i = 0; i < sorted.length; i++) {
    const tap        = sorted[i]
    const wf         = worldFactories?.find(f => f.factoryId === tap.factoryId)
    const connector  = wf?.connectors?.find(c => c.id === tap.connectorId)
    const tapFlow    = connector?.flow ?? 0
    // If flow is an output from factory → positive (injecting into bus)
    // If flow is an input to factory  → negative (withdrawing from bus)
    cumulativeFlow += tapFlow

    segments.push({
      from: i === 0 ? null : sorted[i - 1].id,
      to:   tap.id,
      flow: cumulativeFlow,
    })
  }

  return segments
}
