import { useState, useEffect } from 'react'
import { PANEL_WIDTH, CELL_SIZE } from './constants'
import BUILDINGS, { BUILDINGS_BY_KEY } from './buildings.js'
import { RECIPES_BY_ID } from './recipes.js'

// ─── Connectors data ─────────────────────────────────────────────────────────

const CONNECTORS = [
  {
    key: 'floor_input',
    label: 'Floor Input',
    color: '#4a9eda',
    w: 4,
    h: 4,
    inputs: [],
    outputs: [{ type: 'belt', position: { side: 'east', offset: 0 } }],
  },
  {
    key: 'floor_output',
    label: 'Floor Output',
    color: '#e8a013',
    w: 4,
    h: 4,
    inputs: [{ type: 'belt', position: { side: 'east', offset: 0 } }],
    outputs: [],
  },
  {
    key: 'splitter',
    label: 'Splitter',
    color: '#7aabcc',
    w: 4,
    h: 4,
    inputs: [{ type: 'belt', position: { side: 'south', offset: 0 } }],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
      { type: 'belt', position: { side: 'east', offset: 0 } },
      { type: 'belt', position: { side: 'west', offset: 0 } },
    ],
  },
  {
    key: 'merger',
    label: 'Merger',
    color: '#7aabcc',
    w: 4,
    h: 4,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: 0 } },
      { type: 'belt', position: { side: 'east', offset: 0 } },
      { type: 'belt', position: { side: 'west', offset: 0 } },
    ],
    outputs: [{ type: 'belt', position: { side: 'north', offset: 0 } }],
  },
]

export const CONNECTORS_BY_KEY = Object.fromEntries(CONNECTORS.map(c => [c.key, c]))

// ─── Layer state hook ────────────────────────────────────────────────────────

let _nextLayerId  = 2
let _nextFloorNum = 2

const LAYER_KEY = 'sp-layers'

function loadLayerState() {
  try {
    const saved = localStorage.getItem(LAYER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      _nextLayerId  = parsed.nextLayerId  ?? _nextLayerId
      _nextFloorNum = parsed.nextFloorNum ?? _nextFloorNum
      return { layers: parsed.layers, selectedId: parsed.selectedId }
    }
  } catch {}
  return null
}

export function useLayers() {
  const initial = loadLayerState()
  const [layers, setLayers] = useState(initial?.layers ?? [
    { id: 1, name: 'Floor 1', visible: true },
  ])
  const [selectedId, setSelectedId] = useState(initial?.selectedId ?? 1)

  useEffect(() => {
    localStorage.setItem(LAYER_KEY, JSON.stringify({
      layers, selectedId, nextLayerId: _nextLayerId, nextFloorNum: _nextFloorNum,
    }))
  }, [layers, selectedId])

  const addLayer = () => {
    const id  = _nextLayerId++
    const num = _nextFloorNum++
    setLayers(prev => [{ id, name: `Floor ${num}`, visible: false }, ...prev])
    setSelectedId(id)
  }

  const toggleVisible = (id) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))

  const renameLayer = (id, name) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))

  const selectLayer = (id) => setSelectedId(id)

  const deleteLayer = (id) => {
    setLayers(prev => {
      if (prev.length <= 1) return prev   // never delete the last floor
      const next = prev.filter(l => l.id !== id)
      return next
    })
    setSelectedId(prev => {
      if (prev !== id) return prev
      const remaining = layers.filter(l => l.id !== id)
      return remaining[0]?.id ?? null
    })
  }

  const reorderLayers = (fromId, toId) => {
    setLayers(prev => {
      const arr = [...prev]
      const from = arr.findIndex(l => l.id === fromId)
      const to   = arr.findIndex(l => l.id === toId)
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const restoreLayerState = (newLayers, newSelectedId, nextLayerIdVal, nextFloorNumVal) => {
    _nextLayerId  = nextLayerIdVal
    _nextFloorNum = nextFloorNumVal
    setLayers(newLayers)
    setSelectedId(newSelectedId)
  }

  return {
    layers, selectedId,
    addLayer, deleteLayer, toggleVisible, renameLayer, selectLayer, reorderLayers,
    restoreLayerState,
    _nextLayerId: () => _nextLayerId,
    _nextFloorNum: () => _nextFloorNum,
  }
}

// ─── Drag handle icon ────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
    >
      {[2, 5, 8].map(y =>
        [2, 7].map(x => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} fill="#2e5f8a" />
        ))
      )}
    </svg>
  )
}

// ─── Layer item ──────────────────────────────────────────────────────────────

function EyeIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, cursor: 'pointer' }}>
      {open ? (
        <>
          <path d="M1 7c0 2.5 2.5 5 6 5s6-2.5 6-5-2.5-5-6-5S1 4.5 1 7z" stroke="#4a9eda" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2" fill="#4a9eda" />
        </>
      ) : (
        <>
          <path d="M1 7c0 2.5 2.5 5 6 5 1.2 0 2.3-.3 3.2-.8M13 7c0-2.5-2.5-5-6-5-1.2 0-2.3.3-3.2.8M1 1l12 12" stroke="#3a5a7a" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function LayerItem({ layer, isSelected, canDelete, onSelect, onToggleVisible, onRename, onDelete, dragHandlers }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(layer.name)

  const commitRename = () => {
    const v = draft.trim()
    onRename(layer.id, v || layer.name)
    setEditing(false)
  }

  const handleDoubleClick = () => {
    setDraft(layer.name)
    setEditing(true)
  }

  return (
    <div
      draggable
      {...dragHandlers(layer.id)}
      onClick={() => onSelect(layer.id)}
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 8px',
        borderRadius: 4,
        background: isSelected ? '#1a3a5c' : 'transparent',
        border: `1px solid ${isSelected ? '#2e5f8a' : 'transparent'}`,
        cursor: 'default',
        userSelect: 'none',
        transition: 'background 0.1s',
      }}
    >
      <DragHandle />

      <div onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id); }}>
        <EyeIcon open={isSelected || layer.visible} />
      </div>

      {/* Layer stack icon */}
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="5" width="11" height="3" rx="1" fill={isSelected ? '#4a9eda' : '#3a5a7a'} />
        <rect x="1" y="9" width="11" height="3" rx="1" fill={isSelected ? '#2e7ab0' : '#2a4a6a'} />
        <rect x="1" y="1" width="11" height="3" rx="1" fill={isSelected ? '#6ab4f0' : '#4a7aaa'} />
      </svg>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setDraft(layer.name); setEditing(false) }
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1,
            background: '#0d1b2a',
            border: '1px solid #2e5f8a',
            borderRadius: 3,
            color: '#c8dff0',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: '1px 4px',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{
          flex: 1,
          color: isSelected ? '#c8dff0' : '#7aabcc',
          fontFamily: 'monospace',
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {layer.name}
        </span>
      )}

      {isSelected && (
        <span style={{ fontSize: 8, color: '#4a9eda', flexShrink: 0 }}>●</span>
      )}

      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
          title="Delete floor"
          style={{
            background: 'none', border: 'none', color: '#3a5a7a',
            cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1,
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e87c7c'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a5a7a'}
        >✕</button>
      )}
    </div>
  )
}

// ─── Buildings tab ───────────────────────────────────────────────────────────

function BuildingListItem({ def, onAdd }) {
  const [hovered, setHovered] = useState(false)
  const scale = 20 / Math.max(def.w, def.h)
  const pw = def.w * scale
  const ph = def.h * scale

  return (
    <div
      title={`${def.label} (${def.w} × ${def.h} cells)`}
      onClick={() => onAdd(def.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 4,
        border: `1px solid ${hovered ? def.color : 'transparent'}`,
        background: hovered ? '#0f2030' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      {/* Mini building preview icon */}
      <div style={{
        width: pw,
        height: ph,
        background: `${def.color}22`,
        border: `1.5px solid ${def.color}`,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 6, color: def.color, fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', lineHeight: 1 }}>
          {def.label.slice(0, 4).toUpperCase()}
        </span>
      </div>

      <span style={{
        flex: 1,
        fontSize: 12,
        color: hovered ? '#c8dff0' : '#7aabcc',
        fontFamily: 'monospace',
      }}>
        {def.label}
      </span>

      <span style={{
        fontSize: 10,
        color: '#2e5f8a',
        fontFamily: 'monospace',
        flexShrink: 0,
      }}>
        {def.w} × {def.h}
      </span>
    </div>
  )
}

function BuildingsTab({ onAddBuilding }) {
  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
      {BUILDINGS.map(def => (
        <BuildingListItem key={def.key} def={def} onAdd={onAddBuilding} />
      ))}
    </div>
  )
}

function ConnectorsTab({ onAddBuilding }) {
  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
      {CONNECTORS.map(def => (
        <BuildingListItem key={def.key} def={def} onAdd={onAddBuilding} />
      ))}
    </div>
  )
}

// ─── Info panel ──────────────────────────────────────────────────────────────

function ItemIcon({ item, size = 26 }) {
  const [err, setErr] = useState(false)
  const initials = item.split(' ').filter(w => /[A-Za-z]/.test(w[0])).map(w => w[0].toUpperCase()).join('').slice(0, 2) || item.slice(0, 2).toUpperCase()
  if (err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: '#1a3a5c', border: '1px solid #2e5f8a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.35), fontWeight: 700, color: '#4a9eda',
        flexShrink: 0,
      }} title={item}>{initials}</div>
    )
  }
  return (
    <img
      src={`https://satisfactory.wiki.gg/images/${item.replace(/ /g, '_')}.png`}
      alt={item} title={item} width={size} height={size}
      style={{ objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  )
}

function ItemRow({ item, rate, rateColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
      <ItemIcon item={item} size={26} />
      <div>
        <div style={{ color: rateColor, fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{rate}</div>
        <div style={{ color: '#7aabcc', fontSize: 10, fontFamily: 'monospace' }}>{item}</div>
      </div>
    </div>
  )
}

function fmtMW(mw) {
  if (mw >= 1000) return (mw / 1000).toFixed(2).replace(/\.?0+$/, '') + ' GW'
  return (mw % 1 === 0 ? mw : mw.toFixed(1)) + ' MW'
}

function fmtPerMin(v) {
  return (v % 1 === 0 ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')) + '/min'
}

function FactoryStats({ objects }) {
  // Total power across all production buildings
  const totalPower = objects.reduce((sum, o) => {
    const def = BUILDINGS_BY_KEY[o.type]
    if (!def?.power) return sum
    return sum + def.power * Math.pow(o.clockSpeed ?? 1, 1.6)
  }, 0)

  // Building counts
  const prodObjs      = objects.filter(o => BUILDINGS_BY_KEY[o.type])
  const configured    = prodObjs.filter(o => o.recipeId)
  const unconfigured  = prodObjs.length - configured.length

  // Net output per item (outputs minus inputs, across all configured buildings)
  const net = {}
  for (const o of configured) {
    const recipe = RECIPES_BY_ID[o.recipeId]
    if (!recipe) continue
    const factor = o.clockSpeed ?? 1
    for (const out of recipe.outputs) {
      net[out.item] = (net[out.item] ?? 0) + out.perMin * factor
    }
    for (const inp of recipe.inputs) {
      net[inp.item] = (net[inp.item] ?? 0) - inp.perMin * factor
    }
  }

  // Split into produced (positive net) and consumed (negative net)
  const produced  = Object.entries(net).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const consumed  = Object.entries(net).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1])

  const statRow = (label, value, color = '#c8dff0') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0' }}>
      <span style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 10 }}>{label}</span>
      <span style={{ color, fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{value}</span>
    </div>
  )

  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Power */}
      <div>
        <div style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>POWER</div>
        {statRow('Total draw', '⚡ ' + fmtMW(totalPower), '#f4d03f')}
      </div>

      {/* Buildings */}
      <div>
        <div style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>BUILDINGS</div>
        {statRow('Production', prodObjs.length)}
        {statRow('Configured', configured.length, '#5ee877')}
        {unconfigured > 0 && statRow('Unconfigured', unconfigured, '#e87c7c')}
      </div>

      {/* Net outputs */}
      {produced.length > 0 && (
        <div>
          <div style={{ color: '#e8a013', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>OUTPUTS</div>
          {produced.map(([item, rate]) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <ItemIcon item={item} size={18} />
              <span style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
              <span style={{ color: '#e8a013', fontFamily: 'monospace', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{fmtPerMin(rate)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Net consumed (items with negative net = more consumed than produced) */}
      {consumed.length > 0 && (
        <div>
          <div style={{ color: '#5ee877', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>INPUTS</div>
          {consumed.map(([item, rate]) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <ItemIcon item={item} size={18} />
              <span style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
              <span style={{ color: '#5ee877', fontFamily: 'monospace', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{fmtPerMin(Math.abs(rate))}</span>
            </div>
          ))}
        </div>
      )}

      {prodObjs.length === 0 && (
        <span style={{ color: '#2e5f8a', fontFamily: 'monospace', fontSize: 11 }}>No buildings placed</span>
      )}
    </div>
  )
}

function BeltGroupStats({ group }) {
  const { beltIds, connTypes, sources, sinks } = group
  const beltCount     = beltIds.size
  const splitterCount = connTypes.splitter ?? 0
  const mergerCount   = connTypes.merger ?? 0

  // Aggregate by item
  const feedByItem = {}
  for (const s of sources) {
    if (s.item) feedByItem[s.item] = (feedByItem[s.item] ?? 0) + s.rate
  }
  const drainByItem = {}
  for (const s of sinks) {
    if (s.item) drainByItem[s.item] = (drainByItem[s.item] ?? 0) + s.rate
  }

  const feedEntries  = Object.entries(feedByItem).sort((a, b) => b[1] - a[1])
  const drainEntries = Object.entries(drainByItem).sort((a, b) => b[1] - a[1])
  const unknownDrains = sinks.filter(s => !s.item).length

  // Balance per item
  const allItems = new Set([...Object.keys(feedByItem), ...Object.keys(drainByItem)])
  const balances = []
  for (const item of allItems) {
    const diff = (feedByItem[item] ?? 0) - (drainByItem[item] ?? 0)
    if (Math.abs(diff) > 0.01) balances.push({ item, diff })
  }
  const balanced = balances.length === 0

  const countParts = [
    `${beltCount} belt${beltCount !== 1 ? 's' : ''}`,
    splitterCount > 0 && `${splitterCount} splitter${splitterCount !== 1 ? 's' : ''}`,
    mergerCount   > 0 && `${mergerCount} merger${mergerCount !== 1 ? 's' : ''}`,
  ].filter(Boolean).join('  ·  ')

  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ color: '#4a9eda', fontFamily: 'monospace', fontSize: 10 }}>{countParts}</div>

      {feedEntries.length > 0 && (
        <div>
          <div style={{ color: '#5ee877', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>FEEDING IN</div>
          {feedEntries.map(([item, rate]) => (
            <ItemRow key={item} item={item} rate={fmtPerMin(rate)} rateColor="#5ee877" />
          ))}
        </div>
      )}

      {drainEntries.length > 0 && (
        <div>
          <div style={{ color: '#e8a013', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>DRAINING OUT</div>
          {drainEntries.map(([item, rate]) => (
            <ItemRow key={item} item={item} rate={fmtPerMin(rate)} rateColor="#e8a013" />
          ))}
        </div>
      )}

      {unknownDrains > 0 && (
        <div style={{ color: '#2e5f8a', fontFamily: 'monospace', fontSize: 10 }}>
          + {unknownDrains} floor output{unknownDrains !== 1 ? 's' : ''}
        </div>
      )}

      {feedEntries.length === 0 && drainEntries.length === 0 && unknownDrains === 0 && (
        <span style={{ color: '#2e5f8a', fontFamily: 'monospace', fontSize: 11 }}>No connected buildings</span>
      )}

      {balanced ? (
        <div style={{ color: '#5ee877', fontFamily: 'monospace', fontSize: 10 }}>✓ balanced</div>
      ) : (
        <div style={{ fontFamily: 'monospace', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {balances.map(({ item, diff }) => (
            <span key={item} style={{ color: diff > 0 ? '#5ee877' : '#e87c7c' }}>
              {diff > 0
                ? `▲ +${fmtPerMin(diff)} ${item} surplus`
                : `▼ −${fmtPerMin(Math.abs(diff))} ${item} deficit`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoPanel({ obj, selectedBeltGroup, objects, buildingErrors }) {
  const def    = obj ? (BUILDINGS_BY_KEY[obj.type] ?? CONNECTORS_BY_KEY[obj.type]) : null
  const recipe = obj?.recipeId ? RECIPES_BY_ID[obj.recipeId] : null
  const factor = obj?.clockSpeed ?? 1
  const pct    = Math.round(factor * 100)
  const fmtRate = (r) => fmtPerMin(r * factor)

  const subtitle = obj
    ? (def?.label ?? obj.type)
    : selectedBeltGroup
    ? 'Belt Group'
    : 'Factory'

  return (
    <div style={{ borderTop: '1px solid #1e3a54', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px 6px', borderBottom: '1px solid #1e3a54',
      }}>
        <span style={{ color: '#7aabcc', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Info</span>
        <span style={{ color: '#4a9eda', fontFamily: 'monospace', fontSize: 10 }}>{subtitle}</span>
      </div>

      {/* No building, no belt selected — factory stats */}
      {!obj && !selectedBeltGroup && <FactoryStats objects={objects} />}

      {/* Single belt selected — belt group stats */}
      {!obj && selectedBeltGroup && <BeltGroupStats group={selectedBeltGroup} />}

      {/* Building selected */}
      {obj && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Size + power */}
          {def && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#3a6a8a', fontFamily: 'monospace', fontSize: 10 }}>{def.w} × {def.h} cells</span>
              {def.power != null && (
                <span style={{ color: '#f4d03f', fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>
                  ⚡ {fmtMW(def.power * Math.pow(factor, 1.6))}
                </span>
              )}
            </div>
          )}

          {/* Floor input info */}
          {obj.type === 'floor_input' && obj.item && (
            <ItemRow item={obj.item} rate={`${obj.ratePerMin ?? 60}/min`} rateColor="#4a9eda" />
          )}

          {/* Recipe info */}
          {recipe ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: '#c8dff0', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{recipe.name}</span>
                <span style={{ color: pct === 100 ? '#3a6a8a' : '#e8a013', fontFamily: 'monospace', fontSize: 11 }}>{pct}%</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#5ee877', fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>INPUTS</div>
                  {recipe.inputs.length === 0
                    ? <span style={{ color: '#3a5a7a', fontSize: 10, fontFamily: 'monospace' }}>—</span>
                    : recipe.inputs.map((inp, i) => <ItemRow key={i} item={inp.item} rate={fmtRate(inp.perMin)} rateColor="#5ee877" />)
                  }
                </div>
                <div style={{ color: '#4a9eda', fontSize: 18, paddingTop: 16, flexShrink: 0 }}>→</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#e8a013', fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>OUTPUTS</div>
                  {recipe.outputs.map((out, i) => <ItemRow key={i} item={out.item} rate={fmtRate(out.perMin)} rateColor="#e8a013" />)}
                </div>
              </div>
            </>
          ) : obj.type !== 'floor_input' && BUILDINGS_BY_KEY[obj.type] && (
            <span style={{ color: '#2e5f8a', fontFamily: 'monospace', fontSize: 11 }}>No recipe configured</span>
          )}

          {/* Alarm callout — bottom of info */}
          {buildingErrors?.has(obj.id) && (
            <div style={{
              marginTop: 4,
              background: '#2a0a0a',
              border: '1px solid #c0392b',
              borderLeft: '3px solid #e87c7c',
              borderRadius: 4,
              padding: '8px 10px',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}>
              {/* Warning icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 1.5L14.5 13H1.5L8 1.5Z" fill="#c0392b" stroke="#e87c7c" strokeWidth="1" strokeLinejoin="round" />
                <rect x="7.25" y="5.5" width="1.5" height="4" rx="0.75" fill="#ffaaaa" />
                <rect x="7.25" y="10.5" width="1.5" height="1.5" rx="0.75" fill="#ffaaaa" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ color: '#e87c7c', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alarm</span>
                {buildingErrors.get(obj.id).map((reason, i) => (
                  <span key={i} style={{ color: '#ffaaaa', fontFamily: 'monospace', fontSize: 10, lineHeight: 1.4 }}>{reason}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'buildings', label: 'Buildings' },
  { id: 'connectors', label: 'Connectors' },
]

export default function LayersPanel({
  layers, selectedId, onSelect, onToggleVisible, onRename, onAdd, onDelete, onReorder, onAddBuilding,
  selectedObj, objects, selectedBeltGroup, buildingErrors,
}) {
  const [dragId, setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [activeTab, setActiveTab]   = useState('buildings')

  const dragHandlers = (id) => ({
    onDragStart: (e) => {
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
      // Suppress default ghost for cleaner UX
      const ghost = e.currentTarget.cloneNode(true)
      ghost.style.opacity = '0.01'
      ghost.style.position = 'absolute'
      ghost.style.top = '-9999px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      setTimeout(() => document.body.removeChild(ghost), 0)
    },
    onDragOver: (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (id !== dragId) setDragOverId(id)
    },
    onDrop: (e) => {
      e.preventDefault()
      if (dragId !== null && dragId !== id) onReorder(dragId, id)
      setDragId(null)
      setDragOverId(null)
    },
    onDragEnd: () => {
      setDragId(null)
      setDragOverId(null)
    },
  })

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: PANEL_WIDTH,
      height: '100vh',
      background: '#0a1520',
      borderLeft: '1px solid #1e3a54',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 15,
    }}>
      {/* ── Layers header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 12px 8px',
        borderBottom: '1px solid #1e3a54',
        flexShrink: 0,
      }}>
        <span style={{
          color: '#7aabcc',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Floors
        </span>
        <button
          onClick={onAdd}
          title="Add layer"
          style={{
            background: '#1a3a5c',
            border: '1px solid #2e5f8a',
            borderRadius: 4,
            color: '#4a9eda',
            cursor: 'pointer',
            fontSize: 16,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {/* ── Floor list ── */}
      <div style={{
        flex: '0 0 auto',
        maxHeight: 160,
        overflowY: 'auto',
        padding: '4px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {layers.map(layer => (
          <div
            key={layer.id}
            style={{
              borderTop: dragOverId === layer.id && dragId !== layer.id
                ? '2px solid #4a9eda'
                : '2px solid transparent',
              opacity: dragId === layer.id ? 0.4 : 1,
              transition: 'opacity 0.1s',
            }}
          >
            <LayerItem
              layer={layer}
              isSelected={layer.id === selectedId}
              canDelete={layers.length > 1}
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              onRename={onRename}
              onDelete={onDelete}
              dragHandlers={dragHandlers}
            />
          </div>
        ))}
      </div>

      {/* ── Info panel — centered in free space ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '12px 0' }}>
        <div style={{ width: '100%' }}>
          <InfoPanel obj={selectedObj} selectedBeltGroup={selectedBeltGroup} objects={objects} buildingErrors={buildingErrors} />
        </div>
      </div>

      {/* ── Bottom tab panel ── */}
      <div style={{
        borderTop: '1px solid #1e3a54',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #1e3a54',
          flexShrink: 0,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  background: active ? '#0d1b2a' : 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #4a9eda' : '2px solid transparent',
                  color: active ? '#c8dff0' : '#4a7fa5',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '7px 0',
                  letterSpacing: '0.05em',
                  transition: 'all 0.1s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ overflowY: 'auto' }}>
          {activeTab === 'buildings' && (
            <BuildingsTab onAddBuilding={onAddBuilding} />
          )}
          {activeTab === 'connectors' && (
            <ConnectorsTab onAddBuilding={onAddBuilding} />
          )}
        </div>
      </div>

      {/* ── Footer hint ── */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #1e3a54',
        color: '#1e3a54',
        fontFamily: 'monospace',
        fontSize: 10,
        flexShrink: 0,
      }}>
        dbl-click to rename · drag to reorder · ✕ to delete
      </div>
    </div>
  )
}
