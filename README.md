# MUSICA EPICA

Recomendador musical: frontend React + API Python + MySQL.

```text
ML/
├── main.py                 Entrenamiento del modelo (NO se usa, NO se toca)
├── recomendador.py         Recomendador de prueba ORIGINAL (NO se toca)
├── backend/                API para la aplicación (archivos nuevos)
│   ├── api.py              FastAPI: /songs, /recommend, /health
│   ├── recomendador_app.py COPIA ADAPTADA del recomendador original
│   ├── config.py           Configuración y conexión MySQL
│   ├── requirements.txt
│   └── .env.example
├── Front/                  Frontend React (Vite)
│   ├── index.html          Build autónomo (se abre en el navegador)
│   ├── dev.html            Entrada para Vite
│   └── src/                Código fuente
├── package.json            Atajos para arrancar el frontend
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
