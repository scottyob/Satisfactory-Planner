import { Group, Rect, Text, Circle, Line } from 'react-konva'
import { CELL_SIZE } from './constants'
import { ALL_BUILDINGS_BY_KEY } from './portUtils'

// Connector colors: belt vs pipe, input vs output
const BELT_IN  = '#5ee877'
const BELT_OUT = '#e8a013'
const PIPE_IN  = '#4ab0ed'
const PIPE_OUT = '#c87de8'

const CONN_SIZE  = CELL_SIZE * 2      // 2m connector width
const CONN_DEPTH = CELL_SIZE * 0.5    // 0.5m connector depth

function ConnectorMarker({
  type, position, isInput, hw, hh,
  portIdx, isOccupied, isHighlighted, onPortMouseDown,
}) {
  if (!position) return null

  const { side, offset } = position
  const hs = CONN_SIZE / 2
  const ox = offset * CELL_SIZE

  const color = type === 'belt'
    ? (isInput ? BELT_IN : BELT_OUT)
    : (isInput ? PIPE_IN : PIPE_OUT)

  const dimmed = isOccupied ? 0.4 : 1

  // Output markers become interactive when onPortMouseDown is provided
  const interactive = !isInput && !!onPortMouseDown

  const handleMouseDown = interactive
    ? (e) => { e.cancelBubble = true; onPortMouseDown(portIdx) }
    : undefined

  // Belt connectors: 2m wide × 0.5m deep rectangles at building edge
  if (type === 'belt') {
    let x, y, arrowDir
    const arrowDepth    = CONN_DEPTH * 0.6
    const arrowHalfWidth = CELL_SIZE * 0.15
    const gap           = CELL_SIZE * 0.2
    const totalArrowWidth = arrowHalfWidth * 2 * 4 + gap * 3
    const startX        = (CONN_SIZE - totalArrowWidth) / 2 + arrowHalfWidth

    if (side === 'south') {
      x = ox - hs; y = hh - CONN_DEPTH
      arrowDir = isInput ? -1 : 1
    } else if (side === 'north') {
      x = ox - hs; y = -hh
      arrowDir = isInput ? 1 : -1
    } else if (side === 'east') {
      x = hw - CONN_DEPTH; y = ox - hs
      arrowDir = isInput ? -1 : 1
    } else {
      x = -hw; y = ox - hs
      arrowDir = isInput ? 1 : -1
    }

    const arrows = [0, 1, 2, 3].map((i) => {
      let points
      const pos        = startX + i * (arrowHalfWidth * 2 + gap)
      const depthPad   = (CONN_DEPTH - arrowDepth) / 2
      if (side === 'south' || side === 'north') {
        const tipY  = isInput
          ? (side === 'south' ? depthPad : CONN_DEPTH - depthPad)
          : (side === 'south' ? CONN_DEPTH - depthPad : depthPad)
        const baseY = tipY - arrowDir * arrowDepth
        points = [pos, tipY, pos - arrowHalfWidth, baseY, pos + arrowHalfWidth, baseY]
      } else {
        const tipX  = isInput
          ? (side === 'east' ? depthPad : CONN_DEPTH - depthPad)
          : (side === 'east' ? CONN_DEPTH - depthPad : depthPad)
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

    const w = (side === 'south' || side === 'north') ? CONN_SIZE : CONN_DEPTH
    const h = (side === 'south' || side === 'north') ? CONN_DEPTH : CONN_SIZE

    return (
      <Group x={x} y={y} opacity={dimmed} listening={interactive}>
        {/* Hit-testable background rect — listening when interactive so it captures mousedown */}
        <Rect
          width={w}
          height={h}
          fill={isHighlighted ? '#5ee87733' : 'transparent'}
          stroke={isHighlighted ? '#5ee877' : color}
          strokeWidth={2}
          listening={interactive}
          onMouseDown={handleMouseDown}
          cursor={interactive ? 'crosshair' : 'default'}
        />
        {arrows}
      </Group>
    )
  }

  // Pipe connectors: circle, flush with edge
  let cx, cy
  if (side === 'south')      { cx = ox;      cy = hh - hs  }
  else if (side === 'north') { cx = ox;      cy = -hh + hs }
  else if (side === 'east')  { cx = hw - hs; cy = ox       }
  else                       { cx = -hw + hs; cy = ox      }

  return (
    <Group opacity={dimmed} listening={interactive}>
      <Circle
        x={cx}
        y={cy}
        radius={hs}
        fill={isHighlighted ? '#5ee87733' : 'transparent'}
        stroke={isHighlighted ? '#5ee877' : color}
        strokeWidth={2}
        listening={interactive}
        onMouseDown={handleMouseDown}
        cursor={interactive ? 'crosshair' : 'default'}
      />
    </Group>
  )
}

export default function BuildingObject({
  obj, isSelected, canDrag,
  onPointerDown, onDragStart, onDragMove, onDragEnd,
  onPortMouseDown, occupiedOutputs, occupiedInputs, pendingBeltType,
}) {
  const def   = ALL_BUILDINGS_BY_KEY[obj.type]
  if (!def) return null
  const pw    = def.w * CELL_SIZE
  const ph    = def.h * CELL_SIZE
  const hw    = pw / 2
  const hh    = ph / 2
  const color = def.color

  const outs = occupiedOutputs ?? new Set()
  const ins  = occupiedInputs  ?? new Set()

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
        <ConnectorMarker
          key={`in-${i}`}
          {...conn}
          isInput={true}
          hw={hw} hh={hh}
          portIdx={i}
          isOccupied={ins.has(i)}
          isHighlighted={!!pendingBeltType && pendingBeltType === conn.type && !ins.has(i)}
          onPortMouseDown={null}
        />
      ))}

      {/* Output connectors */}
      {def.outputs.map((conn, i) => (
        <ConnectorMarker
          key={`out-${i}`}
          {...conn}
          isInput={false}
          hw={hw} hh={hh}
          portIdx={i}
          isOccupied={outs.has(i)}
          isHighlighted={false}
          onPortMouseDown={onPortMouseDown}
        />
      ))}
    </Group>
  )
}
