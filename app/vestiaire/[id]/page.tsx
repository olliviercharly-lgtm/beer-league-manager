'use client'

import { Suspense, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

function RedirectContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerId = params.id as string

  useEffect(() => {
    const edit = searchParams.get('edit') === '1' ? '&edit=1' : ''
    router.replace(`/vestiaire?player=${playerId}${edit}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  return null
}

export default function VestiaireIdRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  )
}
