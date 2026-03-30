import { useState } from 'react'
import { PANEL_WIDTH, TOOLBAR_HEIGHT, WORLD_CELL_SIZE } from './constants'
import RECIPES from './recipes.js'

const BG       = '#0a1520'
const BORDER   = '#1e3a54'
const TEXT     = '#c8dff0'
const MUTED    = '#7aabcc'
const ACCENT   = '#4a9eda'
const BELT_CLR = '#e87c13'
const IN_CLR   = '#5ee877'

// Deduplicate all item names from recipes for the datalist
const ALL_ITEMS = [...new Set([
  // Raw resources
  'Iron Ore', 'Copper Ore', 'Limestone', 'Coal', 'Caterium Ore',
  'Raw Quartz', 'Sulfur', 'Bauxite', 'Uranium', 'SAM', 'Crude Oil',
  'Water', 'Nitrogen Gas',
  ...RECIPES.flatMap(r => [...r.inputs.map(i => i.item), ...r.outputs.map(o => o.item)]),
])].sort()

const panelStyle = {
  position: 'fixed',
  top: TOOLBAR_HEIGHT,
  right: 0,
  width: PANEL_WIDTH,
  height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
  background: BG,
  borderLeft: `1px solid ${BORDER}`,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'monospace',
  fontSize: 12,
  color: TEXT,
  overflowY: 'auto',
  zIndex: 10,
}

const sectionHeader = {
  padding: '6px 10px',
  background: '#0d1b2a',
  borderBottom: `1px solid ${BORDER}`,
  color: MUTED,
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const btnSmall = {
  background: 'transparent',
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  color: MUTED,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '2px 6px',
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 10px',
  gap: 6,
  borderBottom: `1px solid #0d1b2a`,
  cursor: 'pointer',
}

function BulletDot({ placed }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: placed ? ACCENT : 'transparent',
      border: `1px solid ${placed ? ACCENT : BORDER}`,
      flexShrink: 0,
      display: 'inline-block',
    }} />
  )
}

function IoRow({ item, perMin, type, onRemove }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px 2px 16px', color: TEXT, alignItems: 'center' }}>
      <span>{item}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: type === 'output' ? BELT_CLR : IN_CLR }}>{perMin}/min</span>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#7aabcc', cursor: 'pointer', padding: '0 2px', fontSize: 13, lineHeight: 1 }}
          >×</button>
        )}
      </div>
    </div>
  )
}

/**
 * WorldPanel — right panel for the world view.
 *
 * Props:
 *   factories           — full factory list
 *   worldState          — { worldFactories, buses, busConnections, nextWorldId, viewport }
 *   selectedFactoryId   — factoryId selected on canvas, or null
 *   selectedBusId       — bus id selected on canvas, or null
 *   onSelectFactory     — (id|null) => void
 *   onSelectBus         — (id|null) => void
 *   onEnterFactory      — (factoryId) => void
 *   onPlaceFactory      — (factoryId, x, y) => void
 *   onAddBusStart       — () => void  (enter bus placement mode)
 *   onPatchWorldState   — (partial) => void
 */
export default function WorldPanel({
  factories,
  worldState,
  selectedFactoryId,
  selectedBusId,
  onSelectFactory,
  onSelectBus,
  onEnterFactory,
  onPlaceFactory,
  onAddBusStart,
  onPatchWorldState,
  onRefreshIO,
}) {
  const { worldFactories = [], buses = [], busConnections = [] } = worldState ?? {}

  const placedIds       = new Set(worldFactories.map(wf => wf.factoryId))
  const unplaced        = (factories ?? []).filter(f => !placedIds.has(f.id))
  const placed          = (factories ?? []).filter(f =>  placedIds.has(f.id))
  const selectedFactory = (factories ?? []).find(f => f.id === selectedFactoryId) ?? null
  const selectedWF      = worldFactories.find(wf => wf.factoryId === selectedFactoryId) ?? null
  const selectedBus     = buses.find(b => b.id === selectedBusId) ?? null

  // Add connector form state
  const [addConnector, setAddConnector]   = useState(null) // { type: 'input'|'output' }
  const [connectorItem, setConnectorItem] = useState('')
  const [connectorRate, setConnectorRate] = useState('')

  const openAddConnector = (type) => {
    setAddConnector({ type })
    setConnectorItem('')
    setConnectorRate('')
  }

  const handleAddConnectorConfirm = () => {
    if (!selectedWF || !connectorItem.trim()) return
    const connectors = selectedWF.connectors ?? []
    const flow = addConnector?.type === 'output' ? 'out' : 'in'
    const side = flow === 'out' ? 'east' : 'west'

    // Space connectors evenly on this side
    const sameCount = connectors.filter(c => c.side === side).length
    const offset    = sameCount - Math.floor(sameCount / 2)

    const newConnector = {
      id:     worldState.nextWorldId ?? 1,
      side,
      offset,
      kind:   'belt',
      flow,
      item:   connectorItem.trim(),
      perMin: Number(connectorRate) || 0,
    }
    const updatedWFs = worldFactories.map(wf =>
      wf.factoryId === selectedFactoryId
        ? { ...wf, connectors: [...connectors, newConnector] }
        : wf
    )
    onPatchWorldState?.({ worldFactories: updatedWFs, nextWorldId: (worldState.nextWorldId ?? 1) + 1 })
    setAddConnector(null)
  }

  const handleRemoveConnector = (connectorId) => {
    if (!selectedWF) return
    const updatedWFs = worldFactories.map(wf =>
      wf.factoryId === selectedFactoryId
        ? { ...wf, connectors: (wf.connectors ?? []).filter(c => c.id !== connectorId) }
        : wf
    )
    // Also remove any busConnections for this connector
    const updatedBusConns = (busConnections ?? []).filter(bc => bc.connectorId !== connectorId)
    onPatchWorldState?.({ worldFactories: updatedWFs, busConnections: updatedBusConns })
  }

  const handleDeleteBus = (busId) => {
    onPatchWorldState?.({
      buses: buses.filter(b => b.id !== busId),
      busConnections: (busConnections ?? []).filter(bc => bc.busId !== busId),
    })
    if (selectedBusId === busId) onSelectBus?.(null)
  }

  const handlePlaceFactory = (factoryId) => {
    const cx = 50 * WORLD_CELL_SIZE
    const cy = 50 * WORLD_CELL_SIZE
    onPlaceFactory?.(factoryId, cx, cy)
  }

  return (
    <div style={panelStyle}>
      {/* datalist for item autocomplete */}
      <datalist id="world-items">
        {ALL_ITEMS.map(item => <option key={item} value={item} />)}
      </datalist>

      {/* ── FACTORIES ─────────────────────────────────────── */}
      <div style={sectionHeader}>Factories</div>

      {unplaced.length > 0 && (
        <div style={{ borderBottom: `1px solid ${BORDER}` }}>
          {unplaced.map(f => (
            <div
              key={f.id}
              style={{ ...rowStyle, background: '#0d1b2a', borderRadius: 3, margin: '4px 6px', borderBottom: 'none', justifyContent: 'space-between' }}
              title="Click to place on world canvas"
              onClick={() => handlePlaceFactory(f.id)}
            >
              <span style={{ color: MUTED }}>{f.name}</span>
              <span style={{ fontSize: 10, color: BORDER }}>click to place</span>
            </div>
          ))}
        </div>
      )}

      {placed.map(f => (
        <div
          key={f.id}
          style={{ ...rowStyle, background: f.id === selectedFactoryId ? '#1a3a5c' : 'transparent' }}
          onClick={() => onSelectFactory?.(f.id)}
        >
          <BulletDot placed />
          <span style={{ flex: 1, color: f.id === selectedFactoryId ? TEXT : MUTED }}>{f.name}</span>
          <button
            style={{ ...btnSmall, fontSize: 11, padding: '1px 5px' }}
            title="Remove from world map"
            onClick={(e) => {
              e.stopPropagation()
              onPatchWorldState?.({ worldFactories: worldFactories.filter(wf => wf.factoryId !== f.id) })
              if (selectedFactoryId === f.id) onSelectFactory?.(null)
            }}
          >⊗</button>
          <button
            style={{ ...btnSmall, fontSize: 11, padding: '1px 5px', marginLeft: 2 }}
            title="Enter factory view"
            onClick={(e) => { e.stopPropagation(); onEnterFactory?.(f.id) }}
          >→</button>
        </div>
      ))}

      {placed.length === 0 && unplaced.length === 0 && (
        <div style={{ padding: '8px 10px', color: BORDER, fontSize: 11 }}>No factories yet</div>
      )}

      {/* ── BUSES ─────────────────────────────────────────── */}
      <div style={{ ...sectionHeader, marginTop: 8 }}>
        <span>Buses</span>
        <button style={btnSmall} onClick={onAddBusStart}>+ Add</button>
      </div>

      {buses.map(bus => (
        <div
          key={bus.id}
          style={{ ...rowStyle, background: bus.id === selectedBusId ? '#1a3a5c' : 'transparent' }}
          onClick={() => onSelectBus?.(bus.id)}
        >
          <span style={{ color: BELT_CLR, fontSize: 10 }}>│</span>
          <span style={{ flex: 1, color: bus.id === selectedBusId ? TEXT : MUTED, fontSize: 11 }}>
            Bus {bus.id}
          </span>
        </div>
      ))}

      {buses.length === 0 && (
        <div style={{ padding: '6px 10px', color: BORDER, fontSize: 11 }}>No buses — click + Add to place one</div>
      )}

      {/* ── SELECTED BUS ──────────────────────────────────── */}
      {selectedBus && (
        <>
          <div style={{ ...sectionHeader, marginTop: 8 }}>Selected Bus</div>
          <div style={{ padding: '4px 10px', color: MUTED, fontSize: 11 }}>
            Bus {selectedBus.id} — drag a factory connector to connect
          </div>
          {(busConnections ?? []).filter(bc => bc.busId === selectedBus.id).length === 0 && (
            <div style={{ padding: '2px 10px 6px', color: BORDER, fontSize: 11 }}>No connections yet</div>
          )}
          {(busConnections ?? []).filter(bc => bc.busId === selectedBus.id).map(bc => {
            const wf  = worldFactories.find(f => f.factoryId === bc.factoryId)
            const con = (wf?.connectors ?? []).find(c => c.id === bc.connectorId)
            const factory = (factories ?? []).find(f => f.id === bc.factoryId)
            return (
              <div key={bc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px 2px 16px', color: TEXT, alignItems: 'center' }}>
                <span style={{ color: MUTED, fontSize: 10 }}>{factory?.name ?? `Factory ${bc.factoryId}`}</span>
                <span style={{ color: con?.flow === 'out' ? BELT_CLR : IN_CLR }}>
                  {con?.item} {con?.perMin}/m
                </span>
              </div>
            )
          })}
        </>
      )}

      {/* ── SELECTED FACTORY ──────────────────────────────── */}
      {selectedFactory && (
        <>
          <div style={{ ...sectionHeader, marginTop: 8 }}>
            <span>Selected</span>
            <button
              style={btnSmall}
              title="Re-detect I/O from factory floor_input/floor_output objects"
              onClick={() => onRefreshIO?.(selectedFactoryId)}
            >↺ Refresh I/O</button>
          </div>
          <div style={{ padding: '6px 10px 2px', color: TEXT }}>{selectedFactory.name}</div>

          {/* Outputs (east side) */}
          <div style={{ padding: '4px 10px 2px', color: MUTED, fontSize: 10 }}>OUTPUTS (right side):</div>
          {(selectedWF?.connectors ?? []).filter(c => c.flow === 'out').map(c => (
            <IoRow key={c.id} item={c.item} perMin={c.perMin} type="output"
              onRemove={() => handleRemoveConnector(c.id)} />
          ))}
          {addConnector?.type === 'output' ? (
            <ConnectorForm
              item={connectorItem} onItemChange={setConnectorItem}
              rate={connectorRate} onRateChange={setConnectorRate}
              onConfirm={handleAddConnectorConfirm}
              onCancel={() => setAddConnector(null)}
            />
          ) : (
            <button
              style={{ ...btnSmall, margin: '2px 10px 6px', width: 'calc(100% - 20px)' }}
              onClick={() => openAddConnector('output')}
            >+ Add output</button>
          )}

          {/* Inputs (west side) */}
          <div style={{ padding: '4px 10px 2px', color: MUTED, fontSize: 10 }}>INPUTS (left side):</div>
          {(selectedWF?.connectors ?? []).filter(c => c.flow === 'in').map(c => (
            <IoRow key={c.id} item={c.item} perMin={c.perMin} type="input"
              onRemove={() => handleRemoveConnector(c.id)} />
          ))}
          {addConnector?.type === 'input' ? (
            <ConnectorForm
              item={connectorItem} onItemChange={setConnectorItem}
              rate={connectorRate} onRateChange={setConnectorRate}
              onConfirm={handleAddConnectorConfirm}
              onCancel={() => setAddConnector(null)}
            />
          ) : (
            <button
              style={{ ...btnSmall, margin: '2px 10px 12px', width: 'calc(100% - 20px)' }}
              onClick={() => openAddConnector('input')}
            >+ Add input</button>
          )}
        </>
      )}
    </div>
  )
}

function ConnectorForm({ item, onItemChange, rate, onRateChange, onConfirm, onCancel }) {
  return (
    <div style={{ padding: '4px 10px', background: '#0d1b2a', margin: '2px 0' }}>
      <input
        autoFocus
        list="world-items"
        placeholder="Material type (e.g. Iron Ingot)"
        value={item}
        onChange={e => onItemChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 4,
          background: '#0a1118', border: `1px solid ${BORDER}`,
          borderRadius: 3, color: TEXT, fontFamily: 'monospace', fontSize: 11,
          padding: '3px 6px', outline: 'none',
        }}
      />
      <input
        placeholder="Rate /min"
        value={rate}
        onChange={e => onRateChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 4,
          background: '#0a1118', border: `1px solid ${BORDER}`,
          borderRadius: 3, color: TEXT, fontFamily: 'monospace', fontSize: 11,
          padding: '3px 6px', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          style={{ ...btnSmall, flex: 1, background: ACCENT, color: '#0a1118', border: 'none' }}
          onClick={onConfirm}
        >Add</button>
        <button style={btnSmall} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
