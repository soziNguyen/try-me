// ========== DOM ELEMENTS ==========
const btnShowForm = document.getElementById('btnShowForm')
const formAddTable = document.getElementById('formAddTable')
const tableBody = document.getElementById('tableBody')
const btnAssignTable = document.getElementById('btnAssignTable')
const searchInput = document.getElementById('searchUserInput')
const tableGrid = document.getElementById('tableGrid')

// ========== GLOBAL STATE ==========
let tableData = []

function getBgClassByStatus(status) {
  switch (status) {
    case 'available':
      return 'my-orange text-white'
    case 'occupied':
      return 'green-light-bg'
    case 'maintenance':
      return 'bg-dark text-white'
    default:
      return 'bg-light'
  }
}

// ========== API FUNCTIONS ==========
async function getTables(area = '') {
  try {
    let url = '/api/tables'
    if (area) url += `?area=${encodeURIComponent(area)}`

    const res = await ajax(url, {}, 'GET')
    if (res) {
      tableData = res.tables
      filterTables()
    }
  } catch (error) {
    toastr.error(error.message)
  }
}

async function fetchAndRenderTableList() {
  const csrfToken = document.getElementById('_csrf').value

  try {
    const res = await fetch('/api/tables-total', {
      method: 'GET',
      headers: { 'x-csrf-token': csrfToken }
    })
    const data = await res.json()

    if (data.data?.tables) {
      renderTableList(data.data.tables)
    } else {
      console.error('Không tìm thấy trường tables trong response')
    }
  } catch (err) {
    console.error('Lỗi khi gọi API:', err)
  }
}

// ========== SEARCH & FILTER ==========
function filterTables() {
  const searchTerm = searchInput.value.trim().toLowerCase()

  if (!searchTerm) {
    renderTableList(tableData)
    return
  }

  const statusMap = { available: 'trống', occupied: 'có khách', maintenance: 'bảo trì' }

  const filteredTables = tableData.filter((table) => {
    const name = (table.name || '').toLowerCase()
    const status = (statusMap[table.status] || table.status).toLowerCase()
    const area = (table.area || '').toLowerCase()

    return name.includes(searchTerm) || status.includes(searchTerm) || area.includes(searchTerm)
  })

  renderTableList(filteredTables)
}

// ========== RENDER FUNCTIONS ==========
function renderTableList(tables = []) {
  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = '<div class="col-12 text-center">Không có bàn nào.</div>'
    return
  }

  tableGrid.innerHTML = tables
    .map((table) => {
      const bgClass = getBgClassByStatus(table.status)
      return table.status === 'occupied'
        ? renderOccupiedTable(table, bgClass)
        : renderAvailableTable(table, bgClass)
    })
    .join('')

  bindCardClickEvents()
}

function renderOccupiedTable(table, bgClass) {
  const total = table.currentOrderId?.totalAmount || 0
  const formattedTotal = `${total.toLocaleString()}đ`
  const customerName = table.currentOrderId?.customerId?.name || 'Khách lẻ'
  const checkInTime = new Date(table.checkInTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
    <div class="col">
      <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative d-flex flex-column justify-content-center fs-6">
        <input type="checkbox" class="tableCheckbox form-check-input position-absolute top-0 end-0 m-2 d-none" data-id="${table._id}"/>

        <div class="d-flex justify-content-between fw-bold mb-2">
          <div>${capitalizeFirst(table.area) || 'KV?'} - ${table.name} - ${customerName}</div>
          <div class="table-capacity"><i class="bi bi-people-fill me-1"></i> ${table.capacity || '-'}</div>
        </div>

        <div class="d-flex justify-content-between fw-bold mb-2">
          <div><i class="bi bi-calendar-check me-2"></i>${checkInTime}</div>
          <div>
            <i class="bi bi-clock me-1"></i>
            <span class="seated-time" data-checkin="${table.checkInTime}" data-id="${table._id}">Đang tính...</span>
          </div>
        </div>

        <div class="d-flex justify-content-between fw-bold">
          <p><i class="bi bi-cash me-2"></i>${formattedTotal}</p>
        </div>

        <div class="d-flex justify-content-between gap-2 mt-4">
          <button class="btnOrderFood btn btn-success btn-sm fw-bold shadow-sm" data-order-id="${table.currentOrderId?._id}">
            <i class="bi bi-clipboard-check me-1"></i> Thêm món
          </button>
          <button class="btnCheckout btn btn-primary btn-sm fw-bold shadow-sm" data-order-id="${table.currentOrderId?._id}">
            <i class="bi bi-credit-card me-1"></i> Thanh toán
          </button>
        </div>             
      </div>
    </div>`
}

function renderAvailableTable(table, bgClass) {
  return `
    <div class="col">
      <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative d-flex flex-column justify-content-between">
        <input type="checkbox" class="tableCheckbox form-check-input position-absolute top-0 end-0 m-2 d-none" data-id="${table._id}"/>

        <div>
          <div class="d-flex justify-content-between fw-bold mb-2">
            <div class="table-name">${capitalizeFirst(table.area) || '-'} - ${table.name}</div>
            <div class="table-capacity"><i class="bi bi-people-fill me-1"></i> ${table.capacity || '-'}</div>
          </div>

          <div class="d-flex justify-content-between fw-bold">  
            <div class="table-status">Trạng thái: Trống</div>
            <div class="time"><i class="bi bi-clock me-2"></i>00:00:00</div>
          </div>
        </div>

        <div class="d-flex justify-content-between gap-2 mt-4">
          <button class="btnOrderFood btn btn-success btn-sm fw-bold shadow-sm">
            <i class="bi bi-clipboard-check me-1"></i> Thêm món
          </button>
          <button class="btnAssignTable btn btn-warning btn-sm fw-bold shadow-sm">
            <i class="bi bi-clock me-1"></i> Giao bàn
          </button>
        </div>
      </div>
    </div>`
}

function bindCardClickEvents() {
  document.querySelectorAll('.table-card').forEach((card) => {
    card.addEventListener('click', function (e) {
      if (e.target.classList.contains('tableCheckbox') || e.target.closest('button')) return

      const tableId = this.querySelector('.tableCheckbox').dataset.id
      updateTable(tableId)
    })
  })
}

// ========== TIME UPDATE ==========
function updateSeatedTimes() {
  document.querySelectorAll('.seated-time').forEach((el) => {
    const checkInTime = new Date(el.dataset.checkin)
    const now = new Date()
    const diffSeconds = Math.floor((now - checkInTime) / 1000)

    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    const seconds = diffSeconds % 60

    const pad = (num) => String(num).padStart(2, '0')
    el.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  })
}

// ========== TABLE ASSIGNMENT HANDLERS ==========
function handleAssignTable(btnAssign) {
  const card = btnAssign.closest('.table-card')
  const tableName = card.querySelector('.table-name').textContent.trim()
  const capacityText = card.querySelector('.table-capacity').textContent.trim()
  const [areaText] = tableName.split(' - ')

  document.getElementById('assign-table-question').textContent =
    `Bạn có muốn giao bàn "${tableName}" không?`
  document.getElementById('assign-table-name').textContent = tableName
  document.getElementById('assign-table-capacity').textContent = capacityText
    .replace('Số Lượng Người:', '')
    .trim()
  document.getElementById('assign-table-area').textContent = areaText.replace('Khu vực:', '').trim()

  document.getElementById('customerNameInput').value = ''
  document.getElementById('customerPhoneInput').value = ''

  const tableId = card.querySelector('.tableCheckbox').getAttribute('data-id')
  document.getElementById('btnConfirmAssignTable').setAttribute('data-id', tableId)

  showModal('assignTableModal').show()
}

async function confirmAssignTable() {
  const tableId = document.getElementById('btnConfirmAssignTable').getAttribute('data-id')
  const customerName = document.getElementById('customerNameInput').value.trim()
  const customerPhone = document.getElementById('customerPhoneInput').value.trim()

  if (!tableId) {
    toastr.warning('Không tìm thấy bàn để giao.')
    return
  }

  try {
    const orderResult = await ajax('/api/orders', { tableId, customerName, customerPhone }, 'POST')

    if (!orderResult?.orderId) {
      toastr.error('Lỗi khi tạo order')
      return
    }

    await getTables()
    hideModal('assignTableModal')
    toastr.success('Giao bàn thành công!')
  } catch (err) {
    toastr.error('Lỗi khi giao bàn: ' + err.message)
  }
}

// ========== ORDER HANDLERS ==========
async function handleOrderButton(btnOrder) {
  const card = btnOrder.closest('.table-card')
  const tableId = card.querySelector('.tableCheckbox').dataset.id
  const existingOrderId = btnOrder.dataset.orderId

  if (!tableId) {
    toastr.warning('Không tìm thấy thông tin bàn.')
    return
  }

  // Bàn đã có order - chuyển đến trang order
  if (existingOrderId) {
    window.location.href = `/orders?orderId=${existingOrderId}`
    return
  }

  showConfirmModal({
    title: 'Tạo order mới',
    message: 'Bạn có muốn tạo order cho bàn này không?',
    okBtnColor: 'success',
    confirmed: 'Tạo',
    onConfirm: async () => {
      try {
        // Bàn trống - tạo order mới
        const result = await ajax('/api/orders', { tableId }, 'POST')

        if (result?.orderId) {
          toastr.success('Tạo order thành công')
          setTimeout(() => {
            window.location.href = `/orders?orderId=${result.orderId}`
          }, 300)
        }
      } catch (error) {
        toastr.error('Lỗi khi tạo order: ' + error.message)
      }
    }
  })
}

async function handleOrderCheckoutButtons(e) {
  const btnOrder = e.target.closest('.btnOrderFood')
  if (btnOrder) {
    await handleOrderButton(btnOrder)
    return
  }

  const btnCheckout = e.target.closest('.btnCheckout')
  if (btnCheckout) {
    const orderId = btnCheckout.dataset.orderId
    if (orderId) {
      window.location.href = `/orders?orderId=${orderId}`
    } else {
      toastr.warning('Bàn chưa có hóa đơn, vui lòng giao bàn trước khi thanh toán.')
    }
  }
}

// ========== UPDATE TABLE ==========
async function updateTable(tableId) {
  try {
    const updateTableModalElement = document.getElementById('updateTableModal')
    if (!updateTableModalElement) {
      toastr.error('Update table modal not found.')
      return
    }

    const table = await ajax(`/api/tables/${tableId}`, {}, 'GET')

    document.getElementById('update-name').value = table.name || ''
    document.getElementById('update-status').value = table.status || 'available'
    document.getElementById('update-capacity').value = table.capacity || ''
    document.getElementById('update-area').value = table.area || ''
    document.getElementById('update-customer').value = table.currentOrderId?.customerId?.name || ''

    const updateTableModal = showModal('updateTableModal')
    updateTableModal.show()

    const oldBtn = document.getElementById('btnUpdateTable')
    const newBtn = oldBtn.cloneNode(true)
    oldBtn.replaceWith(newBtn)

    newBtn.addEventListener('click', () => handleUpdateTable(tableId, updateTableModal))
  } catch (err) {
    toastr.error(err.message)
  }
}

async function handleUpdateTable(tableId, modal) {
  const customerName = document.getElementById('update-customer').value.trim()
  const status = document.getElementById('update-status').value
  const capacity = document.getElementById('update-capacity').value
  const area = document.getElementById('update-area').value

  const dataUpdate = {
    customerName,
    status,
    capacity: capacity ? Number(capacity) : undefined,
    area
  }

  try {
    const result = await ajax(`/api/tables/update/${tableId}`, dataUpdate, 'POST')
    if (result) {
      toastr.success('Cập nhật thành công')
      modal.hide()
      await getTables()
    }
  } catch (err) {
    toastr.error(err.message)
  }
}

// ========== EVENT BINDING ==========
function bindEvents() {
  tableGrid.addEventListener('click', function (e) {
    const btnAssign = e.target.closest('.btnAssignTable')
    if (btnAssign) {
      e.stopPropagation()
      handleAssignTable(btnAssign)
    }
  })

  document.getElementById('btnConfirmAssignTable').addEventListener('click', confirmAssignTable)
  document.addEventListener('click', handleOrderCheckoutButtons)

  document.getElementById('btnkv1').addEventListener('click', () => getTables('KV1'))
  document.getElementById('btnkv2').addEventListener('click', () => getTables('KV2'))
  document.getElementById('btnAll').addEventListener('click', () => getTables())

  searchInput.addEventListener('input', filterTables)
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents()
  await getTables()
  setInterval(updateSeatedTimes, 1000)
})

window.addEventListener('DOMContentLoaded', fetchAndRenderTableList)
