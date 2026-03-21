import { useRef, useState, useEffect, useCallback } from 'react'
import { Group, Rect, Text, Circle, Line, Image as KonvaImage } from 'react-konva'
import { CELL_SIZE } from './constants'
import { ALL_BUILDINGS_BY_KEY } from './portUtils'
import { RECIPES_BY_ID } from './recipes.js'
import { floorTextureUrl } from './LayersPanel.jsx'

function useImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) return
    const el = new window.Image()
    el.onload = () => setImg(el)
    el.src = src
  }, [src])
  return img
}

let _floorImg = null
let _floorListeners = []

// Shared floor texture loader — only loads once
function useFloorTexture() {
  const [img, setImg] = useState(_floorImg)
  useEffect(() => {
    if (_floorImg) return
    const el = new window.Image()
    el.onload = () => {
      _floorImg = el
      setImg(el)
      _floorListeners.forEach(fn => fn(el))
      _floorListeners = []
    }
    el.src = floorTextureUrl
    _floorListeners.push(setImg)
    return () => { _floorListeners = _floorListeners.filter(fn => fn !== setImg) }
  }, [])
  return img
}

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

// Rendered inside the floor_input building body
function FloorInputContent({ obj, pw, ph, hw, hh, color }) {
  const img = useItemImage(obj.item ?? null)

  if (!obj.item) {
    // Unconfigured — just show label centered
    return (
      <Text
        x={-hw} y={-hh} width={pw} height={ph}
        text={obj.item === undefined ? 'FLR IN' : ''}
        align="center" verticalAlign="middle"
        fontSize={12} fontFamily="monospace" fill={color} listening={false}
      />
    )
  }

  const topH   = Math.round(ph * 0.28)   // ~28% for text header
  const imgPad = 6
  const imgY   = -hh + topH + imgPad
  const imgSize = ph - topH - imgPad * 2

  const initials = obj.item.split(' ')
    .filter(w => /[A-Z]/i.test(w[0]))
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || obj.item.slice(0, 2).toUpperCase()

  return (
    <>
      {/* Item name — top */}
      <Text
        x={-hw} y={-hh + 3}
        width={pw} height={topH * 0.6}
        text={obj.item}
        align="center" verticalAlign="middle"
        fontSize={10} fontFamily="monospace" fill="#c8dff0"
        listening={false} wrap="word"
      />
      {/* Rate — below item name */}
      <Text
        x={-hw} y={-hh + topH * 0.6 + 1}
        width={pw} height={topH * 0.4}
        text={`${obj.ratePerMin}/min`}
        align="center" verticalAlign="middle"
        fontSize={9} fontFamily="monospace" fill="#7aabcc"
        listening={false}
      />
      {/* Divider line */}
      <Line
        points={[-hw + 4, -hh + topH, hw - 4, -hh + topH]}
        stroke={`${color}55`} strokeWidth={1} listening={false}
      />
      {/* Item image or fallback circle */}
      {img ? (
        <KonvaImage
          image={img}
          x={-imgSize / 2} y={imgY}
          width={imgSize} height={imgSize}
          listening={false}
        />
      ) : (
        <>
          <Circle
            x={0} y={imgY + imgSize / 2}
            radius={imgSize / 2}
            fill="#4a9eda33" stroke="#4a9eda" strokeWidth={1}
            listening={false}
          />
          <Text
            x={-imgSize / 2} y={imgY}
            width={imgSize} height={imgSize}
            text={initials}
            align="center" verticalAlign="middle"
            fontSize={Math.round(imgSize * 0.28)} fontFamily="monospace"
            fill="#4a9eda" listening={false}
          />
        </>
      )}
    </>
  )
}

// Rendered inside the floor_output building body
function FloorOutputContent({ incomingItems, pw, ph, hw, hh, color }) {
  const item = incomingItems?.[0]?.item ?? null
  const rate = incomingItems?.[0]?.rate ?? 0
  const img  = useItemImage(item)

  if (!item) {
    return (
      <Text
        x={-hw} y={-hh} width={pw} height={ph}
        text="FLR OUT"
        align="center" verticalAlign="middle"
        fontSize={12} fontFamily="monospace" fill={color} listening={false}
      />
    )
  }

  const topH   = Math.round(ph * 0.28)
  const imgPad = 6
  const imgY   = -hh + topH + imgPad
  const imgSize = ph - topH - imgPad * 2

  const initials = item.split(' ')
    .filter(w => /[A-Z]/i.test(w[0]))
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || item.slice(0, 2).toUpperCase()

  const fmtRate = rate % 1 === 0 ? `${rate}/min` : `${rate.toFixed(1)}/min`

  return (
    <>
      <Text
        x={-hw} y={-hh + 3}
        width={pw} height={topH * 0.6}
        text={item}
        align="center" verticalAlign="middle"
        fontSize={10} fontFamily="monospace" fill="#c8dff0"
        listening={false} wrap="word"
      />
      <Text
        x={-hw} y={-hh + topH * 0.6 + 1}
        width={pw} height={topH * 0.4}
        text={fmtRate}
        align="center" verticalAlign="middle"
        fontSize={9} fontFamily="monospace" fill="#7aabcc"
        listening={false}
      />
      <Line
        points={[-hw + 4, -hh + topH, hw - 4, -hh + topH]}
        stroke={`${color}55`} strokeWidth={1} listening={false}
      />
      {img ? (
        <KonvaImage
          image={img}
          x={-imgSize / 2} y={imgY}
          width={imgSize} height={imgSize}
          listening={false}
        />
      ) : (
        <>
          <Circle
            x={0} y={imgY + imgSize / 2}
            radius={imgSize / 2}
            fill="#4a9eda33" stroke="#4a9eda" strokeWidth={1}
            listening={false}
          />
          <Text
            x={-imgSize / 2} y={imgY}
            width={imgSize} height={imgSize}
            text={initials}
            align="center" verticalAlign="middle"
            fontSize={Math.round(imgSize * 0.28)} fontFamily="monospace"
            fill="#4a9eda" listening={false}
          />
        </>
      )}
    </>
  )
}

// A single item slot: small icon + rate + first word of item name, stacked
function ItemSlot({ item, rate, rateColor, x, y, iconSize }) {
  const img      = useItemImage(item)
  const initials = item.split(' ').filter(w => /[A-Za-z]/.test(w[0])).map(w => w[0].toUpperCase()).join('').slice(0, 2) || item.slice(0, 2).toUpperCase()
  const label    = item.split(' ')[0]   // first word — "Iron", "Plastic", etc.

  return (
    <Group x={x} y={y} listening={false}>
      {img ? (
        <KonvaImage image={img} x={-iconSize / 2} y={0} width={iconSize} height={iconSize} listening={false} />
      ) : (
        <>
          <Circle x={0} y={iconSize / 2} radius={iconSize / 2} fill="#1a3a5c" stroke="#2e5f8a" strokeWidth={1} listening={false} />
          <Text x={-iconSize / 2} y={0} width={iconSize} height={iconSize} text={initials}
            align="center" verticalAlign="middle" fontSize={Math.round(iconSize * 0.32)}
            fontFamily="monospace" fill="#4a9eda" listening={false} />
        </>
      )}
      <Text x={-iconSize / 2} y={iconSize + 3} width={iconSize} height={18}
        text={rate} align="center" fontSize={16} fontFamily="monospace" fill={rateColor} listening={false} />
      <Text x={-iconSize / 2} y={iconSize + 20} width={iconSize} height={16}
        text={label} align="center" fontSize={14} fontFamily="monospace" fill="#7aabcc" listening={false} />
    </Group>
  )
}

// Rendered inside a production building body when a recipe is configured
function RecipeContent({ obj, pw, ph, hw, hh, color }) {
  const recipe = RECIPES_BY_ID[obj.recipeId]
  if (!recipe) return null

  const factor   = obj.clockSpeed ?? 1
  const pct      = Math.round(factor * 100)
  const fmtRate  = (r) => {
    const v = r * factor
    return (v % 1 === 0 ? String(v) : v.toFixed(1)) + '/m'
  }

  const iconSize  = Math.min(CELL_SIZE * 1.5, 56)       // ~56px (doubled)
  const slotW     = iconSize + 8
  const slotH     = iconSize + 36                        // icon + rate + label (doubled text)
  const arrowGap  = 28
  const labelH    = 14                                   // recipe name line
  const pctH      = 18                                   // clock % line
  const aboveH    = labelH + pctH + 4                    // total above-icon label block

  // X positions: inputs left of center, arrow, outputs right
  const nIn    = recipe.inputs.length
  const nOut   = recipe.outputs.length
  const gap    = 8
  const inW    = nIn  * slotW + (nIn  - 1) * gap
  const outW   = nOut * slotW + (nOut - 1) * gap
  const totalW = inW + arrowGap + outW
  const startX = -totalW / 2

  // Center the whole block (labels + icons) vertically in the building
  const blockH    = aboveH + slotH
  const blockTopY = -blockH / 2
  const slotTopY  = blockTopY + aboveH

  return (
    <>
      {/* Recipe name — just above icons */}
      <Text
        x={-hw} y={blockTopY} width={pw} height={labelH}
        text={recipe.name} align="center" verticalAlign="middle"
        fontSize={9} fontFamily="monospace" fill="#c8dff0" listening={false} wrap="word"
      />

      {/* Clock % — between name and icons */}
      <Text
        x={-hw} y={blockTopY + labelH + 2} width={pw} height={pctH}
        text={`${pct}%`} align="center" verticalAlign="middle"
        fontSize={16} fontFamily="monospace"
        fill={pct === 100 ? '#7aabcc' : '#e8a013'} listening={false}
      />

      {/* Input slots */}
      {recipe.inputs.map((inp, i) => (
        <ItemSlot key={`in-${i}`}
          item={inp.item} rate={fmtRate(inp.perMin)} rateColor="#5ee877"
          x={startX + i * (slotW + gap) + slotW / 2}
          y={slotTopY} iconSize={iconSize}
        />
      ))}

      {/* Arrow */}
      <Text
        x={startX + inW} y={slotTopY + iconSize / 2 - 11}
        width={arrowGap} height={22}
        text="→" align="center" verticalAlign="middle"
        fontSize={20} fill="#4a9eda" listening={false}
      />

      {/* Output slots */}
      {recipe.outputs.map((out, i) => (
        <ItemSlot key={`out-${i}`}
          item={out.item} rate={fmtRate(out.perMin)} rateColor="#e8a013"
          x={startX + inW + arrowGap + i * (slotW + gap) + slotW / 2}
          y={slotTopY} iconSize={iconSize}
        />
      ))}
    </>
  )
}

// ─── Foundation body ─────────────────────────────────────────────────────────

function FoundationBody({ pw, ph, hw, hh, isSelected, color }) {
  const floorImg  = useFloorTexture()
  const tintColor = color ?? '#8a7a5a'

  // Crop the texture proportionally so it's cut, not squished.
  // Scale is anchored to height: cropHeight = naturalHeight, cropWidth = naturalHeight * (pw/ph)
  const crop = floorImg ? {
    x: 0, y: 0,
    width:  floorImg.naturalHeight * (pw / ph),
    height: floorImg.naturalHeight,
  } : null

  return (
    <>
      {isSelected && (
        <Rect
          x={-hw - 3} y={-hh - 3}
          width={pw + 6} height={ph + 6}
          cornerRadius={4}
          fill="transparent"
          stroke="#4a9eda"
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}
      {/* Color tint base */}
      <Rect
        x={-hw} y={-hh}
        width={pw} height={ph}
        fill={tintColor}
        opacity={0.55}
        listening={false}
      />
      {/* Texture overlay */}
      {floorImg ? (
        <KonvaImage
          image={floorImg}
          x={-hw} y={-hh}
          width={pw} height={ph}
          crop={crop}
          opacity={0.3}
          stroke={isSelected ? '#c8b880' : '#6a5a3a'}
          strokeWidth={isSelected ? 1.5 : 1}
        />
      ) : (
        <Rect
          x={-hw} y={-hh}
          width={pw} height={ph}
          fill="#4a3a2a"
          opacity={0.3}
          stroke={isSelected ? '#c8b880' : '#6a5a3a'}
          strokeWidth={isSelected ? 1.5 : 1}
          cornerRadius={1}
        />
      )}
    </>
  )
}

const DBLCLICK_MS = 300

function usePulse(active) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!active) { setPhase(0); return }
    const start = Date.now()
    const id = setInterval(() => setPhase((Date.now() - start) / 1000), 50)
    return () => clearInterval(id)
  }, [active])
  return active ? 0.35 + 0.65 * (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) : 0
}

export default function BuildingObject({
  obj, isSelected, isError, errorReasons, isClogged, clogReasons, canDrag,
  onPointerDown, onDragStart, onDragMove, onDragEnd,
  onPortMouseDown, occupiedOutputs, occupiedInputs, pendingBeltType,
  onDblClick, onShowTooltip, onHideTooltip,
  incomingItems,
}) {
  const lastClickRef  = useRef(0)
  const cancelDragRef = useRef(false)
  const pulseOpacity  = usePulse(!!isError)
  const clogOpacity   = usePulse(!!isClogged)

  const def   = ALL_BUILDINGS_BY_KEY[obj.type]
  if (!def) return null

  // Connection points render as a plain circle — no ports, no label
  if (obj.type === 'connection_point') {
    const r          = CELL_SIZE
    const outputFree = !(occupiedOutputs ?? new Set()).has(0)

    return (
      <Group
        x={obj.x} y={obj.y} rotation={obj.rotation}
        draggable={canDrag}
        onMouseDown={(e) => {
          e.cancelBubble = true
          const now = Date.now()
          const isDouble = now - lastClickRef.current < DBLCLICK_MS
          lastClickRef.current = now
          if (isDouble && outputFree && onPortMouseDown) {
            cancelDragRef.current = true   // suppress the drag Konva is about to start
            onPortMouseDown(0)
          } else {
            onPointerDown?.(e)
          }
        }}
        onDragStart={(e) => {
          if (cancelDragRef.current) {
            cancelDragRef.current = false
            e.target.stopDrag()
            return
          }
          onDragStart?.(e)
        }}
        onDragMove={onDragMove} onDragEnd={onDragEnd}
      >
        {isSelected && (
          <Circle radius={r + 5} fill="transparent" stroke="#4a9eda" strokeWidth={1.5} dash={[4, 3]} listening={false} />
        )}
        <Circle
          radius={r}
          fill={`${def.color}55`}
          stroke={outputFree ? '#5ee877' : def.color}
          strokeWidth={1.5}
        />
      </Group>
    )
  }

  const pw    = def.w * CELL_SIZE
  const ph    = def.h * CELL_SIZE
  const hw    = pw / 2
  const hh    = ph / 2
  const color = def.color

  // Foundations render with the floor texture — no connectors, no label
  if (def.isFoundation) {
    return (
      <Group
        x={obj.x} y={obj.y} rotation={obj.rotation}
        draggable={canDrag}
        onMouseDown={onPointerDown}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      >
        <FoundationBody pw={pw} ph={ph} hw={hw} hh={hh} isSelected={isSelected} color={obj.color} />
      </Group>
    )
  }

  const outs = occupiedOutputs ?? new Set()
  const ins  = occupiedInputs  ?? new Set()

  return (
    <Group
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      draggable={canDrag}
      onMouseDown={onPointerDown}
      onDblClick={onDblClick}
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

      {/* Error border overlay — pulsing red */}
      {isError && (
        <Rect
          x={-hw} y={-hh} width={pw} height={ph}
          fill="transparent"
          stroke="#e87c7c"
          strokeWidth={2.5}
          cornerRadius={2}
          opacity={pulseOpacity}
          listening={false}
        />
      )}

      {/* Label or floor_input/floor_output/recipe content — counter-rotated so text is always upright */}
      <Group rotation={-obj.rotation}>
        {obj.type === 'floor_input' ? (
          <FloorInputContent obj={obj} pw={pw} ph={ph} hw={hw} hh={hh} color={color} />
        ) : obj.type === 'floor_output' ? (
          <FloorOutputContent incomingItems={incomingItems} pw={pw} ph={ph} hw={hw} hh={hh} color={color} />
        ) : obj.recipeId ? (
          <RecipeContent obj={obj} pw={pw} ph={ph} hw={hw} hh={hh} color={color} />
        ) : (
          <Text
            x={-hw} y={-hh}
            text={def.label}
            width={pw} height={ph}
            align="center" verticalAlign="middle"
            fontSize={12} fontFamily="monospace" fill={color} listening={false}
          />
        )}
      </Group>

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

      {/* Error indicator — pulsing red circle, half floating off top-right corner */}
      {isError && (
        <Group
          x={hw} y={-hh}
          listening={true}
          onMouseEnter={() => {
            const content = [
              { text: '⚠ Alarm', color: '#e87c7c' },
              ...(errorReasons ?? []).map(r => ({ text: `• ${r}`, color: '#ffaaaa' })),
            ]
            onShowTooltip?.(content)
          }}
          onMouseLeave={() => onHideTooltip?.()}
        >
          <Circle radius={20} fill="#c0392b" opacity={pulseOpacity} />
          <Text
            x={-20} y={-20} width={40} height={40}
            text="!" align="center" verticalAlign="middle"
            fontSize={24} fontFamily="monospace" fontStyle="bold"
            fill="white" opacity={pulseOpacity} listening={false}
          />
        </Group>
      )}

      {/* Clog indicator — pulsing amber circle, half floating off top-left corner */}
      {isClogged && (
        <Group
          x={-hw} y={-hh}
          listening={true}
          onMouseEnter={() => {
            const content = [
              { text: '~ Clogged output', color: '#f5a623' },
              ...(clogReasons ?? []).map(r => ({ text: `• ${r}`, color: '#ffd080' })),
            ]
            onShowTooltip?.(content)
          }}
          onMouseLeave={() => onHideTooltip?.()}
        >
          <Circle radius={20} fill="#9a5f00" opacity={clogOpacity} />
          <Text
            x={-20} y={-20} width={40} height={40}
            text="~" align="center" verticalAlign="middle"
            fontSize={24} fontFamily="monospace" fontStyle="bold"
            fill="#f5a623" opacity={clogOpacity} listening={false}
          />
        </Group>
      )}
    </Group>
  )
}
