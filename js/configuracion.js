// --- Configuración API ---
const API_CONF = 'http://35.171.239.148:7000/api/configuracion';
const API_SEGURIDAD = 'http://35.171.239.148:7000/api/seguridad';
const API_SESIONES = 'http://35.171.239.148:7000/api/sesiones';

let sesionesGlobales = [];

// --- Utilidad: Toast ---
function mostrarToast(mensaje) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = mensaje;
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

// --- Lógica de Navegación por Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        ['general', 'seguridad', 'sesiones'].forEach(id => {
            document.getElementById(`panel-${id}`).classList.toggle('hidden', id !== tab.dataset.tab);
        });

        if (tab.dataset.tab === 'sesiones' && sesionesGlobales.length === 0) {
            cargarSesiones();
        }
    });
});


// ============================================
// TAB: GENERAL (Adaptado para Compactar Datos)
// ============================================

// Cargar Configuración General (GET)
async function cargarConfiguracion() {
    try {
        const response = await fetch(API_CONF);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('g-nombre').value = data.nombre || '';

            // Intentamos parsear los datos extra empaquetados en descripcion
            try {
                const infoExtra = JSON.parse(data.descripcion);
                document.getElementById('g-telefono').value = infoExtra.telefono || '';
                document.getElementById('g-correo').value = infoExtra.correo || '';
                document.getElementById('g-direccion').value = infoExtra.direccion || '';
                document.getElementById('g-horario').value = infoExtra.horario || '';
                document.getElementById('g-descripcion').value = infoExtra.descripcion || '';
            } catch (e) {
                // Si la base de datos tenía texto plano antiguo en datos_generales, cae aquí
                document.getElementById('g-descripcion').value = data.descripcion || '';
            }
        }
    } catch (error) {
        console.error('Error al cargar configuración general:', error);
    }
}

// Guardar Configuración General (PUT)
document.getElementById('form-general').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Empaquetamos los campos extra dentro de un string JSON para guardarlos en "datos_generales"
    const infoExtra = {
        telefono: document.getElementById('g-telefono').value.trim(),
        correo: document.getElementById('g-correo').value.trim(),
        direccion: document.getElementById('g-direccion').value.trim(),
        horario: document.getElementById('g-horario').value.trim(),
        descripcion: document.getElementById('g-descripcion').value.trim()
    };

    const configData = {
        nombre: document.getElementById('g-nombre').value.trim(),
        descripcion: JSON.stringify(infoExtra) // Se envía como texto al backend
    };

    try {
        const response = await fetch(API_CONF, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });

        if (response.ok) {
            mostrarToast('Datos del negocio actualizados');
        } else {
            alert('Error al actualizar los datos de la configuración.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al guardar la configuración.');
    }
});


// ============================================
// TAB: SEGURIDAD
// ============================================

// Cambiar Contraseña (PUT)
document.getElementById('form-seguridad').addEventListener('submit', async (e) => {
    e.preventDefault();

    const actual = document.getElementById('s-actual').value;
    const nueva = document.getElementById('s-nueva').value;
    const confirmar = document.getElementById('s-confirmar').value;
    const errorMsg = document.getElementById('s-error');

    if (nueva !== confirmar) {
        errorMsg.style.display = 'block';
        return;
    }
    errorMsg.style.display = 'none';

    try {
        const response = await fetch(API_SEGURIDAD, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actual: actual, nueva: nueva })
        });

        if (response.ok) {
            document.getElementById('form-seguridad').reset();
            mostrarToast('Contraseña actualizada correctamente');
        } else {
            alert('Error: La contraseña actual es incorrecta.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al actualizar la contraseña.');
    }
});


// ============================================
// TAB: SESIONES
// ============================================

// Cargar Sesiones Activas (GET)
async function cargarSesiones() {
    const lista = document.getElementById('lista-sesiones');

    try {
        const response = await fetch(API_SESIONES);
        if (!response.ok) throw new Error('Error al obtener sesiones');

        sesionesGlobales = await response.json();
        renderListaSesiones(sesionesGlobales);
    } catch (error) {
        console.error('Error:', error);
        lista.innerHTML = `<p style="color:var(--error); font-weight:500;">Error al cargar las sesiones. ¿El servidor está corriendo?</p>`;
    }
}

// Renderizar HTML de Sesiones
function renderListaSesiones(sesiones) {
    const lista = document.getElementById('lista-sesiones');

    if (sesiones.length === 0) {
        lista.innerHTML = `<p style="color:var(--ink-soft);">No hay sesiones registradas.</p>`;
        return;
    }

    lista.innerHTML = sesiones.map(s => `
        <div class="sesion-item">
            <span class="sesion-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </span>
            <div class="sesion-info">
                <div class="sesion-info__top">
                    ${s.dispositivo} 
                    ${s.actual ? '<span class="badge-actual">Esta sesión</span>' : ''}
                </div>
                <div class="sesion-info__meta">IP ${s.ip} · Última actividad: ${s.ultima}</div>
            </div>
            <div class="sesion-actions">
                ${s.actual ? '' : `<button onclick="cerrarSesion(${s.id})">Cerrar sesión</button>`}
            </div>
        </div>
    `).join('');
}

// Cerrar una sesión individual (DELETE)
window.cerrarSesion = async function(id) {
    try {
        const response = await fetch(`${API_SESIONES}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cargarSesiones();
            mostrarToast('Sesión cerrada correctamente');
        } else {
            alert('Error al cerrar la sesión.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al cerrar la sesión.');
    }
}

// Cerrar TODAS las demás sesiones (DELETE)
document.getElementById('btn-cerrar-todas').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_SESIONES}/otras`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cargarSesiones();
            mostrarToast('Se cerraron todas las demás sesiones');
        } else {
            alert('Error al intentar cerrar las otras sesiones.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Fallo de conexión al realizar la acción.');
    }
});

// --- Cargar datos iniciales ---
document.addEventListener('DOMContentLoaded', cargarConfiguracion);

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