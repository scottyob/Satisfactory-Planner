import { useState } from 'react'
import { PANEL_WIDTH, CELL_SIZE } from './constants'
import BUILDINGS from './buildings.js'

const BUILDINGS_HEIGHT = 192

// ─── Layer state hook ────────────────────────────────────────────────────────

let _nextLayerId = 2

export function useLayers() {
  const [layers, setLayers] = useState([
    { id: 1, name: 'Layer 1', visible: true },
  ])
  const [selectedId, setSelectedId] = useState(1)

  const addLayer = () => {
    const id = _nextLayerId++
    setLayers(prev => [{ id, name: `Layer ${id}`, visible: false }, ...prev])
    setSelectedId(id)
  }

  const toggleVisible = (id) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))

  const renameLayer = (id, name) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))

  const selectLayer = (id) => setSelectedId(id)

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

  return { layers, selectedId, addLayer, toggleVisible, renameLayer, selectLayer, reorderLayers }
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

function LayerItem({ layer, isSelected, onSelect, onToggleVisible, onRename, dragHandlers }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(layer.name)

  const commitRename = () => {
    const v = draft.trim()
    onRename(layer.id, v || layer.name)
    setEditing(false)
  }

  const handleDoubleClick = () => {
    onSelect(layer.id)
    setDraft(layer.name)
    setEditing(true)
  }

  return (
    <div
      draggable
      {...dragHandlers(layer.id)}
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

      <input
        type="checkbox"
        checked={layer.visible}
        onChange={() => onToggleVisible(layer.id)}
        onClick={e => e.stopPropagation()}
        style={{ accentColor: '#4a9eda', cursor: 'pointer', flexShrink: 0 }}
      />

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
    </div>
  )
}

// ─── Buildings tab ───────────────────────────────────────────────────────────

function BuildingCard({ def, onAdd }) {
  const [hovered, setHovered] = useState(false)
  const scale = 28 / Math.max(def.w, def.h)
  const pw = def.w * scale   // preview pixel width
  const ph = def.h * scale   // preview pixel height

  return (
    <div
      title={`${def.label} (${def.w} × ${def.h} cells)`}
      onClick={() => onAdd(def.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 6px',
        borderRadius: 6,
        border: `1px solid ${hovered ? def.color : '#1e3a54'}`,
        background: hovered ? '#0f2030' : '#0a1825',
        cursor: 'pointer',
        width: 68,
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      {/* Mini building preview */}
      <div style={{
        width: pw,
        height: ph,
        background: `${def.color}22`,
        border: `1.5px solid ${def.color}`,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 7, color: def.color, fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', lineHeight: 1 }}>
          {def.label.slice(0, 4).toUpperCase()}
        </span>
      </div>

      <span style={{ fontSize: 10, color: '#7aabcc', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.2 }}>
        {def.label}
      </span>
      <span style={{ fontSize: 9, color: '#2e5f8a', fontFamily: 'monospace' }}>
        {def.w} × {def.h}
      </span>
    </div>
  )
}

function BuildingsTab({ onAddBuilding }) {
  return (
    <div style={{ padding: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
      {BUILDINGS.map(def => (
        <BuildingCard key={def.key} def={def} onAdd={onAddBuilding} />
      ))}
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const TABS = [{ id: 'buildings', label: 'Buildings' }]

export default function LayersPanel({
  layers, selectedId, onSelect, onToggleVisible, onRename, onAdd, onReorder, onAddBuilding,
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
          Layers
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

      {/* ── Layer list ── */}
      <div style={{
        flex: 1,
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
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              onRename={onRename}
              dragHandlers={dragHandlers}
            />
          </div>
        ))}
      </div>

      {/* ── Bottom tab panel ── */}
      <div style={{
        height: BUILDINGS_HEIGHT,
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
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'buildings' && (
            <BuildingsTab onAddBuilding={onAddBuilding} />
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
        dbl-click to rename · drag to reorder
      </div>
    </div>
  )
}
