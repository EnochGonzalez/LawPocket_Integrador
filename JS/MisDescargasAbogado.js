// ============================================================
// MisDescargasAbogado.js — Lógica de la página "Mis Descargas"
// ============================================================

// Inicializar los iconos de la librería Lucide (con protección ante fallos del CDN para no romper el resto de la página)

try {
    if (window.lucide) lucide.createIcons();
} catch (e) {
    console.warn("No se pudieron renderizar los iconos de Lucide:", e);
}

/* ============================================================
   SESIÓN Y CIERRE DE SESIÓN (compartido por todos los módulos)
   Muestra el nombre e iniciales del usuario logueado en la
   topbar y limpia la sesión al hacer clic en "Cerrar sesión"
   (el enlace del sidebar navega a Login.html por sí mismo).
============================================================ */
(function initSession() {
    const nombre = sessionStorage.getItem("lawpocket_name") || "González Velasco Santos Enoch";
    const nombreEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar");
    if (nombreEl) nombreEl.textContent = nombre;
    const iniciales = nombre.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    if (avatarEl) avatarEl.textContent = iniciales || "AD";

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("lawpocket_role");
            sessionStorage.removeItem("lawpocket_name");
        });
    }
})();

/* ============================================================
   ALMACÉN COMPARTIDO DE DESCARGAS (sessionStorage)
   La lista vive en sessionStorage bajo "lawpocket_descargas"
   para que "Manuales de Usuario" pueda agregar archivos al
   descargarlos y este módulo los muestre. Si no existe aún,
   se siembra con los datos demo del diseño.
============================================================ */
const DESCARGAS_KEY = "lawpocket_descargas";

const DESCARGAS_DEMO = [
    { name: "EXP-2026-118 · María Hernández.pdf", size: "2.4 MB", date: "10 Jun 2026" },
    { name: "Código Penal Federal.pdf", size: "8.1 MB", date: "08 Jun 2026" },
    { name: "EXP-2026-117 · Grupo Ferretero.pdf", size: "1.7 MB", date: "05 Jun 2026" },
    { name: "Ley Federal del Trabajo.pdf", size: "5.3 MB", date: "01 Jun 2026" },
];

function obtenerDescargas() {
    try {
        const raw = sessionStorage.getItem(DESCARGAS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn("No se pudo leer la lista de descargas:", e);
    }
    guardarDescargas(DESCARGAS_DEMO);
    return DESCARGAS_DEMO.slice();
}

function guardarDescargas(lista) {
    try {
        sessionStorage.setItem(DESCARGAS_KEY, JSON.stringify(lista));
    } catch (e) {
        console.warn("No se pudo guardar la lista de descargas:", e);
    }
}

/* ------------------------------------------------------------
   Ventana emergente de aviso para descargas (se crea una sola
   vez por página y se reutiliza; no requiere cambios en el HTML)
------------------------------------------------------------ */
function mostrarAvisoDescarga(titulo, mensaje) {
    let overlay = document.getElementById("avisoDescargaOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "avisoDescargaOverlay";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;";
        overlay.innerHTML =
            '<div style="background:#fff;border-radius:16px;max-width:430px;width:100%;padding:1.6rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);">' +
                '<div style="font-size:2rem;line-height:1;margin-bottom:.6rem;">\u26A0\uFE0F</div>' +
                '<h3 id="avisoDescargaTitulo" style="margin:0 0 .5rem;color:#1a2b4b;font-size:1.05rem;"></h3>' +
                '<p id="avisoDescargaTexto" style="margin:0 0 1.1rem;color:#475569;font-size:.92rem;line-height:1.5;"></p>' +
                '<button id="avisoDescargaCerrar" style="background:#1a2b4b;color:#fff;border:none;border-radius:8px;padding:.6rem 1.4rem;font-weight:600;cursor:pointer;">Aceptar</button>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.style.display = "none"; });
        overlay.querySelector("#avisoDescargaCerrar").addEventListener("click", () => { overlay.style.display = "none"; });
    }
    overlay.querySelector("#avisoDescargaTitulo").textContent = titulo;
    overlay.querySelector("#avisoDescargaTexto").textContent = mensaje;
    overlay.style.display = "flex";
}


/* ============================================================
   REFERENCIAS AL DOM
============================================================ */
const searchWrapper = document.getElementById("searchWrapper");
const inputFiltro = document.getElementById("inputFiltro");
const offlineBanner = document.getElementById("offlineBanner");
const contadorDescargas = document.getElementById("contadorDescargas");
const listaCard = document.getElementById("listaCard");
const listaDescargas = document.getElementById("listaDescargas");
const sinResultados = document.getElementById("sinResultados");
const emptyCard = document.getElementById("emptyCard");

/* Estado del módulo */
let descargas = obtenerDescargas();
let archivoAEliminar = null; // nombre del archivo pendiente de confirmación

/* ============================================================
   RENDERIZADO DE LA LISTA
============================================================ */
function renderDescargas() {
    const filtro = (inputFiltro.value || "").toLowerCase();
    const filtradas = descargas.filter((d) => d.name.toLowerCase().includes(filtro));

    /* Estado vacío: sin archivos se ocultan buscador, banner y lista */
    const hayArchivos = descargas.length > 0;
    searchWrapper.classList.toggle("hidden", !hayArchivos);
    offlineBanner.classList.toggle("hidden", !hayArchivos);
    listaCard.classList.toggle("hidden", !hayArchivos);
    emptyCard.classList.toggle("hidden", hayArchivos);
    if (!hayArchivos) return;

    contadorDescargas.textContent = descargas.length;

    listaDescargas.innerHTML = "";
    filtradas.forEach((archivo) => {
        const fila = document.createElement("div");
        fila.className = "download-row";

        const icono = document.createElement("i");
        icono.setAttribute("data-lucide", "file-text");

        const info = document.createElement("div");
        info.className = "download-info";
        const nombre = document.createElement("p");
        nombre.className = "download-name";
        nombre.textContent = archivo.name;
        const meta = document.createElement("p");
        meta.className = "download-meta";
        meta.textContent = archivo.size + " · Descargado " + archivo.date;
        info.appendChild(nombre);
        info.appendChild(meta);

        /* Descarga desactualizada: el documento fuente se editó
           después de descargarse; hay que eliminarla y volver a
           descargarla para reinstalar la versión actualizada
           (si el original fue eliminado, ese aviso tiene prioridad) */
        if (archivo.desactualizado && !archivo.eliminado) {
            const aviso = document.createElement("p");
            aviso.className = "download-meta";
            aviso.style.cssText = "color:#D97706;font-weight:600;";
            aviso.textContent = "\u26A0 Documento actualizado: elimina esta descarga y descárgalo nuevamente para reinstalarlo con la actualización.";
            info.appendChild(aviso);
        }

        /* Descarga huérfana: el documento original fue eliminado del
           sistema; la copia offline sigue disponible para consulta,
           el aviso es únicamente informativo */
        if (archivo.eliminado) {
            const aviso = document.createElement("p");
            aviso.className = "download-meta";
            aviso.style.cssText = "color:#DC2626;font-weight:600;";
            aviso.textContent = "\u26A0 El documento original fue eliminado del sistema. Esta copia descargada sigue disponible para su consulta.";
            info.appendChild(aviso);
        }

        /* Botón Visualizar PDF — pendiente de integrarse con el visor
           de PDF. Si el original fue eliminado, al visualizar se
           muestra una advertencia informativa (la copia sí se ve) */
        const btnVer = document.createElement("button");
        btnVer.className = "btn btn-primary";
        btnVer.innerHTML = '<i data-lucide="eye"></i> Visualizar PDF';
        btnVer.addEventListener("click", () => {
            if (archivo.eliminado) {
                mostrarAvisoDescarga(
                    "Documento eliminado",
                    '"' + archivo.name + '" fue eliminado del sistema. A\u00fan puedes visualizar esta copia descargada, pero el documento original ya no existe y no recibir\u00e1 actualizaciones.'
                );
            }
        });

        const btnEliminar = document.createElement("button");
        btnEliminar.className = "btn btn-danger-outline";
        btnEliminar.innerHTML = '<i data-lucide="trash-2"></i> Eliminar';
        btnEliminar.addEventListener("click", () => abrirModal("delete", archivo.name));

        fila.appendChild(icono);
        fila.appendChild(info);
        fila.appendChild(btnVer);
        fila.appendChild(btnEliminar);
        listaDescargas.appendChild(fila);
    });

    /* Mensaje "sin resultados" cuando el filtro no encuentra nada */
    const sinCoincidencias = filtradas.length === 0;
    sinResultados.classList.toggle("hidden", !sinCoincidencias);
    if (sinCoincidencias) {
        sinResultados.textContent = 'Sin resultados para "' + inputFiltro.value + '"';
    }

    try {
        if (window.lucide) lucide.createIcons();
    } catch (e) { /* iconos no disponibles sin conexión al CDN */ }
}

/* ============================================================
   SISTEMA DE MODALES (confirmar eliminación / éxito)
============================================================ */
const overlays = {
    delete: document.getElementById("deleteModalOverlay"),
    success: document.getElementById("successModalOverlay"),
};

function abrirModal(cual, archivo) {
    if (cual === "delete") archivoAEliminar = archivo || null;
    overlays[cual].classList.remove("hidden");
}

function cerrarModal(cual) {
    overlays[cual].classList.add("hidden");
    if (cual === "delete") archivoAEliminar = null;
}

/* Botones y fondos que cierran los modales (atributo data-close) */
document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => cerrarModal(el.getAttribute("data-close")));
});

/* Clic en el fondo oscuro también cierra el modal */
Object.entries(overlays).forEach(([cual, overlay]) => {
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrarModal(cual);
    });
});

/* Confirmar eliminación */
document.getElementById("btnConfirmarEliminar").addEventListener("click", () => {
    if (!archivoAEliminar) return;
    descargas = descargas.filter((d) => d.name !== archivoAEliminar);
    guardarDescargas(descargas);
    cerrarModal("delete");
    renderDescargas();
    abrirModal("success");
});

/* ============================================================
   FILTRO DE BÚSQUEDA
============================================================ */
inputFiltro.addEventListener("input", renderDescargas);

/* Primer renderizado */
renderDescargas();

/* Aviso emergente al entrar si hay descargas cuyo documento fue
   actualizado después de descargarse: hay que eliminarlas y
   volver a descargarlas para reinstalar la versión actualizada */
(function avisarDescargasDesactualizadas() {
    // Las descargas cuyo original fue ELIMINADO no entran aquí:
    // ya no tiene caso volver a descargarlas (su aviso propio se
    // muestra en la fila y al intentar visualizarlas)
    const pendientes = descargas.filter((d) => d.desactualizado && !d.eliminado).map((d) => '"' + d.name + '"');
    if (pendientes.length === 0) return;
    mostrarAvisoDescarga(
        "Documentos actualizados",
        "Se actualizaron después de tu descarga: " + pendientes.join(", ") + ". Elimina cada descarga y vuelve a descargar el documento para reinstalarlo con la actualización."
    );
})();