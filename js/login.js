const API_LOGIN_URL = 'http://35.171.239.148:7000/api/login';

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const toggleBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

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
      
      const data = await response.json();

      localStorage.setItem('user_role', data.rol);
      localStorage.setItem('user_name', data.nombre);

      window.location.href = 'dashboard.html';
    } else {
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
