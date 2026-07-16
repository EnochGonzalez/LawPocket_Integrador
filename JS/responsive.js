/* ============================================================
   responsive.js — Comportamiento móvil COMPARTIDO de LawPocket
   ------------------------------------------------------------
   Trabaja en pareja con CSS/responsive.css. Hace dos cosas:

   1. DRAWER: crea el botón hamburguesa en la barra superior
      y el overlay oscuro; abre/cierra el sidebar en pantallas
      angostas (≤ 1024px). Se cierra con el overlay, con la
      tecla Escape o al tocar un enlace del menú.

   2. TABLAS → TARJETAS: copia el texto de cada <th> del
      <thead> como atributo data-label en los <td> de cada
      fila. responsive.css usa ese atributo para pintar la
      etiqueta en la vista de tarjetas (≤ 768px). Un
      MutationObserver re-etiqueta cada vez que el JS del
      módulo vuelve a renderizar las filas.

   No requiere cambios en los JS de los módulos.
============================================================ */

(function () {
    "use strict";

    var BREAKPOINT_DRAWER = 1024;

    document.addEventListener("DOMContentLoaded", function () {
        iniciarDrawer();
        iniciarEtiquetadoDeTablas();
    });

    /* ------------------------------------------------------------
       1. DRAWER (menú lateral deslizable)
    ------------------------------------------------------------ */
    function iniciarDrawer() {
        var sidebar = document.querySelector(".sidebar");
        var topbar = document.querySelector(".topbar");

        // Páginas sin sidebar (Login, Landing) no llevan drawer
        if (!sidebar || !topbar) return;

        // --- Botón hamburguesa (primer elemento de la topbar) ---
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "hamburger-btn";
        boton.id = "hamburgerBtn";
        boton.setAttribute("aria-label", "Abrir menú de navegación");
        boton.setAttribute("aria-expanded", "false");
        boton.innerHTML = '<i data-lucide="menu"></i>';
        topbar.insertBefore(boton, topbar.firstChild);

        // Renderizar el ícono recién insertado (con guardia, como
        // en el resto de la app, por si Lucide no cargó)
        try {
            if (window.lucide && typeof lucide.createIcons === "function") {
                lucide.createIcons();
            }
        } catch (e) { /* sin ícono, el botón sigue siendo usable */ }

        // --- Overlay oscuro detrás del drawer ---
        var overlay = document.createElement("div");
        overlay.className = "drawer-overlay";
        overlay.id = "drawerOverlay";
        document.body.appendChild(overlay);

        function abrir() {
            sidebar.classList.add("drawer-open");
            overlay.classList.add("visible");
            document.body.classList.add("drawer-lock");
            boton.setAttribute("aria-expanded", "true");
        }

        function cerrar() {
            sidebar.classList.remove("drawer-open");
            overlay.classList.remove("visible");
            document.body.classList.remove("drawer-lock");
            boton.setAttribute("aria-expanded", "false");
        }

        function alternar() {
            if (sidebar.classList.contains("drawer-open")) {
                cerrar();
            } else {
                abrir();
            }
        }

        boton.addEventListener("click", alternar);
        overlay.addEventListener("click", cerrar);

        document.addEventListener("keydown", function (evento) {
            if (evento.key === "Escape") cerrar();
        });

        // Al tocar un enlace del menú, el drawer se cierra para
        // que la navegación se sienta inmediata
        sidebar.addEventListener("click", function (evento) {
            var enlace = evento.target.closest("a.nav-item");
            if (enlace && window.innerWidth <= BREAKPOINT_DRAWER) {
                cerrar();
            }
        });

        // Si el usuario agranda la ventana (o rota una tablet),
        // se limpia el estado del drawer
        window.addEventListener("resize", function () {
            if (window.innerWidth > BREAKPOINT_DRAWER) cerrar();
        });
    }

    /* ------------------------------------------------------------
       2. ETIQUETADO AUTOMÁTICO DE TABLAS (data-label)
    ------------------------------------------------------------ */
    function iniciarEtiquetadoDeTablas() {
        var tablas = document.querySelectorAll(
            ".table-scroll table, .table-wrap table"
        );

        tablas.forEach(function (tabla) {
            etiquetarTabla(tabla);

            var cuerpo = tabla.querySelector("tbody");
            if (!cuerpo) return;

            // Re-etiquetar cada vez que el módulo renderiza filas
            var observador = new MutationObserver(function () {
                etiquetarTabla(tabla);
            });
            observador.observe(cuerpo, { childList: true });
        });
    }

    function etiquetarTabla(tabla) {
        var encabezados = [];
        tabla.querySelectorAll("thead th").forEach(function (th) {
            encabezados.push(th.textContent.trim());
        });
        if (encabezados.length === 0) return;

        tabla.querySelectorAll("tbody tr").forEach(function (fila) {
            var celdas = fila.children;
            for (var i = 0; i < celdas.length; i++) {
                var celda = celdas[i];
                if (celda.tagName !== "TD") continue;
                // Las celdas de mensaje (colspan) no llevan etiqueta
                if (celda.hasAttribute("colspan")) continue;
                if (encabezados[i] !== undefined) {
                    celda.setAttribute("data-label", encabezados[i]);
                }
            }
        });
    }
})();
