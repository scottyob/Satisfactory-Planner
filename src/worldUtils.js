/**
 * worldUtils.js — utility functions for the World View
 */

/**
 * Scans a factory snapshot and returns world-level I/O:
 *   - floor_input objects → world inputs (items piped in from outside)
 *   - floor_output objects (with item configured) → world outputs
 *   - If no floor ports exist, falls back to recipe net I/O
 *   - If floor_input exists but floor_output has no items, uses recipe net
 *     to determine outputs (floor_output may be unconfigured)
 *
 * Returns { inputs: [{item, perMin}], outputs: [{item, perMin}] }
 */
export function discoverFactoryIO(snapshot, RECIPES_BY_ID) {
  if (!snapshot || !snapshot.objects) return { inputs: [], outputs: [] }

  const floorInputObjs  = snapshot.objects.filter(o => o.type === 'floor_input'  && o.item && o.ratePerMin)
  const floorOutputObjs = snapshot.objects.filter(o => o.type === 'floor_output' && o.item && o.ratePerMin)

  // Aggregate floor port items
  const inMap = {}, outMap = {}
  for (const obj of floorInputObjs)  inMap[obj.item]  = (inMap[obj.item]  ?? 0) + obj.ratePerMin
  for (const obj of floorOutputObjs) outMap[obj.item] = (outMap[obj.item] ?? 0) + obj.ratePerMin

  // Recipe-based net (always computed; used as fallback for outputs)
  const totalIn  = {}
  const totalOut = {}
  for (const obj of snapshot.objects) {
    if (!obj.recipeId) continue
    const recipe = RECIPES_BY_ID[obj.recipeId]
    if (!recipe) continue
    const cs = obj.clockSpeed ?? 1
    for (const inp of recipe.inputs)  totalIn[inp.item]  = (totalIn[inp.item]  ?? 0) + inp.perMin * cs
    for (const out of recipe.outputs) totalOut[out.item] = (totalOut[out.item] ?? 0) + out.perMin * cs
  }

  if (floorInputObjs.length > 0 || floorOutputObjs.length > 0) {
    // Use floor_input for world inputs (authoritative — floor_inputs ARE the external supply)
    const inputs = Object.entries(inMap)
      .map(([item, perMin]) => ({ item, perMin }))
      .sort((a, b) => a.item.localeCompare(b.item))

    let outputs
    if (floorOutputObjs.length > 0) {
      // Configured floor_output objects → use them directly
      outputs = Object.entries(outMap)
        .map(([item, perMin]) => ({ item, perMin }))
        .sort((a, b) => a.item.localeCompare(b.item))
    } else {
      // No configured floor_output → fall back to recipe net outputs
      // (floor_inputs provided items internally; whatever recipes produce in excess is the world output)
      // Adjust totalOut by subtracting floor_input supply so it doesn't inflate recipe surplus
      const adjOut = { ...totalOut }
      for (const [item, rate] of Object.entries(inMap)) {
        adjOut[item] = (adjOut[item] ?? 0) - rate  // floor_input was external supply, not recipe output
      }
      const allItems = new Set([...Object.keys(totalIn), ...Object.keys(adjOut)])
      outputs = []
      for (const item of allItems) {
        const net = (adjOut[item] ?? 0) - (totalIn[item] ?? 0)
        if (net > 0.01) outputs.push({ item, perMin: Math.round(net * 100) / 100 })
      }
      outputs.sort((a, b) => a.item.localeCompare(b.item))
    }

    return { inputs, outputs }
  }

  // No floor ports at all — pure recipe net I/O
  const allItems = new Set([...Object.keys(totalIn), ...Object.keys(totalOut)])
  const netInputs  = []
  const netOutputs = []
  for (const item of allItems) {
    const net = (totalOut[item] ?? 0) - (totalIn[item] ?? 0)
    if (net > 0.01)  netOutputs.push({ item, perMin: Math.round(net * 100) / 100 })
    if (net < -0.01) netInputs.push({ item, perMin: Math.round(-net * 100) / 100 })
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

  const busTaps = taps.filter(t => t.busId === bus.id)
  if (busTaps.length === 0) return []

  const isHorizontal = bus.axis === 'h'
  const sorted = [...busTaps].sort((a, b) =>
    isHorizontal ? a.snapPos.x - b.snapPos.x : a.snapPos.y - b.snapPos.y
  )

  const segments = []
  let cumulativeFlow = 0
  for (let i = 0; i < sorted.length; i++) {
    const tap       = sorted[i]
    const wf        = worldFactories?.find(f => f.factoryId === tap.factoryId)
    const connector = wf?.connectors?.find(c => c.id === tap.connectorId)
    const tapFlow   = connector?.flow ?? 0
    cumulativeFlow += tapFlow
    segments.push({
      from: i === 0 ? null : sorted[i - 1].id,
      to:   tap.id,
      flow: cumulativeFlow,
    })
  }
  return segments
}
