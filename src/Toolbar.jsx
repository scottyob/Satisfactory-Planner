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

export default function Toolbar({ tool, onToolChange }) {
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
      <span style={{
        color: '#2e5f8a',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: '0.08em',
        marginRight: 10,
        userSelect: 'none',
      }}>
        SATISFACTORY PLANNER
      </span>

      <div style={{ width: 1, height: 24, background: '#1e3a54', margin: '0 8px' }} />

      {TOOLS.map(({ id, label, shortcut, Icon }) => {
        const active = tool === id
        return (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={`${label} (${shortcut})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: active ? '#1a3a5c' : 'transparent',
              border: active ? '1px solid #2e5f8a' : '1px solid transparent',
              borderRadius: 5,
              color: active ? '#c8dff0' : '#7aabcc',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '4px 10px',
              height: 30,
              transition: 'all 0.1s',
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
    </div>
  )
}
