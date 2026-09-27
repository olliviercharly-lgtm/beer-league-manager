export function isRealAdmin(role: string | null | undefined) {
  return role === 'admin' || role === 'super_admin'
}

export function getPreviewPlayer(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('blm_view_role') === 'joueur'
  } catch {
    return false
  }
}

export function setPreviewPlayer(value: boolean) {
  try {
    window.localStorage.setItem('blm_view_role', value ? 'joueur' : 'admin')
  } catch {
    // ignore
  }
}

export function effectiveIsAdmin(role: string | null | undefined) {
  return isRealAdmin(role) && !getPreviewPlayer()
}
