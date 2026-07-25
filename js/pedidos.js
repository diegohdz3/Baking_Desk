// --- Configuración API ---
const BASE_API_URL = 'http://35.171.239.148:7000/api';
const API_URL = `${BASE_API_URL}/pedidos`;

// --- VARIABLES GLOBALES PARA PAGINACIÓN Y FILTRADO ---
let paginaActual = 1;
const filasPorPagina = 8;
let pedidosGlobal = [];       // Almacén crudo del servidor
let pedidosFiltrados = [];     // Almacén que pasó filtros y se paginará

let clientesGlobal = [];
let productosGlobal = [];
let pedidoEnEdicionId = null;
let pedidoAEliminarId = null;

// --- Elementos del DOM ---
const tbody = document.getElementById('tabla-body');
const modalPedido = document.getElementById('modal-pedido');
const modalEliminar = document.getElementById('modal-eliminar');
const formPedido = document.getElementById('form-pedido');
const modalTitulo = document.getElementById('modal-titulo');

// Selectores del formulario del modal
const selectCliente = document.getElementById('m-cliente');
const selectProducto = document.getElementById('m-producto');
const inputBuscarCliente = document.getElementById('m-cliente-buscar');
const inputBuscarProducto = document.getElementById('m-producto-buscar');
const inputCantidad = document.getElementById('m-cantidad');
const inputTotal = document.getElementById('m-total');

// --- Formateador de Moneda ---
const formatearMoneda = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);

// --- Buscadores de Cliente y Producto ---
function normalizarTextoBusqueda(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function obtenerIdCliente(cliente) {
    return cliente.id ?? cliente.idCliente ?? cliente.id_cliente ?? '';
}

function obtenerNombreCliente(cliente) {
    return cliente.nombre ?? cliente.nombreCliente ?? '';
}

function obtenerIdProducto(producto) {
    if (producto.id !== undefined && producto.id !== null) {
        return producto.id;
    }

    for (const clave in producto) {
        if (clave.toLowerCase().startsWith('id')) {
            return producto[clave];
        }
    }

    return '';
}

function obtenerNombreProducto(producto) {
    return producto.nombre ?? producto.nombreProducto ?? '';
}

function renderizarOpcionesClientes(filtro = '', valorSeleccionado = '') {
    const textoBuscado = normalizarTextoBusqueda(filtro);
    const valorAnterior = String(valorSeleccionado || '');

    selectCliente.innerHTML =
        '<option value="">Seleccione un cliente...</option>';

    clientesGlobal
        .filter(cliente =>
            normalizarTextoBusqueda(
                obtenerNombreCliente(cliente)
            ).includes(textoBuscado)
        )
        .forEach(cliente => {
            const opt = document.createElement('option');
            opt.value = obtenerIdCliente(cliente);
            opt.textContent = obtenerNombreCliente(cliente);
            selectCliente.appendChild(opt);
        });

    const existeSeleccionAnterior = Array.from(selectCliente.options)
        .some(option => option.value === valorAnterior);

    selectCliente.value = existeSeleccionAnterior ? valorAnterior : '';
}

function renderizarOpcionesProductos(filtro = '', valorSeleccionado = '') {
    const textoBuscado = normalizarTextoBusqueda(filtro);
    const valorAnterior = String(valorSeleccionado || '');

    selectProducto.innerHTML =
        '<option value="">Seleccione un producto...</option>';

    productosGlobal
        .filter(producto =>
            normalizarTextoBusqueda(
                obtenerNombreProducto(producto)
            ).includes(textoBuscado)
        )
        .forEach(producto => {
            const opt = document.createElement('option');
            const precio = producto.precio || producto.precioUnitario || 0;
            opt.value = obtenerIdProducto(producto);
            opt.textContent =
                `${obtenerNombreProducto(producto)} ` +
                `(${formatearMoneda(precio)})`;
            selectProducto.appendChild(opt);
        });

    const existeSeleccionAnterior = Array.from(selectProducto.options)
        .some(option => option.value === valorAnterior);

    selectProducto.value = existeSeleccionAnterior ? valorAnterior : '';
}

function reiniciarBuscadoresPedido(
    clienteSeleccionado = '',
    productoSeleccionado = ''
) {
    if (inputBuscarCliente) {
        inputBuscarCliente.value = '';
    }

    if (inputBuscarProducto) {
        inputBuscarProducto.value = '';
    }

    renderizarOpcionesClientes('', clienteSeleccionado);
    renderizarOpcionesProductos('', productoSeleccionado);
}

// --- Cargar Catálogos Iniciales ---
async function cargarCatalogos() {
    try {
        const [resClientes, resProductos] = await Promise.all([
            fetch(`${BASE_API_URL}/clientes`),
            fetch(`${BASE_API_URL}/productos`)
        ]);

        if (resClientes.ok) {
            clientesGlobal = await resClientes.json();
            console.log("Clientes cargados desde el servidor:", clientesGlobal);
            renderizarOpcionesClientes(
                inputBuscarCliente?.value || '',
                selectCliente.value
            );
        }

        if (resProductos.ok) {
            productosGlobal = await resProductos.json();
            console.log("Estructura real de tus productos devuelta por el servidor:", productosGlobal);

            renderizarOpcionesProductos(
                inputBuscarProducto?.value || '',
                selectProducto.value
            );
        }
    } catch (error) {
        console.error('Error al cargar catálogos:', error);
    }
}

// --- Escuchar cambios para calcular el Total en tiempo real ---
function recalcularTotal() {
    const productoId = selectProducto.value;
    const cantidad = parseInt(inputCantidad.value) || 1;

    if (!productoId) {
        inputTotal.value = '0.00';
        return;
    }

    const producto = productosGlobal.find(p => String(obtenerIdProducto(p)) === String(productoId));
    if (producto) {
        const precio = producto.precio || producto.precioUnitario || 0;
        const subtotal = precio * cantidad;
        inputTotal.value = subtotal.toFixed(2);
    }
}

selectProducto.addEventListener('change', recalcularTotal);
inputCantidad.addEventListener('input', recalcularTotal);

if (inputBuscarCliente) {
    inputBuscarCliente.addEventListener('input', () => {
        const valorSeleccionado = selectCliente.value;

        renderizarOpcionesClientes(
            inputBuscarCliente.value,
            valorSeleccionado
        );
    });
}

if (inputBuscarProducto) {
    inputBuscarProducto.addEventListener('input', () => {
        const valorSeleccionado = selectProducto.value;

        renderizarOpcionesProductos(
            inputBuscarProducto.value,
            valorSeleccionado
        );

        if (valorSeleccionado && !selectProducto.value) {
            recalcularTotal();
        }
    });
}

// --- Cargar Pedidos (GET) ---
async function cargarPedidos() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        pedidosGlobal = await response.json();
        console.log("Pedidos cargados desde el servidor:", pedidosGlobal);

        // Al recargar, inicializamos los datos filtrados en memoria
        pedidosFiltrados = [...pedidosGlobal];
        paginaActual = 1;

        actualizarResumen(pedidosGlobal);
        renderTabla();
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--error); font-weight:500; padding:20px;">
            Error al conectar con el servidor. ¿Está corriendo en el puerto 7000?
        </td></tr>`;
    }
}

// --- Renderizar Tabla Con Paginación Nativa ---
function renderTabla() {
    tbody.innerHTML = '';

    if (!pedidosFiltrados || pedidosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--ink-soft); padding:20px;">
            No hay registros de pedidos disponibles.
        </td></tr>`;
        renderizarControlesPaginacion();
        return;
    }

    // Segmentación de registros de 8 en 8
    const indiceInicio = (paginaActual - 1) * filasPorPagina;
    const indiceFin = indiceInicio + filasPorPagina;
    const pedidosPagina = pedidosFiltrados.slice(indiceInicio, indiceFin);

    pedidosPagina.forEach(pedido => {
        const pedidoId = pedido.id || pedido.idPedido || '---';

        // Detectar Nombre del Cliente
        let clienteNombre = '—';
        if (pedido.nombreCliente) {
            clienteNombre = pedido.nombreCliente;
        } else if (pedido.cliente && typeof pedido.cliente === 'object') {
            clienteNombre = pedido.cliente.nombre || pedido.cliente.nombreCliente;
        } else if (pedido.cliente) {
            clienteNombre = pedido.cliente;
        }

        // Detectar Nombre del Producto
        let productoNombre = '—';
        if (pedido.nombreProducto) {
            productoNombre = pedido.nombreProducto;
        } else if (pedido.detalles && pedido.detalles.length > 0) {
            const primerDetalle = pedido.detalles[0];
            productoNombre = primerDetalle.nombreProducto ||
                (primerDetalle.producto && primerDetalle.producto.nombre) ||
                `Producto ID: ${primerDetalle.productoId}`;
        } else if (pedido.producto) {
            productoNombre = typeof pedido.producto === 'object' ? (pedido.producto.nombre || '—') : pedido.producto;
        }

        const fechaPedido = pedido.fechaEntrega || pedido.fecha || '—';

        // Determinar clase de badge según estado
        const estadoRaw = (pedido.estado || 'nuevo').toLowerCase().replace(' ', '-');
        const badgeClases = {
            'nuevo': 'nuevo',
            'en-curso': 'en-curso',
            'listo': 'listo',
            'entregado': 'entregado',
            'cancelado': 'error-soft'
        };
        const badgeClas = badgeClases[estadoRaw] || 'nuevo';
        const estadoTxt = pedido.estado ? pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1) : 'Nuevo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${pedidoId}</td>
            <td>${clienteNombre}</td>
            <td>${productoNombre}</td>
            <td>${fechaPedido}</td>
            <td>${formatearMoneda(pedido.total || 0)}</td>
            <td><span class="badge ${badgeClas}">${estadoTxt}</span></td>
            <td style="display:none;">---</td>
            <td>
                <div class="row-actions">
                    <button class="icon-btn edit" title="Editar" onclick="abrirEditar(${pedidoId})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                    </button>
                    <button class="icon-btn delete" title="Eliminar" onclick="abrirEliminar(${pedidoId})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderizarControlesPaginacion();
}

// --- Generar Botonera de Paginación (< 1 2 3 >) ---
function renderizarControlesPaginacion() {
    const contenedorPaginas = document.getElementById('pagination-container');
    if (!contenedorPaginas) return;

    const totalPaginas = Math.ceil(pedidosFiltrados.length / filasPorPagina);

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

window.cambiarDePagina = function(numeroPagina) {
    paginaActual = numeroPagina;
    renderTabla();
};

// --- Actualizar Resumen Numérico ---
function actualizarResumen(pedidos) {
    const elTotales = document.getElementById('sum-totales');
    const elPendientes = document.getElementById('sum-pendientes');
    const elCompletados = document.getElementById('sum-completados');
    const elCancelados = document.getElementById('sum-cancelados');

    if (elTotales) elTotales.textContent = pedidos.length;

    let pendientes = 0;
    let completados = 0;
    let cancelados = 0;

    pedidos.forEach(p => {
        const est = (p.estado || '').toLowerCase().replace(' ', '-');
        if (est === 'nuevo' || est === 'en-curso') pendientes++;
        else if (est === 'listo' || est === 'entregado') completados++;
        else if (est === 'cancelado') cancelados++;
    });

    if (elPendientes) elPendientes.textContent = pendientes;
    if (elCompletados) elCompletados.textContent = completados;
    if (elCancelados) elCancelados.textContent = cancelados;
}

// --- Abrir Modal Nuevo ---
const btnOpenNew = document.getElementById('btn-open-new');
if (btnOpenNew) {
    btnOpenNew.addEventListener('click', () => {
        formPedido.reset();
        reiniciarBuscadoresPedido();
        pedidoEnEdicionId = null;
        modalTitulo.textContent = 'Nuevo Pedido';
        inputTotal.value = "0.00";
        modalPedido.classList.add('is-open');
    });
}

// --- Abrir Modal Editar ---
window.abrirEditar = async function(id) {
    const pedido = pedidosGlobal.find(p => p.id === id || p.idPedido === id);
    if (!pedido) return;

    pedidoEnEdicionId = id;

    let productoId = "";
    let cantidad = 1;
    try {
        const detResponse = await fetch(`${API_URL}/${id}/detalle`);
        if (detResponse.ok) {
            const detalles = await detResponse.json();
            if (detalles.length > 0) {
                productoId = detalles[0].productoId;
                cantidad = detalles[0].cantidad;
            }
        }
    } catch (e) {
        console.error("Error cargando detalles del pedido:", e);
    }

    reiniciarBuscadoresPedido(
        pedido.clienteId || '',
        productoId
    );

    selectCliente.value = pedido.clienteId || '';
    selectProducto.value = productoId;
    document.getElementById('m-fecha').value = pedido.fechaEntrega || '';
    inputCantidad.value = cantidad;
    document.getElementById('m-estado').value = (pedido.estado || 'nuevo').toLowerCase().replace(' ', '-');
    inputTotal.value = pedido.total || 0;
    document.getElementById('m-notas').value = pedido.notas || '';

    modalTitulo.textContent = 'Editar Pedido';
    modalPedido.classList.add('is-open');
};

// --- Guardar Pedido (POST o PUT) ---
formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idCliente = parseInt(selectCliente.value);
    const idProducto = parseInt(selectProducto.value);
    const cantidad = parseInt(inputCantidad.value);
    const total = parseFloat(inputTotal.value);

    if (isNaN(idCliente) || isNaN(idProducto) || idCliente === 0 || idProducto === 0) {
        alert("Por favor, seleccione un cliente y un producto.");
        return;
    }

    const prodSeleccionado = productosGlobal.find(p => String(obtenerIdProducto(p)) === String(idProducto));
    const precioUnitario = prodSeleccionado ? (prodSeleccionado.precio || prodSeleccionado.precioUnitario || 0) : 0.00;

    const pedidoData = {
        clienteId: idCliente,
        usuarioId: 1,
        fechaEntrega: document.getElementById('m-fecha').value,
        estado: document.getElementById('m-estado').value,
        total: total,
        notas: document.getElementById('m-notas').value.trim(),
        detalles: [
            {
                productoId: idProducto,
                cantidad: cantidad,
                precioUnitario: precioUnitario
            }
        ]
    };

    const method = pedidoEnEdicionId ? 'PUT' : 'POST';
    const url = pedidoEnEdicionId ? `${API_URL}/${pedidoEnEdicionId}` : API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoData)
        });

        if (response.ok) {
            const mensajeServidor = await response.text();
            console.log("Respuesta del servidor:", mensajeServidor);

            modalPedido.classList.remove('is-open');
            formPedido.reset();

            if (typeof mostrarToast === 'function') {
                mostrarToast(pedidoEnEdicionId ? 'Pedido actualizado' : 'Pedido registrado con éxito');
            }

            await cargarPedidos();
        } else {
            const errorTxt = await response.text();
            console.error("Detalle del error del servidor:", errorTxt);
            alert('Error al guardar el pedido.');
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
});

// --- Confirmar Eliminación (DELETE) ---
window.abrirEliminar = function(id) {
    pedidoAEliminarId = id;
    modalEliminar.classList.add('is-open');
};

const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
if (btnConfirmarEliminar) {
    btnConfirmarEliminar.addEventListener('click', async () => {
        if (!pedidoAEliminarId) return;

        try {
            const response = await fetch(`${API_URL}/${pedidoAEliminarId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                modalEliminar.classList.remove('is-open');

                if (typeof mostrarToast === 'function') {
                    mostrarToast('Pedido eliminado');
                }

                await cargarPedidos();
            } else {
                alert('Error al intentar eliminar.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// --- Filtros Cliente-Side Integrados con Paginación ---
const btnFiltrar = document.getElementById('btn-filtrar');
if (btnFiltrar) {
    btnFiltrar.addEventListener('click', () => {
        const txtBuscado = document.getElementById('f-buscar').value.toLowerCase().trim();
        const estadoFiltrado = document.getElementById('f-estado').value;
        const fechaDesde = document.getElementById('f-desde').value;
        const fechaHasta = document.getElementById('f-hasta').value;

        pedidosFiltrados = pedidosGlobal.filter(p => {
            const matchTexto = !txtBuscado ||
                (p.nombreCliente && p.nombreCliente.toLowerCase().includes(txtBuscado)) ||
                (p.id && String(p.id).toLowerCase().includes(txtBuscado));

            const matchEstado = !estadoFiltrado || p.estado.toLowerCase().replace(' ', '-') === estadoFiltrado;

            let matchFecha = true;
            if (fechaDesde && p.fechaEntrega < fechaDesde) matchFecha = false;
            if (fechaHasta && p.fechaEntrega > fechaHasta) matchFecha = false;

            return matchTexto && matchEstado && matchFecha;
        });

        paginaActual = 1; // Al filtrar, regresamos forzosamente a la página 1
        renderTabla();
    });
}

// --- Cerrar Modales ---
const btnCancelarPedido = document.getElementById('btn-cancelar-pedido');
if (btnCancelarPedido) {
    btnCancelarPedido.addEventListener('click', () => modalPedido.classList.remove('is-open'));
}

const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
if (btnCancelarEliminar) {
    btnCancelarEliminar.addEventListener('click', () => {
        pedidoAEliminarId = null;
        modalEliminar.classList.remove('is-open');
    });
}

[modalPedido, modalEliminar].forEach(overlay => {
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('is-open');
        });
    }
});

// --- Cargar al inicio ---
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCatalogos();
    await cargarPedidos();
});

// ---- Transición al salir de la página ----
const appEl = document.querySelector('.app');
const DURACION_SALIDA = 200;

function navegarCon(url) {
    if (!appEl) return;
    appEl.classList.add('is-leaving');
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