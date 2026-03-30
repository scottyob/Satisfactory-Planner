import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Rect, Group, Text, Line, Circle, Image as KonvaImage } from 'react-konva'
import { WORLD_CELL_SIZE, PANEL_WIDTH, TOOLBAR_HEIGHT, FACTORY_TAB_HEIGHT } from './constants'

const BG_COLOR       = '#0a1118'
const MINOR_COLOR    = '#141e28'
const MAJOR_COLOR    = '#1a2a38'
const FACTORY_FILL   = '#1a3a5c'
const FACTORY_STROKE = '#4a9eda'
const BELT_COLOR     = '#e87c13'
const CONN_IN_COLOR  = '#5ee877'
const CONN_OUT_COLOR = '#e8a013'
const SEL_DASH       = [6, 4]

const WORLD_GRID_CELLS = 100
const WORLD_GRID_PX    = WORLD_CELL_SIZE * WORLD_GRID_CELLS
const MIN_SCALE        = 0.05
const MAX_SCALE        = 4.0
const MIN_FACTORY_CELLS = 6

// Connector dimensions (world pixels)
const CONN_W = WORLD_CELL_SIZE * 1.5   // length along factory edge
const CONN_D = WORLD_CELL_SIZE * 0.4   // depth protruding from edge
const CONN_SPACING = WORLD_CELL_SIZE * 2   // space between connector centers
// Bus strip width
const BUS_W    = 14
// Resize handle dimensions (world px)
const HANDLE_H = 16
const HANDLE_W = 34

function stageW() { return window.innerWidth  - PANEL_WIDTH }
function stageH() { return window.innerHeight - TOOLBAR_HEIGHT - FACTORY_TAB_HEIGHT }

function WorldGrid() {
  const lines = []
  for (let i = 0; i <= WORLD_GRID_CELLS; i++) {
    const pos     = i * WORLD_CELL_SIZE
    const isAxis  = i === Math.floor(WORLD_GRID_CELLS / 2)
    const isMajor = i % 5 === 0
    const color   = isAxis ? '#1e3a54' : isMajor ? MAJOR_COLOR : MINOR_COLOR
    const width   = isAxis ? 1.5 : isMajor ? 0.75 : 0.4
    lines.push(
      <Line key={`v${i}`} points={[pos, 0, pos, WORLD_GRID_PX]} stroke={color} strokeWidth={width} listening={false} />,
      <Line key={`h${i}`} points={[0, pos, WORLD_GRID_PX, pos]} stroke={color} strokeWidth={width} listening={false} />
    )
  }
  return <>{lines}</>
}

function computeFactorySize(connectors) {
  const eastCount = (connectors ?? []).filter(c => c.side === 'east').length
  const westCount = (connectors ?? []).filter(c => c.side === 'west').length
  const vCount    = Math.max(eastCount, westCount, 0)
  const wCells    = MIN_FACTORY_CELLS
  const hCells    = Math.max(MIN_FACTORY_CELLS, vCount * 4 + 2)
  return { w: wCells * WORLD_CELL_SIZE, h: hCells * WORLD_CELL_SIZE }
}

/** World position of the center of a connector (relative to factory top-left). */
function connectorCenter(connector, factoryH) {
  const halfH = factoryH / 2
  const off   = (connector.offset ?? 0) * CONN_SPACING
  if (connector.side === 'west') return { cx: -CONN_D / 2, cy: halfH + off }
  return { cx: 0, cy: halfH + off }  // east: will add factoryW in caller
}

/** Belt-style connector marker, matching the factory editor aesthetic. */
function WorldConnectorMarker({ connector, factoryW, factoryH, onMouseDown }) {
  const { side, flow, item, perMin, offset } = connector
  const isInput = flow === 'in'
  const color   = isInput ? CONN_IN_COLOR : CONN_OUT_COLOR
  const halfH   = factoryH / 2
  const off     = (offset ?? 0) * CONN_SPACING

  let rectX, rectY
  if (side === 'west') { rectX = -CONN_D; rectY = halfH + off - CONN_W / 2 }
  else                 { rectX = factoryW; rectY = halfH + off - CONN_W / 2 }

  // 2 arrow chevrons inside connector rect, pointing right (→)
  const arrowCount = 2
  const arrowStep  = CONN_W / (arrowCount + 1)
  const arrowD     = CONN_D * 0.45
  const arrowHW    = CONN_D * 0.22
  const tipX       = CONN_D * 0.72
  const baseX      = tipX - arrowD

  const arrows = Array.from({ length: arrowCount }, (_, i) => {
    const ay = arrowStep * (i + 1)
    return (
      <Line key={i}
        points={[tipX, ay, baseX, ay - arrowHW, baseX, ay + arrowHW]}
        closed fill={color} opacity={0.75} listening={false}
      />
    )
  })

  return (
    <Group
      x={rectX} y={rectY}
      onMouseDown={(e) => { e.cancelBubble = true; onMouseDown?.(connector) }}
    >
      <Rect
        width={CONN_D} height={CONN_W}
        fill={color} opacity={0.25}
        stroke={color} strokeWidth={1.5}
        cornerRadius={2}
        listening={!!onMouseDown}
      />
      {arrows}
    </Group>
  )
}

function normalizeBus(b) {
  if (b.x !== undefined) return b
  // Migrate old format {x1,y1,x2,y2} → {x, y1, y2}
  const x = Math.round(((b.x1 ?? 0) + (b.x2 ?? 0)) / 2 / WORLD_CELL_SIZE) * WORLD_CELL_SIZE
  return { id: b.id, x, y1: Math.min(b.y1 ?? 0, b.y2 ?? 0), y2: Math.max(b.y1 ?? 0, b.y2 ?? 0) }
}

/** Compute cumulative item flow through bus segments. */
function computeBusFlowSegments(bus, busConnections, worldFactories) {
  const conns = (busConnections ?? [])
    .filter(bc => bc.busId === bus.id)
    .map(bc => {
      const wf  = (worldFactories ?? []).find(f => f.factoryId === bc.factoryId)
      const con = (wf?.connectors ?? []).find(c => c.id === bc.connectorId)
      return con ? { ...bc, item: con.item, perMin: con.perMin, flow: con.flow } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y)

  const segments = []
  let running = {}  // item → net available

  for (let i = 0; i <= conns.length; i++) {
    const fromY = i === 0 ? bus.y1 : conns[i - 1].y
    const toY   = i === conns.length ? bus.y2 : conns[i].y

    if (i > 0) {
      const c = conns[i - 1]
      if (c.item && c.perMin) {
        running = { ...running }
        if (c.flow === 'out') {
          running[c.item] = (running[c.item] ?? 0) + c.perMin
        } else {
          running[c.item] = (running[c.item] ?? 0) - c.perMin
        }
      }
    }

    segments.push({ fromY, toY, flow: { ...running } })
  }

  return { conns, segments }
}

function BusHandle({ x, y, onMouseDown, isSelected }) {
  const halfHW = HANDLE_W / 2
  return (
    <Group x={x - halfHW} y={y - HANDLE_H / 2} onMouseDown={onMouseDown}>
      <Rect
        width={HANDLE_W} height={HANDLE_H}
        fill={BELT_COLOR} opacity={isSelected ? 0.65 : 0.35}
        stroke={BELT_COLOR} strokeWidth={1.5}
        cornerRadius={3}
      />
      <Line points={[HANDLE_W * 0.2, HANDLE_H * 0.35, HANDLE_W * 0.8, HANDLE_H * 0.35]}
        stroke="#fff" strokeWidth={1} opacity={0.55} listening={false} />
      <Line points={[HANDLE_W * 0.2, HANDLE_H * 0.65, HANDLE_W * 0.8, HANDLE_H * 0.65]}
        stroke="#fff" strokeWidth={1} opacity={0.55} listening={false} />
    </Group>
  )
}

function BusShape({ bus, busConnections, worldFactories, isSelected, onSelect, draggingConnector, onConnectorDrop, onBodyMouseDown, onTopHandleMouseDown, onBottomHandleMouseDown, onBusHover, onBusUnhover }) {
  const nb = normalizeBus(bus)
  const { conns, segments } = computeBusFlowSegments(nb, busConnections, worldFactories)

  const bx     = nb.x
  const halfW  = BUS_W / 2
  const totalH = nb.y2 - nb.y1

  // Downward direction arrows
  const arrowSpacing = WORLD_CELL_SIZE * 1.8
  const arrowCount   = Math.max(1, Math.floor(totalH / arrowSpacing))
  const arrowHW      = BUS_W * 0.38
  const arrowD       = BUS_W * 0.55

  const arrows = Array.from({ length: arrowCount }, (_, i) => {
    const ay = nb.y1 + (i + 1) * totalH / (arrowCount + 1)
    return (
      <Line key={i}
        points={[bx, ay + arrowD, bx - arrowHW, ay - arrowD, bx + arrowHW, ay - arrowD]}
        closed fill={BELT_COLOR} opacity={0.65} listening={false}
      />
    )
  })

  return (
    <Group>
      {/* Belt body */}
      <Rect
        x={bx - halfW} y={nb.y1}
        width={BUS_W} height={totalH}
        fill="#160900"
        stroke={isSelected ? '#ffffff' : BELT_COLOR}
        strokeWidth={isSelected ? 2.5 : 2}
        cornerRadius={3}
        onMouseDown={(e) => {
          if (draggingConnector) return
          e.cancelBubble = true
          onBodyMouseDown?.(nb.id, e, nb)
        }}
        onClick={(e) => { e.cancelBubble = true; onSelect?.(nb.id) }}
        onMouseEnter={() => onBusHover?.(nb.id)}
        onMouseLeave={() => onBusUnhover?.()}
        onMouseUp={(e) => {
          if (!draggingConnector) return
          e.cancelBubble = true
          const stage = e.target.getStage()
          const ptr   = stage.getPointerPosition()
          const inv   = stage.getAbsoluteTransform().copy().invert()
          const wp    = inv.point(ptr)
          const snapY = Math.round(wp.y / WORLD_CELL_SIZE) * WORLD_CELL_SIZE
          const clamped = Math.max(nb.y1, Math.min(nb.y2, snapY))
          onConnectorDrop?.(nb.id, clamped)
        }}
      />
      {arrows}

      {/* Connection circles */}
      {conns.map(conn => (
        <Circle key={conn.id}
          x={bx} y={conn.y}
          radius={6}
          fill={BELT_COLOR} stroke="#ffffff" strokeWidth={1.5}
          listening={false}
        />
      ))}

      {/* Item icons per segment, to the right of the bus */}
      {segments.map((seg, si) => {
        const items = Object.entries(seg.flow).filter(([, v]) => Math.abs(v) > 0.01)
        if (items.length === 0 || seg.toY <= seg.fromY) return null
        const midY    = (seg.fromY + seg.toY) / 2
        const totalH  = items.length * (ICON_SIZE * 1.6) - ICON_SIZE * 0.6
        const startCY = midY - totalH / 2 + ICON_SIZE / 2
        const iconCX  = bx + BUS_W / 2 + ICON_SIZE / 2 + 6
        return items.map(([item, amt], ji) => (
          <ConnectorIcon
            key={`${si}-${ji}`}
            item={item}
            perMin={Math.round(amt * 10) / 10}
            cx={iconCX}
            cy={startCY + ji * ICON_SIZE * 1.6}
            color={BELT_COLOR}
          />
        ))
      })}

      {/* Top resize handle */}
      <BusHandle
        x={bx} y={nb.y1} isSelected={isSelected}
        onMouseDown={(e) => { e.cancelBubble = true; onTopHandleMouseDown?.(nb.id, e, nb) }}
      />

      {/* Bottom resize handle */}
      <BusHandle
        x={bx} y={nb.y2} isSelected={isSelected}
        onMouseDown={(e) => { e.cancelBubble = true; onBottomHandleMouseDown?.(nb.id, e, nb) }}
      />
    </Group>
  )
}

/** Connection lines from factory connectors to bus taps. */
function BusConnectionLine({ busConnection, bus, worldFactory, isSelected, onSelect }) {
  const nb  = normalizeBus(bus)
  const wf  = worldFactory
  const con = (wf?.connectors ?? []).find(c => c.id === busConnection.connectorId)
  if (!con || !wf) return null
  const { w, h } = computeFactorySize(wf.connectors)

  let cx, cy
  if (con.side === 'west') {
    cx = wf.x - CONN_D / 2
  } else {
    cx = wf.x + w + CONN_D / 2
  }
  cy = wf.y + h / 2 + (con.offset ?? 0) * CONN_SPACING

  const color = con.flow === 'in' ? CONN_IN_COLOR : CONN_OUT_COLOR
  return (
    <Line
      points={[cx, cy, nb.x, busConnection.y]}
      stroke={isSelected ? '#ffffff' : color}
      strokeWidth={isSelected ? 3 : 1.5}
      dash={[6, 4]}
      opacity={isSelected ? 1 : 0.6}
      hitStrokeWidth={12}
      onClick={(e) => { e.cancelBubble = true; onSelect?.() }}
    />
  )
}

function useItemImage(item) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!item) { setImg(null); return }
    const el = new window.Image()
    el.onload  = () => setImg(el)
    el.onerror = () => setImg(null)
    el.src = `https://satisfactory.wiki.gg/images/${item.replace(/ /g, '_')}.png`
  }, [item])
  return img
}

const ICON_SIZE = WORLD_CELL_SIZE * 0.75  // 60 world-px — visible at zoom ≥ 0.25

function ConnectorIcon({ item, perMin, cx, cy, color }) {
  const img = useItemImage(item)
  if (!item) return null

  const initials = item.split(' ')
    .filter(w => /[A-Z]/i.test(w[0]))
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || item.slice(0, 2).toUpperCase()

  const half = ICON_SIZE / 2
  const fontSize = WORLD_CELL_SIZE * 0.16

  return (
    <Group listening={false}>
      {img ? (
        <KonvaImage
          image={img}
          x={cx - half} y={cy - half}
          width={ICON_SIZE} height={ICON_SIZE}
        />
      ) : (
        <>
          <Circle x={cx} y={cy} radius={half}
            fill={color + '22'} stroke={color} strokeWidth={2} />
          <Text
            x={cx - half} y={cy - half}
            width={ICON_SIZE} height={ICON_SIZE}
            text={initials}
            align="center" verticalAlign="middle"
            fontSize={ICON_SIZE * 0.35} fontFamily="monospace" fill={color}
          />
        </>
      )}
      <Text
        x={cx - half} y={cy + half + 2}
        width={ICON_SIZE}
        text={`${item}\n${perMin ?? 0}/m`}
        fontSize={fontSize} fontFamily="monospace"
        fill={color} opacity={0.85}
        align="center" wrap="word"
      />
    </Group>
  )
}

function WorldFactoryShape({ wf, factoryName, isSelected, onSelect, onDblClick, onMove, onConnectorMouseDown }) {
  const { w, h } = computeFactorySize(wf.connectors)

  return (
    <Group
      x={wf.x}
      y={wf.y}
      draggable
      onDragEnd={(e) => {
        e.cancelBubble = true
        const snap = WORLD_CELL_SIZE
        onMove?.(wf.factoryId, Math.round(e.target.x() / snap) * snap, Math.round(e.target.y() / snap) * snap)
      }}
      onClick={(e) => { if (!e.evt._dragged) { e.cancelBubble = true; onSelect(wf.factoryId) } }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick(wf.factoryId) }}
    >
      {/* Selection rect */}
      {isSelected && (
        <Rect
          x={-4} y={-4} width={w + 8} height={h + 8}
          fill="transparent" stroke={FACTORY_STROKE}
          strokeWidth={1.5} dash={SEL_DASH} listening={false}
        />
      )}

      {/* Factory body */}
      <Rect
        x={0} y={0} width={w} height={h}
        fill={FACTORY_FILL} opacity={0.7}
        stroke={FACTORY_STROKE} strokeWidth={2} cornerRadius={4}
      />

      {/* Factory label */}
      <Text
        x={0} y={h / 2 - 8} width={w}
        text={factoryName ?? `Factory ${wf.factoryId}`}
        fontSize={14} fontFamily="monospace" fill="#c8dff0"
        align="center" listening={false}
      />

      {/* Connector icons inside factory, one per connector row */}
      {(wf.connectors ?? []).map((c, i) => {
        const off   = (c.offset ?? 0) * CONN_SPACING
        const cy    = h / 2 + off
        const isOut = c.flow === 'out'
        const color = isOut ? CONN_OUT_COLOR : CONN_IN_COLOR
        // Output icons in right half, input icons in left half
        const cx    = isOut ? w * 0.75 : w * 0.25
        return (
          <ConnectorIcon key={i}
            item={c.item} perMin={c.perMin}
            cx={cx} cy={cy} color={color}
          />
        )
      })}

      {/* Belt-style connectors */}
      {(wf.connectors ?? []).map((c, i) => (
        <WorldConnectorMarker
          key={i}
          connector={c}
          factoryW={w}
          factoryH={h}
          onMouseDown={onConnectorMouseDown ? (conn) => onConnectorMouseDown(wf.factoryId, conn, wf.x, wf.y, w, h) : undefined}
        />
      ))}
    </Group>
  )
}

/**
 * WorldCanvas — Konva stage for the world view.
 *
 * Props:
 *   worldState          — { worldFactories, buses, busConnections, nextWorldId, viewport }
 *   factories           — full factory list from useFactories
 *   tool                — 'pan' | 'pointer'
 *   selectedFactoryId   — currently selected world factory id
 *   selectedBusId       — currently selected bus id
 *   onSelectFactory     — (factoryId|null) => void
 *   onSelectBus         — (busId|null) => void
 *   onEnterFactory      — (factoryId) => void  (double-click)
 *   onMoveFactory       — (factoryId, x, y) => void
 *   onViewportChange    — (vp) => void
 *   pendingBusPoints    — null | { confirmed } | { x, y } (first point placed)
 *   onBusPointPlace     — (worldX, worldY) => void
 *   onCreateBusConnection — (factoryId, connectorId, busId, y) => void
 */
export default function WorldCanvas({
  worldState,
  factories,
  tool,
  selectedFactoryId,
  selectedBusId,
  selectedBusConnectionId,
  onSelectFactory,
  onSelectBus,
  onSelectBusConnection,
  onEnterFactory,
  onMoveFactory,
  onMoveBus,
  onResizeBus,
  onViewportChange,
  pendingBusPoints,
  onBusPointPlace,
  onCreateBusConnection,
}) {
  const stageRef    = useRef(null)
  const viewportRef = useRef(worldState?.viewport ?? { scale: 0.25, x: 0, y: 0 })
  const midPanRef   = useRef(null)

  const [viewport, setViewport]     = useState(worldState?.viewport ?? { scale: 0.25, x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: stageW(), height: stageH() })
  const [cursorPos, setCursorPos]   = useState(null)
  // Local drag-to-bus state
  const [draggingConnector, setDraggingConnector] = useState(null)
  // { factoryId, connectorId, fromWorldX, fromWorldY }

  // Bus move/resize drag state
  const [draggingBus, setDraggingBus]       = useState(null)
  // { busId, type: 'move'|'resizeTop'|'resizeBottom', startClientX, startClientY, startBusX, startBusY1, startBusY2 }
  const [tempBusOverride, setTempBusOverride] = useState(null)
  const busWasDraggedRef = useRef(false)

  // Hover tooltip for buses
  const [hoveredBusId, setHoveredBusId]       = useState(null)
  const [hoverScreenPos, setHoverScreenPos]   = useState(null) // { x, y } in screen px

  viewportRef.current = viewport

  useEffect(() => {
    if (worldState?.viewport) setViewport(worldState.viewport)
  }, []) // only on mount

  useEffect(() => {
    const onResize = () => setDimensions({ width: stageW(), height: stageH() })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Middle mouse pan
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
      const vp = { ...viewportRef.current, x: midPanRef.current.startVX + (e.clientX - midPanRef.current.startX), y: midPanRef.current.startVY + (e.clientY - midPanRef.current.startY) }
      setViewport(vp); onViewportChange?.(vp)
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
  }, [onViewportChange])

  // Track cursor in world coords for pending bus preview and connector drag preview
  useEffect(() => {
    const needsTracking = pendingBusPoints || draggingConnector
    if (!needsTracking) { setCursorPos(null); return }
    const container = stageRef.current?.container()
    if (!container) return
    const onMove = (e) => {
      const rect = container.getBoundingClientRect()
      const vp   = viewportRef.current
      setCursorPos({
        x: (e.clientX - rect.left - vp.x) / vp.scale,
        y: (e.clientY - rect.top  - vp.y) / vp.scale,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [pendingBusPoints, draggingConnector])

  // Cancel connector drag on mouseup anywhere outside a bus
  useEffect(() => {
    if (!draggingConnector) return
    const onUp = () => setDraggingConnector(null)
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [draggingConnector])

  // Bus move/resize drag tracking
  useEffect(() => {
    if (!draggingBus) return
    const { busId, type, startClientX, startClientY, startBusX, startBusY1, startBusY2 } = draggingBus

    const onMouseMove = (e) => {
      const vp      = viewportRef.current
      const dxClient = e.clientX - startClientX
      const dyClient = e.clientY - startClientY
      if (Math.abs(dxClient) > 4 || Math.abs(dyClient) > 4) busWasDraggedRef.current = true

      const dx   = dxClient / vp.scale
      const dy   = dyClient / vp.scale
      const snap = WORLD_CELL_SIZE

      let override
      if (type === 'move') {
        const newX = Math.round((startBusX + dx) / snap) * snap
        override = { busId, x: newX }
      } else if (type === 'resizeTop') {
        const newY1 = Math.round((startBusY1 + dy) / snap) * snap
        override = { busId, y1: Math.min(newY1, startBusY2 - snap * 2) }
      } else {
        const newY2 = Math.round((startBusY2 + dy) / snap) * snap
        override = { busId, y2: Math.max(newY2, startBusY1 + snap * 2) }
      }
      setTempBusOverride(override)
    }

    const onMouseUp = () => {
      setTempBusOverride(prev => {
        if (prev && busWasDraggedRef.current) {
          const { busId: bid, x, y1, y2 } = prev
          if (x  !== undefined) onMoveBus?.(bid, x)
          if (y1 !== undefined) onResizeBus?.(bid, { y1 })
          if (y2 !== undefined) onResizeBus?.(bid, { y2 })
        }
        return null
      })
      setDraggingBus(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [draggingBus, onMoveBus, onResizeBus])

  // Track mouse screen position while hovering a bus (for tooltip)
  useEffect(() => {
    if (!hoveredBusId) return
    const onMove = (e) => setHoverScreenPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [hoveredBusId])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage   = stageRef.current; if (!stage) return
    const pointer = stage.getPointerPosition()
    const vp      = viewportRef.current
    const factor  = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * factor))
    const newVp = {
      scale: newScale,
      x: pointer.x - (pointer.x - vp.x) * (newScale / vp.scale),
      y: pointer.y - (pointer.y - vp.y) * (newScale / vp.scale),
    }
    setViewport(newVp); onViewportChange?.(newVp)
  }, [onViewportChange])

  const handleDragEnd = useCallback((e) => {
    if (e.target !== e.target.getStage()) return
    const newVp = { ...viewportRef.current, x: e.target.x(), y: e.target.y() }
    setViewport(newVp); onViewportChange?.(newVp)
  }, [onViewportChange])

  const handleStageClick = useCallback((e) => {
    if (pendingBusPoints && onBusPointPlace) {
      const stage   = stageRef.current
      const pointer = stage.getPointerPosition()
      const vp      = viewportRef.current
      const wx = (pointer.x - vp.x) / vp.scale
      const wy = (pointer.y - vp.y) / vp.scale
      onBusPointPlace(wx, wy)
      return
    }
    if (e.target === e.target.getStage()) {
      onSelectFactory?.(null)
      onSelectBus?.(null)
    }
  }, [pendingBusPoints, onBusPointPlace, onSelectFactory, onSelectBus])

  const handleConnectorMouseDown = useCallback((factoryId, connector, factoryX, factoryY, factoryW, factoryH) => {
    const { side, offset } = connector
    const halfH = factoryH / 2
    const off   = (offset ?? 0) * CONN_SPACING
    const fromWorldX = side === 'west'
      ? factoryX - CONN_D / 2
      : factoryX + factoryW + CONN_D / 2
    const fromWorldY = factoryY + halfH + off

    setDraggingConnector({
      factoryId,
      connectorId: connector.id,
      fromWorldX,
      fromWorldY,
    })
  }, [])

  const handleConnectorDrop = useCallback((busId, y) => {
    if (!draggingConnector) return
    onCreateBusConnection?.(draggingConnector.factoryId, draggingConnector.connectorId, busId, y)
    setDraggingConnector(null)
  }, [draggingConnector, onCreateBusConnection])

  // Bus select — suppresses click if it followed a drag
  const handleBusSelect = useCallback((busId) => {
    if (busWasDraggedRef.current) return
    onSelectBus?.(busId)
  }, [onSelectBus])

  const handleBusHover   = useCallback((busId) => setHoveredBusId(busId), [])
  const handleBusUnhover = useCallback(() => { setHoveredBusId(null); setHoverScreenPos(null) }, [])

  const handleBusBodyMouseDown = useCallback((busId, e, bus) => {
    busWasDraggedRef.current = false
    setDraggingBus({ busId, type: 'move', startClientX: e.evt.clientX, startClientY: e.evt.clientY, startBusX: bus.x, startBusY1: bus.y1, startBusY2: bus.y2 })
  }, [])

  const handleBusTopMouseDown = useCallback((busId, e, bus) => {
    busWasDraggedRef.current = false
    setDraggingBus({ busId, type: 'resizeTop', startClientX: e.evt.clientX, startClientY: e.evt.clientY, startBusX: bus.x, startBusY1: bus.y1, startBusY2: bus.y2 })
  }, [])

  const handleBusBottomMouseDown = useCallback((busId, e, bus) => {
    busWasDraggedRef.current = false
    setDraggingBus({ busId, type: 'resizeBottom', startClientX: e.evt.clientX, startClientY: e.evt.clientY, startBusX: bus.x, startBusY1: bus.y1, startBusY2: bus.y2 })
  }, [])

  const { worldFactories = [], buses = [], busConnections = [] } = worldState ?? {}
  const factoryById = Object.fromEntries((factories ?? []).map(f => [f.id, f]))
  const normalizedBuses = buses.map(b => {
    const nb = normalizeBus(b)
    if (tempBusOverride?.busId === nb.id) {
      const { busId: _, ...pos } = tempBusOverride
      return { ...nb, ...pos }
    }
    return nb
  })

  const cursor = draggingBus
    ? (draggingBus.type === 'move' ? 'ew-resize' : 'ns-resize')
    : pendingBusPoints ? 'crosshair'
    : draggingConnector ? 'crosshair'
    : tool === 'pan' ? 'grab'
    : 'default'

  // Compute tooltip: segment-aware, at the mouse's world Y position
  const tooltipContent = (() => {
    if (!hoveredBusId || !hoverScreenPos) return null
    const bus = (worldState?.buses ?? []).find(b => b.id === hoveredBusId)
    if (!bus) return null
    const nb = normalizeBus(bus)
    const { segments } = computeBusFlowSegments(nb, worldState?.busConnections ?? [], worldState?.worldFactories ?? [])
    const vp  = viewportRef.current
    const container = stageRef.current?.container()
    const rect = container?.getBoundingClientRect()
    if (!rect) return null
    const worldY = (hoverScreenPos.y - rect.top - vp.y) / vp.scale
    const seg = segments.find(s => worldY >= s.fromY && worldY <= s.toY)
    if (!seg) return null
    const items = Object.entries(seg.flow).filter(([, v]) => Math.abs(v) > 0.01)
    if (items.length === 0) return `Bus ${hoveredBusId}\n(empty)`
    return `Bus ${hoveredBusId}\n` + items.map(([item, amt]) => `${item}: ${Math.round(amt * 10) / 10}/m`).join('\n')
  })()

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={tool === 'pan' && !pendingBusPoints && !draggingConnector}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ cursor }}
      >
        {/* Background grid */}
        <Layer listening={false}>
          <Rect x={0} y={0} width={WORLD_GRID_PX} height={WORLD_GRID_PX} fill={BG_COLOR} />
          <WorldGrid />
        </Layer>

        {/* Buses + connection lines */}
        <Layer>
          {normalizedBuses.map(bus => (
            <BusShape
              key={bus.id}
              bus={bus}
              busConnections={busConnections}
              worldFactories={worldFactories}
              isSelected={selectedBusId === bus.id}
              onSelect={handleBusSelect}
              draggingConnector={draggingConnector}
              onConnectorDrop={handleConnectorDrop}
              onBodyMouseDown={handleBusBodyMouseDown}
              onTopHandleMouseDown={handleBusTopMouseDown}
              onBottomHandleMouseDown={handleBusBottomMouseDown}
              onBusHover={handleBusHover}
              onBusUnhover={handleBusUnhover}
            />
          ))}

          {/* Connection lines: factory connector → bus tap */}
          {(busConnections ?? []).map(bc => {
            const bus = normalizedBuses.find(b => b.id === bc.busId)
            const wf  = worldFactories.find(f => f.factoryId === bc.factoryId)
            if (!bus || !wf) return null
            return (
              <BusConnectionLine
                key={bc.id}
                busConnection={bc}
                bus={bus}
                worldFactory={wf}
                isSelected={selectedBusConnectionId === bc.id}
                onSelect={() => onSelectBusConnection?.(bc.id)}
              />
            )
          })}

          {/* Pending bus placement preview */}
          {pendingBusPoints?.x != null && cursorPos && (
            <Line
              points={[pendingBusPoints.x, pendingBusPoints.y, pendingBusPoints.x, cursorPos.y]}
              stroke={BELT_COLOR} strokeWidth={BUS_W}
              opacity={0.4} dash={[10, 6]} lineCap="round"
              listening={false}
            />
          )}

          {/* Connector drag preview line */}
          {draggingConnector && cursorPos && (
            <Line
              points={[draggingConnector.fromWorldX, draggingConnector.fromWorldY, cursorPos.x, cursorPos.y]}
              stroke={BELT_COLOR} strokeWidth={2}
              dash={[8, 4]} opacity={0.8}
              listening={false}
            />
          )}
        </Layer>

        {/* World factories */}
        <Layer>
          {worldFactories.map(wf => (
            <WorldFactoryShape
              key={wf.factoryId}
              wf={wf}
              factoryName={factoryById[wf.factoryId]?.name}
              isSelected={selectedFactoryId === wf.factoryId}
              onSelect={onSelectFactory}
              onDblClick={onEnterFactory}
              onMove={onMoveFactory}
              onConnectorMouseDown={handleConnectorMouseDown}
            />
          ))}
        </Layer>
      </Stage>

      {/* Bus hover tooltip — fixed so screen coords work directly */}
      {tooltipContent && hoverScreenPos && (
        <div style={{
          position: 'fixed',
          left: hoverScreenPos.x + 16,
          top: hoverScreenPos.y - 10,
          background: '#0a1520',
          border: '1px solid #1e3a54',
          borderRadius: 4,
          padding: '5px 8px',
          color: '#c8dff0',
          fontFamily: 'monospace',
          fontSize: 11,
          whiteSpace: 'pre',
          pointerEvents: 'none',
          zIndex: 100,
          lineHeight: '1.5',
        }}>
          {tooltipContent}
        </div>
      )}
    </div>
  )
}
