import { Clock, Music2, Sparkles } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { formatDuration } from '../utils/format.js'
import { Cover } from './Cover.jsx'

/**
 * Tarjeta de la cancion seleccionada, con la accion principal "Recomendar".
 * Cuando la cancion cambia, la accion se actualiza al instante.
 */
export function SelectedSong({ song, onRecommend, loading = false, disabled = false }) {
  const { t } = usePreferences()

  if (!song) {
    return (
      <section className="selected selected--empty card card--padded" aria-live="polite">
        <div className="selected__placeholder" aria-hidden="true">
          <Music2 size={26} />
        </div>
        <div>
          <h2 className="selected__placeholder-title">{t('selected.empty')}</h2>
          <p className="selected__placeholder-hint">{t('selected.emptyHint')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="selected card card--padded" aria-live="polite">
      <p className="selected__label">{t('selected.title')}</p>

      <div className="selected__content">
        <Cover song={song} size="lg" />

        <div className="selected__info">
          <h2 className="selected__title">{song.title}</h2>
          <p className="selected__artist">{song.artist}</p>

          <div className="selected__meta">
            <span className="chip chip--genre">
              <Music2 size={12} aria-hidden="true" />
              {song.genre}
            </span>
            <span className="chip">
              <Clock size={12} aria-hidden="true" />
              {formatDuration(song.duration)}
            </span>
            {song.year && <span className="chip chip--muted">{song.year}</span>}
          </div>

          <button
            type="button"
            className="btn btn--primary selected__action"
            onClick={onRecommend}
            disabled={loading || disabled}
          >
            <Sparkles size={16} aria-hidden="true" />
            {loading ? t('selected.recommending') : t('selected.recommend')}
          </button>
        </div>
      </div>
    </section>
  )
}
