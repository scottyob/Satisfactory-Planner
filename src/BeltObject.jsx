import { useEffect, useRef } from 'react'
import { Group, Rect, Shape } from 'react-konva'
import { CELL_SIZE } from './constants'
import { ALL_BUILDINGS_BY_KEY, getPortWorldPos } from './portUtils'

const BELT_FILL     = '#1a2a38'
const BELT_BORDER   = '#3a5a7a'
const BELT_SELECTED = '#4a9eda'
const CHEVRON_COLOR = '#e8a013'
const BELT_H        = CELL_SIZE * 2  // total height of belt rect
const CHEVRON_SPEED = 1              // px per animation frame

export default function BeltObject({ belt, objects, isSelected, onMouseDown }) {
  const offsetRef = useRef(0)
  const shapeRef  = useRef(null)

  // rAF loop — mutates shape directly without touching React state
  useEffect(() => {
    let frameId
    const tick = () => {
      offsetRef.current = (offsetRef.current + CHEVRON_SPEED) % (CELL_SIZE * 3)
      shapeRef.current?.getLayer()?.batchDraw()
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // Look up objects and port defs (after hooks, before return)
  const fromObj = objects.find(o => o.id === belt.fromObjId)
  const toObj   = objects.find(o => o.id === belt.toObjId)
  if (!fromObj || !toObj) return null

  const fromDef = ALL_BUILDINGS_BY_KEY[fromObj.type]
  const toDef   = ALL_BUILDINGS_BY_KEY[toObj.type]
  if (!fromDef || !toDef) return null

  const fromPortDef = fromDef.outputs[belt.fromPortIdx]
  const toPortDef   = toDef.inputs[belt.toPortIdx]
  if (!fromPortDef || !toPortDef) return null

  const p1 = getPortWorldPos(fromObj, fromPortDef)
  const p2 = getPortWorldPos(toObj, toPortDef)

  const dx  = p2.x - p1.x
  const dy  = p2.y - p1.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return null

  const angle   = Math.atan2(dy, dx) * 180 / Math.PI
  const mx      = (p1.x + p2.x) / 2
  const my      = (p1.y + p2.y) / 2
  const hw      = BELT_H / 2     // half-height of belt
  const halfLen = len / 2

  return (
    <Group x={mx} y={my} rotation={angle}>
      {/* Belt body */}
      <Rect
        x={-halfLen}
        y={-hw}
        width={len}
        height={BELT_H}
        fill={BELT_FILL}
        stroke={isSelected ? BELT_SELECTED : BELT_BORDER}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        onMouseDown={onMouseDown}
        listening={true}
      />

      {/* Animated chevrons — drawn directly on canvas each frame, no React state */}
      <Shape
        ref={shapeRef}
        listening={false}
        stroke={CHEVRON_COLOR}
        strokeWidth={2}
        fill="transparent"
        lineCap="round"
        lineJoin="round"
        sceneFunc={(ctx, shape) => {
          const offset  = offsetRef.current
          const spacing = CELL_SIZE * 3
          const aw = CELL_SIZE * 0.8   // how far back each chevron wing extends
          const ah = hw * 0.55         // chevron half-height
          ctx.beginPath()
          for (let x = (offset % spacing) - halfLen; x < halfLen; x += spacing) {
            ctx.moveTo(x - aw, -ah)
            ctx.lineTo(x, 0)
            ctx.lineTo(x - aw, ah)
          }
          ctx.fillStrokeShape(shape)
        }}
      />
    </Group>
  )
}
