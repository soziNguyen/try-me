// CONSTANTS & GLOBAL VARIABLES
const CART_COOKIE_NAME = 'cart_items'
let allItems = []
let currentSearchResults = []
const tableId = getQueryParam('tableId') || ''

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  updateCartQuantity()
  updateTotalPrice()
  initSearchInput()
  await loadMenuData()
  initCartModal()
  submitOrder()
})

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
  // const comboItemsList = getComboItemsList(item)

  return `
    <div class="col">
      <div class="card shadow h-100 rounded-3 p-3 menu-card-mobile">
        <img src="${imgSrc}" alt="${name}" class="card-img-top">
        <div class="card-body d-flex flex-column px-0 pb-0">
          <h5 class="card-title fw-semibold">${name}</h5>
          <p class="card-text text-secondary combo-text">${item.isCombo ? item.note || '' : item.description}</p>
          <p class="card-text text-danger fw-bold fs-5 flex-grow-1">Giá: ${priceFormatted} đ</p>
          <button 
            class="btn ${item.isCombo ? 'btn-success' : 'btn-primary'} rounded-1 px-4 py-2 py mt-auto ms-auto btn-add-to-order"
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

// function getComboItemsList(item) {
//   if (!item.isCombo || !Array.isArray(item.items)) return ''
//   return item.items.map((i) => i.menuItem?.name || 'Không rõ món').join(', ')
// }

function attachMenuEventListeners(menuDiv) {
  menuDiv.querySelectorAll('.btn-add-to-order').forEach((button) => {
    button.addEventListener('click', () => {
      const item = {
        _id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        isCombo: button.dataset.isCombo === 'true',
        image: button.dataset.image || '/assets/images/default.png'
      }
      addToCart(item)
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

function addToCart(item) {
  const cart = getCartItems()

  const index = cart.findIndex((i) => i._id === item._id && i.isCombo === item.isCombo)
  if (index >= 0) {
    cart[index].quantity += 1
  } else {
    cart.push({ ...item, quantity: 1 })
  }

  setCartItems(cart)
  toastr.remove()
  toastr.success(`${item.name} đã được thêm vào giỏ`)
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
    cartDiv.innerHTML = '<p class="m-0">Chưa có món nào trong giỏ</p>'
    return
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  cartDiv.innerHTML = `
    <div class="cart-items-scroll">
      ${cartItems.map(createCartItemHTML).join('')}
    </div>
    <div class="cart-total pt-3 border-top">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold">Tổng cộng:</h5>
        <h5 class="mb-0 text-danger fw-bold">${totalAmount.toLocaleString()} đ</h5>
      </div>
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
  const currentOrderId = getQueryParam('orderId')

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
      toastr.error('Gửi đơn hàng thất bại. Vui lòng thử lại.')
    }
  })
}
