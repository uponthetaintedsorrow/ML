import mysql.connector
import pandas as pd
from sklearn.preprocessing import StandardScaler, MultiLabelBinarizer
from sklearn.compose import ColumnTransformer
from sklearn.metrics.pairwise import cosine_similarity


conexion = mysql.connector.connect(
    host="localhost",
    user="sam",
    password="1234",
    database="musica_epica"
)

consulta = "SELECT * FROM canciones"

df = pd.read_sql(consulta, conexion)

conexion.close()

caracteristicas = df[
    ["duracion_segundos", "popularidad_artista", "año_lanzamiento", "genero", "popularidad_cancion", "danceability", "tempo", "energy", "valencia", "loudness"]
]

print("\nGÉNEROS:")
for genero in df["genero"]:
    print(genero)

from sklearn.preprocessing import MultiLabelBinarizer

generos = df["genero"].str.split(",")

mlb = MultiLabelBinarizer()

generos_codificados = mlb.fit_transform(generos)

numericas = df[
    ["duracion_segundos", "popularidad_artista", "año_lanzamiento", "popularidad_cancion", "danceability", "tempo", "energy", "valencia", "loudness"]
]

escalador = StandardScaler()

numericas_escaladas = escalador.fit_transform(numericas)

caracteristicas_escaladas = pd.concat(
    [
        pd.DataFrame(numericas_escaladas),
        pd.DataFrame(generos_codificados)
    ],
    axis=1
).values

# Pesos
caracteristicas_escaladas[:, 0] *= 0.5   # duración
caracteristicas_escaladas[:, 1] *= 1     # popularidad artista
caracteristicas_escaladas[:, 2] *= 0.5   # año
caracteristicas_escaladas[:, 3] *= 0.5   # popularidad canción
caracteristicas_escaladas[:, 4] *= 2     # danceability
caracteristicas_escaladas[:, 5] *= 2     # tempo
caracteristicas_escaladas[:, 6] *= 2     # energia
caracteristicas_escaladas[:, 7] *= 2     # valence
caracteristicas_escaladas[:, 8] *= 2     # loudness
cantidad_generos = generos_codificados.shape[1]

caracteristicas_escaladas[:, -cantidad_generos:] *= 3

similitud = cosine_similarity(caracteristicas_escaladas)


def recomendar(cancion, cantidad=5):

    resultado = df[
        df["titulo"].str.strip().str.lower() == cancion.strip().lower()
    ]

    if resultado.empty:
        print(f"❌ No encontré la canción: {cancion}")
        return

    indice = resultado.index[0]

    canciones_similares = list(enumerate(similitud[indice]))

    canciones_similares.sort(
        key=lambda x: x[1],
        reverse=True
    )

    recomendaciones = [
        (indice, puntuacion)
        for indice, puntuacion in canciones_similares[1:]
        if puntuacion >= 0.30
    ][:cantidad]

    for indice, puntuacion in recomendaciones:
        print(
            df.iloc[indice]["titulo"],
            "-",
            df.iloc[indice]["artista"],
            "| similitud:",
            round(puntuacion, 2)
        )


canciones_prueba = [
    "Duvet",
    "This Hurts",
    "KARMA",
    "Ma Chérie",
    "Good Luck, Babe!",
    "All You Wanna Do"
]

for cancion in canciones_prueba:
    print("\n" + "=" * 40)
    print("🎵", cancion)
    recomendar(cancion)