import { useState, useCallback, useEffect, useRef } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import { CELL_SIZE, GRID_CELLS, GRID_PX, PANEL_WIDTH, TOOLBAR_HEIGHT } from './constants'
import Toolbar from './Toolbar.jsx'
import LayersPanel, { useLayers } from './LayersPanel.jsx'
import BuildingObject from './BuildingObject.jsx'
import { BUILDINGS_BY_KEY } from './buildings.js'

const BG_COLOR    = '#0a1118'
const MINOR_COLOR = '#141e28'
const MAJOR_COLOR = '#1a2a38'
const AXIS_COLOR  = '#1e3a54'

let _nextObjId = 1

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
  const wasDraggingMarqueeRef = useRef(false)

  const [tool, setTool] = useState('pointer')

  const stageW = () => window.innerWidth  - PANEL_WIDTH
  const stageH = () => window.innerHeight - TOOLBAR_HEIGHT

  const [dimensions, setDimensions] = useState({ width: stageW(), height: stageH() })

  const center = Math.floor(GRID_CELLS / 2)
  const [viewport, setViewport] = useState(() => ({
    scale: 1,
    x: stageW() / 2 - center * CELL_SIZE,
    y: stageH() / 2 - center * CELL_SIZE,
  }))

  const { layers, selectedId, addLayer, toggleVisible, renameLayer, selectLayer, reorderLayers } = useLayers()

  const [objects, setObjects]               = useState([])
  const [selectedObjIds, setSelectedObjIds] = useState(new Set())
  const [marquee, setMarquee]               = useState(null)

  // Keep refs in sync with latest state for use in stable callbacks
  viewportRef.current       = viewport
  selectedObjIdsRef.current = selectedObjIds
  objectsRef.current        = objects

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
      if (e.key === 'Escape') setSelectedObjIds(new Set())
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjIdsRef.current.size > 0) {
        const ids = selectedObjIdsRef.current
        setObjects(prev => prev.filter(o => !ids.has(o.id)))
        setSelectedObjIds(new Set())
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
  }, [])

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
    // Capture start positions for the dragged object + all co-selected objects
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

    const starts = dragStartPositionsRef.current
    const startPos = starts?.get(id)
    if (startPos && starts.size > 1) {
      // Move all co-selected objects by the same delta
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

    const starts = dragStartPositionsRef.current
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

  // Click on stage background: deselect (unless ending a marquee drag)
  const handleStageClick = useCallback((e) => {
    if (wasDraggingMarqueeRef.current) {
      wasDraggingMarqueeRef.current = false
      return
    }
    if (e.target === e.target.getStage()) setSelectedObjIds(new Set())
  }, [])

  // ── Marquee selection ─────────────────────────────────────────────────────

  const handleStageMouseDown = useCallback((e) => {
    if (tool !== 'pointer' || e.evt.button !== 0) return
    const pos = stageRef.current.getPointerPosition()
    const vp = viewportRef.current
    marqueeStartRef.current = {
      cx: (pos.x - vp.x) / vp.scale,
      cy: (pos.y - vp.y) / vp.scale,
    }
    wasDraggingMarqueeRef.current = false
  }, [tool])

  const handleStageMouseMove = useCallback(() => {
    if (!marqueeStartRef.current) return
    const pos = stageRef.current.getPointerPosition()
    const vp = viewportRef.current
    const cx = (pos.x - vp.x) / vp.scale
    const cy = (pos.y - vp.y) / vp.scale
    const { cx: sx, cy: sy } = marqueeStartRef.current
    const w = Math.abs(cx - sx)
    const h = Math.abs(cy - sy)
    if (w > 4 || h > 4) {
      wasDraggingMarqueeRef.current = true
      setMarquee({ x: Math.min(sx, cx), y: Math.min(sy, cy), w, h })
    }
  }, [])

  const handleStageMouseUp = useCallback(() => {
    if (!marqueeStartRef.current) return
    const start = marqueeStartRef.current
    marqueeStartRef.current = null

    if (!wasDraggingMarqueeRef.current) {
      setMarquee(null)
      return
    }

    const pos = stageRef.current.getPointerPosition()
    const vp = viewportRef.current
    const endX = (pos.x - vp.x) / vp.scale
    const endY = (pos.y - vp.y) / vp.scale
    const mx = Math.min(start.cx, endX)
    const my = Math.min(start.cy, endY)
    const mw = Math.abs(endX - start.cx)
    const mh = Math.abs(endY - start.cy)

    const selected = new Set(
      objectsRef.current
        .filter(obj => {
          const def = BUILDINGS_BY_KEY[obj.type]
          if (!def) return false
          const hw = def.w * CELL_SIZE / 2
          const hh = def.h * CELL_SIZE / 2
          return obj.x - hw < mx + mw && obj.x + hw > mx &&
                 obj.y - hh < my + mh && obj.y + hh > my
        })
        .map(o => o.id)
    )
    setSelectedObjIds(selected)
    setMarquee(null)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  const layersReversed = [...layers].reverse()

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG_COLOR }}>
      <Toolbar tool={tool} onToolChange={setTool} />

      <div style={{ position: 'absolute', top: TOOLBAR_HEIGHT, left: 0 }}>
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
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
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

            return (
              <Layer key={layer.id} opacity={opacity}>
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
                        // Shift-click: toggle this object in/out of selection
                        setSelectedObjIds(prev => {
                          const next = new Set(prev)
                          if (next.has(obj.id)) next.delete(obj.id)
                          else next.add(obj.id)
                          return next
                        })
                      } else if (!selectedObjIds.has(obj.id)) {
                        // Normal click on unselected object: select only it
                        setSelectedObjIds(new Set([obj.id]))
                      }
                      // Normal click on already-selected object: keep selection (allows drag)
                    }}
                    onDragStart={(e) => handleObjDragStart(e, obj.id)}
                    onDragMove={(e)  => handleObjDragMove(e, obj.id)}
                    onDragEnd={(e)   => handleObjDragEnd(e, obj.id)}
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
        </Stage>
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
