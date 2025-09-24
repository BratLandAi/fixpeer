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

  // Show post form only when user is logged in
  const postFormContainer = document.getElementById('postFormContainer');
  if (postFormContainer) {
    const user = localStorage.getItem('username');
    if (user) {
      postFormContainer.classList.remove('hidden');
    } else {
      postFormContainer.classList.add('hidden');
    }
  }

  // Registration form handling
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

  // Login form handling
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

  // Task form handling (posting orders)
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = localStorage.getItem('username');
      if (!user) {
        alert('Для размещения заказа нужно войти или зарегистрироваться');
        window.location.href = 'login.html';
        return;
      }
      const title = document.getElementById('title').value;
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value;
      const budget = document.getElementById('budget').value;
      const deadline = document.getElementById('deadline').value;
      const address = document.getElementById('address').value;
      const payload = { username: user, title, category, description };
      if (budget) payload.budget = parseFloat(budget);
      if (deadline) payload.deadline = deadline;
      if (address) payload.address = address;
      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert('Заказ опубликован');
          window.location.href = 'index.html';
        } else {
          const data = await res.json();
          alert(data.detail || 'Ошибка при создании заказа');
        }
      } catch (err) {
        alert('Ошибка соединения с сервером');
      }
    });
  }

  // Load contractors for search page
  const contractorList = document.getElementById('contractorList');
  if (contractorList) {
    // Load contractors initially and attach search handlers
    loadContractors();
    const searchBtn = document.getElementById('searchButton');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const query = (document.getElementById('searchQuery')?.value || '').trim().toLowerCase();
        const category = document.getElementById('searchCategory')?.value || '';
        const sort = document.getElementById('searchSort')?.value || '';
        loadContractors(query, category, sort);
      });
    }
  }

  // Load posts for feed page
  const postsContainer = document.getElementById('postsContainer');
  if (postsContainer) {
    loadPosts();
  }

  // Attach post creation handler
  const postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = localStorage.getItem('username');
      if (!user) {
        alert('Для создания публикации нужно войти или зарегистрироваться');
        window.location.href = 'login.html';
        return;
      }
      const content = document.getElementById('postContent').value;
      const fileInput = document.getElementById('postImage');
      let image = null;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
          image = await toBase64(fileInput.files[0]);
        } catch (err) {
          console.error('Ошибка чтения файла', err);
        }
      }
      const payload = { username: user, content };
      if (image) payload.image = image;
      try {
        const res = await fetch(`${API_BASE}/api/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          // clear form
          document.getElementById('postContent').value = '';
          if (fileInput) fileInput.value = '';
          // reload posts
          loadPosts();
        } else {
          const data = await res.json();
          alert(data.detail || 'Ошибка при создании публикации');
        }
      } catch (err) {
        alert('Ошибка соединения с сервером');
      }
    });
  }

  // Load contractor profile if on profile page
  const profileHeader = document.getElementById('profileHeader');
  if (profileHeader) {
    loadProfile();
  }
});

// Convert file to base64 (data URL)
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Fetch and display contractors with optional filtering
async function loadContractors(query = '', category = '', sort = '') {
  const container = document.getElementById('contractorList');
  if (!container) return;
  container.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE}/api/contractors`);
    let contractors = await res.json();
    // Filter by search query
    if (query) {
      contractors = contractors.filter(c => {
        const name = (c.full_name || c.username || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        return name.includes(query) || desc.includes(query) || cat.includes(query);
      });
    }
    // Filter by category
    if (category) {
      contractors = contractors.filter(c => c.category === category);
    }
    // Sorting
    if (sort === 'rating') {
      contractors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'experience') {
      contractors.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    } else if (sort === 'name') {
      contractors.sort((a, b) => (a.full_name || a.username || '').localeCompare(b.full_name || b.username || ''));
    }
    // Render
    contractors.forEach(c => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg shadow border hover:shadow-lg transition p-5';
      const ratingStars = c.rating ? '★'.repeat(Math.round(c.rating)) : '';
      card.innerHTML = `
        <div class="flex items-center mb-4">
          <img src="https://via.placeholder.com/60" alt="avatar" class="w-12 h-12 rounded-full object-cover">
          <div class="ml-3">
            <h3 class="text-lg font-semibold">${c.full_name || c.username}</h3>
            <p class="text-sm text-gray-500">${c.category || ''}${c.city ? ' · ' + c.city : ''}</p>
            <div class="flex items-center text-yellow-400 text-sm mt-1">
              ${ratingStars} <span class="text-gray-500 ml-1">${c.rating ? c.rating.toFixed(1) : ''}</span>
            </div>
          </div>
        </div>
        <p class="text-gray-600">${c.description || ''}</p>
        <a href="profile.html?username=${encodeURIComponent(c.username)}" class="mt-4 inline-block text-blue-600 hover:underline">Смотреть профиль</a>
      `;
      container.appendChild(card);
    });
    if (contractors.length === 0) {
      container.innerHTML = '<p class="text-gray-600">Ничего не найдено</p>';
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-red-600">Ошибка загрузки подрядчиков</p>';
  }
}

// Fetch and display posts. If username is provided, only posts by that user will be shown.
async function loadPosts(username = null, containerId = 'postsContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  try {
    let url = `${API_BASE}/api/posts`;
    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }
    const res = await fetch(url);
    const posts = await res.json();
    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg shadow px-6 py-6';
      card.innerHTML = `
        <div class="flex items-center mb-4">
          <img src="https://via.placeholder.com/50" class="w-10 h-10 rounded-full object-cover" alt="avatar">
          <div class="ml-3">
            <p class="font-semibold">${p.username}</p>
            <p class="text-sm text-gray-500">#${p.id}</p>
          </div>
        </div>
        <p class="text-gray-700 mb-4">${p.content}</p>
        ${p.image ? `<img src="${p.image}" class="w-full rounded-lg" alt="post image">` : ''}
        <div class="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div class="flex space-x-4">
            <button class="flex items-center focus:outline-none">❤️ <span class="ml-1">0</span></button>
            <button class="flex items-center focus:outline-none">💬 <span class="ml-1">0</span></button>
          </div>
          <a href="profile.html?username=${encodeURIComponent(p.username)}" class="text-blue-600 hover:underline">Смотреть профиль</a>
        </div>
      `;
      container.appendChild(card);
    });
    if (posts.length === 0) {
      container.innerHTML = '<p class="text-gray-600">Пока нет публикаций</p>';
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-red-600">Ошибка загрузки ленты</p>';
  }
}

// Load and display a single contractor profile
async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');
  if (!username) return;
  try {
    const res = await fetch(`${API_BASE}/api/contractors/${encodeURIComponent(username)}`);
    if (!res.ok) {
      throw new Error('Контрагент не найден');
    }
    const c = await res.json();
    // Name and category/city
    document.getElementById('profileName').textContent = c.full_name || c.username;
    const categoryCityEl = document.getElementById('profileCategoryCity');
    const parts = [];
    if (c.category) parts.push(c.category);
    if (c.city) parts.push(c.city);
    categoryCityEl.textContent = parts.join(' · ');
    // Rating
    const ratingEl = document.getElementById('profileRating');
    ratingEl.innerHTML = '';
    if (c.rating) {
      const stars = '★'.repeat(Math.round(c.rating));
      ratingEl.innerHTML = `<span>${stars}</span><span class="text-gray-600 ml-1">${c.rating.toFixed(1)}</span>`;
    } else {
      ratingEl.textContent = 'Нет рейтинга';
    }
    // About
    const aboutParagraph = document.querySelector('#profileAbout p');
    if (aboutParagraph) {
      aboutParagraph.textContent = c.description || 'Описание отсутствует';
    }
    // Socials
    const socialsEl = document.getElementById('profileSocials');
    socialsEl.innerHTML = '';
    if (c.socials) {
      Object.entries(c.socials).forEach(([key, url]) => {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = key;
        a.className = 'text-blue-600 hover:underline mr-4';
        a.target = '_blank';
        socialsEl.appendChild(a);
      });
    }
    // Posts by user
    loadPosts(c.username, 'profilePostsContainer');
  } catch (err) {
    console.error(err);
    // Show error message in about section if profile not found
    const aboutParagraph = document.querySelector('#profileAbout p');
    if (aboutParagraph) {
      aboutParagraph.textContent = 'Профиль не найден.';
    }
  }
}