document.addEventListener('DOMContentLoaded', async () => {
  await loadPaymentMethods()
  const urlParams = new URLSearchParams(window.location.search)
  const planId = window.location.pathname.split('/').pop()
  const mode = urlParams.get('mode') || 'month'
  await fillPlanInfoAndSetupConfirm(planId, mode)
})

async function fillPlanInfoAndSetupConfirm(planId, mode) {
  if (!planId) {
    toastr.error('Thiếu thông tin gói. Vui lòng quay lại trang trước.')
    return
  }

  try {
    const result = await ajax(`/api/admin/plan/${planId}`, {}, 'GET')
    const plan = result || {}
    const basePrice = mode === 'year' ? plan.priceYear : plan.priceMonth

    // Hiển thị thông tin gói
    document.getElementById('planName').textContent = plan.name || 'Không xác định'
    document.getElementById('planDesc').textContent = plan.description || ''
    document.getElementById('planPrice').textContent = `${basePrice.toLocaleString()} đ`

    // Select thời hạn
    const planDurationSelect = document.getElementById('planDuration')
    planDurationSelect.innerHTML = '' // reset options

    const durations = mode === 'month' ? [1, 3, 6] : [1, 2, 3]
    durations.forEach((d) => {
      const option = document.createElement('option')
      option.value = d
      option.textContent = mode === 'month' ? `${d} tháng` : `${d} năm`
      planDurationSelect.appendChild(option)
    })

    let appliedCouponCode = null

    // Hàm tính và hiển thị giá
    const calculateAndDisplayPrice = (priceData = null) => {
      const duration = parseInt(planDurationSelect.value)
      let subtotal = basePrice * duration
      let vat = Math.round(subtotal * 0.1)
      let total = subtotal + vat
      let discount = 0

      if (priceData) {
        discount = priceData.discountAmount
        subtotal = priceData.subtotalAfterDiscount
        vat = priceData.vatAmount
        total = priceData.totalAfterVAT
      }

      updatePriceDisplay(basePrice * duration, discount, subtotal, vat, total)
    }

    // Hiển thị ban đầu
    planDurationSelect.value = durations[0]
    calculateAndDisplayPrice()

    // Khi đổi duration
    planDurationSelect.addEventListener('change', async () => {
      const duration = parseInt(planDurationSelect.value)

      if (appliedCouponCode) {
        try {
          const res = await ajax('/api/admin/coupon/apply', {
            code: appliedCouponCode,
            totalAmount: basePrice * duration,
            planId: plan._id
          })
          window.lastCouponResult = res
          calculateAndDisplayPrice(res)
        } catch (err) {
          toastr.error('Lỗi khi áp dụng lại mã giảm giá')
          appliedCouponCode = null
          window.lastCouponResult = null
          calculateAndDisplayPrice()
        }
      } else {
        calculateAndDisplayPrice()
      }
    })

    // Xác nhận đăng ký
    document.getElementById('confirmBtn').addEventListener('click', async (e) => {
      const selectedBtn = document.querySelector('#paymentMethods button.active')
      if (!selectedBtn) {
        toastr.warning('Vui lòng chọn phương thức thanh toán')
        return
      }

      let message = ''
      if (selectedBtn.dataset.code === 'internal_wallet') {
        message =
          'Bạn sắp thanh toán <strong>bằng Ví nội bộ</strong>.<br>' +
          'Số tiền sẽ được <strong>trừ trực tiếp</strong> và <strong>không thể hoàn lại</strong>.<br><br>' +
          'Bạn có chắc chắn muốn tiếp tục?'
      } else {
        message = 'Bạn có chắc chắn muốn gửi yêu cầu nâng cấp gói này?'
      }

      showConfirmModal({
        title: 'Xác nhận',
        okBtnColor: 'danger',
        message,
        confirmed: 'Đồng ý',
        onConfirm: async () => {
          try {
            const body = {
              planId,
              mode,
              duration: parseInt(planDurationSelect.value),
              paymentMethodId: selectedBtn.dataset.id
            }
            if (appliedCouponCode) body.couponCode = appliedCouponCode

            const res = await ajax('/api/admin/plan/upgrade', body, 'POST')

            if (res && res.transactionId) {
              toastr.success('Đăng ký thành công! Đang chuyển đến hóa đơn...')
              setTimeout(() => {
                window.location.href = `/checkout/${res.transactionId}/invoice`
              }, 1500)
            }
          } catch (error) {
            toastr.error(error.message || 'Không thể đăng ký gói.')
          }
        }
      })
    })

    // Áp dụng / hủy mã giảm giá
    const couponForm = document.getElementById('couponForm')
    const applyBtn = couponForm.querySelector('.btn-apply-coupon')
    const codeInput = document.getElementById('planDiscountCode')

    couponForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      if (applyBtn.dataset.applied === 'true') {
        appliedCouponCode = null
        window.lastCouponResult = null
        codeInput.disabled = false
        codeInput.value = ''
        applyBtn.textContent = 'Áp dụng'
        applyBtn.classList.remove('btn-danger')
        applyBtn.classList.add('btn-primary')
        applyBtn.dataset.applied = 'false'
        calculateAndDisplayPrice()
        return
      }

      const code = codeInput.value.trim()
      if (!code) {
        toastr.remove()
        toastr.warning('Vui lòng nhập mã giảm giá.')
        return
      }

      try {
        const res = await ajax('/api/admin/coupon/apply', {
          code,
          totalAmount: basePrice * parseInt(planDurationSelect.value),
          planId: plan._id
        })

        if (res) {
          appliedCouponCode = code
          window.lastCouponResult = res
          applyBtn.textContent = 'X'
          applyBtn.classList.remove('btn-primary')
          applyBtn.classList.add('btn-danger')
          applyBtn.dataset.applied = 'true'
          codeInput.disabled = true
          calculateAndDisplayPrice(res)
          toastr.success('Áp dụng mã giảm giá thành công!')
        }
      } catch (err) {
        toastr.error(err.message || 'Lỗi khi áp dụng mã giảm giá')
      }
    })
  } catch (error) {
    toastr.error('Không thể tải thông tin gói.')
  }
}

/**
 * Cập nhật hiển thị giá
 */
function updatePriceDisplay(price, discount, subtotal, vat, total) {
  document.getElementById('planDiscountPrice').textContent = discount
    ? `- ${discount.toLocaleString()} ₫`
    : ''
  document.getElementById('planTotalPriceBeforeVAT').textContent = `${subtotal.toLocaleString()} ₫`
  document.getElementById('planVAT').textContent = ` + ${vat.toLocaleString()} ₫`
  document.getElementById('planTotalPrice').textContent = `${total.toLocaleString()} ₫`
}

async function loadPaymentMethods() {
  try {
    const [methods, walletRes] = await Promise.all([
      ajax('/api/admin/payment-method/active', {}, 'GET'),
      ajax('/api/wallet', {}, 'GET')
    ])

    const container = document.getElementById('paymentMethods')
    container.innerHTML = ''

    // render các phương thức thanh toán
    methods.forEach((pm) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn btn-outline-primary d-flex align-items-center'
      btn.dataset.code = pm.code
      btn.dataset.id = pm._id

      const icon = document.createElement('i')
      icon.className = pm.icon ? pm.icon + ' me-2' : 'bi bi-credit-card me-2'
      btn.appendChild(icon)
      btn.appendChild(document.createTextNode(pm.name))

      btn.addEventListener('click', () => {
        container.querySelectorAll('button').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        btn.dataset.selected = 'true'
      })

      container.appendChild(btn)
    })

    // render ví nội bộ
    if (walletRes.wallet) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn btn-outline-success d-flex align-items-center'
      btn.dataset.code = 'internal_wallet'
      btn.dataset.id = walletRes.wallet._id

      const icon = document.createElement('i')
      icon.className = 'bi bi-wallet-fill me-2'
      btn.appendChild(icon)
      btn.appendChild(document.createTextNode(`Ví nội bộ`))

      btn.addEventListener('click', () => {
        container.querySelectorAll('button').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        btn.dataset.selected = 'true'
      })

      container.appendChild(btn)
    }

    // mặc định chọn cái đầu tiên
    const firstBtn = container.querySelector('button')
    if (firstBtn) {
      firstBtn.classList.add('active')
      firstBtn.dataset.selected = 'true'
    }
  } catch (err) {
    console.error(err)
  }
}
