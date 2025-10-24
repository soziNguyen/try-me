document.addEventListener('DOMContentLoaded', async () => {
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
    const price = mode === 'year' ? plan.priceYear : plan.priceMonth

    // Hiển thị thông tin gói
    document.getElementById('planName').textContent = plan.name || 'Không xác định'
    document.getElementById('planDesc').textContent = plan.description || ''
    document.getElementById('planMode').textContent = mode === 'year' ? 'Theo năm' : 'Theo tháng'

    // Giá gốc
    document.getElementById('planPrice').textContent = `${price.toLocaleString()} ₫`

    // Cập nhật giá mặc định
    updatePriceDisplay(price, 0, price, Math.round(price * 0.08), Math.round(price * 1.08))

    // Biến tạm để lưu couponCode đang áp dụng
    let appliedCouponCode = null

    // Xác nhận đăng ký
    document.getElementById('confirmBtn').addEventListener('click', async () => {
      try {
        const body = { planId, mode }
        if (appliedCouponCode) body.couponCode = appliedCouponCode // Gửi kèm coupon nếu có

        const res = await ajax('/api/admin/plan/upgrade', body, 'POST')
        if (res) {
          toastr.success('Đăng ký gói thành công!')
          setTimeout(() => (window.location.href = '/upgrade'), 1500)
        }
      } catch (error) {
        toastr.error(error.message || 'Không thể đăng ký gói.')
      }
    })

    // Áp dụng / hủy mã giảm giá
    const couponForm = document.getElementById('couponForm')
    const applyBtn = couponForm.querySelector('.btn-apply-coupon')

    couponForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const codeInput = document.getElementById('planDiscountCode')

      // Nếu đang ở trạng thái "X" => reset
      if (applyBtn.dataset.applied === 'true') {
        appliedCouponCode = null // reset coupon
        codeInput.disabled = false
        codeInput.value = ''
        applyBtn.textContent = 'Áp dụng'
        applyBtn.classList.remove('btn-danger')
        applyBtn.classList.add('btn-primary')
        applyBtn.dataset.applied = 'false'
        updatePriceDisplay(price, 0, price, Math.round(price * 0.08), Math.round(price * 1.08))
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
          totalAmount: price,
          planId: plan._id
        })

        if (res) {
          updatePriceDisplay(
            price,
            res.discountAmount,
            res.subtotalAfterDiscount,
            res.vatAmount,
            res.totalAfterVAT
          )

          appliedCouponCode = code // ✅ lưu lại mã đã áp dụng
          applyBtn.textContent = 'X'
          applyBtn.classList.remove('btn-primary')
          applyBtn.classList.add('btn-danger')
          applyBtn.dataset.applied = 'true'
          codeInput.disabled = true
          toastr.success(`Áp dụng mã giảm giá thành công!`)
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
 * @param {number} price Giá gốc
 * @param {number} discount Số tiền giảm
 * @param {number} subtotal Tiền sau giảm, trước VAT
 * @param {number} vat VAT
 * @param {number} total Tổng tiền cuối cùng
 */
function updatePriceDisplay(price, discount, subtotal, vat, total) {
  document.getElementById('planDiscountPrice').textContent = discount
    ? `- ${discount.toLocaleString()} ₫`
    : ''
  document.getElementById('planTotalPriceBeforeVAT').textContent = `${subtotal.toLocaleString()} ₫`
  document.getElementById('planVAT').textContent = ` + ${vat.toLocaleString()} ₫`
  document.getElementById('planTotalPrice').textContent = `${total.toLocaleString()} ₫`
}
