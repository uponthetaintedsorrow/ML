# MUSICA EPICA

Recomendador musical: frontend React + API Python + MySQL.

```text
ML/
├── main.py                 Entrenamiento del modelo (NO se usa, NO se toca)
├── recomendador.py         Recomendador de prueba ORIGINAL (NO se toca)
├── backend/                API para la aplicación (archivos nuevos)
│   ├── api.py              FastAPI: /songs, /recommend, /health, /auth/*
│   ├── auth.py             Cuentas, contraseñas cifradas y sesiones
│   ├── recomendador_app.py COPIA ADAPTADA del recomendador original
│   ├── config.py           Configuración y conexión MySQL
│   ├── requirements.txt
│   └── .env.example
├── Front/                  Frontend React (Vite)
│   ├── index.html          Build autónomo (se abre en el navegador)
│   ├── dev.html            Entrada para Vite
│   └── src/                Código fuente
├── package.json            Atajos para arrancar el frontend
├── netlify.toml            Despliegue del frontend
├── render.yaml             Despliegue de la API en Render
├── Dockerfile              Imagen de la API (+ frontend)
├── scripts/
└── README.md
```

## Puesta en marcha (los dos lados con un solo comando)

```bash
cd ~/Documentos/ML
npm run dev
```

Eso arranca **la API Python (:8000) y el frontend (:5173) a la vez** y los
detiene con un único Ctrl+C. Es la forma recomendada: con la API apagada la
aplicación no puede buscar ni recomendar.

```
[listo] API disponible en http://127.0.0.1:8000
[listo] Frontend: http://localhost:5173   |   API: http://127.0.0.1:8000
```

Después abre <http://localhost:5173>.

Si ya tienes la API arrancada, `npm run dev` la reutiliza en lugar de lanzar
una segunda.

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | API + frontend (lo normal). |
| `npm run api` | Solo la API Python, en primer plano. |
| `npm run dev:front` | Solo el frontend (Vite). |
| `npm run build` | Regenera `Front/dist/` y `Front/index.html`. |
| `npm run preview` | Sirve `Front/dist/`. |
| `npm run lint` | Análisis del frontend. |

Funcionan igual desde `Front/`:

```bash
cd ~/Documentos/ML/Front
npm run dev        # API + frontend
npm run api        # solo la API
```

### Si usas "Open with Live Server"

Para abrir `Front/index.html` desde el IDE (puerto 5500) la API también tiene
que estar en marcha. Tienes dos opciones:

* `npm run dev` (deja la API levantada) y luego abre el archivo con Live Server, o
* `npm run api` en otra terminal y abre el archivo.

La propia aplicación te avisa si la API no responde y te dice qué comando
ejecutar.

### Arrancar la API a mano

```bash
cd ~/Documentos/ML
source .venv/bin/activate
python -m pip install -r backend/requirements.txt   # solo la primera vez
python -m uvicorn api:app --app-dir backend --host 127.0.0.1 --port 8000
```

Comprobación rápida:

```bash
curl http://127.0.0.1:8000/health
# {"estado":"ok","base_datos":{...,"conectada":true},"recomendador_cargado":true,"canciones":40}
```

Documentación interactiva de la API: <http://127.0.0.1:8000/docs>

### Configuración

La URL de la API se cambia con `VITE_API_URL` en `Front/.env` (por defecto
`http://localhost:8000`). En Ajustes → Datos ves la URL configurada y puedes
pulsar **Comprobar conexión** para saber si la API y MySQL responden.

## Cómo funciona

```text
Usuario escribe -> React hace GET /songs?search=...        (api.py -> MySQL)
Usuario selecciona y pulsa Recomendar
                -> React hace POST /recommend {cancion, id, cantidad}
                -> api.py llama a recomendador_app.recomendar()
                -> recomendador_app usa cosine_similarity sobre MySQL
                -> la API devuelve JSON con titulo, artista, genero, similitud
                -> React pinta las tarjetas
```

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado real de la API y de MySQL, y nº de canciones. |
| GET | `/songs?search=<texto>&limit=<n>` | Busca por título, artista o género (SQL parametrizado). |
| POST | `/recommend` | Body: `{"cancion": "This Hurts", "id": 4, "cantidad": 5}`. Devuelve las recomendaciones con su `similitud` real. |

Ejemplos:

```bash
curl "http://127.0.0.1:8000/songs?search=This"

curl -X POST http://127.0.0.1:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{"cancion":"This Hurts","cantidad":5}'
```

## Sobre el recomendador

* `recomendador.py` es el script de prueba **original**: se conserva intacto y
  se puede seguir ejecutando por separado (`python recomendador.py`).
* `backend/recomendador_app.py` es la **copia adaptada** que usa la API:
  mismas características, mismos pesos, mismo `StandardScaler` +
  `MultiLabelBinarizer` y mismo `cosine_similarity`, con el mismo umbral
  (`SIMILITUD_MINIMA`, 0.30). Lo único que cambia es que **devuelve datos** en
  lugar de imprimir, y cachea el modelo para no recalcularlo.
* `main.py` no se usa en la aplicación y no se ha modificado.

## Configuración

Las credenciales de MySQL viven **solo en Python** (`backend/.env`, que no se
sube al repositorio; ver `backend/.env.example`). El frontend nunca se conecta
a MySQL: solo llama a la API por HTTP, con CORS limitado a los orígenes
locales del frontend (`CORS_ORIGINS`).

| Variable | Dónde | Por defecto |
| --- | --- | --- |
| `VITE_API_URL` | `Front/.env` | `http://localhost:8000` |
| `VITE_RECOMMENDATION_COUNT` | `Front/.env` | `5` |
| `MYSQL_HOST` / `MYSQL_PORT` | `backend/.env` | `localhost` / `3306` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `backend/.env` | `sam` / `1234` |
| `MYSQL_DATABASE` | `backend/.env` | `musica_epica` |
| `SIMILITUD_MINIMA` | `backend/.env` | `0.30` |
| `CORS_ORIGINS` | `backend/.env` | `http://localhost:5173,http://127.0.0.1:5173` |
| `CORS_ORIGIN_REGEX` | `backend/.env` | vacío (desactivado) |
| `FRONTEND_URL` | `backend/.env` | `http://localhost:5173` |
| `APPLE_*` | `backend/.env` | vacío (Apple inactivo) |

## Despliegue del frontend (Netlify)

`netlify.toml` ya viene con la configuración correcta:

```toml
[build]
  command = "npm run build"
  publish = "Front/dist"

[build.environment]
  NODE_VERSION = "22"
```

El build se ejecuta desde la **raíz** del repositorio. `npm run build` instala
las dependencias de `Front/` si faltan y genera `Front/dist/`, que es la
carpeta que Netlify publica (no `dist/`).

Si lo configuras desde la UI en lugar del archivo:
**Site configuration → Build & deploy → Build settings → Publish directory**
→ `Front/dist`.

### Dos cosas que hay que definir en Netlify

1. **`VITE_API_URL`**: la URL de la API Python desplegada. Si no la defines,
   el bundle usa `http://localhost:8000` y el sitio no encontrará datos
   (la app lo avisa en pantalla). En Netlify:
   *Site configuration → Environment variables → `VITE_API_URL`*.
2. **CORS en la API**: el dominio publicado tiene que estar permitido. O lo
   añades a `CORS_ORIGINS` en `backend/.env`, o activas la regex (sirve para
   Netlify y sus deploy previews, que cambian de subdominio):

   ```bash
   CORS_ORIGIN_REGEX=https://.*\.netlify\.app
   ```

   Recarga la API después de cambiarla.

## Publicar la API (para que Netlify siempre conecte)

Motivo del fallo actual: la web esta publicada en Netlify, pero la API vive en
`localhost:8000` de tu ordenador. En el navegador de un visitante,
`http://localhost:8000` significa **su propio equipo**, no el tuyo, asi que
nunca hay conexion. No es un fallo de la app: es que la API no es publica.

La unica forma de que este "siempre conectada" es **publicar tambien la API**
en un servidor accesible desde internet. El repositorio ya esta preparado:

```bash
# Construir la imagen (incluye el frontend, que la API sirve en el mismo puerto)
docker build -t musica-epica .
docker run --env-file backend/.env -p 8000:8000 musica-epica
```

Despliegue en un servicio con Docker (Render, Railway, Fly.io, un VPS...):

1. Sube el repositorio y crea un servicio Docker.
2. variables de entorno: copia de `backend/.env.example` (MySQL y credenciales).
3. Puerto: el que indique el servicio (se lee de `PORT`).
4. Dominio final, por ejemplo `https://api.tusitio.com`.

Cuando la API este publicada:

```bash
# 1. En Netlify: Site configuration -> Environment variables
VITE_API_URL=https://api.tusitio.com
# 2. En backend/.env del servidor, permite el dominio del frontend
CORS_ORIGIN_REGEX=https://.*\.netlify\.app
# 3. Vuelve a desplegar en Netlify (VITE_API_URL se incrusta en el build)
```

### Requisito importante: MySQL

La API necesita leer la base de datos `musica_epica`. Si MySQL esta solo en
tu ordenador, la API remota tampoco podra verla. Opciones: base de datos
gestionada (Aiven, PlanetScale, RDS...), tu `localhost` abierto a traves de un
tunel, o ejecutar la API en el mismo servidor que la base de datos. **No se
puede inventar este paso**: sin acceso a MySQL la API no tendra datos.

## Autenticacion (acceso con correo y Apple)

**Ya funciona de verdad:**

| Metodo | Estado |
| --- | --- |
| Correo + contrasena | **Operativo**: registro, inicio de sesion, sesion persistente y cierre de sesion. |
| Apple Music | Implementado el flujo real de Apple; se activa al rellenar `APPLE_*` en `backend/.env`. |
| Google | Preparado en el backend; pendiente de credenciales. |
| Spotify | Preparado en el backend; pendiente de credenciales. |
| Modo demostracion | Operativo (acceso local sin cuenta). |

Como funciona el acceso por correo:

1. `POST /auth/registro` -> crea la cuenta y devuelve un token.
2. `POST /auth/login` -> valida y devuelve un token.
3. `GET /auth/me` -> devuelve la cuenta de la sesion (401 si el token caduca).
4. El token se guarda en el navegador y se envia como `Authorization: Bearer`.

Detalles importantes:

* Las **contrasenas se cifran** con PBKDF2-HMAC-SHA256 (260 000 iteraciones y
  salt aleatorio por usuario). No se guardan en claro.
* El token va firmado con HMAC-SHA256 y caduca a los 30 dias. Se guarda en
  `localStorage` porque el frontend (Netlify) y la API estan en dominios
  distintos; si se sirvieran desde el mismo dominio, lo correcto seria una
  cookie `httpOnly`.
* Las cuentas viven en `backend/usuarios.json`, que esta en `.gitignore`.
  **MySQL no se toca**: sigue siendo solo el catalogo de canciones.
* `GET /auth/providers` dice que metodos estan realmente configurados, y el
  frontend desactiva los que no (no se ofrecen botones que no funcionan).

Endpoints de autenticacion:

```text
GET  /auth/providers
POST /auth/registro      { email, password, displayName, username }
POST /auth/login          { email, password }
GET  /auth/me             (Authorization: Bearer <token>)
GET  /auth/apple/start    -> { url } de autorizacion de Apple
GET  /auth/apple/callback -> vuelve al frontend con #/?token=...
```

### Activar Apple Music

1. <https://developer.apple.com> -> Sign in with Apple (**requiere developer de
   pago: 99 USD/ano**).
2. Anade el redirect URI: `https://TU-DOMINIO/api/auth/apple/callback`
   (en local, `http://localhost:8000/auth/apple/callback`).
3. En `backend/.env`:

   ```bash
   APPLE_CLIENT_ID=
   APPLE_TEAM_ID=
   APPLE_KEY_ID=
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   APPLE_REDIRECT_URI=http://localhost:8000/auth/apple/callback
   FRONTEND_URL=http://localhost:5173
   ```

4. Reinicia la API: el boton de Apple se habilita solo (el frontend lo consulta
   en `/auth/providers`).

### Google y Spotify (para mas adelante)

El backend ya lee `GOOGLE_CLIENT_ID/SECRET` y `SPOTIFY_CLIENT_ID/SECRET`
(quedan en "Pendiente" en la interfaz). Cuando quieras activarlos, dime y
completo el canje de `code` por token igual que hice con Apple. Las
credenciales se crean en <https://console.cloud.google.com> y
<https://developer.spotify.com/dashboard>.

**Ningun secreto va en el frontend**: todo lo que se envia al navegador es
publico, por eso viven solo en `backend/.env`.

## Base de datos

No se ha modificado nada: ni estructura, ni datos. La API solo **lee** la tabla
`canciones` (40 filas) con las columnas que ya usaba el recomendador original
(`titulo`, `artista`, `genero`, `duracion_segundos`, `popularidad_artista`,
`año_lanzamiento`, `popularidad_cancion`, `danceability`, `tempo`, `energy`,
`valencia`, `loudness`). Si algún día falta una, la API lo dice explícitamente
en lugar de inventar valores.

## Si algo falla

* **"No se pudo conectar con la API"**: la API no está arrancada. Solución
  rápida: `npm run dev` (levanta API + frontend) o `npm run api` en otra
  terminal. Comprobación: `curl http://127.0.0.1:8000/health`.
* **"La base de datos no está disponible"**: MySQL no acepta la conexión.
  Verifica que el servicio esté activo y las credenciales de `backend/.env`.
* **Error de CORS en el navegador**: añade el origen del frontend a
  `CORS_ORIGINS` en `backend/.env` y reinicia la API.
* **"Canción no encontrada"**: el título no existe en `canciones` (la API
  responde 404).
* **Abrir el frontend**: `Front/index.html` es un build autónomo (doble clic o
  *Open with Live Server*). Si has cambiado `src/`, regenéralo con
  `npm run build` o usa `npm run dev`.
