# MUSICA EPICA - Frontend

Front-end en React (Vite) de la aplicación de recomendación musical.
Vive en `Front/` y **no toca** el backend: `../main.py` y `../recomendador.py`
se mantienen exactamente como están.

## Puesta en marcha

Hay dos formas de abrir la aplicación:

**1. Ver la aplicación (sin terminal)**

Abre **`Front/index.html`** en el navegador: doble clic o *Open with Live
Server* desde el IDE. Es un build autónomo (HTML + CSS + JS dentro del mismo
archivo) que no necesita Node, Vite ni servidor con transformaciones.

**2. Desarrollar (recarga en caliente)**

```bash
cd Front
npm install
npm run dev       # API Python (:8000) + frontend (:5173), un solo comando
npm run api       # solo la API
npm run build     # regenera dist/ y el index.html autónomo
npm run lint      # oxlint
npm run preview   # sirve dist/
```

`npm run dev` levanta también la API Python, porque la aplicación necesita las
recomendaciones reales de MySQL. Para usar *Open with Live Server* sobre
`index.html` (puerto 5500) la API debe estar en marcha: `npm run dev` o
`npm run api` en otra terminal.

Los mismos comandos existen en la raíz del proyecto. Ver `../README.md`.

Los datos vienen de la API Python (`backend/api.py`), que consulta MySQL y
calcula las recomendaciones con `recomendador_app.py`. No hay datos mock: si la
API no está en marcha, la aplicación lo dice y ofrece reintentar. La URL se
configura con `VITE_API_URL` en `.env` (ver `.env.example`). Detalles de
puesta en marcha de ambos lados: `../README.md`.

## Archivos generados (no editar a mano)

| Archivo | Qué es |
| --- | --- |
| `index.html` | Build autónomo. Lo regenera `npm run build` (`scripts/build-standalone.mjs` incrusta el CSS y el JS dentro del HTML). |
| `dev.html` | Entrada que usa Vite. El servidor de desarrollo la sirve en `/` y en `/dev.html`. |

El código editable está todo en `src/`.

## Estructura

```text
Front/
├── index.html                 build autónomo (se abre en el navegador)
├── dev.html                   entrada de Vite
├── scripts/
│   └── build-standalone.mjs   genera index.html incrustando el build
└── src/
    ├── main.jsx               punto de entrada (contextos + error boundary)
    ├── App.jsx                rutas, cabecera, cancion seleccionada
    ├── components/            Header, ProfileMenu, Avatar, Cover, Brand, BrandIcons,
    │                          SearchBar, SearchResults, SelectedSong, SongCard,
    │                          RecommendationList, ThemeSelector, LanguageSelector,
    │                          CustomThemeEditor, StateMessage, ErrorBoundary, Footer
    ├── pages/                 Home, Profile, Account, Settings, Login
    ├── context/               PreferencesContext (idiema/tema), UserContext (sesion)
    ├── hooks/                 useHashRoute, useSongSearch, useRecommendations,
    │                          useLocalStorage
    ├── services/              api.js (frontera de datos HTTP), config.js
    ├── translations/          es.js, en.js, index.js
    ├── themes/                tokens.css, dark.css, light.css, custom.css
    ├── styles/                global.css, layout.css, discover.css, pages.css
    └── utils/                 format.js, color.js
```

## Decisiones de diseño

* **Router por hash** (`useHashRoute`): evita añadir una dependencia de
  enrutado; el botón atrás y los enlaces `#/perfil` siguen funcionando.
* **Sin emojis en la interfaz**: todos los iconos son de `lucide-react`
  (las marcas Google/Spotify/Apple son SVG propios en `BrandIcons.jsx`).
* **Temas por variables CSS**: los componentes nunca escriben colores de tema.
  `dark.css`, `light.css` y `custom.css` definen `--color-*`; en el tema
  personalizado los colores elegidos se inyectan como variables inline en
  `<html>` y el resto se deriva con `color-mix()`.
* **Estados explícitos**: `idle | loading | ready | empty | error` en búsqueda
  y recomendaciones, iguales a los que devolverá la API real.
* **La canción seleccionada vive en `App`**: no se pierde al ir a Perfil,
  Tu cuenta o Ajustes y volver al buscador.
* **Internacionalización**: todo el texto sale de `translations/`, con
  interpolación `{nombre}` y plurales (`clave` / `clave_other`).

## Conexión con el backend

`src/services/api.js` es la única capa que hace peticiones HTTP. Los
componentes no cambian nunca: usan `searchSongs()`, `getRecommendations()` y
`checkApiHealth()`, que ya devuelven el shape que consume la interfaz
(`id`, `title`, `artist`, `genre`, `duration`, `year`, `popularity`,
`similarity`). El JSON snake_case de la API se traduce ahí, en un solo sitio.

Configuración (`.env`, una sola variable):

```text
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=20000
VITE_RECOMMENDATION_COUNT=5
```

### Estados de error

`ApiError` lleva un `code` estable y `describeError()` lo traduce al idioma
activo, de modo que la interfaz distingue los fallos reales:

| code | Cuándo | Texto en pantalla |
| --- | --- | --- |
| `NETWORK_ERROR` | la API no está arrancada | "No se pudo conectar con la API" + URL |
| `TIMEOUT` | la API tarda demasiado | "La API tardó demasiado" |
| `NOT_FOUND` | 404: la canción no está en MySQL | "Canción no encontrada" |
| `UNAVAILABLE` | 503: la API no puede leer MySQL | "La base de datos no está disponible" |
| `HTTP_ERROR` | cualquier otro 4xx/5xx | "La API no respondió correctamente" |

Además están los estados sin error: `loading` (búsqueda y recomendaciones) y
`empty` (búsqueda sin coincidencias, o canción sin similares por debajo del
umbral de similitud). Nada se simula: si el backend no responde, se muestra el
error.

## Perfil de usuario

Los datos viven en `src/context/UserContext.jsx` (y en `localStorage`, clave
`me:user`). El shape es este, y `displayName` y `username` **no se mezclan**:

```js
{
  displayName: 'Sam Rivers',   // nombre visible, puede repetirse y llevar espacios
  username: 'sam_rivers',      // identificador único, se guarda SIN '@'
  profilePicture: '',          // data URL de la foto, o null
  bio: '',
  pronouns: 'she/her',         // opcional
  email: '',
  provider: 'spotify',
  createdAt: '2024-11-03T10:00:00.000Z',
  isAuthenticated: true,
}
```

Las sesiones antiguas (que usaban `name` y `photo`) se migran solas al leerlas.

Experiencia:

* La **PFP es clicable**: abre un menú con "Cambiar foto" y, si hay foto,
  "Quitar foto". En escritorio el icono de cámara aparece al pasar el cursor;
  en táctil, como distintivo en la esquina.
* El **nombre para mostrar se edita en el sitio** (clic → input → Enter o ✔
  para guardar, Esc para cancelar). Al guardar, el header y el menú de perfil
  se actualizan al instante.
* **Editar perfil** abre un modal con foto, nombre, username, bio (máx. 160
  caracteres), pronombres y correo. Nada se aplica hasta pulsar *Guardar*.
* Username: se limpia al escribir (minúsculas, sin `@`, solo
  `a-z0-9_`, máx. 24) y se valida el formato en `src/services/profile.js`.

### Unicidad del username (pendiente de backend)

Desde React **no** se puede garantizar que un username no esté en uso por otra
cuenta, así que la interfaz no lo afirma: solo valida el formato y muestra la
pista "La unicidad se comprobará en el servidor". El punto exacto donde
enchufar la comprobación está documentado en `src/services/profile.js`:

```text
GET {VITE_API_URL}/profiles/username-available?username=sam_rivers
  -> { "available": true }
```

## Sesión de usuario

`UserContext` guarda la sesión en `localStorage` (`me:user`): nombre, correo,
método de acceso y foto (como data URL, máx. 1 MB). Al cambiar la foto se
actualiza el avatar del header y el del menú de perfil a la vez.

La pantalla de acceso es **interfaz solamente**: los botones de Google,
Spotify, Apple Music y correo no envían ni valida credenciales, solo informan
de que la integración está pendiente. El único flujo activo es "modo
demostración". Cuando exista autenticación real, se sustituye `signInDemo()`
en `src/context/UserContext.jsx` y el resto de la interfaz no cambia.

## Robustez

`components/ErrorBoundary.jsx` envuelve la aplicación: si un componente falla,
se muestra una pantalla de error en el idioma activo en lugar de una página en
blanco. Los estados de datos (`idle | loading | ready | empty | error`) se
gestionan en `src/hooks/`, no en el error boundary.
