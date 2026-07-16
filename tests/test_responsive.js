/* ============================================================
   test_responsive.js — Suite de la capa móvil de LawPocket
   ------------------------------------------------------------
   Verifica, con jsdom:

   A. Inyección: las 13 páginas con sidebar referencian
      responsive.css y responsive.js; Login e index no.
   B. Drawer: el botón hamburguesa se crea como primer hijo
      de la topbar, abre/cierra el sidebar, el overlay y
      Escape lo cierran, y aria-expanded se actualiza.
   C. Tablas → tarjetas: los <td> reciben data-label desde el
      <thead>, incluso tras re-render dinámico (MutationObserver),
      y las celdas colspan quedan sin etiqueta.
   D. Service worker: versión v7 y ambos archivos en el shell.
   E. SidebarAdmin.css ya no colapsa a iconos (lo hace el drawer).

   Uso, parado en la raíz del proyecto:
       npm install jsdom   (una sola vez)
       node tests/test_responsive.js
============================================================ */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const RAIZ = path.resolve(__dirname, "..");
const PAGINAS = path.join(RAIZ, "Paginas");

let total = 0;
let fallos = 0;

function assert(condicion, mensaje) {
    total++;
    if (condicion) {
        console.log("  ✔ " + mensaje);
    } else {
        fallos++;
        console.log("  ✘ FALLO: " + mensaje);
    }
}

/* ------------------------------------------------------------
   A. INYECCIÓN EN PÁGINAS
------------------------------------------------------------ */
console.log("\nA. Inyección de responsive.css / responsive.js");

const CON_SIDEBAR = [
    "PanelAnaliticoAdmin.html", "GestionUsuariosAdmin.html",
    "SistemaAlmacenamientoAdmin.html", "AgendaAdmin.html",
    "ExpedientesAdmin.html", "BibliotecaAdmin.html",
    "MisDescargasAdmin.html", "ManualesUsuarioAdmin.html",
    "AgendaAbogado.html", "ExpedientesAbogado.html",
    "BibliotecaAbogado.html", "MisDescargasAbogado.html",
    "ManualesUsuarioAbogado.html",
];
const SIN_SIDEBAR = ["Login.html"];
// index.html vive en la raíz (para Vercel), no en Paginas/
const SIN_SIDEBAR_RAIZ = ["index.html"];

for (const nombre of CON_SIDEBAR) {
    const html = fs.readFileSync(path.join(PAGINAS, nombre), "utf-8");
    assert(html.includes("CSS/responsive.css"), nombre + " enlaza responsive.css");
    assert(html.includes("JS/responsive.js"), nombre + " enlaza responsive.js");
    assert(html.includes('name="viewport"'), nombre + " tiene meta viewport");
    const posCss = html.lastIndexOf("CSS/responsive.css");
    const otrosCss = [...html.matchAll(/CSS\/[A-Za-z]+\.css/g)].map(m => m.index);
    assert(otrosCss.every(i => i <= posCss), nombre + ": responsive.css es la última hoja de estilos");
}

for (const nombre of SIN_SIDEBAR) {
    const html = fs.readFileSync(path.join(PAGINAS, nombre), "utf-8");
    assert(!html.includes("responsive.css") && !html.includes("responsive.js"),
        nombre + " NO lleva capa de drawer (sin sidebar)");
}

for (const nombre of SIN_SIDEBAR_RAIZ) {
    const html = fs.readFileSync(path.join(RAIZ, nombre), "utf-8");
    assert(!html.includes("responsive.css") && !html.includes("responsive.js"),
        nombre + " (raíz) NO lleva capa de drawer (sin sidebar)");
}

/* ------------------------------------------------------------
   Utilidad: montar una página real y ejecutar responsive.js
------------------------------------------------------------ */
const CODIGO_RESPONSIVE = fs.readFileSync(path.join(RAIZ, "JS", "responsive.js"), "utf-8");

function montarPagina(nombreHtml) {
    const html = fs.readFileSync(path.join(PAGINAS, nombreHtml), "utf-8");
    const dom = new JSDOM(html, { runScripts: "outside-only" });
    // Ejecutar SOLO responsive.js (los scripts externos de la página
    // no se cargan en jsdom) y disparar DOMContentLoaded a mano.
    dom.window.eval(CODIGO_RESPONSIVE);
    dom.window.document.dispatchEvent(
        new dom.window.Event("DOMContentLoaded", { bubbles: true })
    );
    return dom;
}

/* ------------------------------------------------------------
   B. DRAWER
------------------------------------------------------------ */
console.log("\nB. Drawer (hamburguesa + overlay + Escape)");

{
    const dom = montarPagina("ExpedientesAdmin.html");
    const doc = dom.window.document;
    const sidebar = doc.querySelector(".sidebar");
    const topbar = doc.querySelector(".topbar");
    const boton = doc.getElementById("hamburgerBtn");
    const overlay = doc.getElementById("drawerOverlay");

    assert(!!boton, "el botón hamburguesa existe");
    assert(topbar.firstElementChild === boton, "la hamburguesa es el PRIMER elemento de la topbar");
    assert(boton.getAttribute("aria-label") !== null, "la hamburguesa tiene aria-label");
    assert(!!overlay, "el overlay del drawer existe en el body");

    boton.click();
    assert(sidebar.classList.contains("drawer-open"), "clic en hamburguesa ABRE el drawer");
    assert(overlay.classList.contains("visible"), "el overlay se hace visible al abrir");
    assert(doc.body.classList.contains("drawer-lock"), "el body bloquea el scroll al abrir");
    assert(boton.getAttribute("aria-expanded") === "true", "aria-expanded pasa a true");

    boton.click();
    assert(!sidebar.classList.contains("drawer-open"), "segundo clic CIERRA el drawer");
    assert(boton.getAttribute("aria-expanded") === "false", "aria-expanded regresa a false");

    boton.click();
    overlay.click();
    assert(!sidebar.classList.contains("drawer-open"), "clic en el overlay cierra el drawer");

    boton.click();
    doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert(!sidebar.classList.contains("drawer-open"), "la tecla Escape cierra el drawer");
    assert(!doc.body.classList.contains("drawer-lock"), "el scroll del body se libera al cerrar");
}

{
    // Página con layout .main-area (topbar con título)
    const dom = montarPagina("GestionUsuariosAdmin.html");
    const doc = dom.window.document;
    assert(!!doc.getElementById("hamburgerBtn"),
        "GestionUsuarios (.main-area) también recibe hamburguesa");
    doc.getElementById("hamburgerBtn").click();
    assert(doc.querySelector(".sidebar").classList.contains("drawer-open"),
        "el drawer funciona en el layout .main-area");
}

/* ------------------------------------------------------------
   C. TABLAS → TARJETAS (data-label)
------------------------------------------------------------ */
console.log("\nC. Etiquetado automático de tablas");

{
    const dom = montarPagina("ExpedientesAdmin.html");
    const doc = dom.window.document;
    const tbody = doc.getElementById("tableBody");

    // Simular el render dinámico del módulo (como hace ExpedientesAdmin.js)
    tbody.innerHTML =
        "<tr><td>EXP-2026-045</td><td>01/06/2026</td><td>García López</td>" +
        "<td>Mercantil</td><td>En proceso</td><td>ABG01</td><td>—</td><td>…</td></tr>";

    // El MutationObserver corre como microtarea: darle un ciclo
    setTimeout(() => {
        const celdas = tbody.querySelectorAll("td");
        assert(celdas[0].getAttribute("data-label") === "ID del Caso",
            "la 1ª celda hereda la etiqueta 'ID del Caso' del thead");
        assert(celdas[2].getAttribute("data-label") === "Cliente",
            "la 3ª celda hereda la etiqueta 'Cliente'");
        assert(celdas[7].getAttribute("data-label") === "Acciones",
            "la última celda hereda la etiqueta 'Acciones'");

        // Re-render (segunda mutación) + celda colspan de mensaje
        tbody.innerHTML =
            '<tr><td colspan="8" class="no-results-cell">Sin resultados</td></tr>';
        setTimeout(() => {
            const celdaMsg = tbody.querySelector("td");
            assert(!celdaMsg.hasAttribute("data-label"),
                "las celdas colspan (mensajes) NO reciben data-label");
            parteD();
        }, 0);
    }, 0);
}

/* ------------------------------------------------------------
   D + E. SERVICE WORKER Y SIDEBAR CSS
------------------------------------------------------------ */
function parteD() {
    console.log("\nD. Service worker");
    const sw = fs.readFileSync(path.join(RAIZ, "sw.js"), "utf-8");
    assert(sw.includes("const VERSION = 'lawpocket-v8';"), "VERSION subida a lawpocket-v8");
    assert(sw.includes("'CSS/responsive.css',"), "responsive.css está en ARCHIVOS_APP");
    assert(sw.includes("'JS/responsive.js',"), "responsive.js está en ARCHIVOS_APP");

    // cache.addAll es atómico: toda ruta del shell debe existir en disco
    const bloque = sw.split("ARCHIVOS_APP = [")[1].split("];")[0];
    const rutas = [...bloque.matchAll(/'([^']+)'/g)].map(m => m[1]);
    const faltantes = rutas.filter(r => !fs.existsSync(path.join(RAIZ, r)));
    assert(faltantes.length === 0,
        "todas las rutas de ARCHIVOS_APP existen en disco" +
        (faltantes.length ? " (faltan: " + faltantes.join(", ") + ")" : ""));

    console.log("\nE. SidebarAdmin.css y responsive.css");
    const sidebarCss = fs.readFileSync(path.join(RAIZ, "CSS", "SidebarAdmin.css"), "utf-8");
    assert(!sidebarCss.includes("width: 70px"),
        "el viejo colapso a iconos (70px) fue retirado de SidebarAdmin.css");

    const respCss = fs.readFileSync(path.join(RAIZ, "CSS", "responsive.css"), "utf-8");
    assert(respCss.includes("max-width: 1024px") && respCss.includes(".sidebar.drawer-open"),
        "responsive.css define el drawer en ≤1024px");
    assert(respCss.includes("attr(data-label)"),
        "responsive.css pinta las etiquetas de tarjeta con attr(data-label)");
    assert(respCss.includes("max-width: 480px"),
        "responsive.css incluye ajustes finos para teléfonos (≤480px)");

    console.log("\n============================================");
    console.log("Resultado: " + (total - fallos) + "/" + total + " aserciones correctas");
    console.log("============================================");
    process.exit(fallos === 0 ? 0 : 1);
}
