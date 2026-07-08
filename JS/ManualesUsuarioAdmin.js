// ===================================================================
// ManualesUsuarioAdmin.js — Lógica de la página "Manuales de Usuario"
// ===================================================================

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
   DATOS DEMO DEL MÓDULO
============================================================ */
const MANUALES = [
    { title: "Guía de Inicio Rápido", subtitle: "Primeros pasos en LawPocket", size: "1.2 MB", updated: "10 Jun 2026" },
    { title: "Manual de Gestión de Caché PWA", subtitle: "Uso offline y limpieza de almacenamiento del navegador para mantener el rendimiento óptimo del sistema.", size: "2.4 MB", updated: "08 Jun 2026" },
    { title: "Guía del Módulo de Expedientes", subtitle: "Subir, modificar y archivar casos", size: "1.8 MB", updated: "05 Jun 2026" },
    { title: "Manual de Agenda Digital", subtitle: "Gestión de audiencias y citas", size: "1.5 MB", updated: "01 Jun 2026" },
    { title: "Biblioteca Jurídica · Catálogo", subtitle: "Cómo consultar y agregar libros personales", size: "2.0 MB", updated: "28 May 2026" },
    { title: "Protocolo de Seguridad y Acceso", subtitle: "Política interna del despacho", size: "0.9 MB", updated: "20 May 2026" },
];

/* ============================================================
   ALMACÉN COMPARTIDO DE DESCARGAS (sessionStorage)
   Mismo almacén que usa "Mis Descargas": al descargar un
   manual aquí, aparece en la lista de ese módulo.
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

/* Fecha de hoy con el formato del diseño, p. ej. "07 Jul 2026" */
function fechaHoy() {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    return dia + " " + meses[hoy.getMonth()] + " " + hoy.getFullYear();
}

/* Agrega el manual descargado a "Mis Descargas" (sin duplicar) */
function registrarDescarga(manual) {
    const nombreArchivo = manual.title + ".pdf";
    const descargas = obtenerDescargas();
    if (!descargas.some((d) => d.name === nombreArchivo)) {
        descargas.unshift({ name: nombreArchivo, size: manual.size, date: fechaHoy() });
        guardarDescargas(descargas);
    }
    return nombreArchivo;
}

/* ============================================================
   RENDERIZADO DE LA CUADRÍCULA
============================================================ */
const gridManuales = document.getElementById("gridManuales");
const emptyCard = document.getElementById("emptyCard");

function renderManuales() {
    const hayManuales = MANUALES.length > 0;
    gridManuales.classList.toggle("hidden", !hayManuales);
    emptyCard.classList.toggle("hidden", hayManuales);
    if (!hayManuales) return;

    gridManuales.innerHTML = "";
    MANUALES.forEach((manual) => {
        const card = document.createElement("article");
        card.className = "manual-card";

        /* Parte superior: icono, título, descripción y metadatos */
        const top = document.createElement("div");

        const head = document.createElement("div");
        head.className = "manual-head";
        const icono = document.createElement("div");
        icono.className = "manual-icon";
        icono.innerHTML = '<i data-lucide="file-text"></i>';
        const textos = document.createElement("div");
        const titulo = document.createElement("p");
        titulo.className = "manual-title";
        titulo.textContent = manual.title;
        const subtitulo = document.createElement("p");
        subtitulo.className = "manual-subtitle";
        subtitulo.textContent = manual.subtitle;
        textos.appendChild(titulo);
        textos.appendChild(subtitulo);
        head.appendChild(icono);
        head.appendChild(textos);

        const meta = document.createElement("div");
        meta.className = "manual-meta";
        const tam = document.createElement("span");
        tam.textContent = "PDF · " + manual.size;
        const fecha = document.createElement("span");
        fecha.textContent = "Actualizado " + manual.updated;
        meta.appendChild(tam);
        meta.appendChild(fecha);

        top.appendChild(head);
        top.appendChild(meta);

        /* Acciones */
        const acciones = document.createElement("div");
        acciones.className = "manual-actions";

        /* Botón Visualizar — pendiente de integrarse con el visor de PDF */
        const btnVer = document.createElement("button");
        btnVer.className = "btn btn-outline";
        btnVer.innerHTML = '<i data-lucide="eye"></i> Visualizar';

        const btnDescargar = document.createElement("button");
        btnDescargar.className = "btn btn-primary";
        btnDescargar.innerHTML = '<i data-lucide="download"></i> Descargar';
        btnDescargar.addEventListener("click", () => {
            const nombreArchivo = registrarDescarga(manual);
            abrirModalDescarga(nombreArchivo);
        });

        acciones.appendChild(btnVer);
        acciones.appendChild(btnDescargar);

        card.appendChild(top);
        card.appendChild(acciones);
        gridManuales.appendChild(card);
    });

    try {
        if (window.lucide) lucide.createIcons();
    } catch (e) { /* iconos no disponibles sin conexión al CDN */ }
}

/* ============================================================
   MODAL DE DESCARGA EXITOSA
============================================================ */
const downloadOverlay = document.getElementById("downloadModalOverlay");
const downloadFileName = document.getElementById("downloadFileName");

function abrirModalDescarga(nombreArchivo) {
    downloadFileName.textContent = nombreArchivo;
    downloadOverlay.classList.remove("hidden");
}

function cerrarModalDescarga() {
    downloadOverlay.classList.add("hidden");
}

document.querySelectorAll('[data-close="download"]').forEach((el) => {
    el.addEventListener("click", cerrarModalDescarga);
});

downloadOverlay.addEventListener("click", (e) => {
    if (e.target === downloadOverlay) cerrarModalDescarga();
});

/* Primer renderizado */
renderManuales();
