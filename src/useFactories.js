import { useState, useCallback, useRef } from 'react'
import DEFAULT_WORKSPACE from './defaultWorkspace.json'

const WORKSPACE_KEY = 'sp-workspace'

// Old flat keys — used for one-time migration
const OLD_OBJ_KEY      = 'sp-objects'
const OLD_BELTS_KEY    = 'sp-belts'
const OLD_VIEWPORT_KEY = 'sp-viewport'
const OLD_LAYERS_KEY   = 'sp-layers'

let _nextFactoryId = 2

function blankFactory(id, name) {
  return {
    id,
    name: name ?? `Factory ${id}`,
    objects:         [],
    nextObjId:       1,
    belts:           [],
    nextBeltId:      1,
    layers:          [{ id: 1, name: 'Floor 1', visible: true }],
    selectedLayerId: 1,
    nextLayerId:     2,
    nextFloorNum:    2,
    viewport:        { scale: 0.25, x: 0, y: 0 },
  }
}

function migrateOldKeys() {
  const hasOld = (
    localStorage.getItem(OLD_OBJ_KEY) ||
    localStorage.getItem(OLD_BELTS_KEY) ||
    localStorage.getItem(OLD_LAYERS_KEY)
  )
  if (!hasOld) return null

  let objects = [], nextObjId = 1, belts = [], nextBeltId = 1
  let layers = [{ id: 1, name: 'Floor 1', visible: true }]
  let selectedLayerId = 1, nextLayerId = 2, nextFloorNum = 2
  let viewport = { scale: 0.25, x: 0, y: 0 }

  try {
    const d = localStorage.getItem(OLD_OBJ_KEY)
    if (d) { const p = JSON.parse(d); objects = p.objects ?? []; nextObjId = p.nextObjId ?? 1 }
  } catch {}
  try {
    const d = localStorage.getItem(OLD_BELTS_KEY)
    if (d) { const p = JSON.parse(d); belts = p.belts ?? []; nextBeltId = p.nextBeltId ?? 1 }
  } catch {}
  try {
    const d = localStorage.getItem(OLD_VIEWPORT_KEY)
    if (d) { viewport = JSON.parse(d) }
  } catch {}
  try {
    const d = localStorage.getItem(OLD_LAYERS_KEY)
    if (d) {
      const p = JSON.parse(d)
      layers = p.layers ?? layers
      selectedLayerId = p.selectedId ?? 1
      nextLayerId = p.nextLayerId ?? 2
      nextFloorNum = p.nextFloorNum ?? 2
    }
  } catch {}

  const factory = { id: 1, name: 'Factory 1', objects, nextObjId, belts, nextBeltId, layers, selectedLayerId, nextLayerId, nextFloorNum, viewport }
  const workspace = { version: 2, activeFactoryId: 1, factories: [factory] }

  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
  localStorage.removeItem(OLD_OBJ_KEY)
  localStorage.removeItem(OLD_BELTS_KEY)
  localStorage.removeItem(OLD_VIEWPORT_KEY)
  localStorage.removeItem(OLD_LAYERS_KEY)

  return workspace
}

export function loadWorkspace() {
  const migrated = migrateOldKeys()
  if (migrated) return migrated

  try {
    const saved = localStorage.getItem(WORKSPACE_KEY)
    if (saved) {
      const ws = JSON.parse(saved)
      if (ws.factories?.length > 0) {
        const maxId = ws.factories.reduce((m, f) => Math.max(m, f.id), 0)
        if (_nextFactoryId <= maxId) _nextFactoryId = maxId + 1
        return ws
      }
    }
  } catch {}

  // No saved data — use the bundled default workspace
  const maxId = DEFAULT_WORKSPACE.factories.reduce((m, f) => Math.max(m, f.id), 0)
  _nextFactoryId = maxId + 1
  return DEFAULT_WORKSPACE
}

const DEFAULT_WORLD_STATE = {
  worldFactories: [],  // { factoryId, x, y, connectors: [{id, side, offset, kind, flow, item, perMin}] }
  buses: [],           // { id, item, axis:'h'|'v', x1, y1, x2, y2 }
  taps: [],            // { id, busId, factoryId, connectorId, snapPos }
  nextWorldId: 1,
  viewport: { scale: 0.25, x: 0, y: 0 },
}

function writeWorkspace(factories, activeFactoryId, worldState) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ version: 2, activeFactoryId, factories, worldState: worldState ?? DEFAULT_WORLD_STATE }))
}

export default function useFactories() {
  const initialWs            = loadWorkspace()
  const [factories,         setFactories]         = useState(initialWs.factories)
  const [activeFactoryId,   setActiveFactoryId]   = useState(initialWs.activeFactoryId)
  const [worldState,        setWorldState]         = useState(initialWs.worldState ?? DEFAULT_WORLD_STATE)
  const worldStateRef = useRef(worldState)
  worldStateRef.current = worldState
  const saveTimerRef = useRef(null)

  const scheduleWrite = useCallback((newFactories, newActiveId, newWorldState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => writeWorkspace(newFactories, newActiveId, newWorldState ?? worldStateRef.current), 300)
  }, [])

  // Update the active factory's stored snapshot
  const patchActiveFactory = useCallback((snapshot) => {
    setFactories(prev => {
      const next = prev.map(f => f.id === snapshot.id ? snapshot : f)
      scheduleWrite(next, snapshot.id, worldStateRef.current)
      return next
    })
  }, [scheduleWrite])

  // Add a new factory (blank or with a given snapshot) and switch to it
  const addFactory = useCallback((nameOrSnapshot) => {
    const id = _nextFactoryId++
    const factory = (nameOrSnapshot && typeof nameOrSnapshot === 'object')
      ? { ...nameOrSnapshot, id }
      : blankFactory(id, typeof nameOrSnapshot === 'string' ? nameOrSnapshot : undefined)
    setFactories(prev => {
      const next = [...prev, factory]
      scheduleWrite(next, id, worldStateRef.current)
      return next
    })
    setActiveFactoryId(id)
    return factory
  }, [scheduleWrite])

  // Remove a factory — caller is responsible for switching active factory first
  const removeFactory = useCallback((deleteId, newActiveId) => {
    setFactories(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(f => f.id !== deleteId)
      scheduleWrite(next, newActiveId, worldStateRef.current)
      return next
    })
    setActiveFactoryId(newActiveId)
  }, [scheduleWrite])

  const renameFactory = useCallback((id, name) => {
    setFactories(prev => {
      const next = prev.map(f => f.id === id ? { ...f, name } : f)
      setActiveFactoryId(cur => { scheduleWrite(next, cur, worldStateRef.current); return cur })
      return next
    })
  }, [scheduleWrite])

  // Just change which factory is active (does not apply the snapshot to canvas)
  const setActiveFactory = useCallback((id) => {
    setActiveFactoryId(id)
  }, [])

  const patchWorldState = useCallback((partial) => {
    setWorldState(prev => {
      const next = { ...prev, ...partial }
      worldStateRef.current = next
      setFactories(facs => {
        scheduleWrite(facs, activeFactoryId, next)
        return facs
      })
      return next
    })
  }, [scheduleWrite, activeFactoryId])

  const setWorldStateAndSave = useCallback((newState) => {
    setWorldState(newState)
    worldStateRef.current = newState
    setFactories(facs => {
      scheduleWrite(facs, activeFactoryId, newState)
      return facs
    })
  }, [scheduleWrite, activeFactoryId])

  return {
    factories,
    activeFactoryId,
    addFactory,
    removeFactory,
    renameFactory,
    setActiveFactory,
    patchActiveFactory,
    worldState,
    setWorldState: setWorldStateAndSave,
    patchWorldState,
  }
}
