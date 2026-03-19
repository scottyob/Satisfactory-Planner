import { Group, Rect, Text, Circle, Line } from 'react-konva'
import { CELL_SIZE } from './constants'
import { BUILDINGS_BY_KEY } from './buildings.js'
import { CONNECTORS_BY_KEY } from './LayersPanel.jsx'

// Connector colors: belt vs pipe, input vs output
const BELT_IN  = '#5ee877'
const BELT_OUT = '#e8a013'
const PIPE_IN  = '#4ab0ed'
const PIPE_OUT = '#c87de8'

const CONN_SIZE = CELL_SIZE * 2       // 2m connector width
const CONN_DEPTH = CELL_SIZE * 0.5    // 0.5m connector depth

const ALL_BUILDINGS_BY_KEY = { ...BUILDINGS_BY_KEY, ...CONNECTORS_BY_KEY }

function ConnectorMarker({ type, position, isInput, hw, hh }) {
  if (!position) return null

  const { side, offset } = position
  const hs = CONN_SIZE / 2
  const ox = offset * CELL_SIZE

  const color = type === 'belt'
    ? (isInput ? BELT_IN : BELT_OUT)
    : (isInput ? PIPE_IN : PIPE_OUT)

  // Belt connectors: 2m wide × 0.5m deep rectangles at building edge
  if (type === 'belt') {
    let x, y, arrowDir
    const arrowDepth = CONN_DEPTH * 0.6   // Arrow depth (60% of connector depth)
    const arrowHalfWidth = CELL_SIZE * 0.15  // Arrow half-width (thinner arrows)
    const gap = CELL_SIZE * 0.2           // Gap between arrows
    const totalArrowWidth = arrowHalfWidth * 2 * 4 + gap * 3  // 4 arrows + 3 gaps
    const startX = (CONN_SIZE - totalArrowWidth) / 2 + arrowHalfWidth  // Start from first arrow center

    if (side === 'south') {
      x = ox - hs
      y = hh - CONN_DEPTH
      arrowDir = isInput ? -1 : 1  // -1 = up (into building), 1 = down (out)
    } else if (side === 'north') {
      x = ox - hs
      y = -hh
      arrowDir = isInput ? 1 : -1  // 1 = down (into building), -1 = up (out)
    } else if (side === 'east') {
      x = hw - CONN_DEPTH
      y = ox - hs
      arrowDir = isInput ? -1 : 1  // -1 = left (into building), 1 = right (out)
    } else if (side === 'west') {
      x = -hw
      y = ox - hs
      arrowDir = isInput ? 1 : -1  // 1 = right (into building), -1 = left (out)
    }

    const arrows = [0, 1, 2, 3].map((i) => {
      let points
      const pos = startX + i * (arrowHalfWidth * 2 + gap)  // Position of each arrow center
      const depthPadding = (CONN_DEPTH - arrowDepth) / 2
      if (side === 'south' || side === 'north') {
        const tipY = isInput
          ? (side === 'south' ? depthPadding : CONN_DEPTH - depthPadding)
          : (side === 'south' ? CONN_DEPTH - depthPadding : depthPadding)
        const baseY = tipY - arrowDir * arrowDepth
        points = [pos, tipY, pos - arrowHalfWidth, baseY, pos + arrowHalfWidth, baseY]
      } else {
        const tipX = isInput
          ? (side === 'east' ? depthPadding : CONN_DEPTH - depthPadding)
          : (side === 'east' ? CONN_DEPTH - depthPadding : depthPadding)
        const baseX = tipX - arrowDir * arrowDepth
        points = [tipX, pos, baseX, pos - arrowHalfWidth, baseX, pos + arrowHalfWidth]
      }
      return (
        <Line
          key={i}
          points={points}
          closed={true}
          fill={color}
          opacity={0.7}
          listening={false}
        />
      )
    })

    return (
      <Group x={x} y={y}>
        <Rect
          width={side === 'south' || side === 'north' ? CONN_SIZE : CONN_DEPTH}
          height={side === 'south' || side === 'north' ? CONN_DEPTH : CONN_SIZE}
          fill="transparent"
          stroke={color}
          strokeWidth={2}
          listening={false}
        />
        {arrows}
      </Group>
    )
  }

  // Pipe connectors: circle, flush with edge
  let cx, cy
  if (side === 'south') {
    cx = ox
    cy = hh - hs
  } else if (side === 'north') {
    cx = ox
    cy = -hh + hs
  } else if (side === 'east') {
    cx = hw - hs
    cy = ox
  } else if (side === 'west') {
    cx = -hw + hs
    cy = ox
  }

  return (
    <Circle
      x={cx}
      y={cy}
      radius={hs}
      fill="transparent"
      stroke={color}
      strokeWidth={2}
      listening={false}
    />
  )
}

export default function BuildingObject({
  obj, isSelected, canDrag,
  onPointerDown, onDragStart, onDragMove, onDragEnd,
}) {
  const def   = ALL_BUILDINGS_BY_KEY[obj.type]
  const pw    = def.w * CELL_SIZE
  const ph    = def.h * CELL_SIZE
  const hw    = pw / 2
  const hh    = ph / 2
  const color = def.color

  return (
    <Group
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      draggable={canDrag}
      onMouseDown={onPointerDown}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {/* Selection glow */}
      {isSelected && (
        <Rect
          x={-hw - 3}
          y={-hh - 3}
          width={pw + 6}
          height={ph + 6}
          cornerRadius={4}
          fill="transparent"
          stroke="#4a9eda"
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}

      {/* Building body */}
      <Rect
        x={-hw}
        y={-hh}
        width={pw}
        height={ph}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={isSelected ? 1.5 : 1}
        cornerRadius={2}
      />

      {/* Label */}
      <Text
        x={-hw}
        y={-hh}
        text={def.label}
        width={pw}
        height={ph}
        align="center"
        verticalAlign="middle"
        fontSize={12}
        fontFamily="monospace"
        fill={color}
        listening={false}
      />

      {/* Input connectors */}
      {def.inputs.map((conn, i) => (
        <ConnectorMarker key={`in-${i}`} {...conn} isInput={true} hw={hw} hh={hh} />
      ))}

      {/* Output connectors */}
      {def.outputs.map((conn, i) => (
        <ConnectorMarker key={`out-${i}`} {...conn} isInput={false} hw={hw} hh={hh} />
      ))}
    </Group>
  )
}
