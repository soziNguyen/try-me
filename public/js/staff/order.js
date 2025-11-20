// ======== Biến toàn cục ========
const urlParams = window.location.pathname.split('/')
const orderId = urlParams.pop()
let allItems = []
const csrfToken = document.getElementById('_csrf').value

function getOrderIdFromURL() {
  const match = window.location.pathname.match(/^\/orders\/([a-f0-9]{24})$/i)
  return match ? match[1] : null
}

// ======== Event Listeners ========

// DOMContentLoaded:
document.addEventListener('DOMContentLoaded', async () => {
  const orderId = getOrderIdFromURL()
  if (orderId) window.currentOrderId = orderId

  try {
    const [foods, combos] = await Promise.all([
      ajax('/api/menu/get/active', {}, 'GET'),
      ajax('/api/menu/combos/active', {}, 'GET')
    ])

    allItems = mergeMenus(foods, combos)
    renderMenu(allItems)
    renderCategories(extractCategories(allItems))

    // Xử lý order nếu có orderId
    await loadOrderInfo(orderId)
    setInterval(() => loadOrderInfo(orderId), 30 * 1000)
  } catch (e) {
    console.error('Lỗi khi tải dữ liệu menu:', e)
  }

  // Luôn fetch danh sách hóa đơn
  await fetchEmptyOrders()

  // Xóa / cập nhật món trong hóa đơn
  const tbody = document.getElementById('orderItems')
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-item')
      if (btn) removeItemFromOrder(btn.dataset.id, btn.dataset.type, btn.dataset.batch)
    })

    tbody.addEventListener('change', (e) => {
      const input = e.target.closest('.item-quantity')
      if (input) {
        const newQuantity = parseInt(input.value, 10)
        if (newQuantity > 0) {
          updateItemQuantity(input.dataset.id, input.dataset.type, newQuantity, input.dataset.batch)
        } else {
          input.value = 1
        }
      }
    })
  }
})

async function loadOrderInfo(orderId) {
  if (!orderId) {
    const warningDiv = document.getElementById('orderWarning')
    if (warningDiv) {
      warningDiv.innerHTML = `
        <div class="alert alert-warning">
          ⚠️ Vui lòng chọn bàn trước khi thao tác gọi món.
        </div>
      `
    }
    return
  }

  try {
    const result = await ajax(`/api/orders/${orderId}`, {}, 'GET')

    if (result) {
      updateOrderUI(result)
      await getTables(result)
      renderKitchenStatus(result)
    }
  } catch (e) {
    console.error('Lỗi khi load order:', e)
  }
}

// ===== hóa đơn trống ======
const createOrderCard = document.getElementById('createOrderCard')
const orderFull = document.getElementById('orderFull')
const btnShowEmptyOrders = document.getElementById('btnShowEmptyOrders')
const emptyOrdersContainer = document.getElementById('emptyOrdersContainer')

let isLoaded = false

// Kiểm tra orderId trong URL để ẩn/hiện phần tương ứng
function checkOrderIdInURL(orders = []) {
  const orderId = getOrderIdFromURL()

  if (orderId) {
    // Có ID hợp lệ → hiển thị giao diện chi tiết đơn
    createOrderCard.style.display = 'none'
    orderFull.classList.remove('d-none')
    return
  }

  // Không có orderId → đứng tại /orders
  if (orders.length > 0) {
    // Chuyển sang đơn đầu tiên
    window.location.href = `/orders/${orders[0]._id}`
  } else {
    // Không có đơn nào → hiện nút tạo đơn
    createOrderCard.style.display = 'block'
    orderFull.classList.add('d-none')
  }
}

// Hàm tạo hóa đơn
async function handleCreateNewOrder(button) {
  button.disabled = true
  try {
    const orderResult = await ajax('/api/orders', { tableId: null, isTakeaway: true }, 'POST')
    if (orderResult?.orderId) {
      toastr.success('Tạo hóa đơn thành công!')
      setTimeout(() => {
        window.location.href = `/orders/${orderResult.orderId}`
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

  const currentOrderId = window.location.pathname.split('/').pop()
  // const currentOrderId = urlParams.get('orderId')

  if (!orders || orders.length === 0) {
    html = `
      <nav class="mb-3">
        <div class="nav nav-tabs border-0" id="nav-tab" role="tablist">
          <button 
            class="nav-link active border-0 border-bottom border-3 border-primary bg-white text-primary shadow-sm px-3 py-2"
            id="order-tab-new"
            type="button"
            role="tab"
            aria-selected="true">
            <span id="btnCreateNewOrder" class="cursor-pointer d-flex align-items-center gap-2">
              <i class="bi bi-plus-lg fw-bold"></i>
              <span class="fw-bold">Tạo hóa đơn</span>
            </span>
          </button>
        </div>
      </nav>
      <div class="alert alert-info bg-info bg-opacity-10 border-0 border-start border-4 border-info rounded-3 d-flex align-items-center gap-3 shadow-sm">
        <i class="bi bi-info-circle-fill fs-2 text-info"></i>
        <div>
          <h6 class="mb-1 fw-bold text-dark">Chưa có hóa đơn nào</h6>
          <small class="text-muted">Bắt đầu bằng cách tạo hóa đơn mới</small>
        </div>
      </div>
    `
  } else {
    const reversedOrders = [...orders].reverse()

    const tabs = reversedOrders
      .map((order) => {
        const isActive = currentOrderId
          ? order._id === currentOrderId
          : order._id === reversedOrders[reversedOrders.length - 1]._id

        return `
          <button 
            class="nav-link ${
              isActive
                ? 'active border-0 border-bottom border-4 border-danger bg-white text-danger'
                : 'border-0 border-bottom border-2 border-secondary bg-white text-secondary'
            } shadow px-2 py-1 fw-semibold"
            id="order-tab-${order._id}" 
            data-order-id="${order._id}" 
            type="button" 
            role="tab" 
            aria-selected="${isActive}"
            ${isActive ? 'disabled' : ''}>
            ${formatOrderCode(order.code)}
          </button>
        `
      })
      .join('')

    const newOrderTab = `
      <button 
        class="nav-link border-0 border-bottom border-2 border-success bg-white text-success shadow-sm px-2 py-1 fw-bold" 
        id="order-tab-new"
        type="button"
        role="tab"
        aria-selected="false">
        <span id="btnCreateNewOrder" class="cursor-pointer d-flex align-items-center justify-content-center gap-2">
          <i class="bi bi-plus-lg"></i>
        </span>
      </button>
    `

    html = `
      <nav class="mb-3">
        <div class="nav nav-tabs border-0 border-bottom border-2 d-flex flex-wrap gap-2"
             id="nav-tab"
             role="tablist">
          ${tabs}
          ${newOrderTab}
        </div>
      </nav>
    `
  }

  emptyOrdersContainer.innerHTML = html

  const btnCreateNewOrder = document.getElementById('order-tab-new')
  if (btnCreateNewOrder) {
    btnCreateNewOrder.addEventListener('click', () => handleCreateNewOrder(btnCreateNewOrder))
  }

  const tabButtons = emptyOrdersContainer.querySelectorAll(
    '.nav-link[data-order-id]:not([disabled])'
  )
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      const orderId = tab.getAttribute('data-order-id')
      window.location.href = `/orders/${orderId}`
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
    if (!$select.length) {
      console.error('Không tìm thấy element #table-select')
      return
    }

    if ($select.hasClass('select2-hidden-accessible')) {
      $select.select2('destroy')
    }

    let html = '<option value="">Chọn bàn</option>'
    const currentTableId = order?.tableId?._id || null

    tables.forEach((t) => {
      const selected = t._id === currentTableId ? 'selected' : ''
      const prefix = t._id === currentTableId ? 'Bàn: ' : ''
      html += `<option value="${t._id}" ${selected}>${prefix}${t.name}</option>`
    })

    $select.html(html)

    $select.select2({
      width: '100%',
      placeholder: 'Chọn bàn'
    })

    $select.prop('disabled', false)
  } catch (error) {
    toastr.error('Không thể tải danh sách bàn')
  }
}

$('#table-select').on('change', async function () {
  const tableId = $(this).val()
  if (!tableId) return

  try {
    const orderIdToAssign = window.location.pathname.split('/').pop()
    if (!orderIdToAssign) {
      toastr.error('Không xác định được hóa đơn để gán bàn!')
      return
    }

    const result = await ajax(`/api/orders/${orderIdToAssign}/assign-table`, { tableId }, 'POST')

    if (result) {
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
    }
  } catch (err) {
    console.error('Lỗi khi giao bàn: ' + err.message)
  }
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

  const buttons = categoryList.querySelectorAll('button')

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action')
      const category = button.getAttribute('data-category')

      // ----- Đánh dấu nút active -----
      buttons.forEach((btn) => {
        btn.classList.remove('active')
      })
      button.classList.add('active')

      // ----- Thực hiện hành động -----
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
        fetch(`/api/menu/search?s=${encodeURIComponent(keyword)}`),
        fetch(`/api/menu/combo/search?s=${encodeURIComponent(keyword)}`)
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

// ======== Cập nhật UI Hóa đơn ========

function updateOrderUI(order) {
  const tbody = document.getElementById('orderItems')
  const totalAmountEl = document.getElementById('totalAmount')

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
            data-batch="${item.batch}"
          />
        </td>
        <td><span class="d-block w-100 number">${price.toLocaleString()}</span></td>
        <td><span class="d-block w-100 number">${amount.toLocaleString()}đ</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger remove-item" 
            data-id="${id}" 
            data-type="${item.foodId ? 'food' : 'combo'}"
            data-batch="${item.batch}"
            >
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

  calculateTotals()
}

// ======== Các hàm xử lý thêm/xóa/sửa món ========

// Thêm món vào hóa đơn
async function addToOrder(foodId, foodName, price) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const result = await ajax(`/api/orders/${orderId}/items`, { foodId, quantity: 1 })
    if (result) {
      toastr.remove()
      toastr.success(`Đã thêm ${foodName} vào hóa đơn`)
      updateOrderUI(result)
      renderKitchenStatus(result)
    }
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
    const result = await ajax(`/api/orders/${orderId}/items`, { comboId, quantity: 1 })
    if (result) {
      toastr.remove()
      toastr.success(`Đã thêm combo ${comboName} vào hóa đơn`)
      updateOrderUI(result)
      renderKitchenStatus(result)
    }
  } catch (err) {
    console.error('Lỗi khi thêm combo:', err)
    toastr.error('Lỗi kết nối server')
  }
}

// Cập nhật số lượng món ăn trong hóa đơn
async function updateItemQuantity(itemId, type, newQuantity, batch) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const result = await ajax(`/api/orders/${orderId}/items/${itemId}`, {
      itemId,
      quantity: Number(newQuantity),
      type,
      batch
    })

    if (result) {
      toastr.success('Cập nhật số lượng thành công')
      updateOrderUI(result)
    }
  } catch (err) {
    console.error('Lỗi khi cập nhật số lượng:', err)
    toastr.error('Lỗi kết nối server')
  }
}

// Xóa món khỏi hóa đơn
async function removeItemFromOrder(itemId, type, batch = null) {
  if (!orderId) {
    toastr.error('Không tìm thấy hóa đơn.')
    return
  }
  try {
    const res = await fetch(
      `/api/orders/${orderId}/items/${itemId}?type=${type}&batch=${batch ?? null}`,
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
//
// ======== select khách hàng ========
$(async () => {
  const $select = $('#customerSelect'),
    $loyaltyPoints = $('#loyaltyPoints'),
    $addCustomerBtn = $('#addCustomerBtn'),
    orderId = getOrderIdFromURL()

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
      const result = await ajax(`/api/orders/${orderId}`, {}, 'GET')
      if (result) {
        const order = result
        const customer = order.customerId

        initSelect2()
        const $select = $('#customerSelect')

        if (customer?._id) {
          const option = new Option(
            `${customer.name} - ${customer.phone}`,
            customer._id,
            true,
            true
          )

          $(option).data('points', customer.totalPoints || 0)
          $select.append(option).trigger('change')
          updatePoints(customer.totalPoints)
        }

        // Gọi getTables truyền order để hiển thị bàn đã gán
        await getTables(order)
      }
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
        if (result) {
          toastr.success('Gán khách hàng thành công!')
          updatePoints(result.customer.totalPoints)
        }
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
  $('#addCustomerForm').on('submit', async (e) => {
    e.preventDefault()
    const name = $('#newCustomerName').val().trim()
    const phone = $('#newCustomerPhone').val().trim()

    if (!phone) {
      toastr.warning('Số điện thoại không được để trống')
      return
    }

    try {
      const data = await ajax('/api/customer/create', { name, phone }, 'POST')
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

function renderKitchenStatus(order) {
  const container = document.getElementById('kitchenStatus')
  if (!container) return

  const items = order.items || []

  if (!items.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <p class="mb-0">Không có món nào trong đơn.</p>
      </div>
    `
    return
  }

  // Badge hiển thị trạng thái
  const statusBadge = (status) => {
    switch (status) {
      case 'pending':
        return `<span class="badge bg-warning text-dark">Chờ chế biến</span>`
      case 'cooking':
        return `<span class="badge bg-primary">Đang chế biến</span>`
      case 'done':
        return `<span class="badge bg-success">Hoàn thành</span>`
      default:
        return `<span class="badge bg-secondary">${status}</span>`
    }
  }

  // Lấy tên món (combo hoặc món lẻ)
  const getItemName = (item) => {
    if (item.comboId) return item.comboId.name
    if (item.foodId) return item.foodId.name
    return 'Món không xác định'
  }

  // Nhóm theo batch (lượt gửi bếp)
  const batches = {}

  items.forEach((item) => {
    const batch = item.batch == null ? 'Được yêu cầu thêm từ khách hàng' : Number(item.batch)
    if (!batches[batch]) batches[batch] = []
    batches[batch].push(item)
  })

  let html = ''

  Object.keys(batches).forEach((batch) => {
    html += `
      <div class="mb-3">
        <h6 class="fw-bold text-primary">#${batch}</h6>
        <table class="table table-bordered mb-0">
          <thead class="table-light">
            <tr>
              <th width="55%">Món</th>
              <th width="15%" class="text-center">SL</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${batches[batch]
              .map(
                (item) => `
                <tr>
                  <td class="px-2">${getItemName(item)}</td>
                  <td class="text-center px-2">${item.quantity}</td>
                  <td class="px-2">${statusBadge(item.status)}</td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
  })

  container.innerHTML = html
}
