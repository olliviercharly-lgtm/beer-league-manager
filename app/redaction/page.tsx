'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'
import {
  DEFAULT_EDITORIAL,
  LIMITS,
  THEME_KEYS,
  THEME_LABELS,
  newToneKey,
  type EditorialSettings,
  type EditorialTone,
  type ThemeKey,
} from '@/lib/editorial'

const CLUB_BLUE = '#003F6E'

const sectionTitle: CSSProperties = { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }
const helpText: CSSProperties = { fontSize: 13, color: '#777', marginBottom: 10, lineHeight: 1.4 }
const textareaStyle: CSSProperties = { width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 10, boxSizing: 'border-box', fontSize: 14, lineHeight: 1.45, fontFamily: 'inherit', resize: 'vertical' }
const inputStyle: CSSProperties = { padding: 10, border: '1px solid #ccc', borderRadius: 10, boxSizing: 'border-box', fontSize: 14 }
const smallBtn: CSSProperties = { width: 34, height: 34, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14, flexShrink: 0 }

function Counter({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9
  return <div style={{ fontSize: 11, color: near ? '#B23A2E' : '#999', textAlign: 'right', marginTop: 4 }}>{value.length} / {max}</div>
}

export default function RedactionPage() {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [settings, setSettings] = useState<EditorialSettings>(DEFAULT_EDITORIAL)
  const [isCustom, setIsCustom] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/editorial')
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.isAdmin) {
          setAllowed(true)
          setSettings(data.settings)
          setIsCustom(!!data.isCustom)
          if (data.warning) setWarning("La base de données n'est pas encore prête : lance le script SQL de la Salle de rédaction dans Supabase avant d'enregistrer.")
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function update(patch: Partial<EditorialSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }))
    setDirty(true)
    setSuccess('')
  }

  function updateTone(index: number, patch: Partial<EditorialTone>) {
    update({ tones: settings.tones.map((t, i) => (i === index ? { ...t, ...patch } : t)) })
  }

  function moveTone(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= settings.tones.length) return
    const list = [...settings.tones]
    const [item] = list.splice(index, 1)
    list.splice(target, 0, item)
    update({ tones: list })
  }

  function removeTone(index: number) {
    if (settings.tones.length <= 1) return
    const tone = settings.tones[index]
    if (!confirm(`Supprimer le ton « ${tone.label} » ?`)) return
    update({ tones: settings.tones.filter((_, i) => i !== index) })
  }

  function addTone() {
    if (settings.tones.length >= LIMITS.maxTones) return
    update({ tones: [...settings.tones, { key: newToneKey(), emoji: '✨', label: 'Nouveau ton', prompt: '' }] })
  }

  function updateTheme(key: ThemeKey, value: string) {
    update({ themes: { ...settings.themes, [key]: value } })
  }

  async function save(payload: EditorialSettings | null) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/editorial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement.")
      } else {
        setSettings(data.settings)
        setIsCustom(!!data.isCustom)
        setDirty(false)
        setWarning('')
        setSuccess(payload === null ? "Réglages d'origine restaurés." : 'Salle de rédaction enregistrée ✓')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  function handleSave() {
    const incomplete = settings.tones.find((t) => !t.label.trim() || !t.prompt.trim())
    if (incomplete) {
      setError(`Le ton « ${incomplete.label || 'sans nom'} » doit avoir un nom et une consigne.`)
      return
    }
    save(settings)
  }

  function handleReset() {
    if (!confirm("Remettre la personnalité, les tons et les consignes d'origine ? Tes modifications seront perdues.")) return
    save(null)
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <p style={{ padding: 40 }}>Chargement...</p>
      </>
    )
  }

  if (!allowed) {
    return (
      <>
        <NavBar />
        <div style={{ padding: 40 }}>
          <p>Accès réservé aux administrateurs.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 120px' }}>
        <Link href="/gazette" style={{ fontSize: 13, color: CLUB_BLUE, textDecoration: 'none', fontWeight: 600 }}>
          ← Retour à la Gazette
        </Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>🖋️ Salle de rédaction</h1>
        <p style={{ ...helpText, marginBottom: 20 }}>
          Règle ici la façon dont l&apos;IA écrit pour ta ligue. Ces consignes s&apos;appliquent à tous les articles de la Gazette et aux bios des fiches joueurs.
          {isCustom ? ' Réglages personnalisés actifs.' : " Tu vois actuellement les réglages d'origine."}
        </p>

        {warning && (
          <div className="blm-card" style={{ background: '#FFF6E5', border: '1px solid #E0A83E', marginBottom: 16, fontSize: 14 }}>
            ⚠️ {warning}
          </div>
        )}

        <div className="blm-card" style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>📰 La plume du rédacteur en chef</div>
          <p style={helpText}>
            La personnalité de base de la Gazette, appliquée à tous les articles : qui écrit, l&apos;esprit général, ce qu&apos;il doit faire ou ne jamais faire.
          </p>
          <textarea
            value={settings.persona}
            onChange={(e) => update({ persona: e.target.value.slice(0, LIMITS.persona) })}
            rows={7}
            style={textareaStyle}
          />
          <Counter value={settings.persona} max={LIMITS.persona} />
        </div>

        <div className="blm-card" style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>🧑‍🎤 La plume des bios joueurs</div>
          <p style={helpText}>Utilisée par le bouton de génération IA du champ « À propos » des fiches joueurs.</p>
          <textarea
            value={settings.bioPersona}
            onChange={(e) => update({ bioPersona: e.target.value.slice(0, LIMITS.persona) })}
            rows={5}
            style={textareaStyle}
          />
          <Counter value={settings.bioPersona} max={LIMITS.persona} />
        </div>

        <div className="blm-card" style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>🎭 Les tons ({settings.tones.length})</div>
          <p style={helpText}>
            Les joueurs choisissent un ton au moment de générer un article. Le premier de la liste est sélectionné par défaut. Décris dans la consigne comment l&apos;article doit sonner.
          </p>

          {settings.tones.map((t, i) => (
            <div key={t.key} style={{ border: '1px solid #eee', borderRadius: 14, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  value={t.emoji}
                  onChange={(e) => updateTone(i, { emoji: e.target.value.slice(0, LIMITS.toneEmoji) })}
                  aria-label="Emoji"
                  style={{ ...inputStyle, width: 52, textAlign: 'center', fontSize: 18, padding: 6 }}
                />
                <input
                  value={t.label}
                  onChange={(e) => updateTone(i, { label: e.target.value.slice(0, LIMITS.toneLabel) })}
                  placeholder="Nom du ton"
                  style={{ ...inputStyle, flex: 1, minWidth: 0, fontWeight: 600 }}
                />
              </div>
              <textarea
                value={t.prompt}
                onChange={(e) => updateTone(i, { prompt: e.target.value.slice(0, LIMITS.tonePrompt) })}
                placeholder="Ex : ton de commentateur survolté, phrases courtes, comparaisons absurdes…"
                rows={3}
                style={textareaStyle}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8, alignItems: 'center' }}>
                {i === 0 && <span style={{ fontSize: 11, color: CLUB_BLUE, fontWeight: 600, marginRight: 'auto' }}>Ton par défaut</span>}
                <button type="button" onClick={() => moveTone(i, -1)} disabled={i === 0} title="Monter" style={{ ...smallBtn, opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                <button type="button" onClick={() => moveTone(i, 1)} disabled={i === settings.tones.length - 1} title="Descendre" style={{ ...smallBtn, opacity: i === settings.tones.length - 1 ? 0.4 : 1 }}>↓</button>
                <button type="button" onClick={() => removeTone(i)} disabled={settings.tones.length <= 1} title="Supprimer" style={{ ...smallBtn, color: '#B23A2E', opacity: settings.tones.length <= 1 ? 0.4 : 1 }}>🗑️</button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addTone}
            disabled={settings.tones.length >= LIMITS.maxTones}
            className="blm-pill"
            style={{ width: '100%', justifyContent: 'center', color: CLUB_BLUE, borderColor: CLUB_BLUE }}
          >
            + Ajouter un ton
          </button>
        </div>

        <div className="blm-card" style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>🗂️ Consignes par type d&apos;article</div>
          <p style={helpText}>
            Ce que l&apos;IA doit produire pour chaque type d&apos;article : structure, longueur, angle. Les données de l&apos;app (score, faits saillants, fiches joueurs) sont ajoutées automatiquement.
          </p>
          {THEME_KEYS.map((key) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{THEME_LABELS[key]}</div>
              <textarea
                value={settings.themes[key]}
                onChange={(e) => updateTheme(key, e.target.value.slice(0, LIMITS.themePrompt))}
                rows={3}
                style={textareaStyle}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 13, padding: 0 }}
        >
          ↺ Revenir aux réglages d&apos;origine
        </button>
      </div>

      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
          background: '#fff', borderTop: '1px solid #e5e5e5', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          padding: '12px 16px',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
            {error && <span style={{ color: '#B23A2E' }}>{error}</span>}
            {!error && success && <span style={{ color: '#2E7D5B' }}>{success}</span>}
            {!error && !success && dirty && <span style={{ color: '#777' }}>Modifications non enregistrées</span>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="blm-btn-primary"
            style={{ opacity: saving || !dirty ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </>
  )
}
