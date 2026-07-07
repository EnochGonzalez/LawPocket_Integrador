// ============================================================
// ExpedientesAdmin.js — Lógica de la página "Expedientes"
// ============================================================

const MAX_PDF_SIZE = 20 * 1024 * 1024; // Límite de 20MB para el PDF

const ABOGADOS = [
    "Lic. Leonardo Nucamendi",
    "Lic. Santos Enoch González",
    "Lic. Pablo Rodriguez",
    "Lic. Carlos Vega"
];

// Colores disponibles para los avatares de abogados
const AVATAR_COLORS = ["#1a2b4b", "#047857", "#1D4ED8", "#9333EA"];

// Clases de pill según el estatus del expediente
const STATUS_PILL = {
    "En Proceso":          "pill-proceso",
    "Concluido - Ganado":  "pill-ganado",
    "Concluido - Perdido": "pill-perdido"
};

/* ============================================================
   ESTADO DEL MÓDULO
============================================================ */

// Expedientes iniciales de demostración (fecha en formato ISO)
let rows = [
    { id: "EXP-2026-118", cliente: "María Hernández Soto",     fecha: "2026-05-12", tipoCaso: "Civil",     estatus: "En Proceso",          origen: "Referidos",      asignado: ABOGADOS[0], pdfFile: "nuevo_documento_cargado.pdf" },
    { id: "EXP-2026-117", cliente: "Grupo Ferretero del Sur",  fecha: "2026-05-08", tipoCaso: "Mercantil", estatus: "En Proceso",          origen: "Sitio Web",      asignado: ABOGADOS[1], pdfFile: "nuevo_documento_cargado.pdf" },
    { id: "EXP-2026-115", cliente: "Carlos Mendoza Ruiz",      fecha: "2026-04-22", tipoCaso: "Penal",     estatus: "Concluido - Ganado",  origen: "Recomendación",  asignado: ABOGADOS[2], pdfFile: "nuevo_documento_cargado.pdf" },
    { id: "EXP-2026-114", cliente: "Distribuidora La Roca SA", fecha: "2026-04-18", tipoCaso: "Mercantil", estatus: "Concluido - Perdido", origen: "Publicidad",     asignado: ABOGADOS[3], pdfFile: "nuevo_documento_cargado.pdf" },
    { id: "EXP-2026-113", cliente: "Ana Lucía Robles",         fecha: "2026-04-10", tipoCaso: "Familiar",  estatus: "En Proceso",          origen: "Redes Sociales", asignado: ABOGADOS[0], pdfFile: "nuevo_documento_cargado.pdf" },
    { id: "EXP-2026-112", cliente: "José Antonio Pérez",       fecha: "2026-03-28", tipoCaso: "Laboral",   estatus: "Concluido - Ganado",  origen: "Referidos",      asignado: ABOGADOS[1], pdfFile: "nuevo_documento_cargado.pdf" }
];

let editingId = null;       // ID del expediente en edición
let deleteTargetId = null;  // ID del expediente pendiente de eliminar
let selectedPDF = null;     // Archivo PDF seleccionado en el modal de alta
let editPdfSelected = null; // Nuevo PDF seleccionado en edición (para reemplazar)
let editPdfCurrent = null;  // Nombre del PDF actual del expediente en edición
                            // (copia local: el expediente solo cambia al guardar)

/* ============================================================
   REFERENCIAS AL DOM
============================================================ */
const inputBuscar     = document.getElementById("inputBuscar");
const filterAbogado   = document.getElementById("filterAbogado");
const tableContainer  = document.getElementById("tableContainer");
const tableBody       = document.getElementById("tableBody");
const emptyState      = document.getElementById("emptyState");

const editModalOverlay = document.getElementById("editModalOverlay");
const editCaseId       = document.getElementById("editCaseId");
const editCliente      = document.getElementById("editCliente");
const editFecha        = document.getElementById("editFecha");
const editTipo         = document.getElementById("editTipo");
const editOrigen       = document.getElementById("editOrigen");
const editEstatus      = document.getElementById("editEstatus");
const editAsignado     = document.getElementById("editAsignado");
const errorEditCliente = document.getElementById("errorEditCliente");
const errorEditFecha   = document.getElementById("errorEditFecha");
const errorEditPDF     = document.getElementById("errorEditPDF");
const editPdfSection   = document.getElementById("editPdfSection");
const editDropZone     = document.getElementById("editDropZone");
const editInputPDF     = document.getElementById("editInputPDF");

const createModalOverlay = document.getElementById("createModalOverlay");
const newCliente         = document.getElementById("newCliente");
const newFecha           = document.getElementById("newFecha");
const newTipo            = document.getElementById("newTipo");
const newOrigen          = document.getElementById("newOrigen");
const newAsignado        = document.getElementById("newAsignado");
const createError        = document.getElementById("createError");
const dropZone           = document.getElementById("dropZone");
const dropZoneText       = document.getElementById("dropZoneText");
const inputPDF           = document.getElementById("inputPDF");

const deleteModalOverlay   = document.getElementById("deleteModalOverlay");
const successModalOverlay  = document.getElementById("successModalOverlay");
const successMessage       = document.getElementById("successMessage");
const downloadModalOverlay = document.getElementById("downloadModalOverlay");
const downloadFileName     = document.getElementById("downloadFileName");

/* ============================================================
   UTILIDADES
============================================================ */

// Renderiza los íconos de Lucide con protección ante fallas del CDN
function renderIcons() {
    try {
        if (window.lucide && typeof lucide.createIcons === "function") {
            lucide.createIcons();
        }
    } catch (e) {
        console.warn("Lucide no disponible; se omiten los íconos.", e);
    }
}

// Escapa texto para insertarlo de forma segura en HTML
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Iniciales del abogado (sin el prefijo "Lic.")
function initials(name) {
    return name
        .replace(/^Lic\.\s*/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => (p[0] || "").toUpperCase())
        .join("");
}

// Color de avatar determinístico a partir del nombre
function avatarColor(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Convierte fecha ISO (AAAA-MM-DD) a formato DD/MM/AAAA
function formatFecha(iso) {
    if (!iso) return "—";
    const parts = iso.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
}

// Fecha actual en formato ISO para el campo de alta
function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// Expedientes visibles según búsqueda y filtro de abogado
function getFilteredRows() {
    const term = inputBuscar.value.trim().toLowerCase();
    const abogado = filterAbogado.value;
    return rows.filter(r => {
        const matchesSearch =
            r.id.toLowerCase().includes(term) ||
            r.cliente.toLowerCase().includes(term);
        const matchesAbogado = abogado === "todos" || r.asignado === abogado;
        return matchesSearch && matchesAbogado;
    });
}

/* ============================================================
   RENDERIZADO — TABLA DE EXPEDIENTES
============================================================ */
function renderTable() {
    // Estado vacío global: no existe ningún expediente
    if (rows.length === 0) {
        tableContainer.classList.add("hidden");
        emptyState.classList.remove("hidden");
        renderIcons();
        return;
    }
    tableContainer.classList.remove("hidden");
    emptyState.classList.add("hidden");

    const filtered = getFilteredRows();
    tableBody.innerHTML = "";

    // Sin resultados para la búsqueda / filtro actual
    if (filtered.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td colspan="8" class="no-results-cell">Sin resultados para "' +
            escapeHTML(inputBuscar.value) + '"</td>';
        tableBody.appendChild(tr);
        return;
    }

    // Filas de expedientes
    filtered.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td>' + escapeHTML(r.id) + '</td>' +
            '<td>' + formatFecha(r.fecha) + '</td>' +
            '<td class="td-cliente">' + escapeHTML(r.cliente) + '</td>' +
            '<td><span class="pill pill-tipo">' + escapeHTML(r.tipoCaso) + '</span></td>' +
            '<td><span class="pill ' + (STATUS_PILL[r.estatus] || "pill-tipo") + '">' + escapeHTML(r.estatus) + '</span></td>' +
            '<td>' +
                '<div class="asignado-cell">' +
                    '<span class="asignado-avatar" style="background-color:' + avatarColor(r.asignado) + '">' +
                        initials(r.asignado) +
                    '</span>' +
                    '<span>' + escapeHTML(r.asignado) + '</span>' +
                '</div>' +
            '</td>' +
            '<td class="td-gestion">' +
                '<button class="btn btn-outline btn-sm" data-action="edit" data-id="' + escapeHTML(r.id) + '">' +
                    '<i data-lucide="pencil"></i> Editar' +
                '</button>' +
            '</td>' +
            '<td class="td-acciones">' +
                '<div class="actions-cell">' +
                    '<button class="icon-btn" data-action="view" data-id="' + escapeHTML(r.id) + '" title="Ver expediente">' +
                        '<i data-lucide="eye"></i>' +
                    '</button>' +
                    '<button class="icon-btn icon-btn-emerald" data-action="download" data-id="' + escapeHTML(r.id) + '" title="Descargar offline">' +
                        '<i data-lucide="download"></i>' +
                    '</button>' +
                    '<button class="icon-btn icon-btn-danger" data-action="delete" data-id="' + escapeHTML(r.id) + '" title="Eliminar expediente">' +
                        '<i data-lucide="trash-2"></i>' +
                    '</button>' +
                '</div>' +
            '</td>';
        tableBody.appendChild(tr);
    });

    // Acciones por fila
    tableBody.querySelectorAll("[data-action]").forEach(btn => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === "edit") {
            btn.addEventListener("click", () => openEditModal(id));
        } else if (action === "download") {
            btn.addEventListener("click", () => openDownloadModal(id));
        } else if (action === "delete") {
            btn.addEventListener("click", () => openDeleteModal(id));
        }
        // "view" queda como acción visual (sin comportamiento por ahora)
    });

    renderIcons();
}

/* ============================================================
   MODAL EDITAR EXPEDIENTE
============================================================ */
function clearEditErrors() {
    errorEditCliente.classList.add("hidden");
    errorEditFecha.classList.add("hidden");
    errorEditPDF.classList.add("hidden");
}

function clearEditPdfState() {
    editInputPDF.value = "";
    editPdfSelected = null;
    editPdfCurrent = null;
    editDropZone.classList.add("hidden");
}

/* Nombre del PDF vigente en el formulario de edición:
   el recién seleccionado tiene prioridad sobre el actual. */
function getEditPdfName() {
    if (editPdfSelected) return editPdfSelected.name;
    return editPdfCurrent;
}

/* Renderiza la sección de PDF en el modal de edición.
   Con archivo: chip con nombre y botón de eliminar.
   Sin archivo: zona de arrastre para cargar uno nuevo. */
function renderEditPdfSection() {
    editPdfSection.innerHTML = "";
    const pdfName = getEditPdfName();

    if (pdfName) {
        const item = document.createElement("div");
        item.className = "pdf-item";
        item.innerHTML =
            '<div class="pdf-item-name">' +
                '<i data-lucide="file-text" class="pdf-item-icon"></i>' +
                '<span class="pdf-item-text">' + escapeHTML(pdfName) + '</span>' +
            '</div>' +
            '<button type="button" class="pdf-item-delete" data-action="delete-pdf" title="Eliminar PDF">' +
                '<i data-lucide="trash-2"></i>' +
            '</button>';
        editPdfSection.appendChild(item);
        item.querySelector("[data-action]").addEventListener("click", deleteEditPdf);
        editDropZone.classList.add("hidden");
    } else {
        editDropZone.classList.remove("hidden");
    }

    renderIcons();
}

// Establece el PDF seleccionado en edición (para reemplazar)
function setEditPdfSelected(file) {
    editPdfSelected = file || null;
    if (editPdfSelected) errorEditPDF.classList.add("hidden");
    renderEditPdfSection();
}

/* Quita el PDF del formulario de edición.
   Solo afecta al formulario; el expediente conserva su archivo
   hasta que se presione "Guardar cambios". */
function deleteEditPdf() {
    editPdfSelected = null;
    editPdfCurrent = null;
    editInputPDF.value = "";
    renderEditPdfSection();
}

function openEditModal(id) {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    editingId = id;
    clearEditErrors();
    clearEditPdfState();
    editPdfCurrent = row.pdfFile || null;

    editCaseId.textContent = row.id;
    editCliente.value = row.cliente;
    editFecha.value = row.fecha;
    editTipo.value = row.tipoCaso;
    editOrigen.value = row.origen;
    editEstatus.value = row.estatus;
    editAsignado.value = row.asignado;

    // Renderizar sección PDF
    renderEditPdfSection();

    editModalOverlay.classList.remove("hidden");
}

function closeEditModal() {
    editingId = null;
    editModalOverlay.classList.add("hidden");
}

// Valida y guarda los cambios del expediente en edición
function saveEdit() {
    clearEditErrors();

    let hasErrors = false;
    if (!editCliente.value.trim()) { errorEditCliente.classList.remove("hidden"); hasErrors = true; }
    if (!editFecha.value)          { errorEditFecha.classList.remove("hidden");   hasErrors = true; }

    // El expediente debe tener un archivo PDF asociado
    if (!getEditPdfName()) {
        errorEditPDF.textContent = "El archivo PDF es obligatorio.";
        errorEditPDF.classList.remove("hidden");
        hasErrors = true;
    } else if (editPdfSelected && editPdfSelected.size > MAX_PDF_SIZE) {
        // El PDF de reemplazo no debe exceder el límite de 20MB
        errorEditPDF.textContent = "El documento PDF excede el límite permitido de 20MB.";
        errorEditPDF.classList.remove("hidden");
        hasErrors = true;
    }
    if (hasErrors) return;

    rows = rows.map(r => {
        if (r.id === editingId) {
            return { ...r,
                cliente: editCliente.value.trim(),
                fecha: editFecha.value,
                tipoCaso: editTipo.value,
                origen: editOrigen.value,
                estatus: editEstatus.value,
                asignado: editAsignado.value,
                pdfFile: getEditPdfName()
            };
        }
        return r;
    });

    closeEditModal();
    renderTable();
    showSuccessModal("Expediente actualizado exitosamente.");
}

/* ============================================================
   MODAL NUEVO EXPEDIENTE
============================================================ */
function openCreateModal() {
    createError.classList.add("hidden");
    selectedPDF = null;
    inputPDF.value = "";
    dropZone.classList.remove("has-file");
    dropZoneText.textContent = "Arrastra el PDF aquí o haz clic para seleccionar";

    newCliente.value = "";
    newFecha.value = todayISO();
    newTipo.value = "Civil";
    newOrigen.value = "Redes Sociales";
    newAsignado.value = ABOGADOS[0];

    createModalOverlay.classList.remove("hidden");
}

function closeCreateModal() {
    createError.classList.add("hidden");
    createModalOverlay.classList.add("hidden");
}

// Registra el archivo PDF seleccionado o arrastrado
function setSelectedPDF(file) {
    selectedPDF = file || null;
    if (selectedPDF) {
        dropZone.classList.add("has-file");
        dropZoneText.textContent = selectedPDF.name;
    } else {
        dropZone.classList.remove("has-file");
        dropZoneText.textContent = "Arrastra el PDF aquí o haz clic para seleccionar";
    }
}

/* Valida y guarda el nuevo expediente.
   El error se muestra si hay campos obligatorios vacíos
   (incluido el archivo PDF, que es obligatorio)
   o si el PDF seleccionado excede el límite de 20MB. */
function saveNew() {
    createError.classList.add("hidden");

    const emptyFields = !newCliente.value.trim() || !newFecha.value || selectedPDF === null;
    const pdfTooBig = selectedPDF !== null && selectedPDF.size > MAX_PDF_SIZE;

    if (emptyFields || pdfTooBig) {
        createError.classList.remove("hidden");
        return;
    }

    // Genera el siguiente ID consecutivo (EXP-2026-N)
    const maxIdNum = rows.reduce((max, r) => {
        const n = parseInt(r.id.split("-")[2], 10);
        return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const nextId = "EXP-2026-" + (maxIdNum + 1);

    // El nuevo expediente se agrega al inicio con estatus "En Proceso"
    rows.unshift({
        id: nextId,
        cliente: newCliente.value.trim(),
        fecha: newFecha.value,
        tipoCaso: newTipo.value,
        estatus: "En Proceso",
        origen: newOrigen.value,
        asignado: newAsignado.value,
        pdfFile: selectedPDF ? selectedPDF.name : null
    });

    closeCreateModal();
    renderTable();
    showSuccessModal("Expediente registrado exitosamente.");
}

/* ============================================================
   ELIMINACIÓN DE EXPEDIENTE
============================================================ */
function openDeleteModal(id) {
    deleteTargetId = id;
    deleteModalOverlay.classList.remove("hidden");
}

function closeDeleteModal() {
    deleteTargetId = null;
    deleteModalOverlay.classList.add("hidden");
}

function confirmDelete() {
    if (deleteTargetId === null) return;

    rows = rows.filter(r => r.id !== deleteTargetId);
    deleteTargetId = null;
    closeDeleteModal();
    renderTable();
    showSuccessModal("Expediente eliminado correctamente.");
}

/* ============================================================
   MODAL DE DESCARGA OFFLINE
============================================================ */
function openDownloadModal(id) {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    downloadFileName.textContent = row.id + " · " + row.cliente + ".pdf";
    downloadModalOverlay.classList.remove("hidden");
    renderIcons();
}

function closeDownloadModal() {
    downloadModalOverlay.classList.add("hidden");
}

/* ============================================================
   MODAL DE ÉXITO
============================================================ */
function showSuccessModal(message) {
    successMessage.textContent = message;
    successModalOverlay.classList.remove("hidden");
    renderIcons();
}

function closeSuccessModal() {
    successModalOverlay.classList.add("hidden");
}

/* ============================================================
   INICIALIZACIÓN
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    // --- Búsqueda y filtro ---
    inputBuscar.addEventListener("input", renderTable);
    filterAbogado.addEventListener("change", renderTable);

    // --- Botones de alta ---
    document.getElementById("btnNuevoExpediente").addEventListener("click", openCreateModal);
    document.getElementById("btnNuevoExpedienteEmpty").addEventListener("click", openCreateModal);

    // --- Guardado de modales ---
    document.getElementById("btnGuardarEdicion").addEventListener("click", saveEdit);
    document.getElementById("btnGuardarNuevo").addEventListener("click", saveNew);
    document.getElementById("btnConfirmarEliminar").addEventListener("click", confirmDelete);

    // --- Zona de arrastre del PDF (modal nuevo) ---
    dropZone.addEventListener("click", () => inputPDF.click());
    inputPDF.addEventListener("change", () => setSelectedPDF(inputPDF.files[0]));
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") {
            setSelectedPDF(file);
        }
    });

    // --- Zona de arrastre del PDF (modal edición) ---
    editDropZone.addEventListener("click", () => editInputPDF.click());
    editInputPDF.addEventListener("change", () => setEditPdfSelected(editInputPDF.files[0]));
    editDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        editDropZone.classList.add("drag-over");
    });
    editDropZone.addEventListener("dragleave", () => editDropZone.classList.remove("drag-over"));
    editDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        editDropZone.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") {
            setEditPdfSelected(file);
        }
    });

    // --- Botones de cierre de modales (data-close) ---
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.close;
            if (target === "edit") closeEditModal();
            else if (target === "create") closeCreateModal();
            else if (target === "delete") closeDeleteModal();
            else if (target === "success") closeSuccessModal();
            else if (target === "download") closeDownloadModal();
        });
    });

    // --- Cierre de modales al hacer clic en el fondo oscuro ---
    editModalOverlay.addEventListener("click", (e) => {
        if (e.target === editModalOverlay) closeEditModal();
    });
    createModalOverlay.addEventListener("click", (e) => {
        if (e.target === createModalOverlay) closeCreateModal();
    });
    deleteModalOverlay.addEventListener("click", (e) => {
        if (e.target === deleteModalOverlay) closeDeleteModal();
    });
    successModalOverlay.addEventListener("click", (e) => {
        if (e.target === successModalOverlay) closeSuccessModal();
    });
    downloadModalOverlay.addEventListener("click", (e) => {
        if (e.target === downloadModalOverlay) closeDownloadModal();
    });

    renderTable();
    renderIcons();
});
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
