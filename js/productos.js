const API_URL = 'http://35.171.239.148:7000/api/productos';
const INVENTARIO_URL = 'http://35.171.239.148:7000/api/inventario';
const RECETAS_URL = 'http://35.171.239.148:7000/api/recetas';  
let productosGlobal = [];
let productosFiltradosGlobal = []; 
let materiasPrimasDisponibles = []; 
let productoEditId = null;
let productoDeleteId = null;

let paginaActual = 1;
const productosPorPagina = 12;

const gridProductos = document.getElementById('grid-productos');
const paginationControls = document.getElementById('pagination-controls');
const modalProducto = document.getElementById('modal-producto');
const formProducto = document.getElementById('form-producto');
const tituloProducto = document.getElementById('titulo-producto');
const modalVerProducto = document.getElementById('modal-ver-producto');
const modalEliminar = document.getElementById('modal-eliminar');
const contenedorIngredientes = document.getElementById('contenedor-ingredientes');

const formatearMoneda = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);

function abrir(id){ document.getElementById(id).classList.add('is-open'); }
function cerrar(id){ document.getElementById(id).classList.remove('is-open'); }

document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => cerrar(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('is-open'); }));

// CARGAR MATERIAS PRIMAS (INVENTARIO)
async function cargarMateriasPrimas() {
    try {
        const response = await fetch(INVENTARIO_URL);
        if (response.ok) {
            materiasPrimasDisponibles = await response.json();
        }
    } catch (error) {
        console.error('Error cargando materias primas:', error);
    }
}

// DINÁMICO: SE RELLENA EL FILTRO CON TEXTO PLANO
function actualizarSelectCategoriasFiltro() {
    const selector = document.getElementById('f-categoria');
    if (!selector) return;
    const valorPrevio = selector.value;
    selector.innerHTML = '<option value="">Todas</option>';

    const cats = [...new Set(productosGlobal.map(p => p.idCategoria || p.categoria || p.categoriaId).filter(Boolean))];

    cats.forEach(c => {
        const op = document.createElement('option');
        op.value = c;
        op.textContent = c;
        selector.appendChild(op);
    });
    selector.value = valorPrevio;
}

// LOGICA PARA INYECTAR LÍNEAS DE RECETA
function agregarFilaIngrediente(idIngrediente = "", cantidad = "") {
    const fila = document.createElement("div");
    fila.classList.add("fila-ingrediente");
    fila.style.display = "flex";
    fila.style.gap = "8px";
    fila.style.marginBottom = "8px";
    fila.style.alignItems = "center";

    let opcionesHTML = `<option value="" disabled selected>Selecciona ingrediente...</option>`;
    materiasPrimasDisponibles.forEach(ing => {
        const idActual = ing.idIngrediente || ing.id;
        const unidadActual = ing.unidadMedida || ing.unidad_medida || ing.unidad || '';
        const seleccionado = idActual == idIngrediente ? "selected" : "";
        opcionesHTML += `<option value="${idActual}" ${seleccionado}>${ing.nombre} (${unidadActual})</option>`;
    });

    fila.innerHTML = `
        <select class="select-materia" style="flex: 2; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size:0.9rem;" required>
            ${opcionesHTML}
        </select>
        <input type="number" step="0.001" class="input-cantidad" placeholder="Cant." value="${cantidad}" style="flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size:0.9rem;" required>
        <button type="button" class="btn-eliminar-fila" style="border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">X</button>
    `;

    fila.querySelector(".btn-eliminar-fila").addEventListener("click", () => fila.remove());
    contenedorIngredientes.appendChild(fila);
}

document.getElementById("btn-agregar-ingrediente").addEventListener("click", () => agregarFilaIngrediente());

async function cargarProductos() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        productosGlobal = await response.json();
        productosFiltradosGlobal = [...productosGlobal];

        paginaActual = 1;
        actualizarSelectCategoriasFiltro();
        renderGrid(productosFiltradosGlobal);
        actualizarResumen(productosGlobal);
    } catch (error) {
        console.error('Error:', error);
        gridProductos.innerHTML = `
            <div class="mensaje-vacio" style="color:var(--error);">
                Error al conectar con el servidor. ¿Está corriendo en el puerto 7000?
            </div>
        `;
    }
}

function renderGrid(productos) {
    gridProductos.innerHTML = '';

    if (productos.length === 0) {
        gridProductos.innerHTML = `
            <div class="mensaje-vacio">
                No hay productos disponibles.
            </div>
        `;
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }

    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPagina = productos.slice(indiceInicio, indiceFin);

    const genericSVG = `
        <svg viewBox="0 0 64 64" fill="none">
            <rect x="10" y="30" width="44" height="18" rx="4" fill="#FBF4EA"/>
            <rect x="14" y="16" width="36" height="16" rx="4" fill="#C98A3E"/>
            <circle cx="32" cy="12" r="3.5" fill="#7FA885"/>
        </svg>
    `;

    productosPagina.forEach(prod => {
        const idProd = prod.idProducto || prod.id;
        const estadoClase = prod.estado === 'disponible' ? 'disponible' : (prod.estado === 'agotado' ? 'agotado' : 'descontinuado');
        const estadoTxt = prod.estado ? prod.estado.charAt(0).toUpperCase() + prod.estado.slice(1) : 'Desconocido';
        const precioFor = formatearMoneda(prod.precio || 0);

        const nombreCategoriaVisual = prod.idCategoria || prod.categoria || prod.categoriaId || 'Sin categoría';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-card__visual">
                ${genericSVG}
            </div>
            <div class="product-card__body">
                <div class="product-card__top">
                    <div>
                        <div class="product-card__nombre">${prod.nombre}</div>
                        <div class="product-card__categoria">${nombreCategoriaVisual}</div>
                    </div>
                </div>
                <div class="product-card__precio">${precioFor}</div>
                <div class="product-card__stock">Stock: ${prod.stockActual || 0}</div>
                <div class="product-card__footer">
                    <span class="badge ${estadoClase}">${estadoTxt}</span>
                    <div class="row-actions">
                        <button class="icon-btn view" title="Ver" onclick="verProducto(${idProd})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="icon-btn edit" title="Editar" onclick="abrirEditar(${idProd})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
                        </button>
                        <button class="icon-btn delete" title="Eliminar" onclick="abrirEliminar(${idProd})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        gridProductos.appendChild(card);
    });

    renderPaginacion(productos.length);
}

function renderPaginacion(totalElementos) {
    if (!paginationControls) return;
    paginationControls.innerHTML = '';

    const totalPaginas = Math.ceil(totalElementos / productosPorPagina);
    if (totalPaginas <= 1) return;

    const btnAnt = document.createElement('button');
    btnAnt.className = `pagination-btn ${paginaActual === 1 ? 'disabled' : ''}`;
    btnAnt.innerHTML = '&lsaquo;';
    btnAnt.disabled = paginaActual === 1;
    btnAnt.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderGrid(productosFiltradosGlobal);
        }
    });
    paginationControls.appendChild(btnAnt);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnNum = document.createElement('button');
        btnNum.className = `pagination-btn ${paginaActual === i ? 'active' : ''}`;
        btnNum.textContent = i;
        btnNum.addEventListener('click', () => {
            paginaActual = i;
            renderGrid(productosFiltradosGlobal);
        });
        paginationControls.appendChild(btnNum);
    }

    const btnSig = document.createElement('button');
    btnSig.className = `pagination-btn ${paginaActual === totalPaginas ? 'disabled' : ''}`;
    btnSig.innerHTML = '&rsaquo;';
    btnSig.disabled = paginaActual === totalPaginas;
    btnSig.addEventListener('click', () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            renderGrid(productosFiltradosGlobal);
        }
    });
    paginationControls.appendChild(btnSig);
}


function actualizarResumen(productos) {
    let activos = 0;
    let agotados = 0;
    let descontinuados = 0;
    let sumaPrecios = 0;

    productos.forEach(prod => {
        if (prod.estado === 'disponible') activos++;
        if (prod.estado === 'agotado') agotados++;
        if (prod.estado === 'descontinuado') descontinuados++;

        sumaPrecios += parseFloat(prod.precio || 0);
    });

    const precioPromedio = productos.length > 0 ? (sumaPrecios / productos.length) : 0;

    document.getElementById('stat-activos').textContent = activos;
    document.getElementById('stat-agotados').textContent = agotados;
    document.getElementById('stat-descontinuados').textContent = descontinuados;
    document.getElementById('stat-precio').textContent = formatearMoneda(precioPromedio);
}

document.getElementById('btn-open-new').addEventListener('click', () => {
    formProducto.reset();
    contenedorIngredientes.innerHTML = '';
    document.getElementById('p-categoria').value = '';
    productoEditId = null;
    tituloProducto.textContent = 'Agregar Producto';
    abrir('modal-producto');
});

window.abrirEditar = async function(id) {
    const prod = productosGlobal.find(p => (p.idProducto || p.id) === id);
    if (!prod) return;

    productoEditId = id;
    contenedorIngredientes.innerHTML = '';

    document.getElementById('p-nombre').value = prod.nombre;
    document.getElementById('p-categoria').value = prod.idCategoria || prod.categoria || prod.categoriaId || '';
    document.getElementById('p-precio').value = prod.precio;
    document.getElementById('p-estado').value = prod.estado;
    document.getElementById('p-stock').value = prod.stockActual || 0;
    document.getElementById('p-descripcion').value = prod.descripcion || '';

    try {
        const resReceta = await fetch(`${RECETAS_URL}/producto/${id}`);
        if (resReceta.ok) {
            const receta = await resReceta.json();
            receta.forEach(item => {
                const idIng = item.ingredienteId || item.idIngrediente;
                const cant = item.cantidadRequerida || item.cantidadNecesaria;
                agregarFilaIngrediente(idIng, cant);
            });
        }
    } catch (err) {
        console.warn("No se pudo cargar la receta del producto:", err);
    }

    tituloProducto.textContent = 'Editar Producto';
    abrir('modal-producto');
};

formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        idProducto: productoEditId ? parseInt(productoEditId) : 0,
        nombre: document.getElementById('p-nombre').value.trim(),
        descripcion: document.getElementById('p-descripcion').value.trim(),
        precio: parseFloat(document.getElementById('p-precio').value) || 0,
        stockActual: parseInt(document.getElementById('p-stock').value || 0),
        idCategoria: document.getElementById('p-categoria').value.trim(),
        estado: document.getElementById('p-estado').value
    };

    const method = productoEditId ? 'PUT' : 'POST';
    const url = productoEditId ? `${API_URL}/${productoEditId}` : API_URL;

    try {
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`Error en respuesta de producto: ${response.status}`);
        }

        const productoGuardado = await response.json();

        const idProductoActual = productoEditId
            || productoGuardado.idProducto
            || productoGuardado.id;

        const filas = document.querySelectorAll(".fila-ingrediente");
        const detallesReceta = [];

        filas.forEach(fila => {
            const idIng = parseInt(fila.querySelector(".select-materia").value);
            const cant = parseFloat(fila.querySelector(".input-cantidad").value);

            if (!isNaN(idIng) && idIng > 0 && !isNaN(cant) && cant > 0) {
                detallesReceta.push({
                    productoId: parseInt(idProductoActual),
                    ingredienteId: idIng,
                    cantidadRequerida: cant,
                    unidad: ""
                });
            }
        });

        if (detallesReceta.length > 0) {
            console.log("Enviando receta adaptada al backend:", detallesReceta);

            const resReceta = await fetch(`${RECETAS_URL}/producto/${idProductoActual}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detallesReceta)
            });

            if (!resReceta.ok) {
                const errorTxt = await resReceta.text();
                console.error("Error devuelto por el servidor en Receta:", errorTxt);
                alert("Atención: El producto se guardó, pero falló la receta.");
            }
        }

        cerrar('modal-producto');

        if (typeof mostrarToast === 'function') {
            mostrarToast(productoEditId ? 'Producto actualizado' : 'Producto registrado con éxito');
        }

        cargarProductos();

    } catch (error) {
        console.error('Error al guardar el producto/receta:', error);
        alert('Fallo al intentar guardar el producto.');
    }
});

window.verProducto = function(id) {
    const prod = productosGlobal.find(p => (p.idProducto || p.id) === id);
    if (!prod) return;

    document.getElementById('v-p-nombre').textContent = prod.nombre;
    document.getElementById('v-p-categoria').textContent = prod.idCategoria || prod.categoria || prod.categoriaId || '—';
    document.getElementById('v-p-precio').textContent = formatearMoneda(prod.precio);
    document.getElementById('v-p-stock').textContent = prod.stockActual || 0;

    const estadoTxt = prod.estado ? prod.estado.charAt(0).toUpperCase() + prod.estado.slice(1) : '—';
    document.getElementById('v-p-estado').textContent = estadoTxt;
    document.getElementById('v-p-descripcion').textContent = prod.descripcion || '—';

    abrir('modal-ver-producto');
};

window.abrirEliminar = function(id) {
    productoDeleteId = id;
    abrir('modal-eliminar');
};

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!productoDeleteId) return;

    try {
        const response = await fetch(`${API_URL}/${productoDeleteId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cerrar('modal-eliminar');
            if (typeof mostrarToast === 'function') mostrarToast('Producto eliminado');
            cargarProductos();
        } else {
            alert('Error al intentar eliminar.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al intentar eliminar.');
    }
});

function aplicarFiltros() {
    const texto = document.getElementById('f-buscar').value.trim().toLowerCase();
    const categoria = document.getElementById('f-categoria').value;
    const estado = document.getElementById('f-estado').value;

    productosFiltradosGlobal = productosGlobal.filter(p => {
        const coincideTexto = !texto || p.nombre.toLowerCase().includes(texto);
        const catActual = p.idCategoria || p.categoria || p.categoriaId || '';
        const coincideCategoria = !categoria || catActual === categoria;
        const coincideEstado = !estado || p.estado === estado;

        return coincideTexto && coincideCategoria && coincideEstado;
    });

    paginaActual = 1;
    renderGrid(productosFiltradosGlobal);
}

document.getElementById('f-buscar').addEventListener('input', aplicarFiltros);
document.getElementById('f-categoria').addEventListener('change', aplicarFiltros);
document.getElementById('f-estado').addEventListener('change', aplicarFiltros);

document.addEventListener('DOMContentLoaded', async () => {
    await cargarMateriasPrimas();
    cargarProductos();
});

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
