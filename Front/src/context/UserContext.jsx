import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const UserContext = createContext(null)

/**
 * Datos del usuario.
 *
 * displayName  -> nombre visible, puede repetirse y llevar espacios.
 * username     -> identificador unico de la cuenta (sin "@", se muestra con "@").
 * profilePicture -> foto (data URL) o null.
 * bio / pronouns -> datos opcionales del perfil.
 *
 * displayName y username son cosas distintas a proposito: no se mezclan.
 */
const DEFAULT_USER = {
  displayName: 'Samantha',
  username: 'samantha',
  profilePicture: null,
  bio: '',
  pronouns: '',
  email: 'samantha@musicaepica.app',
  provider: 'demo',
  createdAt: '2024-11-03T10:00:00.000Z',
  isAuthenticated: true,
}

const MAX_PHOTO_BYTES = 1024 * 1024 // 1 MB: suficiente y evita localStorage enorme

/**
 * Normaliza la sesion guardada. Las sesiones anteriores usaban `name` y
 * `photo`; se migran al shape actual sin perder la foto ya elegida.
 */
function readUser(stored) {
  if (!stored) return null
  const { name, photo, ...actual } = stored
  return {
    ...DEFAULT_USER,
    ...actual,
    displayName: actual.displayName ?? name ?? DEFAULT_USER.displayName,
    profilePicture: actual.profilePicture ?? photo ?? null,
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'))
    reader.readAsDataURL(file)
  })
}

/**
 * Valida y lee una imagen sin guardarla todavia. Lo usa el editor de perfil
 * para previsualizar el cambio antes de pulsar "Guardar".
 * @returns {Promise<{ok: true, dataUrl: string} | {ok: false, error: string}>}
 */
export async function readPhotoFile(file) {
  if (!file) return { ok: false, error: 'NO_FILE' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'INVALID_TYPE' }
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: 'TOO_LARGE' }
  try {
    return { ok: true, dataUrl: await readFileAsDataUrl(file) }
  } catch {
    return { ok: false, error: 'FILE_READ_ERROR' }
  }
}

/**
 * Sesion del usuario. En esta version es local (localStorage): cuando exista
 * autenticacion real y un endpoint de perfil, este mismo contexto es el punto
 * unico a sustituir.
 */
export function UserProvider({ children }) {
  const [user, setUser] = useLocalStorage('me:user', null)

  const signInDemo = useCallback(() => {
    setUser({ ...DEFAULT_USER, isAuthenticated: true })
  }, [setUser])

  const signOut = useCallback(() => {
    setUser(null)
  }, [setUser])

  const updateProfile = useCallback(
    (changes) => {
      setUser((current) => (current ? { ...current, ...changes } : current))
    },
    [setUser],
  )

  /**
   * Guarda la foto de perfil. Al actualizar el estado, el avatar del header,
   * el del menu de perfil y el de esta vista se actualizan a la vez porque leen
   * los mismos datos.
   */
  const setPhoto = useCallback(
    async (file) => {
      const resultado = await readPhotoFile(file)
      if (!resultado.ok) return resultado
      updateProfile({ profilePicture: resultado.dataUrl })
      return { ok: true }
    },
    [updateProfile],
  )

  const removePhoto = useCallback(() => updateProfile({ profilePicture: null }), [updateProfile])

  const value = useMemo(
    () => ({
      user: readUser(user),
      isAuthenticated: Boolean(user),
      signInDemo,
      signOut,
      updateProfile,
      setPhoto,
      removePhoto,
    }),
    [user, signInDemo, signOut, updateProfile, setPhoto, removePhoto],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider')
  return context
}
