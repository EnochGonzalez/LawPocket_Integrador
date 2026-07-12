# ============================================================
# inyectar_pwa.py — Conecta la PWA en todas las páginas
# ============================================================
import re
from pathlib import Path

PAGINAS = Path(__file__).resolve().parent.parent / 'Paginas'

# Bloque PWA que va en el <head> (después del <title>)
BLOQUE_HEAD = (
    '    <!-- PWA: ficha de instalación, color de la barra e ícono de iOS -->\n'
    '    <link rel="manifest" href="../manifest.webmanifest">\n'
    '    <meta name="theme-color" content="#14213d">\n'
    '    <link rel="apple-touch-icon" href="../Imagenes/icono-apple.png">\n'
)

# Registro del service worker (antes de </body>)
BLOQUE_SW = (
    '    <!-- PWA: registro del service worker (consulta offline) -->\n'
    '    <script src="../JS/sw-register.js"></script>\n'
)

# CDN -> archivo local
REEMPLAZOS = [
    # Google Fonts (con cualquier combinación de pesos) -> Inter local
    (re.compile(r'<link href="https://fonts\.googleapis\.com/[^"]*" rel="stylesheet">'),
     '<link rel="stylesheet" href="../lib/fuentes/inter.css">'),
    # Lucide desde unpkg -> local
    (re.compile(r'<script src="https://unpkg\.com/lucide@[^"]*"></script>'),
     '<script src="../lib/lucide.min.js"></script>'),
    # Chart.js desde jsdelivr -> local
    (re.compile(r'<script src="https://cdn\.jsdelivr\.net/npm/chart\.js@[^"]*"></script>'),
     '<script src="../lib/chart.umd.js"></script>'),
]


def procesar(ruta: Path) -> None:
    with open(ruta, encoding='utf-8', newline='') as f:
        texto = f.read()
    original = texto

    # ¿El archivo usa CRLF? (respetar su estilo al insertar líneas)
    crlf = '\r\n' in texto
    nl = '\r\n' if crlf else '\n'

    # 1) CDN -> local
    for patron, local in REEMPLAZOS:
        texto = patron.sub(local, texto)

    # 2) Bloque PWA en el <head>, justo después del </title>
    if 'manifest.webmanifest' not in texto:
        bloque = BLOQUE_HEAD.replace('\n', nl)
        texto = re.sub(r'(</title>\r?\n)', r'\1' + bloque.replace('\\', '\\\\'), texto, count=1)

    # 3) Registro del service worker antes de </body>
    if 'sw-register.js' not in texto:
        bloque = BLOQUE_SW.replace('\n', nl)
        texto = texto.replace('</body>', bloque + '</body>', 1)

    if texto != original:
        with open(ruta, 'w', encoding='utf-8', newline='') as f:
            f.write(texto)
        print(f'  ✔ {ruta.name}')
    else:
        print(f'  · {ruta.name} (sin cambios)')


if __name__ == '__main__':
    print('Conectando PWA en las páginas:')
    for pagina in sorted(PAGINAS.glob('*.html')):
        procesar(pagina)
    print('Listo.')
