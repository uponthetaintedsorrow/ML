"""
api.py - API HTTP de MUSICA EPICA.

Expone el sistema de recomendación a la aplicación React:

    GET  /health              -> estado de la API y de MySQL
    GET  /songs?search=texto  -> canciones que coinciden (MySQL)
    POST /recommend           -> recomendaciones reales (recomendador_app.py)

Usa el algoritmo de recomendador_app.py, que es una copia adaptada del
recomendador.py original. Ni main.py ni recomendador.py se modifican.

Arranque (desde la raíz del proyecto, con el .venv del proyecto):

    .venv/bin/python -m uvicorn api:app --app-dir backend --reload --port 8000
"""

from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import mysql.connector
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:  # uso como paquete (backend.api)
    from . import recomendador_app
    from .config import (
        API_HOST,
        API_PORT,
        CANTIDAD_MAXIMA,
        CANTIDAD_POR_DEFECTO,
        CORS_ORIGIN_REGEX,
        CORS_ORIGINS,
        LIMITE_BUSQUEDA,
        MYSQL_DATABASE,
        MYSQL_HOST,
        MYSQL_USER,
        get_connection,
    )
except ImportError:  # uso directo (uvicorn api:app --app-dir backend)
    import recomendador_app  # type: ignore[no-redef]
    from config import (  # type: ignore[no-redef]
        API_HOST,
        API_PORT,
        CANTIDAD_MAXIMA,
        CANTIDAD_POR_DEFECTO,
        CORS_ORIGIN_REGEX,
        CORS_ORIGINS,
        LIMITE_BUSQUEDA,
        MYSQL_DATABASE,
        MYSQL_HOST,
        MYSQL_USER,
        get_connection,
    )

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("musica_epica.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # El modelo se calcula en segundo plano: la API responde de inmediato y la
    # primera búsqueda/recomendación ya encuentra la caché lista.
    hilo = threading.Thread(target=_precargar, name="precarga-recomendador", daemon=True)
    hilo.start()
    yield


app = FastAPI(
    title="MUSICA EPICA API",
    version="1.0.0",
    description="Busqueda de canciones y recomendaciones por similitud del coseno.",
    lifespan=lifespan,
)

# Solo se permiten los origenes configurados en CORS_ORIGINS (nunca "*", porque
# permitiria que cualquier web llamase a la API). Si hay CORS_ORIGIN_REGEX, se
# aceptan ademas los origenes que la cumplan (util para dominios de Netlify).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def _precargar() -> None:
    try:
        recomendador = recomendador_app.get_recomendador()
        log.info("Recomendador listo con %s canciones de MySQL", recomendador.total_canciones)
    except Exception:  # noqa: BLE001 - se registra, la API sigue disponible
        log.exception("No se pudo precargar el recomendador: revisa la conexion con MySQL")


class RecommendRequest(BaseModel):
    cancion: str = Field(..., min_length=1, description="Titulo de la cancion seleccionada")
    cantidad: int = Field(CANTIDAD_POR_DEFECTO, ge=1, le=CANTIDAD_MAXIMA)
    id: int | None = Field(None, description="Id de MySQL; si se envia, tiene prioridad sobre el titulo")


@app.get("/health")
def health() -> dict:
    """Estado real: si la API ve MySQL y si el modelo ya esta cargado."""
    estado: dict = {
        "estado": "ok",
        "base_datos": {"host": MYSQL_HOST, "nombre": MYSQL_DATABASE, "usuario": MYSQL_USER},
        "recomendador_cargado": recomendador_app.está_listo(),
        "canciones": None,
    }
    try:
        conexion = get_connection()
        try:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM canciones")
                total = cursor.fetchone()
            estado["canciones"] = int(total[0]) if total else 0
            estado["base_datos"]["conectada"] = True
        finally:
            conexion.close()
    except mysql.connector.Error as error:
        estado["estado"] = "degradado"
        estado["base_datos"]["conectada"] = False
        estado["error"] = str(error)
    return estado


@app.get("/songs")
def songs(
    search: str = Query(..., min_length=1, description="Texto a buscar en titulo, artista o genero"),
    limit: int = Query(LIMITE_BUSQUEDA, ge=1, le=CANTIDAD_MAXIMA),
) -> dict:
    """Busca canciones en MySQL. La consulta va parametrizada."""
    try:
        resultados = recomendador_app.get_recomendador().buscar(search.strip(), limite=limit)
    except recomendador_app.ColumnasFaltantesError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except mysql.connector.Error as error:
        log.exception("MySQL no disponible en /songs")
        raise HTTPException(status_code=503, detail=f"No se pudo consultar MySQL: {error}") from error

    return {"results": resultados, "count": len(resultados), "search": search}


@app.post("/recommend")
def recommend(payload: RecommendRequest) -> dict:
    """Recomendaciones reales calculadas con cosine_similarity."""
    try:
        recomendaciones = recomendador_app.get_recomendador().recomendar(
            payload.cancion,
            cantidad=payload.cantidad,
            cancion_id=payload.id,
        )
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"La cancion '{payload.cancion}' no existe en la base de datos",
        ) from None
    except recomendador_app.ColumnasFaltantesError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except mysql.connector.Error as error:
        log.exception("MySQL no disponible en /recommend")
        raise HTTPException(status_code=503, detail=f"No se pudo consultar MySQL: {error}") from error

    return {
        "cancion": payload.cancion,
        "resultados": recomendaciones,
        "count": len(recomendaciones),
    }


# --- La aplicacion web tambien se sirve desde aqui -------------------------
# Si existe el build (npm run build), se sirve en la raiz de la API. Asi basta
# con arrancar la API para tener toda la aplicacion en http://127.0.0.1:8000,
# sin depender de un segundo servidor.
DIST = Path(__file__).resolve().parent.parent / "Front" / "dist"
if (DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="frontend")
    log.info("Aplicacion web servida en / (desde Front/dist)")
else:
    log.info("Front/dist no existe: solo se sirve la API. Usa 'npm run build' para incluir la web.")


if __name__ == "__main__":  # pragma: no cover - arranque directo
    import uvicorn

    uvicorn.run("api:app", host=API_HOST, port=API_PORT)
