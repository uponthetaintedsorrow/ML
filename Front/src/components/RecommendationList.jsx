import { ListMusic } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { describeError } from '../services/api.js'
import { SongCard } from './SongCard.jsx'
import { StateMessage } from './StateMessage.jsx'

/**
 * Rejilla de recomendaciones que llegan de la API Python (cosine similarity
 * real sobre MySQL). Centraliza los estados para que la pagina principal solo
 * pase el estado que devuelve la capa de datos.
 */
export function RecommendationList({
  sourceSong,
  items = [],
  status,
  error,
  onSelect,
  onRetry,
}) {
  const { t, plural } = usePreferences()

  const errorText = status === 'error' ? describeError(error, t, { title: sourceSong?.title }) : null

  return (
    <section className="recommendations" aria-label={t('recommendations.title')}>
      <header className="recommendations__header">
        <h2 className="section-title">
          <ListMusic size={19} aria-hidden="true" />
          {t('recommendations.title')}
          {sourceSong && status !== 'idle' && (
            <span className="section-title__count">
              {t('recommendations.forSong', { title: sourceSong.title })}
            </span>
          )}
        </h2>
      </header>

      {status === 'loading' && (
        <StateMessage status="loading" compact title={t('states.loadingRecommendations')} />
      )}

      {status === 'error' && (
        <StateMessage
          status="error"
          title={errorText.title}
          description={errorText.description}
          hint={errorText.hint}
          onAction={onRetry}
        />
      )}

      {status === 'empty' && (
        <StateMessage
          status="empty"
          title={t('recommendations.empty')}
          description={t('recommendations.emptyHint')}
        />
      )}

      {status === 'ready' && (
        <>
          <p className="recommendations__summary">{plural('recommendations.basedOn', items.length)}</p>

          <ul className="recommendations__grid">
            {items.map((song) => (
              <li key={song.id} className="recommendations__item">
                <SongCard
                  song={song}
                  isSelected={sourceSong?.id === song.id}
                  onSelect={() => onSelect(song)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
