import { Group, Rect, Text, Circle } from 'react-konva'
import { CELL_SIZE } from './constants'
import { BUILDINGS_BY_KEY } from './buildings.js'
import { CONNECTORS_BY_KEY } from './LayersPanel.jsx'

// Connector colors: belt vs pipe, input vs output
const BELT_IN  = '#5ee877'
const BELT_OUT = '#e8a013'
const PIPE_IN  = '#4ab0ed'
const PIPE_OUT = '#c87de8'

const CONN_SIZE = CELL_SIZE * 2   // 2m x 2m connector size

const ALL_BUILDINGS_BY_KEY = { ...BUILDINGS_BY_KEY, ...CONNECTORS_BY_KEY }

function ConnectorMarker({ type, position, isInput, hw, hh }) {
  if (!position) return null

  const { side, offset } = position
  const hs = CONN_SIZE / 2
  const ox = offset * CELL_SIZE

  const color = type === 'belt'
    ? (isInput ? BELT_IN : BELT_OUT)
    : (isInput ? PIPE_IN : PIPE_OUT)

  // Position flush with building edge, fully inside the building
  if (type === 'belt') {
    let x, y
    if (side === 'south') {
      x = ox - hs
      y = hh - CONN_SIZE
    } else if (side === 'north') {
      x = ox - hs
      y = -hh
    } else if (side === 'east') {
      x = hw - CONN_SIZE
      y = ox - hs
    } else if (side === 'west') {
      x = -hw
      y = ox - hs
    }
    return (
      <Rect
        x={x}
        y={y}
        width={CONN_SIZE}
        height={CONN_SIZE}
        fill="transparent"
        stroke={color}
        strokeWidth={2}
        listening={false}
      />
    )
  }

  // pipe → circle, flush with edge, fully inside
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
