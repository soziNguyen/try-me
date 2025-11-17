toastr.options = {
  escapeHtml: false,
  closeButton: true,
  timeOut: 2000,
  positionClass: 'toast-top-right'
  // progressBar: true,
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

/**
 * Format a given date string to "dd/MM/yyyy - HH:mm".
 *
 * @param {string} dateStr - The date string to be formatted.
 * @returns {string} - The formatted date-time string (dd/MM/yyyy - HH:mm).
 * If the input is invalid or empty, it returns an empty string.
 */
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''

  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')

  return `${dd}/${mm}/${yyyy} - ${hh}:${min}`
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

// Format number with thousand separator
function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '0'
  return Number(num).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
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

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.startsWith('84') ? `+${phone}` : phone
}
// remove accents
function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

// format order code
function formatOrderCode(code) {
  const num = parseInt(code.replace('HD', ''))
  return `HD${String(num).padStart(2, '0')}`
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
const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1)

function renderPagination(pagination, searchParam = '') {
  const { currentPage, perPage, totalPages } = pagination
  const items = []

  const li = (page, label, active = false, disabled = false) => {
    const classes = ['page-item', active && 'active', disabled && 'disabled']
      .filter(Boolean)
      .join(' ')
    const href = disabled ? 'javascript:void(0)' : `?page=${page}&limit=${perPage}${searchParam}`
    return `
      <li class="${classes}">
        <a class="page-link fw-semibold rounded-pill px-3 py-2" href="${href}" style="min-width:40px">
          ${label}
        </a>
      </li>
    `
  }

  // Nút Prev
  items.push(li(currentPage - 1, '‹', false, currentPage === 1))

  // Trang đầu
  items.push(li(1, '1', currentPage === 1))

  if (currentPage > 4) {
    items.push(
      `<li class="page-item disabled"><span class="page-link bg-light border-0">...</span></li>`
    )
  }

  // Giữa
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)
  for (let i = start; i <= end; i++) {
    items.push(li(i, i, i === currentPage))
  }

  if (currentPage < totalPages - 3) {
    items.push(
      `<li class="page-item disabled"><span class="page-link bg-light border-0">...</span></li>`
    )
  }

  // Trang cuối
  if (totalPages > 1) {
    items.push(li(totalPages, totalPages, currentPage === totalPages))
  }

  // Nút Next
  items.push(li(currentPage + 1, '›', false, currentPage === totalPages))

  const html = `
    <nav aria-label="Page navigation" class="mt-3">
      <ul class="pagination justify-content-center flex-wrap gap-1">
        ${items.join('')}
      </ul>
    </nav>
  `
  document.getElementById('pagination').innerHTML = html
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
    return 'Tên tài khoản và Email là bắt buộc.'
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
    return 'Tên tài khoản phải có độ dài từ 3-15 ký tự và chỉ chứa ký tự, số và dấu gạch dưới.'
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return 'Định dạng Email không hợp lệ.'
  }
  return null
}
// function check input
function validateUserInput(username, email, password, confirmPassword) {
  if (!username || !email || !password || !confirmPassword) {
    return 'Tất cả các trường là bắt buộc.'
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
    return 'Tên tài khoản phải có độ dài từ 3-15 ký tự và chỉ chứa ký tự, số và dấu gạch dưới.'
  }
  if (!/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return 'Định dạng Email không hợp lệ.'
  }
  if (!isValidPassword(password)) {
    return 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt.'
  }
  if (!isValidPassword(password, confirmPassword)) {
    return 'Mật khẩu không khớp.'
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
    $select.next('.select2-container').find('.select2-selection').addClass('form-control')
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

  const selectAll = table.querySelector('thead th:first-child input[type=checkbox]')

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
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0

  if (webpSupported) return { mime: 'image/webp', ext: 'webp' }

  return hasTransparency ? { mime: 'image/png', ext: 'png' } : { mime: 'image/jpeg', ext: 'jpg' }
}

/**
 * Load danh sách Tỉnh/Thành phố từ file JSON và gắn vào select #orgProvince.
 * Nếu dữ liệu hợp lệ (res.error == 0), danh sách sẽ được render và initSelect2 được gọi để làm đẹp dropdown.
 * @returns {Promise} Promise trả về khi load xong dữ liệu.
 */

function listProvinces() {
  return $.getJSON('/data/full_address.json').then((res) => {
    const $provinceSelect = $('#orgProvince')
    $provinceSelect.empty().append('<option value="">— Tỉnh/ Thành phố —</option>')

    if (res.error == 0 && res.data) {
      res.data.forEach((province) => {
        $provinceSelect.append(`<option value="${province.id}">${province.name}</option>`)
      })
      initSelect2($provinceSelect, 'Tỉnh/ Thành phố')
    }
  })
}

/**
 * Load danh sách Xã/Phường dựa trên provinceId từ file JSON và gắn vào select #orgCommune.
 * Nếu tỉnh tồn tại và có data2 (danh sách xã/phường), dữ liệu sẽ được render và initSelect2 được gọi.
 * @param {string|number} provinceId - ID của tỉnh đã chọn.
 * @returns {Promise} Promise trả về khi load xong dữ liệu.
 */

function listCommunes(provinceId) {
  return $.getJSON('/data/full_address.json').then((res) => {
    const $communeSelect = $('#orgCommune')
    $communeSelect.empty().append('<option value="">— Chọn Xã/ Phường —</option>')

    if (res.error == 0 && res.data) {
      const province = res.data.find((p) => p.id === provinceId)
      if (province && province.data2) {
        province.data2.forEach((commune) => {
          $communeSelect.append(`<option value="${commune.id}">${commune.full_name}</option>`)
        })
      }
      initSelect2($communeSelect, 'Xã/ Phường')
    }
  })
}

function numberToVietnameseWords(num) {
  if (!num || num === 0) return 'Không đồng'

  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
  const tens = [
    '',
    '',
    'hai mươi',
    'ba mươi',
    'bốn mươi',
    'năm mươi',
    'sáu mươi',
    'bảy mươi',
    'tám mươi',
    'chín mươi'
  ]
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

  if (num < 0) return 'Âm ' + numberToVietnameseWords(-num)
  num = Math.floor(num)

  const groups = []
  while (num > 0) {
    groups.push(num % 1000)
    num = Math.floor(num / 1000)
  }

  function convertGroup(n, full) {
    if (n === 0) return ''

    let str = ''
    const hundred = Math.floor(n / 100)
    const ten = Math.floor((n % 100) / 10)
    const unit = n % 10

    if (hundred > 0 || full) {
      str += (ones[hundred] || 'không') + ' trăm'
      if (ten === 0 && unit > 0) str += ' lẻ'
    }

    if (ten > 1) {
      str += ' ' + tens[ten]
      if (unit === 1) str += ' mốt'
      else if (unit === 5) str += ' lăm'
      else if (unit > 0) str += ' ' + ones[unit]
    } else if (ten === 1) {
      str += ' mười'
      if (unit === 1) str += ' một'
      else if (unit === 5) str += ' lăm'
      else if (unit > 0) str += ' ' + ones[unit]
    } else if (unit > 0 && ten === 0) {
      str += ' ' + ones[unit]
    }

    return str.trim()
  }

  let result = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const isFull = i < groups.length - 1 && groups[i] === 0 ? true : false
    const groupStr = convertGroup(groups[i], isFull)
    if (groupStr) {
      result += (result ? ' ' : '') + groupStr + (scales[i] ? ' ' + scales[i] : '')
    }
  }

  result = result.toLowerCase()
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng'
}

/**
 * Hiển thị modal xác nhận (Confirm Modal).
 *
 * @param {Object} options - Các tùy chọn cấu hình cho modal.
 * @param {string} [options.title='Xác nhận'] - Tiêu đề của modal.
 * @param {string} [options.message=''] - Nội dung hiển thị trong modal.
 * @param {string} [options.confirmed='Xóa'] - Nội dung nút xác nhận (OK button).
 * @param {Function|null} [options.onConfirm=null] - Callback sẽ được gọi khi người dùng bấm nút xác nhận.
 *
 * @example
 * showConfirmModal({
 *   title: 'Xóa bản ghi',
 *   message: 'Bạn có chắc chắn muốn xóa bản ghi này?',
 *   confirmed: 'Đồng ý',
 *   onConfirm: function () {
 *     // Logic xóa ở đây
 *   }
 * })
 */

function showConfirmModal(options) {
  const settings = $.extend(
    {
      title: 'Xác nhận',
      message: '',
      confirmed: '',
      onConfirm: null,
      okBtnColor: 'primary' // Mặc định là primary
    },
    options
  )

  $('#confirmModalTitle').text(settings.title)
  $('#confirmModalBody').html(settings.message)

  const $okBtn = $('#confirmModalOk')
  // Reset class và thêm màu mới
  $okBtn
    .removeClass()
    .addClass(`btn btn-${settings.okBtnColor} rounded-pill px-4`)
    .text(settings.confirmed || 'Xóa')

  $okBtn.off('click').on('click', function () {
    if (typeof settings.onConfirm === 'function') settings.onConfirm()
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'))
    modal.hide()
  })

  const modal = new bootstrap.Modal(document.getElementById('confirmModal'))
  modal.show()
}

/**
 * Tạo và trả về instance của Bootstrap Modal.
 * Không tự động hiển thị modal, cho phép linh hoạt gọi .show() khi cần.
 * @param {string} modalId - ID của modal trong DOM.
 * @returns {bootstrap.Modal} Instance của modal.
 */
function showModal(modalId) {
  return new bootstrap.Modal(document.getElementById(modalId))
}

/**
 * Ẩn modal nếu đang hiển thị.
 * @param {string} modalId - ID của modal trong DOM.
 */
function hideModal(modalId) {
  const modal = bootstrap.Modal.getInstance(document.getElementById(modalId))
  modal?.hide()
}
