let POINT_VALUE = 500
let taxes = []
let paymentMethods = []

// UTILITY FUNCTIONS
function parseCurrency(value) {
  if (!value) return 0
  return Number(value.toString().replace(/[^\d]/g, '')) || 0
}

function calculateTotalAmount(items) {
  let total = 0
  for (const item of items) {
    const price = item.price || 0
    const quantity = item.quantity || 0
    total += price * quantity
  }
  return total
}

// CALCULATION FUNCTIONS
function updateChangeAmount() {
  const totalEl = document.getElementById('total')
  const customerPaidInput = document.getElementById('customerPaidInput')
  const changeAmountInput = document.getElementById('changeAmount')

  if (!totalEl || !customerPaidInput || !changeAmountInput) return

  const total = parseCurrency(totalEl.value)
  const customerPaid = parseCurrency(customerPaidInput.value)
  const change = customerPaid - total

  changeAmountInput.value = change > 0 ? change.toLocaleString() : '0'
}

function calculateTotals() {
  const totalAmountEl = document.getElementById('totalAmount')
  const discountInput = document.getElementById('discountInput')
  const pointsInput = document.getElementById('pointsInput')
  const pointsDiscountInput = document.getElementById('pointsDiscountInput')
  const serviceChargeInput = document.getElementById('serviceChargeInput')
  const extraDiscountInput = document.getElementById('extraDiscountInput')
  const vatInput = document.getElementById('vatInput')
  const totalPayableEl = document.getElementById('totalPayable')
  const totalEl = document.getElementById('total')

  if (
    !totalAmountEl ||
    !discountInput ||
    !pointsInput ||
    !pointsDiscountInput ||
    !serviceChargeInput ||
    !extraDiscountInput ||
    !vatInput ||
    !totalPayableEl ||
    !totalEl
  )
    return

  const totalAmount = parseCurrency(totalAmountEl.textContent)
  const discount = parseCurrency(discountInput.value)
  const pointsUsed = parseInt(pointsInput.value) || 0
  const pointsDiscount = pointsUsed * POINT_VALUE
  const serviceCharge = parseCurrency(serviceChargeInput.value)
  const extraDiscount = parseCurrency(extraDiscountInput.value)
  const vatRate = Number(vatInput.value) || 0

  // Tính tổng giảm giá + phí dịch vụ
  const totalPayable = totalAmount - discount - pointsDiscount - extraDiscount + serviceCharge

  // Nếu tổng âm => báo lỗi hoặc reset về 0
  if (totalPayable < 0) {
    totalPayableEl.value = '0'
    totalEl.value = '0'
    pointsDiscountInput.value = pointsDiscount
    return
  }

  // Cập nhật hiển thị pointsDiscount
  pointsDiscountInput.value = pointsDiscount

  // Tổng tiền trước thuế
  const safeTotalPayable = Math.max(0, totalPayable)

  // Tổng tiền sau thuế
  const totalWithVAT = Math.round(safeTotalPayable + (safeTotalPayable * vatRate) / 100)

  totalPayableEl.value = safeTotalPayable.toLocaleString('vi-VN')
  totalEl.value = totalWithVAT.toLocaleString('vi-VN')

  updateChangeAmount()
}

function syncCheckoutDetailTotal() {
  const totalAmountEl = document.getElementById('totalAmount')
  const totalPayableEl = document.getElementById('totalPayable')
  const customerPaidInput = document.getElementById('customerPaidInput')

  if (!totalAmountEl || !totalPayableEl) return

  const totalText = totalAmountEl.textContent.replace(/[^\d]/g, '')
  const totalNumber = Number(totalText) || 0

  totalPayableEl.value = totalNumber.toLocaleString()
  if (customerPaidInput) customerPaidInput.value = ''

  calculateTotals()
}

// CASH SUGGESTIONS FUNCTIONS
function showPriceSuggestions(show) {
  const priceSuggestionDiv = document.querySelector('.price-suggestion')
  const dynamicSuggestionDiv = document.getElementById('dynamicSuggestions')
  if (!priceSuggestionDiv || !dynamicSuggestionDiv) return

  if (show) {
    priceSuggestionDiv.classList.remove('d-none')
    dynamicSuggestionDiv.classList.add('d-none')
  } else {
    priceSuggestionDiv.classList.add('d-none')
    dynamicSuggestionDiv.classList.remove('d-none')
  }
}

function clearDynamicSuggestions() {
  const container = document.getElementById('dynamicSuggestions')
  if (container) {
    container.innerHTML = ''
    container.classList.add('d-none')
  }
}

function updateDynamicSuggestions(inputValue) {
  const container = document.getElementById('dynamicSuggestions')
  container.innerHTML = ''

  const rawValue = parseInt(inputValue.replace(/[^\d]/g, '') || '0', 10)
  if (!rawValue) {
    container.classList.add('d-none')
    return
  }

  const maxValue = 100000000
  const suggestionsSet = new Set()
  const rawValueStr = rawValue.toString()

  if (rawValue === 1) {
    const powersOfTen = [3, 4, 5, 6, 7]
    for (let power of powersOfTen) {
      const val = rawValue * Math.pow(10, power)
      if (val >= 1000 && val <= maxValue) {
        suggestionsSet.add(val)
      }
    }
  } else {
    const standardAmounts = [
      1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 100000, 150000, 200000,
      250000, 300000, 400000, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000,
      10000000, 15000000, 20000000, 25000000, 30000000, 40000000, 50000000
    ]

    for (let amt of standardAmounts) {
      if (amt.toString().startsWith(rawValueStr) && amt >= 1000 && amt <= maxValue) {
        suggestionsSet.add(amt)
      }
    }

    let multiplier = 10
    for (let i = 0; i < 5; i++) {
      const val = rawValue * multiplier
      if (val >= 1000 && val <= maxValue) {
        suggestionsSet.add(val)
      }
      multiplier *= 10
    }
  }

  const suggestions = Array.from(suggestionsSet).sort((a, b) => a - b)

  for (let val of suggestions) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn btn-outline-primary btn-sm cash-suggestion'
    btn.dataset.value = val
    btn.textContent = val.toLocaleString('vi-VN')
    container.appendChild(btn)
  }

  if (suggestions.length > 0) {
    container.classList.remove('d-none')
  } else {
    container.classList.add('d-none')
  }
}

// API FUNCTIONS
async function getTaxes() {
  try {
    const data = await ajax('/api/taxes/active', {}, 'GET')
    if (data) {
      taxes = data
    }
  } catch (error) {
    console.error(error.message)
  }
}

async function getPaymentMethods() {
  try {
    const result = await ajax('/api/payment-method/active', {}, 'GET')
    if (result) {
      paymentMethods = result
    }
  } catch (error) {
    console.error(error)
  }
}

// RENDER FUNCTIONS
function renderTaxOptions() {
  const vatInput = document.getElementById('vatInput')
  if (!vatInput) return

  taxes.forEach((tax) => {
    const option = document.createElement('option')
    option.value = tax.rate
    option.textContent = `${tax.rate} %`
    vatInput.appendChild(option)
  })
}

async function fillPaymentMethods() {
  try {
    await getPaymentMethods()

    const container = document.getElementById('paymentMethod')
    container.innerHTML = '' // clear cũ

    paymentMethods.forEach((p) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn-outline-primary'
      button.setAttribute('data-value', p._id)
      button.setAttribute('data-type', p.type)
      button.title = p.name

      const iconMap = {
        cash: 'bi-cash-stack',
        bank: 'bi-bank',
        card: 'bi-credit-card',
        'e-wallet': 'bi-wallet2'
      }

      const iconClass = iconMap[p.type] || 'bi-question-circle'
      button.innerHTML = `<i class="bi ${iconClass}"></i> ${p.name}`

      container.appendChild(button)
    })
  } catch (error) {
    console.error(error)
  }
}

// EVENT HANDLERS

// Xử lý nhập tiền khách đã trả
function initCustomerPaidInput() {
  const customerPaidInput = document.getElementById('customerPaidInput')
  if (!customerPaidInput) return

  // Lưu giá trị cuối cùng đã lưu để tránh gọi API thừa
  let lastSavedValue = ''

  // Hàm cập nhật dữ liệu vào DB
  async function saveCustomerPaid() {
    let val = customerPaidInput.value.replace(/[^\d]/g, '') || '0'

    // Chỉ gọi API nếu giá trị thay đổi
    if (val === lastSavedValue) return
    lastSavedValue = val

    const orderId = window.currentOrderId
    if (!orderId) {
      toastr.error('Không xác định được đơn hàng!')
      return
    }

    const data = getCurrentOrderFormData()

    try {
      const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
      if (result) {
        toastr.success('Cập nhật thành công!')
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error)
      toastr.error('Lỗi mạng hoặc server')
    }
  }

  // Khi input được focus vào
  customerPaidInput.addEventListener('focus', async () => {
    let currentVal = customerPaidInput.value.replace(/[^\d]/g, '')
    if (currentVal && parseInt(currentVal) > 0) {
      return // Nếu đã có giá trị thì không làm gì
    }

    const totalEl = document.getElementById('total')
    if (!totalEl) return

    let totalValue = totalEl.value || '0'
    totalValue = totalValue.replace(/[^\d]/g, '')

    if (totalValue && parseInt(totalValue) > 0) {
      customerPaidInput.value = Number(totalValue).toLocaleString('vi-VN')
      updateChangeAmount()

      await saveCustomerPaid()
    }
  })

  // Khi người dùng nhập liệu
  customerPaidInput.addEventListener('input', () => {
    let val = customerPaidInput.value.replace(/[^\d]/g, '')
    if (val === '') val = '0'

    customerPaidInput.value = Number(val).toLocaleString()

    if (val === '0') {
      showPriceSuggestions(true)
      clearDynamicSuggestions()
    } else {
      showPriceSuggestions(false)
      updateDynamicSuggestions(val)
    }

    updateChangeAmount()
  })

  customerPaidInput.addEventListener('change', saveCustomerPaid)
}

function getCurrentOrderFormData() {
  return {
    discount: Number(document.getElementById('discountInput')?.value.replace(/[^\d]/g, '') || 0),
    pointsUsed: Number(document.getElementById('pointsInput')?.value.replace(/[^\d]/g, '') || 0),
    serviceCharge: Number(
      document.getElementById('serviceChargeInput')?.value.replace(/[^\d]/g, '') || 0
    ),
    extraDiscount: Number(
      document.getElementById('extraDiscountInput')?.value.replace(/[^\d]/g, '') || 0
    ), // CHIẾT KHẤU
    vatRate: Number(document.getElementById('vatInput')?.value || 0),
    customerPaid: Number(
      document.getElementById('customerPaidInput')?.value.replace(/[^\d]/g, '') || 0
    ),
    paymentMethodId: document.getElementById('paymentMethodValue').value
  }
}

// Xử lý thay đổi số điểm sử dụng
function initPointsInput() {
  const applyPointsForm = document.getElementById('applyPointsForm')
  const applyPointsBtn = document.getElementById('applyPointsBtn')
  const pointsInput = document.getElementById('pointsInput')
  const pointsMessage = document.getElementById('pointsMessage')
  const pointsDiscountWrapper = document.getElementById('pointsDiscountWrapper')
  const pointsDiscountInput = document.getElementById('pointsDiscountInput')

  const storedPoints = localStorage.getItem(`appliedPoints_${orderId}`)

  if (!applyPointsForm) return

  // Nếu có điểm đã áp dụng lưu trong localStorage, hiển thị trạng thái đã áp dụng
  if (storedPoints && parseInt(storedPoints, 10) > 0) {
    pointsInput.value = storedPoints
    pointsInput.disabled = true
    applyPointsBtn.textContent = 'X'
    applyPointsBtn.classList.remove('btn-primary')
    applyPointsBtn.classList.add('btn-danger')
    applyPointsBtn.dataset.state = 'applied'

    // Hiển thị phần giảm điểm và tính số tiền giảm tương ứng
    pointsDiscountInput.value = parseInt(storedPoints, 10) * POINT_VALUE
    pointsDiscountWrapper.classList.remove('d-none')
  } else {
    applyPointsBtn.dataset.state = 'idle'

    // Ẩn phần giảm điểm khi chưa áp dụng
    pointsDiscountInput.value = 0
    pointsDiscountWrapper.classList.add('d-none')
  }

  applyPointsForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (applyPointsBtn.dataset.state === 'applied') {
      try {
        await ajax(`/api/orders/${orderId}/update-draft`, { pointsUsed: 0 }, 'POST')

        window.appliedPoints = null
        localStorage.removeItem(`appliedPoints_${orderId}`)
        pointsInput.value = 0
        pointsInput.disabled = false
        applyPointsBtn.textContent = 'Áp dụng'
        applyPointsBtn.classList.add('btn-primary')
        applyPointsBtn.classList.remove('btn-danger')
        applyPointsBtn.dataset.state = 'idle'
        pointsMessage.textContent = ''

        // Ẩn phần giảm điểm khi hủy
        pointsDiscountInput.value = 0
        pointsDiscountWrapper.classList.add('d-none')

        calculateTotals()
      } catch (error) {
        console.error('Lỗi khi hủy áp dụng điểm:', error)
        pointsMessage.textContent = 'Lỗi khi hủy áp dụng điểm'
        pointsMessage.className = 'text-danger d-block mt-1'
      }
      return
    }

    // Áp dụng điểm
    const points = parseInt(pointsInput.value, 10)
    if (isNaN(points) || points <= 0) {
      pointsMessage.textContent = 'Vui lòng nhập số điểm hợp lệ'
      pointsMessage.className = 'text-danger d-block mt-1'
      return
    }

    try {
      const result = await ajax(
        `/api/orders/${orderId}/update-draft`,
        { pointsUsed: points },
        'POST'
      )
      if (result) {
        window.appliedPoints = points
        localStorage.setItem(`appliedPoints_${orderId}`, points)
        applyPointsBtn.textContent = 'X'
        applyPointsBtn.classList.remove('btn-primary')
        applyPointsBtn.classList.add('btn-danger')
        applyPointsBtn.dataset.state = 'applied'
        pointsInput.disabled = true
        pointsMessage.textContent = 'Điểm đã được áp dụng'
        pointsMessage.className = 'text-success d-block mt-1'

        pointsDiscountInput.value = points * 500
        pointsDiscountWrapper.classList.remove('d-none')

        calculateTotals()
      }
    } catch (error) {
      console.error('Lỗi khi áp dụng điểm:', error)
      pointsMessage.textContent = 'Lỗi khi áp dụng điểm'
      pointsMessage.className = 'text-danger d-block mt-1'
    }
  })
}

// Xử lý áp dụng mã giảm giá
function initDiscountCode() {
  const applyCouponForm = document.getElementById('applyCouponForm')
  const applyDiscountBtn = document.getElementById('applyDiscountBtn')
  const codeInput = document.getElementById('discountCodeInput')
  const discountInput = document.getElementById('discountInput')
  const discountMessage = document.getElementById('discountMessage')
  const totalAmountEl = document.getElementById('totalAmount')
  const discountInputWrapper = document.getElementById('discountInputWrapper')
  const storedCouponId = localStorage.getItem(`appliedCouponId_${orderId}`)
  const storedCouponCode = localStorage.getItem(`appliedCouponCode_${orderId}`)

  if (!applyCouponForm) return
  if (storedCouponId && storedCouponCode) {
    codeInput.value = storedCouponCode
    codeInput.disabled = true
    applyDiscountBtn.textContent = 'X'
    applyDiscountBtn.classList.remove('btn-primary')
    applyDiscountBtn.classList.add('btn-danger')
    applyDiscountBtn.dataset.state = 'applied'

    discountInputWrapper.classList.remove('d-none')
  }

  applyCouponForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (applyDiscountBtn.dataset.state === 'applied') {
      // Xóa mã giảm giáa
      window.appliedCouponId = null
      localStorage.removeItem(`appliedCouponId_${orderId}`)
      localStorage.removeItem(`appliedCouponCode_${orderId}`)

      await ajax(`/api/orders/${orderId}/update-draft`, { discount: 0, couponId: null }, 'POST')

      discountInput.value = 0
      codeInput.value = ''
      codeInput.disabled = false
      applyDiscountBtn.textContent = 'Áp dụng'
      applyDiscountBtn.classList.add('btn-primary')
      applyDiscountBtn.classList.remove('btn-danger')
      applyDiscountBtn.dataset.state = 'idle'

      discountInputWrapper.classList.add('d-none')
      calculateTotals()
      return
    }

    // Áp dụng mã giảm giá
    const code = codeInput.value.trim()
    if (!code) {
      discountMessage.textContent = 'Vui lòng nhập mã giảm giá'
      discountMessage.className = 'text-danger d-block mt-1'
      return
    }

    let totalAmount = parseCurrency(totalAmountEl.textContent)
    if (totalAmount <= 0) {
      discountMessage.textContent = 'Tổng tiền không hợp lệ'
      discountMessage.className = 'text-danger d-block mt-1'
      return
    }

    try {
      const response = await fetch('/api/coupon/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ code, totalAmount })
      })

      const data = await response.json()

      if (!response.ok) {
        discountMessage.textContent = data.message || 'Mã giảm giá không hợp lệ'
        discountMessage.className = 'text-danger d-block mt-1'
        return
      }

      const discountAmount = data.data.discountAmount || 0
      const couponId = data.data.couponId || null
      discountInput.value = discountAmount
      window.appliedCouponId = data.data.couponId
      localStorage.setItem(`appliedCouponId_${orderId}`, window.appliedCouponId)
      localStorage.setItem(`appliedCouponCode_${orderId}`, code)
      await ajax(
        `/api/orders/${orderId}/update-draft`,
        { discount: discountAmount, couponId },
        'POST'
      )

      // Đổi nút sang trạng thái "Xóa"
      applyDiscountBtn.textContent = 'X'
      applyDiscountBtn.classList.remove('btn-primary')
      applyDiscountBtn.classList.add('btn-danger')
      applyDiscountBtn.dataset.state = 'applied'
      codeInput.disabled = true
      discountMessage.className = 'text-danger d-none mt-1'

      discountInputWrapper.classList.remove('d-none')
      calculateTotals()
    } catch (error) {
      discountMessage.textContent = 'Lỗi khi áp dụng mã giảm giá'
      discountMessage.className = 'text-danger d-block mt-1'
      console.error(error)
    }
  })
}

// Xử lý xác nhận thanh toán
function initCheckoutConfirm() {
  const confirmCheckoutBtn = document.getElementById('confirmCheckoutBtn')
  if (!confirmCheckoutBtn) return

  confirmCheckoutBtn.addEventListener('click', async () => {
    const orderId = window.currentOrderId
    if (!orderId) {
      toastr.error('Không xác định được đơn hàng hiện tại!')
      return
    }

    // Lấy dữ liệu từ form
    const discountInput = document.getElementById('discountInput')
    const pointsInput = document.getElementById('pointsInput')
    const serviceChargeInput = document.getElementById('serviceChargeInput')
    const extraDiscountInput = document.getElementById('extraDiscountInput')
    const vatInput = document.getElementById('vatInput')
    const paymentMethodValueEl = document.getElementById('paymentMethodValue')
    const customerPaidInput = document.getElementById('customerPaidInput')

    if (
      !discountInput ||
      !pointsInput ||
      !serviceChargeInput ||
      !extraDiscountInput ||
      !vatInput ||
      !paymentMethodValueEl ||
      !customerPaidInput
    ) {
      toastr.error('Thiếu dữ liệu thanh toán!')
      return
    }

    const discount = parseCurrency(discountInput.value)
    const pointsUsed = parseInt(pointsInput.value) || 0
    const serviceCharge = parseCurrency(serviceChargeInput.value)
    const extraDiscount = parseCurrency(extraDiscountInput.value)
    const vatRate = Number(vatInput.value) || 0
    const paymentMethod = paymentMethodValueEl.value
    const customerPaid = parseCurrency(customerPaidInput.value)

    if (!paymentMethod) {
      toastr.warning('Vui lòng chọn phương thức thanh toán!')
      return
    }

    if (customerPaid < 0) {
      toastr.warning('Số tiền khách trả không hợp lệ!')
      return
    }

    // Lấy giá trị radio In hóa đơn
    const printInvoice = document.querySelector('input[name="printInvoice"]:checked')?.value || 'no'
    const appliedCouponId = window.appliedCouponId

    try {
      const response = await fetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          discount,
          pointsUsed,
          serviceCharge,
          extraDiscount,
          vatRate,
          paymentMethodId: paymentMethod,
          customerPaid,
          couponId: appliedCouponId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toastr.error(data.message || 'Thanh toán thất bại!')
        return
      }

      toastr.remove()
      toastr.success('Thanh toán thành công!')

      // XÓA appliedCouponId SAU KHI THÀNH CÔNG
      window.appliedCouponId = null

      document.getElementById('checkoutDetail').classList.add = 'd-none'
      fetchEmptyOrders()

      if (printInvoice === 'yes') {
        window.open(`/orders/print/${orderId}`, '_blank')
      }

      setTimeout(() => {
        window.location.href = '/orders'
      }, 2000)
    } catch (error) {
      toastr.error('Lỗi hệ thống, vui lòng thử lại sau!')
      console.error(error)
    }
  })
}

// MAIN CLICK EVENT HANDLER
document.addEventListener('click', async (e) => {
  // Xử lý click gợi ý tiền mặt (bao gồm cả dynamic suggestions)
  if (e.target.classList.contains('cash-suggestion')) {
    const value = parseInt(e.target.dataset.value, 10)
    const input = document.getElementById('customerPaidInput')
    if (input) {
      input.value = value.toLocaleString()
      input.dispatchEvent(new Event('input'))

      calculateTotals()

      const orderId = window.currentOrderId
      if (!orderId) {
        toastr.error('Không xác định được đơn hàng!')
        return
      }

      const data = getCurrentOrderFormData()

      try {
        const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
        if (result) {
          toastr.remove()
          toastr.success('Cập nhật số tiền khách trả thành công!')
        }
      } catch (error) {
        console.error(error.message || 'Có lỗi khi cập nhật số tiền khách trả.')
      }
    }
    return
  }

  // Xử lý chọn phương thức thanh toán
  const paymentBtn = e.target.closest('#paymentMethod button')
  if (paymentBtn) {
    document.querySelectorAll('#paymentMethod button').forEach((b) => b.classList.remove('active'))
    paymentBtn.classList.add('active')

    const paymentMethodValue = document.getElementById('paymentMethodValue')
    if (paymentMethodValue) {
      paymentMethodValue.value = paymentBtn.dataset.value
    }

    const orderId = window.currentOrderId
    if (!orderId) {
      toastr.error('Không xác định được đơn hàng!')
      return
    }

    const data = getCurrentOrderFormData()

    try {
      const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
      if (result) {
        toastr.remove()
        toastr.success('Thay đổi phương thức thanh toán thành công!')
      }
    } catch (error) {
      console.error(error.message || 'Có lỗi khi thay đổi phương thức thanh toán')
    }
  }
})

async function loadOrderData(orderId) {
  try {
    const result = await ajax(`/api/orders/${orderId}`, {}, 'GET')

    if (result) {
      document.getElementById('discountInput').value =
        result.discount.toLocaleString('vi-VN') || '0'
      document.getElementById('pointsInput').value = result.pointsUsed || '0'
      document.getElementById('serviceChargeInput').value =
        result.serviceCharge.toLocaleString('vi-VN') || '0'
      document.getElementById('extraDiscountInput').value = Number(
        result?.extraDiscount ?? 0
      ).toLocaleString('vi-VN')
      document.getElementById('vatInput').value = result.vatRate || '0'
      document.getElementById('customerPaidInput').value =
        result.customerPaid.toLocaleString('vi-VN') || '0'
      const method = result.paymentMethodId
      const methodId =
        method && typeof method === 'object' ? method._id : typeof method === 'string' ? method : ''

      document.getElementById('paymentMethodValue').value = methodId

      if (methodId) {
        const buttons = document.querySelectorAll('#paymentMethod button')
        buttons.forEach((btn) => {
          if (btn.dataset.value === methodId) {
            btn.classList.add('active')
          } else {
            btn.classList.remove('active')
          }
        })
      }

      window.appliedCouponId = result.couponId || localStorage.getItem('appliedCouponId') || null

      if (window.appliedCouponId) {
        localStorage.setItem('appliedCouponId', window.appliedCouponId)
      } else {
        localStorage.removeItem('appliedCouponId')
      }

      calculateTotals()
    }
  } catch (error) {
    console.error('Lỗi khi load dữ liệu đơn hàng:', error)
  }
}

async function loadPointSetting() {
  try {
    const result = await ajax('/api/setting/point', {}, 'GET')
    if (result) {
      POINT_VALUE = result.pointValue
    }
  } catch (error) {
    console.error(error.message)
  }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  // 1. LOAD DỮ LIỆU BAN ĐẦU
  await getTaxes()
  await fillPaymentMethods()
  await loadPointSetting()

  // Render UI
  renderTaxOptions()

  // Load dữ liệu đơn hàng nếu có orderId
  if (window.currentOrderId) {
    await loadOrderData(window.currentOrderId)
  }

  // Tính toán ban đầu
  calculateTotals()

  // NÚT IN HÓA ĐƠN
  const printBtn = document.getElementById('btn-check-print')
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const orderId = window.currentOrderId

      if (!orderId) {
        toastr.error('Không xác định được đơn hàng hiện tại!')
        return
      }

      window.open(`/orders/print/${orderId}`, '_blank')
    })
  }

  // 3. NÚT CHIẾT KHẤU
  const totalAmountEl = document.getElementById('totalAmount')
  const extraDiscountInput = document.getElementById('extraDiscountInput')
  const discountButtons = document.querySelectorAll('.discount-btn')

  function parseCurrency(value) {
    if (!value) return 0
    const cleaned = value
      .toString()
      .replace(/\./g, '')
      .replace(/[^\d-]/g, '')
    return Number(cleaned) || 0
  }

  discountButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      discountButtons.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')

      const percent = Number(btn.getAttribute('data-percent'))
      const totalAmount = parseCurrency(totalAmountEl.textContent)

      const discountAmount = Math.round(totalAmount * (percent / 100))

      extraDiscountInput.value = discountAmount.toLocaleString('vi-VN')

      calculateTotals()
      extraDiscountInput.dispatchEvent(new Event('change'))
    })
  })

  // 4. KHỞI TẠO CÁC FORM
  initCustomerPaidInput()
  initPointsInput()
  initDiscountCode()
  initCheckoutConfirm()

  // INPUT LISTENERS
  const discountInput = document.getElementById('discountInput')
  const serviceChargeInput = document.getElementById('serviceChargeInput')
  const vatInput = document.getElementById('vatInput')

  if (discountInput) {
    discountInput.addEventListener('input', calculateTotals)
  }

  if (serviceChargeInput) {
    serviceChargeInput.addEventListener('input', calculateTotals)
  }

  if (extraDiscountInput) {
    extraDiscountInput.addEventListener('input', calculateTotals)
  }

  // Change event (gọi API update)
  if (serviceChargeInput) {
    serviceChargeInput.addEventListener('change', async () => {
      let val = serviceChargeInput.value.replace(/[^\d]/g, '')
      if (val === '') val = '0'

      const orderId = window.currentOrderId
      if (!orderId) {
        toastr.error('Không xác định được đơn hàng!')
        return
      }

      const data = getCurrentOrderFormData()

      try {
        const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
        if (result) {
          toastr.success('Cập nhật phí dịch vụ thành công!')
        }
      } catch (error) {
        console.error('Lỗi khi gọi API:', error)
        toastr.error('Lỗi mạng hoặc server')
      }
    })
  }

  if (extraDiscountInput) {
    extraDiscountInput.addEventListener('change', async () => {
      let val = extraDiscountInput.value.replace(/[^\d]/g, '')
      if (val === '') val = '0'

      const orderId = window.currentOrderId
      if (!orderId) {
        toastr.error('Không xác định được đơn hàng!')
        return
      }

      const data = getCurrentOrderFormData()

      try {
        const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
        if (result) {
          toastr.success('Cập nhật chiết khấu thành công!')
        }
      } catch (error) {
        console.error('Lỗi khi gọi API:', error)
        toastr.error('Lỗi mạng hoặc server')
      }
    })
  }

  if (vatInput) {
    vatInput.addEventListener('change', async () => {
      calculateTotals()

      const orderId = window.currentOrderId
      if (!orderId) {
        toastr.error('Không xác định được đơn hàng!')
        return
      }

      const data = getCurrentOrderFormData()

      try {
        const result = await ajax(`/api/orders/${orderId}/update-draft`, data, 'POST')
        if (result) {
          toastr.success('Cập nhật VAT thành công!')
        }
      } catch (error) {
        console.error('Lỗi khi gọi API:', error)
        toastr.error('Lỗi mạng hoặc server')
      }
    })
  }
})
