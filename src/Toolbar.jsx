import { useState, useRef, useEffect } from 'react'
import { PANEL_WIDTH, TOOLBAR_HEIGHT } from './constants'

function PanIcon({ active }) {
  const c = active ? '#4a9eda' : '#7aabcc'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.5 1.5a1 1 0 0 1 1 1V7h.5V4.5a1 1 0 1 1 2 0V7h.5V5.5a1 1 0 1 1 2 0V9c0 2.5-1.5 4.5-4 4.5H7C4.8 13.5 3 11.7 3 9.5V7.5a1 1 0 1 1 2 0V7h.5V2.5a1 1 0 0 1 1-1z"
        fill={c}
      />
    </svg>
  )
}

function PointerIcon({ active }) {
  const c = active ? '#4a9eda' : '#7aabcc'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2l10 5.5-5 1.5-1.5 5L3 2z" fill={c} />
    </svg>
  )
}

const SELECT_FILTERS = [
  { id: 'all',            label: 'All' },
  { id: 'belts',          label: 'Belts' },
  { id: 'buildings',      label: 'Buildings' },
  { id: 'foundations',    label: 'Foundations' },
  { id: 'notFoundations', label: 'Not Foundations' },
]

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', border: '1px solid transparent',
  borderRadius: 5, color: '#7aabcc', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 12, padding: '4px 10px',
  height: 30, transition: 'all 0.1s',
}

function SelectMenu({ tool, onToolChange, selectFilter, onSelectFilterChange }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const active = tool === 'pointer'

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filterLabel = SELECT_FILTERS.find(f => f.id === selectFilter)?.label ?? 'All'

  const activeStyle = {
    background: active ? '#1a3a5c' : 'transparent',
    border: active ? '1px solid #2e5f8a' : '1px solid transparent',
    color: active ? '#c8dff0' : '#7aabcc',
  }

  const menuItemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none',
    color: '#c8dff0', fontFamily: 'monospace', fontSize: 12,
    padding: '6px 12px', cursor: 'pointer',
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'flex' }}>
      {/* Main button — activates pointer tool */}
      <button
        onClick={() => onToolChange('pointer')}
        title="Select (V)"
        style={{ ...btnStyle, ...activeStyle, borderRadius: '5px 0 0 5px', borderRight: 'none' }}
      >
        <PointerIcon active={active} />
        Select ({filterLabel})
        <span style={{ fontSize: 9, color: active ? '#4a9eda' : '#2e5f8a', marginLeft: 2 }}>V</span>
      </button>
      {/* Dropdown arrow */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Select filter"
        style={{ ...btnStyle, ...activeStyle, borderRadius: '0 5px 5px 0', padding: '4px 7px', minWidth: 0 }}
      >
        ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          background: '#0d1b2a', border: '1px solid #2e5f8a',
          borderRadius: 5, minWidth: 130,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>
          {SELECT_FILTERS.map(f => (
            <button
              key={f.id}
              style={{
                ...menuItemStyle,
                color: f.id === selectFilter ? '#4a9eda' : '#c8dff0',
                background: f.id === selectFilter ? '#1a3a5c' : 'transparent',
              }}
              onClick={() => { onSelectFilterChange(f.id); onToolChange('pointer'); setOpen(false) }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FileMenu({ onNew, onSave, onSaveAs, onLoad, onLoadDemo }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const menuItemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none',
    color: '#c8dff0', fontFamily: 'monospace', fontSize: 12,
    padding: '6px 12px', cursor: 'pointer',
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        style={btnStyle}
        onClick={() => setOpen(!open)}
      >
        File
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0,
            background: '#0d1b2a', border: '1px solid #2e5f8a',
            borderRadius: 5, minWidth: 120,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
          }}
        >
          <button style={menuItemStyle} onClick={() => { onNew(); setOpen(false); }}>
            New
          </button>
          <button style={menuItemStyle} onClick={() => { onSave(); setOpen(false); }}>
            Save  <span style={{ color: '#4a9eda', fontSize: 10 }}>Ctrl+S</span>
          </button>
          <button style={menuItemStyle} onClick={() => { onSaveAs(); setOpen(false); }}>
            Save As…
          </button>
          <button style={menuItemStyle} onClick={() => { onLoad(); setOpen(false); }}>
            Load
          </button>
          <button style={menuItemStyle} onClick={() => { onLoadDemo(); setOpen(false); }}>
            Load Demo
          </button>
        </div>
      )}
    </div>
  )
}

const FOUNDATION_OPACITY_OPTIONS = [
  { label: '100%', value: 1.00 },
  { label: '75%',  value: 0.75 },
  { label: '50%',  value: 0.50 },
  { label: '25%',  value: 0.25 },
  { label: 'Hidden', value: 0 },
]

function ViewMenu({ viewOptions, onToggle, foundationOpacity, onFoundationOpacityChange, viewMode, onViewModeChange }) {
  const [open, setOpen]               = useState(false)
  const [foundationOpen, setFoundationOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
        setFoundationOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none',
    color: '#c8dff0', fontFamily: 'monospace', fontSize: 12,
    padding: '6px 12px', cursor: 'pointer',
  }

  const currentOpacityLabel = FOUNDATION_OPACITY_OPTIONS.find(o => Math.abs(o.value - foundationOpacity) < 0.01)?.label ?? `${Math.round(foundationOpacity * 100)}%`

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button style={btnStyle} onClick={() => { setOpen(!open); setFoundationOpen(false) }}>View</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          background: '#0d1b2a', border: '1px solid #2e5f8a',
          borderRadius: 5, minWidth: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>
          {/* Checkbox toggles */}
          {viewOptions.map(({ id, label }) => (
            <button key={id} style={menuItemStyle} onClick={() => onToggle(id)}>
              <span style={{
                width: 12, height: 12, border: '1px solid #4a9eda', borderRadius: 2,
                background: viewOptions.find(o => o.id === id)?.visible ? '#4a9eda' : 'transparent',
                flexShrink: 0,
              }} />
              {label}
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: '#1e3a54', margin: '4px 0' }} />

          {/* World View toggle */}
          <button
            style={{ ...menuItemStyle, justifyContent: 'space-between' }}
            onClick={() => { onViewModeChange?.(viewMode === 'world' ? 'factory' : 'world'); setOpen(false) }}
          >
            <span>World View</span>
            <span style={{ color: '#4a9eda', fontSize: 10 }}>{viewMode === 'world' ? '✓' : ''} W</span>
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: '#1e3a54', margin: '4px 0' }} />

          {/* Foundation Transparency submenu */}
          <button
            style={{ ...menuItemStyle, justifyContent: 'space-between' }}
            onClick={() => setFoundationOpen(o => !o)}
          >
            <span>Foundation Transparency</span>
            <span style={{ color: '#4a9eda', fontSize: 11 }}>{currentOpacityLabel} {foundationOpen ? '▴' : '▾'}</span>
          </button>
          {foundationOpen && (
            <div style={{ background: '#0a1520', borderTop: '1px solid #1e3a54' }}>
              {FOUNDATION_OPACITY_OPTIONS.map(({ label, value }) => {
                const active = Math.abs(value - foundationOpacity) < 0.01
                return (
                  <button
                    key={label}
                    style={{
                      ...menuItemStyle,
                      paddingLeft: 28,
                      color: active ? '#4a9eda' : '#c8dff0',
                      background: active ? '#112233' : 'transparent',
                    }}
                    onClick={() => { onFoundationOpacityChange(value); setOpen(false); setFoundationOpen(false) }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      border: `1px solid ${active ? '#4a9eda' : '#2e5f8a'}`,
                      background: active ? '#4a9eda' : 'transparent',
                      flexShrink: 0,
                    }} />
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EditableTitle({ fileName, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const inputRef              = useRef(null)

  const start = () => {
    setDraft(fileName ?? 'Factory')
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const name = draft.trim() || (fileName ?? 'Factory')
    onRename(name)
    setEditing(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter')  commit()
    if (e.key === 'Escape') setEditing(false)
  }

  const baseStyle = {
    fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.08em',
    marginRight: 10, userSelect: 'none',
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        style={{
          ...baseStyle,
          background: '#0d1b2a', border: '1px solid #2e5f8a', borderRadius: 3,
          color: '#c8dff0', outline: 'none', padding: '2px 6px',
          width: Math.max(120, draft.length * 7) + 'px',
          userSelect: 'text',
        }}
      />
    )
  }

  return (
    <span
      style={{ ...baseStyle, color: '#2e5f8a', cursor: 'text' }}
      onDoubleClick={start}
      title="Double-click to rename"
    >
      {fileName ?? 'Factory'}
    </span>
  )
}

export default function Toolbar({ tool, onToolChange, selectFilter, onSelectFilterChange, viewOptions, onViewToggle, foundationOpacity, onFoundationOpacityChange, fileName, onRename, onSave, onSaveAs, onLoad, onNew, onLoadDemo, viewMode, onViewModeChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `calc(100vw - ${PANEL_WIDTH}px)`,
        height: TOOLBAR_HEIGHT,
        background: '#0a1520',
        borderBottom: '1px solid #1e3a54',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 4,
        zIndex: 20,
      }}
    >
      <EditableTitle fileName={fileName} onRename={onRename} />

      <div style={{ width: 1, height: 24, background: '#1e3a54', margin: '0 8px' }} />

      <FileMenu onNew={onNew} onSave={onSave} onSaveAs={onSaveAs} onLoad={onLoad} onLoadDemo={onLoadDemo} />
      <ViewMenu viewOptions={viewOptions} onToggle={onViewToggle} foundationOpacity={foundationOpacity} onFoundationOpacityChange={onFoundationOpacityChange} viewMode={viewMode} onViewModeChange={onViewModeChange} />

      <div style={{ width: 1, height: 24, background: '#1e3a54', margin: '0 8px' }} />

      {/* Pan tool */}
      <button
        onClick={() => onToolChange('pan')}
        title="Pan (H)"
        style={{
          ...btnStyle,
          background: tool === 'pan' ? '#1a3a5c' : 'transparent',
          border: tool === 'pan' ? '1px solid #2e5f8a' : '1px solid transparent',
          color: tool === 'pan' ? '#c8dff0' : '#7aabcc',
        }}
      >
        <PanIcon active={tool === 'pan'} />
        Pan
        <span style={{ fontSize: 9, color: tool === 'pan' ? '#4a9eda' : '#2e5f8a', marginLeft: 2 }}>H</span>
      </button>

      {/* Select tool with filter dropdown */}
      <SelectMenu
        tool={tool}
        onToolChange={onToolChange}
        selectFilter={selectFilter}
        onSelectFilterChange={onSelectFilterChange}
      />
    </div>
  )
}
