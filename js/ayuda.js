// ---- Acordeón: guías de módulos ----
document.querySelectorAll('.guide-item__header').forEach(header => {
    header.addEventListener('click', () => {
        header.closest('.guide-item').classList.toggle('is-open');
    });
});

// ---- Acordeón: FAQ ----
document.querySelectorAll('.faq-item__q').forEach(q => {
    q.addEventListener('click', () => {
        q.closest('.faq-item').classList.toggle('is-open');
    });
});

// ---- Buscador (filtra guías y FAQ por palabra clave) ----
const buscador = document.getElementById('buscador');
const sinResultados = document.getElementById('sin-resultados');

buscador.addEventListener('input', () => {
    const texto = buscador.value.trim().toLowerCase();
    let visibles = 0;

    document.querySelectorAll('.guide-item, .faq-item').forEach(item => {
        const coincide = !texto || item.dataset.tema.includes(texto);
        item.style.display = coincide ? '' : 'none';
        if (coincide) visibles++;
    });

    sinResultados.style.display = visibles === 0 ? 'block' : 'none';
});

// ---- Transición al salir de la página ----
const appEl = document.querySelector('.app');
const DURACION_SALIDA = 200; // debe coincidir con pageFadeOut del CSS

function navegarCon(url) {
    if (!appEl) return;
    appEl.classList.add('is-leaving');
    setTimeout(() => { window.location.href = url; }, DURACION_SALIDA);
}

document.querySelectorAll('.nav__item, .nav__logout').forEach(link => {
    // Interceptamos la navegación del sidebar para inyectar el fade-out
    if (link.tagName === 'A' && link.getAttribute('href')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navegarCon(link.getAttribute('href'));
        });
    }
});