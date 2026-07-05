// ============================================================
// SistemaAlmacenamiento.js — Lógica de "Sistema y Almacenamiento"
// ============================================================

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
    window.location.href = 'login.html';
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

    // Barras horizontales: GB de caché usados por cada abogado
    if (key === 'abogados') {
        new Chart(document.getElementById('chartAbogados'), {
            type: 'bar',
            data: {
                labels: ['Nucamendi', 'González', 'Rodriguez', 'López'],
                datasets: [{ data: [1.4, 0.9, 1.1, 0.9], backgroundColor: NAVY, borderRadius: 6, barThickness: 30 }]
            },
            options: {
                indexAxis: 'y', plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: 1.4 }, y: { grid: { display: false } } }
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

// Guardar notificación: almacena el aviso en localStorage con su
// duración y fecha de creación, y muestra el modal de éxito.
// Si el mensaje está vacío, elimina la notificación guardada.
document.getElementById('saveNotifBtn').addEventListener('click', () => {
    const message = document.getElementById('notifMessage').value.trim();
    const duration = document.getElementById('notifDuration').value;
    if (message) {
        localStorage.setItem('lawpocket_notification', JSON.stringify({ message, duration, createdAt: Date.now() }));
    } else {
        localStorage.removeItem('lawpocket_notification');
    }
    document.getElementById('notifSuccessMsg').style.display = 'block';
    document.getElementById('successMessage').textContent = 'Notificación guardada exitosamente.';
    openModal('successModal');
});

// Limpiar aviso: vacía el campo de texto y elimina la
// notificación guardada en localStorage
document.getElementById('clearNotifBtn').addEventListener('click', () => {
    document.getElementById('notifMessage').value = '';
    localStorage.removeItem('lawpocket_notification');
    document.getElementById('notifSuccessMsg').style.display = 'none';
});