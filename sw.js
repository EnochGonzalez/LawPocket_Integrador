/* ============================================================
   sw.js — Service Worker de LawPocket (PWA)

   Este archivo DEBE vivir en la raíz del sitio (junto a las
   carpetas Paginas/, CSS/, JS/), porque su ubicación define
   hasta dónde puede interceptar peticiones (su "alcance").

   Qué hace:
   1. Al instalarse, guarda una copia de TODOS los archivos de
      la app (el "app shell") en la caché del navegador.
   2. Después, intercepta cada petición y decide:
      - Archivos de la app  → responde desde la caché (rápido y
        funciona sin internet). Estrategia: cache-first.
      - Llamadas a la API   → intenta internet primero y, si no
        hay, responde con la última copia guardada.
        Estrategia: network-first. (Lista para cuando el
        backend exista; hoy no afecta en nada.)
      - Navegación a una página no guardada sin internet
        → muestra offline.html.

   IMPORTANTE al agregar un módulo nuevo:
   1. Agrega sus 3 archivos (HTML, CSS, JS) a ARCHIVOS_APP.
   2. Sube el número de VERSION (p. ej. 'lawpocket-v2').
      Con eso el navegador detecta el cambio, reinstala el
      service worker y vuelve a guardar todo actualizado.
============================================================ */

const VERSION = 'lawpocket-v8';
const CACHE_API = 'lawpocket-api-v1'; // caché aparte para respuestas de la API

/* ------------------------------------------------------------
   APP SHELL: todo lo necesario para que la app abra offline.
   Las rutas son relativas a la raíz del sitio (donde está sw.js).
------------------------------------------------------------ */
const ARCHIVOS_APP = [
    // Página de respaldo sin conexión
    'offline.html',
    'manifest.webmanifest',

    // ---------- Páginas ----------
    'index.html',
    'Paginas/Login.html',
    'Paginas/PanelAnaliticoAdmin.html',
    'Paginas/GestionUsuariosAdmin.html',
    'Paginas/SistemaAlmacenamientoAdmin.html',
    'Paginas/AgendaAdmin.html',
    'Paginas/ExpedientesAdmin.html',
    'Paginas/BibliotecaAdmin.html',
    'Paginas/MisDescargasAdmin.html',
    'Paginas/ManualesUsuarioAdmin.html',
    'Paginas/AgendaAbogado.html',
    'Paginas/ExpedientesAbogado.html',
    'Paginas/BibliotecaAbogado.html',
    'Paginas/MisDescargasAbogado.html',
    'Paginas/ManualesUsuarioAbogado.html',

    // ---------- Hojas de estilo ----------
    'CSS/Landing.css',
    'CSS/Login.css',
    'CSS/SidebarAdmin.css',
    'CSS/responsive.css',
    'CSS/PanelAnaliticoAdmin.css',
    'CSS/GestionUsuariosAdmin.css',
    'CSS/SistemaAlmacenamientoAdmin.css',
    'CSS/AgendaAdmin.css',
    'CSS/ExpedientesAdmin.css',
    'CSS/BibliotecaAdmin.css',
    'CSS/MisDescargasAdmin.css',
    'CSS/ManualesUsuarioAdmin.css',
    'CSS/AgendaAbogado.css',
    'CSS/ExpedientesAbogado.css',
    'CSS/BibliotecaAbogado.css',
    'CSS/MisDescargasAbogado.css',
    'CSS/ManualesUsuarioAbogado.css',

    // ---------- Lógica de cada módulo ----------
    'JS/Landing.js',
    'JS/PanelAnaliticoAdmin.js',
    'JS/GestionUsuariosAdmin.js',
    'JS/SistemaAlmacenamientoAdmin.js',
    'JS/AgendaAdmin.js',
    'JS/ExpedientesAdmin.js',
    'JS/BibliotecaAdmin.js',
    'JS/MisDescargasAdmin.js',
    'JS/ManualesUsuarioAdmin.js',
    'JS/AgendaAbogado.js',
    'JS/ExpedientesAbogado.js',
    'JS/BibliotecaAbogado.js',
    'JS/MisDescargasAbogado.js',
    'JS/ManualesUsuarioAbogado.js',
    'JS/api.js',
    'JS/sw-register.js',
    'JS/responsive.js',

    // ---------- Librerías locales (antes venían de CDN) ----------
    'lib/lucide.min.js',
    'lib/chart.umd.js',
    'lib/fuentes/inter.css',
    'lib/fuentes/inter-latin-400-normal.woff2',
    'lib/fuentes/inter-latin-500-normal.woff2',
    'lib/fuentes/inter-latin-600-normal.woff2',
    'lib/fuentes/inter-latin-700-normal.woff2',

    // ---------- Iconos de la app ----------
    'Imagenes/icono-192.png',
    'Imagenes/icono-512.png',
    'Imagenes/icono-maskable.png',
    'Imagenes/icono-apple.png',
];

/* ------------------------------------------------------------
   INSTALL: se dispara la primera vez (o cuando cambia VERSION).
   Descarga y guarda el app shell completo.
------------------------------------------------------------ */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSION)
            .then((cache) => cache.addAll(ARCHIVOS_APP))
            .then(() => self.skipWaiting()) // activa la versión nueva sin esperar
    );
});

/* ------------------------------------------------------------
   ACTIVATE: limpia cachés de versiones anteriores para no
   acumular basura cuando se publica una VERSION nueva.
------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((claves) => Promise.all(
                claves
                    .filter((clave) => clave !== VERSION && clave !== CACHE_API)
                    .map((clave) => caches.delete(clave))
            ))
            .then(() => self.clients.claim()) // toma control de las pestañas abiertas
    );
});

/* ------------------------------------------------------------
   FETCH: el "portero". Decide la estrategia según la petición.
------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
    const peticion = event.request;
    const url = new URL(peticion.url);

    // Solo gestionamos GET del mismo origen (el sitio propio)
    if (peticion.method !== 'GET' || url.origin !== self.location.origin) return;

    // 1) Llamadas a la API (cuando exista el backend): internet
    //    primero; si falla, la última respuesta guardada
    if (url.pathname.includes('/api/')) {
        event.respondWith(redPrimero(peticion));
        return;
    }

    // 2) Navegación entre páginas: caché primero; si la página no
    //    está guardada, intenta internet; si tampoco hay, offline.html
    if (peticion.mode === 'navigate') {
        event.respondWith(
            caches.match(peticion, { ignoreSearch: true })
                .then((enCache) => enCache || fetch(peticion))
                .catch(() => caches.match('offline.html'))
        );
        return;
    }

    // 3) Todo lo demás (CSS, JS, fuentes, imágenes): caché primero;
    //    lo que no esté guardado se pide a internet y se guarda
    //    para la próxima (caché en tiempo de ejecución)
    event.respondWith(
        caches.match(peticion).then((enCache) => {
            if (enCache) return enCache;
            return fetch(peticion).then((respuesta) => {
                // Guardar solo respuestas correctas
                if (respuesta && respuesta.status === 200) {
                    const copia = respuesta.clone();
                    caches.open(VERSION).then((cache) => cache.put(peticion, copia));
                }
                return respuesta;
            });
        })
    );
});

/* Estrategia network-first para la API: intenta internet y guarda
   la respuesta; si no hay conexión, responde con la copia previa */
function redPrimero(peticion) {
    return fetch(peticion)
        .then((respuesta) => {
            if (respuesta && respuesta.status === 200) {
                const copia = respuesta.clone();
                caches.open(CACHE_API).then((cache) => cache.put(peticion, copia));
            }
            return respuesta;
        })
        .catch(() => caches.match(peticion));
}
