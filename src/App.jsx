import { useState, useCallback, useEffect, useRef, Component } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import { CELL_SIZE, GRID_CELLS, GRID_PX, PANEL_WIDTH, TOOLBAR_HEIGHT } from './constants'
import Toolbar from './Toolbar.jsx'
import LayersPanel, { useLayers } from './LayersPanel.jsx'
import BuildingObject from './BuildingObject.jsx'
import BeltObject from './BeltObject.jsx'
import { ALL_BUILDINGS_BY_KEY, getPortWorldPos, findNearestInputPort } from './portUtils.js'

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

const OBJ_KEY      = 'sp-objects'
const VIEWPORT_KEY = 'sp-viewport'
const BELTS_KEY    = 'sp-belts'

function loadObjects() {
  try {
    const saved = localStorage.getItem(OBJ_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      _nextObjId = parsed.nextObjId ?? _nextObjId
      return parsed.objects ?? []
    }
  } catch {}
  return []
}

function loadBelts() {
  try {
    const saved = localStorage.getItem(BELTS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      _nextBeltId = parsed.nextBeltId ?? _nextBeltId
      return parsed.belts ?? []
    }
  } catch {}
  return []
}

function loadViewport(w, h) {
  try {
    const saved = localStorage.getItem(VIEWPORT_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  const center = Math.floor(GRID_CELLS / 2)
  return { scale: 1, x: w / 2 - center * CELL_SIZE, y: h / 2 - center * CELL_SIZE }
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
  const dragStartPositionsRef = useRef(null)
  const marqueeStartRef       = useRef(null)
  const marqueeRef            = useRef(null)   // mirrors marquee state for event handler access
  const wasDraggingMarqueeRef = useRef(false)
  const toolRef               = useRef('pointer')
  const beltsRef              = useRef([])
  const pendingBeltRef        = useRef(null)
  const selectedIdRef         = useRef(1)
  const beltDragStartRef      = useRef(null)  // { beltId, wx, wy } — potential split drag
  const beltSplitDragRef      = useRef(null)  // { cpId } — actively dragging a split CP

  const [tool, setTool] = useState('pointer')

  const stageW = () => window.innerWidth  - PANEL_WIDTH
  const stageH = () => window.innerHeight - TOOLBAR_HEIGHT

  const [dimensions, setDimensions] = useState({ width: stageW(), height: stageH() })

  const center = Math.floor(GRID_CELLS / 2)
  const [viewport, setViewport] = useState(() => loadViewport(stageW(), stageH()))

  const {
    layers, selectedId,
    addLayer, toggleVisible, renameLayer, selectLayer, reorderLayers,
    restoreLayerState, _nextLayerId, _nextFloorNum,
  } = useLayers()

  const [objects, setObjects]               = useState(() => loadObjects())
  const [belts, setBelts]                   = useState(() => loadBelts())
  const [selectedObjIds, setSelectedObjIds] = useState(new Set())
  const [selectedBeltIds, setSelectedBeltIds] = useState(new Set())
  const [pendingBelt, setPendingBelt]       = useState(null)
  const [marquee, setMarquee]               = useState(null)
  const [fileName, setFileName]             = useState(null)

  // Keep refs in sync with latest state for use in stable callbacks
  viewportRef.current       = viewport
  selectedObjIdsRef.current = selectedObjIds
  objectsRef.current        = objects
  toolRef.current           = tool
  beltsRef.current          = belts
  pendingBeltRef.current    = pendingBelt
  selectedIdRef.current     = selectedId

  // Persist objects, belts, and viewport to localStorage
  useEffect(() => {
    localStorage.setItem(OBJ_KEY, JSON.stringify({ objects, nextObjId: _nextObjId }))
  }, [objects])

  useEffect(() => {
    localStorage.setItem(BELTS_KEY, JSON.stringify({ belts, nextBeltId: _nextBeltId }))
  }, [belts])

  useEffect(() => {
    localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport))
  }, [viewport])

  // Resize
  useEffect(() => {
    const onResize = () => setDimensions({ width: stageW(), height: stageH() })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Keyboard: tool switch, rotate (single select only), delete
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
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
          setObjects(prev => prev.filter(o => !ids.has(o.id)))
          // Remove belts connected to deleted objects
          setBelts(prev => prev.filter(b => !ids.has(b.fromObjId) && !ids.has(b.toObjId)))
          setSelectedObjIds(new Set())
        }
        if (selectedBeltIds.size > 0) {
          const ids = selectedBeltIds
          setBelts(prev => prev.filter(b => !ids.has(b.id)))
          setSelectedBeltIds(new Set())
        }
      }
      if ((e.key === 'r' || e.key === 'R') &&
          draggingObjRef.current !== null &&
          selectedObjIdsRef.current.size <= 1) {
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
    const obj = {
      id:       _nextObjId++,
      type,
      layerId:  selectedId,
      rotation: 0,
      x:        snap(vpX),
      y:        snap(vpY),
    }
    setObjects(prev => [...prev, obj])
    setSelectedObjIds(new Set([obj.id]))
  }, [dimensions, viewport, selectedId])

  const updateObjPos = useCallback((id, x, y) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, x, y } : o))
  }, [])

  const handleObjDragStart = useCallback((e, id) => {
    draggingObjRef.current = id
    const sel = selectedObjIdsRef.current
    const toTrack = sel.has(id) ? sel : new Set([id])
    dragStartPositionsRef.current = new Map(
      objectsRef.current
        .filter(o => toTrack.has(o.id))
        .map(o => [o.id, { x: o.x, y: o.y }])
    )
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
      setObjects(prev => prev.map(o => {
        if (o.id === id) return { ...o, x, y }
        const sp = starts.get(o.id)
        return sp ? { ...o, x: snap(sp.x + dx), y: snap(sp.y + dy) } : o
      }))
    } else {
      updateObjPos(id, x, y)
    }
  }, [updateObjPos])

  const handleObjDragEnd = useCallback((e, id) => {
    draggingObjRef.current = null
    const node = e.target
    const x = snap(node.x())
    const y = snap(node.y())

    const starts   = dragStartPositionsRef.current
    const startPos = starts?.get(id)
    if (startPos && starts.size > 1) {
      const dx = x - startPos.x
      const dy = y - startPos.y
      setObjects(prev => prev.map(o => {
        if (o.id === id) return { ...o, x, y }
        const sp = starts.get(o.id)
        return sp ? { ...o, x: snap(sp.x + dx), y: snap(sp.y + dy) } : o
      }))
    } else {
      updateObjPos(id, x, y)
    }
    dragStartPositionsRef.current = null
  }, [updateObjPos])

  // ── Port interaction ───────────────────────────────────────────────────────

  const handlePortMouseDown = useCallback((objId, portIdx) => {
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
      const rect = container.getBoundingClientRect()
      const hit  = stageRef.current.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      if (hit) return
      const { x, y } = toCanvas(e.clientX, e.clientY)
      marqueeStartRef.current       = { cx: x, cy: y }
      wasDraggingMarqueeRef.current = false
    }

    const snap = (v) => Math.round(v / CELL_SIZE) * CELL_SIZE

    const onMouseMove = (e) => {
      // Belt split: check if drag exceeds threshold → create CP and split
      if (beltDragStartRef.current) {
        const { beltId, wx: startWx, wy: startWy } = beltDragStartRef.current
        const { x: wx, y: wy } = toCanvas(e.clientX, e.clientY)
        const vp = viewportRef.current
        if (Math.hypot((wx - startWx) * vp.scale, (wy - startWy) * vp.scale) > 6) {
          beltDragStartRef.current = null
          const belt = beltsRef.current.find(b => b.id === beltId)
          if (belt) {
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
      const selected = new Set(
        objectsRef.current
          .filter(obj => {
            if (obj.layerId !== activeLayerId) return false
            const def = ALL_BUILDINGS_BY_KEY[obj.type]
            if (!def) return false
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

  const handleSave = useCallback(() => {
    const state = {
      version: 1,
      objects,
      nextObjId: _nextObjId,
      belts,
      nextBeltId: _nextBeltId,
      layers,
      selectedLayerId: selectedId,
      nextLayerId: _nextLayerId(),
      nextFloorNum: _nextFloorNum(),
      viewport,
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = fileName ?? 'factory.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [objects, belts, layers, selectedId, viewport, fileName, _nextLayerId, _nextFloorNum])

  const handleNew = useCallback(() => {
    _nextObjId  = 1
    _nextBeltId = 1
    setObjects([])
    setBelts([])
    setSelectedObjIds(new Set())
    setSelectedBeltIds(new Set())
    restoreLayerState(
      [{ id: 1, name: 'Floor 1', visible: true }],
      1, 2, 2,
    )
    setViewport({ scale: 1, x: dimensions.width / 2 - Math.floor(GRID_CELLS / 2) * CELL_SIZE, y: dimensions.height / 2 - Math.floor(GRID_CELLS / 2) * CELL_SIZE })
    setFileName(null)
  }, [dimensions.width, dimensions.height])

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
          const state = JSON.parse(ev.target.result)
          _nextObjId  = state.nextObjId  ?? _nextObjId
          _nextBeltId = state.nextBeltId ?? _nextBeltId
          setObjects(state.objects ?? [])
          setBelts(state.belts ?? [])
          setSelectedObjIds(new Set())
          setSelectedBeltIds(new Set())
          restoreLayerState(
            state.layers ?? [{ id: 1, name: 'Floor 1', visible: true }],
            state.selectedLayerId ?? 1,
            state.nextLayerId ?? 2,
            state.nextFloorNum ?? 2,
          )
          if (state.viewport) setViewport(state.viewport)
          setFileName(file.name)
        } catch (err) {
          console.error('Failed to load file, starting fresh:', err)
          handleNew()
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [restoreLayerState, handleNew])

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
      <Toolbar tool={tool} onToolChange={setTool} fileName={fileName} onRename={setFileName} onSave={handleSave} onLoad={handleLoad} onNew={handleNew} />

      <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT, left: 0 }}>
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
              const layerObjs = objects.filter(o => o.layerId === layer.id)
              const layerBelts = belts.filter(b => b.layerId === layer.id)

              return (
                <Layer key={layer.id} opacity={opacity} listening={isActive}>
                  {/* Belts render behind buildings */}
                  {layerBelts.map(belt => (
                    <BeltObject
                      key={belt.id}
                      belt={belt}
                      objects={objects}
                      isSelected={selectedBeltIds.has(belt.id)}
                      onMouseDown={(e) => handleBeltMouseDown(e, belt.id)}
                      onDblClick={(e) => handleBeltDblClick(e, belt.id)}
                    />
                  ))}

                  {layerObjs.map(obj => (
                    <BuildingObject
                      key={obj.id}
                      obj={obj}
                      isSelected={selectedObjIds.has(obj.id)}
                      canDrag={tool === 'pointer'}
                      onPointerDown={(e) => {
                        if (tool !== 'pointer') return
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
                      onPortMouseDown={(portIdx) => handlePortMouseDown(obj.id, portIdx)}
                      occupiedOutputs={beltsByFromObj[obj.id]}
                      occupiedInputs={beltsByToObj[obj.id]}
                      pendingBeltType={pendingBelt?.portType ?? null}
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
        onReorder={reorderLayers}
        onAddBuilding={addBuilding}
      />
    </div>
  )
}
