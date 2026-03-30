import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Rect, Group, Text, Line } from 'react-konva'
import { WORLD_CELL_SIZE, PANEL_WIDTH, TOOLBAR_HEIGHT, FACTORY_TAB_HEIGHT } from './constants'

const BG_COLOR       = '#0a1118'
const MINOR_COLOR    = '#141e28'
const MAJOR_COLOR    = '#1a2a38'
const FACTORY_FILL   = '#1a3a5c'
const FACTORY_STROKE = '#4a9eda'
const BELT_COLOR     = '#e87c13'
const PIPE_COLOR     = '#4a9eda'
const SEL_DASH       = [6, 4]

const WORLD_GRID_CELLS = 100
const WORLD_GRID_PX    = WORLD_CELL_SIZE * WORLD_GRID_CELLS

const MIN_SCALE = 0.05
const MAX_SCALE = 4.0

// Minimum factory size in world cells
const MIN_FACTORY_CELLS = 6
const CONNECTOR_SIZE    = 8

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

/**
 * Compute factory body size in world pixels based on connectors.
 * Min 6×6 cells, expand to fit connectors.
 */
function computeFactorySize(connectors) {
  // Count connectors per side
  const sides = { north: 0, south: 0, east: 0, west: 0 }
  for (const c of (connectors ?? [])) {
    const s = c.side ?? 'south'
    sides[s] = (sides[s] ?? 0) + 1
  }

  // Need at least enough cells to space out connectors
  const hCount = Math.max(sides.north, sides.south)
  const vCount = Math.max(sides.east, sides.west)

  const wCells = Math.max(MIN_FACTORY_CELLS, hCount * 2 + 2)
  const hCells = Math.max(MIN_FACTORY_CELLS, vCount * 2 + 2)

  return {
    w: wCells * WORLD_CELL_SIZE,
    h: hCells * WORLD_CELL_SIZE,
  }
}

/**
 * Compute connector position relative to factory top-left (0,0).
 */
function connectorPos(connector, factoryW, factoryH) {
  const { side, offset } = connector
  const halfW = factoryW / 2
  const halfH = factoryH / 2
  const off   = (offset ?? 0) * WORLD_CELL_SIZE

  switch (side) {
    case 'north': return { x: halfW + off - CONNECTOR_SIZE / 2, y: -CONNECTOR_SIZE / 2 }
    case 'south': return { x: halfW + off - CONNECTOR_SIZE / 2, y: factoryH - CONNECTOR_SIZE / 2 }
    case 'west':  return { x: -CONNECTOR_SIZE / 2,              y: halfH + off - CONNECTOR_SIZE / 2 }
    case 'east':  return { x: factoryW - CONNECTOR_SIZE / 2,    y: halfH + off - CONNECTOR_SIZE / 2 }
    default:      return { x: halfW - CONNECTOR_SIZE / 2,       y: factoryH - CONNECTOR_SIZE / 2 }
  }
}

function WorldFactoryShape({ wf, factoryName, isSelected, onSelect, onDblClick }) {
  const { w, h } = computeFactorySize(wf.connectors)

  return (
    <Group
      x={wf.x}
      y={wf.y}
      onClick={(e) => { e.cancelBubble = true; onSelect(wf.factoryId) }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick(wf.factoryId) }}
    >
      {/* Selection rect */}
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={w + 8}
          height={h + 8}
          fill="transparent"
          stroke={FACTORY_STROKE}
          strokeWidth={1.5}
          dash={SEL_DASH}
          listening={false}
        />
      )}

      {/* Factory body */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={FACTORY_FILL}
        fillAlpha={0.4}
        opacity={0.4}
        stroke={FACTORY_STROKE}
        strokeWidth={2}
        cornerRadius={4}
      />

      {/* Opaque rect on top for solid appearance */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={FACTORY_FILL}
        opacity={0.4}
        stroke={FACTORY_STROKE}
        strokeWidth={2}
        cornerRadius={4}
        listening={false}
      />

      {/* Factory label */}
      <Text
        x={0}
        y={h / 2 - 8}
        width={w}
        text={factoryName ?? `Factory ${wf.factoryId}`}
        fontSize={14}
        fontFamily="monospace"
        fill="#c8dff0"
        align="center"
        listening={false}
      />

      {/* Connectors */}
      {(wf.connectors ?? []).map((c, i) => {
        const pos   = connectorPos(c, w, h)
        const color = c.kind === 'pipe' ? PIPE_COLOR : BELT_COLOR
        const label = c.item ? `${c.item}${c.perMin ? `\n${c.perMin}/m` : ''}` : null
        const side  = c.side ?? 'south'

        // Label offset: place outside the factory edge
        const labelOffX = side === 'east'  ?  CONNECTOR_SIZE + 2 :
                          side === 'west'  ? -(label ? label.length * 6 + 2 : 30) :
                          -10
        const labelOffY = side === 'north' ? -(28) :
                          side === 'south' ?   CONNECTOR_SIZE + 2 :
                          -8

        return (
          <Group key={i}>
            <Rect
              x={pos.x}
              y={pos.y}
              width={CONNECTOR_SIZE}
              height={CONNECTOR_SIZE}
              fill={color}
              stroke="#0a1118"
              strokeWidth={1}
              cornerRadius={1}
            />
            {label && (
              <Text
                x={pos.x + labelOffX}
                y={pos.y + labelOffY}
                text={label}
                fontSize={9}
                fontFamily="monospace"
                fill="#c8dff0"
                listening={false}
              />
            )}
          </Group>
        )
      })}
    </Group>
  )
}

function BusShape({ bus }) {
  const midX = (bus.x1 + bus.x2) / 2
  const midY = (bus.y1 + bus.y2) / 2

  return (
    <Group>
      <Line
        points={[bus.x1, bus.y1, bus.x2, bus.y2]}
        stroke={BELT_COLOR}
        strokeWidth={3}
        lineCap="round"
        listening={false}
      />
      {bus.item && (
        <Text
          x={midX - 30}
          y={midY - 16}
          text={bus.item}
          fontSize={11}
          fontFamily="monospace"
          fill="#c8dff0"
          background="#0a1520"
          listening={false}
        />
      )}
    </Group>
  )
}

/**
 * WorldCanvas — Konva stage for the world view.
 *
 * Props:
 *   worldState        — { worldFactories, buses, taps, nextWorldId, viewport }
 *   factories         — full factory list from useFactories
 *   tool              — 'pan' | 'pointer'
 *   selectedFactoryId — currently selected world factory id
 *   onSelectFactory   — (factoryId) => void
 *   onEnterFactory    — (factoryId) => void  (double-click)
 *   onViewportChange  — (vp) => void
 *   pendingBusPoints  — null | { x1, y1 } (first point placed, awaiting second)
 *   onBusPointPlace   — (worldX, worldY) => void
 */
export default function WorldCanvas({
  worldState,
  factories,
  tool,
  selectedFactoryId,
  onSelectFactory,
  onEnterFactory,
  onViewportChange,
  pendingBusPoints,
  onBusPointPlace,
}) {
  const stageRef     = useRef(null)
  const viewportRef  = useRef(worldState?.viewport ?? { scale: 0.25, x: 0, y: 0 })
  const midPanRef    = useRef(null)

  const [viewport, setViewport] = useState(worldState?.viewport ?? { scale: 0.25, x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: stageW(), height: stageH() })
  // Track cursor for pending bus preview
  const [cursorPos, setCursorPos] = useState(null)

  viewportRef.current = viewport

  // Sync viewport from parent when worldState.viewport changes (e.g. on load)
  useEffect(() => {
    if (worldState?.viewport) {
      setViewport(worldState.viewport)
    }
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
      const vp = {
        ...viewportRef.current,
        x: midPanRef.current.startVX + (e.clientX - midPanRef.current.startX),
        y: midPanRef.current.startVY + (e.clientY - midPanRef.current.startY),
      }
      setViewport(vp)
      onViewportChange?.(vp)
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

  // Track cursor when placing bus points
  useEffect(() => {
    if (!pendingBusPoints) { setCursorPos(null); return }
    const container = stageRef.current?.container()
    if (!container) return
    const onMove = (e) => {
      const rect = container.getBoundingClientRect()
      const vp   = viewportRef.current
      setCursorPos({
        x: (e.clientX - rect.left  - vp.x) / vp.scale,
        y: (e.clientY - rect.top   - vp.y) / vp.scale,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [pendingBusPoints])

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage   = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    const vp      = viewportRef.current
    const factor  = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * factor))
    const newX = pointer.x - (pointer.x - vp.x) * (newScale / vp.scale)
    const newY = pointer.y - (pointer.y - vp.y) * (newScale / vp.scale)
    const newVp = { scale: newScale, x: newX, y: newY }
    setViewport(newVp)
    onViewportChange?.(newVp)
  }, [onViewportChange])

  const handleDragEnd = useCallback((e) => {
    if (e.target !== e.target.getStage()) return
    const newVp = { ...viewportRef.current, x: e.target.x(), y: e.target.y() }
    setViewport(newVp)
    onViewportChange?.(newVp)
  }, [onViewportChange])

  const handleStageClick = useCallback((e) => {
    // If placing a bus, handle that
    if (pendingBusPoints && onBusPointPlace) {
      const stage   = stageRef.current
      const pointer = stage.getPointerPosition()
      const vp      = viewportRef.current
      const wx = (pointer.x - vp.x) / vp.scale
      const wy = (pointer.y - vp.y) / vp.scale
      onBusPointPlace(wx, wy)
      return
    }
    // Deselect if clicking background
    if (e.target === e.target.getStage()) {
      onSelectFactory?.(null)
    }
  }, [pendingBusPoints, onBusPointPlace, onSelectFactory])

  const { worldFactories = [], buses = [] } = worldState ?? {}

  const factoryById = Object.fromEntries((factories ?? []).map(f => [f.id, f]))

  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
      draggable={tool === 'pan' && !pendingBusPoints}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      onDragEnd={handleDragEnd}
      onWheel={handleWheel}
      onClick={handleStageClick}
      style={{ cursor: pendingBusPoints ? 'crosshair' : tool === 'pan' ? 'grab' : 'default' }}
    >
      {/* Background grid */}
      <Layer>
        <Rect x={0} y={0} width={WORLD_GRID_PX} height={WORLD_GRID_PX} fill={BG_COLOR} listening={false} />
        <WorldGrid />
      </Layer>

      {/* Buses */}
      <Layer listening={false}>
        {buses.map(bus => (
          <BusShape key={bus.id} bus={bus} />
        ))}

        {/* Pending bus preview */}
        {pendingBusPoints && cursorPos && (
          <Line
            points={[pendingBusPoints.x1, pendingBusPoints.y1, cursorPos.x, cursorPos.y]}
            stroke={BELT_COLOR}
            strokeWidth={3}
            dash={[8, 4]}
            lineCap="round"
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
          />
        ))}
      </Layer>
    </Stage>
  )
}
