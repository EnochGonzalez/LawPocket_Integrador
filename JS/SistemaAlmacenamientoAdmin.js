// ===================================================================
// SistemaAlmacenamientoAdmin.js — Lógica de "Sistema y Almacenamiento"
// ===================================================================

// Inicializar los iconos de la librería Lucide
if (window.lucide) lucide.createIcons();

// Sesión: mostrar el nombre del usuario logueado en la topbar
// y generar sus iniciales para el avatar (círculo azul)
(function initSession() {
    const name = sessionStorage.getItem('lawpocket_name') || 'González Velasco Santos Enoch';
    document.getElementById('userName').textContent = name;
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials || 'AD';
})();

// Cerrar sesión: limpia la sesión y regresa al login
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('lawpocket_role');
    sessionStorage.removeItem('lawpocket_name');
    window.location.href = 'Login.html';
});

// Utilidades de modales: abrir / cerrar por id
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
// Cualquier botón con atributo data-close="idDelModal" cierra ese modal
document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
});

// Paleta de colores para las gráficas (misma que las variables del CSS)
const NAVY = '#1a2b4b'; const EMERALD = '#10B981'; const BLUE = '#3B82F6'; const SLATE_200 = '#e2e8f0';

// Genera el título de un eje (X o Y) para las gráficas
// de Chart.js, indicando qué representa cada eje
function axisTitle(text) {
    return { display: true, text, color: '#64748b', font: { size: 12, weight: '600' } };
}

// ------------------------------------------------------------
// ALMACÉN COMPARTIDO DE USUARIOS (sessionStorage)
// Mismo almacén que usa "Gestión de Usuarios": la gráfica
// "Uso por Abogado" se construye con esta lista, así refleja
// las altas, ediciones y bajas hechas en ese módulo. Si aún
// no existe, se siembra con los mismos datos demo.
// ------------------------------------------------------------
const USUARIOS_KEY = 'lawpocket_usuarios';

const USUARIOS_DEMO = [
    { id: 1, nombre: 'González Velasco Santos Enoch', userId: 'ADMIN01', password: 'admin2026', telefono: '961 123 4567', rol: 'Socio', activo: true },
    { id: 2, nombre: 'Nucamendi Ruiz Leonardo', userId: 'ABG01', password: 'leonardo01', telefono: '961 234 5678', rol: 'Abogado', activo: true },
    { id: 3, nombre: 'Rodriguez Cruz Pablo Isaias', userId: 'ABG02', password: 'pablo02', telefono: '961 345 6789', rol: 'Abogado', activo: true },
    { id: 4, nombre: 'González Pérez Santos Enoch', userId: 'ABG03', password: 'santos03', telefono: '961 456 7890', rol: 'Abogado', activo: true },
];

// Lee la lista de usuarios del almacén compartido (o siembra la demo)
function obtenerUsuarios() {
    try {
        const raw = sessionStorage.getItem(USUARIOS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('No se pudo leer la lista de usuarios:', e);
    }
    try {
        sessionStorage.setItem(USUARIOS_KEY, JSON.stringify(USUARIOS_DEMO));
    } catch (e) { /* almacenamiento no disponible */ }
    return USUARIOS_DEMO.slice();
}

// Caché simulada (GB) por usuario: valor determinístico a partir
// del ID, para que cada abogado conserve el mismo consumo entre
// recargas (0.3 a 1.6 GB)
function cacheSimulada(semilla) {
    const s = String(semilla || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
    return Math.round((0.3 + (h / 1000) * 1.3) * 10) / 10;
}

// Etiquetas de la gráfica: primer apellido del usuario; si dos
// usuarios comparten el primer apellido (p. ej. dos "González"),
// se usan las dos primeras palabras para distinguirlos
function etiquetasAbogados(usuarios) {
    const primeros = usuarios.map((u) => ((u.nombre || '').trim().split(/\s+/)[0]) || u.userId || '—');
    return usuarios.map((u, i) => {
        const repetido = primeros.filter((p) => p === primeros[i]).length > 1;
        if (!repetido) return primeros[i];
        const partes = (u.nombre || '').trim().split(/\s+/);
        return partes.slice(0, 2).join(' ') || u.userId || '—';
    });
}

// ------------------------------------------------------------
// Gráfica de dona "Caché Total del Despacho"
// Se dibuja siempre al cargar la página (43% ocupado)
// ------------------------------------------------------------
new Chart(document.getElementById('chartCache'), {
    type: 'doughnut',
    data: { datasets: [{ data: [43, 57], backgroundColor: [EMERALD, SLATE_200], borderWidth: 0 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, rotation: -90, circumference: 360 }
});

// ------------------------------------------------------------
// Pestañas del sistema (Caché / Uso por Abogado / Documentos)
// Al hacer clic en una pill se marca como activa, se muestra su
// vista correspondiente y se dibuja la gráfica solo la primera vez
// ------------------------------------------------------------
const sistemaPills = document.querySelectorAll('#sistemaPills .tab-pill');
const sistemaViews = document.querySelectorAll('.sistema-view');
let sistemaRendered = { abogados: false, documentos: false };

sistemaPills.forEach((pill) => {
    pill.addEventListener('click', () => {
        sistemaPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const key = pill.dataset.sistema;
        sistemaViews.forEach((v) => v.classList.toggle('active', v.id === `sistema-${key}`));
        renderSistemaChart(key);
    });
});

// ------------------------------------------------------------
// Dibuja la gráfica correspondiente a cada pestaña
// (cada gráfica se crea una sola vez y queda en memoria)
// ------------------------------------------------------------
function renderSistemaChart(key) {
    if (sistemaRendered[key]) return; // Ya fue dibujada, no repetir
    sistemaRendered[key] = true;

    // Barras horizontales: GB de caché usados por cada abogado.
    // La lista se toma del almacén compartido con "Gestión de
    // Usuarios", así que refleja las altas, ediciones y bajas
    if (key === 'abogados') {
        const usuarios = obtenerUsuarios();
        const labels = etiquetasAbogados(usuarios);
        const data = usuarios.map((u) => cacheSimulada(u.userId || u.nombre));
        // El eje X se ajusta al mayor consumo registrado
        const maxGB = data.length ? Math.max(...data) : 1;
        new Chart(document.getElementById('chartAbogados'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{ data, backgroundColor: NAVY, borderRadius: 6, barThickness: 30 }]
            },
            options: {
                indexAxis: 'y', plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: maxGB, title: axisTitle('Caché utilizada (GB)') }, y: { grid: { display: false }, title: axisTitle('Abogado') } }
            }
        });
    }

    // Pastel: documentos almacenados por categoría (la leyenda
    // con barras se muestra en el HTML, por eso legend: false)
    if (key === 'documentos') {
        new Chart(document.getElementById('chartDocumentos'), {
            type: 'pie',
            data: {
                labels: ['Expedientes', 'Biblioteca', 'Manuales'],
                datasets: [{ data: [842, 287, 118], backgroundColor: [NAVY, EMERALD, BLUE], borderWidth: 2, borderColor: '#fff' }]
            },
            options: { plugins: { legend: { display: false } } }
        });
    }
}

// ------------------------------------------------------------
// Notificaciones del Despacho
// ------------------------------------------------------------

// Guardar notificación: valida que el mensaje NO esté vacío
// (si lo está, muestra un mensaje de error y no guarda nada).
// Si es válido, almacena el aviso en localStorage con su
// duración y fecha de creación, y muestra el modal de éxito.
document.getElementById('saveNotifBtn').addEventListener('click', () => {
    const textarea = document.getElementById('notifMessage');
    const message = textarea.value.trim();
    const duration = document.getElementById('notifDuration').value;
    const errorMsg = document.getElementById('notifErrorMsg');

    // Validación: no se puede guardar un aviso vacío
    if (!message) {
        document.getElementById('notifSuccessMsg').style.display = 'none';
        errorMsg.style.display = 'block';
        textarea.classList.add('input-error');
        textarea.focus();
        return;
    }

    errorMsg.style.display = 'none';
    textarea.classList.remove('input-error');
    localStorage.setItem('lawpocket_notification', JSON.stringify({ message, duration, createdAt: Date.now() }));
    document.getElementById('notifSuccessMsg').style.display = 'block';
    document.getElementById('successMessage').textContent = 'Notificación guardada exitosamente.';
    openModal('successModal');
});

// Al escribir en el campo del aviso se oculta el mensaje de error
document.getElementById('notifMessage').addEventListener('input', () => {
    document.getElementById('notifErrorMsg').style.display = 'none';
    document.getElementById('notifMessage').classList.remove('input-error');
});

// Limpiar aviso: vacía el campo de texto, elimina la notificación
// guardada en localStorage y muestra el modal de limpieza exitosa
document.getElementById('clearNotifBtn').addEventListener('click', () => {
    const textarea = document.getElementById('notifMessage');
    textarea.value = '';
    textarea.classList.remove('input-error');
    localStorage.removeItem('lawpocket_notification');
    document.getElementById('notifSuccessMsg').style.display = 'none';
    document.getElementById('notifErrorMsg').style.display = 'none';
    document.getElementById('successMessage').textContent = 'Aviso limpiado exitosamente.';
    openModal('successModal');
});
