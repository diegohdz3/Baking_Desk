// seguridad.js — El guardián de Nieves Repostería
(function() {
    // 1. Verificar inmediatamente (antes de que cargue el HTML) si el usuario inició sesión
    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');
    const currentPath = window.location.pathname;

    // Si no ha iniciado sesión y no está en el login, lo expulsamos inmediatamente
    if (!userRole && !currentPath.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Aplicamos las restricciones visuales y de datos cuando cargue el DOM
    document.addEventListener('DOMContentLoaded', () => {
        const avatarEl = document.getElementById('user-avatar');
        const nameEl = document.getElementById('user-name-display');
        const roleEl = document.getElementById('user-role-display');

        // Mostrar el nombre real del usuario logueado en cualquier pantalla
        if (nameEl && userName) {
            nameEl.textContent = userName;
        }

        // Si el usuario es ayudante
        if (userRole === 'ayudante' || userRole === '2') {

            // Personalizar datos del menú lateral
            if (avatarEl) avatarEl.textContent = 'AN';
            if (roleEl) roleEl.textContent = 'Ayudante de cocina';

            // Bloqueo de URLs: Si intenta escribir la ruta prohibida, lo rebota
            if (currentPath.includes('finanzas.html') || currentPath.includes('configuracion.html')) {
                window.location.href = 'dashboard.html';
                return;
            }

            // Ocultar botones del menú lateral
            const linkFinanzas = document.querySelector('a[href="finanzas.html"]');
            const linkConfig = document.querySelector('a[href="configuracion.html"]');

            if (linkFinanzas) linkFinanzas.style.display = 'none';
            if (linkConfig) linkConfig.style.display = 'none';

            // 🌟 NUEVO: Si está en ayuda.html, borramos las guías de Finanzas y Configuración 🌟
            if (currentPath.includes('ayuda.html')) {
                // Buscamos las tarjetas de guía usando su atributo data-tema
                const guiaFinanzas = document.querySelector('.guide-item[data-tema*="finanzas"]');
                const guiaConfig = document.querySelector('.guide-item[data-tema*="configuracion"]');

                if (guiaFinanzas) guiaFinanzas.remove();
                if (guiaConfig) guiaConfig.remove();
            }

        } else {
            // Si entra la administradora (Adriana), nos aseguramos de que sus datos estén fijos
            if (avatarEl) avatarEl.textContent = 'AS';
            if (roleEl) roleEl.textContent = 'Administradora';
        }
    });
})();