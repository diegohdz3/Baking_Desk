window.mostrarToast = function(mensaje) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');

    if (!toast || !toastMsg) {
        console.warn('El componente Toast no se encontró en el HTML.');
        return;
    }

    toastMsg.textContent = mensaje;

    toast.classList.add('is-visible');

    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }

    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 3200);
};
