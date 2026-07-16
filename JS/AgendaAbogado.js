// ============================================================
// AgendaAbogado.js — Lógica de la página "Agenda"
// ============================================================

// Estilos por categoría del caso (materia).
// Cada categoría tiene su propio color ÚNICO dentro de la Agenda:
// los colores no se repiten entre categorías de esta sección.
const MATERIA_STYLE = {
    Civil:     { bg: "#1D4ED8", text: "#FFFFFF" }, // Azul
    Penal:     { bg: "#DC2626", text: "#FFFFFF" }, // Rojo
    Laboral:   { bg: "#D97706", text: "#FFFFFF" }, // Ámbar
    Familiar:  { bg: "#7C3AED", text: "#FFFFFF" }, // Violeta
    Mercantil: { bg: "#047857", text: "#FFFFFF" }  // Verde
};

// Color de la etiqueta de una cita: se deriva SIEMPRE de su categoría
function materiaColor(materia) {
    return (MATERIA_STYLE[materia] || MATERIA_STYLE.Civil).bg;
}

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/* ============================================================
   ESTADO DEL MÓDULO
============================================================ */

/* Usuario con sesión activa: cada usuario del despacho tiene SU
   propia agenda (clave por usuario en sessionStorage) */
const USUARIO_ACTUAL = sessionStorage.getItem("lawpocket_user") || "ABG01";

/* ============================================================
   CITAS — ALMACÉN POR USUARIO (sessionStorage)
   La agenda es individual: las citas de cada usuario se guardan
   bajo su propia clave y no se mezclan con las de los demás.
============================================================ */
const CITAS_KEY = "lawpocket_citas::" + USUARIO_ACTUAL;

// Citas iniciales de demostración (month: 0-11)
const CITAS_DEMO = [
    { id: 1, year: 2026, month: 5, day: 12, hora: "10:00 hrs",
      titulo: "Audiencia Inicial · EXP-2026-118",
      desc: "Juzgado 3° Civil — María Hernández Soto", materia: "Civil" },
    { id: 2, year: 2026, month: 5, day: 14, hora: "09:30 hrs",
      titulo: "Cita con cliente",
      desc: "Grupo Ferretero del Sur — Revisión de contrato", materia: "Civil" },
    { id: 3, year: 2026, month: 5, day: 16, hora: "12:00 hrs",
      titulo: "Audiencia de pruebas · EXP-2026-117",
      desc: "Juzgado 1° Mercantil", materia: "Civil" },
    { id: 4, year: 2026, month: 5, day: 20, hora: "16:00 hrs",
      titulo: "Reunión interna",
      desc: "Revisión semanal del despacho", materia: "Civil" },
    { id: 5, year: 2026, month: 6, day: 3, hora: "11:00 hrs",
      titulo: "Audiencia preliminar · EXP-2026-120",
      desc: "Juzgado 2° Penal", materia: "Penal" },
    { id: 6, year: 2026, month: 5, day: 12, hora: "15:30 hrs",
      titulo: "Reunión con perito",
      desc: "Valoración técnica del expediente", materia: "Penal" },
    { id: 7, year: 2026, month: 5, day: 12, hora: "18:00 hrs",
      titulo: "Cierre del día · Notas",
      desc: "Resumen de avances del caso María Hernández", materia: "Civil" }
];

function obtenerCitas() {
    try {
        const raw = sessionStorage.getItem(CITAS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn("No se pudo leer la agenda del usuario:", e);
    }
    guardarCitas(CITAS_DEMO);
    return CITAS_DEMO.map((c) => ({ ...c }));
}

function guardarCitas(lista) {
    try {
        sessionStorage.setItem(CITAS_KEY, JSON.stringify(lista));
    } catch (e) {
        console.warn("No se pudo guardar la agenda del usuario:", e);
    }
}

let events = obtenerCitas();

let currentYear = 2026;
let currentMonth = 5;          // Junio (0-11)
let editingId = null;          // ID de la cita en edición (null = nueva)
let deleteTargetId = null;     // ID de la cita pendiente de eliminar
let drawerDay = null;          // Día abierto en el drawer (null = cerrado)

/* ============================================================
   REFERENCIAS AL DOM
============================================================ */
const calendarTitle    = document.getElementById("calendarTitle");
const calendarDays     = document.getElementById("calendarDays");
const eventsTitle      = document.getElementById("eventsTitle");
const eventsList       = document.getElementById("eventsList");

const drawerOverlay    = document.getElementById("drawerOverlay");
const dayDrawer        = document.getElementById("dayDrawer");
const drawerDate       = document.getElementById("drawerDate");
const drawerEvents     = document.getElementById("drawerEvents");

const citaModalOverlay = document.getElementById("citaModalOverlay");
const citaModalTitle   = document.getElementById("citaModalTitle");
const inputFecha       = document.getElementById("inputFecha");
const inputHora        = document.getElementById("inputHora");
const inputTitulo      = document.getElementById("inputTitulo");
const inputDescripcion = document.getElementById("inputDescripcion");
const inputMateria     = document.getElementById("inputMateria");
const materiaDot       = document.getElementById("materiaDot");
const errorFecha       = document.getElementById("errorFecha");
const errorHora        = document.getElementById("errorHora");
const errorTitulo      = document.getElementById("errorTitulo");
const collisionError   = document.getElementById("collisionError");

const deleteModalOverlay  = document.getElementById("deleteModalOverlay");
const successModalOverlay = document.getElementById("successModalOverlay");
const successMessage      = document.getElementById("successMessage");

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

// Días del mes (month: 0-11)
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Desplazamiento inicial con semana que inicia en lunes
// Dom(0) -> 6, Lun(1) -> 0, Mar(2) -> 1, ...
function getStartOffset(year, month) {
    const js = new Date(year, month, 1).getDay();
    return (js + 6) % 7;
}

// Normaliza la hora a formato HH:MM para comparaciones
// "10:00 hrs" -> "10:00" · "9:30" -> "09:30"
function normalizeHora(h) {
    const m = String(h).match(/(\d{1,2}):(\d{2})/);
    if (!m) return String(h).trim();
    return m[1].padStart(2, "0") + ":" + m[2];
}

// Eventos del mes visible, ordenados por día y hora
function getMonthEvents() {
    return events
        .filter(e => e.year === currentYear && e.month === currentMonth)
        .sort((a, b) => a.day - b.day || normalizeHora(a.hora).localeCompare(normalizeHora(b.hora)));
}

// Agrupa los eventos del mes por día { 12: [...], 14: [...] }
function getEventsByDay() {
    const acc = {};
    getMonthEvents().forEach(e => {
        (acc[e.day] = acc[e.day] || []).push(e);
    });
    return acc;
}

/* ============================================================
   RENDERIZADO — CALENDARIO
============================================================ */
function renderCalendar() {
    calendarTitle.textContent = MONTH_NAMES[currentMonth] + " " + currentYear;

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startOffset = getStartOffset(currentYear, currentMonth);
    const byDay = getEventsByDay();

    calendarDays.innerHTML = "";

    // Celdas vacías previas al día 1
    for (let i = 0; i < startOffset; i++) {
        calendarDays.appendChild(document.createElement("div"));
    }

    // Celdas de días
    for (let day = 1; day <= daysInMonth; day++) {
        const count = (byDay[day] || []).length;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        if (count === 1) cell.classList.add("load-1");
        else if (count === 2) cell.classList.add("load-2");
        else if (count >= 3) cell.classList.add("load-3");

        const num = document.createElement("span");
        num.textContent = day;
        cell.appendChild(num);

        // Insignia +N para días con 2 o más eventos
        if (count >= 2) {
            const badge = document.createElement("span");
            badge.className = "day-badge " + (count === 2 ? "badge-amber" : "badge-red");
            badge.textContent = "+" + count;
            cell.appendChild(badge);
        }

        cell.addEventListener("click", () => openDrawer(day));
        calendarDays.appendChild(cell);
    }
}

/* ============================================================
   RENDERIZADO — LISTADO DE CITAS DEL MES
============================================================ */
function renderEventsList() {
    eventsTitle.textContent = "Citas de " + MONTH_NAMES[currentMonth];

    const monthEvents = getMonthEvents();
    eventsList.innerHTML = "";

    // Estado vacío
    if (monthEvents.length === 0) {
        const empty = document.createElement("div");
        empty.className = "events-empty";
        empty.textContent = "No hay citas registradas este mes.";
        eventsList.appendChild(empty);
        return;
    }

    // Tarjetas de citas
    monthEvents.forEach(e => {
        const card = document.createElement("article");
        card.className = "event-card";
        card.innerHTML =
            '<div class="event-color-bar" style="background-color:' + materiaColor(e.materia) + '"></div>' +
            '<div class="event-body">' +
                '<div class="event-header">' +
                    '<p class="event-title">' + escapeHTML(e.titulo) + '</p>' +
                    '<div class="event-actions">' +
                        '<button class="icon-btn" data-action="edit" data-id="' + e.id + '" title="Modificar">' +
                            '<i data-lucide="pencil"></i>' +
                        '</button>' +
                        '<button class="icon-btn icon-btn-danger" data-action="delete" data-id="' + e.id + '" title="Cancelar cita">' +
                            '<i data-lucide="trash-2"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                (e.desc ? '<p class="event-desc">' + escapeHTML(e.desc) + '</p>' : '') +
                '<div class="event-meta">' +
                    '<span><i data-lucide="calendar"></i> ' + e.day + ' ' + MONTH_NAMES[e.month] + ' ' + e.year + '</span>' +
                    '<span><i data-lucide="clock"></i> ' + escapeHTML(e.hora) + '</span>' +
                '</div>' +
            '</div>';
        eventsList.appendChild(card);
    });

    // Acciones de las tarjetas (editar / eliminar)
    eventsList.querySelectorAll("[data-action]").forEach(btn => {
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === "edit") {
            btn.addEventListener("click", () => openEditModal(id));
        } else {
            btn.addEventListener("click", () => openDeleteModal(id));
        }
    });

    renderIcons();
}

/* ============================================================
   DRAWER LATERAL — EVENTOS DEL DÍA
============================================================ */
function openDrawer(day) {
    drawerDay = day;
    drawerDate.textContent = day + " " + MONTH_NAMES[currentMonth] + " " + currentYear;
    renderDrawerEvents();
    drawerOverlay.classList.remove("hidden");
    dayDrawer.classList.remove("hidden");
}

function closeDrawer() {
    drawerDay = null;
    drawerOverlay.classList.add("hidden");
    dayDrawer.classList.add("hidden");
}

function renderDrawerEvents() {
    const dayEvents = drawerDay != null ? (getEventsByDay()[drawerDay] || []) : [];
    drawerEvents.innerHTML = "";

    // Estado vacío del día
    if (dayEvents.length === 0) {
        const empty = document.createElement("p");
        empty.className = "timeline-empty";
        empty.textContent = "Sin eventos para este día.";
        drawerEvents.appendChild(empty);
        return;
    }

    // Elementos de la línea de tiempo
    dayEvents.forEach(e => {
        const style = MATERIA_STYLE[e.materia] || MATERIA_STYLE.Civil;
        const item = document.createElement("div");
        item.className = "timeline-item";
        item.innerHTML =
            '<span class="timeline-dot" style="background-color:' + materiaColor(e.materia) + '"></span>' +
            '<div class="timeline-head">' +
                '<p class="timeline-time"><i data-lucide="clock"></i> ' + escapeHTML(e.hora) + '</p>' +
                '<div class="event-actions">' +
                    '<button class="icon-btn" data-action="edit" data-id="' + e.id + '" title="Modificar">' +
                        '<i data-lucide="pencil"></i>' +
                    '</button>' +
                    '<button class="icon-btn icon-btn-danger" data-action="delete" data-id="' + e.id + '" title="Cancelar cita">' +
                        '<i data-lucide="trash-2"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<p class="timeline-title">' + escapeHTML(e.titulo) + '</p>' +
            (e.desc ? '<p class="timeline-desc">' + escapeHTML(e.desc) + '</p>' : '') +
            '<span class="materia-badge" style="background-color:' + style.bg + ';color:' + style.text + '">' +
                escapeHTML(e.materia) +
            '</span>';
        drawerEvents.appendChild(item);
    });

    // Acciones del drawer (editar cierra el drawer y abre el modal)
    drawerEvents.querySelectorAll("[data-action]").forEach(btn => {
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === "edit") {
            btn.addEventListener("click", () => { closeDrawer(); openEditModal(id); });
        } else {
            btn.addEventListener("click", () => openDeleteModal(id));
        }
    });

    renderIcons();
}

/* ============================================================
   MODAL DE CITA — APERTURA Y VALIDACIÓN
============================================================ */

// Limpia todos los mensajes de error del formulario
function clearFormErrors() {
    errorFecha.classList.add("hidden");
    errorHora.classList.add("hidden");
    errorTitulo.classList.add("hidden");
    collisionError.classList.add("hidden");
}

// Actualiza el punto de color del select de categoría
function updateMateriaDot() {
    const style = MATERIA_STYLE[inputMateria.value] || MATERIA_STYLE.Civil;
    materiaDot.style.backgroundColor = style.bg;
}

// Abre el modal en modo "Nueva Cita"
function openNewModal() {
    editingId = null;
    clearFormErrors();
    citaModalTitle.querySelector("span").textContent = "Nueva Cita";

    inputFecha.value = currentYear + "-" + String(currentMonth + 1).padStart(2, "0") + "-01";
    inputHora.value = "";
    inputTitulo.value = "";
    inputDescripcion.value = "";
    inputMateria.value = "Civil";
    actualizarColorSelectMateria();
    updateMateriaDot();

    citaModalOverlay.classList.remove("hidden");
}

// Abre el modal en modo "Modificar Cita" con los datos precargados
function openEditModal(id) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;

    editingId = id;
    clearFormErrors();
    citaModalTitle.querySelector("span").textContent = "Modificar Cita";

    inputFecha.value = ev.year + "-" + String(ev.month + 1).padStart(2, "0") + "-" + String(ev.day).padStart(2, "0");
    inputHora.value = normalizeHora(ev.hora);
    inputTitulo.value = ev.titulo;
    inputDescripcion.value = ev.desc;
    inputMateria.value = ev.materia;
    actualizarColorSelectMateria();
    updateMateriaDot();

    citaModalOverlay.classList.remove("hidden");
}

function closeCitaModal() {
    citaModalOverlay.classList.add("hidden");
}

/* ============================================================
   GUARDADO DE CITA
   Valida campos obligatorios, verifica colisión de fecha/hora
   (excluyendo la cita en edición) y crea o actualiza el evento.
============================================================ */


/* ============================================================
   COMBO DE CATEGORÍA CON PUNTITO DE COLOR
   Cada opción del select muestra "●" con el color de su materia,
   visible al desplegar el combo (no solo después de guardar).
============================================================ */
function decorarSelectMateria() {
    /* El puntito de texto sustituye al círculo decorativo anterior
       (materiaDot): se oculta y se devuelve el padding normal al
       select para que no se vea un punto doble. */
    if (materiaDot) {
        materiaDot.style.display = "none";
        inputMateria.style.paddingLeft = "12px";
    }

    Array.from(inputMateria.options).forEach((opt) => {
        const estilo = MATERIA_STYLE[opt.value];
        if (!estilo) return;
        if (opt.textContent.indexOf("●") !== 0) {
            opt.textContent = "● " + opt.textContent;
        }
        opt.style.color = estilo.bg;
    });
    actualizarColorSelectMateria();
}

// El valor seleccionado del combo también se pinta con su color
function actualizarColorSelectMateria() {
    const estilo = MATERIA_STYLE[inputMateria.value];
    inputMateria.style.color = estilo ? estilo.bg : "";
}

function saveCita() {
    clearFormErrors();

    // --- Validación por campo ---
    let hasErrors = false;
    if (!inputFecha.value) { errorFecha.classList.remove("hidden"); hasErrors = true; }
    if (!inputHora.value)  { errorHora.classList.remove("hidden");  hasErrors = true; }
    if (!inputTitulo.value.trim()) { errorTitulo.classList.remove("hidden"); hasErrors = true; }
    if (hasErrors) return;

    const parts = inputFecha.value.split("-").map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    const draftHora = normalizeHora(inputHora.value);

    // --- Validación de colisión (misma fecha y hora) ---
    const conflict = events.some(e =>
        e.id !== editingId &&
        e.year === y &&
        e.month === m - 1 &&
        e.day === d &&
        normalizeHora(e.hora) === draftHora
    );
    if (conflict) {
        collisionError.classList.remove("hidden");
        return;
    }

    const materia = inputMateria.value;

    if (editingId === null) {
        // Alta de nueva cita
        const newId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
        events.push({
            id: newId,
            year: y, month: m - 1, day: d,
            hora: draftHora + " hrs",
            titulo: inputTitulo.value.trim(),
            desc: inputDescripcion.value.trim(),
            materia: materia
        });
    } else {
        // Actualización de cita existente
        events = events.map(e =>
            e.id === editingId
                ? { ...e, year: y, month: m - 1, day: d,
                    hora: draftHora + " hrs",
                    titulo: inputTitulo.value.trim(),
                    desc: inputDescripcion.value.trim(),
                    materia: materia }
                : e
        );
    }

    guardarCitas(events);

    const message = editingId === null
        ? "Cita registrada exitosamente."
        : "Cita actualizada exitosamente.";

    closeCitaModal();
    renderAll();
    showSuccessModal(message);
}

/* ============================================================
   ELIMINACIÓN DE CITA
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

    events = events.filter(e => e.id !== deleteTargetId);
    guardarCitas(events);
    deleteTargetId = null;
    closeDeleteModal();

    // Si el drawer está abierto, se actualiza o se cierra si quedó vacío
    if (drawerDay !== null) {
        const remaining = getEventsByDay()[drawerDay] || [];
        if (remaining.length === 0) {
            closeDrawer();
        } else {
            renderDrawerEvents();
        }
    }

    renderAll();
    showSuccessModal("Cita eliminada correctamente.");
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
   NAVEGACIÓN DE MESES
============================================================ */
function goPrevMonth() {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    renderAll();
}

function goNextMonth() {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
    renderAll();
}

/* ============================================================
   RENDERIZADO GENERAL E INICIALIZACIÓN
============================================================ */
function renderAll() {
    renderCalendar();
    renderEventsList();
}

document.addEventListener("DOMContentLoaded", () => {
    decorarSelectMateria();
    inputMateria.addEventListener("change", actualizarColorSelectMateria);

    // --- Navegación del calendario ---
    document.getElementById("btnMesAnterior").addEventListener("click", goPrevMonth);
    document.getElementById("btnMesSiguiente").addEventListener("click", goNextMonth);

    // --- Botón Nueva Cita y guardado ---
    document.getElementById("btnNuevaCita").addEventListener("click", openNewModal);
    document.getElementById("btnGuardarCita").addEventListener("click", saveCita);

    // --- Confirmación de eliminación ---
    document.getElementById("btnConfirmarEliminar").addEventListener("click", confirmDelete);

    // --- Drawer ---
    document.getElementById("btnCerrarDrawer").addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    // --- Select de categoría: actualizar punto de color ---
    inputMateria.addEventListener("change", updateMateriaDot);

    // --- Botones de cierre de modales (data-close) ---
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.close;
            if (target === "cita") closeCitaModal();
            else if (target === "delete") closeDeleteModal();
            else if (target === "success") closeSuccessModal();
        });
    });

    // --- Cierre de modales al hacer clic en el fondo oscuro ---
    citaModalOverlay.addEventListener("click", (e) => {
        if (e.target === citaModalOverlay) closeCitaModal();
    });
    deleteModalOverlay.addEventListener("click", (e) => {
        if (e.target === deleteModalOverlay) closeDeleteModal();
    });
    successModalOverlay.addEventListener("click", (e) => {
        if (e.target === successModalOverlay) closeSuccessModal();
    });

    renderAll();
    renderIcons();
});
/* ============================================================
   SESIÓN Y CIERRE DE SESIÓN (compartido por todos los módulos)
   Muestra el nombre e iniciales del usuario logueado en la
   topbar y limpia la sesión al hacer clic en "Cerrar sesión"
   (el enlace del sidebar navega a Login.html por sí mismo).
============================================================ */
(function initSession() {
    const nombre = sessionStorage.getItem("lawpocket_name") || "Nucamendi Ruiz Leonardo";
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
   MODAL "TRABAJO SIN CONEXIÓN"
   Aparece cada vez que el abogado entra a la Agenda; se puede
   cerrar con la X, con "Entendido" o haciendo clic fuera.
   (Mismo comportamiento que en el Panel Analítico del Admin.)
============================================================ */
(function initOfflineModal() {
    const modal = document.getElementById("offlineModal");
    if (!modal) return;
    const closeBtn = document.getElementById("closeOfflineModal");
    const dismissBtn = document.getElementById("dismissOfflineModal");
    function hideModal() {
        modal.classList.add("hidden");
        // Tras el aviso de trabajo sin conexión se muestra, si hay,
        // la notificación vigente del despacho creada por el admin
        mostrarNotificacionDespacho();
    }
    if (closeBtn) closeBtn.addEventListener("click", hideModal);
    if (dismissBtn) dismissBtn.addEventListener("click", hideModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
})();

/* ============================================================
   NOTIFICACIÓN DEL DESPACHO
   El administrador la crea en "Sistema y Almacenamiento" con una
   duración estipulada (localStorage "lawpocket_notification").
   Se muestra a todos los miembros del despacho MENOS al admin,
   justo después del aviso de trabajo sin conexión, mientras esté
   vigente. Si el admin limpia el aviso, deja de mostrarse.
============================================================ */
function mostrarNotificacionDespacho() {
    // El admin no recibe sus propias notificaciones
    if (sessionStorage.getItem("lawpocket_role") === "admin") return;

    let notif = null;
    try {
        notif = JSON.parse(localStorage.getItem("lawpocket_notification"));
    } catch (e) {
        return;
    }
    if (!notif || !notif.message || !notif.createdAt) return;

    // Vigencia: duración en días (puede ser fracción, ej. 0.25 = 6 hrs)
    const vigenciaMs = parseFloat(notif.duration) * 24 * 60 * 60 * 1000;
    if (!vigenciaMs || Date.now() > notif.createdAt + vigenciaMs) {
        localStorage.removeItem("lawpocket_notification"); // aviso vencido
        return;
    }

    const modal = document.getElementById("notifDespachoModal");
    if (!modal) return;
    document.getElementById("notifDespachoTexto").textContent = notif.message;
    modal.classList.remove("hidden");
    renderIcons();

    const cerrar = () => modal.classList.add("hidden");
    document.getElementById("closeNotifDespacho").addEventListener("click", cerrar);
    document.getElementById("dismissNotifDespacho").addEventListener("click", cerrar);
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });
}
