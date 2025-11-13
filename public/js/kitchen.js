document.addEventListener('DOMContentLoaded', async () => {
  await fetchKitchenOrders()
  setInterval(fetchKitchenOrders, 30000) // Tự động làm mới mỗi 30 giây
  customeScrollbarInit()
})

async function fetchKitchenOrders() {
  try {
    const orders = await ajax('/api/kitchen/orders', {}, 'GET')
    renderKitchenOrders(orders)
    return orders
  } catch (error) {
    console.error(error)
    return []
  }
}

function renderKitchenOrders(orders) {
  const container = document.querySelector('.kitchen-orders')
  container.innerHTML = ''

  if (!orders.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <p class="fs-1 mb-3">📋</p>
        <p class="mb-0">Không có đơn hàng cần chế biến</p>
      </div>`
    return
  }

  const row = document.createElement('div')
  row.className = 'row g-4'

  orders.forEach((order) => {
    const col = document.createElement('div')
    col.className = 'col-md-6 col-lg-4'

    const card = document.createElement('div')
    card.className = 'card border-0 shadow h-100'
    card.dataset.orderId = order._id

    const timeElapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
    const urgencyClass = timeElapsed > 30 ? 'danger' : timeElapsed > 15 ? 'warning' : 'success'

    console.log(order)

    card.innerHTML = `
      <div class="card-header bg-white border-0 py-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="mb-1 fw-bold text-primary">#${order.code}</h5>
            <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
              <span class="badge bg-${urgencyClass} text-white px-2 py-1">
                ${new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              ${
                order.tableId
                  ? `<span class="badge bg-info text-white px-2 py-1">Bàn ${order.tableId ? order.tableId.name : 'Mang về'}</span>`
                  : `<span class="badge bg-secondary text-white px-2 py-1">Mang đi</span>`
              }
            </div>
          </div>
          <span class="badge rounded-pill bg-primary fs-6">${order.items.length}</span>
        </div>
      </div>
      
      <div class="card-body mh-300 overflow-auto pt-2">
        <h6 class="text-muted text-uppercase small mb-3">Món ăn</h6>
        <ul class="list-group list-group-flush">
          ${order.items
            .map(
              (item) =>
                `<li class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                   <span>${item.foodId?.name || item.comboId?.name || 'N/A'}</span>
                   <span class="badge bg-light text-dark fs-6">×${item.quantity || 1}</span>
                 </li>`
            )
            .join('')}
        </ul>
      </div>
      
      <div class="card-footer bg-light border-0 py-2 text-muted">
        <small>${timeElapsed < 1 ? 'Vừa xong' : `${timeElapsed} phút trước`}</small>
      </div>
    `

    card.addEventListener('click', () => showOrderDetail(order))
    col.appendChild(card)
    row.appendChild(col)
  })

  container.appendChild(row)
}

// MODAL HIỂN THỊ CHI TIẾT

function showOrderDetail(order) {
  const modalBody = document.getElementById('orderDetailContent')

  const timeElapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)

  let html = `
    <div class="border-bottom pb-3 mb-4">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h4 class="fw-bold mb-2">#${order.code}</h4>
          <p class="mb-0">
            ${
              order.tableId
                ? `<span class="badge bg-info">Bàn ${order.tableId.name}</span>`
                : `<span class="badge bg-secondary">Mang đi</span>`
            }
          </p>
        </div>
        <div class="text-end">
          <div class="text-muted small">${new Date(order.createdAt).toLocaleString('vi-VN')}</div>
          <div class="text-muted small">${timeElapsed < 1 ? 'Vừa xong' : `${timeElapsed} phút trước`}</div>
        </div>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr class="table-light">
            <th width="50" class="text-center">#</th>
            <th>Tên món</th>
            <th width="80" class="text-center">SL</th>
            <th width="120" class="text-center">Trạng thái</th>
            <th width="280" class="text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
  `

  let idx = 1
  order.items.forEach((item) => {
    if (item.foodId) {
      html += renderFoodRow(idx++, order._id, item)
    } else if (item.comboId) {
      html += renderComboRow(idx++, order._id, item)
    }
  })

  html += `
        </tbody>
      </table>
    </div>
  `

  modalBody.innerHTML = html

  modalBody.querySelectorAll('.btn-item-status').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { order: orderId, item: itemId, status } = btn.dataset

      // Disable button đang click
      btn.disabled = true

      const result = await updateItemStatus(orderId, itemId, status)

      if (result) {
        // Lấy lại data order mới
        const updatedOrders = await fetchKitchenOrders()
        const updatedOrder = updatedOrders.find((o) => o._id === orderId)

        if (updatedOrder) {
          // Tìm item trong order mới
          const updatedItem = updatedOrder.items.find((i) => i._id === itemId)

          if (updatedItem) {
            // Chỉ update status badge và button group của item này
            updateItemStatusUI(itemId, updatedItem.status)
          }
        }
      } else {
        // Enable lại nếu fail
        btn.disabled = false
      }
    })
  })

  const modalEl = document.getElementById('orderDetailModal')
  let modal = bootstrap.Modal.getInstance(modalEl)

  if (!modal) {
    modal = new bootstrap.Modal(modalEl)
  }

  modal.show()
}

// Hàm update UI không reload toàn bộ modal
function updateItemStatusUI(itemId, newStatus) {
  const modalBody = document.getElementById('orderDetailContent')

  // Tìm row chứa item này
  const row = modalBody.querySelector(`[data-item="${itemId}"]`)?.closest('tr')

  if (row) {
    // Update badge status
    const badge = row.querySelector('.badge')
    if (badge) {
      badge.className = `badge bg-${getStatusColor(newStatus)}`
      badge.textContent = getStatusText(newStatus)
    }

    // Update active state của buttons
    const buttons = row.querySelectorAll('.btn-item-status')
    buttons.forEach((btn) => {
      const btnStatus = btn.dataset.status

      if (btnStatus === newStatus) {
        btn.classList.remove(`btn-outline-${getStatusColor(btnStatus)}`)
        btn.classList.add(`btn-${getStatusColor(btnStatus)}`)
      } else {
        btn.classList.remove(`btn-${getStatusColor(btnStatus)}`)
        btn.classList.add(`btn-outline-${getStatusColor(btnStatus)}`)
      }

      btn.disabled = false
    })
  }
}

function renderFoodRow(idx, orderId, item) {
  return `
    <tr>
      <td class="text-muted text-center py-2">${idx}</td>
      <td class="py-2">${item.foodId.name}</td>
      <td class="text-center py-2"><strong>${item.quantity}</strong></td>
      <td class="text-center py-2">
        <span class="badge bg-${getStatusColor(item.status)} py-2">${getStatusText(item.status)}</span>
      </td>
      <td class="text-center py-2">${renderStatusButtons(orderId, item._id, item.status)}</td>
    </tr>
  `
}

function renderComboRow(idx, orderId, item) {
  let html = `
    <tr class="table-active py-2">
      <td class="text-muted text-center py-2">${idx}</td>
      <td class="py-2"><strong>${item.comboId.name}</strong></td>
      <td class="text-center py-2"><strong>${item.quantity}</strong></td>
      <td class="text-center py-2">
        <span class="badge bg-${getStatusColor(item.status)} py-2">${getStatusText(item.status)}</span>
      </td>
      <td class="text-center py-2">${renderStatusButtons(orderId, item._id, item.status)}</td>
    </tr>
  `
  if (item.comboId.items?.length) {
    item.comboId.items.forEach((ci) => {
      html += `
        <tr>
          <td></td>
          <td class="ps-4 py-1 text-muted small">${ci.quantity} × ${ci.menuItem?.name || ''}</td>
          <td colspan="3"></td>
        </tr>
      `
    })
  }
  return html
}

function renderStatusButtons(orderId, itemId, currentStatus) {
  const statuses = [
    { value: 'pending', label: 'Chờ' },
    { value: 'cooking', label: 'Đang nấu' },
    { value: 'done', label: 'Xong' }
  ]

  return `
    <div class="d-flex gap-2 justify-content-center">
      ${statuses
        .map(
          (s) => `
        <button 
          type="button"
          class="btn btn-sm ${
            currentStatus === s.value
              ? `btn-${getStatusColor(s.value)}`
              : `btn-outline-${getStatusColor(s.value)}`
          } btn-item-status"
          data-order="${orderId}"
          data-item="${itemId}"
          data-status="${s.value}">
          ${s.label}
        </button>`
        )
        .join('')}
    </div>
  `
}

function getStatusColor(status) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'cooking':
      return 'primary'
    case 'done':
      return 'success'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending':
      return 'Chờ'
    case 'cooking':
      return 'Đang nấu'
    case 'done':
      return 'Xong'
    default:
      return status
  }
}

async function updateItemStatus(orderId, itemId, status) {
  try {
    const result = await ajax(`/api/kitchen/order/${orderId}/item/${itemId}`, { status })
    if (result) {
      toastr.remove()
      toastr.success('Cập nhật trạng thái thành công')
    }
    return result
  } catch (err) {
    console.error(err)
    toastr.error('Cập nhật thất bại')
    return null
  }
}

function customeScrollbarInit() {
  $('.kitchen-orders .card-body').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200, // giảm thời gian animation -> bớt kéo quá
    mouseWheel: {
      deltaFactor: 20, // giảm tốc độ wheel nếu quá nhanh
      preventDefault: true // tránh scroll container cha
    }
  })

  $('#orderDetailModal .modal-body').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200, // giảm thời gian animation -> bớt kéo quá
    mouseWheel: {
      deltaFactor: 20, // giảm tốc độ wheel nếu quá nhanh
      preventDefault: true // tránh scroll container cha
    }
  })
}
