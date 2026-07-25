// toast.js
window.mostrarToast = function(mensaje) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');

    if (!toast || !toastMsg) {
        console.warn('El componente Toast no se encontró en el HTML.');
        return;
    }

    // Actualizamos el texto
    toastMsg.textContent = mensaje;

    // Mostramos el toast
    toast.classList.add('is-visible');

    // Reiniciamos el temporizador por si se llamó a la función varias veces rápido
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }

    // Lo ocultamos después de 3.2 segundos
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 3200);
};