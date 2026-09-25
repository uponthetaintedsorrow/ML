import mysql.connector
import pandas as pd

from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score

conexion = mysql.connector.connect(
    host="localhost",
    user="sam",
    password="1234",
    database="musica_epica"
)

consulta = "SELECT * FROM canciones"

df = pd.read_sql(consulta, conexion)

conexion.close()

print(df.head())
print()
print(df.info())

X = df[["duracion_segundos", "popularidad_artista"]]
y = df["likes"]

print("\nX:")
print(X)

print("\ny:")
print(y)

from sklearn.model_selection import train_test_split

X_entrenamiento, X_prueba, y_entrenamiento, y_prueba = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("\nDatos de entrenamiento:")
print(X_entrenamiento)

print("\nDatos de prueba:")
print(X_prueba)

from sklearn.linear_model import LinearRegression

modelo = LinearRegression()

from sklearn.metrics import mean_absolute_error

modelo.fit(X_entrenamiento, y_entrenamiento)

print("\nCoeficientes:")
print(modelo.coef_)

print("\nIntercepto:")
print(modelo.intercept_)

print("\nModelo entrenado.")

predicciones = modelo.predict(X_prueba)

print("\nPredicciones:")
print(predicciones)

error = mean_absolute_error(y_prueba, predicciones)

print("\nError del modelo:")
print(error)

modelo.predict(X_prueba)

from sklearn.metrics import mean_absolute_error, r2_score

r2 = r2_score(y_prueba, predicciones)

print("\nR²:")
print(r2)

# Validación cruzada de 5 partes

cv = KFold(n_splits=5, shuffle=True, random_state=42)

r2_scores = cross_val_score(
    modelo,
    X,
    y,
    cv=cv,
    scoring="r2"
)

mae_scores = -cross_val_score(
    modelo,
    X,
    y,
    cv=cv,
    scoring="neg_mean_absolute_error"
)

print("\nR² de cada fold:")
print(r2_scores)

print("\nR² promedio:")
print(r2_scores.mean())

print("\nMAE de cada fold:")
print(mae_scores)

print("\nMAE promedio:")
print(mae_scores.mean())
