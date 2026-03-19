import { CELL_SIZE } from './constants'
import { BUILDINGS_BY_KEY } from './buildings'
import { CONNECTORS_BY_KEY } from './LayersPanel'

export const ALL_BUILDINGS_BY_KEY = { ...BUILDINGS_BY_KEY, ...CONNECTORS_BY_KEY }

/**
 * Compute the world-space position of a port's attachment point (edge center).
 * obj must have { x, y, rotation, type }. portDef must have { position: { side, offset } }.
 */
export function getPortWorldPos(obj, portDef) {
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
