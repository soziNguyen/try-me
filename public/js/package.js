document.addEventListener('DOMContentLoaded', async function () {
  const orgRes = await ajax('/api/organization/current', {}, 'GET')
  const currentPlanCode = orgRes?.plan?.code || 'FREE'
  let allPlans = []

  // Mặc định hiển thị giá theo tháng
  let currentMode = 'month'

  // Thêm nút switch Liquid Morphing
  const switchContainer = document.querySelector('.price-toggle')
  switchContainer.innerHTML = `
    <div class="toggle-liquid mx-auto my-4">
      <div class="blob"></div>
      <div class="option active" data-mode="month">Tháng</div>
      <div class="option" data-mode="year">Năm</div>
    </div>
  `

  // Lắng nghe sự kiện
  const toggle = document.querySelector('.toggle-liquid')
  const options = toggle.querySelectorAll('.option')
  const blob = toggle.querySelector('.blob')

  // Init blob position
  updateBlob(options[0])

  options.forEach((option) => {
    option.addEventListener('click', () => {
      // Remove active từ tất cả options
      options.forEach((opt) => opt.classList.remove('active'))

      // Thêm active vào option được click
      option.classList.add('active')

      // Cập nhật mode
      currentMode = option.dataset.mode

      // Update blob position
      updateBlob(option)

      // Re-render plans
      fillPlans(currentPlanCode, currentMode)
    })
  })

  function updateBlob(activeOption) {
    const rect = activeOption.getBoundingClientRect()
    const parentRect = toggle.getBoundingClientRect()
    blob.style.width = rect.width + 'px'
    blob.style.height = rect.height + 'px'
    blob.style.left = rect.left - parentRect.left + 'px'
    blob.style.top = rect.top - parentRect.top + 'px'
  }

  // Lần đầu render
  fillPlans(currentPlanCode, currentMode)
})

async function fillPlans(currentPlanCode, mode = 'month') {
  const plans = await ajax('/api/admin/plan/active', {}, 'GET')
  allPlans = plans // Lưu để dùng ở phần submit

  const container = document.querySelector('.package__container')
  container.innerHTML = ''

  const currentPlan = plans.find((p) => p.code === currentPlanCode)

  plans.forEach((plan) => {
    const isCurrent = plan.code === currentPlanCode
    const isLowerLevel = currentPlan && plan.level < currentPlan.level

    const badgeText = isCurrent ? 'Gói hiện tại' : ''
    const badgeClass = isCurrent ? 'bg-danger fst-italic' : 'bg-primary'

    const price =
      mode === 'month' ? plan.priceMonth.toLocaleString() : plan.priceYear.toLocaleString()
    const label = mode === 'month' ? 'đ/ tháng' : 'đ/ năm'

    const planCard = document.createElement('div')
    planCard.classList.add('col-md-4', 'col-lg-3', 'mb-4')

    let features = ''
    if (plan.description && plan.description.trim() !== '') {
      features = plan.description
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map(
          (line) => `
            <li class="d-flex align-items-start mb-1">
              <i class="bi bi-check2 text-success me-2 fs-5"></i>
              <span>${line.trim()}</span>
            </li>`
        )
        .join('')
    } else {
      features = `
        <li class="d-flex align-items-start mb-1">
          <i class="bi bi-check2 text-success me-2 fs-5"></i>
          <span>Giới hạn kho: ${
            plan.warehouseLimit === null ? '<b>Không giới hạn</b>' : `<b>${plan.warehouseLimit}</b>`
          }</span>
        </li>
        <li class="d-flex align-items-start mb-1">
          <i class="bi bi-check2 text-success me-2 fs-5"></i>
          <span>Giới hạn nhân viên: ${
            plan.staffLimit === null ? '<b>Không giới hạn</b>' : `<b>${plan.staffLimit}</b>`
          }</span>
        </li>`
    }

    planCard.innerHTML = `
      <form class="card h-100 rounded-4 shadow-sm position-relative plan-form" 
        data-id=${plan._id} data-code="${plan.code}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title text-center fw-bold mt-4 fs-2">${plan.name}</h5>
          <div class="text-center fs-1 fw-bold text-success mb-2">${price} 
            <span class="fs-6 text-muted">${label}</span></div>
          <div class="my-3 fw-bold fs-5">Tính năng gói</div>

          <ul class="list-unstyled mb-3">${features}</ul>

          <button type="submit" 
            class="btn mt-auto ${
              isCurrent
                ? 'btn-secondary disabled'
                : isLowerLevel
                  ? 'btn-outline-secondary disabled'
                  : 'btn-success'
            }">
            ${isCurrent ? 'Đang sử dụng' : isLowerLevel ? 'Không khả dụng' : 'Nâng cấp'}
          </button>
        </div>
        <span class="badge ${badgeClass} position-absolute top-0 end-0 rounded-4 m-2 py-2 px-3">${badgeText}</span>
      </form>
    `
    container.appendChild(planCard)
  })
}

document.addEventListener('submit', async function (event) {
  if (event.target.classList.contains('plan-form')) {
    event.preventDefault()
    const csrfToken = $('#_csrf').val()

    const form = event.target
    const selectedPlanId = form.dataset.id

    // Lấy mode hiện tại (tháng / năm)
    const activeOption = document.querySelector('.toggle-liquid .option.active')
    const mode = activeOption ? activeOption.dataset.mode : 'month'

    try {
      const res = await fetch('/api/admin/plan/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ planId: selectedPlanId, mode })
      })

      const result = await res.json()
      const data = result.data

      if (data?.redirect) {
        toastr.success(result.message || 'Đang chuyển hướng...')
        setTimeout(() => {
          window.location.href = data.redirect
        }, 1500)
      } else {
        toastr.error('Không xác định được đường dẫn thanh toán')
      }
    } catch (error) {
      toastr.error(error.message || 'Không thể nâng cấp gói')
    }
  }
})
