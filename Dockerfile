# Imagen para desplegar la API de MUSICA EPICA en cualquier servicio
# con soporte de Docker (Render, Railway, Fly.io, VPS, etc.).
#
# Incluye el frontend ya construido, de forma que la API sirve la web
# completa en el mismo dominio (http://localhost:8000 aqui) y no hay problemas
# de CORS entre el frontend y la API.
#
# Construccion y ejecucion local:
#   docker build -t musica-epica .
#   docker run --env-file backend/.env -p 8000:8000 musica-epica
#
# Nota: el contenedor necesita que MySQL sea accesible desde el servidor
# donde se despliegue (ver README.md -> "Publicar la API").

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    API_HOST=0.0.0.0 \
    PORT=8000

WORKDIR /app

# Primero las dependencias, para aprovechar la cache de Docker.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Codigo de la API.
COPY backend ./backend

# Frontend ya construido (opcional: si no existe, la API sirve solo la API).
COPY Front/dist ./Front/dist

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn api:app --app-dir backend --host ${API_HOST} --port ${PORT}"]
