import { useState, useEffect, useMemo } from 'react'
import RECIPES from './recipes.js'

// Derive all unique item names from recipe inputs + outputs
const ALL_ITEMS = (() => {
  const set = new Set()
  for (const r of RECIPES) {
    for (const { item } of r.inputs)  set.add(item)
    for (const { item } of r.outputs) set.add(item)
  }
  return [...set].sort()
})()

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
          fontSize: 13, fontWeight: 'bold', color: '#fff', marginBottom: 4,
          flexShrink: 0,
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

export default function FloorInputModal({ open, item, ratePerMin, onConfirm, onCancel }) {
  const [query,       setQuery]       = useState('')
  const [selectedItem, setSelectedItem] = useState(item ?? null)
  const [rate,        setRate]        = useState(ratePerMin ?? 60)

  // Sync external props when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedItem(item ?? null)
      setRate(ratePerMin ?? 60)
    }
  }, [open, item, ratePerMin])

  const filtered = useMemo(() =>
    query.trim() === ''
      ? ALL_ITEMS
      : ALL_ITEMS.filter(i => i.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  if (!open) return null

  const handleConfirm = () => {
    if (!selectedItem) return
    onConfirm(selectedItem, Number(rate) || 60)
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

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
        background: '#0a1520',
        border: '1px solid #2e5f8a',
        borderRadius: 8,
        padding: '20px 24px',
        width: 480, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#c8dff0', fontSize: 15, fontWeight: 600 }}>Configure Factory Input</span>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', color: '#7aabcc',
              fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{
            background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
            color: '#c8dff0', padding: '7px 10px', fontSize: 13, outline: 'none',
            fontFamily: 'monospace',
          }}
        />

        {/* Item grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          maxHeight: 260, overflowY: 'auto',
          padding: '4px 2px',
        }}>
          {filtered.map(i => (
            <ItemCard
              key={i}
              item={i}
              selected={i === selectedItem}
              onClick={() => setSelectedItem(i)}
            />
          ))}
          {filtered.length === 0 && (
            <span style={{ color: '#7aabcc', fontSize: 13, padding: '8px 4px' }}>No items match.</span>
          )}
        </div>

        {/* Rate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#7aabcc', fontSize: 13 }}>Rate:</span>
          <input
            type="number"
            min={1}
            value={rate}
            onChange={e => setRate(e.target.value)}
            style={{
              background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
              color: '#c8dff0', padding: '5px 8px', fontSize: 13, width: 90,
              outline: 'none', fontFamily: 'monospace',
            }}
          />
          <span style={{ color: '#7aabcc', fontSize: 13 }}>items/min</span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
              color: '#7aabcc', padding: '6px 16px', fontSize: 13, cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedItem}
            style={{
              background: selectedItem ? '#1a3a5c' : '#0d1b2a',
              border: '1px solid #2e5f8a', borderRadius: 4,
              color: selectedItem ? '#4a9eda' : '#3a5a7a',
              padding: '6px 16px', fontSize: 13,
              cursor: selectedItem ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >OK</button>
        </div>
      </div>
    </div>
  )
}
