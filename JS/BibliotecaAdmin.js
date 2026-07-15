// ============================================================
// BibliotecaAdmin.js — Lógica de la página "Biblioteca"
// ============================================================

const LIBROS_INICIALES = [
  { titulo: "Código Penal Federal",    autor: "Edición 2026",     categoria: "Códigos Penales" },
  { titulo: "Código Penal de Chiapas", autor: "Edición 2025",     categoria: "Códigos Penales" },
  { titulo: "Código Civil Federal",    autor: "Compilación 2026", categoria: "Código Civil" },
  { titulo: "Código Civil de Chiapas", autor: "Edición 2025",     categoria: "Código Civil" },
  { titulo: "Ley Estatal de Trabajo",  autor: "Chiapas · 2025",   categoria: "Leyes Estatales" },
  { titulo: "Ley de Tránsito Estatal", autor: "Chiapas · 2026",   categoria: "Leyes Estatales" },
  { titulo: "Código de Comercio",      autor: "Compilación 2026", categoria: "Doctrina/Libros" },
  { titulo: "Teoría del Derecho Penal", autor: "García Máynez",   categoria: "Doctrina/Libros" },
];

/* Color de etiqueta por categoría: cada categoría tiene su propio
   color ÚNICO dentro de la Biblioteca (no se repiten entre sí).
   El color del libro se deriva SIEMPRE de su categoría. */
const CATEGORIA_COLORES = {
  "Códigos Penales": "#DC2626", // Rojo
  "Código Civil":    "#1D4ED8", // Azul
  "Leyes Estatales": "#047857", // Verde
  "Doctrina/Libros": "#D97706", // Ámbar
};

function colorCategoria(categoria) {
  return CATEGORIA_COLORES[categoria] || "#475569";
}

/* Usuario con sesión activa: biblioteca y descargas por usuario */
const USUARIO_ACTUAL = sessionStorage.getItem("lawpocket_user") || "ADMIN01";

/* ============================================================
   LIBROS — ALMACÉN POR USUARIO (sessionStorage)
   La biblioteca es individual: cada usuario parte de los libros
   predefinidos del despacho (LIBROS_INICIALES) y sus cambios
   (libros personales, ediciones, bajas) solo afectan SU copia.
============================================================ */
const LIBROS_KEY = "lawpocket_libros::" + USUARIO_ACTUAL;

function obtenerLibros() {
  try {
    const raw = sessionStorage.getItem(LIBROS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudo leer la biblioteca del usuario:", e);
  }
  guardarLibros(LIBROS_INICIALES.map((l) => ({ ...l })));
  return LIBROS_INICIALES.map((l) => ({ ...l }));
}

function guardarLibros(lista) {
  try {
    sessionStorage.setItem(LIBROS_KEY, JSON.stringify(lista));
  } catch (e) {
    console.warn("No se pudo guardar la biblioteca del usuario:", e);
  }
}

let libros = obtenerLibros();
let categoriaActiva = "Todos";
let textoBusqueda = "";
let tituloEnEdicion = null;   // null = agregando; string = título original del libro editado
let libroAEliminar = null;    // título del libro pendiente de eliminar
let guardadoPendiente = null; // función a ejecutar tras aceptar el aviso de copyright

/* ============================================================
   REFERENCIAS AL DOM
   ============================================================ */
const booksGrid = document.getElementById("booksGrid");
const emptyState = document.getElementById("emptyState");
const inputBusqueda = document.getElementById("inputBusqueda");
const tabsCategorias = document.getElementById("tabsCategorias");

const modalLibro = document.getElementById("modalLibro");
const modalLibroTitulo = document.getElementById("modalLibroTitulo");
const modalLibroDescripcion = document.getElementById("modalLibroDescripcion");
const btnAgregarLibro = document.getElementById("btnAgregarLibro");
const btnGuardarLibro = document.getElementById("btnGuardarLibro");

const campoTitulo = document.getElementById("campoTitulo");
const campoAutor = document.getElementById("campoAutor");
const campoCategoria = document.getElementById("campoCategoria");
const labelTitulo = document.getElementById("labelTitulo");
const labelAutor = document.getElementById("labelAutor");
const errorTitulo = document.getElementById("errorTitulo");
const errorAutor = document.getElementById("errorAutor");
const errorLibro = document.getElementById("errorLibro");
const errorLibroTexto = document.getElementById("errorLibroTexto");

const dropzonePdf = document.getElementById("dropzonePdf");
const dropzonePlaceholder = document.getElementById("dropzonePlaceholder");
const dropzoneFile = document.getElementById("dropzoneFile");
const dropzoneFilename = document.getElementById("dropzoneFilename");
const btnQuitarPdf = document.getElementById("btnQuitarPdf");
const campoPdf = document.getElementById("campoPdf");
let pdfSeleccionado = "";

const modalCopyright = document.getElementById("modalCopyright");
const checkCopyright = document.getElementById("checkCopyright");
const btnAceptarCopyright = document.getElementById("btnAceptarCopyright");

const modalEliminar = document.getElementById("modalEliminar");
const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");

const modalExito = document.getElementById("modalExito");
const mensajeExito = document.getElementById("mensajeExito");

const modalDescarga = document.getElementById("modalDescarga");
const nombreArchivoDescarga = document.getElementById("nombreArchivoDescarga");

/* ============================================================
   UTILIDADES
   ============================================================ */

/* Renderiza los iconos de Lucide con protección ante fallos del CDN */
function refrescarIconos() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  } catch (e) {
    console.warn("No se pudieron renderizar los iconos de Lucide:", e);
  }
}

function abrirModal(modal) {
  modal.hidden = false;
  refrescarIconos();
}

function cerrarModal(modal) {
  modal.hidden = true;
}

function mostrarExito(mensaje) {
  mensajeExito.textContent = mensaje;
  abrirModal(modalExito);
}

/* Normaliza un texto para comparaciones (sin espacios extra, en minúsculas) */
function normalizar(texto) {
  return (texto || "").trim().toLowerCase();
}

/* Escapa caracteres especiales de HTML para evitar inyección al renderizar */
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

/* ============================================================
   MIS DESCARGAS — ALMACÉN COMPARTIDO (sessionStorage)
   Mismo almacén que usan "Mis Descargas" y "Manuales de Usuario":
   toda descarga se registra aquí para aparecer en esa sección.
============================================================ */
const DESCARGAS_KEY = "lawpocket_descargas::" + USUARIO_ACTUAL;

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

/* Fecha de hoy con el formato de "Mis Descargas", p. ej. "09 Jul 2026" */
function fechaHoy() {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const hoy = new Date();
    return String(hoy.getDate()).padStart(2, "0") + " " + meses[hoy.getMonth()] + " " + hoy.getFullYear();
}

/* Tamaño simulado y estable a partir del nombre (demo sin backend) */
function tamanoSimulado(nombre) {
    let h = 0;
    for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ((h % 70 + 12) / 10).toFixed(1) + " MB";
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
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;";
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

/* Intenta registrar la descarga en "Mis Descargas".
   Devuelve false si el archivo ya estaba descargado: en ese caso
   muestra el aviso emergente y NO se repite la descarga. */
function intentarDescarga(nombreArchivo) {
    const descargas = obtenerDescargas();
    const existente = descargas.find((d) => d.name === nombreArchivo);
    if (existente) {
        // El documento original había sido eliminado y ahora vuelve a
        // descargarse: se reactiva la descarga con la fecha actual
        if (existente.eliminado) {
            delete existente.eliminado;
            delete existente.desactualizado;
            existente.date = fechaHoy();
            guardarDescargas(descargas);
            return true;
        }
        if (existente.desactualizado) {
            mostrarAvisoDescarga("Documento actualizado",
                '"' + nombreArchivo + '" se actualizó después de tu descarga. Elimina la descarga en "Mis Descargas" y vuelve a descargarlo para reinstalarlo con la actualización.');
        } else {
            mostrarAvisoDescarga("Descarga duplicada",
                '"' + nombreArchivo + '" ya está descargado para consulta offline. No es posible volver a realizar esta acción.');
        }
        return false;
    }
    descargas.unshift({ name: nombreArchivo, size: tamanoSimulado(nombreArchivo), date: fechaHoy() });
    guardarDescargas(descargas);
    return true;
}

/* Marca la descarga de un documento como desactualizada (cuando el
   documento fuente se edita después de haberse descargado).
   El aviso llega a TODOS los usuarios que lo hayan descargado. */
function marcarDescargaDesactualizada(nombreArchivo) {
    marcarEnTodasLasDescargas(nombreArchivo, "desactualizado");
}

/* Marca la descarga de un documento como eliminada (cuando el
   documento fuente se borra del sistema después de descargarse).
   La copia offline sigue disponible; "Mis Descargas" solo avisa
   que el original ya no existe. El aviso llega a TODOS los
   usuarios que lo hayan descargado. */
function marcarDescargaEliminada(nombreArchivo) {
    marcarEnTodasLasDescargas(nombreArchivo, "eliminado");
}

/* Recorre las listas de descargas de TODOS los usuarios (claves
   "lawpocket_descargas::<usuario>") y aplica la marca indicada
   al archivo, si ese usuario lo tenía descargado. */
function marcarEnTodasLasDescargas(nombreArchivo, marca) {
    for (let i = 0; i < sessionStorage.length; i++) {
        const clave = sessionStorage.key(i);
        if (!clave || clave.indexOf("lawpocket_descargas::") !== 0) continue;
        try {
            const lista = JSON.parse(sessionStorage.getItem(clave)) || [];
            const d = lista.find((x) => x.name === nombreArchivo);
            if (d && !d[marca]) {
                d[marca] = true;
                sessionStorage.setItem(clave, JSON.stringify(lista));
            }
        } catch (e) {
            console.warn("No se pudo marcar la descarga en", clave, e);
        }
    }
}


/* ============================================================
   VALIDACIÓN DE DUPLICADOS
   ============================================================ */

/* Devuelve true si ya existe un libro con el mismo título y autor
   (comparación normalizada), excluyendo al libro que se está editando */
function existeDuplicado(listaLibros, titulo, autor, tituloExcluido) {
  return listaLibros.some(
    (l) =>
      l.titulo !== tituloExcluido &&
      normalizar(l.titulo) === normalizar(titulo) &&
      normalizar(l.autor) === normalizar(autor)
  );
}

/* ============================================================
   RENDERIZADO DE LA CUADRÍCULA
   ============================================================ */
function obtenerLibrosFiltrados() {
  const busqueda = normalizar(textoBusqueda);
  return libros.filter((l) => {
    const coincideCategoria = categoriaActiva === "Todos" || l.categoria === categoriaActiva;
    const coincideBusqueda =
      normalizar(l.titulo).includes(busqueda) ||
      normalizar(l.autor).includes(busqueda);
    return coincideCategoria && coincideBusqueda;
  });
}

function renderizarLibros() {
  const filtrados = obtenerLibrosFiltrados();

  booksGrid.innerHTML = filtrados
    .map((libro) => {
      const tituloSeguro = escaparHTML(libro.titulo);
      const autorSeguro = escaparHTML(libro.autor);
      const colorLibro = colorCategoria(libro.categoria);
      return `
      <article class="book-card">
        <div class="book-cover"
             style="background: linear-gradient(160deg, ${colorLibro} 0%, ${colorLibro}cc 60%, ${colorLibro}99 100%);">
          <div class="book-spine"></div>
          <i data-lucide="book-open" class="book-cover-icon"></i>
          <button class="book-edit-btn" data-accion="editar" data-titulo="${tituloSeguro}" title="Editar libro" aria-label="Editar libro">
            <i data-lucide="pencil"></i>
          </button>
          <div class="book-cover-text">
            <p class="book-title">${tituloSeguro}</p>
            <p class="book-subtitle">${autorSeguro}</p>
          </div>
        </div>
        <div class="book-actions">
          <button class="btn-leer" data-accion="leer" data-titulo="${tituloSeguro}">Leer</button>
          <button class="btn-descargar" data-accion="descargar" data-titulo="${tituloSeguro}" title="Descargar" aria-label="Descargar">
            <i data-lucide="download"></i>
          </button>
          <button class="btn-eliminar" data-accion="eliminar" data-titulo="${tituloSeguro}" title="Eliminar libro" aria-label="Eliminar libro">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </article>`;
    })
    .join("");

  emptyState.hidden = filtrados.length > 0;
  refrescarIconos();
}

/* ============================================================
   BÚSQUEDA Y PESTAÑAS
   ============================================================ */
inputBusqueda.addEventListener("input", (e) => {
  textoBusqueda = e.target.value;
  renderizarLibros();
});

tabsCategorias.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  categoriaActiva = tab.dataset.categoria;
  tabsCategorias.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  renderizarLibros();
});

/* ============================================================
   ACCIONES DE LAS TARJETAS (editar / descargar / eliminar)
   ============================================================ */
booksGrid.addEventListener("click", (e) => {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;

  const titulo = boton.dataset.titulo;
  const accion = boton.dataset.accion;

  if (accion === "editar") {
    const libro = libros.find((l) => l.titulo === titulo);
    if (libro) abrirEdicion(libro);
  } else if (accion === "descargar") {
    /* La descarga se registra en "Mis Descargas"; si el libro ya
       estaba descargado se muestra un aviso y no se repite */
    const nombreArchivo = `${titulo}.pdf`;
    if (!intentarDescarga(nombreArchivo)) return;
    nombreArchivoDescarga.textContent = nombreArchivo;
    abrirModal(modalDescarga);
  } else if (accion === "eliminar") {
    libroAEliminar = titulo;
    abrirModal(modalEliminar);
  }
  /* La acción "leer" queda pendiente de integrarse con el visor de PDF */
});

/* ============================================================
   MODAL DE LIBRO: ABRIR EN MODO AGREGAR / EDITAR
   ============================================================ */
function limpiarErroresFormulario() {
  labelTitulo.classList.remove("label-error");
  labelAutor.classList.remove("label-error");
  campoTitulo.classList.remove("input-error");
  campoAutor.classList.remove("input-error");
  errorTitulo.hidden = true;
  errorAutor.hidden = true;
  errorLibro.hidden = true;
}

function establecerPdf(nombre) {
  pdfSeleccionado = nombre;
  /* El texto se sincroniza SIEMPRE (incluso al quitar) para que nunca
     quede visible el nombre de un PDF anterior */
  dropzoneFilename.textContent = nombre;
  if (nombre) {
    dropzoneFile.hidden = false;
    dropzonePlaceholder.hidden = true;
  } else {
    dropzoneFile.hidden = true;
    dropzonePlaceholder.hidden = false;
  }
}

function abrirAgregar() {
  tituloEnEdicion = null;
  modalLibroTitulo.textContent = "Agregar libro personal";
  modalLibroDescripcion.textContent = "Registra un libro propio para tu biblioteca jurídica.";
  btnGuardarLibro.textContent = "Guardar";
  campoTitulo.value = "";
  campoAutor.value = "";
  campoCategoria.value = "Doctrina/Libros";
  actualizarColorSelectCategoria();
  establecerPdf("");
  limpiarErroresFormulario();
  abrirModal(modalLibro);
}

function abrirEdicion(libro) {
  tituloEnEdicion = libro.titulo;
  modalLibroTitulo.textContent = "Editar libro";
  modalLibroDescripcion.textContent = "Actualiza los datos del libro seleccionado.";
  btnGuardarLibro.textContent = "Guardar cambios";
  campoTitulo.value = libro.titulo;
  campoAutor.value = libro.autor;
  campoCategoria.value = libro.categoria;
  actualizarColorSelectCategoria();
  establecerPdf(libro.pdfNombre || "");
  limpiarErroresFormulario();
  abrirModal(modalLibro);
}

btnAgregarLibro.addEventListener("click", abrirAgregar);

/* Al escribir, se limpian los errores del campo correspondiente */
campoTitulo.addEventListener("input", () => {
  labelTitulo.classList.remove("label-error");
  campoTitulo.classList.remove("input-error");
  errorTitulo.hidden = true;
});
campoAutor.addEventListener("input", () => {
  labelAutor.classList.remove("label-error");
  campoAutor.classList.remove("input-error");
  errorAutor.hidden = true;
});

/* ============================================================
   ZONA DE ARRASTRE DEL PDF
   ============================================================ */
dropzonePlaceholder.addEventListener("click", () => campoPdf.click());

campoPdf.addEventListener("change", () => {
  if (campoPdf.files && campoPdf.files.length > 0) {
    establecerPdf(campoPdf.files[0].name);
  }
  campoPdf.value = "";
});

btnQuitarPdf.addEventListener("click", () => establecerPdf(""));

dropzonePdf.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzonePdf.classList.add("dragover");
});
dropzonePdf.addEventListener("dragleave", () => dropzonePdf.classList.remove("dragover"));
dropzonePdf.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzonePdf.classList.remove("dragover");
  const archivo = e.dataTransfer.files && e.dataTransfer.files[0];
  if (archivo && archivo.name.toLowerCase().endsWith(".pdf")) {
    establecerPdf(archivo.name);
  }
});

/* ============================================================
   GUARDADO DEL LIBRO (VALIDACIÓN + COMMIT)
   ============================================================ */


/* ============================================================
   COMBO DE CATEGORÍA CON PUNTITO DE COLOR
   Cada opción del select muestra "●" con el color de su
   categoría, visible al desplegar el combo.
============================================================ */
function decorarSelectCategoria() {
  Array.from(campoCategoria.options).forEach((opt) => {
    const color = CATEGORIA_COLORES[opt.value];
    if (!color) return;
    if (opt.textContent.indexOf("●") !== 0) {
      opt.textContent = "● " + opt.textContent;
    }
    opt.style.color = color;
  });
  actualizarColorSelectCategoria();
}

// El valor seleccionado del combo también se pinta con su color
function actualizarColorSelectCategoria() {
  campoCategoria.style.color = CATEGORIA_COLORES[campoCategoria.value] || "";
}

function guardarLibro() {
  limpiarErroresFormulario();

  const titulo = campoTitulo.value;
  const autor = campoAutor.value;
  const categoria = campoCategoria.value;
  let hayError = false;

  /* Validación: campos obligatorios */
  if (!titulo.trim()) {
    labelTitulo.classList.add("label-error");
    campoTitulo.classList.add("input-error");
    errorTitulo.hidden = false;
    hayError = true;
  }
  if (!autor.trim()) {
    labelAutor.classList.add("label-error");
    campoAutor.classList.add("input-error");
    errorAutor.hidden = false;
    hayError = true;
  }
  if (hayError) return;

  /* Validación: archivo PDF obligatorio */
  if (!pdfSeleccionado.trim()) {
    errorLibroTexto.textContent = "Error: Por favor, suba el archivo PDF.";
    errorLibro.hidden = false;
    refrescarIconos();
    return;
  }

  /* Validación: duplicados (excluye al libro en edición) */
  if (existeDuplicado(libros, titulo, autor, tituloEnEdicion)) {
    errorLibroTexto.textContent =
      "Error: Ya existe un libro registrado con este mismo nombre y edición en la base de datos.";
    errorLibro.hidden = false;
    refrescarIconos();
    return;
  }

  /* Función que aplica el guardado (se difiere si hay aviso de copyright) */
  const confirmarGuardado = () => {
    if (tituloEnEdicion === null) {
      libros.push({
        titulo: titulo.trim(),
        autor: autor.trim() || "Libro personal",
        categoria,
        pdfNombre: pdfSeleccionado,
      });
      guardarLibros(libros);
      mostrarExito("Libro agregado exitosamente.");
    } else {
      /* Si el libro ya estaba descargado, su copia offline queda
         desactualizada: se marca para avisar en "Mis Descargas" */
      marcarDescargaDesactualizada(tituloEnEdicion + ".pdf");
      libros = libros.map((l) =>
        l.titulo === tituloEnEdicion
          ? { ...l, titulo: titulo.trim(), autor: autor.trim(), categoria, pdfNombre: pdfSeleccionado }
          : l
      );
      guardarLibros(libros);
      mostrarExito("Libro actualizado exitosamente.");
    }
    cerrarModal(modalLibro);
    tituloEnEdicion = null;
    renderizarLibros();
  };

  /* Al agregar un libro nuevo se exige aceptar el aviso de copyright */
  if (tituloEnEdicion === null) {
    guardadoPendiente = confirmarGuardado;
    checkCopyright.checked = false;
    btnAceptarCopyright.disabled = true;
    abrirModal(modalCopyright);
    return;
  }
  confirmarGuardado();
}

btnGuardarLibro.addEventListener("click", guardarLibro);

/* ============================================================
   MODAL DE DERECHOS DE AUTOR
   ============================================================ */
checkCopyright.addEventListener("change", () => {
  btnAceptarCopyright.disabled = !checkCopyright.checked;
});

btnAceptarCopyright.addEventListener("click", () => {
  if (!checkCopyright.checked || !guardadoPendiente) return;
  const commit = guardadoPendiente;
  guardadoPendiente = null;
  cerrarModal(modalCopyright);
  checkCopyright.checked = false;
  btnAceptarCopyright.disabled = true;
  commit();
});

/* ============================================================
   MODAL DE ELIMINACIÓN
   ============================================================ */
btnConfirmarEliminar.addEventListener("click", () => {
  if (!libroAEliminar) return;
  /* Si el libro estaba descargado, su copia offline queda huérfana:
     se marca para avisar en "Mis Descargas" que el original fue
     eliminado (la copia se puede seguir viendo) */
  marcarDescargaEliminada(libroAEliminar + ".pdf");
  libros = libros.filter((l) => l.titulo !== libroAEliminar);
  guardarLibros(libros);
  libroAEliminar = null;
  cerrarModal(modalEliminar);
  renderizarLibros();
  mostrarExito("Libro eliminado correctamente.");
});

/* ============================================================
   CIERRE GENÉRICO DE MODALES (botones con data-close)
   ============================================================ */
document.querySelectorAll("[data-close]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const modal = document.getElementById(boton.dataset.close);
    if (!modal) return;
    cerrarModal(modal);

    /* Al cerrar el aviso de copyright sin aceptar, se descarta el guardado pendiente */
    if (modal === modalCopyright) {
      guardadoPendiente = null;
      checkCopyright.checked = false;
      btnAceptarCopyright.disabled = true;
    }
    if (modal === modalEliminar) {
      libroAEliminar = null;
    }
  });
});

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  decorarSelectCategoria();
  campoCategoria.addEventListener("change", actualizarColorSelectCategoria);

  renderizarLibros();
  refrescarIconos();
});

/* Exporta utilidades para pruebas automatizadas (jsdom / Node) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { existeDuplicado, normalizar };
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