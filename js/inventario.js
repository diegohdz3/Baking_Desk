const API_ING = 'http://35.171.239.148:7000/api/inventario';

let ingredientesGlobal = [];
let ingredientesFiltradosGlobal = []; 
let editId = null;
let deleteId = null;

let paginaActual = 1;
const ingredientesPorPagina = 8;

const tbodyIngredientes = document.getElementById('tbody-ingredientes');
const paginationControls = document.getElementById('pagination-controls');

function abrir(id){ document.getElementById(id)?.classList.add('is-open'); }
function cerrar(id){ document.getElementById(id)?.classList.remove('is-open'); }

document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => cerrar(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('is-open'); }));

const formatearMoneda = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

function evaluarStock(stock, min) {
    if (stock <= 0) return { clas: 'critico', txt: 'Agotado / Crítico', width: 0 };
    const porcentaje = Math.min((stock / (min * 2)) * 100, 100);
    if (stock <= min / 2) return { clas: 'critico', txt: 'Crítico', width: porcentaje };
    if (stock <= min) return { clas: 'bajo', txt: 'Bajo', width: porcentaje };
    return { clas: 'optimo', txt: 'Óptimo', width: porcentaje };
}

async function cargarDatos() {
    try {
        const resIng = await fetch(API_ING);
        if (resIng.ok) {
            ingredientesGlobal = await resIng.json();
        }
        ingredientesFiltradosGlobal = [...ingredientesGlobal];
        paginaActual = 1; 
        actualizarSelectCategorias();
        renderIngredientes(ingredientesFiltradosGlobal);
    } catch (error) {
        console.error('Error conectando a la API:', error);
        tbodyIngredientes.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--error); padding:20px;">Error de conexión.</td></tr>`;
        if (paginationControls) paginationControls.innerHTML = '';
    }
}

function renderIngredientes(datos) {
    tbodyIngredientes.innerHTML = '';

    if(datos.length === 0) {
        tbodyIngredientes.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--ink-soft); padding:20px;">No hay ingredientes.</td></tr>`;
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }

    const indiceInicio = (paginaActual - 1) * ingredientesPorPagina;
    const indiceFin = indiceInicio + ingredientesPorPagina;
    const ingredientesPagina = datos.slice(indiceInicio, indiceFin);

    ingredientesPagina.forEach(ing => {
        const id = ing.idIngrediente;
        const stockActual = ing.stockActual;
        const stockMinimo = ing.stockMinimo;
        const unidadMedida = ing.unidadMedida;
        const precioUnitario = ing.precioUnitario;

        const nombreCategoriaVisual = ing.idCategoria || 'General';
        const { clas, txt, width } = evaluarStock(stockActual, stockMinimo);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ing.nombre}</td>
            <td>${nombreCategoriaVisual}</td>
            <td class="stock-cell">
                <span class="stock-text">${stockActual} / ${stockMinimo} ${unidadMedida}</span>
                <div class="stock-bar"><div class="stock-bar__fill ${clas}" style="width:${width}%"></div></div>
            </td>
            <td>${unidadMedida}</td>
            <td>${formatearMoneda(precioUnitario)}</td>
            <td><span class="badge ${clas}">${txt}</span></td>
            <td>
                <div class="row-actions">
                    <button class="icon-btn view" onclick="verIngrediente(${id})" title="Ver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    <button class="icon-btn edit" onclick="editarIngrediente(${id})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
                    <button class="icon-btn delete" onclick="abrirEliminar(${id})" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg></button>
                </div>
            </td>
        `;
        tbodyIngredientes.appendChild(tr);
    });

    renderPaginacion(datos.length);
}

function renderPaginacion(totalElementos) {
    if (!paginationControls) return;
    paginationControls.innerHTML = '';

    const totalPaginas = Math.ceil(totalElementos / ingredientesPorPagina);
    if (totalPaginas <= 1) return;

    const btnAnt = document.createElement('button');
    btnAnt.className = `pagination-btn ${paginaActual === 1 ? 'disabled' : ''}`;
    btnAnt.innerHTML = '&lsaquo;';
    btnAnt.disabled = paginaActual === 1;
    btnAnt.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderIngredientes(ingredientesFiltradosGlobal);
        }
    });
    paginationControls.appendChild(btnAnt);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnNum = document.createElement('button');
        btnNum.className = `pagination-btn ${paginaActual === i ? 'active' : ''}`;
        btnNum.textContent = i;
        btnNum.addEventListener('click', () => {
            paginaActual = i;
            renderIngredientes(ingredientesFiltradosGlobal);
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
            renderIngredientes(ingredientesFiltradosGlobal);
        }
    });
    paginationControls.appendChild(btnSig);
}

function actualizarSelectCategorias() {
    const selector = document.getElementById('f-categoria');
    if (!selector) return;
    const valorPrevio = selector.value;
    selector.innerHTML = '<option value="">Todas</option>';

    const cats = [...new Set(ingredientesGlobal.map(i => i.idCategoria).filter(Boolean))];
    cats.forEach(c => {
        const op = document.createElement('option');
        op.value = c;
        op.textContent = c;
        selector.appendChild(op);
    });
    selector.value = valorPrevio;
}

function renderFiltrado() {
    const texto = document.getElementById('f-buscar')?.value.trim().toLowerCase() || '';
    const categoria = document.getElementById('f-categoria')?.value || '';
    const estadoFiltro = document.getElementById('f-estado')?.value || '';

    ingredientesFiltradosGlobal = ingredientesGlobal.filter(i => {
        const matTxt = !texto || i.nombre.toLowerCase().includes(texto);
        const matCat = !categoria || String(i.idCategoria) === String(categoria);
        const evalSt = evaluarStock(i.stockActual, i.stockMinimo).clas;
        const matEst = !estadoFiltro || evalSt === estadoFiltro;
        return matTxt && matCat && matEst;
    });

    paginaActual = 1;
    renderIngredientes(ingredientesFiltradosGlobal);
}

document.getElementById('f-buscar')?.addEventListener('input', renderFiltrado);
document.getElementById('f-categoria')?.addEventListener('change', renderFiltrado);
document.getElementById('f-estado')?.addEventListener('change', renderFiltrado);

document.getElementById('btn-open-new')?.addEventListener('click', () => {
    editId = null;
    document.getElementById('form-ingrediente').reset();
    document.getElementById('titulo-ingrediente').textContent = 'Agregar Ingrediente';
    abrir('modal-ingrediente');
});

window.verIngrediente = function(id) {
    const ing = ingredientesGlobal.find(i => i.idIngrediente === id);
    if (!ing) return;
    document.getElementById('v-i-nombre').textContent = ing.nombre;
    document.getElementById('v-i-categoria').textContent = ing.idCategoria || 'General';
    document.getElementById('v-i-stock').textContent = `${ing.stockActual} ${ing.unidadMedida}`;
    document.getElementById('v-i-min').textContent = `${ing.stockMinimo} ${ing.unidadMedida}`;
    document.getElementById('v-i-unidad').textContent = ing.unidadMedida;
    document.getElementById('v-i-costo').textContent = formatearMoneda(ing.precioUnitario);
    document.getElementById('v-i-estado').innerHTML = `<span class="badge ${evaluarStock(ing.stockActual, ing.stockMinimo).clas}">${evaluarStock(ing.stockActual, ing.stockMinimo).txt}</span>`;
    abrir('modal-ver-ingrediente');
};

window.editarIngrediente = function(id) {
    const ing = ingredientesGlobal.find(i => i.idIngrediente === id);
    if (!ing) return;
    editId = id;

    document.getElementById('i-nombre').value = ing.nombre;
    document.getElementById('i-categoria').value = ing.idCategoria || '';
    document.getElementById('i-unidad').value = ing.unidadMedida;
    document.getElementById('i-stock').value = ing.stockActual;
    document.getElementById('i-min').value = ing.stockMinimo;
    document.getElementById('i-costo').value = ing.precioUnitario;
    document.getElementById('titulo-ingrediente').textContent = 'Editar Ingrediente';
    abrir('modal-ingrediente');
};

// 🛒 LÓGICA PARA SURTIR STOCK Y REGISTRAR GASTO EN FINANZAS

document.getElementById('btn-open-surtir')?.addEventListener('click', () => {
    const selectIng = document.getElementById('surtir-ingrediente-id');
    if (!selectIng) return;

    selectIng.innerHTML = '<option value="">Selecciona un ingrediente…</option>';

    ingredientesGlobal.forEach(ing => {
        const op = document.createElement('option');
        op.value = ing.idIngrediente;
        op.textContent = `${ing.nombre} (${ing.stockActual} ${ing.unidadMedida} actuales)`;
        selectIng.appendChild(op);
    });

    document.getElementById('form-surtir').reset();
    abrir('modal-surtir');
});

const selectIngSurtir = document.getElementById('surtir-ingrediente-id');
const cantidadSurtir = document.getElementById('surtir-cantidad');
const costoTotalSurtir = document.getElementById('surtir-costo-total');

function calcularCostoSurtir() {
    if (!selectIngSurtir || !cantidadSurtir || !costoTotalSurtir) return;
    const ingId = parseInt(selectIngSurtir.value);
    const cantidad = parseFloat(cantidadSurtir.value) || 0;

    const ingredienteSel = ingredientesGlobal.find(i => i.idIngrediente === ingId);
    if (ingredienteSel && cantidad > 0) {
        costoTotalSurtir.value = (cantidad * ingredienteSel.precioUnitario).toFixed(2);
    }
}

selectIngSurtir?.addEventListener('change', calcularCostoSurtir);
cantidadSurtir?.addEventListener('input', calcularCostoSurtir);


document.getElementById('form-surtir')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuarioActivo = JSON.parse(localStorage.getItem('usuario')) || { id: 1 };

    const payload = {
        ingredienteId: parseInt(document.getElementById('surtir-ingrediente-id').value),
        cantidadComprada: parseFloat(document.getElementById('surtir-cantidad').value),
        costoTotal: parseFloat(document.getElementById('surtir-costo-total').value),
        usuarioId: usuarioActivo.id,
        categoriaGastoId: 1
    };

    try {
        const response = await fetch(`${API_ING}/comprar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            cerrar('modal-surtir');
            if (typeof mostrarToast === 'function') {
                mostrarToast('Compra registrada y stock actualizado');
            }
            cargarDatos(); 
        } else {
            const errorTxt = await response.text();
            alert('Error al registrar compra: ' + errorTxt);
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        alert('Error de conexión al procesar la compra.');
    }
});

//  GUARDAR (CREAR / EDITAR) INGREDIENTE
document.getElementById('form-ingrediente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoriaTexto = document.getElementById('i-categoria').value.trim();

    const stockActual = parseFloat(document.getElementById('i-stock').value) || 0;
    const precioUnitario = parseFloat(document.getElementById('i-costo').value) || 0;

    const data = {
        idIngrediente: editId ? parseInt(editId) : 0,
        nombre: document.getElementById('i-nombre').value.trim(),
        idCategoria: categoriaTexto,
        unidadMedida: document.getElementById('i-unidad').value.trim(),
        stockActual: stockActual,
        stockMinimo: parseFloat(document.getElementById('i-min').value) || 0,
        precioUnitario: precioUnitario
    };

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API_ING}/${editId}` : API_ING;

    try {
        const res = await fetch(url, {
            method,
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });

        if (res.ok || res.status === 201 || res.status === 200) {
            cerrar('modal-ingrediente');

            if (typeof mostrarToast === 'function') {
                mostrarToast(editId ? 'Ingrediente actualizado' : 'Ingrediente registrado con éxito');
            }

            cargarDatos();
        } else {
            const msgError = await res.text();
            alert('Error en el servidor al guardar: ' + msgError);
        }
    } catch(err) {
        console.error(err);
        alert('Error de red al guardar ingrediente.');
    }
});

window.abrirEliminar = function(id) {
    deleteId = id;
    abrir('modal-eliminar');
};

document.getElementById('btn-confirmar-eliminar')?.addEventListener('click', async () => {
    if (!deleteId) return;
    try {
        const res = await fetch(`${API_ING}/${deleteId}`, { method: 'DELETE' });
        if(res.ok){
            cerrar('modal-eliminar');
            if (typeof mostrarToast === 'function') {
                mostrarToast('Ingrediente eliminado');
            }
            cargarDatos();
        }
    } catch(err){
        console.error(err);
        alert('Error al eliminar.');
    }
});

document.addEventListener('DOMContentLoaded', cargarDatos);

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
