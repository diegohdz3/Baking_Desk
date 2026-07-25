// --- Configuración API ---
const API_LOGIN_URL = 'http://35.171.239.148:7000/api/login';

// --- Elementos del DOM ---
const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const toggleBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

// --- Lógica: Mostrar/Ocultar contraseña ---
toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

// --- Manejo del Formulario de Inicio de Sesión ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Limpiar mensaje de error previo
  errorBox.classList.remove('is-visible');

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;
  const remember = document.getElementById('remember').checked;

  if (!username || !password) {
    errorBox.textContent = 'Completa usuario y contraseña.';
    errorBox.classList.add('is-visible');
    return;
  }

  try {
    // Petición POST a la API de Javalin
    const response = await fetch(API_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password,
        remember: remember
      })
    });

    if (response.ok) {
      // 1. Extraemos el JSON que nos responde Javalin (LoginResponse)
      const data = await response.json();

      // 2. Guardamos el rol y el nombre en el almacenamiento del navegador
      localStorage.setItem('user_role', data.rol);
      localStorage.setItem('user_name', data.nombre);

      // 3. Redirigir al dashboard tras login exitoso
      window.location.href = 'dashboard.html';
    } else {
      // Manejar error leyendo el mensaje exacto que manda Javalin
      const errorData = await response.json();
      errorBox.textContent = errorData.error || 'Usuario o contraseña incorrectos.';
      errorBox.classList.add('is-visible');
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    errorBox.textContent = 'Fallo al conectar con el servidor. Verifica que esté activo en el puerto 7000.';
    errorBox.classList.add('is-visible');
  }
});