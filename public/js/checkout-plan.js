document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const planCode = urlParams.get('plan')
  const mode = urlParams.get('mode') || 'month'

  if (!planCode) {
    toastr.error('Thiếu thông tin gói. Vui lòng quay lại trang trước.')
    return
  }

  try {
    // Gọi API lấy thông tin gói
    const result = await ajax(`/api/admin/plan/code/${planCode}`, {}, 'GET')
    const plan = result || {}

    // Hiển thị thông tin gói
    document.getElementById('planName').textContent = plan.name || 'Không xác định'
    document.getElementById('planDesc').textContent = plan.description || ''
    document.getElementById('planMode').textContent = mode === 'year' ? 'Theo năm' : 'Theo tháng'

    const price =
      mode === 'year' ? plan.priceYear?.toLocaleString() : plan.priceMonth?.toLocaleString()
    document.getElementById('planPrice').textContent = `${price} ₫`

    // Gắn event cho nút xác nhận
    document.getElementById('confirmBtn').addEventListener('click', async () => {
      try {
        const res = await ajax('/api/admin/plan/upgrade', { planCode, mode })

        if (res) {
          toastr.success('Đăng ký gói thành công!')
          setTimeout(() => (window.location.href = '/upgrade'), 1500)
        } else {
          toastr.error(res?.message || 'Có lỗi xảy ra.')
        }
      } catch (error) {
        toastr.error(error.message || 'Không thể đăng ký gói.')
      }
    })
  } catch (error) {
    toastr.error('Không thể tải thông tin gói.')
  }
})
