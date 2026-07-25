(function() {
    const userRole = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');
    const currentPath = window.location.pathname;

    if (!userRole && !currentPath.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const avatarEl = document.getElementById('user-avatar');
        const nameEl = document.getElementById('user-name-display');
        const roleEl = document.getElementById('user-role-display');

        if (nameEl && userName) {
            nameEl.textContent = userName;
        }

        if (userRole === 'ayudante' || userRole === '2') {

            if (avatarEl) avatarEl.textContent = 'AN';
            if (roleEl) roleEl.textContent = 'Ayudante de cocina';

            if (currentPath.includes('finanzas.html') || currentPath.includes('configuracion.html')) {
                window.location.href = 'dashboard.html';
                return;
            }

            const linkFinanzas = document.querySelector('a[href="finanzas.html"]');
            const linkConfig = document.querySelector('a[href="configuracion.html"]');

            if (linkFinanzas) linkFinanzas.style.display = 'none';
            if (linkConfig) linkConfig.style.display = 'none';

            if (currentPath.includes('ayuda.html')) {
                const guiaFinanzas = document.querySelector('.guide-item[data-tema*="finanzas"]');
                const guiaConfig = document.querySelector('.guide-item[data-tema*="configuracion"]');

                if (guiaFinanzas) guiaFinanzas.remove();
                if (guiaConfig) guiaConfig.remove();
            }

        } else {
            if (avatarEl) avatarEl.textContent = 'AS';
            if (roleEl) roleEl.textContent = 'Administradora';
        }
    });
})();
