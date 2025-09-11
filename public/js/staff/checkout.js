// ========== XỬ LÝ SỰ KIỆN CLICK ==========

document.addEventListener('click', (e) => {
  const checkoutBtn = e.target.closest('#checkoutBtn')

  // Mở/ẩn chi tiết thanh toán và xử lý gợi ý tiền mặt
  if (checkoutBtn) {
    const checkoutDetail = document.getElementById('checkoutDetail')
    if (!checkoutDetail) return
    const tbody = document.getElementById('orderItems')
    if (!tbody || tbody.children.length === 0) {
      toastr.warning('Chưa có món nào trong hóa đơn!')
      return
    }

    checkoutDetail.style.display = 'block'
    checkoutDetail.scrollIntoView({ behavior: 'smooth' })

    syncCheckoutDetailTotal()
  }

  // Click nút gợi ý tiền mặt
  if (e.target.classList.contains('cash-suggestion')) {
    const value = parseInt(e.target.dataset.value, 10)
    const input = document.getElementById('customerPaidInput')
    if (input) {
      input.value = value.toLocaleString()
      input.dispatchEvent(new Event('input'))
    }
  }

  // Click nút hủy
  if (e.target.id === 'cancelCheckoutDetail') {
    document.getElementById('checkoutDetail').style.display = 'none'
  }

  const paymentBtn = e.target.closest('#paymentMethod button')
  if (paymentBtn) {
    document
      .querySelectorAll('#paymentMethod button')
      .forEach((b) => b.classList.remove('active'))
    paymentBtn.classList.add('active')
    document.getElementById('paymentMethodValue').value =
      paymentBtn.getAttribute('data-value')
    return
  }
})

// ========== SỰ KIỆN NHẬP TIỀN KHÁCH ĐÃ TRẢ ==========
const customerPaidInput = document.getElementById('customerPaidInput')
if (customerPaidInput) {
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
}

// ========== HỖ TRỢ GỢI Ý TIỀN MẶT ==========
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
      1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 100000,
      150000, 200000, 250000, 300000, 400000, 500000, 1000000, 1500000, 2000000,
      2500000, 3000000, 4000000, 5000000, 10000000, 15000000, 20000000,
      25000000, 30000000, 40000000, 50000000
    ]

    for (let amt of standardAmounts) {
      if (
        amt.toString().startsWith(rawValueStr) &&
        amt >= 1000 &&
        amt <= maxValue
      ) {
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

// ========== TÍNH TOÁN ==========

function parseCurrency(value) {
  if (!value) return 0
  return Number(value.toString().replace(/[^\d]/g, '')) || 0
}

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
  const serviceChargeInput = document.getElementById('serviceChargeInput')
  const vatInput = document.getElementById('vatInput')
  const totalPayableEl = document.getElementById('totalPayable')
  const totalEl = document.getElementById('total')

  if (
    !totalAmountEl ||
    !discountInput ||
    !serviceChargeInput ||
    !vatInput ||
    !totalPayableEl ||
    !totalEl
  )
    return

  const totalAmount = parseCurrency(totalAmountEl.textContent)
  const discount = parseCurrency(discountInput.value)
  const serviceCharge = parseCurrency(serviceChargeInput.value)
  const vatRate = Number(vatInput.value) || 0

  const totalPayable = totalAmount - discount + serviceCharge
  const totalWithVAT = Math.round(totalPayable + (totalPayable * vatRate) / 100)

  totalPayableEl.value = totalPayable.toLocaleString('vi-VN')
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

// ========== VAT ==========

let taxes = []

document.addEventListener('DOMContentLoaded', async () => {
  await getTaxes()
  renderTaxOptions()

  calculateTotals()

  document
    .getElementById('discountInput')
    ?.addEventListener('input', calculateTotals)
  document
    .getElementById('serviceChargeInput')
    ?.addEventListener('input', calculateTotals)
  document
    .getElementById('vatInput')
    ?.addEventListener('change', calculateTotals)
})

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

// ========== ÁP MÃ GIẢM GIÁ ==========

document
  .getElementById('applyDiscountBtn')
  .addEventListener('click', async () => {
    const codeInput = document.getElementById('discountCodeInput')
    const discountInput = document.getElementById('discountInput')
    const discountMessage = document.getElementById('discountMessage')
    const totalAmountEl = document.getElementById('totalAmount')

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, totalAmount })
      })

      const data = await response.json()

      if (!response.ok) {
        discountMessage.textContent = data.message || 'Mã giảm giá không hợp lệ'
        discountMessage.className = 'text-danger d-block mt-1'
        return
      }

      const discountAmount = data.data.discountAmount || 0
      discountInput.value = discountAmount.toLocaleString()
      discountMessage.textContent = `Áp dụng thành công! Giảm ${discountAmount.toLocaleString()}đ`
      discountMessage.className = 'text-success d-block mt-1'

      window.appliedCouponId = data.data.couponId
      calculateTotals()
    } catch (error) {
      discountMessage.textContent = 'Lỗi khi áp dụng mã giảm giá'
      discountMessage.className = 'text-danger d-block mt-1'
      console.error(error)
    }
  })

function calculateTotalAmount(items) {
  let total = 0
  for (const item of items) {
    const price = item.price || 0
    const quantity = item.quantity || 0
    total += price * quantity
  }
  return total
}

// ========== XÁC NHẬN THANH TOÁN ==========
document
  .getElementById('confirmCheckoutBtn')
  .addEventListener('click', async () => {
    const orderId = window.currentOrderId
    if (!orderId) {
      toastr.error('Không xác định được đơn hàng hiện tại!')
      return
    }

    const discountInput = document.getElementById('discountInput')
    const serviceChargeInput = document.getElementById('serviceChargeInput')
    const vatInput = document.getElementById('vatInput')
    const paymentMethodValueEl = document.getElementById('paymentMethodValue')
    const customerPaidInput = document.getElementById('customerPaidInput')

    if (
      !discountInput ||
      !serviceChargeInput ||
      !vatInput ||
      !paymentMethodValueEl ||
      !customerPaidInput
    ) {
      toastr.error('Thiếu dữ liệu thanh toán!')
      return
    }

    const discount = parseCurrency(discountInput.value)
    const serviceCharge = parseCurrency(serviceChargeInput.value)
    const vatRate = Number(vatInput.value) || 0
    const paymentMethod = paymentMethodValueEl.value
    const customerPaid = parseCurrency(customerPaidInput.value)

    if (!paymentMethod) {
      toastr.warning('Vui lòng chọn phương thức thanh toán!')
      return
    }

    if (customerPaid <= 0) {
      toastr.warning('Số tiền khách trả không hợp lệ!')
      return
    }

    // Lấy giá trị radio In hóa đơn
    const printInvoice = document.querySelector(
      'input[name="printInvoice"]:checked'
    ).value
    const appliedCouponId = window.appliedCouponId

    try {
      // Nếu có mã giảm giá thì gọi API confirm để tăng lượt sử dụng
      if (appliedCouponId) {
        const confirmResponse = await fetch('/api/coupon/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ couponId: appliedCouponId })
        })
        const confirmData = await confirmResponse.json()
        if (!confirmResponse.ok) {
          toastr.error(confirmData.message || 'Xác nhận mã giảm giá thất bại!')
          return // Dừng thanh toán nếu confirm coupon lỗi
        }
      }

      // Gọi API thanh toán
      const response = await fetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount,
          serviceCharge,
          vatRate,
          paymentMethod,
          customerPaid
        })
      })

      const data = await response.json()
      if (!response.ok) {
        toastr.error(data.message || 'Thanh toán thất bại!')
        return
      }

      toastr.success('Thanh toán thành công!')
      document.getElementById('checkoutDetail').style.display = 'none'

      if (printInvoice === 'yes') {
        window.open(`/orders/print/${orderId}`, '_blank')
        setTimeout(() => {
          window.location.href = `/orders`
        }, 2000)
      } else {
        setTimeout(() => {
          window.location.href = `/orders`
        }, 2000)
      }
    } catch (error) {
      toastr.error('Lỗi hệ thống, vui lòng thử lại sau!')
      console.error(error)
    }
  })
