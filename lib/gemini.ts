import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Modèles essayés dans l'ordre : si le premier est saturé ou indisponible,
// on bascule sur le suivant au lieu d'échouer.
const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash']

const ATTEMPTS_PER_MODEL = 2
const ATTEMPT_TIMEOUT_MS = 25000
const TOTAL_BUDGET_MS = 50000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(cleaned)
}

function classify(err: unknown): 'skip_model' | 'retry' | 'fatal' {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase()
  if (message.includes('api key') || message.includes('api_key') || message.includes('permission')) return 'fatal'
  if (message.includes('404') || message.includes('not found') || message.includes('not supported')) return 'skip_model'
  return 'retry'
}

function friendlyError(err: unknown) {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase()
  if (message.includes('429') || message.includes('quota') || message.includes('too many requests') || message.includes('resource_exhausted')) {
    return "La rédaction est débordée (trop de demandes d'un coup). Réessaie dans une minute."
  }
  if (message.includes('api key') || message.includes('api_key') || message.includes('permission')) {
    return "Clé API Gemini invalide ou manquante : vérifie GEMINI_API_KEY dans Vercel."
  }
  return "La rédaction n'a pas répondu à temps. Réessaie dans quelques instants."
}

/**
 * Appelle Gemini et renvoie la réponse JSON parsée.
 * Réessaie automatiquement en cas de surcharge, de quota, de délai dépassé
 * ou de JSON mal formé, et bascule sur un autre modèle si besoin.
 */
export async function generateJson<T>(prompt: string, isValid: (data: T) => boolean): Promise<T> {
  const start = Date.now()
  let lastErr: unknown = null

  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    })

    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - start)
      if (remaining < 5000) throw new Error(friendlyError(lastErr ?? new Error('timeout')))

      try {
        const result = await withTimeout(model.generateContent(prompt), Math.min(ATTEMPT_TIMEOUT_MS, remaining))
        const data = parseJson(result.response.text()) as T
        if (!isValid(data)) throw new Error('réponse incomplète')
        return data
      } catch (err) {
        lastErr = err
        console.error(`[gemini] ${modelName} tentative ${attempt + 1} :`, err instanceof Error ? err.message : err)
        const kind = classify(err)
        if (kind === 'fatal') throw new Error(friendlyError(err))
        if (kind === 'skip_model') break
        await sleep(1000 * (attempt + 1))
      }
    }
  }

  throw new Error(friendlyError(lastErr))
}
