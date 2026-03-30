import { useState, useCallback, useEffect, useRef, useMemo, Component } from 'react'
import { Stage, Layer, Line, Rect, Group } from 'react-konva'
import { CELL_SIZE, GRID_CELLS, GRID_PX, PANEL_WIDTH, TOOLBAR_HEIGHT, FACTORY_TAB_HEIGHT, effectiveBeltTier } from './constants'
import Toolbar from './Toolbar.jsx'
import LayersPanel, { useLayers, FOUNDATIONS_BY_KEY } from './LayersPanel.jsx'
import useFactories from './useFactories.js'
import FactoryTabBar from './FactoryTabBar.jsx'
import BuildingObject from './BuildingObject.jsx'
import FloorInputModal from './FloorInputModal.jsx'
import RecipeModal from './RecipeModal.jsx'
import SplitterModal from './SplitterModal.jsx'
import ConveyorLiftModal from './ConveyorLiftModal.jsx'
import ConveyorLiftConfigModal from './ConveyorLiftConfigModal.jsx'
import { BUILDINGS_BY_KEY } from './buildings.js'
import { RECIPES_BY_ID } from './recipes.js'
import BeltObject from './BeltObject.jsx'
import DEMO_STATE from './demo.js'
import { ALL_BUILDINGS_BY_KEY, getPortWorldPos, findNearestInputPort, computeBeltGroup, simulateBeltFlow, computeAutoConnections } from './portUtils.js'

// Error boundary to catch rendering errors and reset state
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Render error, resetting:', error)
  }

  render() {
    if (this.state.hasError) {
      this.props.onReset()
      return null
    }
    return this.props.children
  }
}

const BG_COLOR    = '#0a1118'
const MINOR_COLOR = '#141e28'
const MAJOR_COLOR = '#1a2a38'
const AXIS_COLOR  = '#1e3a54'

let _nextObjId  = 1
let _nextBeltId = 1

// Guard against HMR resets: re-sync counters above any existing IDs before issuing new ones.
function syncIdCounters(objects, belts) {
  const maxObj  = objects.reduce((m, o) => Math.max(m, o.id),  0)
  const maxBelt = belts.reduce((m, b)  => Math.max(m, b.id),  0)
  if (_nextObjId  <= maxObj)  _nextObjId  = maxObj  + 1
  if (_nextBeltId <= maxBelt) _nextBeltId = maxBelt + 1
}

// Read the active factory snapshot from sp-workspace (migration already handled by useFactories)
function loadInitialFactory() {
  try {
    const saved = localStorage.getItem('sp-workspace')
    if (saved) {
      const ws = JSON.parse(saved)
      return ws.factories?.find(f => f.id === ws.activeFactoryId) ?? ws.factories?.[0]
    }
  } catch {}
  return null
}

// ─── Grid ────────────────────────────────────────────────────────────────────

function Grid() {
  const lines = []
  for (let i = 0; i <= GRID_CELLS; i++) {
    const pos     = i * CELL_SIZE
    const isAxis  = i === Math.floor(GRID_CELLS / 2)
    const isMajor = i % 5 === 0
    const color   = isAxis ? AXIS_COLOR : isMajor ? MAJOR_COLOR : MINOR_COLOR
    const width   = isAxis ? 1.5 : isMajor ? 0.75 : 0.4
    lines.push(
      <Line key={`v${i}`} points={[pos, 0, pos, GRID_PX]} stroke={color} strokeWidth={width} listening={false} />,
      <Line key={`h${i}`} points={[0, pos, GRID_PX, pos]} stroke={color} strokeWidth={width} listening={false} />
    )
  }
  return <>{lines}</>
}

// ─── HUD overlays ────────────────────────────────────────────────────────────

function CoordHUD({ position, scale, stageWidth, stageHeight }) {
  const center = Math.floor(GRID_CELLS / 2)
  const cx = stageWidth / 2
  const cy = stageHeight / 2
  const wx = ((cx - position.x) / scale / CELL_SIZE - center).toFixed(1)
  const wy = ((cy - position.y) / scale / CELL_SIZE - center).toFixed(1)

  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12,
      color: '#2e5f8a', fontFamily: 'monospace', fontSize: 12,
      userSelect: 'none', pointerEvents: 'none',
    }}>
      {`${wx}, ${wy}  ·  ${(scale * 100).toFixed(0)}%`}
    </div>
  )
}

function ZoomControls({ onZoom, onReset }) {
  const s = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, background: '#0d1b2a', border: '1px solid #1e3a54',
    borderRadius: 4, color: '#4a7fa5', cursor: 'pointer', fontSize: 16,
    userSelect: 'none', fontFamily: 'monospace',
  }
  return (
    <div style={{ position: 'fixed', bottom: 12, right: PANEL_WIDTH + 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={s} onClick={() => onZoom(1)}>+</div>
      <div style={s} onClick={() => onZoom(-1)}>−</div>
      <div style={{ ...s, fontSize: 9 }} onClick={onReset}>1:1</div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const stageRef              = useRef(null)
  const midPanRef             = useRef(null)
  const viewportRef           = useRef(null)
  const draggingObjRef        = useRef(null)
  const lastRotateRef         = useRef(0)
  const selectedObjIdsRef     = useRef(new Set())
  const objectsRef            = useRef([])
  const flowByBeltRef         = useRef(new Map())
  const itemByBeltRef         = useRef(new Map())
  const portActualInRef       = useRef(new Map())
  const dragStartPositionsRef = useRef(null)
  const marqueeStartRef       = useRef(null)
  const marqueeRef            = useRef(null)   // mirrors marquee state for event handler access
  const wasDraggingMarqueeRef = useRef(false)
  const toolRef               = useRef('pointer')
  const selectFilterRef       = useRef('all')
  const suppressMarqueeRef    = useRef(false)
  const ctrlKeyRef            = useRef(false)
  const historyRef            = useRef([])   // undo stack: [{objects, belts}]
  const clipboardRef          = useRef(null) // copy/cut: {objects, belts}
  const saveHistoryRef        = useRef(null) // stable ref to saveHistory fn
  const fileHandleRef         = useRef(null) // File System Access API handle for overwrite saves
  const handleSaveRef         = useRef(null) // stable ref to handleSave for keyboard shortcut
  const beltsRef              = useRef([])
  const pendingBeltRef        = useRef(null)
  const selectedIdRef         = useRef(1)
  const beltDragStartRef      = useRef(null)  // { beltId, wx, wy } — potential split drag
  const beltSplitDragRef      = useRef(null)  // { cpId } — actively dragging a split CP
  const mousePosRef           = useRef({ x: 0, y: 0 })
  const tooltipElRef          = useRef(null)
  const altZoopRef            = useRef(null)   // { srcObj } — set when Alt+click on foundation
  const zoopStateRef          = useRef(null)   // { srcObj, startWx, startWy, axis, zoopObjIds }
  const isAltDragRef          = useRef(false)  // true when alt+dragging non-foundation (duplicate on drop)
  const altGhostIdsRef        = useRef(new Set()) // IDs of ghost objects added at drag start for alt-drag preview
  const altGhostIdMapRef      = useRef(new Map()) // originalId → ghostId, for belt rerouting during alt-drag

  const [tool, setTool] = useState('pointer')
  const [selectFilter, setSelectFilter] = useState('all')
  const [viewOptions, setViewOptions] = useState([
    { id: 'foundations', label: 'Foundations', visible: true },
  ])
  const [foundationOpacity, setFoundationOpacity] = useState(1.0)

  // useFactories must be called first so it can migrate old localStorage keys before other state inits
  const {
    factories,
    activeFactoryId,
    addFactory,
    removeFactory,
    renameFactory,
    setActiveFactory,
    patchActiveFactory,
  } = useFactories()

  const stageW = () => window.innerWidth  - PANEL_WIDTH
  const stageH = () => window.innerHeight - TOOLBAR_HEIGHT - FACTORY_TAB_HEIGHT

  const [dimensions, setDimensions] = useState({ width: stageW(), height: stageH() })

  const center = Math.floor(GRID_CELLS / 2)
  const [viewport, setViewport] = useState(() => {
    const f = loadInitialFactory()
    if (f?.viewport) return f.viewport
    return { scale: 0.25, x: stageW() / 2 - center * CELL_SIZE * 0.25, y: stageH() / 2 - center * CELL_SIZE * 0.25 }
  })

  const {
    layers, selectedId,
    addLayer, deleteLayer, toggleVisible, renameLayer, selectLayer, reorderLayers,
    restoreLayerState, _nextLayerId, _nextFloorNum,
  } = useLayers()

  const [objects, setObjects] = useState(() => {
    const f = loadInitialFactory()
    if (f) { _nextObjId = f.nextObjId; return f.objects }
    _nextObjId = DEMO_STATE.nextObjId
    return DEMO_STATE.objects
  })
  const [belts, setBelts] = useState(() => {
    const f = loadInitialFactory()
    if (f) { _nextBeltId = f.nextBeltId; return f.belts }
    _nextBeltId = DEMO_STATE.nextBeltId
    return DEMO_STATE.belts
  })
  const [selectedObjIds, setSelectedObjIds] = useState(new Set())
  const [selectedBeltIds, setSelectedBeltIds] = useState(new Set())
  const [pendingBelt, setPendingBelt]       = useState(null)
  const [marquee, setMarquee]               = useState(null)
  const [floorInputModal,     setFloorInputModal]     = useState({ open: false, objId: null })
  const [recipeModal,         setRecipeModal]         = useState({ open: false, objId: null })
  const [splitterModal,       setSplitterModal]       = useState({ open: false, objId: null })
  const [conveyorLiftModal,       setConveyorLiftModal]       = useState({ open: false, x: 0, y: 0 })
  const [conveyorLiftConfigModal, setConveyorLiftConfigModal] = useState({ open: false, objId: null })
  const [tooltip, setTooltip]                 = useState(null) // { x, y, content: [{text,color}] } | null

  // Keep refs in sync with latest state for use in stable callbacks
  viewportRef.current       = viewport
  selectedObjIdsRef.current = selectedObjIds
  objectsRef.current        = objects
  toolRef.current           = tool
  selectFilterRef.current   = selectFilter
  beltsRef.current          = belts
  pendingBeltRef.current    = pendingBelt
  selectedIdRef.current     = selectedId

  // Build a snapshot of the current active factory state
  const buildFactorySnapshot = useCallback(() => ({
    id:              activeFactoryId,
    name:            factories.find(f => f.id === activeFactoryId)?.name ?? 'Factory',
    objects,
    nextObjId:       _nextObjId,
    belts,
    nextBeltId:      _nextBeltId,
    layers,
    selectedLayerId: selectedId,
    nextLayerId:     _nextLayerId(),
    nextFloorNum:    _nextFloorNum(),
    viewport,
  }), [activeFactoryId, factories, objects, belts, layers, selectedId, viewport, _nextLayerId, _nextFloorNum])

  // Consolidated autosave — persists to sp-workspace via useFactories
  useEffect(() => {
    patchActiveFactory(buildFactorySnapshot())
  }, [objects, belts, layers, selectedId, viewport]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize
  useEffect(() => {
    const onResize = () => setDimensions({ width: stageW(), height: stageH() })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Track Ctrl key for marquee-override
  useEffect(() => {
    const onDown = (e) => { if (e.key === 'Control') ctrlKeyRef.current = true }
    const onUp   = (e) => { if (e.key === 'Control') ctrlKeyRef.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [])

  // Keyboard: tool switch, rotate, delete, undo, copy/cut/paste
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return

      const ctrl = e.ctrlKey || e.metaKey

      // Save
      if (ctrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveRef.current?.()
        return
      }

      // Undo
      if (ctrl && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        const snap = historyRef.current.pop()
        if (snap) {
          setObjects(snap.objects)
          setBelts(snap.belts)
          setSelectedObjIds(new Set())
          setSelectedBeltIds(new Set())
        }
        return
      }

      // Copy
      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        const selIds = selectedObjIdsRef.current
        if (selIds.size === 0) return
        const objs  = objectsRef.current.filter(o => selIds.has(o.id))
        const belts = beltsRef.current.filter(b => selIds.has(b.fromObjId) && selIds.has(b.toObjId))
        clipboardRef.current = { objects: objs, belts }
        return
      }

      // Cut
      if (ctrl && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        const selIds = selectedObjIdsRef.current
        if (selIds.size === 0) return
        const objs  = objectsRef.current.filter(o => selIds.has(o.id))
        const belts = beltsRef.current.filter(b => selIds.has(b.fromObjId) && selIds.has(b.toObjId))
        clipboardRef.current = { objects: objs, belts }
        saveHistoryRef.current()
        // Also remove linked conveyor lift partners
        const linkedIds = new Set()
        for (const o of objectsRef.current) {
          if (selIds.has(o.id) && o.linkedLiftId) linkedIds.add(o.linkedLiftId)
        }
        const allDeleteIds = new Set([...selIds, ...linkedIds])
        setObjects(prev => prev.filter(o => !allDeleteIds.has(o.id)))
        setBelts(prev => prev.filter(b => !allDeleteIds.has(b.fromObjId) && !allDeleteIds.has(b.toObjId)))
        setSelectedObjIds(new Set())
        setSelectedBeltIds(new Set())
        return
      }

      // Paste
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        const cb = clipboardRef.current
        if (!cb || cb.objects.length === 0) return
        saveHistoryRef.current()
        syncIdCounters(objectsRef.current, beltsRef.current)
        const idMap = new Map()
        const targetLayerId = selectedIdRef.current
        const OFFSET = CELL_SIZE * 3
        const newObjs = cb.objects.map(o => {
          const newId = _nextObjId++
          idMap.set(o.id, newId)
          return { ...o, id: newId, layerId: targetLayerId, x: o.x + OFFSET, y: o.y + OFFSET }
        })
        const newBelts = cb.belts
          .map(b => ({ ...b, id: _nextBeltId++, layerId: targetLayerId, fromObjId: idMap.get(b.fromObjId), toObjId: idMap.get(b.toObjId) }))
          .filter(b => b.fromObjId && b.toObjId)
        setObjects(prev => [...prev, ...newObjs])
        setBelts(prev => [...prev, ...newBelts])
        setSelectedObjIds(new Set(newObjs.map(o => o.id)))
        setSelectedBeltIds(new Set())
        return
      }

      if (e.key === 'h' || e.key === 'H') setTool('pan')
      if (e.key === 'v' || e.key === 'V') setTool('pointer')
      if (e.key === 'Escape') {
        setSelectedObjIds(new Set())
        setSelectedBeltIds(new Set())
        setPendingBelt(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjIdsRef.current.size > 0) {
          const ids = selectedObjIdsRef.current
          saveHistoryRef.current()
          // Also delete linked conveyor lift partners
          const linkedIds = new Set()
          for (const o of objectsRef.current) {
            if (ids.has(o.id) && o.linkedLiftId) linkedIds.add(o.linkedLiftId)
          }
          const allDeleteIds = new Set([...ids, ...linkedIds])
          setObjects(prev => prev.filter(o => !allDeleteIds.has(o.id)))
          setBelts(prev => prev.filter(b => !allDeleteIds.has(b.fromObjId) && !allDeleteIds.has(b.toObjId)))
          setSelectedObjIds(new Set())
        }
        if (selectedBeltIds.size > 0) {
          const ids = selectedBeltIds
          saveHistoryRef.current()
          setBelts(prev => prev.filter(b => !ids.has(b.id)))
          setSelectedBeltIds(new Set())
        }
      }
      if ((e.key === 'r' || e.key === 'R') &&
          draggingObjRef.current !== null &&
          selectedObjIdsRef.current.size <= 1) {
        saveHistoryRef.current()
        setObjects(prev => prev.map(o =>
          o.id === draggingObjRef.current
            ? { ...o, rotation: (o.rotation + 90) % 360 }
            : o
        ))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedBeltIds])

  // Middle mouse pan (works regardless of active tool)
  useEffect(() => {
    const container = stageRef.current?.container()
    if (!container) return
    const onMouseDown = (e) => {
      if (e.button !== 1) return
      e.preventDefault()
      midPanRef.current = {
        startX: e.clientX, startY: e.clientY,
        startVX: viewportRef.current.x, startVY: viewportRef.current.y,
      }
    }
    const onMouseMove = (e) => {
      if (!midPanRef.current) return
      setViewport(v => ({
        ...v,
        x: midPanRef.current.startVX + (e.clientX - midPanRef.current.startX),
        y: midPanRef.current.startVY + (e.clientY - midPanRef.current.startY),
      }))
    }
    const onMouseUp = (e) => { if (e.button === 1) midPanRef.current = null }
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── Tooltip ───────────────────────────────────────────────────────────────

  // Track raw mouse position for tooltip placement — update DOM directly to avoid re-renders
  useEffect(() => {
    const onMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
      if (tooltipElRef.current) {
        tooltipElRef.current.style.left = `${e.clientX + 14}px`
        tooltipElRef.current.style.top  = `${e.clientY - 10}px`
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const showTooltip = useCallback((content) => {
    const { x, y } = mousePosRef.current
    setTooltip({ x, y, content })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  const handleBeltHover = useCallback((beltId) => {
    const group = computeBeltGroup(beltId, beltsRef.current, objectsRef.current, flowByBeltRef.current, portActualInRef.current, itemByBeltRef.current)
    if (!group) { setTooltip(null); return }

    const fmt = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1)) + '/min'
    const feedByItem = {}, drainByItem = {}
    for (const s of group.sources) {
      if (s.item) feedByItem[s.item] = (feedByItem[s.item] ?? 0) + s.rate
    }
    for (const s of group.sinks) {
      if (s.item) drainByItem[s.item] = (drainByItem[s.item] ?? 0) + s.rate
    }

    const thisBelt     = beltsRef.current.find(b => b.id === beltId)
    const thisBeltRate = flowByBeltRef.current?.get(beltId)
    const allItems = [...new Set([...Object.keys(feedByItem), ...Object.keys(drainByItem)])]
    const content = []
    if (thisBeltRate != null) {
      const mk = thisBelt?.beltTier ?? effectiveBeltTier(thisBeltRate)
      const rateStr = (thisBeltRate % 1 === 0 ? String(thisBeltRate) : thisBeltRate.toFixed(1)) + '/m'
      content.push({ text: `Belt (MK${mk}) - ${rateStr}`, color: '#c8dff0' })
      content.push({ text: '─────────────────', color: '#1e3a54' })
    }
    allItems.forEach((item, idx) => {
      if (idx > 0) content.push({ text: '', color: '' })
      const feed = feedByItem[item] ?? 0
      const drain = drainByItem[item] ?? 0
      const diff = feed - drain
      content.push({ text: item, color: '#c8dff0' })
      content.push({ text: `  ${fmt(feed)} in  ·  ${fmt(drain)} out`, color: '#7aabcc' })
      content.push(Math.abs(diff) < 0.01
        ? { text: '  ✓ balanced', color: '#5ee877' }
        : diff > 0
          ? { text: `  ▲ +${fmt(diff)} excess`, color: '#f5a623' }
          : { text: `  ▼ −${fmt(Math.abs(diff))} deficit`, color: '#e87c7c' }
      )
    })
    if (content.length === 0) content.push({ text: 'No items connected', color: '#2e5f8a' })

    const { x, y } = mousePosRef.current
    setTooltip({ x, y, content })
  }, [])

  // ── Zoom ──────────────────────────────────────────────────────────────────

  const zoomAtPoint = useCallback((px, py, dir) => {
    setViewport(prev => {
      const next = Math.min(Math.max(prev.scale * (dir > 0 ? 1.12 : 1 / 1.12), 0.05), 10)
      return {
        scale: next,
        x: px - (px - prev.x) * (next / prev.scale),
        y: py - (py - prev.y) * (next / prev.scale),
      }
    })
  }, [])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    if (draggingObjRef.current !== null) {
      if (selectedObjIdsRef.current.size > 1) return  // no rotate when multi-selected
      const now = Date.now()
      if (now - lastRotateRef.current < 250) return
      lastRotateRef.current = now
      const dir = e.evt.deltaY < 0 ? 90 : -90
      setObjects(prev => prev.map(o =>
        o.id === draggingObjRef.current
          ? { ...o, rotation: ((o.rotation + dir) + 360) % 360 }
          : o
      ))
    } else {
      const pointer = stageRef.current.getPointerPosition()
      zoomAtPoint(pointer.x, pointer.y, e.evt.deltaY < 0 ? 1 : -1)
    }
  }, [zoomAtPoint])

  const handleZoomBtn = useCallback((dir) => {
    zoomAtPoint(dimensions.width / 2, dimensions.height / 2, dir)
  }, [zoomAtPoint, dimensions])

  const handleReset = useCallback(() => {
    setViewport({ scale: 1, x: dimensions.width / 2 - center * CELL_SIZE, y: dimensions.height / 2 - center * CELL_SIZE })
  }, [dimensions, center])

  // ── Objects ───────────────────────────────────────────────────────────────

  const snap = (v) => Math.round(v / CELL_SIZE) * CELL_SIZE

  const addBuilding = useCallback((type) => {
    const vpX = (dimensions.width  / 2 - viewport.x) / viewport.scale
    const vpY = (dimensions.height / 2 - viewport.y) / viewport.scale
    const x = snap(vpX)
    const y = snap(vpY)

    if (type === 'conveyor_lift') {
      setConveyorLiftModal({ open: true, x, y })
      return
    }

    saveHistory()
    syncIdCounters(objectsRef.current, beltsRef.current)
    const obj = {
      id:       _nextObjId++,
      type,
      layerId:  selectedId,
      rotation: 0,
      x,
      y,
    }
    setObjects(prev => [...prev, obj])
    setSelectedObjIds(new Set([obj.id]))
    const autoConns = computeAutoConnections(new Set([obj.id]), [...objectsRef.current, obj], beltsRef.current)
    if (autoConns.length > 0) {
      syncIdCounters(objectsRef.current, beltsRef.current)
      setBelts(prev => [...prev, ...autoConns.map(b => ({ ...b, id: _nextBeltId++ }))])
    }
    if (type === 'floor_input') {
      setFloorInputModal({ open: true, objId: obj.id })
    }
  }, [dimensions, viewport, selectedId])

  const handleChangeFoundationColor = useCallback((ids, color) => {
    saveHistoryRef.current()
    setObjects(prev => prev.map(o => ids.includes(o.id) ? { ...o, color } : o))
  }, [])

  const saveHistory = useCallback(() => {
    historyRef.current.push({ objects: objectsRef.current, belts: beltsRef.current })
    if (historyRef.current.length > 100) historyRef.current.shift()
  }, [])
  saveHistoryRef.current = saveHistory

  const updateObjPos = useCallback((id, x, y) => {
    setObjects(prev => {
      const obj = prev.find(o => o.id === id)
      const linkedId = obj?.linkedLiftId
      return prev.map(o => {
        if (o.id === id) return { ...o, x, y }
        if (linkedId && o.id === linkedId) return { ...o, x, y }
        return o
      })
    })
  }, [])

  const handleObjDragStart = useCallback((e, id) => {
    if (ctrlKeyRef.current) { e.target.stopDrag(); return }
    if (e.evt?.altKey) {
      const obj = objectsRef.current.find(o => o.id === id)
      const def = obj ? ALL_BUILDINGS_BY_KEY[obj.type] : null
      if (def?.isFoundation) { e.target.stopDrag(); return }  // zoop handled via container
      isAltDragRef.current = true
    }
    saveHistoryRef.current()
    draggingObjRef.current = id
    const sel = selectedObjIdsRef.current
    const toTrack = sel.has(id) ? sel : new Set([id])
    dragStartPositionsRef.current = new Map(
      objectsRef.current
        .filter(o => toTrack.has(o.id))
        .map(o => [o.id, { x: o.x, y: o.y, rotation: o.rotation }])
    )

    // Alt drag: immediately add ghost copies at original positions so originals appear to stay put,
    // and reroute belts to ghosts so they stay visually connected to the "original" during drag.
    if (isAltDragRef.current) {
      syncIdCounters(objectsRef.current, beltsRef.current)
      const ghostIdMap = new Map() // originalId → ghostId
      const ghosts = [...dragStartPositionsRef.current.keys()].map(oid => {
        const orig = objectsRef.current.find(o => o.id === oid)
        if (!orig) return null
        const newId = _nextObjId++
        altGhostIdsRef.current.add(newId)
        ghostIdMap.set(oid, newId)
        return { ...orig, id: newId }
      }).filter(Boolean)
      altGhostIdMapRef.current = ghostIdMap
      if (ghosts.length > 0) {
        setObjects(prev => [...prev, ...ghosts])
        setBelts(prev => prev.map(b => ({
          ...b,
          fromObjId: ghostIdMap.get(b.fromObjId) ?? b.fromObjId,
          toObjId:   ghostIdMap.get(b.toObjId)   ?? b.toObjId,
        })))
      }
    }
  }, [])

  const handleObjDragMove = useCallback((e, id) => {
    const node = e.target
    const x = snap(node.x())
    const y = snap(node.y())
    node.x(x)
    node.y(y)

    const starts   = dragStartPositionsRef.current
    const startPos = starts?.get(id)
    if (startPos && starts.size > 1) {
      const dx = x - startPos.x
      const dy = y - startPos.y
      setObjects(prev => {
        const newPositions = new Map()
        newPositions.set(id, { x, y })
        for (const [oid, sp] of starts) {
          if (oid !== id) newPositions.set(oid, { x: snap(sp.x + dx), y: snap(sp.y + dy) })
        }
        // Sync linked lift positions — skip during alt-drag (partner is copied separately on drop)
        if (!isAltDragRef.current) {
          for (const o of prev) {
            if (o.linkedLiftId && newPositions.has(o.id) && !newPositions.has(o.linkedLiftId)) {
              newPositions.set(o.linkedLiftId, newPositions.get(o.id))
            }
          }
        }
        return prev.map(o => {
          const pos = newPositions.get(o.id)
          return pos ? { ...o, x: pos.x, y: pos.y } : o
        })
      })
    } else {
      // During alt-drag, only move the dragged object; linked lift partner stays put
      // and gets its own copy created at drop time
      if (isAltDragRef.current) {
        setObjects(prev => prev.map(o => o.id === id ? { ...o, x, y } : o))
      } else {
        updateObjPos(id, x, y)
      }
    }
  }, [updateObjPos])

  const handleObjDragEnd = useCallback((e, id) => {
    draggingObjRef.current = null
    const node = e.target
    const x = snap(node.x())
    const y = snap(node.y())

    if (isAltDragRef.current) {
      isAltDragRef.current = false
      const starts   = dragStartPositionsRef.current
      const startPos = starts?.get(id)
      const dx = startPos ? x - startPos.x : 0
      const dy = startPos ? y - startPos.y : 0
      syncIdCounters(objectsRef.current, beltsRef.current)
      const idMap   = new Map()
      const dragged = starts ? [...starts.keys()] : [id]
      const copies  = dragged.map(oid => {
        const orig = objectsRef.current.find(o => o.id === oid)
        if (!orig) return null
        const sp   = starts?.get(oid) ?? { x: orig.x, y: orig.y }
        const newId = _nextObjId++
        idMap.set(oid, newId)
        return { ...orig, id: newId, x: snap(sp.x + dx), y: snap(sp.y + dy) }
      }).filter(Boolean)

      // Fix conveyor lift linkedLiftId references on copies, and create
      // copies of any linked partners that weren't part of the drag selection.
      const extraLinkedCopies = []
      for (const oid of dragged) {
        const copy = copies.find(c => c.id === idMap.get(oid))
        if (!copy || (copy.type !== 'conveyor_lift_in' && copy.type !== 'conveyor_lift_out')) continue
        const orig = objectsRef.current.find(o => o.id === oid)
        if (!orig?.linkedLiftId) { copy.linkedLiftId = undefined; continue }
        if (idMap.has(orig.linkedLiftId)) {
          // Partner was also dragged — re-link copy to the partner copy
          copy.linkedLiftId = idMap.get(orig.linkedLiftId)
        } else {
          // Partner was not dragged — copy it at the same new position
          const linkedOrig = objectsRef.current.find(o => o.id === orig.linkedLiftId)
          if (!linkedOrig) { copy.linkedLiftId = undefined; continue }
          const newLinkedId = _nextObjId++
          extraLinkedCopies.push({ ...linkedOrig, id: newLinkedId, x: copy.x, y: copy.y, linkedLiftId: copy.id })
          copy.linkedLiftId = newLinkedId
        }
      }

      const allCopies  = [...copies, ...extraLinkedCopies]
      const ghostIds   = altGhostIdsRef.current
      const ghostIdMap = altGhostIdMapRef.current
      // Belts were rerouted to ghost IDs during drag start; resolve back to original IDs for inter-copy belt detection
      const reverseGhostMapEarly = new Map([...ghostIdMap.entries()].map(([k, v]) => [v, k]))
      const newBelts = beltsRef.current
        .map(b => ({ ...b, fromObjId: reverseGhostMapEarly.get(b.fromObjId) ?? b.fromObjId, toObjId: reverseGhostMapEarly.get(b.toObjId) ?? b.toObjId }))
        .filter(b => dragged.includes(b.fromObjId) && dragged.includes(b.toObjId))
        .map(b => ({ ...b, id: _nextBeltId++, fromObjId: idMap.get(b.fromObjId), toObjId: idMap.get(b.toObjId) }))
        .filter(b => b.fromObjId && b.toObjId)
      altGhostIdsRef.current   = new Set()
      altGhostIdMapRef.current = new Map()
      setObjects(prev => [
        // Reset originals to their exact start state (x, y, and rotation)
        ...prev.filter(o => !ghostIds.has(o.id)).map(o => {
          const sp = starts?.get(o.id)
          return sp ? { ...o, x: sp.x, y: sp.y, rotation: sp.rotation ?? o.rotation } : o
        }),
        ...allCopies,
      ])
      setBelts(prev => {
        const rerouted = reverseGhostMapEarly.size > 0
          ? prev.map(b => ({ ...b, fromObjId: reverseGhostMapEarly.get(b.fromObjId) ?? b.fromObjId, toObjId: reverseGhostMapEarly.get(b.toObjId) ?? b.toObjId }))
          : prev
        return newBelts.length > 0 ? [...rerouted, ...newBelts] : rerouted
      })
      setSelectedObjIds(new Set(copies.map(o => o.id)))
      dragStartPositionsRef.current = null
      return
    }

    const starts   = dragStartPositionsRef.current
    const startPos = starts?.get(id)
    if (startPos && starts.size > 1) {
      const dx = x - startPos.x
      const dy = y - startPos.y
      const newPositions = new Map()
      newPositions.set(id, { x, y })
      for (const [oid, sp] of starts) {
        if (oid !== id) newPositions.set(oid, { x: snap(sp.x + dx), y: snap(sp.y + dy) })
      }
      for (const o of objectsRef.current) {
        if (o.linkedLiftId && newPositions.has(o.id) && !newPositions.has(o.linkedLiftId)) {
          newPositions.set(o.linkedLiftId, newPositions.get(o.id))
        }
      }
      const updatedObjects = objectsRef.current.map(o => {
        const pos = newPositions.get(o.id)
        return pos ? { ...o, x: pos.x, y: pos.y } : o
      })
      setObjects(updatedObjects)
      const movedIds = new Set(newPositions.keys())
      const autoConns = computeAutoConnections(movedIds, updatedObjects, beltsRef.current)
      if (autoConns.length > 0) {
        syncIdCounters(objectsRef.current, beltsRef.current)
        setBelts(prev => [...prev, ...autoConns.map(b => ({ ...b, id: _nextBeltId++ }))])
      }
    } else {
      const orig = objectsRef.current.find(o => o.id === id)
      const linkedId = orig?.linkedLiftId
      const updatedObjects = objectsRef.current.map(o => {
        if (o.id === id) return { ...o, x, y }
        if (linkedId && o.id === linkedId) return { ...o, x, y }
        return o
      })
      updateObjPos(id, x, y)
      const movedIds = new Set([id, ...(linkedId ? [linkedId] : [])])
      const autoConns = computeAutoConnections(movedIds, updatedObjects, beltsRef.current)
      if (autoConns.length > 0) {
        syncIdCounters(objectsRef.current, beltsRef.current)
        setBelts(prev => [...prev, ...autoConns.map(b => ({ ...b, id: _nextBeltId++ }))])
      }
    }
    dragStartPositionsRef.current = null
  }, [updateObjPos])

  // ── Port interaction ───────────────────────────────────────────────────────

  const handlePortMouseDown = useCallback((objId, portIdx) => {
    suppressMarqueeRef.current = true
    // Reject if port is already occupied
    if (beltsRef.current.some(b => b.fromObjId === objId && b.fromPortIdx === portIdx)) return

    const obj = objectsRef.current.find(o => o.id === objId)
    if (!obj) return
    const def = ALL_BUILDINGS_BY_KEY[obj.type]
    if (!def) return
    const portDef = def.outputs[portIdx]
    if (!portDef) return

    const pos = getPortWorldPos(obj, portDef)
    setPendingBelt({
      fromObjId:   objId,
      fromPortIdx: portIdx,
      portType:    portDef.type,
      sx: pos.x, sy: pos.y,
      cx: pos.x, cy: pos.y,
    })
  }, [])

  const handleBeltMouseDown = useCallback((e, beltId) => {
    const f = selectFilterRef.current
    if (f === 'buildings' || f === 'foundations') return  // let marquee start; 'notFoundations' keeps belts interactive
    if (ctrlKeyRef.current) return  // Ctrl+drag → marquee
    suppressMarqueeRef.current = true
    e.cancelBubble = true
    setSelectedObjIds(new Set())
    setSelectedBeltIds(new Set([beltId]))
    // Record start position for potential split drag
    const pointer = stageRef.current.getPointerPosition()
    const vp = viewportRef.current
    beltDragStartRef.current = {
      beltId,
      wx: (pointer.x - vp.x) / vp.scale,
      wy: (pointer.y - vp.y) / vp.scale,
    }
  }, [])

  const handleBeltDblClick = useCallback((e, beltId) => {
    const f = selectFilterRef.current
    if (f === 'buildings' || f === 'foundations') return  // 'notFoundations' keeps belts interactive
    e.cancelBubble = true
    const allBelts   = beltsRef.current
    const allObjects = objectsRef.current
    const clicked    = allBelts.find(b => b.id === beltId)
    if (!clicked) return

    const runBeltIds = new Set([beltId])
    const runCpIds   = new Set()

    function followForward(toObjId) {
      const toObj = allObjects.find(o => o.id === toObjId)
      if (!toObj || toObj.type !== 'connection_point') return
      runCpIds.add(toObjId)
      const next = allBelts.find(b => b.fromObjId === toObjId && !runBeltIds.has(b.id))
      if (!next) return
      runBeltIds.add(next.id)
      followForward(next.toObjId)
    }

    function followBackward(fromObjId) {
      const fromObj = allObjects.find(o => o.id === fromObjId)
      if (!fromObj || fromObj.type !== 'connection_point') return
      runCpIds.add(fromObjId)
      const prev = allBelts.find(b => b.toObjId === fromObjId && !runBeltIds.has(b.id))
      if (!prev) return
      runBeltIds.add(prev.id)
      followBackward(prev.fromObjId)
    }

    followForward(clicked.toObjId)
    followBackward(clicked.fromObjId)

    setSelectedBeltIds(runBeltIds)
    setSelectedObjIds(runCpIds)
  }, [])

  // ── Floor input modal ─────────────────────────────────────────────────────

  const handleRecipeConfirm = useCallback((recipeId, clockSpeed) => {
    const { objId } = recipeModal
    setObjects(prev => prev.map(o => o.id === objId ? { ...o, recipeId, clockSpeed } : o))
    setRecipeModal({ open: false, objId: null })
  }, [recipeModal])

  const handleFloorInputConfirm = useCallback((item, ratePerMin) => {
    const { objId } = floorInputModal
    setObjects(prev => prev.map(o => o.id === objId ? { ...o, item, ratePerMin } : o))
    setFloorInputModal({ open: false, objId: null })
  }, [floorInputModal])

  const handleSplitterConfirm = useCallback((outputFilters) => {
    const { objId } = splitterModal
    setObjects(prev => prev.map(o => o.id === objId ? { ...o, outputFilters } : o))
    setSplitterModal({ open: false, objId: null })
  }, [splitterModal])

  const handleConveyorLiftConfirm = useCallback((targetLayerId) => {
    saveHistoryRef.current()
    syncIdCounters(objectsRef.current, beltsRef.current)
    const { x, y } = conveyorLiftModal
    const inId  = _nextObjId++
    const outId = _nextObjId++
    setObjects(prev => [...prev,
      { id: inId,  type: 'conveyor_lift_in',  layerId: selectedId,     rotation: 0, x, y, linkedLiftId: outId },
      { id: outId, type: 'conveyor_lift_out', layerId: targetLayerId,  rotation: 0, x, y, linkedLiftId: inId  },
    ])
    setSelectedObjIds(new Set([inId]))
    setConveyorLiftModal({ open: false, x: 0, y: 0 })
  }, [conveyorLiftModal, selectedId])

  const handleConveyorLiftConfigConfirm = useCallback(({ targetLayerId, isCurrentIn }) => {
    const objId = conveyorLiftConfigModal.objId
    saveHistoryRef.current()
    syncIdCounters(objectsRef.current, beltsRef.current)

    const obj       = objectsRef.current.find(o => o.id === objId)
    if (!obj) { setConveyorLiftConfigModal({ open: false, objId: null }); return }
    const linkedObj = objectsRef.current.find(o => o.id === obj.linkedLiftId)

    const newCurrentType = isCurrentIn ? 'conveyor_lift_in' : 'conveyor_lift_out'
    const newLinkedType  = isCurrentIn ? 'conveyor_lift_out' : 'conveyor_lift_in'

    const floorChanged     = linkedObj && linkedObj.layerId !== targetLayerId
    const directionChanged = obj.type !== newCurrentType

    if (floorChanged || !linkedObj) {
      // Delete old linked object and its connected belts, create new one on target floor
      const oldLinkedId = linkedObj?.id
      const newLinkedId = _nextObjId++
      setObjects(prev => [
        ...prev
          .filter(o => o.id !== oldLinkedId)
          .map(o => o.id === objId ? { ...o, type: newCurrentType, linkedLiftId: newLinkedId } : o),
        { id: newLinkedId, type: newLinkedType, layerId: targetLayerId, rotation: 0, x: obj.x, y: obj.y, linkedLiftId: objId },
      ])
      if (oldLinkedId != null) {
        setBelts(prev => prev.filter(b => b.fromObjId !== oldLinkedId && b.toObjId !== oldLinkedId))
      }
    } else {
      // Floor unchanged — just update types and delete affected belts if direction flipped
      setObjects(prev => prev.map(o => {
        if (o.id === objId)          return { ...o, type: newCurrentType }
        if (linkedObj && o.id === linkedObj.id) return { ...o, type: newLinkedType }
        return o
      }))
      if (directionChanged) {
        // Belt ports changed; remove belts connected to either lift
        setBelts(prev => prev.filter(b =>
          b.fromObjId !== objId && b.toObjId !== objId &&
          b.fromObjId !== linkedObj?.id && b.toObjId !== linkedObj?.id
        ))
      }
    }

    setConveyorLiftConfigModal({ open: false, objId: null })
  }, [conveyorLiftConfigModal])

  // Click on stage background: deselect (unless ending a marquee drag)
  const handleStageClick = useCallback((e) => {
    if (wasDraggingMarqueeRef.current) {
      wasDraggingMarqueeRef.current = false
      return
    }
    if (e.target === e.target.getStage()) {
      setSelectedObjIds(new Set())
      setSelectedBeltIds(new Set())
    }
  }, [])

  // ── Marquee selection + pending belt (native DOM events) ──────────────────

  useEffect(() => {
    const container = stageRef.current?.container()
    if (!container) return

    const toCanvas = (clientX, clientY) => {
      const rect = container.getBoundingClientRect()
      const vp   = viewportRef.current
      return {
        x: (clientX - rect.left  - vp.x) / vp.scale,
        y: (clientY - rect.top - vp.y) / vp.scale,
      }
    }

    const onMouseDown = (e) => {
      if (e.button !== 0 || toolRef.current !== 'pointer') return
      if (pendingBeltRef.current) return  // already drawing a belt
      // Alt+zoop: tile foundation in one axis as mouse drags
      if (altZoopRef.current) {
        const { srcObjs } = altZoopRef.current
        altZoopRef.current = null
        suppressMarqueeRef.current = false
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        saveHistoryRef.current()
        zoopStateRef.current = { srcObjs, startWx: wx, startWy: wy, axis: null, zoopObjIds: new Set() }
        return
      }
      // If a shape claimed this click (filter matched), don't start marquee
      if (suppressMarqueeRef.current) { suppressMarqueeRef.current = false; return }
      const { x, y } = toCanvas(e.clientX, e.clientY)
      marqueeStartRef.current       = { cx: x, cy: y }
      wasDraggingMarqueeRef.current = false
    }

    const snap = (v) => Math.round(v / CELL_SIZE) * CELL_SIZE

    const onMouseMove = (e) => {
      // Zoop: tile foundation group in one locked axis
      if (zoopStateRef.current) {
        const state = zoopStateRef.current
        const { srcObjs, startWx, startWy } = state
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        const dx = wx - startWx
        const dy = wy - startWy
        // Lock axis on first significant movement
        if (!state.axis) {
          if (Math.abs(dx) > CELL_SIZE / 2 || Math.abs(dy) > CELL_SIZE / 2) {
            state.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
          } else {
            return
          }
        }
        // Compute group bounding-box span along the locked axis
        let span = 0
        if (state.axis === 'x') {
          let minX = Infinity, maxX = -Infinity
          for (const o of srcObjs) {
            const d = ALL_BUILDINGS_BY_KEY[o.type]
            if (!d) continue
            minX = Math.min(minX, o.x - d.w * CELL_SIZE / 2)
            maxX = Math.max(maxX, o.x + d.w * CELL_SIZE / 2)
          }
          span = maxX - minX
        } else {
          let minY = Infinity, maxY = -Infinity
          for (const o of srcObjs) {
            const d = ALL_BUILDINGS_BY_KEY[o.type]
            if (!d) continue
            minY = Math.min(minY, o.y - d.h * CELL_SIZE / 2)
            maxY = Math.max(maxY, o.y + d.h * CELL_SIZE / 2)
          }
          span = maxY - minY
        }
        if (span <= 0) return
        const count   = Math.max(0, Math.round(Math.abs(state.axis === 'x' ? dx : dy) / span))
        const tileDir = (state.axis === 'x' ? dx : dy) >= 0 ? 1 : -1
        const oldIds  = state.zoopObjIds
        syncIdCounters(objectsRef.current, beltsRef.current)
        const newIds   = new Set()
        const newTiles = []
        for (let i = 1; i <= count; i++) {
          for (const o of srcObjs) {
            const newId = _nextObjId++
            newIds.add(newId)
            newTiles.push({
              ...o, id: newId,
              x: state.axis === 'x' ? o.x + tileDir * i * span : o.x,
              y: state.axis === 'y' ? o.y + tileDir * i * span : o.y,
            })
          }
        }
        state.zoopObjIds = newIds
        setObjects(prev => [...prev.filter(o => !oldIds.has(o.id)), ...newTiles])
        return
      }

      // Belt split: check if drag exceeds threshold → create CP and split
      if (beltDragStartRef.current) {
        const { beltId, wx: startWx, wy: startWy } = beltDragStartRef.current
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        const vp = viewportRef.current
        if (Math.hypot((wx - startWx) * vp.scale, (wy - startWy) * vp.scale) > 6) {
          beltDragStartRef.current = null
          const belt = beltsRef.current.find(b => b.id === beltId)
          if (belt) {
            saveHistoryRef.current()
            syncIdCounters(objectsRef.current, beltsRef.current)
            const cpId = _nextObjId++, b1Id = _nextBeltId++, b2Id = _nextBeltId++
            const cpObj = {
              id: cpId, type: 'connection_point', layerId: belt.layerId,
              rotation: 0, x: snap(startWx), y: snap(startWy),
            }
            setObjects(prev => [...prev, cpObj])
            setBelts(prev => [
              ...prev.filter(b => b.id !== beltId),
              { id: b1Id, layerId: belt.layerId, fromObjId: belt.fromObjId, fromPortIdx: belt.fromPortIdx, toObjId: cpId, toPortIdx: 0 },
              { id: b2Id, layerId: belt.layerId, fromObjId: cpId, fromPortIdx: 0, toObjId: belt.toObjId, toPortIdx: belt.toPortIdx },
            ])
            beltSplitDragRef.current = { cpId }
            setSelectedBeltIds(new Set([b1Id, b2Id]))
            setSelectedObjIds(new Set([cpId]))
          }
        }
      }

      // Belt split CP drag: move the new CP with the mouse
      if (beltSplitDragRef.current) {
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        const cpId = beltSplitDragRef.current.cpId
        setObjects(prev => prev.map(o => o.id === cpId ? { ...o, x: snap(wx), y: snap(wy) } : o))
        return
      }

      // Update pending belt cursor position
      if (pendingBeltRef.current) {
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        setPendingBelt(prev => prev ? { ...prev, cx: wx, cy: wy } : null)
        return
      }

      if (!marqueeStartRef.current) return
      const { x, y }           = toCanvas(e.clientX, e.clientY)
      const { cx: sx, cy: sy } = marqueeStartRef.current
      const w = Math.abs(x - sx)
      const h = Math.abs(y - sy)
      if (w > 4 || h > 4) {
        wasDraggingMarqueeRef.current = true
        const m = { x: Math.min(sx, x), y: Math.min(sy, y), w, h }
        marqueeRef.current = m
        setMarquee(m)
      }
    }

    const onMouseUp = (e) => {
      if (e.button !== 0) return

      // Finish zoop — tiles already placed, just clear state
      if (zoopStateRef.current) {
        zoopStateRef.current = null
        return
      }

      beltDragStartRef.current = null
      if (beltSplitDragRef.current) {
        beltSplitDragRef.current = null
        return
      }

      // Handle pending belt drop
      if (pendingBeltRef.current) {
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        const pb      = pendingBeltRef.current
        const layerId = selectedIdRef.current
        const nearest = findNearestInputPort(wx, wy, objectsRef.current, layerId, pb.portType, beltsRef.current)

        if (nearest) {
          saveHistoryRef.current()
          syncIdCounters(objectsRef.current, beltsRef.current)
          setBelts(prev => [...prev, {
            id:          _nextBeltId++,
            layerId,
            fromObjId:   pb.fromObjId,
            fromPortIdx: pb.fromPortIdx,
            toObjId:     nearest.obj.id,
            toPortIdx:   nearest.portIdx,
          }])
        } else {
          // Drop to empty space — create a connection_point and connect to it
          saveHistoryRef.current()
          syncIdCounters(objectsRef.current, beltsRef.current)
          const sx = Math.round(wx / CELL_SIZE) * CELL_SIZE
          const sy = Math.round(wy / CELL_SIZE) * CELL_SIZE
          const cpObj = {
            id: _nextObjId++, type: 'connection_point', layerId,
            rotation: 0, x: sx, y: sy,
          }
          setObjects(prev => [...prev, cpObj])
          setBelts(prev => [...prev, {
            id:          _nextBeltId++,
            layerId,
            fromObjId:   pb.fromObjId,
            fromPortIdx: pb.fromPortIdx,
            toObjId:     cpObj.id,
            toPortIdx:   0,
          }])
        }

        setPendingBelt(null)
        return
      }

      if (!marqueeStartRef.current) return
      marqueeStartRef.current = null

      const m = marqueeRef.current
      marqueeRef.current = null
      setMarquee(null)

      if (!m) return

      wasDraggingMarqueeRef.current = true

      const activeLayerId = selectedIdRef.current
      const f = selectFilterRef.current
      const selected = new Set(
        objectsRef.current
          .filter(obj => {
            if (obj.layerId !== activeLayerId) return false
            const def = ALL_BUILDINGS_BY_KEY[obj.type]
            if (!def) return false
            // Apply select filter
            if (f === 'belts'          && obj.type !== 'connection_point')                     return false
            if (f === 'buildings'      && (def.isFoundation || obj.type === 'connection_point')) return false
            if (f === 'foundations'    && !def.isFoundation)                                    return false
            if (f === 'notFoundations' && def.isFoundation)                                     return false
            const hw = def.w * CELL_SIZE / 2
            const hh = def.h * CELL_SIZE / 2
            return obj.x - hw < m.x + m.w && obj.x + hw > m.x &&
                   obj.y - hh < m.y + m.h && obj.y + hh > m.y
          })
          .map(o => o.id)
      )
      setSelectedObjIds(selected)
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])  // stable — all state accessed via refs

  // ── Save / Load ───────────────────────────────────────────────────────────

  // Apply a factory snapshot to current React state (used on load and factory switch)
  const applyFactorySnapshot = useCallback((snapshot) => {
    _nextObjId  = snapshot.nextObjId  ?? 1
    _nextBeltId = snapshot.nextBeltId ?? 1
    setObjects(snapshot.objects ?? [])
    setBelts(snapshot.belts ?? [])
    setSelectedObjIds(new Set())
    setSelectedBeltIds(new Set())
    setPendingBelt(null)
    restoreLayerState(
      snapshot.layers          ?? [{ id: 1, name: 'Floor 1', visible: true }],
      snapshot.selectedLayerId ?? 1,
      snapshot.nextLayerId     ?? 2,
      snapshot.nextFloorNum    ?? 2,
    )
    if (snapshot.viewport) setViewport(snapshot.viewport)
    historyRef.current = []
  }, [restoreLayerState])

  const buildStateBlob = useCallback(() => {
    // Build a version-2 workspace blob with all factories
    const snapshot = buildFactorySnapshot()
    const updatedFactories = factories.map(f => f.id === activeFactoryId ? snapshot : f)
    const state = {
      version: 2,
      activeFactoryId,
      factories: updatedFactories,
    }
    return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  }, [buildFactorySnapshot, factories, activeFactoryId])

  const activeFactoryName = factories.find(f => f.id === activeFactoryId)?.name ?? 'Factory'

  const handleSaveAs = useCallback(async () => {
    const blob = buildStateBlob()
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'workspace.json',
        types: [{ description: 'Factory JSON', accept: { 'application/json': ['.json'] } }],
      })
      fileHandleRef.current = handle
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err)
    }
  }, [buildStateBlob])

  const handleSave = useCallback(async () => {
    if (fileHandleRef.current) {
      try {
        const blob = buildStateBlob()
        const writable = await fileHandleRef.current.createWritable()
        await writable.write(blob)
        await writable.close()
      } catch (err) {
        console.error(err)
      }
    } else {
      await handleSaveAs()
    }
  }, [buildStateBlob, handleSaveAs])

  handleSaveRef.current = handleSave

  const handleNew = useCallback(() => {
    applyFactorySnapshot({
      nextObjId: 1, nextBeltId: 1,
      objects: [], belts: [],
      layers: [{ id: 1, name: 'Floor 1', visible: true }],
      selectedLayerId: 1, nextLayerId: 2, nextFloorNum: 2,
      viewport: { scale: 0.25, x: dimensions.width / 2 - center * CELL_SIZE * 0.25, y: dimensions.height / 2 - center * CELL_SIZE * 0.25 },
    })
    fileHandleRef.current = null
  }, [applyFactorySnapshot, dimensions.width, dimensions.height, center])

  const handleLoadDemo = useCallback(() => {
    applyFactorySnapshot({
      objects:         DEMO_STATE.objects,
      nextObjId:       DEMO_STATE.nextObjId,
      belts:           DEMO_STATE.belts,
      nextBeltId:      DEMO_STATE.nextBeltId,
      layers:          DEMO_STATE.layers,
      selectedLayerId: DEMO_STATE.selectedLayerId,
      nextLayerId:     DEMO_STATE.nextLayerId,
      nextFloorNum:    DEMO_STATE.nextFloorNum,
      viewport:        DEMO_STATE.viewport,
    })
    renameFactory(activeFactoryId, 'Demo')
  }, [applyFactorySnapshot, renameFactory, activeFactoryId])

  const handleLoad = useCallback(() => {
    const input    = document.createElement('input')
    input.type     = 'file'
    input.accept   = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          let state = JSON.parse(ev.target.result)
          // Migrate version 1 (single-factory) files
          if (!state.factories) {
            state = {
              version: 2,
              activeFactoryId: 1,
              factories: [{ id: 1, name: file.name.replace(/\.json$/, ''), ...state }],
            }
          }
          const factory = state.factories.find(f => f.id === state.activeFactoryId) ?? state.factories[0]
          if (factory) applyFactorySnapshot(factory)
          fileHandleRef.current = null
        } catch (err) {
          console.error('Failed to load file, starting fresh:', err)
          handleNew()
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [applyFactorySnapshot, handleNew])

  // ── Factory switching ─────────────────────────────────────────────────────

  const handleFactorySwitch = useCallback((id) => {
    if (id === activeFactoryId) return
    patchActiveFactory(buildFactorySnapshot())
    const target = factories.find(f => f.id === id)
    if (!target) return
    setActiveFactory(id)
    applyFactorySnapshot(target)
  }, [activeFactoryId, patchActiveFactory, buildFactorySnapshot, factories, setActiveFactory, applyFactorySnapshot])

  const handleFactoryAdd = useCallback(() => {
    patchActiveFactory(buildFactorySnapshot())
    const newFactory = addFactory()
    applyFactorySnapshot(newFactory)
  }, [patchActiveFactory, buildFactorySnapshot, addFactory, applyFactorySnapshot])

  const handleFactoryDelete = useCallback((id) => {
    if (factories.length <= 1) return
    if (id === activeFactoryId) {
      // Switch to a neighbour first
      const idx = factories.findIndex(f => f.id === id)
      const remaining = factories.filter(f => f.id !== id)
      const newActive = remaining[Math.min(idx, remaining.length - 1)]
      setActiveFactory(newActive.id)
      applyFactorySnapshot(newActive)
      removeFactory(id, newActive.id)
    } else {
      removeFactory(id, activeFactoryId)
    }
  }, [factories, activeFactoryId, setActiveFactory, applyFactorySnapshot, removeFactory])

  const handleFactoryDuplicate = useCallback((id) => {
    patchActiveFactory(buildFactorySnapshot())
    const source = factories.find(f => f.id === id)
    if (!source) return
    const clone = JSON.parse(JSON.stringify(source))
    clone.name = `${source.name} (copy)`
    const newFactory = addFactory(clone)
    applyFactorySnapshot({ ...clone, id: newFactory.id })
  }, [patchActiveFactory, buildFactorySnapshot, factories, addFactory, applyFactorySnapshot])

  // ── Flow simulation ───────────────────────────────────────────────────────

  const { flowByBelt, itemByBelt, portActualIn, machineStatus } = useMemo(
    () => simulateBeltFlow(belts, objects),
    [belts, objects]
  )
  flowByBeltRef.current   = flowByBelt
  itemByBeltRef.current   = itemByBelt
  portActualInRef.current = portActualIn

  // ── Error detection ───────────────────────────────────────────────────────

  const buildingErrors = useMemo(() => {
    const fmt = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1)) + '/min'
    const errors = new Map() // id → string[]
    // Build belt-by-destination index: objId → portIdx → belt
    const beltByToObjPort = {}
    for (const b of belts) {
      if (!beltByToObjPort[b.toObjId]) beltByToObjPort[b.toObjId] = {}
      beltByToObjPort[b.toObjId][b.toPortIdx] = b
    }
    for (const obj of objects) {
      if (!BUILDINGS_BY_KEY[obj.type] || !obj.recipeId) continue
      const recipe = RECIPES_BY_ID[obj.recipeId]
      if (!recipe || recipe.inputs.length === 0) continue
      const portBelts = beltByToObjPort[obj.id] ?? {}
      const reasons = []
      for (let portIdx = 0; portIdx < recipe.inputs.length; portIdx++) {
        const inp  = recipe.inputs[portIdx]
        const belt = portBelts[portIdx]
        if (!belt) {
          reasons.push(`${inp.item} input not connected`)
        } else {
          const actualItem = itemByBelt.get(belt.id)
          if (actualItem && actualItem !== inp.item) {
            reasons.push(`Wrong item on input ${portIdx + 1}: got ${actualItem}, expected ${inp.item}`)
          } else {
            // Skip deficit errors for backed-up machines — their reduced input is
            // intentional backpressure, not a supply problem.
            if (machineStatus.get(obj.id) === 'backed_up') continue
            const actualRate   = portActualIn.get(`${obj.id}:${portIdx}`) ?? 0
            const requiredRate = inp.perMin * (obj.clockSpeed ?? 1)
            const deficit      = requiredRate - actualRate
            if (deficit > 0.01) reasons.push(`${inp.item}: ${fmt(deficit)} deficit`)
          }
        }
      }
      if (reasons.length > 0) errors.set(obj.id, reasons)
    }
    return errors
  }, [objects, belts, portActualIn, itemByBelt, machineStatus])

  // ── Belt flow status ──────────────────────────────────────────────────────
  // 'deficit'  — destination input is undersupplied
  // 'excess'   — source output is throttled by downstream
  // Status propagates across entire connected network (through splitters/mergers/connection_points).

  const beltStatuses = useMemo(() => {
    const objById        = new Map(objects.map(o => [o.id, o]))
    const PASS_THROUGH   = new Set(['connection_point', 'splitter', 'merger'])

    // ── Step 1: compute raw per-belt status ──────────────────────────────────
    const rawStatus = new Map()
    for (const belt of belts) {
      // Deficit: destination building needs more than belt carries
      const toObj = objById.get(belt.toObjId)
      if (toObj?.recipeId) {
        const recipe = RECIPES_BY_ID[toObj.recipeId]
        if (recipe && belt.toPortIdx < recipe.inputs.length) {
          const required = recipe.inputs[belt.toPortIdx].perMin * (toObj.clockSpeed ?? 1)
          const actual   = flowByBelt.get(belt.id) ?? 0
          if (required - actual > 0.01) { rawStatus.set(belt.id, 'deficit'); continue }
        }
      }
      // Excess: source building produces more than belt carries
      const fromObj = objById.get(belt.fromObjId)
      if (fromObj?.recipeId) {
        const recipe = RECIPES_BY_ID[fromObj.recipeId]
        if (recipe && belt.fromPortIdx < recipe.outputs.length) {
          const clockSpeed      = fromObj.clockSpeed ?? 1
          const effectiveFactor = recipe.inputs.length > 0
            ? Math.min(1, ...recipe.inputs.map((inp, portIdx) => {
                const req = inp.perMin * clockSpeed
                return req > 0 ? (portActualIn.get(`${fromObj.id}:${portIdx}`) ?? 0) / req : 1
              }))
            : 1
          const theoreticalOut = recipe.outputs[belt.fromPortIdx].perMin * clockSpeed * effectiveFactor
          const actual         = flowByBelt.get(belt.id) ?? 0
          if (theoreticalOut - actual > 0.01) rawStatus.set(belt.id, 'excess')
        }
      }
    }

    // ── Step 2: union-find to group belts into networks ──────────────────────
    // Two belts belong to the same network when they share a pass-through building
    // (splitter / merger / connection_point). Production buildings isolate networks.
    const parent = new Map(belts.map(b => [b.id, b.id]))
    const find = (id) => {
      if (parent.get(id) !== id) parent.set(id, find(parent.get(id)))
      return parent.get(id)
    }
    const union = (a, b) => parent.set(find(a), find(b))

    // Group belt IDs by each pass-through building they touch
    const beltsByNode = new Map() // objId → belt id[]
    for (const belt of belts) {
      for (const objId of [belt.fromObjId, belt.toObjId]) {
        const obj = objById.get(objId)
        if (obj && PASS_THROUGH.has(obj.type)) {
          if (!beltsByNode.has(objId)) beltsByNode.set(objId, [])
          beltsByNode.get(objId).push(belt.id)
        }
      }
    }
    for (const ids of beltsByNode.values()) {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i])
    }

    // ── Step 3: promote status to entire component (deficit beats excess) ────
    const componentStatus = new Map() // root → status
    for (const [beltId, status] of rawStatus) {
      const root     = find(beltId)
      const existing = componentStatus.get(root)
      if (!existing || (existing === 'excess' && status === 'deficit')) {
        componentStatus.set(root, status)
      }
    }

    const statuses = new Map()
    for (const belt of belts) {
      const s = componentStatus.get(find(belt.id))
      if (s) statuses.set(belt.id, s)
    }
    return statuses
  }, [objects, belts, flowByBelt, portActualIn])

  // ── Clog detection ────────────────────────────────────────────────────────
  // Warn when a building's theoretical output exceeds what downstream can absorb.

  const buildingClogs = useMemo(() => {
    const fmt = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1)) + '/min'
    const clogs = new Map()
    const beltByFromObjPort = {}
    for (const b of belts) {
      if (!beltByFromObjPort[b.fromObjId]) beltByFromObjPort[b.fromObjId] = {}
      beltByFromObjPort[b.fromObjId][b.fromPortIdx] = b
    }
    for (const obj of objects) {
      if (!BUILDINGS_BY_KEY[obj.type] || !obj.recipeId) continue
      const recipe = RECIPES_BY_ID[obj.recipeId]
      if (!recipe || recipe.outputs.length === 0) continue
      const clockSpeed = obj.clockSpeed ?? 1
      // effectiveFactor: how much of full-speed production is happening (limited by inputs)
      const effectiveFactor = recipe.inputs.length > 0
        ? Math.min(1, ...recipe.inputs.map((inp, portIdx) => {
            const required = inp.perMin * clockSpeed
            return required > 0 ? (portActualIn.get(`${obj.id}:${portIdx}`) ?? 0) / required : 1
          }))
        : 1
      const portBelts = beltByFromObjPort[obj.id] ?? {}
      const reasons = []
      for (let portIdx = 0; portIdx < recipe.outputs.length; portIdx++) {
        const out = recipe.outputs[portIdx]
        const theoreticalOut = out.perMin * clockSpeed * effectiveFactor
        if (theoreticalOut <= 0.01) continue
        const belt = portBelts[portIdx]
        if (!belt) continue  // unconnected output — separate concern
        const actualOut = flowByBelt.get(belt.id) ?? 0
        const excess = theoreticalOut - actualOut
        if (excess > 0.01) reasons.push(`${out.item}: ${fmt(excess)} excess output`)
      }
      if (machineStatus.get(obj.id) === 'backed_up') {
        reasons.push('Machine backed up — output not being consumed')
      }
      if (reasons.length > 0) clogs.set(obj.id, reasons)
    }
    return clogs
  }, [objects, belts, portActualIn, flowByBelt, machineStatus])

  // ── Render ────────────────────────────────────────────────────────────────

  const layersReversed = [...layers].reverse()

  // Precompute occupied port sets per object for this render
  const beltsByFromObj = {}
  const beltsByToObj   = {}
  for (const b of belts) {
    if (!beltsByFromObj[b.fromObjId]) beltsByFromObj[b.fromObjId] = new Set()
    beltsByFromObj[b.fromObjId].add(b.fromPortIdx)
    if (!beltsByToObj[b.toObjId]) beltsByToObj[b.toObjId] = new Set()
    beltsByToObj[b.toObjId].add(b.toPortIdx)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG_COLOR }}>
      <Toolbar
        tool={tool} onToolChange={setTool}
        selectFilter={selectFilter} onSelectFilterChange={setSelectFilter}
        viewOptions={viewOptions}
        onViewToggle={(id) => setViewOptions(prev => prev.map(o => o.id === id ? { ...o, visible: !o.visible } : o))}
        foundationOpacity={foundationOpacity}
        onFoundationOpacityChange={setFoundationOpacity}
        fileName={activeFactoryName} onRename={(name) => renameFactory(activeFactoryId, name)}
        onSave={handleSave} onSaveAs={handleSaveAs} onLoad={handleLoad} onNew={handleNew} onLoadDemo={handleLoadDemo}
      />

      <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT, left: 0, width: `calc(100vw - ${PANEL_WIDTH}px)` }}>
        <FactoryTabBar
          factories={factories}
          activeFactoryId={activeFactoryId}
          onSwitch={handleFactorySwitch}
          onAdd={handleFactoryAdd}
          onRename={renameFactory}
          onDelete={handleFactoryDelete}
          onDuplicate={handleFactoryDuplicate}
        />
      </div>

      <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT + FACTORY_TAB_HEIGHT, left: 0 }}>
        <ErrorBoundary onReset={handleNew}>
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            draggable={tool === 'pan'}
            x={viewport.x}
            y={viewport.y}
            scaleX={viewport.scale}
            scaleY={viewport.scale}
            onDragEnd={(e) => { if (e.target === e.target.getStage()) setViewport(v => ({ ...v, x: e.target.x(), y: e.target.y() })) }}
            onWheel={handleWheel}
            onClick={handleStageClick}
            style={{ cursor: tool === 'pan' ? 'grab' : 'default' }}
          >
            {/* Base grid */}
            <Layer>
              <Rect x={0} y={0} width={GRID_PX} height={GRID_PX} fill={BG_COLOR} listening={false} />
              <Grid />
            </Layer>

            {/* One Konva Layer per UI layer, bottom-to-top */}
            {layersReversed.map(layer => {
              const isActive  = layer.id === selectedId
              const isVisible = isActive || layer.visible
              if (!isVisible) return null
              const opacity   = isActive ? 1 : 0.15
              const layerFoundations = objects.filter(o => o.layerId === layer.id &&  FOUNDATIONS_BY_KEY[o.type])
              const layerBuildings   = objects.filter(o => o.layerId === layer.id && !FOUNDATIONS_BY_KEY[o.type])
              const layerBelts       = belts.filter(b => b.layerId === layer.id)

              return (
                <Layer key={layer.id} opacity={opacity} listening={isActive}>
                  {/* Z-order: foundations (bottom) → belts → buildings (top) */}
                  {viewOptions.find(o => o.id === 'foundations')?.visible && <Group opacity={foundationOpacity}>
                  {layerFoundations.map(obj => (
                    <BuildingObject
                      key={obj.id}
                      obj={obj}
                      isSelected={selectedObjIds.has(obj.id)}
                      isError={false}
                      errorReasons={[]}
                      onShowTooltip={showTooltip}
                      onHideTooltip={hideTooltip}
                      canDrag={tool === 'pointer' && selectFilter !== 'belts' && selectFilter !== 'buildings' && selectFilter !== 'notFoundations'}
                      onDblClick={undefined}
                      onPointerDown={(e) => {
                        if (tool !== 'pointer') return
                        if (selectFilter === 'belts' || selectFilter === 'buildings' || selectFilter === 'notFoundations') return
                        if (e.evt?.ctrlKey) return  // Ctrl+drag → marquee
                        if (e.evt?.altKey) {
                          const sel = selectedObjIds
                          const srcObjs = (sel.has(obj.id) && sel.size > 1)
                            ? objects.filter(o => sel.has(o.id) && FOUNDATIONS_BY_KEY[o.type])
                            : [obj]
                          altZoopRef.current = { srcObjs }
                          suppressMarqueeRef.current = true
                          return
                        }
                        suppressMarqueeRef.current = true
                        e.cancelBubble = true
                        if (e.evt.shiftKey) {
                          setSelectedObjIds(prev => { const next = new Set(prev); next.has(obj.id) ? next.delete(obj.id) : next.add(obj.id); return next })
                        } else if (!selectedObjIds.has(obj.id)) {
                          setSelectedObjIds(new Set([obj.id]))
                        }
                      }}
                      onDragStart={(e) => handleObjDragStart(e, obj.id)}
                      onDragMove={(e)  => handleObjDragMove(e, obj.id)}
                      onDragEnd={(e)   => handleObjDragEnd(e, obj.id)}
                      onPortMouseDown={null}
                      occupiedOutputs={new Set()}
                      occupiedInputs={new Set()}
                      pendingBeltType={null}
                      incomingItems={undefined}
                    />
                  ))}</Group>}

                  {layerBelts.map(belt => (
                    <BeltObject
                      key={belt.id}
                      belt={belt}
                      objects={objects}
                      isSelected={selectedBeltIds.has(belt.id)}
                      flowStatus={beltStatuses.get(belt.id) ?? null}
                      flowRate={flowByBelt.get(belt.id) ?? 0}
                      onMouseDown={(e) => handleBeltMouseDown(e, belt.id)}
                      onDblClick={(e) => handleBeltDblClick(e, belt.id)}
                      onBeltHover={() => handleBeltHover(belt.id)}
                      onBeltLeave={hideTooltip}
                    />
                  ))}

                  {layerBuildings.map(obj => (
                    <BuildingObject
                      key={obj.id}
                      obj={obj}
                      isSelected={selectedObjIds.has(obj.id)}
                      isError={buildingErrors.has(obj.id)}
                      errorReasons={buildingErrors.get(obj.id) ?? []}
                      isClogged={buildingClogs.has(obj.id)}
                      clogReasons={buildingClogs.get(obj.id) ?? []}
                      onShowTooltip={showTooltip}
                      onHideTooltip={hideTooltip}
                      canDrag={tool === 'pointer' && (() => {
                        const d = ALL_BUILDINGS_BY_KEY[obj.type]
                        if (selectFilter === 'belts'          && obj.type !== 'connection_point')                      return false
                        if (selectFilter === 'foundations')                                                             return false
                        return true
                      })()}
                      onDblClick={
                        (selectFilter === 'belts' && obj.type !== 'connection_point') ||
                        selectFilter === 'foundations'
                          ? undefined
                          : obj.type === 'floor_input'
                          ? () => setFloorInputModal({ open: true, objId: obj.id })
                          : obj.type === 'splitter'
                          ? () => setSplitterModal({ open: true, objId: obj.id })
                          : (obj.type === 'conveyor_lift_in' || obj.type === 'conveyor_lift_out')
                          ? () => setConveyorLiftConfigModal({ open: true, objId: obj.id })
                          : BUILDINGS_BY_KEY[obj.type]
                          ? () => setRecipeModal({ open: true, objId: obj.id })
                          : undefined
                      }
                      onPointerDown={(e) => {
                        if (tool !== 'pointer') return
                        const def = ALL_BUILDINGS_BY_KEY[obj.type]
                        if (selectFilter === 'belts'       && obj.type !== 'connection_point') return
                        if (selectFilter === 'foundations')                                     return
                        if (e.evt.ctrlKey) return  // Ctrl+drag → marquee
                        suppressMarqueeRef.current = true
                        e.cancelBubble = true
                        if (e.evt.shiftKey) {
                          setSelectedObjIds(prev => {
                            const next = new Set(prev)
                            if (next.has(obj.id)) next.delete(obj.id)
                            else next.add(obj.id)
                            return next
                          })
                        } else if (!selectedObjIds.has(obj.id)) {
                          setSelectedObjIds(new Set([obj.id]))
                        }
                      }}
                      onDragStart={(e) => handleObjDragStart(e, obj.id)}
                      onDragMove={(e)  => handleObjDragMove(e, obj.id)}
                      onDragEnd={(e)   => handleObjDragEnd(e, obj.id)}
                      onPortMouseDown={
                        selectFilter === 'buildings' || selectFilter === 'foundations'
                          ? null
                          : (portIdx) => handlePortMouseDown(obj.id, portIdx)
                      }
                      occupiedOutputs={beltsByFromObj[obj.id]}
                      occupiedInputs={beltsByToObj[obj.id]}
                      pendingBeltType={pendingBelt?.portType ?? null}
                      incomingItems={
                        obj.type === 'floor_output' || obj.type === 'conveyor_lift_in'
                          ? belts
                              .filter(b => b.toObjId === obj.id)
                              .map(b => ({ item: itemByBelt.get(b.id) ?? null, rate: flowByBelt.get(b.id) ?? 0 }))
                              .filter(x => x.item)
                          : obj.type === 'conveyor_lift_out'
                          ? belts
                              .filter(b => b.fromObjId === obj.id)
                              .map(b => ({ item: itemByBelt.get(b.id) ?? null, rate: flowByBelt.get(b.id) ?? 0 }))
                              .filter(x => x.item)
                          : undefined}
                    />
                  ))}
                </Layer>
              )
            })}

            {/* Marquee selection rectangle */}
            {marquee && (
              <Layer listening={false}>
                <Rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.w}
                  height={marquee.h}
                  fill="#4a9eda18"
                  stroke="#4a9eda"
                  strokeWidth={1 / viewport.scale}
                  dash={[6 / viewport.scale, 4 / viewport.scale]}
                />
              </Layer>
            )}

            {/* Pending belt preview — above all layers */}
            {pendingBelt && (
              <Layer listening={false}>
                <Line
                  points={[pendingBelt.sx, pendingBelt.sy, pendingBelt.cx, pendingBelt.cy]}
                  stroke="#e8a01388"
                  strokeWidth={CELL_SIZE * 2}
                  lineCap="round"
                />
              </Layer>
            )}
          </Stage>
        </ErrorBoundary>
      </div>

      <CoordHUD position={viewport} scale={viewport.scale} stageWidth={dimensions.width} stageHeight={dimensions.height} />
      <ZoomControls onZoom={handleZoomBtn} onReset={handleReset} />

      <LayersPanel
        layers={layers}
        selectedId={selectedId}
        onSelect={selectLayer}
        onToggleVisible={toggleVisible}
        onRename={renameLayer}
        onAdd={addLayer}
        onDelete={deleteLayer}
        onReorder={reorderLayers}
        onAddBuilding={addBuilding}
        selectedObj={selectedObjIds.size === 1
          ? objects.find(o => o.id === [...selectedObjIds][0]) ?? null
          : null}
        selectedObjIds={selectedObjIds}
        onChangeFoundationColor={handleChangeFoundationColor}
        objects={objects}
        selectedBeltGroup={selectedBeltIds.size === 1
          ? { ...computeBeltGroup([...selectedBeltIds][0], belts, objects, flowByBelt, portActualIn, itemByBelt), selectedBeltId: [...selectedBeltIds][0] }
          : null}
        buildingErrors={buildingErrors}
        portActualIn={portActualIn}
        flowByBelt={flowByBelt}
        itemByBelt={itemByBelt}
        belts={belts}
      />

      <FloorInputModal
        open={floorInputModal.open}
        item={objects.find(o => o.id === floorInputModal.objId)?.item ?? null}
        ratePerMin={objects.find(o => o.id === floorInputModal.objId)?.ratePerMin ?? 60}
        onConfirm={handleFloorInputConfirm}
        onCancel={() => setFloorInputModal({ open: false, objId: null })}
      />

      {(() => {
        const obj = objects.find(o => o.id === recipeModal.objId)
        return (
          <RecipeModal
            open={recipeModal.open}
            buildingType={obj?.type ?? ''}
            recipeId={obj?.recipeId ?? null}
            clockSpeed={obj?.clockSpeed ?? 1.0}
            onConfirm={handleRecipeConfirm}
            onCancel={() => setRecipeModal({ open: false, objId: null })}
          />
        )
      })()}

      <SplitterModal
        open={splitterModal.open}
        outputFilters={objects.find(o => o.id === splitterModal.objId)?.outputFilters ?? ['any', 'any', 'any']}
        onConfirm={handleSplitterConfirm}
        onCancel={() => setSplitterModal({ open: false, objId: null })}
      />

      <ConveyorLiftModal
        open={conveyorLiftModal.open}
        layers={layers}
        currentLayerId={selectedId}
        onConfirm={handleConveyorLiftConfirm}
        onCancel={() => setConveyorLiftModal({ open: false, x: 0, y: 0 })}
      />

      {(() => {
        const obj       = objects.find(o => o.id === conveyorLiftConfigModal.objId)
        const linkedObj = objects.find(o => o.id === obj?.linkedLiftId)
        return (
          <ConveyorLiftConfigModal
            open={conveyorLiftConfigModal.open}
            layers={layers}
            currentLayerId={obj?.layerId ?? selectedId}
            linkedLayerId={linkedObj?.layerId ?? null}
            isCurrentIn={obj?.type === 'conveyor_lift_in'}
            onConfirm={handleConveyorLiftConfigConfirm}
            onCancel={() => setConveyorLiftConfigModal({ open: false, objId: null })}
          />
        )
      })()}

      {/* Tooltip */}
      {tooltip && (
        <div
          ref={el => { tooltipElRef.current = el }}
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: '#0a1520',
            border: '1px solid #1e3a54',
            borderRadius: 4,
            padding: '6px 10px',
            pointerEvents: 'none',
            zIndex: 200,
            boxShadow: '0 2px 12px #00000066',
          }}
        >
          {tooltip.content.map((line, i) =>
            line.text === ''
              ? <div key={i} style={{ height: 5 }} />
              : <div key={i} style={{ color: line.color, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{line.text}</div>
          )}
        </div>
      )}
    </div>
  )
}
