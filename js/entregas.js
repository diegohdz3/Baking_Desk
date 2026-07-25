
const API_URL = 'http://35.171.239.148:7000/api/entregas';

let entregasGlobal = [];
let entregasPorFecha = {}; 
let entregaEditId = null;
let entregaDeleteId = null;

let clientesGlobal = [];

const hoy = new Date();
let mesActual = hoy.getMonth();
let anioActual = hoy.getFullYear();
let fechaSeleccionada = formatoFecha(hoy);

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function abrir(id){ document.getElementById(id).classList.add('is-open'); }
function cerrar(id){ document.getElementById(id).classList.remove('is-open'); }
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => cerrar(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('is-open'); }));

function mostrarToast(mensaje){
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = mensaje;
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function formatoFecha(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function cargarEntregas() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en el servidor');

        entregasGlobal = await response.json();

        entregasPorFecha = {};
        let stats = { pendiente: 0, confirmada: 0, entregada: 0, cancelada: 0 };

        entregasGlobal.forEach(ent => {
            if (!entregasPorFecha[ent.fecha]) {
                entregasPorFecha[ent.fecha] = [];
            }
            entregasPorFecha[ent.fecha].push(ent);

            if (stats[ent.estado] !== undefined) stats[ent.estado]++;
        });

        actualizarResumen(stats);
        renderCalendario();
        renderPanel(fechaSeleccionada);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('panel-lista').innerHTML = `
            <div class="empty-state" style="color:var(--error);">
                Error al conectar con el servidor. ¿Está corriendo en el puerto 7000?
            </div>
        `;
    }
}

function actualizarResumen(stats) {
    document.getElementById('val-pendientes').textContent = stats.pendiente;
    document.getElementById('val-confirmadas').textContent = stats.confirmada;
    document.getElementById('val-entregadas').textContent = stats.entregada;
    document.getElementById('val-canceladas').textContent = stats.cancelada;
}

function colorEstado(estado){
    return {
        pendiente:'#c98a3e',
        confirmada:'#496b4d',
        entregada:'#2f4534',
        cancelada:'#c1544a'
    }[estado] || '#7a756e';
}

function renderCalendario() {
    document.getElementById('cal-mes-anio').textContent = `${meses[mesActual]} ${anioActual}`;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const primerDia = new Date(anioActual, mesActual, 1).getDay();
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

    for (let i = 0; i < primerDia; i++) {
        const vacio = document.createElement('div');
        vacio.className = 'cal-day empty';
        grid.appendChild(vacio);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaStr = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const celda = document.createElement('div');
        celda.className = 'cal-day';

        if (fechaStr === formatoFecha(hoy)) celda.classList.add('today');
        if (fechaStr === fechaSeleccionada) celda.classList.add('selected');

        const num = document.createElement('div');
        num.className = 'cal-day__num';
        num.textContent = dia;
        celda.appendChild(num);

        const dots = document.createElement('div');
        dots.className = 'cal-day__dots';

        (entregasPorFecha[fechaStr] || []).forEach(ent => {
            const dot = document.createElement('span');
            dot.className = 'cal-day__dot';
            dot.style.background = colorEstado(ent.estado);
            dots.appendChild(dot);
        });
        celda.appendChild(dots);

        celda.addEventListener('click', () => {
            fechaSeleccionada = fechaStr;
            renderCalendario();
            renderPanel(fechaStr);
        });

        grid.appendChild(celda);
    }
}

// Navegación del Calendario
document.getElementById('cal-prev').addEventListener('click', () => {
    mesActual--;
    if (mesActual < 0) { mesActual = 11; anioActual--; }
    renderCalendario();
});
document.getElementById('cal-next').addEventListener('click', () => {
    mesActual++;
    if (mesActual > 11) { mesActual = 0; anioActual++; }
    renderCalendario();
});

function renderPanel(fechaStr) {
    const [y, m, d] = fechaStr.split('-');
    const fechaObj = new Date(y, m-1, d);
    const esHoy = fechaStr === formatoFecha(hoy);

    document.getElementById('panel-fecha').textContent = esHoy ? 'Entregas de hoy' : 'Entregas del día';
    document.getElementById('panel-subtitulo').textContent = fechaObj.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });

    const lista = document.getElementById('panel-lista');
    const items = entregasPorFecha[fechaStr] || [];

    if (items.length === 0) {
        lista.innerHTML = '<div class="empty-state">No hay entregas programadas este día.</div>';
        return;
    }

    lista.innerHTML = items.map(ent => `
        <div class="entrega-item">
            <div class="entrega-item__top">
                <div>
                    <div class="entrega-item__cliente">${ent.cliente}</div>
                    <div class="entrega-item__hora">Hora: ${ent.hora || '--:--'}</div>
                </div>
                <div class="row-actions">
                    <button class="icon-btn" onclick="abrirEditar(${ent.id})" title="Actualizar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                    </button>
                    <button class="icon-btn delete" onclick="abrirEliminar(${ent.id})" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
                    </button>
                </div>
            </div>
            <div class="entrega-item__meta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="7" width="14" height="10" rx="1.5"/><path d="M15 10h4l3 3v4h-7z"/></svg>
                ${ent.metodo === 'domicilio' ? 'A Domicilio' : 'Recolección local'}
            </div>
            <div class="entrega-item__footer">
                <span class="badge ${ent.estado}">${ent.estado.charAt(0).toUpperCase() + ent.estado.slice(1)}</span>
            </div>
        </div>
    `).join('');
}

// --- Formularios y Acciones ---
document.getElementById('btn-open-new').addEventListener('click', () => {
    document.getElementById('form-entrega').reset();
    document.getElementById('e-fecha').value = fechaSeleccionada;
    reiniciarBuscadorClientes();
    entregaEditId = null;
    document.getElementById('e-direccion').disabled = false; // Nos aseguramos de restaurar el input
    document.getElementById('modal-entrega-titulo').textContent = 'Registrar Entrega';
    abrir('modal-entrega');
});

window.abrirEditar = function(id) {
    const ent = entregasGlobal.find(e => e.id === id);
    if (!ent) return;

    entregaEditId = id;
    reiniciarBuscadorClientes(ent.cliente);
    document.getElementById('e-cliente').value = ent.cliente;
    document.getElementById('e-fecha').value = ent.fecha;
    document.getElementById('e-hora').value = ent.hora || '';
    document.getElementById('e-metodo').value = ent.metodo;
    document.getElementById('e-estado').value = ent.estado;
    document.getElementById('e-direccion').value = ent.direccion || '';
    document.getElementById('e-notas').value = ent.notas || '';

    // Manejar estado inicial del input de dirección dependiendo del método
    const direccionInput = document.getElementById('e-direccion');
    if (ent.metodo === 'recoleccion') {
        direccionInput.disabled = true;
    } else {
        direccionInput.disabled = false;
    }

    document.getElementById('modal-entrega-titulo').textContent = 'Actualizar Entrega';
    abrir('modal-entrega');
};

document.getElementById('form-entrega').addEventListener('submit', async (e) => {
    e.preventDefault();

    const clienteSelect = document.getElementById('e-cliente');
    const direccionSelect = document.getElementById('e-direccion');

    const clienteId = parseInt(clienteSelect.value);
    const clienteNombre = clienteSelect.options[clienteSelect.selectedIndex].text;

    const entregaData = {

        cliente: clienteSelect.value, 
        pedidoId: 0, 
        fecha: document.getElementById('e-fecha').value,
        hora: document.getElementById('e-hora').value,
        metodo: document.getElementById('e-metodo').value,
        estado: document.getElementById('e-estado').value,
        direccion: direccionSelect.value,
        notas: document.getElementById('e-notas').value.trim()
    };

    const method = entregaEditId ? 'PUT' : 'POST';
    const url = entregaEditId ? `${API_URL}/${entregaEditId}` : API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entregaData)
        });

        if (response.ok) {
            cerrar('modal-entrega');
            mostrarToast(entregaEditId ? 'Entrega actualizada' : 'Entrega programada con éxito');
            cargarEntregas();
        } else {
            const errBody = await response.text();
            console.error("Detalle del error en el backend:", errBody);
            alert(`Error al guardar la entrega. Verifica si el cliente seleccionado tiene al menos un pedido registrado.`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al intentar guardar.');
    }
});

// --- Eliminar (DELETE) ---
window.abrirEliminar = function(id) {
    entregaDeleteId = id;
    abrir('modal-eliminar');
};

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!entregaDeleteId) return;

    try {
        const response = await fetch(`${API_URL}/${entregaDeleteId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cerrar('modal-eliminar');
            mostrarToast('Entrega eliminada');
            cargarEntregas();
        } else {
            alert('Error al intentar eliminar.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al intentar eliminar.');
    }
});

// --- Iniciar ---
document.addEventListener('DOMContentLoaded', () => {

    cargarEntregas();

    cargarClientesEnSelector();

    const clienteSelect = document.getElementById("e-cliente");
    const metodoSelect = document.getElementById("e-metodo");

    if (clienteSelect) {
        clienteSelect.addEventListener('change', autoRellenarDireccion);
    }
    if (metodoSelect) {
        metodoSelect.addEventListener('change', autoRellenarDireccion);
    }

    const buscadorCliente = document.getElementById("e-cliente-buscar");

    if (buscadorCliente && clienteSelect) {
        buscadorCliente.addEventListener('input', () => {
            const valorSeleccionado = clienteSelect.value;

            renderizarOpcionesClientes(
                buscadorCliente.value,
                valorSeleccionado
            );

            if (valorSeleccionado && !clienteSelect.value) {
                autoRellenarDireccion();
            }
        });
    }
});

function normalizarTextoCliente(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function renderizarOpcionesClientes(filtro = '', valorSeleccionado = '') {
    const clienteSelect = document.getElementById("e-cliente");
    if (!clienteSelect) return;

    const textoBuscado = normalizarTextoCliente(filtro);
    const valorAnterior = String(valorSeleccionado || '');

    clienteSelect.innerHTML =
        '<option value="" disabled>-- Seleccionar Cliente --</option>';

    clientesGlobal
        .filter(cliente =>
            normalizarTextoCliente(cliente.nombre).includes(textoBuscado)
        )
        .forEach(cliente => {
            const option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            clienteSelect.appendChild(option);
        });

    const existeSeleccionAnterior = Array.from(clienteSelect.options)
        .some(option => option.value === valorAnterior);

    clienteSelect.value = existeSeleccionAnterior ? valorAnterior : '';

    if (!clienteSelect.value) {
        clienteSelect.options[0].selected = true;
    }
}

function reiniciarBuscadorClientes(valorSeleccionado = '') {
    const buscador = document.getElementById("e-cliente-buscar");

    if (buscador) {
        buscador.value = '';
    }

    renderizarOpcionesClientes('', valorSeleccionado);
}

function cargarClientesEnSelector() {
    const clienteSelect = document.getElementById("e-cliente");
    if (!clienteSelect) return;

    const CLIENTES_API_URL = 'http://35.171.239.148:7000/api/clientes';

    fetch(CLIENTES_API_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error("Error al obtener los clientes del backend: " + response.status);
            }
            return response.json();
        })
        .then(clientes => {
            clientesGlobal = clientes;

            renderizarOpcionesClientes(
                document.getElementById("e-cliente-buscar")?.value || ''
            );
        })
        .catch(error => {
            console.error("No se pudieron cargar los clientes en el selector:", error);
        });
}

function autoRellenarDireccion() {
    const clienteSelect = document.getElementById("e-cliente");
    const metodoSelect = document.getElementById("e-metodo");
    const direccionSelect = document.getElementById("e-direccion");

    if (!clienteSelect || !metodoSelect || !direccionSelect) return;

    const clienteId = parseInt(clienteSelect.value);
    const metodoSelected = metodoSelect.value;

    direccionSelect.innerHTML = '';

    if (metodoSelected === 'recoleccion') {
        const optionRecoleccion = document.createElement("option");
        optionRecoleccion.value = "Recolección en tienda / local";
        optionRecoleccion.textContent = "Recolección en tienda / local";
        optionRecoleccion.selected = true;
        direccionSelect.appendChild(optionRecoleccion);
        direccionSelect.disabled = true; 
    }
    else {
        direccionSelect.disabled = false;

        if (!isNaN(clienteId)) {
            const clienteEncontrado = clientesGlobal.find(c => c.id === clienteId);

            if (clienteEncontrado && clienteEncontrado.direccion && clienteEncontrado.direccion.trim() !== "") {
                const optionPlaceholder = document.createElement("option");
                optionPlaceholder.value = "";
                optionPlaceholder.textContent = "-- Seleccione la dirección del cliente --";
                optionPlaceholder.disabled = true;
                optionPlaceholder.selected = true;
                direccionSelect.appendChild(optionPlaceholder);

                const optionDir = document.createElement("option");
                optionDir.value = clienteEncontrado.direccion;
                optionDir.textContent = clienteEncontrado.direccion;
                direccionSelect.appendChild(optionDir);
            } else {
                const optionSinDir = document.createElement("option");
                optionSinDir.value = "";
                optionSinDir.textContent = "El cliente no tiene dirección registrada";
                optionSinDir.disabled = true;
                optionSinDir.selected = true;
                direccionSelect.appendChild(optionSinDir);
            }
        } else {
            const optionSeleccione = document.createElement("option");
            optionSeleccione.value = "";
            optionSeleccione.textContent = "-- Seleccione primero un cliente --";
            optionSeleccione.disabled = true;
            optionSeleccione.selected = true;
            direccionSelect.appendChild(optionSeleccione);
        }
    }
}

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
