"""
Configuracion del backend de MUSICA EPICA.

Los valores se leen de variables de entorno y, si existe, del archivo
backend/.env (misma carpeta). Las credenciales de MySQL viven SOLO aqui:
nunca se envían al frontend.

Valores por defecto (los mismos que usa el recomendador original) para que la
API arranque sin configuración; en cuanto exista backend/.env, ese archivo
tiene prioridad.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import mysql.connector

BASE_DIR = Path(__file__).resolve().parent


def _cargar_env(path: Path = BASE_DIR / ".env") -> None:
    """Lee un .env sencillo (KEY=valor) sin dependencias externas."""
    if not path.exists():
        return
    for linea in path.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        clave = clave.strip()
        valor = valor.strip().strip('"').strip("'")
        os.environ.setdefault(clave, valor)


_cargar_env()


def _int(nombre: str, por_defecto: int) -> int:
    try:
        return int(os.environ.get(nombre, por_defecto))
    except (TypeError, ValueError):
        return por_defecto


def _float(nombre: str, por_defecto: float) -> float:
    try:
        return float(os.environ.get(nombre, por_defecto))
    except (TypeError, ValueError):
        return por_defecto


def _lista(nombre: str, por_defecto: str) -> list[str]:
    bruto = os.environ.get(nombre, por_defecto)
    return [valor.strip() for valor in bruto.split(",") if valor.strip()]


# --- MySQL -----------------------------------------------------------------
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = _int("MYSQL_PORT", 3306)
MYSQL_USER = os.environ.get("MYSQL_USER", "sam")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "1234")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "musica_epica")

# Identificador de la tabla. Se valida porque no puede ir parametrizado en SQL.
_TABLA = os.environ.get("TABLA_CANCIONES", "canciones")
if not re.fullmatch(r"[A-Za-z0-9_]+", _TABLA):
    raise ValueError(f"TABLA_CANCIONES no es un identificador valido: {_TABLA!r}")
TABLA_CANCIONES = _TABLA

# --- Algoritmo (mismos valores que recomendador.py) ------------------------
SIMILITUD_MINIMA = _float("SIMILITUD_MINIMA", 0.30)
CANTIDAD_POR_DEFECTO = _int("CANTIDAD_POR_DEFECTO", 5)

# --- API -------------------------------------------------------------------
API_HOST = os.environ.get("API_HOST", "127.0.0.1")
API_PORT = _int("API_PORT", 8000)

# Orígenes permitidos para el frontend en desarrollo (no se usa "*").
CORS_ORIGINS = _lista(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:5500,http://127.0.0.1:5500",
)

# Regex opcional de orígenes permitidos, para despliegues con dominios
# variables (Netlify y sus deploy previews). Vacio = desactivado.
# Ejemplo: CORS_ORIGIN_REGEX=https://.*\.netlify\.app
CORS_ORIGIN_REGEX = os.environ.get("CORS_ORIGIN_REGEX", "").strip() or None

LIMITE_BUSQUEDA = _int("LIMITE_BUSQUEDA", 20)
CANTIDAD_MAXIMA = _int("CANTIDAD_MAXIMA", 20)


def get_connection():
    """Abre una conexión nueva a MySQL (el llamador la cierra)."""
    return mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
    )
