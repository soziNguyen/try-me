document.addEventListener('DOMContentLoaded', async function () {
  const couponId = window.location.pathname.split('/').pop()
  await loadDiscountTypeOptions()
  await loadPlanOptions()
  if (couponId) await fillCoupon(couponId)
})

async function loadDiscountTypeOptions() {
  const select = document.getElementById('discountType')
  const options = [
    { value: 'percent', text: 'Phần trăm' },
    { value: 'amount', text: 'Tiền cố định' }
  ]
  select.innerHTML = options
    .map((opt) => `<option value="${opt.value}">${opt.text}</option>`)
    .join('')
}

async function loadPlanOptions() {
  const select = document.getElementById('applicablePlans')
  const result = await ajax('/api/admin/plan/active', {}, 'GET')
  const plans = result || []

  select.innerHTML = `
    <option value="__all__">Áp dụng cho tất cả</option>
    ${plans.map((p) => `<option value="${p._id}">${p.name}</option>`).join('')}
  `
}

async function fillCoupon(couponId) {
  try {
    const result = await ajax(`/api/admin/coupon/${couponId}`, {}, 'GET')
    const coupon = result || {}

    document.getElementById('couponId').value = coupon._id || ''
    document.getElementById('code').value = coupon.code || ''
    document.getElementById('discountType').value = coupon.discountType || ''
    document.getElementById('discountValue').value = coupon.discountValue || ''
    document.getElementById('description').value = coupon.description || ''
    document.getElementById('usageLimit').value = coupon.usageLimit || ''
    document.getElementById('usedCount').value = coupon.usedCount || 0
    document.getElementById('isActive').checked = !!coupon.isActive

    // Format date (YYYY-MM-DD)
    if (coupon.startDate)
      document.getElementById('startDate').value = new Date(coupon.startDate)
        .toISOString()
        .split('T')[0]

    if (coupon.endDate)
      document.getElementById('endDate').value = new Date(coupon.endDate)
        .toISOString()
        .split('T')[0]

    // Gán multiple select applicablePlans
    const planSelect = document.getElementById('applicablePlans')
    const selectedPlans = coupon.applicablePlans?.length
      ? coupon.applicablePlans.map((p) => (typeof p === 'object' ? p._id : p))
      : ['__all__']

    Array.from(planSelect.options).forEach((opt) => {
      opt.selected = selectedPlans.includes(opt.value)
    })
  } catch (error) {
    console.error(error)
    toastr.error('Không thể tải thông tin mã giảm giá.')
  }
}

document.getElementById('couponForm').addEventListener('submit', async function (e) {
  e.preventDefault()
  await submitCouponForm()
})

async function submitCouponForm() {
  try {
    const form = document.getElementById('couponForm')
    const couponId = document.getElementById('couponId').value

    // Lấy dữ liệu từ form
    let data = {
      code: form.code.value.trim(),
      discountType: form.discountType.value || null,
      discountValue: parseFloat(form.discountValue.value) || 0,
      description: form.description.value.trim(),
      applicablePlans: Array.from(form.applicablePlans.selectedOptions).map((opt) => opt.value),
      startDate: form.startDate.value ? new Date(form.startDate.value) : null,
      endDate: form.endDate.value ? new Date(form.endDate.value) : null,
      usageLimit: form.usageLimit.value ? parseInt(form.usageLimit.value) : null,
      isActive: form.isActive.checked
    }

    let selected = Array.from(form.applicablePlans.selectedOptions).map((opt) => opt.value)
    if (selected.includes('__all__')) {
      selected = []
    }
    data.applicablePlans = selected

    const result = await ajax(`/api/admin/coupon/update/${couponId}`, data)

    if (result) {
      toastr.success('Lưu mã giảm giá thành công!')
    }
  } catch (error) {
    toastr.error('Có lỗi xảy ra khi lưu mã giảm giá.')
  }
}
