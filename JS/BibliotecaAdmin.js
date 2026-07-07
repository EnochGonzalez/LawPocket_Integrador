// ============================================================
// BibliotecaAdmin.js — Lógica de la página "Biblioteca"
// ============================================================

const LIBROS_INICIALES = [
  { titulo: "Código Penal Federal",    autor: "Edición 2026",     color: "#7F1D1D", categoria: "Códigos Penales" },
  { titulo: "Código Penal de Chiapas", autor: "Edición 2025",     color: "#991B1B", categoria: "Códigos Penales" },
  { titulo: "Código Civil Federal",    autor: "Compilación 2026", color: "#1E3A8A", categoria: "Código Civil" },
  { titulo: "Código Civil de Chiapas", autor: "Edición 2025",     color: "#1E40AF", categoria: "Código Civil" },
  { titulo: "Ley Estatal de Trabajo",  autor: "Chiapas · 2025",   color: "#065F46", categoria: "Leyes Estatales" },
  { titulo: "Ley de Tránsito Estatal", autor: "Chiapas · 2026",   color: "#047857", categoria: "Leyes Estatales" },
  { titulo: "Código de Comercio",      autor: "Compilación 2026", color: "#78350F", categoria: "Doctrina/Libros" },
  { titulo: "Teoría del Derecho Penal", autor: "García Máynez",   color: "#92400E", categoria: "Doctrina/Libros" },
];

/* Colores asignados a los libros personales que agregue el usuario */
const COLORES_PERSONALES = ["#4338CA", "#0E7490", "#9333EA", "#BE185D"];

let libros = LIBROS_INICIALES.map((l) => ({ ...l }));
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
      return `
      <article class="book-card">
        <div class="book-cover"
             style="background: linear-gradient(160deg, ${libro.color} 0%, ${libro.color}cc 60%, ${libro.color}99 100%);">
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
    nombreArchivoDescarga.textContent = `${titulo}.pdf`;
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
      const color = COLORES_PERSONALES[libros.length % COLORES_PERSONALES.length];
      libros.push({
        titulo: titulo.trim(),
        autor: autor.trim() || "Libro personal",
        categoria,
        color,
        pdfNombre: pdfSeleccionado,
      });
      mostrarExito("Libro agregado exitosamente.");
    } else {
      libros = libros.map((l) =>
        l.titulo === tituloEnEdicion
          ? { ...l, titulo: titulo.trim(), autor: autor.trim(), categoria, pdfNombre: pdfSeleccionado }
          : l
      );
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
  libros = libros.filter((l) => l.titulo !== libroAEliminar);
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
