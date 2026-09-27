import { useCallback, useEffect, useState } from 'react'
import { getRecommendations } from '../services/api.js'

const IDLE = { status: 'idle', items: [], error: null, sourceSong: null }

/**
 * Estado de las recomendaciones de una cancion.
 *
 * No se pide nada hasta que el usuario pulsa "Recomendar" (run). Los estados
 * 'idle' | 'loading' | 'ready' | 'empty' | 'error' son los de la API real.
 *
 * `request.token` es un contador global que NUNCA se reinicia: asi una
 * peticion para una cancion nueva no se confunde con el resultado guardado de
 * la anterior (si se reiniciara, se mostrarian tarjetas de otra cancion).
 */
export function useRecommendations(song) {
  const [request, setRequest] = useState(null)
  const [result, setResult] = useState({ token: 0, ...IDLE })

  const run = useCallback(() => {
    if (!song) return
    setRequest((current) => ({ id: song.id, token: (current?.token ?? 0) + 1 }))
  }, [song])

  // Solo hay resultados activos si la peticion corresponde a la cancion actual.
  const active = Boolean(song) && request?.id === song.id
  const isPending = active && result.token !== request.token

  useEffect(() => {
    if (!isPending) return undefined

    let subscribed = true
    const { token } = request

    getRecommendations(song)
      .then((items) => {
        if (!subscribed) return
        setResult({
          token,
          status: items.length ? 'ready' : 'empty',
          items,
          error: null,
          sourceSong: song,
        })
      })
      .catch((error) => {
        if (!subscribed) return
        setResult({ token, status: 'error', items: [], error, sourceSong: song })
      })

    return () => {
      subscribed = false
    }
  }, [isPending, song, request])

  if (!active) return { ...IDLE, run, retry: run }
  if (isPending) return { status: 'loading', items: [], error: null, sourceSong: song, run, retry: run }

  return { ...result, run, retry: run }
}
