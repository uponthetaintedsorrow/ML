import { Clock, Music2, Sparkles } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { formatDuration } from '../utils/format.js'
import { Cover } from './Cover.jsx'

/**
 * Tarjeta de cancion reutilizable: portada, titulo, artista, genero,
 * duracion y, si existe, la puntuacion de similitud que envie la API.
 *
 * @param {{ song: object, isSelected?: boolean, onSelect?: () => void }} props
 */
export function SongCard({ song, isSelected = false, onSelect }) {
  const { t } = usePreferences()
  const hasScore = typeof song.similarity === 'number'
  const percent = hasScore ? Math.round(song.similarity * 100) : null

  return (
    <article className={`song-card${isSelected ? ' is-selected' : ''}`}>
      <div className="song-card__art">
        <Cover song={song} size="lg" />
        {hasScore && (
          <span className="song-card__score" title={t('recommendations.similarityFromApi')}>
            <Sparkles size={12} aria-hidden="true" />
            {percent}%
          </span>
        )}
        {isSelected && <span className="song-card__badge">{t('recommendations.current')}</span>}
      </div>

      <div className="song-card__body">
        <h3 className="song-card__title" title={song.title}>
          {song.title}
        </h3>
        <p className="song-card__artist" title={song.artist}>
          {song.artist}
        </p>

        <div className="song-card__meta">
          <span className="chip chip--genre">
            <Music2 size={12} aria-hidden="true" />
            {song.genre}
          </span>
          <span className="song-card__duration">
            <Clock size={12} aria-hidden="true" />
            {formatDuration(song.duration)}
          </span>
        </div>

        {hasScore && (
          <div className="song-card__similarity">
            <div className="similarity">
              <span className="similarity__track" aria-hidden="true">
                <span className="similarity__fill" style={{ width: `${percent}%` }} />
              </span>
              <span className="similarity__label">
                {t('recommendations.similarity')}: {percent}%
              </span>
            </div>
          </div>
        )}

        {onSelect && (
          <button type="button" className="btn btn--secondary song-card__action" onClick={onSelect}>
            <Sparkles size={15} aria-hidden="true" />
            {t('recommendations.useSong')}
          </button>
        )}
      </div>
    </article>
  )
}
