toastr.options = {
  escapeHtml: false,
  closeButton: true,
  timeOut: 2000,
  positionClass: 'toast-top-right'
};

async function ajax(url, data = {}, method = 'POST') {
  const options = {
    method: method,
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
  };
  if (method == 'POST' || method == 'PUT') {
    options.body = JSON.stringify(data)
  }
  if (method == 'GET') {
    url += '?' + new URLSearchParams(data).toString();
  }
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
      toastr.error(result.message);
      return false;
  } 
  return result.data;
}

// format date 
function formatDate(dateString) {
  const date = dateString ? new Date(dateString) : new Date();

  if (isNaN(date.getTime())) return '';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0'); 
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

// remove accents
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

// debounce
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// CapitalizeFirst
function capitalizeFirst(str) {
  if (str.toLowerCase() === 'dpi') {
    return 'DPI';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderPagination(pagination, searchParam = '') {
  const { currentPage, perPage, totalPages } = pagination;
  const items = [];

  const li = (page, label, active = false, disabled = false) => {
    const classes = ['page-item', active && 'active', disabled && 'disabled']
                    .filter(Boolean).join(' ');
    const href = disabled
      ? 'javascript:void(0);'
      : `?page=${page}&limit=${perPage}${searchParam}`;
    return `<li class="${classes}"><a class="page-link" href="${href}">${label}</a></li>`;
  };

  items.push(li(currentPage - 1, '&laquo;', false, currentPage === 1));
  items.push(li(1, '1', currentPage === 1));

  if (currentPage > 4) {
    items.push(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
  }

  const start = Math.max(2, currentPage - 2);
  const end = Math.min(totalPages - 1, currentPage + 2);
  for (let i = start; i <= end; i++) {
    items.push(li(i, i, i === currentPage));
  }

  if (currentPage < totalPages - 3) {
    items.push(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
  }

  if (totalPages > 1) {
    items.push(li(totalPages, totalPages, currentPage === totalPages));
  }

  items.push(li(currentPage + 1, '&raquo;', false, currentPage === totalPages));

  return `<nav aria-label="Page navigation"><ul class="pagination justify-content-center">${items.join('')}</ul></nav>`;
}

function paginationHandle(callback) {
  document.getElementById('pagination').addEventListener('click', (event) => {
    event.preventDefault();
    const a = event.target.closest('a.page-link');
    if (!a) return;

    // Lấy page từ href, ví dụ href="?page=3&limit=10"
    const params = new URLSearchParams(a.getAttribute('href'));
    const page   = parseInt(params.get('page'), 10) || 1;
    const limit  = parseInt(params.get('limit'), 10) || 10;
    const s      = params.get('s') ? `&s=${encodeURIComponent(params.get('s'))}` : '';

    callback(page, limit, s);
  });
}

function clearForm(type) {
  if (type === 'new') {
    (['username', 'email', 'password', 'confirm-password']).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    })
  }
  if (type === 'update') {
    (['new-password', 'new-confirm-password']).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    })
  }
}

// validate objectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// validate password
function isValidPassword(input, confirm = null) {
  if (
      input.length < 8 ||
      !/[A-Z]/.test(input) ||
      !/\d/.test(input) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(input)
  ) {
      return false;
  }
  if (confirm && confirm !== input) {
      return false;
  }
  return true;
}

// validate loginField (username, email)
function isValidUserAccountName(username, email){
  if (!username || !email) {
      return "Username and Email are required.";
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      return "Username must be 3-15 characters long and contain only letters, numbers, and underscores.";
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return "Invalid email format.";
  }
  return null;
}
// function check input
function validateUserInput(username, email, password, confirmPassword) {
  if (!username || !email || !password || !confirmPassword) {
      return "All fields are required.";
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      return "Username must be 3-15 characters long and contain only letters, numbers, and underscores.";
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return "Invalid email format.";
  }
  if (!isValidPassword(password)) {
      return "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.";
  }
  if (!isValidPassword(password, confirmPassword)) {
      return "Passwords do not match.";
  }
  return null;
}

function getFormData() {
  return {
      username: document.getElementById("username").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim(),
      confirmPassword: document.getElementById("confirm-password").value.trim()
  };
}

function initSelect2($select, placeholder = '— Chọn mục —') {
  if ($select.hasClass('select2-hidden-accessible')) {
    $select.select2('destroy');
  }

  $select.css('width', '100%');

  $select.select2({
    placeholder,
    allowClear: false,
    width: '100%',
    multiple: false,
    dropdownCssClass: 'no-bullet',
    dropdownParent: $select.closest('td'),
  });
}