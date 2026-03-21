import { useState, useEffect, useMemo } from 'react'
import RECIPES from './recipes.js'

const ALL_ITEMS = (() => {
  const set = new Set()
  for (const r of RECIPES) {
    for (const { item } of r.inputs)  set.add(item)
    for (const { item } of r.outputs) set.add(item)
  }
  return [...set].sort()
})()

// Port index → display label (Left=west=2, Center=north=0, Right=east=1)
const PORT_LABELS = ['Center', 'Right', 'Left']
// Display order: Left (port 2), Center (port 0), Right (port 1)
const DISPLAY_ORDER = [2, 0, 1]

const FILTER_OPTIONS = [
  { value: 'any',           label: 'Any',          color: '#4a9eda' },
  { value: 'none',          label: 'None',          color: '#c0392b' },
  { value: 'overflow',      label: 'Overflow',      color: '#e87c13' },
  { value: 'any_undefined', label: 'Any Undef.',    color: '#8e44ad' },
]

function filterChipStyle(filter) {
  if (filter === 'any')           return { bg: '#1a2a3c', border: '#4a9eda', text: '#4a9eda' }
  if (filter === 'none')          return { bg: '#2a1010', border: '#c0392b', text: '#e87c7c' }
  if (filter === 'overflow')      return { bg: '#2a1a00', border: '#e87c13', text: '#f5a623' }
  if (filter === 'any_undefined') return { bg: '#1e0e2a', border: '#8e44ad', text: '#a855f7' }
  return { bg: '#0e2a1a', border: '#27ae60', text: '#5ee877' }  // specific item
}

function itemImageUrl(item) {
  return `https://satisfactory.wiki.gg/images/${item.replace(/ /g, '_')}.png`
}

function ItemCard({ item, selected, onClick }) {
  const [imgError, setImgError] = useState(false)
  const initials = item.split(' ').filter(w => /[A-Z]/.test(w[0])).map(w => w[0]).join('').slice(0, 2) || item.slice(0, 2).toUpperCase()

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
        border: selected ? '2px solid #4a9eda' : '2px solid transparent',
        background: selected ? '#1a3a5c' : 'transparent',
        width: 72, boxSizing: 'border-box',
        transition: 'background 0.1s',
      }}
      title={item}
    >
      {imgError ? (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: '#4a9eda',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 4, flexShrink: 0,
        }}>
          {initials}
        </div>
      ) : (
        <img
          src={itemImageUrl(item)}
          alt={item}
          width={40} height={40}
          style={{ objectFit: 'contain', marginBottom: 4, flexShrink: 0 }}
          onError={() => setImgError(true)}
        />
      )}
      <span style={{
        fontSize: 10, color: '#c8dff0', textAlign: 'center',
        lineHeight: 1.2, wordBreak: 'break-word',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item}
      </span>
    </div>
  )
}

function FilterChip({ filter }) {
  const { bg, border, text } = filterChipStyle(filter)
  const label = FILTER_OPTIONS.find(o => o.value === filter)?.label ?? filter
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 4, fontSize: 12,
      background: bg, border: `1px solid ${border}`, color: text,
      fontWeight: 600, minHeight: 24,
    }}>
      {label}
    </div>
  )
}

export default function SplitterModal({ open, outputFilters, onConfirm, onCancel }) {
  const [filters, setFilters]       = useState(['any', 'any', 'any'])
  const [pickerSlot, setPickerSlot] = useState(null)   // null | port index
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerSelected, setPickerSelected] = useState(null)

  useEffect(() => {
    if (open) {
      setFilters(outputFilters ? [...outputFilters] : ['any', 'any', 'any'])
      setPickerSlot(null)
      setPickerQuery('')
      setPickerSelected(null)
    }
  }, [open, outputFilters])

  const filteredItems = useMemo(() =>
    pickerQuery.trim() === ''
      ? ALL_ITEMS
      : ALL_ITEMS.filter(i => i.toLowerCase().includes(pickerQuery.toLowerCase())),
    [pickerQuery]
  )

  if (!open) return null

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const setFilter = (portIdx, value) => {
    setFilters(prev => { const next = [...prev]; next[portIdx] = value; return next })
  }

  const openPicker = (portIdx) => {
    const current = filters[portIdx]
    setPickerSelected(FILTER_OPTIONS.some(o => o.value === current) ? null : current)
    setPickerQuery('')
    setPickerSlot(portIdx)
  }

  const confirmPicker = () => {
    if (pickerSelected) {
      setFilter(pickerSlot, pickerSelected)
    }
    setPickerSlot(null)
  }

  const handleConfirm = () => {
    onConfirm(filters)
  }

  // ── Item picker sub-view ──────────────────────────────────────────────────
  if (pickerSlot !== null) {
    const slotLabel = PORT_LABELS[pickerSlot]
    return (
      <div
        onClick={handleBackdrop}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div style={{
          background: '#0a1520', border: '1px solid #2e5f8a', borderRadius: 8,
          padding: '20px 24px', width: 480, maxWidth: '90vw',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#c8dff0', fontSize: 15, fontWeight: 600 }}>
              Select Item — {slotLabel} Output
            </span>
            <button
              onClick={() => setPickerSlot(null)}
              style={{ background: 'none', border: 'none', color: '#7aabcc', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
            >✕</button>
          </div>

          <input
            type="text"
            placeholder="Search items..."
            value={pickerQuery}
            onChange={e => setPickerQuery(e.target.value)}
            autoFocus
            style={{
              background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
              color: '#c8dff0', padding: '7px 10px', fontSize: 13, outline: 'none', fontFamily: 'monospace',
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 260, overflowY: 'auto', padding: '4px 2px' }}>
            {filteredItems.map(item => (
              <ItemCard
                key={item}
                item={item}
                selected={item === pickerSelected}
                onClick={() => setPickerSelected(item)}
              />
            ))}
            {filteredItems.length === 0 && (
              <span style={{ color: '#7aabcc', fontSize: 13, padding: '8px 4px' }}>No items match.</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setPickerSlot(null)}
              style={{ background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4, color: '#7aabcc', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >Back</button>
            <button
              onClick={confirmPicker}
              disabled={!pickerSelected}
              style={{
                background: pickerSelected ? '#1a3a5c' : '#0d1b2a',
                border: '1px solid #2e5f8a', borderRadius: 4,
                color: pickerSelected ? '#4a9eda' : '#3a5a7a',
                padding: '6px 16px', fontSize: 13,
                cursor: pickerSelected ? 'pointer' : 'not-allowed', fontWeight: 600,
              }}
            >Select</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: '#0a1520', border: '1px solid #2e5f8a', borderRadius: 8,
        padding: '20px 24px', width: 560, maxWidth: '94vw',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#c8dff0', fontSize: 15, fontWeight: 600 }}>Configure Splitter</span>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: '#7aabcc', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Output slots — Left / Center / Right */}
        <div style={{ display: 'flex', gap: 10 }}>
          {DISPLAY_ORDER.map(portIdx => {
            const filter = filters[portIdx] ?? 'any'
            const label  = PORT_LABELS[portIdx]
            return (
              <div
                key={portIdx}
                style={{
                  flex: 1, background: '#0d1b2a', border: '1px solid #1e3a54',
                  borderRadius: 6, padding: '12px 10px',
                  display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
                }}
              >
                <span style={{ color: '#7aabcc', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </span>
                <FilterChip filter={filter} />
                {/* Quick-select buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  {FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(portIdx, opt.value)}
                      style={{
                        background: filter === opt.value ? '#1a3a5c' : 'transparent',
                        border: `1px solid ${filter === opt.value ? '#4a9eda' : '#1e3a54'}`,
                        borderRadius: 4, color: filter === opt.value ? '#c8dff0' : '#7aabcc',
                        padding: '4px 0', fontSize: 12, cursor: 'pointer', width: '100%',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => openPicker(portIdx)}
                    style={{
                      background: !FILTER_OPTIONS.some(o => o.value === filter) ? '#1a3a5c' : 'transparent',
                      border: `1px solid ${!FILTER_OPTIONS.some(o => o.value === filter) ? '#4a9eda' : '#1e3a54'}`,
                      borderRadius: 4, color: !FILTER_OPTIONS.some(o => o.value === filter) ? '#c8dff0' : '#7aabcc',
                      padding: '4px 0', fontSize: 12, cursor: 'pointer', width: '100%',
                    }}
                  >
                    Item...
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4, color: '#7aabcc', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
          >Cancel</button>
          <button
            onClick={handleConfirm}
            style={{
              background: '#1a3a5c', border: '1px solid #2e5f8a', borderRadius: 4,
              color: '#4a9eda', padding: '6px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
            }}
          >OK</button>
        </div>
      </div>
    </div>
  )
}
