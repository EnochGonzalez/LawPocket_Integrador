// ============================================================
// MisDescargas.js — Lógica de la página "Mis Descargas"
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

// ============================================================
// CONTENIDO DEL MÓDULO
// Aquí va la lógica propia de "Mis Descargas".
// ============================================================
