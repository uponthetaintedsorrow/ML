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
import os
import threading
import urllib.parse
from contextlib import asynccontextmanager
from pathlib import Path

import mysql.connector
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:  # uso como paquete (backend.api)
    from . import auth, recomendador_app
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
    import auth  # type: ignore[no-redef]
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

# A donde vuelve el navegador tras un inicio de sesion con Apple.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")

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


@app.get("/auth/providers")
def proveedores() -> dict:
    """
    Que metodos de acceso estan realmente disponibles ahora mismo.
    El frontend usa esto para no ofrecer botones que no funcionan.
    """
    return {
        "email": True,  # correo + contrasena, siempre disponible
        "apple": auth.apple_configurado(),
        "google": bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET")),
        "spotify": bool(os.environ.get("SPOTIFY_CLIENT_ID") and os.environ.get("SPOTIFY_CLIENT_SECRET")),
    }


class RegistroRequest(BaseModel):
    email: str
    password: str
    displayName: str = ""
    username: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


def _token_de_cabecera(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        return ""
    return authorization.split(" ", 1)[1].strip()


@app.post("/auth/registro")
def registro(payload: RegistroRequest) -> dict:
    """Crea una cuenta con correo y contrasena y devuelve la sesion."""
    try:
        return auth.registrar(payload.email, payload.password, payload.displayName, payload.username)
    except auth.AuthError as error:
        raise HTTPException(status_code=400, detail=error.mensaje) from error


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict:
    """Inicia sesion con correo y contrasena."""
    try:
        return auth.iniciar_sesion(payload.email, payload.password)
    except auth.AuthError as error:
        raise HTTPException(status_code=401, detail=error.mensaje) from error


@app.get("/auth/me")
def perfil(authorization: str | None = Header(default=None)) -> dict:
    """Devuelve la cuenta de la sesion actual (o 401 si no hay)."""
    correo = auth.leer_token(_token_de_cabecera(authorization))
    if not correo:
        raise HTTPException(status_code=401, detail="Sesion no valida o caducada")
    usuario = auth.usuario_por_correo(correo)
    if not usuario:
        raise HTTPException(status_code=401, detail="La cuenta ya no existe")
    return {"usuario": usuario}


@app.get("/auth/apple/start")
def apple_start() -> dict:
    """Devuelve la URL de autorizacion de Sign in with Apple."""
    try:
        return {"url": auth.apple_authorization_url(FRONTEND_URL)}
    except auth.AuthError as error:
        raise HTTPException(status_code=503, detail=error.mensaje) from error


@app.get("/auth/apple/callback")
def apple_callback(code: str = "", state: str = "") -> RedirectResponse:
    """
    Callback de Apple: canjea el codigo por los datos del usuario, crea (o
    reutiliza) la cuenta y devuelve al navegador a la web con un token de
    un solo uso en la URL.
    """
    try:
        resultado = auth.apple_callback(code, state)
    except auth.AuthError as error:
        destino = f"{FRONTEND_URL}/#/?error={urllib.parse.quote(error.codigo)}"
        return RedirectResponse(destino, status_code=302)

    destino = resultado.get("destino") or FRONTEND_URL
    return RedirectResponse(f"{destino}/#/?token={resultado['token']}", status_code=302)


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
