// ============================================================
// sw-register.js — Registro del Service Worker (PWA)
// Se incluye en TODAS las páginas. Registra sw.js (que vive en
// la raíz del sitio) y avisa en consola si hay versión nueva.
// Solo funciona sobre HTTPS o en localhost; en cualquier otro
// caso el navegador lo ignora sin romper nada.
// ============================================================
(function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return; // navegador sin soporte

    window.addEventListener('load', () => {
        // Las páginas viven en /Paginas/, por eso la ruta sube un nivel
        navigator.serviceWorker.register('../sw.js')
            .then((registro) => {
                // Detectar cuando se instala una versión nueva de la app
                registro.addEventListener('updatefound', () => {
                    const nuevo = registro.installing;
                    if (!nuevo) return;
                    nuevo.addEventListener('statechange', () => {
                        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
                            console.info('LawPocket: hay una versión nueva; se aplicará al recargar la página.');
                        }
                    });
                });
            })
            .catch((e) => console.warn('LawPocket: no se pudo registrar el service worker:', e));
    });
})();
