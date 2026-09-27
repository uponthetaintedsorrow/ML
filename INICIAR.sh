#!/usr/bin/env bash
# =============================================================================
#  MUSICA EPICA - iniciador de un clic
# =============================================================================
#  Doble clic en este archivo (o ejecuta: bash INICIAR.sh) y levanta TODO:
#  la API Python (:8000) y el frontend (:5173). Se para con Ctrl+C.
#
#  Si solo quieres la API para abrir Front/index.html con "Open with Live
#  Server", ejecuta este mismo archivo con --solo-api:
#      bash INICIAR.sh --solo-api
# =============================================================================

set -e
cd "$(dirname "$0")"

echo ""
echo "  ███╗   ███╗██╗   ██╗███████╗██╗ ██████╗ █████╗"
echo "  ████╗ ████║██║   ██║██╔════╝██║██╔════╝██╔══██╗"
echo "  ██╔████╔██║██║   ██║█████╗  ██║██║     ███████║"
echo "  ██║╚██╔╝██║╚██╗ ██╔╝██╔══╝  ██║██║     ██╔══██║"
echo "  ██║ ╚═╝ ██║ ╚████╔╝ ███████╗██║╚██████╗██║  ██║"
echo "  ╚═╝     ╚═╝  ╚═══╝  ╚══════╝╚═╝ ╚═════╝╚═╝  ╚═╝"
echo "                    E P I C A"
echo ""

if [ ! -x ".venv/bin/python" ]; then
  echo "  [!] No existe el entorno virtual .venv"
  echo "      Créalo con:   python3 -m venv .venv"
  echo "      Instala con:  .venv/bin/python -m pip install -r backend/requirements.txt"
  echo ""
  read -r -p "  Pulsa Enter para salir..." _
  exit 1
fi

if [ ! -d "Front/node_modules" ]; then
  echo "  [*] Instalando dependencias del frontend (tarda un poco)..."
  npm install --prefix Front --no-audit --no-fund
fi

# El frontend se sirve desde la propia API si ya hay build; en desarrollo se
# usa Vite. Si no hay build, generamos uno para que http://127.0.0.1:8000
# muestre siempre la aplicacion completa.
if [ ! -f "Front/dist/index.html" ]; then
  echo "  [*] Generando el build de la aplicacion..."
  npm run build >/dev/null 2>&1 || echo "  [!] No se pudo generar el build; se usara Vite."
fi

echo "  [*] Arrancando MUSICA EPICA (API + frontend)..."
echo "      API:      http://127.0.0.1:8000"
echo "      Frontend: http://localhost:5173"
echo "      Ctrl+C para detener."
echo ""

exec npm run dev "$@"
