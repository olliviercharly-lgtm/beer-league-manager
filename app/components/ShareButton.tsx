'use client'

type ShareButtonProps = {
  title: string
  path: string
  excerpt?: string
  /** 'icon' (par défaut) = simple rond discret ; 'button' = pastille avec libellé, pour un appel à l'action principal */
  variant?: 'icon' | 'button'
  /** Libellé affiché quand variant="button" */
  label?: string
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="#fff">
      <path d="M16.004 4C9.377 4 4 9.373 4 16.001c0 2.145.573 4.244 1.66 6.084L4 28l6.086-1.6a12.02 12.02 0 0 0 5.918 1.585h.005c6.626 0 12.003-5.373 12.003-12.001C28.012 9.373 22.635 4 16.004 4zm5.79 16.966c-.243.685-1.42 1.31-1.96 1.36-.5.05-.97.24-3.27-.683-2.77-1.113-4.55-3.94-4.69-4.124-.14-.185-1.13-1.502-1.13-2.866s.72-2.032.977-2.31c.257-.28.56-.35.746-.35.187 0 .374.002.537.01.172.008.404-.065.632.483.235.564.795 1.945.865 2.087.07.14.117.305.023.49-.093.185-.14.3-.28.46-.14.163-.294.365-.42.49-.14.14-.286.29-.123.567.164.278.727 1.2 1.56 1.944 1.073.957 1.977 1.253 2.255 1.393.28.14.443.117.606-.07.164-.186.7-.815.888-1.094.187-.28.374-.233.63-.14.257.093 1.632.77 1.912.91.28.14.467.21.537.326.07.117.07.68-.173 1.365z"/>
    </svg>
  )
}

export default function ShareButton({ title, path, excerpt, variant = 'icon', label }: ShareButtonProps) {
  async function handleShare() {
    const url = `${window.location.origin}${path}`
    const shareData = { title, text: excerpt ?? title, url }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // annulé ou non supporté -> fallback WhatsApp
      }
    }

    const text = encodeURIComponent(`${excerpt ?? title}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleShare}
        aria-label={label ?? 'Partager sur WhatsApp'}
        title={label ?? 'Partager sur WhatsApp'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#25D366',
          color: '#fff',
          border: 'none',
          borderRadius: 20,
          padding: '9px 16px',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <WhatsAppIcon size={16} />
        {label ?? 'Partager'}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Partager sur WhatsApp"
      title="Partager sur WhatsApp"
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: 'none',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <WhatsAppIcon size={18} />
    </button>
  )
}
