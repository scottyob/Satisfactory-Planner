import { useEffect, useRef } from 'react'
import { Group, Rect, Shape } from 'react-konva'
import { CELL_SIZE, effectiveBeltTier } from './constants'
import { ALL_BUILDINGS_BY_KEY, getPortWorldPos } from './portUtils'

const BELT_FILL     = '#1a2a38'
const BELT_SELECTED = '#4a9eda'

// Belt tier colors (border + chevron) — matches Satisfactory MK1–MK6 palette
const BELT_TIER_COLORS = {
  1: '#e8a013', // MK1 — orange
  2: '#4ab84a', // MK2 — green
  3: '#29b6d8', // MK3 — cyan
  4: '#4a7eda', // MK4 — blue
  5: '#a855f7', // MK5 — purple
  6: '#f5d020', // MK6 — gold
}

// Chevron speed per tier — MK2 (0.08) is the baseline
const BELT_TIER_SPEEDS = {
  1: 0.04,  // MK1  60/min
  2: 0.08,  // MK2 120/min
  3: 0.18,  // MK3 270/min
  4: 0.32,  // MK4 480/min
  5: 0.52,  // MK5 780/min
  6: 0.80,  // MK6 1200/min
}


const BELT_H = CELL_SIZE * 2  // total height of belt rect

export default function BeltObject({ belt, objects, isSelected, flowStatus, flowRate, onMouseDown, onDblClick, onBeltHover, onBeltLeave }) {
  // Use explicit tier if set; otherwise derive from actual flow rate
  const tier      = belt.beltTier ?? effectiveBeltTier(flowRate ?? 0)
  const tierColor = BELT_TIER_COLORS[tier] ?? BELT_TIER_COLORS[1]
  const chevSpeed = BELT_TIER_SPEEDS[tier] ?? BELT_TIER_SPEEDS[1]

  const offsetRef    = useRef(0)
  const shapeRef     = useRef(null)
  const chevSpeedRef = useRef(chevSpeed)
  chevSpeedRef.current = chevSpeed  // keep ref in sync without restarting rAF loop

  // rAF loop — mutates shape directly without touching React state
  useEffect(() => {
    let frameId
    const tick = () => {
      offsetRef.current = (offsetRef.current + chevSpeedRef.current) % (CELL_SIZE * 2)
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

  const warnColor = flowStatus === 'excess' ? '#f5a623' : '#e87c7c'

  return (
    <Group x={mx} y={my} rotation={angle}>
      {/* Belt body */}
      <Rect
        x={-halfLen}
        y={-hw}
        width={len}
        height={BELT_H}
        fill={BELT_FILL}
        stroke={isSelected ? BELT_SELECTED : flowStatus ? warnColor : tierColor}
        strokeWidth={isSelected ? 2 : flowStatus ? 1.5 : 1}
        cornerRadius={2}
        onMouseDown={onMouseDown}
        onDblClick={onDblClick}
        onMouseEnter={onBeltHover}
        onMouseLeave={onBeltLeave}
        listening={true}
      />

      {/* Pulsing warning border overlay — driven by rAF via sceneFunc/Date.now() */}
      {flowStatus && (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const phase = Date.now() / 1000
            const alpha = 0.25 + 0.35 * (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5)
            ctx.save()
            ctx.strokeStyle = warnColor
            ctx.lineWidth   = 2.5
            ctx.globalAlpha = alpha
            ctx.beginPath()
            ctx.rect(-halfLen, -hw, len, BELT_H)
            ctx.stroke()
            ctx.restore()
          }}
        />
      )}

      {/* Animated chevrons — color and opacity driven by flowStatus + rAF/Date.now() */}
      <Shape
        ref={shapeRef}
        listening={false}
        sceneFunc={(ctx) => {
          const offset  = offsetRef.current
          const spacing = CELL_SIZE * 2
          const aw = CELL_SIZE * 0.15
          const ah = hw * 0.18
          const rows = [
            { y: -hw * 0.48, xShift: 0 },
            { y: -hw * 0.16, xShift: spacing / 2 },
            { y:  hw * 0.16, xShift: 0 },
            { y:  hw * 0.48, xShift: spacing / 2 },
          ]
          const phase   = Date.now() / 1000
          const opacity = flowStatus
            ? 0.4 + 0.6 * (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5)
            : 0.45
          const color = flowStatus ? warnColor : tierColor
          ctx.save()
          ctx.strokeStyle = color
          ctx.lineWidth   = 0.8
          ctx.lineCap     = 'round'
          ctx.lineJoin    = 'round'
          ctx.globalAlpha = opacity
          ctx.beginPath()
          for (const { y: rowY, xShift } of rows) {
            const start = ((offset + xShift) % spacing) - halfLen
            for (let x = start; x < halfLen; x += spacing) {
              ctx.moveTo(x - aw, rowY - ah)
              ctx.lineTo(x, rowY)
              ctx.lineTo(x - aw, rowY + ah)
            }
          }
          ctx.stroke()
          ctx.restore()
        }}
      />
    </Group>
  )
}
