import { useState } from 'react'
import { PANEL_WIDTH, TOOLBAR_HEIGHT, FACTORY_TAB_HEIGHT, WORLD_CELL_SIZE } from './constants'
import { discoverFactoryIO } from './worldUtils'
import { RECIPES_BY_ID } from './recipes.js'

const BG       = '#0a1520'
const BORDER   = '#1e3a54'
const TEXT     = '#c8dff0'
const MUTED    = '#7aabcc'
const ACCENT   = '#4a9eda'
const BELT_CLR = '#e87c13'

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

function IoRow({ item, perMin, type }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px 2px 16px', color: TEXT }}>
      <span>{item}</span>
      <span style={{ color: type === 'output' ? BELT_CLR : ACCENT }}>{perMin}/min</span>
    </div>
  )
}

/**
 * WorldPanel — right panel for the world view.
 *
 * Props:
 *   factories         — full factory list
 *   worldState        — { worldFactories, buses, taps, nextWorldId, viewport }
 *   selectedFactoryId — factoryId selected on canvas, or null
 *   onSelectFactory   — (id|null) => void
 *   onEnterFactory    — (factoryId) => void
 *   onPlaceFactory    — (factoryId, x, y) => void  (click-to-place)
 *   onAddBusStart     — () => void  (open bus form)
 *   onPatchWorldState — (partial) => void
 *   busForm           — { open, item, axis } | null  (controlled by parent)
 *   onBusFormChange   — (busForm) => void
 */
export default function WorldPanel({
  factories,
  worldState,
  selectedFactoryId,
  onSelectFactory,
  onEnterFactory,
  onPlaceFactory,
  onAddBusStart,
  onPatchWorldState,
  busForm,
  onBusFormChange,
}) {
  const { worldFactories = [], buses = [] } = worldState ?? {}

  // Which factories are placed (have a worldFactory entry)
  const placedIds    = new Set(worldFactories.map(wf => wf.factoryId))
  const unplaced     = (factories ?? []).filter(f => !placedIds.has(f.id))
  const placed       = (factories ?? []).filter(f =>  placedIds.has(f.id))

  const selectedFactory = (factories ?? []).find(f => f.id === selectedFactoryId) ?? null

  // Compute IO for selected factory
  const selectedIO = selectedFactory
    ? discoverFactoryIO(selectedFactory, RECIPES_BY_ID)
    : null

  // Selected worldFactory entry
  const selectedWF = worldFactories.find(wf => wf.factoryId === selectedFactoryId) ?? null

  // Add connector form state
  const [addConnector, setAddConnector] = useState(null) // { type: 'input'|'output' }
  const [connectorItem, setConnectorItem]   = useState('')
  const [connectorRate, setConnectorRate]   = useState('')
  const [connectorSide, setConnectorSide]   = useState('south')

  const handleAddConnectorConfirm = () => {
    if (!selectedWF || !connectorItem.trim()) return
    const newConnector = {
      id:     (worldState.nextWorldId ?? 1),
      side:   connectorSide,
      offset: 0,
      kind:   'belt',
      flow:   addConnector?.type === 'output' ? Number(connectorRate) || 0 : -(Number(connectorRate) || 0),
      item:   connectorItem.trim(),
      perMin: Number(connectorRate) || 0,
    }
    const updatedWFs = worldFactories.map(wf =>
      wf.factoryId === selectedFactoryId
        ? { ...wf, connectors: [...(wf.connectors ?? []), newConnector] }
        : wf
    )
    onPatchWorldState?.({ worldFactories: updatedWFs, nextWorldId: (worldState.nextWorldId ?? 1) + 1 })
    setAddConnector(null)
    setConnectorItem('')
    setConnectorRate('')
    setConnectorSide('south')
  }

  const handlePlaceFactory = (factoryId) => {
    // Place factory at center of world canvas viewport (approx world center)
    const cx = 50 * WORLD_CELL_SIZE
    const cy = 50 * WORLD_CELL_SIZE
    onPlaceFactory?.(factoryId, cx, cy)
  }

  return (
    <div style={panelStyle}>
      {/* ── FACTORIES ─────────────────────────────────────── */}
      <div style={sectionHeader}>Factories</div>

      {/* Unplaced factories */}
      {unplaced.length > 0 && (
        <div style={{ borderBottom: `1px solid ${BORDER}` }}>
          {unplaced.map(f => (
            <div
              key={f.id}
              style={{
                ...rowStyle,
                background: '#0d1b2a',
                borderRadius: 3,
                margin: '4px 6px',
                borderBottom: 'none',
                justifyContent: 'space-between',
              }}
              title="Click to place on world canvas"
              onClick={() => handlePlaceFactory(f.id)}
            >
              <span style={{ color: MUTED }}>{f.name}</span>
              <span style={{ fontSize: 10, color: BORDER }}>click to place</span>
            </div>
          ))}
        </div>
      )}

      {/* Placed factories */}
      {placed.map(f => (
        <div
          key={f.id}
          style={{
            ...rowStyle,
            background: f.id === selectedFactoryId ? '#1a3a5c' : 'transparent',
          }}
          onClick={() => onSelectFactory?.(f.id)}
        >
          <BulletDot placed />
          <span style={{ flex: 1, color: f.id === selectedFactoryId ? TEXT : MUTED }}>{f.name}</span>
          <button
            style={{ ...btnSmall, fontSize: 11, padding: '1px 5px' }}
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

      {/* Bus add form */}
      {busForm?.open && (
        <div style={{ padding: '6px 8px', background: '#0d1b2a', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ marginBottom: 4, color: MUTED, fontSize: 11 }}>New Bus</div>
          <input
            autoFocus
            placeholder="Item name (e.g. Iron Plate)"
            value={busForm.item ?? ''}
            onChange={e => onBusFormChange?.({ ...busForm, item: e.target.value })}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0a1118', border: `1px solid ${BORDER}`,
              borderRadius: 3, color: TEXT, fontFamily: 'monospace', fontSize: 11,
              padding: '3px 6px', marginBottom: 4, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {['h', 'v'].map(ax => (
              <button
                key={ax}
                style={{
                  ...btnSmall,
                  background: busForm.axis === ax ? '#1a3a5c' : 'transparent',
                  color: busForm.axis === ax ? TEXT : MUTED,
                  flex: 1,
                }}
                onClick={() => onBusFormChange?.({ ...busForm, axis: ax })}
              >
                {ax === 'h' ? 'Horizontal' : 'Vertical'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              style={{ ...btnSmall, flex: 1, background: ACCENT, color: '#0a1118', border: 'none' }}
              onClick={() => onBusFormChange?.({ ...busForm, confirmed: true })}
            >
              Confirm — click 2 points
            </button>
            <button
              style={{ ...btnSmall }}
              onClick={() => onBusFormChange?.(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {buses.map(bus => (
        <div key={bus.id} style={{ ...rowStyle }}>
          <span style={{ color: BELT_CLR, fontSize: 10 }}>──</span>
          <span>{bus.item || <span style={{ color: BORDER }}>(empty)</span>}</span>
          <span style={{ color: BORDER, marginLeft: 'auto', fontSize: 10 }}>{bus.axis === 'h' ? 'H' : 'V'}</span>
        </div>
      ))}

      {buses.length === 0 && !busForm?.open && (
        <div style={{ padding: '6px 10px', color: BORDER, fontSize: 11 }}>No buses</div>
      )}

      {/* ── SELECTED FACTORY ──────────────────────────────── */}
      {selectedFactory && (
        <>
          <div style={{ ...sectionHeader, marginTop: 8 }}>Selected</div>
          <div style={{ padding: '6px 10px 2px', color: TEXT }}>{selectedFactory.name}</div>

          {/* Outputs */}
          <div style={{ padding: '4px 10px 2px', color: MUTED, fontSize: 10 }}>OUTPUTS:</div>
          {(selectedIO?.outputs ?? []).map((o, i) => (
            <IoRow key={i} item={o.item} perMin={o.perMin} type="output" />
          ))}
          {/* Manual connectors (outputs) */}
          {(selectedWF?.connectors ?? [])
            .filter(c => c.flow > 0)
            .map((c, i) => (
              <IoRow key={`mc-out-${i}`} item={c.item} perMin={c.perMin} type="output" />
            ))}
          {/* Add output connector */}
          {addConnector?.type === 'output' ? (
            <ConnectorForm
              side={connectorSide} onSideChange={setConnectorSide}
              item={connectorItem} onItemChange={setConnectorItem}
              rate={connectorRate} onRateChange={setConnectorRate}
              onConfirm={handleAddConnectorConfirm}
              onCancel={() => setAddConnector(null)}
            />
          ) : (
            <button
              style={{ ...btnSmall, margin: '2px 10px 6px', width: 'calc(100% - 20px)' }}
              onClick={() => setAddConnector({ type: 'output' })}
            >
              + Add output connector
            </button>
          )}

          {/* Inputs */}
          <div style={{ padding: '4px 10px 2px', color: MUTED, fontSize: 10 }}>INPUTS:</div>
          {(selectedIO?.inputs ?? []).map((o, i) => (
            <IoRow key={i} item={o.item} perMin={o.perMin} type="input" />
          ))}
          {/* Manual connectors (inputs) */}
          {(selectedWF?.connectors ?? [])
            .filter(c => c.flow < 0)
            .map((c, i) => (
              <IoRow key={`mc-in-${i}`} item={c.item} perMin={c.perMin} type="input" />
            ))}
          {/* Add input connector */}
          {addConnector?.type === 'input' ? (
            <ConnectorForm
              side={connectorSide} onSideChange={setConnectorSide}
              item={connectorItem} onItemChange={setConnectorItem}
              rate={connectorRate} onRateChange={setConnectorRate}
              onConfirm={handleAddConnectorConfirm}
              onCancel={() => setAddConnector(null)}
            />
          ) : (
            <button
              style={{ ...btnSmall, margin: '2px 10px 12px', width: 'calc(100% - 20px)' }}
              onClick={() => setAddConnector({ type: 'input' })}
            >
              + Add input connector
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ConnectorForm({ side, onSideChange, item, onItemChange, rate, onRateChange, onConfirm, onCancel }) {
  return (
    <div style={{ padding: '4px 10px', background: '#0d1b2a', margin: '2px 0' }}>
      <input
        autoFocus
        placeholder="Item name"
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
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, flexWrap: 'wrap' }}>
        {['north', 'south', 'east', 'west'].map(s => (
          <button
            key={s}
            style={{
              ...btnSmall,
              background: side === s ? '#1a3a5c' : 'transparent',
              color: side === s ? TEXT : MUTED,
            }}
            onClick={() => onSideChange(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          style={{ ...btnSmall, flex: 1, background: ACCENT, color: '#0a1118', border: 'none' }}
          onClick={onConfirm}
        >
          Add
        </button>
        <button style={btnSmall} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

