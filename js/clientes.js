const API = 'http://35.171.239.148:7000/api/clientes';
const modalCliente  = document.getElementById('modal-cliente');
const modalEliminar = document.getElementById('modal-eliminar');
const formCliente   = document.getElementById('form-cliente');
const modalTitulo   = document.getElementById('modal-titulo');
const tbody         = document.querySelector('#tabla-clientes tbody');
let filaAEliminar = null;
let idEnEdicion = null;   

// ---- VARIABLES GLOBALES PARA PAGINACIÓN Y FILTRADO ----
let paginaActual = 1;
const filasPorPagina = 8;
let todosLosClientes = [];     
let clientesFiltrados = [];    


async function cargarClientes() {
    try {
        const res = await fetch(API);
        todosLosClientes = await res.json();

        
        clientesFiltrados = [...todosLosClientes];
        paginaActual = 1; 

        actualizarResumen(todosLosClientes);
        renderizarTabla();
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:red;">Error al conectar con el servidor. ¿Está corriendo en el puerto 7000?</td></tr>';
        console.error(err);
    }
}

// ---- Renderizar Tabla y Controles de Paginación ----
function renderizarTabla() {
    tbody.innerHTML = '';

    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No hay clientes registrados</td></tr>';
        renderizarControlesPaginacion();
        return;
    }

    // Calcular índices para segmentar el arreglo de 8 en 8
    const indiceInicio = (paginaActual - 1) * filasPorPagina;
    const indiceFin = indiceInicio + filasPorPagina;
    const clientesPagina = clientesFiltrados.slice(indiceInicio, indiceFin);

    // Renderizar solo los 8 de la página correspondiente
    clientesPagina.forEach(c => {
        const iniciales = c.nombre.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
        const estadoTxt = c.estado === 'activo' ? 'Activo' : 'Inactivo';

        tbody.innerHTML += `
        <tr data-id="${c.id}" data-estado="${c.estado}"
            data-nombre="${c.nombre}" data-telefono="${c.telefono}"
            data-email="${c.email || ''}" data-direccion="${c.direccion}">
            <td><div class="cliente-cell"><span class="cliente-avatar">${iniciales}</span> ${c.nombre}</div></td>
            <td>${c.telefono}</td>
            <td>${c.email || '—'}</td>
            <td>${c.direccion}</td>
            <td><span class="badge ${c.estado}">${estadoTxt}</span></td>
            <td><div class="row-actions">
                <button class="icon-btn edit" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
                <button class="icon-btn delete" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 0-2 2h4a2 2 0 0 0 2-2v2m3 0l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
            </div></td>
        </tr>`;
    });

    engancharBotones();
    renderizarControlesPaginacion();
}

function renderizarControlesPaginacion() {
    const contenedorPaginas = document.getElementById('pagination-container');
    const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina);

    if (totalPaginas <= 1) {
        contenedorPaginas.innerHTML = '';
        return;
    }

    let htmlControles = `
        <button class="btn-page" ${paginaActual === 1 ? 'disabled' : ''} onclick="cambiarDePagina(${paginaActual - 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        htmlControles += `
            <button class="btn-page ${paginaActual === i ? 'active' : ''}" onclick="cambiarDePagina(${i})">
                ${i}
            </button>
        `;
    }

    htmlControles += `
        <button class="btn-page" ${paginaActual === totalPaginas ? 'disabled' : ''} onclick="cambiarDePagina(${paginaActual + 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 18l6-6-6-6"/></svg>
        </button>
    `;

    contenedorPaginas.innerHTML = htmlControles;
}

function cambiarDePagina(numeroPagina) {
    paginaActual = numeroPagina;
    renderizarTabla();
}

function actualizarResumen(clientes) {
    const total     = clientes.length;
    const activos   = clientes.filter(c => c.estado === 'activo').length;
    const inactivos = clientes.filter(c => c.estado === 'inactivo').length;
    const cards = document.querySelectorAll('.summary-value');
    if (cards[0]) cards[0].textContent = total;
    if (cards[1]) cards[1].textContent = activos;
    if (cards[2]) cards[2].textContent = inactivos;
}

// ---- Abrir modal "Nuevo Cliente" ----
document.getElementById('btn-open-new').addEventListener('click', () => {
    formCliente.reset();
    idEnEdicion = null;
    modalTitulo.textContent = 'Nuevo Cliente';
    modalCliente.classList.add('is-open');
});

// ---- Enganchar botones editar + eliminar de cada fila ----
function engancharBotones() {

    document.querySelectorAll('.icon-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const f = btn.closest('tr');
            idEnEdicion = f.dataset.id;
            document.getElementById('m-nombre').value    = f.dataset.nombre;
            document.getElementById('m-telefono').value  = f.dataset.telefono;
            document.getElementById('m-email').value     = f.dataset.email || '';
            document.getElementById('m-direccion').value = f.dataset.direccion;
            document.getElementById('m-estado').value    = f.dataset.estado;
            modalTitulo.textContent = 'Editar Cliente';
            modalCliente.classList.add('is-open');
        });
    });
   
    document.querySelectorAll('.icon-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            filaAEliminar = btn.closest('tr');
            modalEliminar.classList.add('is-open');
        });
    });
}

// ---- Guardar cliente (POST si es nuevo, PUT si es edición) ----
formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();

    let emailValue = document.getElementById('m-email').value.trim();
    if (emailValue === '') {
        emailValue = '-';
    }

    const datos = {
        nombre:    document.getElementById('m-nombre').value.trim(),
        telefono:  document.getElementById('m-telefono').value.trim(),
        email:     emailValue,
        direccion: document.getElementById('m-direccion').value.trim(),
        estado:    document.getElementById('m-estado').value
    };
    try {
        const url    = idEnEdicion ? `${API}/${idEnEdicion}` : API;
        const metodo = idEnEdicion ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (!res.ok) throw new Error('Error al guardar');

        modalCliente.classList.remove('is-open');

        // 🌟 AQUÍ MANDAMOS LLAMAR LA NOTIFICACIÓN TOAST
        mostrarToast(idEnEdicion ? 'Cliente actualizado' : 'Cliente registrado con éxito');

        formCliente.reset();
        idEnEdicion = null;
        cargarClientes();
    } catch (err) {
        alert('No se pudo guardar el cliente. Revisa que el servidor esté corriendo.');
        console.error(err);
    }
});

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!filaAEliminar) return;
    const id = filaAEliminar.dataset.id;
    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });

        if (!res.ok) throw new Error('Error al eliminar');

        modalEliminar.classList.remove('is-open');

       
        mostrarToast('Cliente eliminado');

        filaAEliminar = null;
        cargarClientes(); 
    } catch (err) {
        alert('No se pudo eliminar el cliente. Revisa que el servidor esté corriendo.');
        console.error(err);
    }
});

document.getElementById('btn-cancelar-cliente').addEventListener('click', () => modalCliente.classList.remove('is-open'));
document.getElementById('btn-cancelar-eliminar').addEventListener('click', () => { filaAEliminar = null; modalEliminar.classList.remove('is-open'); });
[modalCliente, modalEliminar].forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('is-open'); });
});

document.getElementById('btn-filtrar').addEventListener('click', () => {
    const texto  = document.getElementById('f-buscar').value.trim().toLowerCase();
    const estado = document.getElementById('f-estado').value;

    clientesFiltrados = todosLosClientes.filter(c => {
        const coincideTexto = !texto ||
            c.nombre.toLowerCase().includes(texto) ||
            c.telefono.toLowerCase().includes(texto) ||
            (c.email || '').toLowerCase().includes(texto);

        const coincideEstado = !estado || c.estado === estado;
        return coincideTexto && coincideEstado;
    });

    paginaActual = 1;
    renderizarTabla();
});

const appEl = document.querySelector('.app');
const DURACION_SALIDA = 200;

function navegarCon(url) {
    if (appEl) appEl.classList.add('is-leaving');
    setTimeout(() => { window.location.href = url; }, DURACION_SALIDA);
}

document.querySelectorAll('.nav__item, .nav__logout').forEach(link => {
    if (link.tagName === 'A' && link.getAttribute('href')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navegarCon(link.getAttribute('href'));
        });
    }
});

// ---- Cargar al abrir ----
cargarClientes();
