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

  try {
    const [foods, combos] = await Promise.all([
      ajax('/api/menu/get/active', {}, 'GET'),
      fetchCombos()
    ])

    if (!Array.isArray(foods)) {
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
      searchInput.focus()
      const orderData = await orderRes.json()
      if (orderRes.ok) updateOrderUI(orderData.data)
    } else {
      const warningDiv = document.getElementById('orderWarning')
      if (warningDiv) {
        warningDiv.innerHTML = `
          <div class="alert alert-warning">
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
})

// ===== hóa đơn trống ======
const createOrderCard = document.getElementById('createOrderCard')
const orderFull = document.getElementById('orderFull')
const btnShowEmptyOrders = document.getElementById('btnShowEmptyOrders')
const emptyOrdersContainer = document.getElementById('emptyOrdersContainer')

let isLoaded = false

// Kiểm tra orderId trong URL để ẩn/hiện phần tương ứng
function checkOrderIdInURL(orders = []) {
  const urlParams = new URLSearchParams(window.location.search)
  const orderId = urlParams.get('orderId')

  if (orderId) {
    createOrderCard.style.display = 'none'
    orderFull.classList.remove('d-none')
  } else {
    if (orders.length > 0) {
      // Nếu có hóa đơn nhưng không có orderId => chuyển đến order mới nhất (hoặc đầu tiên)
      window.location.href = `/orders?orderId=${orders[0]._id}`
    } else {
      createOrderCard.style.display = 'block'
      orderFull.classList.add('d-none')
    }
  }
}

// Hàm tạo hóa đơn
async function handleCreateNewOrder(button) {
  button.disabled = true
  try {
    const orderResult = await ajax('/api/orders', { tableId: null, isTakeaway: false }, 'POST')
    if (orderResult?.orderId) {
      toastr.success('Tạo hóa đơn thành công!')
      setTimeout(() => {
        window.location.href = `/orders?orderId=${orderResult.orderId}`
      }, 300)
    } else {
      toastr.error('Không thể tạo hóa đơn trống.')
      button.disabled = false
    }
  } catch (err) {
    toastr.error('Lỗi khi tạo hóa đơn: ' + err.message)
    button.disabled = false
  }
}

// Hàm tạo nút "Tạo hóa đơn mới"
function createNewOrderButton() {
  return `
    <button id="order-tab-new" class="btn btn-outline-success m-1 fw-bold" title="Tạo hóa đơn mới">
      <i class="bi bi-plus-circle"></i>
    </button>
  `
}

// Hàm render danh sách hóa đơn trống
function renderEmptyOrders(orders) {
  let html = ''

  // Lấy orderId từ URL
  const urlParams = new URLSearchParams(window.location.search)
  const currentOrderId = urlParams.get('orderId')

  if (!orders || orders.length === 0) {
    html = `
      <nav>
        <div class="nav nav-tabs" id="nav-tab" role="tablist">
          <button class="nav-link active" id="order-tab-new" type="button" role="tab" aria-selected="true">
            <span id="btnCreateNewOrder" class="cursor-pointer"><i class="bi bi-plus"></i></span>
          </button>
        </div>
      </nav>
      <p class="mt-2">Không có hóa đơn.</p>
    `
  } else {
    const reversedOrders = [...orders].reverse()

    const tabs = reversedOrders
      .map((order) => {
        const isActive = currentOrderId
          ? order._id === currentOrderId
          : order._id === reversedOrders[reversedOrders.length - 1]._id

        return `
          <button class="nav-link ${isActive ? 'active' : ''}" 
                  id="order-tab-${order._id}" 
                  data-order-id="${order._id}" 
                  type="button" 
                  role="tab" 
                  aria-selected="${isActive}"
                  ${isActive ? 'disabled' : ''}>
            ${order.code}
          </button>
        `
      })
      .join('')

    // Thêm tab cuối cho nút tạo hóa đơn mới
    const newOrderTab = `
      <button class="nav-link " id="order-tab-new" type="button" role="tab" aria-selected="false">
        <span id="btnCreateNewOrder" class="cursor-pointer w-100"><i class="bi bi-plus"></i></span>
      </button>
    `

    html = `
      <nav>
        <div class="nav nav-tabs" id="nav-tab" role="tablist">
          ${tabs}
          ${newOrderTab}
        </div>
      </nav>
    `
  }

  emptyOrdersContainer.innerHTML = html

  // Gán sự kiện click cho nút tạo mới
  const btnCreateNewOrder = document.getElementById('order-tab-new')
  if (btnCreateNewOrder) {
    btnCreateNewOrder.addEventListener('click', () => handleCreateNewOrder(btnCreateNewOrder))
  }

  // Gán sự kiện click cho các tab hóa đơn (chỉ cho các tab không bị disabled)
  const tabButtons = emptyOrdersContainer.querySelectorAll(
    '.nav-link[data-order-id]:not([disabled])'
  )
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      const orderId = tab.getAttribute('data-order-id')
      window.location.href = `/orders?orderId=${orderId}`
    })
  })
}

let emptyOrders = []
// Lấy danh sách hóa đơn
async function fetchEmptyOrders() {
  emptyOrdersContainer.innerHTML = 'Đang tải...'
  try {
    const data = await ajax('/api/orders/get', { length: 20, status: 'open' }, 'GET')
    if (!data) {
      emptyOrdersContainer.innerHTML = '<p class="text-danger">Không thể tải dữ liệu</p>'
      return
    }
    emptyOrders = data
    checkOrderIdInURL(data)
    renderEmptyOrders(data)
    isLoaded = true
  } catch (error) {
    emptyOrdersContainer.innerHTML = `<p class="text-danger">Lỗi kết nối: ${error.message}</p>`
  }
}

// Sự kiện click nút tạo hóa đơn
createOrderCard.addEventListener('click', () => handleCreateNewOrder(createOrderCard))

// Lấy danh sách bàn
async function getTables(order = null) {
  try {
    const res = await ajax('/api/tables', {}, 'GET')
    const tables = Array.isArray(res?.tables) ? res.tables : []

    const $select = $('#table-select')
    const availableTables = tables.filter((t) => t.status === 'available')

    let html = ''
    if (order?.tableId?._id) {
      html += `<option value="${order.tableId._id}" selected>Bàn: ${order.tableId.name}</option>`
    } else {
      html += '<option value="">Chọn bàn</option>'
      html += availableTables.map((t) => `<option value="${t._id}">${t.name}</option>`).join('')
    }

    $select.html(html)

    // Khởi tạo hoặc cập nhật select2
    if ($select.hasClass('select2-hidden-accessible')) {
      $select.trigger('change.select2')
    } else {
      $select.select2({ width: '100px', placeholder: 'Chọn bàn' })
    }

    // Nếu đã có bàn được gán thì disable select
    if (order?.tableId?._id) {
      $select.prop('disabled', true)
    } else {
      $select.prop('disabled', false)
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bàn:', error)
    $('#tableGrid').html(`<div>Không có bàn nào.</div>`)
  }
}

// Render danh sách bàn thủ công
function renderTableList(tables = []) {
  const $select = $('#table-select')
  const availableTables = tables.filter((t) => t.status === 'available')

  if (availableTables.length === 0) {
    $select.html('<option value="">Không có bàn nào</option>')
    return
  }

  const options = availableTables
    .map((table) => `<option value="${table._id}">${table.name}</option>`)
    .join('')

  $select.html('<option value="">Chọn bàn</option>' + options)

  if ($select.hasClass('select2-hidden-accessible')) {
    $select.trigger('change.select2')
  } else {
    $select.select2({ placeholder: 'Chọn bàn', width: '100px' })
  }
}

$('#table-select').on('change', async function () {
  const tableId = $(this).val()
  if (!tableId) return

  try {
    let orderIdToAssign = null

    if (emptyOrders && emptyOrders.length > 0) {
      orderIdToAssign = emptyOrders[0]._id
    }

    if (!orderIdToAssign) {
      toastr.error('Không có order trống để gán bàn!')
      return
    }

    const assignResult = await ajax(
      `/api/orders/${orderIdToAssign}/assign-table`,
      { tableId },
      'POST'
    )
    if (!assignResult?.orderId) {
      toastr.error('Lỗi khi giao bàn')
      return
    }

    toastr.success('Gán bàn thành công!')
    await fetchEmptyOrders()

    // Lấy thông tin bàn vừa chọn (tên)
    const selectedOption = $(this).find(`option[value="${tableId}"]`)
    const tableName = selectedOption.length ? selectedOption.text() : 'Bàn đã gán'

    // Cập nhật lại select để hiển thị bàn đã gán
    await getTables({
      tableId: {
        _id: tableId,
        name: tableName
      }
    })
  } catch (err) {
    toastr.error('Lỗi khi giao bàn: ' + err.message)
  }
})

// Khi trang được load
document.addEventListener('DOMContentLoaded', async () => {
  await fetchEmptyOrders()
  await loadOrder()
})

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
        (cate) => `<button class="btn btn-outline-primary" data-category="${cate}">${cate}</button>`
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
    return
  }

  menuDiv.innerHTML = items
    .map((item) => {
      let imgSrc = '/assets/images/default.png'
      if (item.image) {
        imgSrc =
          item.image.startsWith('/') || item.image.startsWith('http')
            ? item.image
            : '/uploads/' + item.image
      }

      const name = item.name || (item.isCombo ? 'Combo không rõ tên' : 'Không rõ tên')
      const price = typeof item.price === 'number' ? item.price : 0
      const priceFormatted = price.toLocaleString()

      const comboItemsList =
        item.isCombo && Array.isArray(item.items)
          ? item.items.map((i) => i.menuItem?.name || 'Không rõ món').join(', ')
          : ''

      return `
      <div class="col">
        <div class="card shadow-sm h-100 rounded-3">
          <img src="${imgSrc}" alt="${name}" class="card-img-top">
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

const searchInput = document.getElementById('searchMenuInput')
let currentSearchResults = []
let exactMatchHandled = false

if (searchInput) {
  let searchTimeout = null

  const runSearch = async (keyword) => {
    try {
      const [menuRes, comboRes] = await Promise.all([
        fetch(`/api/menu/search?keyword=${encodeURIComponent(keyword)}`),
        fetch(`/api/menu/combo/search?keyword=${encodeURIComponent(keyword)}`)
      ])

      const menuData = menuRes.ok ? await menuRes.json() : { data: [] }
      const comboData = comboRes.ok ? await comboRes.json() : { data: [] }

      const combinedData = [...(menuData.data || []), ...(comboData.data || [])]

      const exactMatch = combinedData.find((item) => item.code === keyword)

      if (exactMatch) {
        const id = exactMatch._id
        const name = exactMatch.name || (exactMatch.isCombo ? 'Combo không rõ tên' : 'Không rõ tên')
        const price = typeof exactMatch.price === 'number' ? exactMatch.price : 0
        const isCombo = !!exactMatch.isCombo

        if (isCombo) {
          addComboToOrder(id, name, price)
        } else {
          addToOrder(id, name, price)
        }

        toastr.success(`Đã thêm ${name} vào hóa đơn`)

        searchInput.value = ''
        renderMenu(allItems)
        currentSearchResults = allItems

        exactMatchHandled = true
        return
      }

      if (combinedData.length === 0) {
        toastr.info('Không tìm thấy sản phẩm')
      }

      currentSearchResults = combinedData
      renderMenu(combinedData)
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err)
      currentSearchResults = []
      renderMenu([])
    }
  }

  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim()

    if (!keyword) {
      if (searchTimeout) clearTimeout(searchTimeout)
      renderMenu(allItems)
      currentSearchResults = allItems
      return
    }

    if (searchTimeout) clearTimeout(searchTimeout)

    if (keyword.length >= 6) {
      runSearch(keyword)
    } else {
      searchTimeout = setTimeout(() => {
        runSearch(keyword)
      }, 300)
    }
  })

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()

      if (exactMatchHandled) {
        exactMatchHandled = false
        return
      }

      if (currentSearchResults.length === 0) {
        toastr.info('Không có món nào để thêm')
        return
      }

      const item = currentSearchResults[0]
      const id = item._id
      const name = item.name || (item.isCombo ? 'Combo không rõ tên' : 'Không rõ tên')
      const price = typeof item.price === 'number' ? item.price : 0
      const isCombo = !!item.isCombo

      if (isCombo) {
        addComboToOrder(id, name, price)
      } else {
        addToOrder(id, name, price)
      }

      searchInput.value = ''
      renderMenu(allItems)
      currentSearchResults = allItems
    }
  })
}

// ======== Hiển thị/Ẩn hóa đơn ==========

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

  // Tiêu đề hóa đơn
  const titleEl = document.getElementById('orderTitle')
  if (titleEl) {
    // update title
    if (order.isTakeaway) {
      titleEl.textContent = '🧾 Hóa đơn mang về'
    } else if (order.tableId && order.tableId.name) {
      titleEl.textContent = `🧾 Hóa đơn bàn ${order.tableId.name} (${order.tableId.area})`
    } else {
      titleEl.textContent = '🧾 Hóa đơn'
    }
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
        <td><span class="d-block w-100 text">${name}</span></td>
        <td>
          <input 
            type="number" 
            class="border-0 number item-quantity d-block w-100"
            min="1" 
            value="${quantity}" 
            data-id="${id}"
            data-type="${item.foodId ? 'food' : 'combo'}"
          />
        </td>
        <td><span class="d-block w-100 number">${price.toLocaleString()}</span></td>
        <td><span class="d-block w-100 number">${amount.toLocaleString()}đ</span></td>
        <td class="text-center">
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

  syncCheckoutDetailTotal()
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
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}?type=${type}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken }
    })
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
//
// ======== select khách hàng ========
$(async () => {
  const $select = $('#customerSelect'),
    $loyaltyPoints = $('#loyaltyPoints'),
    $addCustomerBtn = $('#addCustomerBtn'),
    orderId = new URLSearchParams(window.location.search).get('orderId')

  const updatePoints = (points = 0) => {
    $loyaltyPoints.text(`${points} điểm`)
    $addCustomerBtn.toggleClass('d-none', points > 0)
  }

  function initSelect2() {
    if ($select.hasClass('select2-hidden-accessible')) {
      $select.select2('destroy')
    }
    $select.select2({
      placeholder: 'Tìm kiếm hoặc nhập tên - số điện thoại',
      minimumInputLength: 1,
      tags: false,
      ajax: {
        url: '/api/customers/search',
        dataType: 'json',
        delay: 300,
        data: (params) => ({ search: params.term }),
        processResults: (res) => {
          const data = res.data || []
          if (data.length === 0) updatePoints(0)
          return {
            results: data.map((c) => ({
              id: c._id,
              text: `${c.name} - ${c.phone}`,
              points: c.totalPoints || 0
            }))
          }
        },
        cache: true
      },
      templateResult: (c) => {
        if (c.loading) return c.text
        return `<div><strong>${c.text}</strong></div>`
      },
      templateSelection: (c) => c.text || c.id,
      escapeMarkup: (m) => m
    })
  }

  async function loadOrder() {
    if (!orderId) {
      initSelect2()
      await getTables()
      return
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`)

      if (!res.ok) throw new Error('Không lấy được dữ liệu hóa đơn')
      const data = await res.json()
      const order = data.data

      const customer = order.customerId

      initSelect2()
      const $select = $('#customerSelect') // giả sử select khách hàng có id này

      if (customer?._id) {
        const option = new Option(`${customer.name} - ${customer.phone}`, customer._id, true, true)

        $(option).data('points', customer.totalPoints || 0)
        $select.append(option).trigger('change')
        updatePoints(customer.totalPoints)
      }

      // Gọi getTables truyền order để hiển thị bàn đã gán
      await getTables(order)
    } catch (e) {
      console.error(e)
      initSelect2()
      await getTables()
    }
  }

  // Khi chọn 1 item trong select
  $select.on('select2:select', async (e) => {
    const customer = e.params.data

    if (customer.isNew) {
      updatePoints(0)
      $addCustomerBtn.removeClass('d-none')
    } else {
      updatePoints(customer.points)
      $addCustomerBtn.addClass('d-none')

      if (!orderId) return

      try {
        const result = await ajax(
          `/api/orders/${orderId}/customer`,
          { customerId: customer.id || customer._id },
          'PUT'
        )
        if (!result) return

        toastr.success('Gán khách hàng thành công!')
        updatePoints(result.customer.totalPoints)
      } catch (error) {
        console.error(error)
        toastr.error('Không thể gán khách hàng vào đơn.')
      }
    }
  })

  $select.on('select2:clear', () => {
    updatePoints(0)
    $addCustomerBtn.addClass('d-none')
  })

  // nút Thêm
  $addCustomerBtn.on('click', () => {
    $('#addCustomerModal').modal('show')
  })

  // trong modal
  $('#saveCustomerBtn').on('click', async () => {
    const name = $('#newCustomerName').val().trim()
    const phone = $('#newCustomerPhone').val().trim()

    if (!name || !phone) {
      toastr.warning('Tên và số điện thoại không được để trống')
      return
    }

    try {
      const data = await ajax('/api/customers/create', { name, phone }, 'POST')
      if (!data) return

      const newOption = new Option(`${data.name} - ${data.phone}`, data._id, true, true)
      $(newOption).data('points', data.totalPoints || 0)

      $select.empty().append(newOption).trigger('change')
      updatePoints(data.totalPoints)

      if (orderId) {
        try {
          const result = await ajax(
            `/api/orders/${orderId}/customer`,
            { customerId: data._id },
            'PUT'
          )
          if (result) {
            updatePoints(result.customer.totalPoints)
          }
        } catch (error) {
          console.error(error)
          toastr.error('Không thể gán khách hàng vào đơn.')
        }
      }

      $('#addCustomerModal').modal('hide')
      $('#addCustomerForm')[0].reset()

      toastr.success('Thêm khách hàng mới thành công!')
    } catch (error) {
      console.error(error)
      toastr.error(error.message || 'Không thể tạo khách hàng!')
    }
  })
  window.loadOrder = loadOrder
  await loadOrder()
})
