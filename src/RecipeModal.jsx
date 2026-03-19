import { useState, useEffect, useMemo } from 'react'
import RECIPES from './recipes.js'

function itemImageUrl(item) {
  return `https://satisfactory.wiki.gg/images/${item.replace(/ /g, '_')}.png`
}

// Small square icon with wiki image or initial fallback
function ItemIcon({ item, size = 28 }) {
  const [err, setErr] = useState(false)
  const initials = item.split(' ')
    .filter(w => /[A-Za-z]/.test(w[0]))
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || item.slice(0, 2).toUpperCase()

  if (err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: '#1a3a5c', border: '1px solid #2e5f8a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.32), fontWeight: 700,
        color: '#4a9eda', flexShrink: 0, userSelect: 'none',
      }} title={item}>
        {initials}
      </div>
    )
  }

  return (
    <img
      src={itemImageUrl(item)}
      alt={item}
      title={item}
      width={size} height={size}
      style={{ objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  )
}

// [icon] rate label chip — used in row and in the rates panel
function ItemChip({ item, rate, color = '#c8dff0', iconSize = 22, fontSize = 11 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
    }}>
      <ItemIcon item={item} size={iconSize} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ color, fontSize, fontFamily: 'monospace', fontWeight: 600 }}>
          {rate}
        </span>
        <span style={{ color: '#7aabcc', fontSize: fontSize - 1, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item}
        </span>
      </div>
    </div>
  )
}

function fmtNum(n) {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

export default function RecipeModal({ open, buildingType, recipeId, clockSpeed, onConfirm, onCancel }) {
  const [selectedId, setSelectedId] = useState(recipeId ?? null)
  const [speed,      setSpeed]      = useState(Math.round((clockSpeed ?? 1.0) * 100))
  const [speedText,  setSpeedText]  = useState(String(Math.round((clockSpeed ?? 1.0) * 100)))
  const [query,      setQuery]      = useState('')

  useEffect(() => {
    if (open) {
      setSelectedId(recipeId ?? null)
      const pct = Math.round((clockSpeed ?? 1.0) * 100)
      setSpeed(pct)
      setSpeedText(String(pct))
      setQuery('')
    }
  }, [open, recipeId, clockSpeed])

  const recipes = useMemo(() => {
    const base = RECIPES.filter(r => r.building === buildingType)
    if (!query.trim()) return base
    const q = query.toLowerCase()
    return base.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.outputs.some(o => o.item.toLowerCase().includes(q)) ||
      r.inputs.some(i => i.item.toLowerCase().includes(q))
    )
  }, [buildingType, query])

  const selectedRecipe = useMemo(() =>
    recipes.find(r => r.id === selectedId) ?? null,
    [recipes, selectedId]
  )

  if (!open) return null

  const factor = speed / 100
  const fmtRate = (r) => fmtNum(r * factor) + '/min'

  const handleSlider = (e) => {
    const v = Number(e.target.value)
    setSpeed(v)
    setSpeedText(String(v))
  }

  const handleSpeedText = (e) => {
    setSpeedText(e.target.value)
    const v = Number(e.target.value)
    if (!isNaN(v) && v >= 25 && v <= 250) setSpeed(v)
  }

  const handleConfirm = () => {
    if (!selectedId) return
    onConfirm(selectedId, speed / 100)
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
        width: 560, maxWidth: '95vw',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        maxHeight: '90vh',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#c8dff0', fontSize: 15, fontWeight: 600 }}>Configure Recipe</span>
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
          placeholder="Search recipes, items..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{
            background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
            color: '#c8dff0', padding: '7px 10px', fontSize: 13, outline: 'none',
            fontFamily: 'monospace',
          }}
        />

        {/* Recipe list */}
        <div style={{ overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recipes.length === 0 && (
            <span style={{ color: '#7aabcc', fontSize: 13, padding: 8 }}>No recipes for this building.</span>
          )}
          {recipes.map(r => {
            const sel = r.id === selectedId
            const primaryOut = r.outputs[0]
            return (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 5, cursor: 'pointer',
                  background: sel ? '#1a3a5c' : 'transparent',
                  border: `1px solid ${sel ? '#4a9eda' : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
              >
                {/* Primary output icon + recipe name stacked */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52, flexShrink: 0 }}>
                  {primaryOut && <ItemIcon item={primaryOut.item} size={32} />}
                  <div style={{
                    color: sel ? '#c8dff0' : '#7aabcc', fontSize: 10,
                    fontWeight: sel ? 600 : 400, textAlign: 'center',
                    lineHeight: 1.2, wordBreak: 'break-word',
                  }}>
                    {r.name}
                  </div>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Input → Output flow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {/* Inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {r.inputs.map((inp, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ItemIcon item={inp.item} size={22} />
                        <span style={{ color: '#7aabcc', fontSize: 10, fontFamily: 'monospace' }}>
                          {fmtNum(inp.perMin)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Arrow */}
                  <span style={{ color: '#4a9eda', fontSize: 14, lineHeight: 1 }}>→</span>

                  {/* Outputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {r.outputs.map((out, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ItemIcon item={out.item} size={22} />
                        <span style={{ color: '#e8a013', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>
                          {fmtNum(out.perMin)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Clock speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#7aabcc', fontSize: 13, flexShrink: 0 }}>Clock speed:</span>
          <input
            type="range" min={25} max={250} step={1} value={speed}
            onChange={handleSlider}
            style={{ flex: 1, accentColor: '#4a9eda' }}
          />
          <input
            type="number" min={25} max={250} value={speedText}
            onChange={handleSpeedText}
            style={{
              background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4,
              color: '#c8dff0', padding: '5px 8px', fontSize: 13, width: 64,
              outline: 'none', fontFamily: 'monospace',
            }}
          />
          <span style={{ color: '#7aabcc', fontSize: 13 }}>%</span>
        </div>

        {/* Scaled rates — icon chips with live rates */}
        {selectedRecipe && (
          <div style={{
            background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 6,
            padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            {/* Inputs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#5ee877', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>INPUTS</div>
              {selectedRecipe.inputs.length === 0
                ? <span style={{ color: '#7aabcc', fontSize: 12 }}>—</span>
                : selectedRecipe.inputs.map((inp, i) => (
                  <ItemChip key={i} item={inp.item} rate={fmtRate(inp.perMin)} color="#5ee877" iconSize={28} fontSize={12} />
                ))
              }
            </div>

            {/* Arrow divider */}
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 28, color: '#4a9eda', fontSize: 20 }}>→</div>

            {/* Outputs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#e8a013', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>OUTPUTS</div>
              {selectedRecipe.outputs.map((out, i) => (
                <ItemChip key={i} item={out.item} rate={fmtRate(out.perMin)} color="#e8a013" iconSize={28} fontSize={12} />
              ))}
            </div>
          </div>
        )}

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
            disabled={!selectedId}
            style={{
              background: selectedId ? '#1a3a5c' : '#0d1b2a',
              border: '1px solid #2e5f8a', borderRadius: 4,
              color: selectedId ? '#4a9eda' : '#3a5a7a',
              padding: '6px 16px', fontSize: 13,
              cursor: selectedId ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >OK</button>
        </div>
      </div>
    </div>
  )
}
