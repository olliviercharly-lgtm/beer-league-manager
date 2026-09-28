import { createClient } from '@/lib/supabase/server'
import NavBar from '@/app/components/NavBar'
import ShareButton from '@/app/components/ShareButton'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const THEMES: Record<string, string> = {
  resume_match: 'Résumé de match',
  rumeur_transfert: 'Rumeur de transfert',
  interview: 'Interview joueur',
}

async function getArticle(id: string) {
  const supabase = await createClient()
  const { data: article } = await supabase
    .from('articles')
    .select('id, theme, title, body, author_id, created_at')
    .eq('id', id)
    .single()

  if (!article) return null

  const { data: author } = await supabase
    .from('players')
    .select('first_name, last_name')
    .eq('id', article.author_id)
    .single()

  return { article, authorName: author ? `${author.first_name} ${author.last_name}` : 'Inconnu' }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const data = await getArticle(id)
  if (!data) return { title: 'Article introuvable — La Gazette' }

  const description = data.article.body.split('\n').filter(Boolean)[0]?.slice(0, 160) ?? ''

  return {
    title: `${data.article.title} — La Gazette`,
    description,
    openGraph: { title: data.article.title, description, type: 'article' },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getArticle(id)
  if (!data) notFound()

  const { article, authorName } = data
  const lines = article.body.split('\n').filter(Boolean)

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <div className="blm-card">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{THEMES[article.theme] || article.theme}</div>
          <h1 style={{ marginBottom: 4 }}>{article.title}</h1>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Par {authorName} · {new Date(article.created_at).toLocaleDateString('fr-FR')}
          </div>
          {lines.map((para: string, i: number) => (
            <p key={i} style={{ marginBottom: 12, lineHeight: 1.5 }}>{para}</p>
          ))}
          <div style={{ marginTop: 16 }}>
            <ShareButton title={article.title} path={`/gazette/${article.id}`} excerpt={lines[0]} />
          </div>
        </div>
      </div>
    </div>
  )
}
