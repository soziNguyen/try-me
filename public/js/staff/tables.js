// ========== DOM ELEMENTS ==========
const tableGrid = document.getElementById('tableGrid')
const searchInput = document.getElementById('searchUserInput')
const areaButtonsContainer = document.getElementById('areaButtonsContainer')
const btnConfirmAssignTable = document.getElementById('btnConfirmAssignTable')

// ========== GLOBAL STATE ==========
let tableData = [] // toàn bộ bàn từ API
let allAreas = [] // danh sách khu vực
let currentArea = '' // area đang filter

// ========== HELPERS ==========
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

// ========== API ==========
async function fetchTables() {
  try {
    const res = await ajax('/api/tables', {}, 'GET')
    if (res) {
      tableData = res.tables
      allAreas = [...new Set(tableData.map((t) => t.area).filter(Boolean))]
      renderAreaButtons()
      renderTableGrid()
    }
  } catch (err) {
    toastr.error(err.message)
  }
}

// ========== AREA BUTTONS ==========
function renderAreaButtons() {
  areaButtonsContainer.innerHTML = ''

  const btnAll = document.createElement('button')
  btnAll.className = `btn me-2 ${currentArea === '' ? 'btn-danger' : 'btn-outline-secondary'}`
  btnAll.innerHTML = '<i class="bi bi-funnel"></i> TẤT CẢ'
  btnAll.addEventListener('click', () => {
    currentArea = ''
    renderAreaButtons()
    renderTableGrid()
  })
  areaButtonsContainer.appendChild(btnAll)

  allAreas.forEach((area) => {
    const btn = document.createElement('button')
    btn.className = `btn me-2 ${currentArea === area ? 'btn-danger' : 'btn-outline-secondary'}`
    btn.innerHTML = `<i class="bi bi-funnel"></i> ${area}`
    btn.addEventListener('click', () => {
      currentArea = area
      renderAreaButtons()
      renderTableGrid()
    })
    areaButtonsContainer.appendChild(btn)
  })
}

// ========== TABLE GRID ==========
function renderTableGrid() {
  let tablesToShow = tableData

  // Filter theo area
  if (currentArea) tablesToShow = tablesToShow.filter((t) => t.area === currentArea)

  // Filter theo search
  const searchTerm = searchInput.value.trim().toLowerCase()
  if (searchTerm) {
    const statusMap = { available: 'trống', occupied: 'có khách' }
    tablesToShow = tablesToShow.filter((t) => {
      const name = (t.name || '').toLowerCase()
      const area = (t.area || '').toLowerCase()
      const status = (statusMap[t.status] || t.status).toLowerCase()
      return name.includes(searchTerm) || area.includes(searchTerm) || status.includes(searchTerm)
    })
  }

  if (!tablesToShow.length) {
    tableGrid.innerHTML = '<div class="col-12 text-center">Không có bàn nào.</div>'
    return
  }

  tableGrid.innerHTML = tablesToShow
    .map((table) => {
      const bgClass = getBgClassByStatus(table.status)
      return table.status === 'occupied'
        ? renderOccupiedTable(table, bgClass)
        : renderAvailableTable(table, bgClass)
    })
    .join('')

  bindCardClickEvents()
}

// ========== RENDER TABLES ==========
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
          <div><i class="bi bi-clock me-1"></i>
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

// ========== EVENT HANDLERS ==========
function bindCardClickEvents() {
  document.querySelectorAll('.table-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('tableCheckbox') || e.target.closest('button')) return
      const tableId = card.querySelector('.tableCheckbox').dataset.id
      updateTable(tableId)
    })
  })
}

function updateSeatedTimes() {
  document.querySelectorAll('.seated-time').forEach((el) => {
    const checkInTime = new Date(el.dataset.checkin)
    const diff = Math.floor((Date.now() - checkInTime) / 1000)
    const h = String(Math.floor(diff / 3600)).padStart(2, '0')
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
    const s = String(diff % 60).padStart(2, '0')
    el.textContent = `${h}:${m}:${s}`
  })
}

// ========== ASSIGN TABLE ==========
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

  btnConfirmAssignTable.setAttribute('data-id', card.querySelector('.tableCheckbox').dataset.id)
  showModal('assignTableModal').show()
}

async function confirmAssignTable() {
  const tableId = btnConfirmAssignTable.getAttribute('data-id')
  const customerName = document.getElementById('customerNameInput').value.trim()
  const customerPhone = document.getElementById('customerPhoneInput').value.trim()
  if (!tableId) return toastr.warning('Không tìm thấy bàn để giao.')

  try {
    const res = await ajax('/api/orders', { tableId, customerName, customerPhone }, 'POST')
    if (!res?.orderId) return toastr.error('Lỗi khi tạo order')
    currentArea = '' // reset filter
    await fetchTables()
    hideModal('assignTableModal')
    toastr.success('Giao bàn thành công!')
  } catch (err) {
    toastr.error('Lỗi khi giao bàn: ' + err.message)
  }
}

// ========== ORDER / CHECKOUT ==========
async function handleOrderButton(btnOrder) {
  const card = btnOrder.closest('.table-card')
  const tableId = card.querySelector('.tableCheckbox').dataset.id
  const existingOrderId = btnOrder.dataset.orderId

  if (existingOrderId) return (window.location.href = `/orders?orderId=${existingOrderId}`)

  showConfirmModal({
    title: 'Tạo order mới',
    message: 'Bạn có muốn tạo order cho bàn này không?',
    okBtnColor: 'success',
    confirmed: 'Tạo',
    onConfirm: async () => {
      const res = await ajax('/api/orders', { tableId }, 'POST')
      if (res?.orderId) {
        toastr.success('Tạo order thành công')
        setTimeout(() => (window.location.href = `/orders?orderId=${res.orderId}`), 300)
      }
    }
  })
}

function handleOrderCheckoutButtons(e) {
  const btnOrder = e.target.closest('.btnOrderFood')
  if (btnOrder) return handleOrderButton(btnOrder)
  const btnCheckout = e.target.closest('.btnCheckout')
  if (btnCheckout) {
    const orderId = btnCheckout.dataset.orderId
    return orderId
      ? (window.location.href = `/orders?orderId=${orderId}`)
      : toastr.warning('Bàn chưa có hóa đơn, vui lòng giao bàn trước khi thanh toán.')
  }
}

// ========== UPDATE TABLE ==========
async function updateTable(tableId) {
  const table = await ajax(`/api/tables/${tableId}`, {}, 'GET')
  if (!table) return toastr.error('Không tìm thấy thông tin bàn')

  document.getElementById('update-name').value = table.name || ''
  document.getElementById('update-status').value = table.status || 'available'
  document.getElementById('update-capacity').value = table.capacity || ''
  document.getElementById('update-customer').value = table.currentOrderId?.customerId?.name || ''

  const modal = showModal('updateTableModal')
  modal.show()

  const btn = document.getElementById('btnUpdateTable')
  const newBtn = btn.cloneNode(true)
  btn.replaceWith(newBtn)
  newBtn.addEventListener('click', async () => {
    const dataUpdate = {
      customerName: document.getElementById('update-customer').value.trim(),
      status: document.getElementById('update-status').value,
      capacity: Number(document.getElementById('update-capacity').value || 0)
    }
    const res = await ajax(`/api/tables/update/${tableId}`, dataUpdate)
    if (res) {
      toastr.success('Cập nhật thành công')
      modal.hide()
      await fetchTables()
    }
  })
}

// ========== SEARCH ==========
searchInput.addEventListener('input', renderTableGrid)

// ========== GRID BUTTON EVENTS ==========
tableGrid.addEventListener('click', (e) => {
  const btnAssign = e.target.closest('.btnAssignTable')
  if (btnAssign) return handleAssignTable(btnAssign)
})

document.addEventListener('click', handleOrderCheckoutButtons)
btnConfirmAssignTable.addEventListener('click', confirmAssignTable)

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  await fetchTables()
  setInterval(updateSeatedTimes, 1000)
})
