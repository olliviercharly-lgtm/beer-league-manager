import type { ReactNode } from 'react'

// Affiche le gras (**texte**) et l'italique (*texte*) écrits par l'IA dans les articles,
// au lieu de montrer les astérisques bruts. Aucun HTML n'est injecté.
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\*\*([^*]+?)\*\*|\*([^*\n]+?)\*/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    if (match[1] !== undefined) nodes.push(<strong key={`b${i++}`}>{match[1]}</strong>)
    else nodes.push(<em key={`i${i++}`}>{match[2]}</em>)
    last = pattern.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

// Version texte brut (partage WhatsApp, aperçu de lien) : retire les astérisques de mise en forme.
export function stripFormatting(text: string): string {
  return text.replace(/\*\*([^*]+?)\*\*/g, '$1').replace(/\*([^*\n]+?)\*/g, '$1')
}
