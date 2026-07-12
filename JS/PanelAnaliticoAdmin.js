// ===============================================================
// PanelAnaliticoAdmin.js — Lógica de la página "Panel Analítico"
// ===============================================================

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

// Paleta de colores para las gráficas (misma que las variables del CSS)
const NAVY = '#1a2b4b'; const EMERALD = '#10B981'; const RED = '#ef4444'; const BLUE = '#3B82F6'; const SLATE_200 = '#e2e8f0';

// Genera el título de un eje (X o Y) para las gráficas
// de Chart.js, indicando qué representa cada eje
function axisTitle(text) {
    return { display: true, text, color: '#64748b', font: { size: 12, weight: '600' } };
}

// ------------------------------------------------------------
// Gráfica de dona "Almacenamiento Disponible (Offline)"
// Se dibuja siempre al cargar la página (62% usado / 38% libre)
// ------------------------------------------------------------
new Chart(document.getElementById('chartDisponible'), {
    type: 'doughnut',
    data: { datasets: [{ data: [62, 38], backgroundColor: [EMERALD, SLATE_200], borderWidth: 0 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, rotation: -90, circumference: 360 }
});

// ------------------------------------------------------------
// Pestañas de gráficas analíticas
// Al hacer clic en una pill se marca como activa, se muestra
// su vista correspondiente y se dibuja la gráfica (solo la
// primera vez, gracias a chartsRendered)
// ------------------------------------------------------------
const analiticoPills = document.querySelectorAll('#analiticoPills .tab-pill');
const chartViews = document.querySelectorAll('.chart-view');
let chartsRendered = { ganados: false, origen: false, tipos: false, exito: false };

analiticoPills.forEach((pill) => {
    pill.addEventListener('click', () => {
        analiticoPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const key = pill.dataset.chart;
        chartViews.forEach((v) => v.classList.toggle('active', v.id === `chart-${key}`));
        renderAnaliticoChart(key);
    });
});

// ------------------------------------------------------------
// Dibuja la gráfica correspondiente a cada pestaña
// (cada gráfica se crea una sola vez y queda en memoria)
// ------------------------------------------------------------
function renderAnaliticoChart(key) {
    if (chartsRendered[key]) return; // Ya fue dibujada, no repetir
    chartsRendered[key] = true;

    // Barras horizontales: Casos Ganados vs Perdidos
    if (key === 'ganados') {
        new Chart(document.getElementById('chartGanados'), {
            type: 'bar',
            data: {
                labels: ['Ganados', 'Perdidos'],
                datasets: [{ data: [64, 18], backgroundColor: [EMERALD, RED], borderRadius: 6, barThickness: 40 }]
            },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 80, title: axisTitle('Cantidad de casos') }, y: { grid: { display: false }, title: axisTitle('Resultado') } } }
        });
    }

    // Pastel: Origen de Clientes (la leyenda con barras y el total
    // se muestran en el HTML, al lado derecho de la gráfica, con el
    // mismo estilo que "Documentos en el Sistema"; por eso legend: false)
    if (key === 'origen') {
        new Chart(document.getElementById('chartOrigen'), {
            type: 'pie',
            data: {
                labels: ['Referidos', 'Sitio Web', 'Redes Sociales', 'Recomendación'],
                datasets: [{ data: [42, 28, 18, 12], backgroundColor: [NAVY, EMERALD, BLUE, '#f59e0b'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: { plugins: { legend: { display: false } } }
        });
    }

    // Barras verticales: Tipos de Casos
    if (key === 'tipos') {
        new Chart(document.getElementById('chartTipos'), {
            type: 'bar',
            data: { labels: ['Civil', 'Penal', 'Laboral', 'Mercantil', 'Familiar'], datasets: [{ data: [24, 17, 30, 12, 21], backgroundColor: NAVY, borderRadius: 6, barThickness: 46 }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 32, title: axisTitle('Cantidad') }, x: { grid: { display: false }, title: axisTitle('Tipo de caso') } } }
        });
    }

    // Línea: Éxito Mensual (porcentaje de efectividad por mes)
    if (key === 'exito') {
        new Chart(document.getElementById('chartExito'), {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{ label: 'efectividad', data: [72, 76, 74, 80, 85, 83], borderColor: EMERALD, backgroundColor: EMERALD, tension: 0.35 }]
            },
            options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, max: 100, title: axisTitle('Efectividad (%)') }, x: { grid: { display: false }, title: axisTitle('Mes') } } }
        });
    }
}

// Iniciar gráfica default al cargar la página
renderAnaliticoChart('ganados');

// ------------------------------------------------------------
// Modal "Trabajo sin conexión"
// Aparece al entrar a la página; se puede cerrar con la X,
// con el botón "Entendido" o haciendo clic fuera del modal
// ------------------------------------------------------------
(function initOfflineModal() {
    const modal = document.getElementById('offlineModal');
    if (!modal) return;
    const closeBtn = document.getElementById('closeOfflineModal');
    const dismissBtn = document.getElementById('dismissOfflineModal');
    function hideModal() { modal.classList.add('hidden'); }
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (dismissBtn) dismissBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
})();