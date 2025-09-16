// ========== PHẦN TỬ DOM ==========
const btnShowForm = document.getElementById('btnShowForm')
const formAddTable = document.getElementById('formAddTable')
const tableBody = document.getElementById('tableBody')
const btnAssignTable = document.getElementById('btnAssignTable')
const searchInput = document.getElementById('searchUserInput')

// ========== GÁN SỰ KIỆN ==========
function bindEvents() {
  btnShowForm.addEventListener('click', () => {
    const isHidden = formAddTable.classList.toggle('d-none')
    btnShowForm.textContent = isHidden ? '+ Thêm bàn' : 'Đóng'
  })

  // Sự kiện submit form Thêm bàn
  formAddTable.addEventListener('submit', async (e) => {
    e.preventDefault()

    const name = document.getElementById('name').value.trim()
    const status = document.getElementById('status').value
    const capacity = document.getElementById('capacity').value
    const area = document.getElementById('area').value.trim()

    try {
      const data = await ajax('/api/tables/create', {
        name,
        status,
        capacity,
        area
      })
      if (!data) return
      toastr.success('Thêm bàn thành công!')
      formAddTable.reset()
      formAddTable.classList.add('d-none')
      btnShowForm.textContent = '+ Thêm bàn'
      await getTables(data.area === 'kv1' ? 'kv1' : 'kv2')
    } catch (error) {
      toastr.error(error.message)
    }
  })

  const tableGrid = document.getElementById('tableGrid')

  tableGrid.addEventListener('click', function (e) {
    const btnAssign = e.target.closest('.btnAssignTable')
    if (btnAssign) {
      e.stopPropagation()

      const card = btnAssign.closest('.table-card')
      const tableName = card.querySelector('.table-name').textContent.trim()
      const capacityText = card.querySelector('.table-capacity').textContent.trim()
      const [areaText, nameText] = tableName.split(' - ')

      // Gán thông tin vào modal
      document.getElementById('assign-table-question').textContent =
        `Bạn có chắc chắn muốn giao bàn "${tableName}" không?`
      document.getElementById('assign-table-name').textContent = tableName
      document.getElementById('assign-table-capacity').textContent = capacityText
        .replace('Số Lượng Người:', '')
        .trim()
      document.getElementById('assign-table-area').textContent = areaText
        .replace('Khu vực:', '')
        .trim()

      // Reset input tên khách
      document.getElementById('customerNameInput').value = ''
      // Lưu ID bàn để xử lý sau khi xác nhận
      const tableId = card.querySelector('.tableCheckbox').getAttribute('data-id')
      document.getElementById('btnConfirmAssignTable').setAttribute('data-id', tableId)

      // Hiển thị modal
      const assignModal = new bootstrap.Modal(document.getElementById('assignTableModal'))
      assignModal.show()
    }
  })

  // Xác nhận giao bàn
  document.getElementById('btnConfirmAssignTable').addEventListener('click', async function () {
    const tableId = this.getAttribute('data-id')
    const area = document.getElementById('assign-table-area').textContent.trim()
    // Lấy tên khách từ input
    const customerName = document.getElementById('customerNameInput').value.trim()

    const customerPhone = document.getElementById('customerPhoneInput').value.trim()

    if (!tableId) {
      toastr.warning('Không tìm thấy bàn để giao.')
      return
    }

    try {
      // Gửi dữ liệu bao gồm tableId và customerName lên API
      const orderResult = await ajax(
        '/api/orders',
        { tableId, customerName, customerPhone },
        'POST'
      )

      if (!orderResult || !orderResult.orderId) {
        toastr.error('Lỗi khi tạo order')
        return
      }

      // Cập nhật danh sách bàn
      await getTables(area === 'kv1' ? 'kv1' : 'kv2')

      // Ẩn modal
      const assignModalElement = document.getElementById('assignTableModal')
      if (assignModalElement) {
        const assignModal =
          bootstrap.Modal.getInstance(assignModalElement) || new bootstrap.Modal(assignModalElement)
        assignModal.hide()
      }

      toastr.success('Giao bàn thành công!')
    } catch (err) {
      toastr.error('Lỗi khi giao bàn: ' + err.message)
    }
  })

  // BTN gọi món (sử dụng event delegation)
  document.addEventListener('click', (e) => {
    const btnOrder = e.target.closest('.btnOrderFood')
    if (btnOrder) {
      const orderId = btnOrder.getAttribute('data-order-id')
      if (orderId) {
        window.location.href = `/orders?orderId=${orderId}`
      } else {
        toastr.warning('Bàn chưa có hóa đơn, vui lòng giao bàn trước khi gọi món.')
      }
    }
  })

  document.getElementById('btnkv1').addEventListener('click', () => {
    getTables('KV1')
  })

  document.getElementById('btnkv2').addEventListener('click', () => {
    getTables('KV2')
  })

  document.getElementById('btnAll').addEventListener('click', () => {
    getTables('')
  })
}

// ========== CHƯƠNG TRÌNH CHÍNH ==========
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents()
  await getTables('')
  setInterval(updateSeatedTimes, 1000)
  searchInput.addEventListener('input', filterTables)
})

// ========== LẤY DỮ LIỆU TỪ SERVER ==========
let tableData = []
async function getTables(area = '') {
  try {
    let url = `/api/tables`
    if (area) {
      url += `?area=${encodeURIComponent(area)}`
    }
    const res = await ajax(url, {}, 'GET')
    if (res) {
      const { tables } = res
      tableData = tables
      tableData = tables
      filterTables()
    }
  } catch (error) {
    toastr.error(error.message)
  }
}

// SEARCH
function filterTables() {
  const searchTerm = searchInput.value.trim().toLowerCase()

  if (!searchTerm) {
    // Nếu input trống thì hiển thị tất cả
    renderTableList(tableData)
    return
  }

  const filteredTables = tableData.filter((table) => {
    const name = (table.name || '').toLowerCase()
    const statusMap = {
      available: 'trống',
      occupied: 'có khách',
      maintenance: 'bảo trì'
    }
    const status = (statusMap[table.status] || table.status).toLowerCase()
    const area = (table.area || '').toLowerCase()

    // Lọc nếu tên hoặc trạng thái hoặc khu vực có chứa từ khóa
    return name.includes(searchTerm) || status.includes(searchTerm) || area.includes(searchTerm)
  })

  renderTableList(filteredTables)
}

// ========== STATUS COLOR ==========
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

// ========== HIỂN THỊ DANH SÁCH BÀN ==========
function renderTableList(tables = []) {
  const tableGrid = document.getElementById('tableGrid')

  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = `<div class="col-12 text-center">Không có bàn nào.</div>`
    return
  }

  tableGrid.innerHTML = tables
    .map((table) => {
      const bgClass = getBgClassByStatus(table.status)

      // Nếu bàn đang occupied thì dùng giao diện mới
      if (table.status === 'occupied') {
        const total = table.currentOrderId?.totalAmount || 0
        const formattedTotal = `${total.toLocaleString()}đ`
        return `
    <div class="col">
      <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative d-flex flex-column justify-content-center fs-6">
        <input type="checkbox" 
          class="tableCheckbox form-check-input position-absolute top-0 end-0 m-2 d-none" 
          data-id="${table._id}" 
        />

        <div class="d-flex justify-content-between">
          <div><strong>${table.area || 'KV?'} - ${table.name}</strong></div>
          <div>${new Date(table.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <div class="d-flex justify-content-between mt-1">
          <div>Khách: ${table.currentOrderId?.customerId?.name || 'Khách lẻ'}</div>
          <div>
            <span class="seated-time" 
              data-checkin="${table.checkInTime}" 
              data-id="${table._id}">
              Đang tính...
            </span>
          </div>
        </div>

        <div class="mt-1 fw-bold">
          Số tiền: ${formattedTotal}
        </div>

        <div class="d-flex justify-content-between gap-2 mt-4">
          <button class="btnOrderFood btn btn-success btn-sm fw-bold shadow-sm" data-order-id="${table.currentOrderId?._id}">
            <i class="bi bi-clipboard-check me-1"></i> Thêm món
          </button>
          <button class="btnCheckout btn btn-primary btn-sm fw-bold shadow-sm">
            <i class="bi bi-credit-card me-1"></i> Thanh toán
          </button>
        </div>
      </div>
    </div>
  `
      }

      // Nếu bàn available thì giữ nguyên giao diện cũ
      return `
      <div class="col">
        <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative d-flex flex-column justify-content-between">
          <input type="checkbox" 
            class="tableCheckbox form-check-input position-absolute top-0 end-0 m-2 d-none" 
            data-id="${table._id}" 
          />

          <div>
            <div class="d-flex justify-content-between">
              <div class="table-name">
                ${table.area || '-'} - ${table.name}
              </div>

              <div class="table-capacity">
                <strong>Số người:</strong> ${table.capacity || '-'}
              </div>
            </div>

            <div class="table-status mt-4"><strong>Trạng thái:</strong> Trống</div>
          </div>

          <div class="d-flex justify-content-between gap-2 mt-4">
            <button class="btnAssignTable btn btn-warning btn-sm fw-bold shadow-sm">
              <i class="bi bi-clock me-1"></i> Giao bàn
            </button>
            
            <button class="btnOrderFood btn btn-success btn-sm fw-bold shadow-sm" data-order-id="${table.currentOrderId?._id}">
              <i class="bi bi-clipboard-check me-1"></i> Thêm món
            </button>
          </div>
        </div>
      </div>
      `
    })
    .join('')

  // sự kiện click cho thẻ card
  document.querySelectorAll('.table-card').forEach((card) => {
    card.addEventListener('click', function (e) {
      if (e.target.classList.contains('tableCheckbox') || e.target.closest('button')) return

      const tableId = this.querySelector('.tableCheckbox').dataset.id
      updateTable(tableId)
    })
  })
}

function fetchAndRenderTableList() {
  const csrfToken = document.getElementById('_csrf').value

  fetch('/api/tables-total', {
    method: 'GET',
    headers: {
      'x-csrf-token': csrfToken
    }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.data && data.data.tables) {
        renderTableList(data.data.tables)
      } else {
        console.error('Không tìm thấy trường tables trong response')
      }
    })
    .catch((err) => {
      console.error('Lỗi khi gọi API:', err)
    })
}

// Gọi hàm khi trang load xong
window.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderTableList()
})

// TIME ĐÃ NGỒI
function updateSeatedTimes() {
  const elements = document.querySelectorAll('.seated-time')

  elements.forEach((el) => {
    const checkInTime = new Date(el.dataset.checkin)
    const now = new Date()

    const diffMs = now - checkInTime
    const diffSeconds = Math.floor(diffMs / 1000)

    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    const seconds = diffSeconds % 60

    // Hàm để thêm số 0 nếu cần (vd: 4 => "04")
    const pad = (num) => String(num).padStart(2, '0')

    // Gán chuỗi định dạng HH:MM:SS
    let timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

    el.textContent = timeStr
  })
}

// ========== HÀM HỖ TRỢ ==========
function getSelectedTableIds() {
  const checkboxes = document.querySelectorAll('.tableCheckbox:checked')
  const ids = Array.from(checkboxes).map((cb) => cb.dataset.id)
  return ids
}

// ========== UPDATE ==========
async function updateTable(tableId) {
  try {
    const updateTableModalElement = document.getElementById('updateTableModal')
    if (!updateTableModalElement) {
      toastr.error('Update table modal not found.')
      return
    }

    const table = await ajax(`/api/tables/${tableId}`, {}, 'GET')

    // Điền dữ liệu vào form
    document.getElementById('update-name').value = table.name || ''
    document.getElementById('update-status').value = table.status || 'available'
    document.getElementById('update-capacity').value = table.capacity || ''
    document.getElementById('update-area').value = table.area || ''
    document.getElementById('update-customer').value =
      table.currentOrderId && table.currentOrderId.customerId
        ? table.currentOrderId.customerId.name
        : ''
    // Hiển thị modal
    const updateTableModal = new bootstrap.Modal(updateTableModalElement)
    updateTableModal.show()

    // Reset nút để tránh trùng sự kiện
    const oldBtn = document.getElementById('btnUpdateTable')
    const newBtn = oldBtn.cloneNode(true)
    oldBtn.replaceWith(newBtn)

    // Gán sự kiện nút cập nhật
    newBtn.addEventListener('click', async function () {
      const customerName = document.getElementById('update-customer').value.trim()
      const status = document.getElementById('update-status').value
      const capacity = document.getElementById('update-capacity').value
      const area = document.getElementById('update-area').value

      if (status === 'occupied' && !customerName) {
        toastr.warning('Vui lòng nhập tên khách nếu bàn đang có khách')
        return
      }

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
          updateTableModal.hide()
          await getTables(result.area === 'kv1' ? 'kv1' : 'kv2')
        }
      } catch (err) {
        toastr.error(err.message)
      }
    })
  } catch (err) {
    toastr.error(err.message)
  }
}

// ========== DELETE ==========
document.getElementById('btnDeleteTable')?.addEventListener('click', deleteTables)
async function deleteTables() {
  const selectedTableIds = [...document.querySelectorAll('.tableCheckbox:checked')].map(
    (cb) => cb.dataset.id
  )

  if (selectedTableIds.length === 0) {
    toastr.warning('Vui lòng chọn ít nhất 1 bàn để xóa.')
    return
  }

  const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa ${selectedTableIds.length} bàn này?`)
  if (!confirmDelete) return

  try {
    const result = await ajax('/api/tables/delete', {
      tableIds: selectedTableIds
    })

    if (result) {
      toastr.success('Đã xóa bàn thành công!')
      await getTables('KV1')

      const selectAll = document.getElementById('selectAllTable')
      if (selectAll) {
        selectAll.checked = false
      }
    }
  } catch (error) {
    toastr.error(error.message)
  }
}
