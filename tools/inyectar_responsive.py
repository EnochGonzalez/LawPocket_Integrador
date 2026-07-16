# ============================================================
# inyectar_responsive.py — Inyección de la capa móvil
# ------------------------------------------------------------
# Inserta en cada página de Paginas/ que tenga sidebar:
#
#   1. <link rel="stylesheet" href="../CSS/responsive.css">
#      justo DESPUÉS del último <link rel="stylesheet"> del
#      <head> (debe cargar al final para poder sobreescribir
#      los estilos de escritorio de cada módulo).
#
#   2. <script src="../JS/responsive.js"></script>
#      justo ANTES de </body>.
#
# Es IDEMPOTENTE: si una página ya tiene las referencias, se
# omite. Preserva los finales de línea originales de cada
# archivo (LF o CRLF). Las páginas SIN sidebar (Login.html,
# index.html) se omiten automáticamente.
#
# Uso, parado en la raíz del proyecto:
#   python tools/inyectar_responsive.py
# ============================================================

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA_PAGINAS = RAIZ / "Paginas"

LINK_CSS = '<link rel="stylesheet" href="../CSS/responsive.css">'
SCRIPT_JS = '<script src="../JS/responsive.js"></script>'


def detectar_eol(texto: str) -> str:
    """Devuelve el final de línea dominante del archivo."""
    return "\r\n" if texto.count("\r\n") > texto.count("\n") / 2 else "\n"


def inyectar(ruta: Path) -> str:
    texto = ruta.read_text(encoding="utf-8")

    # Solo páginas con sidebar llevan capa móvil de drawer
    if 'class="sidebar"' not in texto:
        return "omitida (sin sidebar)"

    ya_css = "CSS/responsive.css" in texto
    ya_js = "JS/responsive.js" in texto
    if ya_css and ya_js:
        return "ya inyectada"

    eol = detectar_eol(texto)
    cambios = []

    if not ya_css:
        # Último <link rel="stylesheet" ...> del documento
        enlaces = list(re.finditer(r'[ \t]*<link\s+rel="stylesheet"[^>]*>', texto))
        if not enlaces:
            return "ERROR: no se encontró ningún <link rel=\"stylesheet\">"
        ultimo = enlaces[-1]
        sangria = re.match(r"[ \t]*", ultimo.group(0)).group(0)
        insercion = ultimo.group(0) + eol + sangria + LINK_CSS
        texto = texto[: ultimo.start()] + insercion + texto[ultimo.end():]
        cambios.append("css")

    if not ya_js:
        posicion = texto.rfind("</body>")
        if posicion == -1:
            return "ERROR: no se encontró </body>"
        texto = texto[:posicion] + "    " + SCRIPT_JS + eol + texto[posicion:]
        cambios.append("js")

    ruta.write_text(texto, encoding="utf-8", newline="")
    return "inyectada (" + " + ".join(cambios) + ")"


def main() -> None:
    if not CARPETA_PAGINAS.is_dir():
        raise SystemExit("No se encontró la carpeta Paginas/ — ejecuta desde la raíz del proyecto.")

    print("Inyectando capa móvil (responsive.css + responsive.js):")
    for ruta in sorted(CARPETA_PAGINAS.glob("*.html")):
        resultado = inyectar(ruta)
        print(f"  {ruta.name:<38} {resultado}")


if __name__ == "__main__":
    main()
