import { useState, useRef, useEffect } from 'react'
import { FACTORY_TAB_HEIGHT, PANEL_WIDTH } from './constants'

const ACCENT    = '#4a9eda'
const ACTIVE_BG = '#1a3a5c'
const MUTED     = '#7aabcc'
const TEXT      = '#c8dff0'
const BORDER    = '#1e3a54'

function FactoryTab({ factory, isActive, onSwitch, onRename, onDelete, canDelete, onDuplicate }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(factory.name)
  const inputRef = useRef(null)

  // Keep draft in sync if name changes externally
  useEffect(() => { if (!editing) setDraft(factory.name) }, [factory.name, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== factory.name) onRename(factory.id, trimmed)
    else setDraft(factory.name)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    onDuplicate(factory.id)
  }

  return (
    <div
      onDoubleClick={() => { setEditing(true); setDraft(factory.name) }}
      onClick={() => !editing && onSwitch(factory.id)}
      onContextMenu={handleContextMenu}
      title="Double-click to rename · Right-click to duplicate"
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 10px 0 12px',
        height: FACTORY_TAB_HEIGHT,
        cursor: 'pointer',
        background: isActive ? ACTIVE_BG : 'transparent',
        borderRight: `1px solid ${BORDER}`,
        borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
        flexShrink: 0,
        userSelect: 'none',
        color: isActive ? TEXT : MUTED,
        fontSize: 12,
        minWidth: 80,
        maxWidth: 180,
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setEditing(false); setDraft(factory.name) }
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'transparent', border: 'none', outline: '1px solid ' + ACCENT,
            color: TEXT, fontSize: 12, fontFamily: 'inherit', padding: '1px 2px',
            width: 100,
          }}
        />
      ) : (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
          {factory.name}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete(factory.id) }}
        disabled={!canDelete}
        title="Delete factory"
        style={{
          background: 'none', border: 'none', cursor: canDelete ? 'pointer' : 'default',
          color: canDelete ? MUTED : BORDER,
          padding: '0 2px', fontSize: 14, lineHeight: 1, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function FactoryTabBar({ factories, activeFactoryId, onSwitch, onAdd, onRename, onDelete, onDuplicate }) {
  const canDelete = factories.length > 1

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0,
      width: `calc(100vw - ${PANEL_WIDTH}px)`,
      height: FACTORY_TAB_HEIGHT,
      background: '#0a1520',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'stretch',
      overflowX: 'auto', overflowY: 'hidden',
      zIndex: 10,
    }}>
      {/* + New button */}
      <button
        onClick={onAdd}
        title="New factory"
        style={{
          background: 'none', border: 'none', borderRight: `1px solid ${BORDER}`,
          color: MUTED, cursor: 'pointer', padding: '0 12px',
          fontSize: 18, lineHeight: 1, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        +
      </button>

      {factories.map(f => (
        <FactoryTab
          key={f.id}
          factory={f}
          isActive={f.id === activeFactoryId}
          onSwitch={onSwitch}
          onRename={onRename}
          onDelete={onDelete}
          canDelete={canDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  )
}
