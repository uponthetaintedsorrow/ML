import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

/**
 * Barra de busqueda de canciones. Solo gestiona el texto: los resultados
 * y los estados de carga los resuelve useSongSearch.
 */
export function SearchBar({ query, onQueryChange, onClear, status, autoFocus = false, inputRef }) {
  const { t } = usePreferences()
  const innerRef = useRef(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (autoFocus) innerRef.current?.focus()
  }, [autoFocus])

  const isLoading = status === 'loading'

  return (
    <div className={`search${focused ? ' is-focused' : ''}`}>
      <Search className="search__icon" size={19} aria-hidden="true" />
      <label className="visually-hidden" htmlFor="song-search">
        {t('search.label')}
      </label>
      <input
        ref={(node) => {
          innerRef.current = node
          if (inputRef) inputRef.current = node
        }}
        id="song-search"
        className="search__input"
        type="search"
        value={query}
        autoComplete="off"
        spellCheck="false"
        placeholder={t('search.placeholder')}
        aria-describedby="song-search-hint"
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && query) {
            event.preventDefault()
            onClear()
          }
        }}
      />
      {isLoading && <span className="search__spinner" aria-hidden="true" />}
      {query && !isLoading && (
        <button type="button" className="search__clear" onClick={onClear} aria-label={t('search.clear')}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
      <p id="song-search-hint" className="search__hint">
        {t('search.hint')}
      </p>
    </div>
  )
}
