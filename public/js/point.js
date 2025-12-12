const pointInput = document.getElementById('pointValue')
const earnRateInput = document.getElementById('pointsEarnRate')
const exampleText = document.getElementById('pointsExample')
const submitBtn = document.querySelector('#pointsSettingsForm button[type="submit"]')

document.addEventListener('DOMContentLoaded', async () => {
  let initialValues = {}

  await getPointSettings()

  // Kiểm tra thay đổi và enable/disable nút
  function checkChanges() {
    const hasChanges =
      pointInput.value !== initialValues.pointValue ||
      earnRateInput.value !== initialValues.pointsEarnRate
    submitBtn.disabled = !hasChanges
  }

  // Disable nút khi vừa load
  submitBtn.disabled = true

  // Cập nhật ví dụ và kiểm tra thay đổi khi nhập
  pointInput.addEventListener('input', () => {
    updateExample()
    checkChanges()
  })
  earnRateInput.addEventListener('input', () => {
    updateExample()
    checkChanges()
  })

  // Hàm cập nhật mô phỏng
  function updateExample() {
    const pointValue = Number(pointInput.value) || 500
    const earnRate = Number(earnRateInput.value) || 10000

    // Tự động tính số tiền ví dụ phù hợp
    const exampleSpending = earnRate * 5

    const pointsEarned = Math.floor(exampleSpending / earnRate)
    const discount = pointsEarned * pointValue

    exampleText.textContent = `Khách chi tiêu ${exampleSpending.toLocaleString('vi-VN')}đ → nhận ${pointsEarned} điểm → giảm ${discount.toLocaleString('vi-VN')}đ khi dùng điểm`
  }

  editPointSetting()
})

function editPointSetting() {
  const form = document.getElementById('pointsSettingsForm')
  const submitBtn = form.querySelector('button[type="submit"]')
  const pointInput = document.getElementById('pointValue')
  const earnRateInput = document.getElementById('pointsEarnRate')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const pointValue = Number(pointInput.value)
    const pointsEarnRate = Number(earnRateInput.value)

    if (!pointValue || !pointsEarnRate) {
      toastr.error('Vui lòng nhập đầy đủ thông tin')
      return
    }

    if (pointValue < 1 || pointsEarnRate < 1) {
      toastr.error('Giá trị phải lớn hơn 0')
      return
    }

    // Disable nút submit
    submitBtn.disabled = true

    try {
      const result = await ajax('/api/setting/point', { pointValue, pointsEarnRate }, 'POST')
      if (result) {
        toastr.remove()
        toastr.success('Thay đổi cài đặt thành công')

        // Cập nhật giá trị ban đầu sau khi lưu thành công
        initialValues = {
          pointValue: pointInput.value,
          pointsEarnRate: earnRateInput.value
        }
        getPointSettings()
      }
    } catch (error) {
      console.error(error.message)
      toastr.error('Có lỗi xảy ra, vui lòng thử lại')
      // Enable lại nếu có lỗi
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  })
}

async function getPointSettings() {
  try {
    const result = await ajax('/api/setting/point', {}, 'GET')

    if (result) {
      pointInput.value = result.pointValue || 500
      earnRateInput.value = result.pointsEarnRate || 10000
      initialValues = {
        pointValue: pointInput.value,
        pointsEarnRate: earnRateInput.value
      }
    }
  } catch (error) {
    console.error(error.message)
  }
}
