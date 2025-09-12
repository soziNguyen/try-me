// ======== Biến toàn cục ========
const urlParams = new URLSearchParams(window.location.search)
const orderId = urlParams.get('orderId')
let allFoods = []
let allCombos = []
let allItems = []
const csrfToken = document.getElementById('_csrf').value

// ======== Event Listeners ========

// DOMContentLoaded:
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const orderId = urlParams.get('orderId')
  if (orderId) window.currentOrderId = orderId

  updateOrderSectionVisibility()

  try {
    const [foods, combos] = await Promise.all([
      ajax('/api/menu/get/active', {}, 'GET'),
      fetchCombos()
    ])

    if (!Array.isArray(foods)) {
      console.error('foods không phải là mảng:', foods)
      return
    }

    allFoods = foods
    allCombos = combos
    allItems = mergeMenus(allFoods, allCombos)

    renderMenu(allItems)
    renderCategories(extractCategories(allItems))

    // Xử lý order nếu có orderId
    if (orderId) {
      const orderRes = await fetch(`/api/orders/${orderId}`)
      const orderData = await orderRes.json()
      if (orderRes.ok) updateOrderUI(orderData)
    } else {
      const warningDiv = document.getElementById('orderWarning')
      if (warningDiv) {
        warningDiv.innerHTML = `
          <div class="alert alert-warning mt-3">
            ⚠️ Vui lòng chọn bàn trước khi thao tác gọi món.
          </div>
        `
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải thực đơn và combo:', error)
  }

  // Xóa / cập nhật món trong hóa đơn
  const tbody = document.getElementById('orderItems')
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-item')
      if (btn) removeItemFromOrder(btn.dataset.id, btn.dataset.type)
    })

    tbody.addEventListener('change', (e) => {
      const input = e.target.closest('.item-quantity')
      if (input) {
        const newQuantity = parseInt(input.value, 10)
        if (newQuantity > 0) {
          updateItemQuantity(input.dataset.id, input.dataset.type, newQuantity)
        } else {
          input.value = 1
        }
      }
    })
  }

  // Nút hiển thị danh sách bàn
  const viewTable = document.querySelector('.btn-select-table')
  if (viewTable) {
    viewTable.addEventListener('click', () => {
      getTables()
      const table = document.getElementById('tableGrid')
      if (table) table.classList.toggle('show')
    })
  }
})

// Click chọn bàn (bao gồm "Mang Về")
document.getElementById('tableGrid').addEventListener('click', async (e) => {
  const btnTable = e.target.closest('.table-button')
  if (!btnTable) return

  // ===== Mang Về =====
  if (btnTable.hasAttribute('data-mang-ve')) {
    try {
      const orderResult = await ajax(
        '/api/orders',
        { tableId: null, isTakeaway: true },
        'POST'
      )

      if (orderResult?.orderId) {
        if (
          orderResult.isNewOrder &&
          !confirm('Bạn có muốn tạo order mang về không?')
        )
          return
        toastr.success('Order mang về đã được tạo thành công!')
        window.location.href = `/orders?orderId=${orderResult.orderId}`
      } else {
        toastr.error('Không thể tạo hoặc lấy order mang về.')
      }
    } catch (err) {
      toastr.error('Lỗi khi xử lý order mang về: ' + err.message)
    }
    return
  }

  // ===== Bàn thường =====
  const tableId = btnTable.getAttribute('data-table-id')
  const orderId = btnTable.getAttribute('data-order-id')
  const status = btnTable.getAttribute('data-status')

  if (status === 'available') {
    if (confirm('Bạn có muốn tạo order và gọi món cho bàn này không?')) {
      try {
        const orderResult = await ajax('/api/orders', { tableId }, 'POST')
        if (orderResult?.orderId) {
          toastr.success('Order cho bàn đã được tạo thành công!')
          setTimeout(() => {
            window.location.href = `/orders?orderId=${orderResult.orderId}`
          }, 500)
        } else {
          toastr.error('Không thể tạo order mới.')
        }
      } catch (err) {
        toastr.error('Lỗi khi tạo order: ' + err.message)
      }
    }
  } else if (status === 'occupied') {
    if (orderId) {
      window.location.href = `/orders?orderId=${orderId}`
    } else {
      toastr.warning('Bàn này đang bận nhưng không tìm thấy order.')
    }
  } else {
    toastr.info('Trạng thái bàn chưa xác định.')
  }
})

// ======== Các hàm lấy dữ liệu & render UI ========

// Lấy danh sách bàn
async function getTables() {
  try {
    const res = await ajax('/api/tables', {}, 'GET')
    if (Array.isArray(res?.tables)) {
      renderTableList(res.tables)
    } else {
      document.getElementById('tableGrid').innerHTML =
        `<div>Không có bàn nào.</div>`
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bàn:', error)
  }
}

// Render danh sách bàn
function renderTableList(tables = []) {
  const tableGrid = document.getElementById('tableGrid')
  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = `<div>Không có bàn nào.</div>`
    return
  }

  // Nút "Mang Về"
  let html = `
    <button class="btn btn-warning m-1 table-button" style="min-width:110px;height:60px;font-weight:600;" data-mang-ve="true">
      <i class="bi bi-bag"></i> Mang Về
    </button>
  `

  html += tables
    .map((table) => {
      let btnClass = 'btn-secondary'
      if (table.status === 'available') btnClass = 'btn-success'
      else if (table.status === 'occupied') btnClass = 'btn-danger'

      const orderId = table.currentOrderId
        ? table.currentOrderId.toString()
        : ''

      return `
      <button class="btn ${btnClass} m-1 table-button" style="min-width:110px;height:60px;font-weight:600;" 
        data-table-id="${table._id}" data-order-id="${orderId}" data-status="${table.status}">
        ${table.name}
      </button>
    `
    })
    .join('')

  tableGrid.innerHTML = html
}

// ===== Categories =====
function extractCategories(items) {
  const categories = []
  const names = new Set()
  for (const item of items) {
    const catName = item.category?.name
    if (catName && !names.has(catName)) {
      categories.push(catName)
      names.add(catName)
    }
  }
  return categories
}

function renderCategories(categories) {
  const categoryList = document.getElementById('categoryList')
  if (!categoryList) return

  categoryList.innerHTML = `
    <button class="btn btn-outline-danger" data-action="all">Tất cả</button>
    <button class="btn btn-outline-success" data-action="combo">Combo</button>
    ${categories
      .map(
        (cate) =>
          `<button class="btn btn-outline-primary" data-category="${cate}">${cate}</button>`
      )
      .join('')}
  `

  categoryList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action')
      const category = button.getAttribute('data-category')

      if (action === 'all') renderMenu(allItems)
      else if (action === 'combo') filterComboOnly()
      else if (category) filterMenuByCategory(category)
    })
  })
}

function filterMenuByCategory(categoryName) {
  renderMenu(allItems.filter((item) => item.category?.name === categoryName))
}

function filterComboOnly() {
  renderMenu(allItems.filter((item) => item.isCombo))
}

function mergeMenus(foods, combos) {
  const combosMapped = combos.map((combo) => ({ ...combo, isCombo: true }))
  const foodsMapped = foods.map((food) => ({ ...food, isCombo: false }))
  return [...combosMapped, ...foodsMapped]
}
// ======== Render Menu ========

function renderMenu(items) {
  const menuDiv = document.getElementById('foodMenu')
  if (!menuDiv) {
    console.error('Không tìm thấy phần tử #foodMenu trong HTML')
    return
  }

  menuDiv.innerHTML = items
    .map((item) => {
      let imgSrc = '/images/default-food.png'
      if (item.image) {
        imgSrc =
          item.image.startsWith('/') || item.image.startsWith('http')
            ? item.image
            : '/uploads/' + item.image
      }

      const name =
        item.name || (item.isCombo ? 'Combo không rõ tên' : 'Không rõ tên')
      const price = typeof item.price === 'number' ? item.price : 0
      const priceFormatted = price.toLocaleString()

      const comboItemsList =
        item.isCombo && Array.isArray(item.items)
          ? item.items.map((i) => i.menuItem?.name || 'Không rõ món').join(', ')
          : ''

      return `
      <div class="col">
        <div class="card shadow-sm h-100 rounded-3">
          <img src="${imgSrc}" alt="${name}" class="card-img-top" style="object-fit: cover; height: 180px;">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title fw-semibold">${name}</h5>
            ${item.isCombo ? `<p class="card-text text-secondary">Gồm: ${comboItemsList}</p>` : ''}
            <p class="card-text text-danger fw-bold fs-5 flex-grow-1">Giá: ${priceFormatted} đ</p>
            <button 
              class="btn ${item.isCombo ? 'btn-success' : 'btn-primary'} btn-sm rounded-pill px-3 mt-auto btn-add-to-order"
              data-id="${item._id}"
              data-name="${name}"
              data-price="${price}"
              data-is-combo="${item.isCombo}">
              <i class="bi bi-bag-plus"></i> Thêm${item.isCombo ? ' combo' : ''}
            </button>
          </div>
        </div>
      </div>
    `
    })
    .join('')

  // Gán sự kiện cho các nút "Thêm"
  menuDiv.querySelectorAll('.btn-add-to-order').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id
      const name = button.dataset.name
      const price = Number(button.dataset.price)
      const isCombo = button.dataset.isCombo === 'true'

      if (isCombo) {
        addComboToOrder(id, name, price)
      } else {
        addToOrder(id, name, price)
      }
    })
  })
}

// ======== Hiển thị/Ẩn hóa đơn ========

function updateOrderSectionVisibility() {
  const orderItems = document.querySelectorAll('#orderItems tr')
  const orderSection = document.getElementById('orderSection')
  const foodMenuCol = document.getElementById('foodMenuCol')

  if (orderItems.length > 0) {
    orderSection.classList.remove('d-none')
    foodMenuCol.classList.remove('col-lg-12')
    foodMenuCol.classList.add('col-lg-8')
  } else {
    orderSection.classList.add('d-none')
    foodMenuCol.classList.remove('col-lg-8')
    foodMenuCol.classList.add('col-lg-12')
  }
}

// ======== Fetch combos ========

async function fetchCombos() {
  try {
    const combos = await ajax('/api/menu/combos/active', {}, 'GET')
    if (!Array.isArray(combos)) {
      console.error('combos không phải là mảng:', combos)
      return []
    }
    return combos
  } catch (error) {
    console.error('Lỗi khi tải combo:', error)
    return []
  }
}

// ======== Cập nhật UI Hóa đơn ========

function updateOrderUI(order) {
  const tbody = document.getElementById('orderItems')
  const totalAmountEl = document.getElementById('totalAmount')
  const titleEl = document.getElementById('orderTitle')

  // Tiêu đề hóa đơn
  if (order.isTakeaway) {
    titleEl.textContent = '🧾 Hóa đơn mang về'
  } else if (order.tableId && order.tableId.name) {
    titleEl.textContent = `🧾 Hóa đơn bàn ${order.tableId.name} (${order.tableId.area})`
  } else {
    titleEl.textContent = '🧾 Hóa đơn'
  }

  // Danh sách món
  tbody.innerHTML = ''
  for (const item of order.items) {
    const name = item.foodId?.name || item.comboId?.name || 'Không rõ'
    const price = item.price || 0
    const quantity = item.quantity || 0
    const amount = price * quantity
    const id = item.foodId?._id || item.comboId?._id || ''

    const row = `
      <tr>
        <td>${name}</td>
        <td>
          <input 
            type="number" 
            class="border-0 item-quantity"
            min="1" 
            value="${quantity}" 
            style="width: 60px;" 
            data-id="${id}"
            data-type="${item.foodId ? 'food' : 'combo'}"
          />
        </td>
        <td>${price.toLocaleString()}</td>
        <td>${amount.toLocaleString()}đ</td>
        <td>
          <button class="btn btn-sm btn-outline-danger remove-item" 
            data-id="${id}" 
            data-type="${item.foodId ? 'food' : 'combo'}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `
    tbody.insertAdjacentHTML('beforeend', row)
  }

  // Tổng tiền
  const total = calculateTotalAmount(order.items)
  totalAmountEl.textContent = `${total.toLocaleString()}đ`

  // Thêm nút thanh toán nếu chưa có
  if (!document.getElementById('checkoutBtn')) {
    const orderSummary = document.getElementById('orderSummary')
    orderSummary.insertAdjacentHTML(
      'beforeend',
      `
      <div class="text-end mt-3">
        <button class="btn btn-outline-success" id="checkoutBtn">
          <i class="bi bi-credit-card"></i> CHI TIẾT HÓA ĐƠN
        </button>
      </div>
    `
    )
  }

  syncCheckoutDetailTotal()
  updateOrderSectionVisibility()
}

// ======== Các hàm xử lý thêm/xóa/sửa món ========

// Thêm món vào hóa đơn
async function addToOrder(foodId, foodName, price) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ foodId, quantity: 1 })
    })
    const result = await res.json()
    if (!res.ok) {
      toastr.error(result.message || 'Lỗi khi thêm món')
      return
    }
    toastr.success(`Đã thêm ${foodName} vào hóa đơn`)
    updateOrderUI(result.data)
  } catch (err) {
    console.error('Lỗi khi thêm món:', err)
    toastr.error('Lỗi kết nối server')
  }
  updateOrderSectionVisibility()
}

async function addComboToOrder(comboId, comboName, price) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ comboId, quantity: 1 })
    })
    const result = await res.json()
    if (!res.ok) {
      toastr.error(result.message || 'Lỗi khi thêm combo')
      return
    }
    toastr.success(`Đã thêm combo ${comboName} vào hóa đơn`)
    updateOrderUI(result.data)
  } catch (err) {
    console.error('Lỗi khi thêm combo:', err)
    toastr.error('Lỗi kết nối server')
  }
  updateOrderSectionVisibility()
}

// Cập nhật số lượng món ăn trong hóa đơn
async function updateItemQuantity(itemId, type, newQuantity) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ itemId, quantity: Number(newQuantity), type })
    })
    const result = await res.json()
    if (!res.ok) {
      toastr.error(result.message || 'Lỗi khi cập nhật số lượng')
      return
    }
    toastr.success('Cập nhật số lượng thành công')
    updateOrderUI(result.data)
  } catch (err) {
    console.error('Lỗi khi cập nhật số lượng:', err)
    toastr.error('Lỗi kết nối server')
  }
}

// Xóa món khỏi hóa đơn
async function removeItemFromOrder(itemId, type) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const res = await fetch(
      `/api/orders/${orderId}/items/${itemId}?type=${type}`,
      {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken }
      }
    )
    const result = await res.json()
    if (!res.ok) {
      toastr.error(result.message || 'Lỗi khi xóa món')
      return
    }
    toastr.success('Đã xóa khỏi hóa đơn')
    updateOrderUI(result.data)
  } catch (err) {
    console.error('Lỗi khi xóa món:', err)
    toastr.error('Lỗi kết nối server')
  }
}
