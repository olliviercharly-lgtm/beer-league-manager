import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim()

  if (!code) {
    return NextResponse.json({ valid: false })
  }

  const admin = createAdminClient()
  const { data: league } = await admin
    .from('leagues')
    .select('name')
    .eq('invite_code', code)
    .maybeSingle()

  if (!league) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, leagueName: league.name })
}
