'use client'

type ShareButtonProps = {
  title: string
  path: string
  excerpt?: string
}

export default function ShareButton({ title, path, excerpt }: ShareButtonProps) {
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

    const text = encodeURIComponent(`${title}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <button onClick={handleShare} className="blm-pill" style={{ cursor: 'pointer' }}>
      📤 Partager
    </button>
  )
}
