'use client'

import { useState } from 'react'
import { pickExcuses } from '@/lib/forfaitExcuses'

const RED = '#B23A2E'
const CUSTOM = '__custom__'

type Props = {
  initialReason?: string | null
  onConfirm: (reason: string | null) => Promise<void> | void
  onClose: () => void
}

export default function ForfaitModal({ initialReason, onConfirm, onClose }: Props) {
  const [excuses, setExcuses] = useState<string[]>(() => pickExcuses(3))
  const [selected, setSelected] = useState<string | null>(initialReason ? CUSTOM : null)
  const [custom, setCustom] = useState(initialReason || '')
  const [saving, setSaving] = useState(false)

  function rerollExcuses() {
    setExcuses((prev) => pickExcuses(3, prev))
    if (selected !== CUSTOM) setSelected(null)
  }

  const reason = selected === CUSTOM ? custom.trim() : selected
  const canConfirm = !!reason && !saving

  async function handleConfirm() {
    if (!reason) return
    setSaving(true)
    await onConfirm(reason)
    setSaving(false)
  }

  async function handleNoReason() {
    setSaving(true)
    await onConfirm(null)
    setSaving(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="blm-card"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', borderTopColor: RED }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>😬 Tu déclares forfait ?</div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: '#F0F0F0', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 13.5, color: '#666', marginBottom: 16 }}>
          Le vestiaire mérite une explication. Choisis ton excuse (bidon de préférence).
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {excuses.map((ex) => {
            const active = selected === ex
            return (
              <button
                key={ex}
                onClick={() => setSelected(ex)}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 14, lineHeight: 1.35,
                  border: `1.5px solid ${active ? RED : '#E3E3E3'}`,
                  background: active ? '#FBE4E1' : '#fff',
                  color: '#1A1A1A', fontWeight: active ? 600 : 400,
                }}
              >
                {ex}
              </button>
            )
          })}
        </div>

        <button
          onClick={rerollExcuses}
          style={{ marginTop: 10, background: 'none', border: 'none', color: '#003F6E', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
        >
          🎲 Autres excuses
        </button>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setSelected(CUSTOM)}
            style={{
              width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 14,
              border: `1.5px solid ${selected === CUSTOM ? RED : '#E3E3E3'}`,
              background: selected === CUSTOM ? '#FBE4E1' : '#fff', color: '#1A1A1A', fontWeight: 600,
            }}
          >
            ✍️ J&apos;ai ma propre excuse bidon
          </button>
          {selected === CUSTOM && (
            <textarea
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Ex : mon poisson rouge fait sa crise d'ado…"
              style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 10, border: '1px solid #ccc', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
            />
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            width: '100%', marginTop: 18, padding: '12px 14px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 15,
            background: canConfirm ? RED : '#E8B9B3', color: '#fff', cursor: canConfirm ? 'pointer' : 'default',
          }}
        >
          ✕ Confirmer le forfait
        </button>
        <button
          onClick={handleNoReason}
          disabled={saving}
          style={{ width: '100%', marginTop: 8, padding: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }}
        >
          Forfait sans motif (pas drôle, mais bon)
        </button>
      </div>
    </div>
  )
}
