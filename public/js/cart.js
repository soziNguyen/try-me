// CONSTANTS & GLOBAL VARIABLES
const CART_COOKIE_NAME = 'cart_items'
let allItems = []
let currentSearchResults = []
const tableId = getQueryParam('tableId') || ''
const currentOrderId = getQueryParam('orderId')
const btn = document.querySelector('.viewCartBottomBtn')

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  updateCartQuantity()
  updateTotalPrice()
  initSearchInput()
  await loadMenuData()
  initCartModal()
  submitOrder()
  document.getElementById('btnViewOrder').addEventListener('click', handleViewOrder)
  document.getElementById('btnBackToMenu').addEventListener('click', handleBackToMenu)
  initCallStaffSocket()
  customScrollbarInit()
})

async function handleViewOrder() {
  if (!btn.classList.contains('d-none')) btn.classList.add('d-none')

  try {
    const result = await ajax(`/api/order/${currentOrderId}/public`, {}, 'GET')
    const order = result
    if (!order) return toastr.warning('Không có dữ liệu đơn hàng')

    // Ẩn menu, hiện chi tiết đơn
    document.getElementById('foodMenuCol').classList.add('d-none')
    document.getElementById('orderDetail').classList.remove('d-none')

    renderOrderDetail(order)
  } catch (err) {
    console.error(err)
    toastr.error('Không thể tải đơn hàng')
  }
}

function handleBackToMenu() {
  document.getElementById('orderDetail').classList.add('d-none')
  document.getElementById('foodMenuCol').classList.remove('d-none')
  if (btn.classList.contains('d-none')) btn.classList.remove('d-none')
}

// RENDER
function renderOrderDetail(order) {
  // Thông tin tóm tắt
  document.getElementById('orderSummary').innerHTML = `
    <div><strong>Mã đơn:</strong> ${order.code}</div>
    <div><strong>Bàn:</strong> ${order.table?.name || ''} (${order.table?.area || ''})</div>
    <div><strong>Thời gian:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}</div>
  `

  // Danh sách món
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td>${i.name}</td>
        <td class="text-center">${i.quantity}</td>
        <td class="text-end">${i.price.toLocaleString()} đ</td>
        <td class="text-end">${(i.price * i.quantity).toLocaleString()} đ</td>
      </tr>`
    )
    .join('')

  document.getElementById('orderDetailBody').innerHTML = rows
  document.getElementById('orderDetailTotal').textContent =
    order.totalAmount.toLocaleString('vi-VN') + ' đ'
}

// SEARCH FUNCTIONALITY
function initSearchInput() {
  const searchInput = document.getElementById('searchMenuInput')
  if (!searchInput) return

  const debouncedSearch = debounce(runSearch, 300)

  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim()

    if (!keyword) {
      renderMenu(allItems)
      currentSearchResults = allItems
      return
    }

    if (keyword.length >= 1) {
      debouncedSearch(keyword)
    }
  })
}

async function runSearch(keyword) {
  try {
    const [menuRes, comboRes] = await Promise.all([
      fetch(
        `/api/menu/search?s=${encodeURIComponent(keyword)}&tableId=${encodeURIComponent(tableId)}`
      ),
      fetch(
        `/api/menu/combo/search?s=${encodeURIComponent(keyword)}&tableId=${encodeURIComponent(tableId)}`
      )
    ])

    const menuData = menuRes.ok ? await menuRes.json() : { data: [] }
    const comboData = comboRes.ok ? await comboRes.json() : { data: [] }

    const combinedData = [...(menuData.data || []), ...(comboData.data || [])]

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

// DATA LOADING
async function loadMenuData() {
  try {
    const [foods, combos] = await Promise.all([
      ajax(`/api/menu/get/active`, { tableId }, 'GET'),
      ajax(`/api/menu/combos/active`, { tableId }, 'GET')
    ])

    if (!Array.isArray(foods)) return

    allItems = mergeMenus(foods, combos)
    renderMenu(allItems)
    renderCategories(extractCategories(allItems))
  } catch (error) {
    console.error('Lỗi khi tải thực đơn và combo:', error)
  }
}

function mergeMenus(foods, combos) {
  const combosMapped = combos.map((combo) => ({ ...combo, isCombo: true }))
  const foodsMapped = foods.map((food) => ({ ...food, isCombo: false }))
  return [...combosMapped, ...foodsMapped]
}

// CATEGORY
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
    <button class="btn btn-outline-danger active category-btn" data-action="all">Tất cả</button>
    <button class="btn btn-outline-success category-btn" data-action="combo">Combo</button>
    ${categories
      .map(
        (cate) =>
          `<button class="btn btn-outline-primary category-btn" data-category="${cate}">${cate}</button>`
      )
      .join('')}
  `

  attachCategoryEventListeners(categoryList)
}

function attachCategoryEventListeners(categoryList) {
  const buttons = categoryList.querySelectorAll('button')

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action')
      const category = button.getAttribute('data-category')

      // Đánh dấu nút active
      buttons.forEach((btn) => btn.classList.remove('active'))
      button.classList.add('active')

      // Thực hiện hành động
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

// MENU RENDERING
function renderMenu(items) {
  const menuDiv = document.getElementById('foodMenu')
  if (!menuDiv) return

  menuDiv.innerHTML = items.map(createMenuItemHTML).join('')
  attachMenuEventListeners(menuDiv)
}

function createMenuItemHTML(item) {
  const imgSrc = getImageSrc(item.image)
  const name = item.name || (item.isCombo ? 'Combo không rõ tên' : 'Không rõ tên')
  const price = typeof item.price === 'number' ? item.price : 0
  const priceFormatted = price.toLocaleString()

  return `
    <div class="col">
      <div class="card shadow h-100 rounded-3 p-3 menu-card-mobile">
        <img src="${imgSrc}" alt="${name}" class="card-img-top">
        <div class="card-body d-flex flex-column px-0 pb-0">
          <h5 class="card-title fw-semibold">${name}</h5>
          <p class="card-text text-secondary combo-text">${item.isCombo ? item.note || '' : item.description}</p>
          
          <div class="d-flex align-items-center justify-content-between flex-grow-1 mt-auto">
            <p class="card-text text-danger fw-bold font18 mb-0">Giá: ${priceFormatted} đ</p>
            
            <div class="d-flex align-items-center rounded-2 me-1">
              <button 
                class="btn btn-quantity-menu btn-decrease-menu font18 pe-0"
                data-id="${item._id}">
                <i class="bi bi-dash-circle"></i>
              </button>
              
              <span class="mx-3 fw-bold font18 quantity-display" data-id="${item._id}">1</span>
              
              <button 
                class="btn btn-quantity-menu btn-increase-menu font18 px-0"
                data-id="${item._id}">
                <i class="bi bi-plus-circle"></i>
              </button>
            </div>
          </div>
          
          <button 
            class="btn btn-primary rounded-1 px-4 py-2 ms-auto mt-1 btn-add-to-order"
            data-id="${item._id}"
            data-name="${name}"
            data-price="${price}"
            data-is-combo="${item.isCombo}"
            data-image="${item.image || '/assets/images/default.png'}">Thêm
          </button>
        </div>
      </div>
    </div>
  `
}

function getImageSrc(image) {
  if (!image) return '/assets/images/default.png'
  return image.startsWith('/') || image.startsWith('http') ? image : '/uploads/' + image
}

function attachMenuEventListeners(menuDiv) {
  // Nút giảm số lượng trên menu
  menuDiv.querySelectorAll('.btn-decrease-menu').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const itemId = button.dataset.id
      const qtyDisplay = menuDiv.querySelector(`.quantity-display[data-id="${itemId}"]`)
      let currentQty = parseInt(qtyDisplay.textContent)
      if (currentQty > 1) {
        currentQty -= 1
        qtyDisplay.textContent = currentQty
      }
    })
  })

  // Nút tăng số lượng trên menu
  menuDiv.querySelectorAll('.btn-increase-menu').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const itemId = button.dataset.id
      const qtyDisplay = menuDiv.querySelector(`.quantity-display[data-id="${itemId}"]`)
      let currentQty = parseInt(qtyDisplay.textContent)
      currentQty += 1
      qtyDisplay.textContent = currentQty
    })
  })

  // Nút thêm vào giỏ
  menuDiv.querySelectorAll('.btn-add-to-order').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = button.dataset.id
      const qtyDisplay = menuDiv.querySelector(`.quantity-display[data-id="${itemId}"]`)
      const quantity = parseInt(qtyDisplay.textContent)

      const item = {
        _id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        isCombo: button.dataset.isCombo === 'true',
        image: button.dataset.image || '/assets/images/default.png'
      }

      addToCart(item, quantity)

      // Reset về 1 sau khi thêm
      qtyDisplay.textContent = '1'
    })
  })
}

// CART
function initCartModal() {
  const cartIcon = document.getElementById('cartIcon')
  const viewCart = document.getElementById('btnViewCart')

  cartIcon?.addEventListener('click', () => {
    showModal('cartModal').show()
    renderCart()
  })

  viewCart?.addEventListener('click', () => {
    showModal('cartModal').show()
    renderCart()
  })
}

function getCartItems() {
  const cookie = TFunc.getCookie(CART_COOKIE_NAME)
  return cookie ? JSON.parse(cookie) : []
}

function setCartItems(items) {
  TFunc.setCookie(CART_COOKIE_NAME, JSON.stringify(items), 7 * 24 * 60 * 60 * 1000, '/')
}

function updateTotalPrice() {
  const cartItems = getCartItems()
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalPriceEl = document.getElementById('cartTotalPrice')
  if (totalPriceEl) {
    totalPriceEl.textContent = totalPrice.toLocaleString()
  }
}

function updateCartQuantity() {
  const cartItems = getCartItems()
  const qtyEl = document.querySelector('.cart-quantity')
  if (qtyEl) {
    const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0)
    qtyEl.textContent = totalQty
  }
}

function addToCart(item, quantity = 1) {
  const cart = getCartItems()

  const index = cart.findIndex((i) => i._id === item._id && i.isCombo === item.isCombo)
  if (index >= 0) {
    cart[index].quantity += quantity
  } else {
    cart.push({ ...item, quantity })
  }

  setCartItems(cart)
  toastr.remove()
  toastr.success(`x${quantity} ${item.name} đã được thêm vào giỏ`)
  renderCart()
  updateCartQuantity()
  updateTotalPrice()
}

function removeFromCart(index) {
  const cart = getCartItems()
  cart.splice(index, 1)
  setCartItems(cart)
  renderCart()
  updateCartQuantity()
  updateTotalPrice()
}

// CART RENDERING
function renderCart() {
  const cartItems = getCartItems()
  const cartDiv = document.getElementById('cartItemsList')
  if (!cartDiv) return

  if (cartItems.length === 0) {
    cartDiv.innerHTML = '<p>Chưa có món nào trong giỏ</p>'
    return
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  cartDiv.innerHTML = `
    <div class="cart-items-scroll">
      ${cartItems.map(createCartItemHTML).join('')}
    </div>
    <div class="cart-total pt-3 border-top">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0 fw-bold">Tổng cộng:</h5>
        <h5 class="mb-0 text-danger fw-bold">${totalAmount.toLocaleString()} đ</h5>
      </div>
      <div class="text-center text-success">Lưu ý: Giá trên chưa bao gồm thuế VAT</div>
    </div>
  `
  attachCartEventListeners(cartDiv)
}

function createCartItemHTML(item, index) {
  return `
    <div class="cart-item d-flex align-items-center mb-3 p-2 border rounded">
      <img 
        src="${item.image}" 
        alt="${item.name}" 
        class="cart-item-img"
      >

      <div class="flex-grow-1 ms-3">
        <div class="fw-semibold">${item.name}</div>

        <div class="d-flex align-items-center mt-2">
          <button class="btn btn-lg btn-quantity btn-decrease" data-index="${index}">
            <i class="bi bi-dash-circle"></i>
          </button>

          <span class="mx-1 fw-bold">${item.quantity}</span>

          <button class="btn btn-lg btn-quantity btn-increase" data-index="${index}">
            <i class="bi bi-plus-circle"></i>
          </button>
        </div>
      </div>

      <div class="text-end me-3">
        <div class="text-danger fw-bold fs-6">
          ${(item.price * item.quantity).toLocaleString()} đ
        </div>
      </div>

      <button class="btn btn-remove" data-index="${index}">
        <i class="bi bi-trash text-danger fs-5"></i>
      </button>
    </div>
  `
}

function attachCartEventListeners(cartDiv) {
  // Xóa món
  cartDiv.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.index))
  })

  // Giảm số lượng
  cartDiv.querySelectorAll('.btn-decrease').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = btn.dataset.index
      const cart = getCartItems()
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1
      } else {
        cart.splice(index, 1)
      }
      setCartItems(cart)
      renderCart()
      updateCartQuantity()
      updateTotalPrice()
    })
  })

  // Tăng số lượng
  cartDiv.querySelectorAll('.btn-increase').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = btn.dataset.index
      const cart = getCartItems()
      cart[index].quantity += 1
      setCartItems(cart)
      renderCart()
      updateCartQuantity()
      updateTotalPrice()
    })
  })
}

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

function submitOrder() {
  document.getElementById('btnSubmitOrder').addEventListener('click', async () => {
    const cartItems = getCartItems()

    if (!currentOrderId) {
      toastr.error('Không tìm thấy mã hóa đơn!')
      return
    }

    if (cartItems.length === 0) {
      toastr.warning('Giỏ hàng trống')
      return
    }

    try {
      const result = await ajax(`/api/order/${currentOrderId}/add-items`, { items: cartItems })
      if (result) {
        toastr.success('Gửi đơn hàng thành công!')
        TFunc.deleteCookie('cart_items', '/')
        updateCartQuantity()
        updateTotalPrice()
        renderCart()
        hideModal('cartModal')
      }
    } catch (error) {
      console.error('Lỗi gửi đơn hàng:', error)
    }
  })
}

async function initCallStaffSocket() {
  const socket = io()
  const tableId = getQueryParam('tableId') || ''

  const btn = document.getElementById('btnContactToStaff')
  if (!btn) return

  let tableInfo = null
  try {
    const result = await ajax(`/api/tables/${tableId}/public`, {}, 'GET')
    if (result) {
      tableInfo = result
    }
  } catch (error) {
    console.error(error)
  }

  const organizationId = tableInfo?.organizationId || tableInfo?.organization?._id
  const warehouseId = tableInfo?.warehouseId || tableInfo?.warehouse?._id

  const COOLDOWN = 5 * 1000 // 2 phút
  const KEY = `callStaff_${organizationId}_${warehouseId}_${tableId}`

  btn.addEventListener('click', () => {
    const lastTime = localStorage.getItem(KEY)
    const now = Date.now()

    // Kiểm tra cooldown
    if (lastTime && now - lastTime < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (now - lastTime)) / 1000)
      toastr.remove()
      toastr.warning(`Bạn đã gửi yêu cầu trước đó. Vui lòng chờ ${remaining} giây nữa để tiếp tục.`)
      return
    }

    const notification = {
      type: 'customer_call_staff',
      tableId,
      organizationId,
      warehouseId,
      tableName: tableInfo?.tableName ? `Bàn ${tableInfo.tableName}` : null,
      time: new Date().toISOString()
    }

    // Gửi lên server
    socket.emit('customer_call_staff', notification)

    // Lưu thời gian gọi
    localStorage.setItem(KEY, now.toString())

    // Lưu vào localStorage để giữ lịch sử
    let notifications = JSON.parse(localStorage.getItem('customerNotifications') || '[]')
    notifications.push(notification)
    localStorage.setItem('customerNotifications', JSON.stringify(notifications))

    toastr.remove()
    toastr.success('Đã gửi yêu cầu! Nhân viên sẽ đến hỗ trợ bạn.')
  })
}

function customScrollbarInit() {
  $('.cart-items-scroll').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200, // giảm thời gian animation -> bớt kéo quá
    mouseWheel: {
      deltaFactor: 20, // giảm tốc độ wheel nếu quá nhanh
      preventDefault: true // tránh scroll container cha
    }
  })
}
