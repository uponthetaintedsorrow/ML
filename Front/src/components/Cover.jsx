import { Music4 } from 'lucide-react'
import { coverPalette } from '../utils/color.js'

/**
 * Portada de una cancion. El proyecto no incluye archivos de imagen, asi que
 * la portada se dibuja con la paleta del catalogo y, si no existe, con un
 * degradado estable derivado del titulo.
 * Si la API trajera una URL real, se prioriza sobre el degradado.
 */
export function Cover({ song, size = 'md', children }) {
  const palette = song?.cover
    ? {
        background: `linear-gradient(140deg, ${song.cover.from}, ${song.cover.to})`,
        accent: song.cover.accent,
      }
    : coverPalette(song?.title ?? '')

  return (
    <div
      className={`cover cover--${size}`}
      style={{ backgroundImage: palette.background, '--cover-accent': palette.accent }}
    >
      {song?.coverUrl ? (
        <img className="cover__image" src={song.coverUrl} alt="" aria-hidden="true" />
      ) : (
        <>
          <Music4 className="cover__icon" aria-hidden="true" />
          {size !== 'sm' && <span className="cover__label" aria-hidden="true">{song?.genre}</span>}
        </>
      )}
      {children}
    </div>
  )
}
