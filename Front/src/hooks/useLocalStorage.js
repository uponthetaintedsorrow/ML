import { useEffect, useState } from 'react'

/**
 * Estado sincronizado con localStorage.
 *
 * @param {string} key        clave de almacenamiento
 * @param {*} initialValue    valor por defecto
 * @param {(value: *) => boolean} [isValid]  descarta valores corruptos o de
 *        una versión anterior de la app y vuelve al valor por defecto
 *
 * Si el almacenamiento no esta disponible (modo privado, tests) funciona
 * igual, guardando solo en memoria.
 */
export function useLocalStorage(key, initialValue, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored === null) return initialValue
      const parsed = JSON.parse(stored)
      return isValid(parsed) ? parsed : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* almacenamiento no disponible: se mantiene el estado en memoria */
    }
  }, [key, value])

  return [value, setValue]
}
