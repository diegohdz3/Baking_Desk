const API_URL = 'http://35.171.239.148:7000/api/finanzas';
const API_TOP_VENTAS_URL = 'http://35.171.239.148:7000/api/finanzas/top-ventas';

const tbody = document.getElementById('tabla-body');


let movimientosGlobal = [];
let periodoActualGrafica = 'mes';

async function cargarFinanzas() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        const movimientos = await response.json();
        movimientosGlobal = movimientos;

        renderTabla(movimientos);
        calcularResumen(movimientos);

        renderGraficaBarras(movimientos);
        renderGraficaPrediccion(movimientos);
        animarContadores(movimientos);

        await cargarProductos();
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--error); font-weight:500; padding:20px;">
                Error al conectar con el servidor. ¿Está configurado correctamente en Vercel/AWS?
            </td></tr>`;
        }
    }
}

async function cargarProductos() {
    try {
        const response = await fetch(API_TOP_VENTAS_URL);
        if (!response.ok) throw new Error('Error al cargar top ventas');

        const topVentas = await response.json();
        console.log('Top Ventas devueltos por el servidor:', topVentas);
        renderGraficaDona(topVentas);
    } catch (error) {
        console.error('Error al obtener productos más vendidos:', error);
        const listaContenedor = document.getElementById('top-productos-lista');
        if (listaContenedor) {
            listaContenedor.innerHTML = `
                <div style="text-align:center; padding: 20px; color: var(--ink-soft); font-size: 0.9rem;">
                    No se pudieron obtener los productos más vendidos.
                </div>`;
        }
    }
}

const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);
};

function renderTabla(movimientos) {
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--ink-soft); padding:20px;">
            No hay movimientos registrados.
        </td></tr>`;
        return;
    }

    movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientos.forEach(mov => {
        const esIngreso = mov.tipo === 'ingreso';
        const badgeClass = esIngreso ? 'ingreso' : 'gasto';
        const textoBadge = esIngreso ? 'Ingreso' : 'Gasto';
        const amountClass = esIngreso ? 'positivo' : 'negativo';
        const signo = esIngreso ? '+' : '–';
        const categoria = mov.categoria || mov.pedido || '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge ${badgeClass}">${textoBadge}</span></td>
            <td>${mov.concepto}</td>
            <td>${categoria}</td>
            <td>${mov.fecha}</td>
            <td class="amount ${amountClass}">${signo} ${formatearMoneda(mov.monto)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function calcularResumen(movimientos) {
    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(mov => {
        const monto = parseFloat(mov.monto) || 0;
        if (mov.tipo === 'ingreso') totalIngresos += monto;
        else if (mov.tipo === 'gasto') totalGastos += monto;
    });

    const ganancia = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? ((ganancia / totalIngresos) * 100).toFixed(1) : 0.0;

    const elIngreso = document.getElementById('val-ingresos');
    const elGastos = document.getElementById('val-gastos');
    const elGanancia = document.getElementById('val-ganancia');
    const elMargen = document.getElementById('val-margen');

    if (elIngreso) elIngreso.textContent = formatearMoneda(totalIngresos);
    if (elGastos) elGastos.textContent = formatearMoneda(totalGastos);
    if (elGanancia) elGanancia.textContent = formatearMoneda(ganancia);
    if (elMargen) elMargen.textContent = `${margen}%`;
}

// LÓGICA DE TIEMPOS Y AGRUPACIÓN PARA GRÁFICAS

function obtenerUltimos7Dias() {
    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    const resultado = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
        resultado.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            date: d.getDate(),
            label: `${d.getDate()} ${mesesCortos[d.getMonth()]}`
        });
    }
    return resultado;
}

function obtenerUltimos6Meses() {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const hoy = new Date();
    const resultado = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        resultado.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: meses[d.getMonth()]
        });
    }
    return resultado;
}

function obtenerUltimos5Anos() {
    const hoy = new Date();
    const resultado = [];
    for (let i = 4; i >= 0; i--) {
        const y = hoy.getFullYear() - i;
        resultado.push({ year: y, label: y.toString() });
    }
    return resultado;
}

function parseFechaLocal(fechaStr) {
    if(!fechaStr) return new Date();
    const soloFecha = fechaStr.split(' ')[0];
    const partes = soloFecha.split('-');
    if(partes.length === 3) return new Date(partes[0], partes[1] - 1, partes[2]);
    return new Date(fechaStr);
}

function agruparPorDia(movimientos, diasInfo) {
    return diasInfo.map(d => {
        const delDia = movimientos.filter(mov => {
            const fechaUsar = mov.fecha_entrega || mov.fechaEntrega || mov.fecha;
            const f = parseFechaLocal(fechaUsar);
            return f.getFullYear() === d.year && f.getMonth() === d.month && f.getDate() === d.date;
        });
        const ingresos = delDia.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        const gastos = delDia.filter(x => x.tipo === 'gasto').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        return { ...d, ingresos, gastos };
    });
}

function agruparPorMes(movimientos, mesesInfo) {
    return mesesInfo.map(m => {
        const delMes = movimientos.filter(mov => {
            // Se prioriza la fecha de entrega sobre la de creación
            const fechaUsar = mov.fecha_entrega || mov.fechaEntrega || mov.fecha;
            const f = parseFechaLocal(fechaUsar);
            return f.getFullYear() === m.year && f.getMonth() === m.month;
        });
        const ingresos = delMes.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        const gastos = delMes.filter(x => x.tipo === 'gasto').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        return { ...m, ingresos, gastos };
    });
}

function agruparPorAno(movimientos, anosInfo) {
    return anosInfo.map(a => {
        const delAno = movimientos.filter(mov => {
            const fechaUsar = mov.fecha_entrega || mov.fechaEntrega || mov.fecha;
            const f = parseFechaLocal(fechaUsar);
            return f.getFullYear() === a.year;
        });
        const ingresos = delAno.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        const gastos = delAno.filter(x => x.tipo === 'gasto').reduce((s, x) => s + (parseFloat(x.monto) || 0), 0);
        return { ...a, ingresos, gastos };
    });
}

function cambiarPeriodo(tipo) {
    periodoActualGrafica = tipo;

    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === tipo || (tipo === 'ano' && btn.textContent === 'Año')) {
            btn.classList.add('active');
        }
    });

    const sub = document.getElementById('analytics-subtitle');
    if(sub) {
        if(tipo === 'semana') sub.textContent = "Comparativa diaria — Últimos 7 días";
        if(tipo === 'mes') sub.textContent = "Comparativa mensual — Últimos 6 meses";
        if(tipo === 'ano') sub.textContent = "Comparativa anual — Histórico operativo";
    }

    if (movimientosGlobal && movimientosGlobal.length >= 0) {
        renderGraficaBarras(movimientosGlobal);
    }
}


// RENDERIZADO DE GRÁFICA DE BARRAS PRINCIPAL


function crearBarra(x, y, width, height, fill, delayMs) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', width); rect.setAttribute('height', Math.max(height, 1));
    rect.setAttribute('rx', 6); rect.setAttribute('fill', fill);
    rect.classList.add('chart-bar'); rect.style.transitionDelay = delayMs + 'ms';
    return rect;
}

function renderGraficaBarras(movimientos) {
    const svg = document.getElementById('chart-barras');
    if (!svg) return;

    svg.innerHTML = '';

    let datosGrafica = [];

    if (periodoActualGrafica === 'semana') {
        datosGrafica = agruparPorDia(movimientos, obtenerUltimos7Dias());
    } else if (periodoActualGrafica === 'ano') {
        datosGrafica = agruparPorAno(movimientos, obtenerUltimos5Anos());
    } else {
        datosGrafica = agruparPorMes(movimientos, obtenerUltimos6Meses());
    }

    const acumuladoIngresos = datosGrafica.reduce((sum, d) => sum + d.ingresos, 0);
    const acumuladoGastos = datosGrafica.reduce((sum, d) => sum + d.gastos, 0);
    const eficiencia = acumuladoIngresos > 0 ? ((acumuladoIngresos - acumuladoGastos) / acumuladoIngresos * 100) : 0;

    const elIng = document.getElementById('kpi-total-ingresos');
    const elGas = document.getElementById('kpi-total-gastos');
    const elEfi = document.getElementById('kpi-eficiencia');

    if(elIng) elIng.textContent = formatearMoneda(acumuladoIngresos);
    if(elGas) elGas.textContent = formatearMoneda(acumuladoGastos);
    if(elEfi) elEfi.textContent = `${eficiencia.toFixed(1)}%`;

    const maxValReal = Math.max(1, ...datosGrafica.map(d => Math.max(d.ingresos, d.gastos)));
    const maxVal = maxValReal * 1.15;

    const baseY = 180, topY = 30, alturaDisponible = baseY - topY;
    const anchoBarra = 16;
    const colorIngreso = '#C15C7A';
    const colorGasto = '#F6D9DE';

    for (let i = 0; i <= 4; i++) {
        const yGrid = baseY - (alturaDisponible * (i / 4));
        const valorEje = maxVal * (i / 4);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', yGrid);
        line.setAttribute('x2', '540');
        line.setAttribute('y2', yGrid);
        line.setAttribute('stroke', '#f3effa');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        const textMonto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textMonto.setAttribute('x', '0');
        textMonto.setAttribute('y', i === 0 ? yGrid : yGrid + 4);
        textMonto.setAttribute('font-size', '9');
        textMonto.setAttribute('fill', '#9c968e');
        textMonto.setAttribute('font-family', 'Poppins');
        textMonto.textContent = i === 0 ? '$0' : formatearMoneda(valorEje);
        svg.appendChild(textMonto);
    }

    const inicioX = 90;
    const finX = 450;
    const step = datosGrafica.length > 1 ? (finX - inicioX) / (datosGrafica.length - 1) : 0;

    const tituloEjeY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tituloEjeY.setAttribute('transform', 'translate(-35, 105) rotate(-90)');
    tituloEjeY.setAttribute('font-size', '11');
    tituloEjeY.setAttribute('font-weight', '600');
    tituloEjeY.setAttribute('fill', '#9c968e');
    tituloEjeY.setAttribute('font-family', 'Poppins');
    tituloEjeY.setAttribute('text-anchor', 'middle');
    tituloEjeY.textContent = 'Valores (Monto en MXN)';
    svg.appendChild(tituloEjeY);

    const tituloEjeX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tituloEjeX.setAttribute('x', '295');
    tituloEjeX.setAttribute('y', baseY + 55);
    tituloEjeX.setAttribute('font-size', '11');
    tituloEjeX.setAttribute('font-weight', '600');
    tituloEjeX.setAttribute('fill', '#9c968e');
    tituloEjeX.setAttribute('font-family', 'Poppins');
    tituloEjeX.setAttribute('text-anchor', 'middle');

    if (periodoActualGrafica === 'semana') {
        tituloEjeX.textContent = 'Categorías (Días)';
    } else if (periodoActualGrafica === 'ano') {
        tituloEjeX.textContent = 'Categorías (Años)';
    } else {
        tituloEjeX.textContent = 'Categorías (Meses)';
    }
    svg.appendChild(tituloEjeX);

    datosGrafica.forEach((d, i) => {
        const x = inicioX + (step * i);
        const hIngreso = (d.ingresos / maxVal) * alturaDisponible;
        const hGasto = (d.gastos / maxVal) * alturaDisponible;

        const bIngreso = crearBarra(x - 18, baseY - hIngreso, anchoBarra, hIngreso, colorIngreso, i * 60);
        bIngreso.setAttribute('rx', '6');
        svg.appendChild(bIngreso);

        if (d.ingresos > 0) {
            const lblIngreso = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lblIngreso.setAttribute('x', x - 18 + (anchoBarra / 2));
            lblIngreso.setAttribute('y', baseY - hIngreso - 10);
            lblIngreso.setAttribute('font-size', '9');
            lblIngreso.setAttribute('font-weight', '600');
            lblIngreso.setAttribute('fill', colorIngreso);
            lblIngreso.setAttribute('text-anchor', 'middle');
            lblIngreso.setAttribute('font-family', 'Poppins');
            lblIngreso.textContent = formatearMoneda(d.ingresos);
            lblIngreso.classList.add('chart-bar');
            lblIngreso.style.transitionDelay = (i * 60 + 100) + 'ms';
            svg.appendChild(lblIngreso);
        }

        const bGasto = crearBarra(x, baseY - hGasto, anchoBarra, hGasto, colorGasto, i * 60 + 30);
        bGasto.setAttribute('rx', '6');
        svg.appendChild(bGasto);

        if (d.gastos > 0) {
            const lblGasto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lblGasto.setAttribute('x', x + (anchoBarra / 2));
            lblGasto.setAttribute('y', baseY - hGasto - 10);
            lblGasto.setAttribute('font-size', '9');
            lblGasto.setAttribute('font-weight', '600');
            lblGasto.setAttribute('fill', '#C15C7A');
            lblGasto.setAttribute('text-anchor', 'middle');
            lblGasto.setAttribute('font-family', 'Poppins');
            lblGasto.textContent = formatearMoneda(d.gastos);
            lblGasto.classList.add('chart-bar');
            lblGasto.style.transitionDelay = (i * 60 + 130) + 'ms';
            svg.appendChild(lblGasto);
        }

        const textMes = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textMes.setAttribute('x', x - 2);
        textMes.setAttribute('y', baseY + 20);
        textMes.setAttribute('font-size', '10');
        textMes.setAttribute('fill', '#7a756e');
        textMes.setAttribute('font-family', 'Poppins');
        textMes.setAttribute('text-anchor', 'middle');
        textMes.textContent = d.label;
        svg.appendChild(textMes);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
        svg.querySelectorAll('.chart-bar').forEach(b => b.classList.add('is-visible'));
    }));
}


// OTRAS GRÁFICAS (Proyección y Dona Top 5)

function proyectarValores(valores) {
    const n = valores.length;
    if (n < 2) return [valores[n - 1] || 0, valores[n - 1] || 0];
    const variacion = (valores[n - 1] - valores[0]) / (n - 1);
    return [Math.max(0, valores[n - 1] + variacion), Math.max(0, valores[n - 1] + variacion * 2)];
}

function crearPunto(x, y, fill, delayMs, esProyectado) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3.5);
    c.setAttribute('fill', fill);
    if (esProyectado) c.setAttribute('opacity', '0.6');
    c.classList.add('chart-dot');
    c.style.transitionDelay = delayMs + 'ms';
    return c;
}

function renderGraficaPrediccion(movimientos) {
    const svg = document.getElementById('chart-prediccion');
    if (!svg) return;

    svg.innerHTML = '';

    const meses = agruparPorMes(movimientos, obtenerUltimos6Meses());
    const ingresosPorMes = meses.map(m => m.ingresos);
    const proyeccion = proyectarValores(ingresosPorMes);

    const maxValReal = Math.max(1, ...ingresosPorMes, ...proyeccion);
    const maxVal = maxValReal * 1.15;

    const xsHist = [70, 150, 230, 310, 390, 460];
    const xsProy = [500, 540];
    const baseY = 160, topY = 20, alturaDisponible = baseY - topY;

    for (let i = 0; i <= 4; i++) {
        const yGrid = baseY - (alturaDisponible * (i / 4));
        const valorEje = maxVal * (i / 4);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', yGrid);
        line.setAttribute('x2', '580');
        line.setAttribute('y2', yGrid);
        line.setAttribute('stroke', '#f3effa');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        const textMonto = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textMonto.setAttribute('x', '0');
        textMonto.setAttribute('y', i === 0 ? yGrid : yGrid + 4);
        textMonto.setAttribute('font-size', '9');
        textMonto.setAttribute('fill', '#9c968e');
        textMonto.setAttribute('font-family', 'Poppins');
        textMonto.textContent = i === 0 ? '$0' : formatearMoneda(valorEje);
        svg.appendChild(textMonto);
    }

    const puntosHist = xsHist.map((x, i) => [x, baseY - (ingresosPorMes[i] / maxVal) * alturaDisponible]);
    const puntosProy = xsProy.map((x, i) => [x, baseY - (proyeccion[i] / maxVal) * alturaDisponible]);

    const lineaHist = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    lineaHist.setAttribute('points', puntosHist.map(p => p.join(',')).join(' '));
    lineaHist.setAttribute('fill', 'none'); lineaHist.setAttribute('stroke', '#f6d9de');
    lineaHist.setAttribute('stroke-width', '2.5'); lineaHist.setAttribute('stroke-linecap', 'round');
    lineaHist.setAttribute('stroke-linejoin', 'round');
    lineaHist.classList.add('chart-line', 'chart-line--historico');
    svg.appendChild(lineaHist);

    const lineaProy = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    lineaProy.setAttribute('points', [puntosHist[puntosHist.length - 1], ...puntosProy].map(p => p.join(',')).join(' '));
    lineaProy.setAttribute('fill', 'none'); lineaProy.setAttribute('stroke', '#f6d9de');
    lineaProy.setAttribute('stroke-width', '2.5'); lineaProy.setAttribute('stroke-dasharray', '6 6');
    lineaProy.setAttribute('stroke-linecap', 'round');
    lineaProy.classList.add('chart-line', 'chart-line--proyeccion');
    svg.appendChild(lineaProy);

    puntosHist.forEach(([x, y], i) => svg.appendChild(crearPunto(x, y, '#f6d9de', i * 100, false)));
    puntosProy.forEach(([x, y], i) => svg.appendChild(crearPunto(x, y, '#f6d9de', 700 + i * 150, true)));

    const tituloEjeYPred = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tituloEjeYPred.setAttribute('transform', 'translate(-35, 90) rotate(-90)');
    tituloEjeYPred.setAttribute('font-size', '11');
    tituloEjeYPred.setAttribute('font-weight', '600');
    tituloEjeYPred.setAttribute('fill', '#9c968e');
    tituloEjeYPred.setAttribute('font-family', 'Poppins');
    tituloEjeYPred.setAttribute('text-anchor', 'middle');
    tituloEjeYPred.textContent = 'Valores (Monto en MXN)';
    svg.appendChild(tituloEjeYPred);

    const tituloEjeXPred = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tituloEjeXPred.setAttribute('x', '305');
    tituloEjeXPred.setAttribute('y', baseY + 35);
    tituloEjeXPred.setAttribute('font-size', '11');
    tituloEjeXPred.setAttribute('font-weight', '600');
    tituloEjeXPred.setAttribute('fill', '#9c968e');
    tituloEjeXPred.setAttribute('font-family', 'Poppins');
    tituloEjeXPred.setAttribute('text-anchor', 'middle');
    tituloEjeXPred.textContent = 'Categorías (Meses / Proyección)';
    svg.appendChild(tituloEjeXPred);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        const len = lineaHist.getTotalLength();
        lineaHist.style.strokeDasharray = len;
        lineaHist.style.strokeDashoffset = len;
        lineaHist.getBoundingClientRect();
        lineaHist.style.transition = 'stroke-dashoffset .9s ease';
        lineaHist.style.strokeDashoffset = '0';
        setTimeout(() => {
            lineaProy.classList.add('is-visible');
            svg.querySelectorAll('.chart-dot').forEach(d => d.classList.add('is-visible'));
        }, 750);
    }));
}

// RENDERIZADO CORREGIDO Y ROBUSTO DE D DONA (TOP PRODUCTOS)

function renderGraficaDona(productosApi) {
    const listaContenedor = document.getElementById('top-productos-lista');
    const donutSvg = document.getElementById('donut-svg');
    if (!listaContenedor || !donutSvg) return;

    listaContenedor.innerHTML = '';
    donutSvg.innerHTML = '';

    if (!Array.isArray(productosApi) || productosApi.length === 0) {
        listaContenedor.innerHTML = `
            <div style="text-align:center; padding: 20px; color: var(--ink-soft); font-size: 0.9rem;">
                No hay datos de productos más vendidos.
            </div>`;
        return;
    }

    
    const coloresProductos = ["#C15C7A", "#7fa885", "#c98a3e", "#63A9E8", "#c294d6"];

    let topProductos = productosApi.slice(0, 5).map((prod, index) => {
        const nombre = prod.nombreProducto || prod.nombre || prod.producto || `Producto ${index + 1}`;
        const ingresoGenerado = parseFloat(prod.totalIngresos || prod.montoTotal || prod.total || prod.ingresoGenerado || prod.monto || 0);
        const porcentajeServidor = parseFloat(prod.porcentaje);

        return {
            nombre,
            ingresoGenerado,
            porcentajeServer: !isNaN(porcentajeServidor) ? porcentajeServidor : null
        };
    });

    const sumaTotalIngresos = topProductos.reduce((sum, p) => sum + p.ingresoGenerado, 0);


    topProductos = topProductos.map(prod => {
        let porcentajeFinal = prod.porcentajeServer;
        if (porcentajeFinal === null) {
            porcentajeFinal = sumaTotalIngresos > 0 ? (prod.ingresoGenerado / sumaTotalIngresos) * 100 : 0;
        }
        return {
            ...prod,
            porcentaje: parseFloat(porcentajeFinal.toFixed(1))
        };
    });

    donutSvg.setAttribute('viewBox', '0 0 240 240');

    let dashOffsetAcumulado = 0;
    const radio = 80;
    const circunferenciaTotal = 2 * Math.PI * radio; 

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", "rotate(-90 120 120)");
    donutSvg.appendChild(g);

    topProductos.forEach((prod, index) => {
        const color = coloresProductos[index % coloresProductos.length];
        const porcentaje = prod.porcentaje || 0;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'product-item';
        itemDiv.innerHTML = `
            <span class="product-rank">${index + 1}</span>
            <span class="product-dot" style="background:${color};"></span>
            <span class="product-name">${prod.nombre}</span>
            <span class="product-revenue">${formatearMoneda(prod.ingresoGenerado)}</span>
            <span class="product-percent">${porcentaje}%</span>
            <div class="product-bar-bg">
                <div class="product-bar-fill" style="width:${porcentaje}%; background:${color};"></div>
            </div>
        `;
        listaContenedor.appendChild(itemDiv);

        setTimeout(() => {
            const barra = itemDiv.querySelector('.product-bar-fill');
            if (barra) barra.classList.add('is-visible');
        }, 100 + (index * 50));

        if (sumaTotalIngresos > 0 && porcentaje > 0) {
            const dashArrayValue = (porcentaje / 100) * circunferenciaTotal;
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "120");
            circle.setAttribute("cy", "120");
            circle.setAttribute("r", radio.toString());
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", color);
            circle.setAttribute("stroke-width", "40");
            circle.setAttribute("stroke-dasharray", `${dashArrayValue} ${circunferenciaTotal}`);
            circle.setAttribute("stroke-dashoffset", (-dashOffsetAcumulado).toString());
            circle.setAttribute("class", "donut-segment");
            circle.style.transition = 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease';

            g.appendChild(circle);
            dashOffsetAcumulado += dashArrayValue;
        }
    });
}

// ANIMACIONES ADICIONALES (Contadores y Navegación)

function animarContadores(movimientos) {
    let totIng = 0, totGas = 0;
    movimientos.forEach(mov => {
        const m = parseFloat(mov.monto) || 0;
        if (mov.tipo === 'ingreso') totIng += m; else totGas += m;
    });
    const gan = totIng - totGas;
    contarHasta('val-ingresos', totIng, formatearMoneda);
    contarHasta('val-gastos', totGas, formatearMoneda);
    contarHasta('val-ganancia', gan, formatearMoneda);
    contarHasta('val-margen', totIng > 0 ? (gan / totIng) * 100 : 0, v => `${v.toFixed(1)}%`);
}

function contarHasta(id, valFin, formatear) {
    const el = document.getElementById(id); if (!el) return;
    const dur = 700, ini = performance.now();
    function tick(ahora) {
        const prog = Math.min((ahora - ini) / dur, 1);
        const fac = 1 - Math.pow(1 - prog, 3);
        el.textContent = formatear(valFin * fac);
        if (prog < 1) requestAnimationFrame(tick); else el.textContent = formatear(valFin);
    }
    requestAnimationFrame(tick);
}

const appEl = document.querySelector('.app');
function navegarCon(url) {
    if(appEl) appEl.classList.add('is-leaving');
    setTimeout(() => { window.location.href = url; }, 200);
}

document.querySelectorAll('.nav__item, .nav__logout').forEach(link => {
    if (link.tagName === 'A' && link.getAttribute('href')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navegarCon(link.getAttribute('href'));
        });
    }
});

document.addEventListener('DOMContentLoaded', cargarFinanzas);
