// ===================================================================
// GestionUsuariosAdmin.js — Lógica de la página "Gestión de Usuarios"
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

// ------------------------------------------------------------
// Utilidades de modales: abrir / cerrar por id
// ------------------------------------------------------------
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Cualquier botón con atributo data-close="idDelModal" cierra ese modal
document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
});
// Hacer clic fuera del modal (en el fondo oscuro) también lo cierra
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// Muestra el modal de éxito ("¡Operación exitosa!") con un mensaje personalizado
function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    openModal('successModal');
}

// ------------------------------------------------------------
// Datos de usuarios (lista inicial de prueba) y estado de la página
// ------------------------------------------------------------
let users = [
    { id: 1, nombre: 'González Velasco Santos Enoch', userId: 'ADMIN01', telefono: '961 123 4567', rol: 'Socio', activo: true },
    { id: 2, nombre: 'Nucamendi Ruiz Leonardo', userId: 'ABG01', telefono: '961 234 5678', rol: 'Abogado', activo: true },
    { id: 3, nombre: 'Rodriguez Cruz Pablo Isaias', userId: 'ABG02', telefono: '961 345 6789', rol: 'Abogado', activo: true },
    { id: 4, nombre: 'Abogado de Prueba', userId: 'ABG03', telefono: '961 456 7890', rol: 'Abogado', activo: true },
];
let searchTerm = '';      // Texto actual del buscador
let deleteTargetId = null; // Id del usuario que se va a eliminar (pendiente de confirmar)

// ------------------------------------------------------------
// Normalizadores para comparar datos sin importar mayúsculas,
// espacios de más o el formato del teléfono
// ------------------------------------------------------------

// Nombre: minúsculas y espacios múltiples reducidos a uno
// ("  Abogado   de Prueba " se compara igual que "abogado de prueba")
function normText(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Teléfono: solo dígitos ("961 456 7890" se compara igual que "9614567890")
function normPhone(str) {
    return str.replace(/\D/g, '');
}

// ------------------------------------------------------------
// Validación de duplicados
// Revisa si el nombre, el ID o el teléfono ya pertenecen a otro
// usuario. excludeId permite ignorar al propio usuario cuando se
// edita (para que no se detecte a sí mismo como duplicado).
// Devuelve una lista de conflictos: { field, message }
// ------------------------------------------------------------
function findDuplicates({ nombre, userId, telefono }, excludeId = null) {
    const conflicts = [];
    const others = users.filter((u) => u.id !== excludeId);

    const dupNombre = others.find((u) => normText(u.nombre) === normText(nombre));
    if (dupNombre) {
        conflicts.push({ field: 'nombre', message: `Este nombre ya está registrado (${dupNombre.userId}).` });
    }

    const dupId = others.find((u) => u.userId.toUpperCase() === userId.toUpperCase());
    if (dupId) {
        conflicts.push({ field: 'userId', message: `El ID ${userId.toUpperCase()} ya está asignado a ${dupId.nombre}.` });
    }

    const dupTel = others.find((u) => normPhone(u.telefono) === normPhone(telefono));
    if (dupTel) {
        conflicts.push({ field: 'telefono', message: `Este teléfono ya está registrado (${dupTel.nombre}).` });
    }

    return conflicts;
}

// ------------------------------------------------------------
// Renderizado de la tabla de abogados
// Filtra por nombre o ID según el buscador, actualiza el contador
// y muestra el estado vacío si no hay resultados
// ------------------------------------------------------------
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const filtered = users.filter((u) => u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || u.userId.toLowerCase().includes(searchTerm.toLowerCase()));
    document.getElementById('userCount').textContent = users.length;

    // Sin resultados: mostrar el estado vacío
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    document.getElementById('emptyState').style.display = 'none';

    // Construir las filas de la tabla (nombre, ID, teléfono, rol, estado y acciones)
    tbody.innerHTML = filtered.map((u) => `
        <tr>
            <td class="name-cell">${escapeHtml(u.nombre)}</td>
            <td><code>${escapeHtml(u.userId)}</code></td>
            <td>${escapeHtml(u.telefono)}</td>
            <td>${escapeHtml(u.rol)}</td>
            <td><button class="status-pill ${u.activo ? 'activo' : 'baja'}" data-toggle="${u.id}">${u.activo ? 'Activo' : 'Baja'}</button></td>
            <td class="right">
                <div class="row-actions">
                    <button class="icon-btn" data-edit="${u.id}"><i data-lucide="pencil"></i></button>
                    <button class="icon-btn danger" data-delete="${u.id}"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        </tr>
    `).join('');

    // Volver a dibujar los iconos y reconectar los eventos de cada fila
    if (window.lucide) lucide.createIcons();
    attachRowEvents();
}

// Escapa caracteres especiales de HTML para evitar inyección de código
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ------------------------------------------------------------
// Eventos de cada fila: cambiar estado, editar y eliminar
// (se vuelven a conectar cada vez que se re-renderiza la tabla)
// ------------------------------------------------------------
function attachRowEvents() {
    // Pill de estado: alterna entre Activo y Baja
    document.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.toggle);
            users = users.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u));
            renderUsersTable();
        });
    });
    // Botón lápiz: abre el modal de edición con los datos del usuario
    document.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => openEditModal(Number(btn.dataset.edit)));
    });
    // Botón basura: guarda el id a eliminar y abre el modal de confirmación
    document.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', () => {
            deleteTargetId = Number(btn.dataset.delete);
            openModal('confirmModal');
        });
    });
}

// Buscador: filtra la tabla en tiempo real mientras se escribe
document.getElementById('userSearch').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderUsersTable();
});

// ------------------------------------------------------------
// Modal "Agregar nuevo abogado"
// ------------------------------------------------------------

// Limpia los errores de validación del formulario de creación
function clearCreateErrors() {
    ['nombre', 'userId', 'password', 'telefono'].forEach((f) => {
        document.getElementById(`create-${f}`).classList.remove('input-error');
        document.getElementById(`err-create-${f}`).style.display = 'none';
    });
    document.getElementById('createAlert').style.display = 'none';
}

// Abrir el modal de creación con los campos vacíos y sin errores
document.getElementById('openCreateModal').addEventListener('click', () => {
    document.getElementById('create-nombre').value = '';
    document.getElementById('create-userId').value = '';
    document.getElementById('create-password').value = '';
    document.getElementById('create-telefono').value = '';
    clearCreateErrors();
    openModal('createModal');
});

// Guardar nuevo abogado: valida campos obligatorios, verifica que el
// nombre, el ID y el teléfono no estén repetidos (la contraseña sí
// puede repetirse) y agrega el usuario a la lista
document.getElementById('saveCreateBtn').addEventListener('click', () => {
    clearCreateErrors();
    const nombre = document.getElementById('create-nombre').value.trim();
    const userId = document.getElementById('create-userId').value.trim();
    const password = document.getElementById('create-password').value.trim();
    const telefono = document.getElementById('create-telefono').value.trim();
    const rol = document.getElementById('create-rol').value;

    // Validación: marca en rojo cada campo vacío con su mensaje de error
    let hasError = false;
    const setErr = (field, msg) => {
        document.getElementById(`create-${field}`).classList.add('input-error');
        const err = document.getElementById(`err-create-${field}`);
        err.textContent = msg; err.style.display = 'block'; hasError = true;
    };
    if (!nombre) setErr('nombre', 'El nombre es obligatorio.');
    if (!userId) setErr('userId', 'El ID es obligatorio.');
    if (!password) setErr('password', 'Contraseña obligatoria.');
    if (!telefono) setErr('telefono', 'Teléfono obligatorio.');
    if (hasError) return;

    // Validación: el nombre, el ID y el teléfono no pueden repetirse
    const conflicts = findDuplicates({ nombre, userId, telefono });
    if (conflicts.length > 0) {
        // Marcar en rojo cada campo duplicado con su mensaje específico
        conflicts.forEach((c) => setErr(c.field, c.message));
        // Alerta general en el modal
        document.getElementById('createAlertText').textContent =
            'Error: Ya existe un usuario registrado con estos datos. Verifica los campos marcados.';
        document.getElementById('createAlert').style.display = 'flex';
        return;
    }

    // Todo correcto: agregar el usuario (siempre inicia como Activo)
    const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    users.push({ id: nextId, nombre, userId: userId.toUpperCase(), telefono, rol, activo: true });
    renderUsersTable();
    closeModal('createModal');
    showSuccess(`${rol} agregado exitosamente.`);
});

// ------------------------------------------------------------
// Modal "Editar abogado"
// ------------------------------------------------------------

// Limpia los errores de validación del formulario de edición
function clearEditErrors() {
    ['nombre', 'userId', 'telefono'].forEach((f) => {
        document.getElementById(`edit-${f}`).classList.remove('input-error');
        const err = document.getElementById(`err-edit-${f}`);
        if (err) err.style.display = 'none';
    });
    const alertBox = document.getElementById('editAlert');
    if (alertBox) alertBox.style.display = 'none';
}

// Abrir el modal de edición precargando los datos del usuario seleccionado
function openEditModal(id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    document.getElementById('edit-id').value = u.id;
    document.getElementById('edit-nombre').value = u.nombre;
    document.getElementById('edit-userId').value = u.userId;
    document.getElementById('edit-telefono').value = u.telefono;
    document.getElementById('edit-rol').value = u.rol;
    document.getElementById('edit-activo').value = u.activo ? 'activo' : 'baja';
    clearEditErrors();
    openModal('editModal');
}

// Guardar cambios: valida que los campos no queden vacíos, que el
// nombre, el ID y el teléfono no pertenezcan a OTRO usuario (el
// propio usuario editado no cuenta como duplicado) y actualiza la lista
document.getElementById('saveEditBtn').addEventListener('click', () => {
    const id = Number(document.getElementById('edit-id').value);
    const nombre = document.getElementById('edit-nombre').value.trim();
    const userId = document.getElementById('edit-userId').value.trim();
    const telefono = document.getElementById('edit-telefono').value.trim();
    const rol = document.getElementById('edit-rol').value;
    const activo = document.getElementById('edit-activo').value === 'activo';

    // Limpiar errores previos
    clearEditErrors();

    let hasError = false;
    const setErr = (field, msg) => {
        document.getElementById(`edit-${field}`).classList.add('input-error');
        const err = document.getElementById(`err-edit-${field}`);
        if (err) {
            err.textContent = msg;
            err.style.display = 'block';
        }
        hasError = true;
    };

    // Validaciones de campos obligatorios
    if (!nombre) setErr('nombre', 'El nombre es obligatorio.');
    if (!userId) setErr('userId', 'El ID de usuario es obligatorio.');
    if (!telefono) setErr('telefono', 'El teléfono es obligatorio.');
    if (hasError) return;

    // Validación: los datos no pueden pertenecer a otro usuario
    // (se excluye el id del usuario que se está editando)
    const conflicts = findDuplicates({ nombre, userId, telefono }, id);
    if (conflicts.length > 0) {
        conflicts.forEach((c) => setErr(c.field, c.message));
        const alertBox = document.getElementById('editAlert');
        const alertText = document.getElementById('editAlertText');
        if (alertBox && alertText) {
            alertText.textContent = 'Error: Otro usuario ya tiene estos datos. Verifica los campos marcados.';
            alertBox.style.display = 'flex';
        }
        return;
    }

    // Actualizar el usuario y refrescar la tabla
    users = users.map((u) => (u.id === id ? { ...u, nombre, userId: userId.toUpperCase(), telefono, rol, activo } : u));
    renderUsersTable();
    closeModal('editModal');
    showSuccess(`Usuario actualizado exitosamente.`);
});

// ------------------------------------------------------------
// Modal de confirmación "¿Eliminar usuario?"
// ------------------------------------------------------------

// Cancelar: cierra el modal sin eliminar
document.getElementById('cancelDeleteBtn').addEventListener('click', () => { deleteTargetId = null; closeModal('confirmModal'); });
// Confirmar: elimina definitivamente al usuario de la lista
document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    users = users.filter((x) => x.id !== deleteTargetId);
    deleteTargetId = null;
    closeModal('confirmModal');
    renderUsersTable();
    showSuccess(`Usuario eliminado.`);
});

// Primer renderizado de la tabla al cargar la página
renderUsersTable();