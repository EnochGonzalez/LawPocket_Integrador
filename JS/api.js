// ============================================================
// api.js — Capa de acceso al API REST de LawPocket
// ------------------------------------------------------------
// Backend: Java (Javalin) + MariaDB en AWS EC2.
// Este módulo centraliza TODAS las llamadas al servidor y traduce
// entre el formato del frontend y el formato del API, para que el
// resto de la aplicación nunca tenga que conocer esa asimetría.
//
// ESTADO ACTUAL (contrato acordado con backend):
//   ✔ GET  /api/usuarios     — vivo
//   ✔ POST /api/usuarios     — vivo
//   ⏳ POST /api/login        — pendiente en backend (JWT)
//   ⏳ Subida/descarga de PDF — pendiente en backend
//
// ASIMETRÍA DE CAMPOS (documentada por el equipo de backend):
//   Al CREAR se envía:  id_acceso, contrasena, id_estado_usuario
//   Al LEER se recibe:  login,     (no viene), id_estado
// Las funciones desdeApiUsuario()/haciaApiUsuario() resuelven esto.
// ============================================================

/* ============================================================
   CONFIGURACIÓN
   Nota de despliegue: el API corre sobre HTTP (sin HTTPS). Los
   service workers requieren HTTPS en producción; si el frontend
   se sirve por HTTPS, el navegador bloqueará estas llamadas por
   "contenido mixto". Pendiente de resolver con el equipo.
============================================================ */
const API_BASE = "http://34.192.25.0:7000/api";
const API_TIMEOUT_MS = 10000; // 10 segundos

/* ============================================================
   CATÁLOGOS — mapeo de IDs numéricos de la base de datos
============================================================ */

// id_rol en la BD ⇄ nombre de rol en el frontend
const ROLES_API = { 6: "Socio", 7: "Abogado", 8: "Asistente" };
const ROLES_FRONTEND = { "Socio": 6, "Abogado": 7, "Asistente": 8 };

// id_estado_usuario en la BD (solo 1=Activo está confirmado;
// TODO: confirmar con backend el ID del estado "baja/inactivo")
const ESTADO_ACTIVO = 1;

/* ============================================================
   ERROR PERSONALIZADO
   Permite distinguir errores del API (status HTTP) de errores
   de red (sin conexión, timeout) en los módulos que lo usen.
============================================================ */
class ApiError extends Error {
    constructor(mensaje, status, detalle) {
        super(mensaje);
        this.name = "ApiError";
        this.status = status ?? 0; // 0 = sin conexión / timeout
        this.detalle = detalle;
    }
}

/* ============================================================
   WRAPPER DE FETCH
   Centraliza: URL base, encabezados JSON, timeout y manejo de
   errores HTTP (400/404/500 según el contrato del backend).
   Cuando exista el login con JWT, aquí se agregará el encabezado
   Authorization: Bearer <token> en un solo lugar.
============================================================ */
async function apiFetch(ruta, opciones = {}) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), API_TIMEOUT_MS);

    let respuesta;
    try {
        respuesta = await fetch(API_BASE + ruta, {
            headers: { "Content-Type": "application/json" },
            signal: controlador.signal,
            ...opciones
        });
    } catch (e) {
        clearTimeout(temporizador);
        throw new ApiError(
            "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
            0, e && e.message
        );
    }
    clearTimeout(temporizador);

    if (!respuesta.ok) {
        let detalle = null;
        try { detalle = await respuesta.text(); } catch (e) { /* sin cuerpo */ }
        const mensajes = {
            400: "La solicitud tiene datos inválidos (400).",
            404: "El recurso solicitado no existe (404).",
            500: "Ocurrió un error en el servidor (500)."
        };
        throw new ApiError(
            mensajes[respuesta.status] || ("Error del servidor (" + respuesta.status + ")."),
            respuesta.status, detalle
        );
    }

    // Algunas respuestas (ej. altas) pueden venir sin cuerpo JSON
    try { return await respuesta.json(); }
    catch (e) { return null; }
}

/* ============================================================
   TRADUCCIONES DE USUARIO (frontend ⇄ API)

   Convención del despacho para el nombre completo (una sola
   cadena en el frontend): "Apellidos Apellidos Nombre(s)".
   Ej. "Nucamendi Ruiz Leonardo" → apellidos: "Nucamendi Ruiz",
   nombre: "Leonardo". La validación de Gestión de Usuarios ya
   exige mínimo 3 palabras (dos apellidos), lo que garantiza que
   esta separación siempre sea posible. El prefijo "Lic." se
   descarta antes de separar.
============================================================ */

// Separa el nombre completo del frontend en { nombre, apellidos }
function separarNombreCompleto(nombreCompleto) {
    const limpio = (nombreCompleto || "").replace(/^Lic\.?\s+/i, "").trim();
    const palabras = limpio.split(/\s+/).filter(Boolean);
    return {
        apellidos: palabras.slice(0, 2).join(" "),
        nombre: palabras.slice(2).join(" ")
    };
}

// Usuario del API (GET /usuarios) → usuario del frontend
function desdeApiUsuario(u) {
    return {
        id: u.id,
        nombre: ((u.apellidos || "") + " " + (u.nombre || "")).trim(),
        userId: u.login,
        telefono: u.telefono || "",
        rol: ROLES_API[u.id_rol] || "Abogado",
        activo: u.id_estado === ESTADO_ACTIVO
    };
}

// Usuario del frontend → cuerpo JSON para POST /usuarios
function haciaApiUsuario(u) {
    const { nombre, apellidos } = separarNombreCompleto(u.nombre);
    return {
        nombre: nombre,
        apellidos: apellidos,
        id_acceso: (u.userId || "").toUpperCase(),
        contrasena: u.password,
        telefono: u.telefono,
        id_rol: ROLES_FRONTEND[u.rol] ?? ROLES_FRONTEND["Abogado"],
        id_estado_usuario: ESTADO_ACTIVO
    };
}

/* ============================================================
   MÓDULO DE USUARIOS
============================================================ */
const usuariosApi = {
    // GET /api/usuarios → lista de usuarios en formato del frontend
    async listar() {
        const datos = await apiFetch("/usuarios");
        return (datos || []).map(desdeApiUsuario);
    },

    // POST /api/usuarios → crea un usuario (recibe formato frontend)
    async crear(usuarioFrontend) {
        return apiFetch("/usuarios", {
            method: "POST",
            body: JSON.stringify(haciaApiUsuario(usuarioFrontend))
        });
    }
};

/* ============================================================
   MÓDULOS PENDIENTES (se completarán cuando el backend publique
   los endpoints; la migración del frontend será en un solo paso)
============================================================ */
const authApi = {
    // TODO backend: POST /api/login → { token JWT, usuario }
    async login() {
        throw new ApiError("El endpoint de login aún no está disponible en el backend.", 501);
    }
};

/* ============================================================
   EXPORTACIÓN
   En el navegador queda disponible como window.LawPocketAPI;
   en Node (pruebas automatizadas) como module.exports.
============================================================ */
const LawPocketAPI = {
    API_BASE,
    ApiError,
    apiFetch,
    separarNombreCompleto,
    desdeApiUsuario,
    haciaApiUsuario,
    usuarios: usuariosApi,
    auth: authApi
};

if (typeof window !== "undefined") {
    window.LawPocketAPI = LawPocketAPI;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = LawPocketAPI;
}
