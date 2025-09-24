// Base URL for API requests. Update this when the backend is deployed on another host.
const API_BASE = 'http://localhost:8000';

// Update authentication links depending on login status
function updateAuthLinks() {
  const links = document.querySelectorAll('.auth-link');
  const user = localStorage.getItem('username');
  links.forEach(link => {
    if (user) {
      link.textContent = `Вы: ${user}`;
      link.href = '#';
    } else {
      link.textContent = 'Вход / Регистрация';
      link.href = 'login.html';
    }
  });
}

// Event listener for forms when page is loaded
document.addEventListener('DOMContentLoaded', () => {
  updateAuthLinks();
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        if (res.ok) {
          alert('Регистрация прошла успешно');
          window.location.href = 'login.html';
        } else {
          const data = await res.json();
          alert(data.detail || 'Ошибка регистрации');
        }
      } catch (err) {
        alert('Ошибка соединения с сервером');
      }
    });
  }
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('username', data.username);
          alert('Вы успешно вошли');
          window.location.href = 'index.html';
        } else {
          const data = await res.json();
          alert(data.detail || 'Ошибка входа');
        }
      } catch (err) {
        alert('Ошибка соединения с сервером');
      }
    });
  }
});