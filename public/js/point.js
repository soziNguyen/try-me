document.addEventListener('DOMContentLoaded', async () => {
  const pointInput = document.getElementById('pointValue')
  const earnRateInput = document.getElementById('pointsEarnRate')

  try {
    const result = await ajax('/api/setting/point', {}, 'GET')

    if (result) {
      pointInput.value = result.pointValue || 500
      earnRateInput.value = result.pointsEarnRate || 10000
    }
  } catch (error) {
    console.error(error.message)
  }

  editPointSetting()
})

function editPointSetting() {
  const form = document.getElementById('pointsSettingsForm')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const pointValue = Number(document.getElementById('pointValue').value)
    const pointsEarnRate = Number(document.getElementById('pointsEarnRate').value)

    if (!pointValue || !pointsEarnRate) {
      toastr.error('Vui lòng nhập đầy đủ thông tin')
      return
    }

    try {
      const result = await ajax('/api/setting/point', { pointValue, pointsEarnRate }, 'POST')
      if (result) {
        toastr.remove()
        toastr.success('Thay đổi cài đặt thành công')
      }
    } catch (error) {
      console.error(error.message)
      toastr.error('Có lỗi xảy ra, vui lòng thử lại')
    }
  })
}
