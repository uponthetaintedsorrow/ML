import { useCallback, useRef } from 'react'
import { Headphones } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useRecommendations } from '../hooks/useRecommendations.js'
import { useSongSearch } from '../hooks/useSongSearch.js'
import { RecommendationList } from '../components/RecommendationList.jsx'
import { SearchBar } from '../components/SearchBar.jsx'
import { SearchResults } from '../components/SearchResults.jsx'
import { SelectedSong } from '../components/SelectedSong.jsx'

/**
 * Pantalla principal: buscador -> cancion seleccionada -> recomendaciones.
 * Los datos vienen de la API Python (src/services/api.js); esta pagina solo
 * compone la vista y conecta los estados.
 */
export function Home({ selectedSong, onSelectSong }) {
  const { t } = usePreferences()
  const searchInputRef = useRef(null)
  const { query, setQuery, clear, retry, results, status, error } = useSongSearch()
  const { status: recStatus, items, sourceSong, error: recError, run } = useRecommendations(selectedSong)

  const selectSong = useCallback(
    (song) => {
      onSelectSong(song)
      clear()
      searchInputRef.current?.blur()
    },
    [clear, onSelectSong],
  )

  return (
    <div className="page home">
      <section className="hero">
        <p className="hero__eyebrow">
          <Headphones size={15} aria-hidden="true" />
          {t('app.name')}
        </p>
        <h1 className="hero__title">{t('app.tagline')}</h1>

        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onClear={clear}
          status={status}
          inputRef={searchInputRef}
          autoFocus
        />
      </section>

      <SearchResults
        query={query}
        results={results}
        status={status}
        error={error}
        onSelect={selectSong}
        onRetry={retry}
      />

      <SelectedSong song={selectedSong} loading={recStatus === 'loading'} onRecommend={run} />

      {sourceSong && (
        <RecommendationList
          sourceSong={sourceSong}
          items={items}
          status={recStatus}
          error={recError}
          onSelect={onSelectSong}
          onRetry={run}
        />
      )}
    </div>
  )
}
