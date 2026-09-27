"""
recomendador_app.py
===================

COPIA ADAPTADA de ../recomendador.py para usarla desde la API.

- ../recomendador.py NO se modifica: sigue siendo el script de prueba original.
- La lógica matemática es la MISMA del original: mismas características,
  mismos pesos, mismo StandardScaler + MultiLabelBinarizer y mismo
  cosine_similarity, con el mismo umbral de similitud.
- Lo único que cambia es la interfaz:
    * no imprime nada (el resultado viaja en el JSON de la API),
    * no ejecuta las canciones de prueba al importarse,
    * devuelve datos (listas de diccionarios) en lugar de imprimir,
    * cachea el DataFrame y la matriz de similitud para no recalcularlos.
"""

from __future__ import annotations

import threading
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer, StandardScaler

try:  # uso como paquete (backend.api)
    from .config import (
        CANTIDAD_POR_DEFECTO,
        LIMITE_BUSQUEDA,
        SIMILITUD_MINIMA,
        TABLA_CANCIONES,
        get_connection,
    )
except ImportError:  # uso directo (uvicorn api:app --app-dir backend)
    from config import (  # type: ignore[no-redef]
        CANTIDAD_POR_DEFECTO,
        LIMITE_BUSQUEDA,
        SIMILITUD_MINIMA,
        TABLA_CANCIONES,
        get_connection,
    )

# Columnas que usa el algoritmo, en el mismo orden que el original.
COLUMNAS_NUMERICAS = [
    "duracion_segundos",
    "popularidad_artista",
    "año_lanzamiento",
    "popularidad_cancion",
    "danceability",
    "tempo",
    "energy",
    "valencia",
    "loudness",
]

# Pesos del original: duracion 0.5, popularidad_artista 1, año 0.5,
# popularidad_cancion 0.5, y 2 para danceability/tempo/energy/valencia/loudness.
PESOS = [0.5, 1, 0.5, 0.5, 2, 2, 2, 2, 2]
PESO_GENEROS = 3


class ColumnasFaltantesError(RuntimeError):
    """La tabla de MySQL no tiene las columnas que necesita el algoritmo."""


def normalizar(texto: Any) -> str:
    """Minúsculas y sin espacios sobrantes, como la comparación del original."""
    return str(texto or "").strip().lower()


def cargar_canciones() -> pd.DataFrame:
    """Lee la tabla de canciones de MySQL en un DataFrame."""
    conexion = get_connection()
    try:
        df = pd.read_sql(f"SELECT * FROM {TABLA_CANCIONES}", conexion)
    finally:
        conexion.close()

    faltantes = [c for c in COLUMNAS_NUMERICAS + ["titulo", "artista", "genero"] if c not in df.columns]
    if faltantes:
        raise ColumnasFaltantesError(
            f"La tabla '{TABLA_CANCIONES}' no tiene estas columnas: {', '.join(faltantes)}"
        )
    return df


class Recomendador:
    """
    Envoltorio del algoritmo original.

    Reproduce exactamente los calculos de recomendador.py:
    escala las columnas numericas con StandardScaler, codifica los generos
    con MultiLabelBinarizer, concatena ambos bloques, aplica los pesos y
    calcula la matriz de similitud del coseno.
    """

    def __init__(self, df: pd.DataFrame) -> None:
        self.df = df
        self.mlb = MultiLabelBinarizer()
        self.escalador = StandardScaler()
        self.similitud = self._calcular()

    # -- cálculo (idéntico al original) ------------------------------------
    def _calcular(self) -> np.ndarray:
        generos = self.df["genero"].fillna("").str.split(",")
        generos_codificados = self.mlb.fit_transform(generos)

        numericas = self.df[COLUMNAS_NUMERICAS].fillna(0)
        numericas_escaladas = self.escalador.fit_transform(numericas)

        caracteristicas = pd.concat(
            [
                pd.DataFrame(numericas_escaladas),
                pd.DataFrame(generos_codificados),
            ],
            axis=1,
        ).values

        # Pesos: los mismos del original, aplicados en el mismo orden.
        for indice, peso in enumerate(PESOS):
            caracteristicas[:, indice] *= peso
        caracteristicas[:, -len(generos_codificados[0]) :] *= PESO_GENEROS

        return cosine_similarity(caracteristicas)

    # -- datos -------------------------------------------------------------
    @property
    def total_canciones(self) -> int:
        return int(len(self.df))

    def fila_por_id(self, cancion_id: int) -> int | None:
        coincidencias = self.df.index[self.df["id"] == cancion_id]
        return int(coincidencias[0]) if len(coincidencias) else None

    def fila_por_titulo(self, titulo: str) -> int | None:
        coincidencias = self.df.index[self.df["titulo"].str.strip().str.lower() == normalizar(titulo)]
        return int(coincidencias[0]) if len(coincidencias) else None

    def cancion_en_base(self, *, cancion_id: int | None, titulo: str) -> tuple[int, str] | None:
        """
        Localiza la canción: por id si se envía (más preciso) y, si no,
        por título exacto como hace el original.
        """
        if cancion_id is not None:
            indice = self.fila_por_id(cancion_id)
            if indice is not None:
                return indice, str(self.df.iloc[indice]["titulo"])
        indice = self.fila_por_titulo(titulo)
        if indice is not None:
            return indice, str(self.df.iloc[indice]["titulo"])
        return None

    # -- API pública -------------------------------------------------------
    def buscar(self, texto: str, limite: int = LIMITE_BUSQUEDA) -> list[dict]:
        """
        Busca coincidencias por titulo, artista y genero.
        La consulta SQL va parametrizada (%s); aqui solo se prepara el criterio.
        """
        consulta = (
            f"SELECT * FROM {TABLA_CANCIONES} "
            "WHERE titulo LIKE %s OR artista LIKE %s OR genero LIKE %s "
            "ORDER BY (titulo = %s) DESC, (titulo LIKE %s) DESC, titulo ASC "
            "LIMIT %s"
        )
        patron = f"%{texto}%"
        conexion = get_connection()
        try:
            parametros = (patron, patron, patron, texto, f"{texto}%", int(limite))
            df = pd.read_sql(consulta, conexion, params=parametros)
        finally:
            conexion.close()
        return [a_song_dict(fila) for fila in df.to_dict("records")]

    def recomendar(
        self,
        cancion: str,
        cantidad: int = CANTIDAD_POR_DEFECTO,
        *,
        cancion_id: int | None = None,
    ) -> list[dict]:
        """
        Devuelve las canciones similares, ordenadas por similitud descendente
        y con el mismo umbral que el original (>= SIMILITUD_MINIMA).
        Lanza KeyError si la canción no existe en la base de datos.
        """
        cantidad = max(1, int(cantidad))
        localizada = self.cancion_en_base(cancion_id=cancion_id, titulo=cancion)
        if localizada is None:
            raise KeyError(cancion)

        indice = localizada[0]
        similares = list(enumerate(self.similitud[indice]))
        similares.sort(key=lambda elemento: elemento[1], reverse=True)

        recomendaciones = [
            (indice_similar, puntuacion)
            for indice_similar, puntuacion in similares[1:]
            if puntuacion >= SIMILITUD_MINIMA
        ][:cantidad]

        resultados = []
        for indice_similar, puntuacion in recomendaciones:
            fila = self.df.iloc[indice_similar]
            resultados.append({**a_song_dict(fila), "similitud": round(float(puntuacion), 4)})
        return resultados


def a_song_dict(fila: dict) -> dict:
    """Normaliza una fila de MySQL al JSON que consume el frontend."""
    generos = [g.strip() for g in str(fila.get("genero") or "").split(",") if g.strip()]
    return {
        "id": int(fila["id"]) if fila.get("id") is not None else None,
        "titulo": str(fila.get("titulo") or ""),
        "artista": str(fila.get("artista") or ""),
        "genero": str(fila.get("genero") or ""),
        "generos": generos,
        "duracion_segundos": int(fila["duracion_segundos"]) if fila.get("duracion_segundos") is not None else None,
        "anio": int(fila["año_lanzamiento"]) if fila.get("año_lanzamiento") is not None else None,
        "popularidad_cancion": int(fila["popularidad_cancion"]) if fila.get("popularidad_cancion") is not None else None,
        "likes": int(fila["likes"]) if fila.get("likes") is not None else None,
    }


# --- caché de la instancia ---------------------------------------------------
_lock = threading.Lock()
_instancia: Recomendador | None = None


def get_recomendador() -> Recomendador:
    """Devuelve la instancia cacheada; la primera vez lee MySQL y calcula."""
    global _instancia
    if _instancia is None:
        with _lock:
            if _instancia is None:
                _instancia = Recomendador(cargar_canciones())
    return _instancia


def está_listo() -> bool:
    return _instancia is not None


def precargar() -> None:
    """Carga el modelo al arrancar la API (se llama en un hilo en segundo plano)."""
    get_recomendador()


def invalidar_cache() -> None:
    """Fuerza la recarga en la siguiente petición (datos o pesos cambiados)."""
    global _instancia
    with _lock:
        _instancia = None
