import { useState, useEffect } from 'react'

export default function ConveyorLiftConfigModal({
  open, layers, currentLayerId, linkedLayerId, isCurrentIn,
  onConfirm, onCancel,
}) {
  const [targetLayerId, setTargetLayerId] = useState(linkedLayerId)
  const [currentIn,     setCurrentIn]     = useState(isCurrentIn)

  useEffect(() => {
    if (open) {
      setTargetLayerId(linkedLayerId)
      setCurrentIn(isCurrentIn)
    }
  }, [open, linkedLayerId, isCurrentIn])

  if (!open) return null

  const currentLayer = layers.find(l => l.id === currentLayerId)
  const otherLayers  = layers.filter(l => l.id !== currentLayerId)

  const handleConfirm = () => {
    if (targetLayerId == null) return
    onConfirm({ targetLayerId: Number(targetLayerId), isCurrentIn: currentIn })
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const optionStyle = (active) => ({
    flex: 1,
    padding: '8px 12px',
    borderRadius: 4,
    border: `1px solid ${active ? '#2ab870' : '#1e3a54'}`,
    background: active ? '#0e2b1e' : '#0d1b2a',
    color: active ? '#2ab870' : '#7aabcc',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 13,
    textAlign: 'center',
    transition: 'all 0.1s',
    userSelect: 'none',
  })

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
        width: 380, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#c8dff0', fontSize: 15, fontWeight: 600 }}>Configure Conveyor Lift</span>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: '#7aabcc', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Current floor info */}
        <div style={{ color: '#7aabcc', fontSize: 12 }}>
          This lift is on <span style={{ color: '#c8dff0' }}>{currentLayer?.name ?? 'current floor'}</span>
        </div>

        {/* Direction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ color: '#7aabcc', fontSize: 12 }}>Direction on this floor:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={optionStyle(currentIn)} onClick={() => setCurrentIn(true)}>
              ↓ Receives (IN)
            </div>
            <div style={optionStyle(!currentIn)} onClick={() => setCurrentIn(false)}>
              ↑ Sends (OUT)
            </div>
          </div>
        </div>

        {/* Linked floor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ color: '#7aabcc', fontSize: 12 }}>Linked floor:</span>
          {otherLayers.length === 0 ? (
            <div style={{ color: '#e87c7c', fontSize: 13 }}>No other floors available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {otherLayers.map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setTargetLayerId(layer.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: `1px solid ${targetLayerId === layer.id ? '#2ab870' : '#1e3a54'}`,
                    background: targetLayerId === layer.id ? '#0e2b1e' : '#0d1b2a',
                    color: targetLayerId === layer.id ? '#2ab870' : '#7aabcc',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    transition: 'all 0.1s',
                  }}
                >
                  {layer.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ background: '#0d1b2a', border: '1px solid #1e3a54', borderRadius: 4, color: '#7aabcc', padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
          >Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={targetLayerId == null || otherLayers.length === 0}
            style={{
              background: targetLayerId != null ? '#0e2b1e' : '#0d1b2a',
              border: '1px solid #2ab870', borderRadius: 4,
              color: targetLayerId != null ? '#2ab870' : '#3a7a5a',
              padding: '6px 16px', fontSize: 13,
              cursor: targetLayerId != null ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >Apply</button>
        </div>
      </div>
    </div>
  )
}
