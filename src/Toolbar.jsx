import { useState } from 'react'
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

const TOOLS = [
  { id: 'pan',     label: 'Pan',    shortcut: 'H', Icon: PanIcon },
  { id: 'pointer', label: 'Select', shortcut: 'V', Icon: PointerIcon },
]

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', border: '1px solid transparent',
  borderRadius: 5, color: '#7aabcc', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 12, padding: '4px 10px',
  height: 30, transition: 'all 0.1s',
}

function EditableTitle({ fileName, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const inputRef              = useRef(null)

  const start = () => {
    setDraft(fileName ?? 'factory.json')
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const name = draft.trim() || (fileName ?? 'factory.json')
    onRename(name.endsWith('.json') ? name : name + '.json')
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
      {fileName ?? 'SATISFACTORY PLANNER'}
    </span>
  )
}

export default function Toolbar({ tool, onToolChange, fileName, onRename, onSave, onLoad }) {
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

      {TOOLS.map(({ id, label, shortcut, Icon }) => {
        const active = tool === id
        return (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={`${label} (${shortcut})`}
            style={{
              ...btnStyle,
              background: active ? '#1a3a5c' : 'transparent',
              border: active ? '1px solid #2e5f8a' : '1px solid transparent',
              color: active ? '#c8dff0' : '#7aabcc',
            }}
          >
            <Icon active={active} />
            {label}
            <span style={{ fontSize: 9, color: active ? '#4a9eda' : '#2e5f8a', marginLeft: 2 }}>
              {shortcut}
            </span>
          </button>
        )
      })}

      <div style={{ width: 1, height: 24, background: '#1e3a54', margin: '0 8px' }} />

      <button style={btnStyle} onClick={onSave} title="Save factory to file">
        Save
      </button>
      <button style={btnStyle} onClick={onLoad} title="Load factory from file">
        Load
      </button>
    </div>
  )
}
