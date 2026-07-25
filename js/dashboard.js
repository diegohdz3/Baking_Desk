const API_URL = 'http://35.171.239.148:7000/api/dashboard';

const tbody = document.getElementById('tabla-body');

const formatearMoneda = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
const formatearK = (valor) => valor >= 1000 ? `$${(valor/1000).toFixed(1)}k` : `$${valor}`;

// Mostrar fecha actual
document.getElementById('today').textContent = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

async function cargarDashboard() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');

        const data = await response.json();

        animarStats(data.stats);

        renderTabla(data.pedidosRecientes);
        renderGraficoVentas(data.ventasSemana);
        renderGraficoDona(data.pedidosEstado);

    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--error); font-weight:500; padding:20px;">
                Error al conectar con el servidor. ¿Está corriendo en el puerto 7000?
            </td></tr>`;
        }
    }
}

function actualizarStats(stats) {
    if (!stats) return;
    document.getElementById('stat-pedidos').textContent = stats.pedidosHoy || 0;
    document.getElementById('stat-ventas').textContent = formatearMoneda(stats.ventasHoy || 0);
    document.getElementById('stat-bajos').textContent = stats.productosBajos || 0;
    document.getElementById('stat-clientes').textContent = stats.clientes || 0;
}

function renderTabla(pedidos) {
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:20px;">
            No hay pedidos recientes.
        </td></tr>`;
        return;
    }

    pedidos.forEach((pedido, i) => {
        const tr = document.createElement('tr');

        const badgeClasses = {
            'nuevo': 'nuevo',
            'en curso': 'en-curso',
            'listo': 'listo',
            'entregado': 'entregado'
        };
        const estadoClase = badgeClasses[pedido.estado.toLowerCase()] || 'nuevo';

        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${pedido.cliente}</td>
            <td>${pedido.producto}</td>
            <td>${pedido.fechaEntrega}</td>
            <td><span class="badge ${estadoClase}">${pedido.estado}</span></td>
            <td>${formatearMoneda(pedido.total)}</td>
        `;
        tr.classList.add('row-in');
        tr.style.animationDelay = (i * 45) + 'ms';
        tbody.appendChild(tr);
    });
}

function renderGraficoVentas(ventasArray) {
    if (!ventasArray || ventasArray.length !== 7) return;

    const maxVenta = Math.max(...ventasArray, 100);

    document.getElementById('lbl-max').textContent = formatearK(maxVenta);
    document.getElementById('lbl-mid').textContent = formatearK(maxVenta / 2);

    const xPos = [70, 150, 230, 310, 390, 470, 540];

    const points = ventasArray.map((venta, i) => {
        const y = 180 - ((venta / maxVenta) * 160);
        return `${xPos[i]},${y}`;
    });

    const pointsStr = points.join(' ');
    const polygonPoints = `${pointsStr} 540,180 70,180`;

    const polygon = document.getElementById('chart-polygon');
    const linea = document.getElementById('chart-line');
    const gPoints = document.getElementById('chart-points');

    if (!polygon || !linea || !gPoints) return;

    polygon.setAttribute('points', polygonPoints);
    linea.setAttribute('points', pointsStr);

    gPoints.innerHTML = '';
    ventasArray.forEach((venta, i) => {
        const y = 180 - ((venta / maxVenta) * 160);
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", xPos[i]);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "4");
        circle.classList.add('chart-dot');
        circle.style.transitionDelay = (650 + i * 70) + 'ms';
        gPoints.appendChild(circle);
    });


    const svg = polygon.ownerSVGElement; 

    svg.querySelectorAll('.eje-titulo').forEach(el => el.remove());

    const tituloEjeY = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    tituloEjeY.setAttribute('transform', 'translate(-15, 90) rotate(-90)');
    tituloEjeY.setAttribute('font-size', '11');
    tituloEjeY.setAttribute('font-weight', '600');
    tituloEjeY.setAttribute('fill', '#9c968e');
    tituloEjeY.setAttribute('font-family', 'Poppins');
    tituloEjeY.setAttribute('text-anchor', 'middle');
    tituloEjeY.classList.add('eje-titulo');
    tituloEjeY.textContent = 'Valores (Monto en MXN)';
    svg.appendChild(tituloEjeY);

    // Etiqueta Eje X 
    const tituloEjeX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tituloEjeX.setAttribute('x', '305'); 
    tituloEjeX.setAttribute('y', '230'); 
    tituloEjeX.setAttribute('font-size', '11');
    tituloEjeX.setAttribute('font-weight', '600');
    tituloEjeX.setAttribute('fill', '#9c968e');
    tituloEjeX.setAttribute('font-family', 'Poppins');
    tituloEjeX.setAttribute('text-anchor', 'middle');
    tituloEjeX.classList.add('eje-titulo');
    tituloEjeX.textContent = 'Categorías (Días de la semana)';
    svg.appendChild(tituloEjeX);

    polygon.style.opacity = '0';

    requestAnimationFrame(() => requestAnimationFrame(() => {
        const len = linea.getTotalLength();
        linea.style.strokeDasharray = len;
        linea.style.strokeDashoffset = len;
        linea.getBoundingClientRect();
        linea.style.strokeDashoffset = '0';

        polygon.style.opacity = '1';

        gPoints.querySelectorAll('.chart-dot').forEach(d => d.classList.add('is-visible'));
    }));
}

function renderGraficoDona(estados) {
    if (!estados) return;

    const circ = 439.82;
    const total = estados.total || 1;

    contarHasta('donut-total', estados.total || 0, v => Math.round(v));
    contarHasta('leg-nuevo', estados.nuevo || 0, v => Math.round(v));
    contarHasta('leg-curso', estados.enCurso || 0, v => Math.round(v));
    contarHasta('leg-listo', estados.listo || 0, v => Math.round(v));
    contarHasta('leg-entregado', estados.entregado || 0, v => Math.round(v));

    let offsetActual = 0;
    const segmentos = [
        { id: 'donut-nuevo', valor: estados.nuevo || 0 },
        { id: 'donut-curso', valor: estados.enCurso || 0 },
        { id: 'donut-listo', valor: estados.listo || 0 },
        { id: 'donut-entregado', valor: estados.entregado || 0 },
    ];

    segmentos.forEach((seg, i) => {
        const el = document.getElementById(seg.id);
        if (!el) return;

        const pct = seg.valor / total;
        const dash = pct * circ;

        el.setAttribute('stroke-dashoffset', -offsetActual);
        el.setAttribute('stroke-dasharray', `0 ${circ}`);

        setTimeout(() => {
            el.setAttribute('stroke-dasharray', `${dash} ${circ}`);
        }, i * 130);

        offsetActual += dash;
    });
}


function contarHasta(id, valorFinal, formatear) {
    const el = document.getElementById(id);
    if (!el) return;
    const duracion = 700;
    const inicio = performance.now();

    function tick(ahora) {
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        const facilitado = 1 - Math.pow(1 - progreso, 3);
        el.textContent = formatear(valorFinal * facilitado);
        if (progreso < 1) requestAnimationFrame(tick);
        else el.textContent = formatear(valorFinal);
    }
    requestAnimationFrame(tick);
}

function animarStats(stats) {
    if (!stats) return;
    contarHasta('stat-pedidos', stats.pedidosHoy || 0, v => Math.round(v));
    contarHasta('stat-ventas', stats.ventasHoy || 0, formatearMoneda);
    contarHasta('stat-bajos', stats.productosBajos || 0, v => Math.round(v));
    contarHasta('stat-clientes', stats.clientes || 0, v => Math.round(v));
}


const appEl = document.querySelector('.app');
const DURACION_SALIDA = 200;

function navegarCon(url) {
    if (appEl) {
        appEl.classList.add('is-leaving');
    }
    setTimeout(() => { window.location.href = url; }, DURACION_SALIDA);
}

document.querySelectorAll('.nav__item, .nav__logout, #btn-logout').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.tagName === 'A' || link.closest('a')) {
            e.preventDefault();

            if (link.classList.contains('nav__logout') || link.id === 'btn-logout') {
                localStorage.removeItem('user_role');
                localStorage.removeItem('user_name');

                navegarCon('login.html');
            } else {
                const destino = link.getAttribute('href') || link.closest('a').getAttribute('href');
                if (destino) navegarCon(destino);
            }
        }
    });
});



document.addEventListener('DOMContentLoaded', () => {

    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');


    if (!userRole) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos de la barra lateral
    const avatarDisplay = document.getElementById('user-avatar');
    const nameDisplay = document.getElementById('user-name-display');
    const roleDisplay = document.getElementById('user-role-display');

    if (nameDisplay && userName) {
        nameDisplay.textContent = userName;
    }

    if (userRole === 'ayudante' || userRole === '2') {

        if (avatarDisplay) avatarDisplay.textContent = 'AN';
        if (roleDisplay) roleDisplay.textContent = 'Ayudante de cocina';

        const menuFinanzas = document.querySelector('a[href*="finanzas.html"]');
        const menuConfiguracion = document.querySelector('a[href*="configuracion.html"]');

        if (menuFinanzas) menuFinanzas.remove();
        if (menuConfiguracion) menuConfiguracion.remove();

    } else {
        if (avatarDisplay) avatarDisplay.textContent = 'AS';
        if (roleDisplay) roleDisplay.textContent = 'Administradora';
    }

    cargarDashboard();
});
