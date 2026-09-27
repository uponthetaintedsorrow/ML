import { Clock, Music2 } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { describeError } from '../services/api.js'
import { formatDuration } from '../utils/format.js'
import { Cover } from './Cover.jsx'
import { StateMessage } from './StateMessage.jsx'

/**
 * Lista de resultados de la busqueda contra la API.
 * Cada resultado es un boton: elegir uno es la accion principal de la pantalla.
 */
export function SearchResults({ query, results, status, error, onSelect, onRetry }) {
  const { t, plural } = usePreferences()

  if (status === 'idle' || !query) return null

  const errorText = status === 'error' ? describeError(error, t) : null

  return (
    <section className="results" aria-label={t('search.resultsTitle')}>
      <header className="results__header">
        <h2 className="section-title">
          {t('search.resultsTitle')}
          {status === 'ready' && (
            <span className="section-title__count">{plural('search.resultsCount', results.length)}</span>
          )}
        </h2>
      </header>

      {status === 'loading' && <StateMessage status="loading" compact title={t('states.loading')} />}

      {status === 'error' && (
        <StateMessage
          status="error"
          compact
          title={errorText.title}
          description={errorText.description}
          hint={errorText.hint}
          onAction={onRetry}
        />
      )}

      {status === 'empty' && (
        <StateMessage
          status="empty"
          compact
          title={t('search.noResults', { query })}
          description={t('search.noResultsHint')}
        />
      )}

      {status === 'ready' && (
        <ul className="results__list" aria-label={t('search.resultsTitle')}>
          {results.map((song) => (
            <li key={song.id}>
              <button type="button" className="result" onClick={() => onSelect(song)}>
                <Cover song={song} size="sm" />
                <span className="result__body">
                  <span className="result__title">{song.title}</span>
                  <span className="result__artist">{song.artist}</span>
                </span>
                <span className="result__meta">
                  <span className="chip chip--genre">
                    <Music2 size={12} aria-hidden="true" />
                    {song.genre}
                  </span>
                  <span className="result__duration">
                    <Clock size={12} aria-hidden="true" />
                    {formatDuration(song.duration)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
