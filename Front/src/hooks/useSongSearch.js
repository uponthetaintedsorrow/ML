import { useCallback, useEffect, useRef, useState } from 'react'
import { searchSongs } from '../services/api.js'
import { normalizeText } from '../utils/color.js'

const DEBOUNCE_MS = 220

const IDLE = { term: '', status: 'idle', results: [], error: null }

/**
 * Estado de la busqueda: consulta, resultados y fase actual.
 * Los estados ('idle' | 'loading' | 'ready' | 'empty' | 'error') son los
 * mismos que usara la API real, por lo que la interfaz no cambia al conectar.
 */
export function useSongSearch() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState(IDLE)
  // El contador permite reintentar la misma consulta sin tocar el texto.
  const [attempt, setAttempt] = useState(0)
  const requestId = useRef(0)

  const hasTerm = Boolean(normalizeText(query))
  // Mientras la respuesta no corresponde a la consulta actual, hay carga.
  const isPending = hasTerm && state.term !== query

  useEffect(() => {
    if (!normalizeText(query)) return undefined

    const currentRequest = requestId.current + 1
    requestId.current = currentRequest

    const timer = setTimeout(async () => {
      try {
        const found = await searchSongs(query)
        // Ignora respuestas de peticiones anteriores (evita saltos de lista).
        if (requestId.current !== currentRequest) return
        setState({ term: query, status: found.length ? 'ready' : 'empty', results: found, error: null })
      } catch (error) {
        if (requestId.current !== currentRequest) return
        setState({ term: query, status: 'error', results: [], error })
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, attempt])

  const clear = useCallback(() => {
    requestId.current += 1
    setQuery('')
    setState(IDLE)
  }, [])

  // Reintenta la misma consulta: se marca el estado como pendiente para que
  // aparezca la carga y vuelva a pegarse a la API (sin tocar el texto).
  const retry = useCallback(() => {
    requestId.current += 1
    setState(IDLE)
    setAttempt((value) => value + 1)
  }, [])

  if (!hasTerm) return { query, setQuery, clear, retry, results: [], status: 'idle', error: null }

  return {
    query,
    setQuery,
    clear,
    retry,
    results: isPending ? [] : state.results,
    status: isPending ? 'loading' : state.status,
    error: isPending ? null : state.error,
  }
}
