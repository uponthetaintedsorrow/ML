"""
auth.py - Cuentas de usuario y acceso.

Implementacion real, sin dependencias de terceros para la parte de correo:
  - Contrasenas cifradas con PBKDF2-HMAC-SHA256 + salt aleatorio (hashlib).
  - Sesion con token firmado (HMAC-SHA256) y caducidad.
  - Cuentas guardadas en backend/usuarios.json (NO se toca la base de datos
    MySQL, que solo se usa para el catalogo de canciones).
  - "Sign in with Apple" implementado con el flujo real de Apple; queda
    inactivo hasta que se rellenen las credenciales (ver .env.example).

Los secretos (SESSION_SECRET, APPLE_*) viven en backend/.env, nunca en el
frontend.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

try:  # uso como paquete (backend.api)
    from .config import BASE_DIR
except ImportError:  # uso directo (uvicorn api:app --app-dir backend)
    from config import BASE_DIR  # type: ignore[no-redef]

# --- Configuracion ----------------------------------------------------------
CUENTAS_PATH = BASE_DIR / "usuarios.json"
SECRET_PATH = BASE_DIR / ".session_secret"

PBKDF2_ITERACIONES = 260_000
TOKEN_TTL_SEGUNDOS = 60 * 60 * 24 * 30  # 30 dias
APPLE_AUTHORIZE_URL = "https://appleid.apple.com/auth/authorize"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_SCOPE = "name email"

_lock = threading.Lock()


def _session_secret() -> bytes:
    """Secreto de firma. Se genera una vez y se guarda en disco."""
    if not SECRET_PATH.exists():
        SECRET_PATH.write_text(secrets.token_urlsafe(48), encoding="utf-8")
        try:
            SECRET_PATH.chmod(0o600)
        except OSError:
            pass
    return SECRET_PATH.read_text(encoding="utf-8").strip().encode()


# --- Contrasenas ------------------------------------------------------------
def cifrar_contrasena(contrasena: str) -> str:
    salt = secrets.token_bytes(16)
    hash_ = hashlib.pbkdf2_hmac("sha256", contrasena.encode(), salt, PBKDF2_ITERACIONES)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERACIONES,
        salt.hex(),
        hash_.hex(),
    )


def verificar_contrasena(contrasena: str, guardado: str) -> bool:
    try:
        algoritmo, iteraciones, salt_hex, hash_hex = guardado.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        calculado = hashlib.pbkdf2_hmac(
            "sha256", contrasena.encode(), bytes.fromhex(salt_hex), int(iteraciones)
        )
    except (ValueError, AttributeError):
        return False
    return hmac.compare_digest(calculado.hex(), hash_hex)


# --- Almacen de cuentas -----------------------------------------------------
def _leer() -> dict:
    if not CUENTAS_PATH.exists():
        return {"usuarios": []}
    try:
        return json.loads(CUENTAS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"usuarios": []}


def _escribir(datos: dict) -> None:
    CUENTAS_PATH.write_text(json.dumps(datos, indent=2, ensure_ascii=False), encoding="utf-8")


def _usuario_publico(usuario: dict) -> dict:
    """Lo que puede ver el frontend (nunca la contrasena)."""
    return {
        "email": usuario["email"],
        "displayName": usuario.get("displayName", ""),
        "username": usuario.get("username", ""),
        "profilePicture": usuario.get("profilePicture"),
        "bio": usuario.get("bio", ""),
        "pronouns": usuario.get("pronouns", ""),
        "provider": usuario.get("provider", "email"),
        "createdAt": usuario.get("createdAt"),
    }


def normalizar_correo(correo: str) -> str:
    return (correo or "").strip().lower()


def generar_username(correo: str, existentes: set[str]) -> str:
    """Username unico a partir del correo, sin simbolos raro."""
    base = re.sub(r"[^a-z0-9_]+", "_", correo.split("@")[0].lower()).strip("_") or "usuario"
    base = base[:20]
    candidato = base
    contador = 1
    while candidato in existentes:
        contador += 1
        candidato = f"{base[:18]}{contador}"
    return candidato


# --- Errores de dominio -----------------------------------------------------
class AuthError(Exception):
    def __init__(self, mensaje: str, codigo: str = "AUTH_ERROR") -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


# --- Sesiones ---------------------------------------------------------------
def crear_token(email: str) -> str:
    cuenta = hashlib.sha256(email.encode()).hexdigest()[:24]
    caducidad = int(time.time()) + TOKEN_TTL_SEGUNDOS
    cuerpo = f"{cuenta}.{caducidad}"
    firma = hmac.new(_session_secret(), cuerpo.encode(), hashlib.sha256).hexdigest()
    return f"{cuerpo}.{firma}"


def leer_token(token: str) -> str | None:
    """Devuelve la cuenta del token, o None si es invalido/caducado."""
    if not token or token.count(".") != 2:
        return None
    cuenta, caducidad_str, firma = token.split(".")
    if not hmac.compare_digest(
        firma,
        hmac.new(_session_secret(), f"{cuenta}.{caducidad_str}".encode(), hashlib.sha256).hexdigest(),
    ):
        return None
    if int(caducidad_str) < time.time():
        return None

    with _lock:
        for usuario in _leer()["usuarios"]:
            if hashlib.sha256(usuario["email"].encode()).hexdigest()[:24] == cuenta:
                return usuario["email"]
    return None


# --- Operaciones ------------------------------------------------------------
def registrar(correo: str, contrasena: str, display_name: str = "", username: str = "") -> dict:
    correo = normalizar_correo(correo)
    if not correo or "@" not in correo or "." not in correo.split("@")[-1]:
        raise AuthError("El correo no es valido", "EMAIL_INVALIDO")
    if len(contrasena or "") < 8:
        raise AuthError("La contrasena debe tener al menos 8 caracteres", "CONTRASENA_CORTA")

    with _lock:
        datos = _leer()
        usuarios = datos["usuarios"]
        if any(usuario["email"] == correo for usuario in usuarios):
            raise AuthError("Ya existe una cuenta con ese correo", "EMAIL_EN_USO")

        existentes = {usuario.get("username", "") for usuario in usuarios}
        username_limpio = re.sub(r"[^a-z0-9_]", "", (username or "").lower())[:24]
        if not username_limpio or username_limpio in existentes:
            username_limpio = generar_username(correo, existentes)

        usuario = {
            "email": correo,
            "contrasena": cifrar_contrasena(contrasena),
            "displayName": (display_name or "").strip() or correo.split("@")[0],
            "username": username_limpio,
            "profilePicture": None,
            "bio": "",
            "pronouns": "",
            "provider": "email",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        }
        usuarios.append(usuario)
        _escribir(datos)

    return {"usuario": _usuario_publico(usuario), "token": crear_token(correo)}


def iniciar_sesion(correo: str, contrasena: str) -> dict:
    correo = normalizar_correo(correo)
    with _lock:
        datos = _leer()
        usuario = next((u for u in datos["usuarios"] if u["email"] == correo), None)

    if usuario is None or not verificar_contrasena(contrasena or "", usuario.get("contrasena", "")):
        raise AuthError("Correo o contrasena incorrectos", "CREDENCIALES_INVALIDAS")

    return {"usuario": _usuario_publico(usuario), "token": crear_token(correo)}


def usuario_por_correo(correo: str) -> dict | None:
    with _lock:
        for usuario in _leer()["usuarios"]:
            if usuario["email"] == normalizar_correo(correo):
                return _usuario_publico(usuario)
    return None


def actualizar_usuario(correo: str, cambios: dict) -> dict:
    permitidos = {"displayName", "username", "bio", "pronouns", "profilePicture"}
    with _lock:
        datos = _leer()
        for usuario in datos["usuarios"]:
            if usuario["email"] == normalizar_correo(correo):
                for clave, valor in cambios.items():
                    if clave in permitidos:
                        usuario[clave] = valor
                _escribir(datos)
                return _usuario_publico(usuario)
    raise AuthError("Cuenta no encontrada", "NO_ENCONTRADO")


# --- "Sign in with Apple" ---------------------------------------------------
def apple_configurado() -> bool:
    return all(
        os.environ.get(clave)
        for clave in ("APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY")
    )


def _apple_client_secret() -> str:
    """JWT ES256 firmado con la clave .p8 de Apple (formato Apple exige RS256/ES256)."""
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        import jwt  # PyJWT
    except ImportError as error:  # pragma: no cover
        raise AuthError(
            "Sign in with Apple necesita las dependencias 'cryptography' y 'PyJWT' "
            "(pip install -r backend/requirements.txt)",
            "APPLE_DEPENDENCIA",
        ) from error

    clave = serialization.load_pem_private_key(
        os.environ["APPLE_PRIVATE_KEY"].replace("\\n", "\n").encode(), password=None
    )
    ahora = int(time.time())
    return jwt.encode(
        {
            "iss": os.environ["APPLE_TEAM_ID"],
            "iat": ahora,
            "exp": ahora + 3600,
            "aud": "https://appleid.apple.com",
            "sub": os.environ["APPLE_CLIENT_ID"],
        },
        clave,
        algorithm="ES256",
        headers={"kid": os.environ["APPLE_KEY_ID"]},
    )


def apple_authorization_url(url_frontend: str) -> str:
    if not apple_configurado():
        raise AuthError(
            "Sign in with Apple esta pendiente de credenciales "
            "(APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID y APPLE_PRIVATE_KEY en backend/.env)",
            "APPLE_NO_CONFIGURADO",
        )

    estado = secrets.token_urlsafe(24)
    _guardar_estado(estado, url_frontend)
    codificador = urllib.parse.quote
    parametros = {
        "client_id": os.environ["APPLE_CLIENT_ID"],
        "redirect_uri": APPLE_REDIRECT_URI,
        "response_type": "code id_token",
        "scope": APPLE_SCOPE,
        "state": estado,
    }
    return f"{APPLE_AUTHORIZE_URL}?{urllib.parse.urlencode(parametros, quote_via=codificador)}"


APPLE_REDIRECT_URI = os.environ.get("APPLE_REDIRECT_URI", "http://localhost:8000/auth/apple/callback")

_ESTADOS: dict[str, str] = {}


def _guardar_estado(estado: str, destino: str) -> None:
    with _lock:
        # Solo se conservan los estados recientes (el flujo dura segundos).
        for viejo, _ in list(_ESTADOS.items())[:-10]:
            _ESTADOS.pop(viejo, None)
        _ESTADOS[estado] = destino


def apple_callback(code: str, estado: str) -> dict:
    """Canjea el 'code' de Apple por los datos del usuario y crea la cuenta."""
    if not estado or estado not in _ESTADOS:
        raise AuthError("Estado de inicio de sesion no valido", "ESTADO_INVALIDO")
    destino = _ESTADOS.pop(estado, "")

    if not apple_configurado():
        raise AuthError("Sign in with Apple no esta configurado", "APPLE_NO_CONFIGURADO")

    cuerpo = urllib.parse.urlencode(
        {
            "client_id": os.environ["APPLE_CLIENT_ID"],
            "client_secret": _apple_client_secret(),
            "code": code,
            "redirect_uri": APPLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    ).encode()

    peticion = urllib.request.Request(
        APPLE_TOKEN_URL,
        data=cuerpo,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(peticion, timeout=15) as respuesta:
            datos = json.loads(respuesta.read().decode())
    except Exception as error:  # noqa: BLE001
        raise AuthError(f"Apple no valido la respuesta: {error}", "APPLE_TOKEN_ERROR") from error

    import jwt

    claims = jwt.decode(datos["id_token"], options={"verify_signature": False})
    correo = normalizar_correo(claims.get("email", ""))
    if not correo:
        raise AuthError("Apple no devolvio el correo", "APPLE_SIN_EMAIL")

    with _lock:
        almacen = _leer()
        existe = any(usuario["email"] == correo for usuario in almacen["usuarios"])

    if existe:
        # La cuenta ya existe (se iniciao sesion con Apple antes): se emite sesion.
        return {
            "destino": destino,
            "token": crear_token(correo),
            "usuario": usuario_por_correo(correo),
            "nuevo": False,
        }

    registro = registrar(
        correo,
        contrasena=secrets.token_urlsafe(24),  # cuenta de Apple: sin contrasena propia
        display_name=claims.get("email", "").split("@")[0],
    )
    return {
        "destino": destino,
        "token": registro["token"],
        "usuario": registro["usuario"],
        "nuevo": True,
    }
