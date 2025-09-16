toastr.options = {
  escapeHtml: false,
  closeButton: true,
  timeOut: 2000,
  positionClass: 'toast-top-right'
}

async function ajax(url, data = {}, method = 'POST') {
  const csrfToken = document.getElementById('_csrf').value
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    credentials: 'include'
  }
  if (method == 'POST' || method == 'PUT') {
    options.body = JSON.stringify(data)
  }
  if (method == 'GET') {
    url += '?' + new URLSearchParams(data).toString()
  }
  const response = await fetch(url, options)
  const result = await response.json()
  if (!response.ok) {
    toastr.remove()
    toastr.error(result.message)
    return false
  }
  return result.data
}

// format date
function formatDate(dateString) {
  const date = dateString ? new Date(dateString) : new Date()

  if (isNaN(date.getTime())) return ''

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

/**
 * Format a given date string to a time string (HH:mm).
 * 
 * @param {string} dateStr - The date string to be formatted.
 * @returns {string} - The formatted time string (HH:mm).
 * If the input is invalid or empty, it returns an empty string.
 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Convert a duration in minutes to hours with one decimal place.
 * 
 * @param {number} min - The duration in minutes.
 * @returns {string} - The converted duration in hours (as a string with 1 decimal place).
 * If the input is invalid or 0, it returns an empty string.
 */
function formatDuration(min) {
  if (!min) return ''
  return (min / 60).toFixed(1) // Convert minutes to hours, rounding to 1 decimal place
}

// Format phone Num
function formatToInternational(phone) {
  if (!phone) return phone

  phone = phone.replace(/\D/g, '')

  if (phone.startsWith('0')) {
    phone = phone.substring(1)
  }

  if (phone.startsWith('84')) {
    return '+' + phone
  }

  return '+84' + phone
}

// remove accents
function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

// debounce
function debounce(fn, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// CapitalizeFirst
function capitalizeFirst(str) {
  if (str.toLowerCase() === 'dpi') {
    return 'DPI'
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function renderPagination(pagination, searchParam = '') {
  const { currentPage, perPage, totalPages } = pagination
  const items = []

  const li = (page, label, active = false, disabled = false) => {
    const classes = ['page-item', active && 'active', disabled && 'disabled']
      .filter(Boolean)
      .join(' ')
    const href = disabled
      ? 'javascript:void(0)'
      : `?page=${page}&limit=${perPage}${searchParam}`
    return `<li class="${classes}"><a class="page-link" href="${href}">${label}</a></li>`
  }

  items.push(li(currentPage - 1, '&laquo', false, currentPage === 1))
  items.push(li(1, '1', currentPage === 1))

  if (currentPage > 4) {
    items.push(
      `<li class="page-item disabled"><span class="page-link">...</span></li>`
    )
  }

  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)
  for (let i = start; i <= end; i++) {
    items.push(li(i, i, i === currentPage))
  }

  if (currentPage < totalPages - 3) {
    items.push(
      `<li class="page-item disabled"><span class="page-link">...</span></li>`
    )
  }

  if (totalPages > 1) {
    items.push(li(totalPages, totalPages, currentPage === totalPages))
  }

  items.push(li(currentPage + 1, '&raquo', false, currentPage === totalPages))

  return `<nav aria-label="Page navigation"><ul class="pagination justify-content-center">${items.join('')}</ul></nav>`
}

function paginationHandle(callback) {
  document.getElementById('pagination').addEventListener('click', (event) => {
    event.preventDefault()
    const a = event.target.closest('a.page-link')
    if (!a) return

    // Lấy page từ href, ví dụ href="?page=3&limit=10"
    const params = new URLSearchParams(a.getAttribute('href'))
    const page = parseInt(params.get('page'), 10) || 1
    const limit = parseInt(params.get('limit'), 10) || 10
    const s = params.get('s') ? `&s=${encodeURIComponent(params.get('s'))}` : ''

    callback(page, limit, s)
  })
}

function clearForm(type) {
  if (type === 'new') {
    ;['username', 'email', 'password', 'confirm-password'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) el.value = ''
    })
  }
  if (type === 'update') {
    ;['currentPassword', 'new-password', 'new-confirm-password'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) el.value = ''
    })
  }
}

// validate objectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

// validate password
function isValidPassword(input, confirm = null) {
  if (
    input.length < 8 ||
    !/[A-Z]/.test(input) ||
    !/\d/.test(input) ||
    !/[!@#$%^&*(),.?":{}|<>]/.test(input)
  ) {
    return false
  }
  if (confirm && confirm !== input) {
    return false
  }
  return true
}

// validate loginField (username, email)
function isValidUserAccountName(username, email) {
  if (!username || !email) {
    return 'Username and Email are required.'
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
    return 'Username must be 3-15 characters long and contain only letters, numbers, and underscores.'
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return 'Invalid email format.'
  }
  return null
}
// function check input
function validateUserInput(username, email, password, confirmPassword) {
  if (!username || !email || !password || !confirmPassword) {
    return 'All fields are required.'
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
    return 'Username must be 3-15 characters long and contain only letters, numbers, and underscores.'
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return 'Invalid email format.'
  }
  if (!isValidPassword(password)) {
    return 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.'
  }
  if (!isValidPassword(password, confirmPassword)) {
    return 'Passwords do not match.'
  }
  return null
}

function getFormData() {
  return {
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value.trim(),
    confirmPassword: document.getElementById('confirm-password').value.trim()
  }
}

function initSelect2($select, placeholder = '— Chọn mục —') {
  if ($select.hasClass('select2-hidden-accessible')) {
    $select.select2('destroy')
  }
  if (!$select.length) return

  // Xác định dropdownParent
  let parentElement = $select.closest('.modal')
  if (!parentElement.length) {
    parentElement = $select.closest('td')
  }
  if (!parentElement.length) {
    parentElement = $('body')
  }

  $select.select2({
    placeholder,
    width: '100%',
    multiple: false,
    dropdownCssClass: 'no-bullet',
    dropdownParent: parentElement
  })

  const $form = $select.closest('form')
  if ($form.length) {
    $select
      .next('.select2-container')
      .find('.select2-selection')
      .addClass('form-control')
  }
}

$('#btn-print').on('click', function () {
  window.print()
})

function loadOrganizations($select, selectedId = '') {
  return fetchData('organizations')
    .then((organizations) => {
      $select.empty().append(new Option('— Chọn tổ chức —', ''))
      organizations.forEach((org) => {
        $select.append(new Option(org.name, org._id))
      })
      if (selectedId) {
        $select.val(selectedId).trigger('change')
      }
      initSelect2($select, '— Chọn tổ chức —')
    })
    .catch(() => {
      toastr.error('Không thể tải danh sách tổ chức')
    })
}

document.querySelectorAll('textarea').forEach((textarea) => {
  textarea.style.height = 'auto' // reset trước
  textarea.style.height = textarea.scrollHeight + 'px'

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto' // reset trước khi tính lại
    textarea.style.height = textarea.scrollHeight + 'px'
  })
})

function setCheckbox(tableSelector, checkboxClass) {
  const table = document.querySelector(tableSelector)
  if (!table) return

  const selectAll = table.querySelector(
    'thead th:first-child input[type=checkbox]'
  )

  // Click vào tr để toggle checkbox
  table.querySelector('tbody').addEventListener('click', (e) => {
    const target = e.target
    if (
      target.matches(
        'input[type=checkbox], img, input[type=text], input[type=number], button, span, .dataInput, i, td:nth-child(n+2)'
      )
    )
      return

    const row = target.closest('tr')
    if (!row) return
    const checkbox = row.querySelector(`.${checkboxClass}`)
    if (checkbox) {
      checkbox.checked = !checkbox.checked
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })

  // Select All checkbox
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const checkboxes = table.querySelectorAll(`.${checkboxClass}`)
      checkboxes.forEach((cb) => (cb.checked = selectAll.checked))
    })
  }

  // Click first 'th'
  const firstTh = table.querySelector('thead th:first-child')
  if (firstTh) {
    firstTh.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return
      if (selectAll) {
        selectAll.checked = !selectAll.checked
        selectAll.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }

  // Sync selectAll
  table.addEventListener('change', (e) => {
    if (!e.target.classList.contains(checkboxClass)) return
    if (!selectAll) return

    const all = table.querySelectorAll(`.${checkboxClass}`)
    const checked = table.querySelectorAll(`.${checkboxClass}:checked`)
    selectAll.checked = all.length > 0 && all.length === checked.length
  })
}

/**
 * Chọn định dạng ảnh tối ưu dựa trên:
 * 1. Trình duyệt có hỗ trợ WebP hay không
 * 2. Ảnh có nền trong suốt (transparency) hay không
 *
 * @param {boolean} hasTransparency - Ảnh có nền trong suốt hay không
 * @returns {Object} - Định dạng ảnh tối ưu gồm:
 *   - mime: MIME type tương ứng ("image/webp" | "image/png" | "image/jpeg")
 *   - ext: Phần mở rộng file ("webp" | "png" | "jpg")
 *
 * Quy tắc:
 * - Nếu trình duyệt hỗ trợ WebP → Ưu tiên WebP (nhỏ, chất lượng tốt)
 * - Nếu không hỗ trợ WebP:
 *    + Ảnh trong suốt → Dùng PNG để giữ alpha channel
 *    + Ảnh không trong suốt → Dùng JPEG để giảm dung lượng
 */
function getBestFormat(hasTransparency = false) {
  const webpSupported =
    document
      .createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0

  if (webpSupported) return { mime: 'image/webp', ext: 'webp' }

  return hasTransparency
    ? { mime: 'image/png', ext: 'png' }
    : { mime: 'image/jpeg', ext: 'jpg' }
}

function listProvinces() {
  return $.getJSON('/data/full_address.json').then(res => {
    const $provinceSelect = $('#orgProvince');
    $provinceSelect.empty().append('<option value="">— Tỉnh/ Thành phố —</option>');

    if (res.error == 0 && res.data) {
      res.data.forEach(province => {
        $provinceSelect.append(`<option value="${province.id}">${province.name}</option>`);
      });
      initSelect2($provinceSelect, 'Tỉnh/ Thành phố');
    }
  });
}

function listCommunes(provinceId) {
  return $.getJSON('/data/full_address.json').then(res => {
    const $communeSelect = $('#orgCommune');
    $communeSelect.empty().append('<option value="">— Chọn Xã/ Phường —</option>');

    if (res.error == 0 && res.data) {
      const province = res.data.find(p => p.id === provinceId);
      if (province && province.data2) {
        province.data2.forEach(commune => {
          $communeSelect.append(`<option value="${commune.id}">${commune.full_name}</option>`);
        });
      }
      initSelect2($communeSelect, 'Xã/ Phường');
    }
  });
}