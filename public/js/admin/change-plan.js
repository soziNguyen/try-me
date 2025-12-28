document.addEventListener('DOMContentLoaded', async function () {
  const organizationId = getOrganizationIdFromUrl()

  await fillPlanToSelect()
  await getCurrentOrganizationPlan(organizationId)

  document.getElementById('newPlanSelect')?.addEventListener('change', handlePlanChange)
  document.getElementById('durationSelect')?.addEventListener('change', handleDurationChange)
  document.getElementById('confirmChangePlan')?.addEventListener('click', submitChangePlan)
})

async function fillPlanToSelect() {
  try {
    const plans = await ajax('/api/admin/plan/active', {}, 'GET')
    const selectElement = document.getElementById('newPlanSelect')
    if (selectElement) {
      plans.forEach((opt) => {
        const op = document.createElement('option')
        op.value = opt._id
        op.textContent = `${opt.name} - ${opt.priceMonth} đ/ tháng`
        op.dataset.level = opt.level
        op.dataset.price = opt.priceMonth

        selectElement.appendChild(op)
      })
    }
  } catch (error) {
    console.error(error)
  }
}

async function getCurrentOrganizationPlan(orgId) {
  try {
    const org = await ajax(`/api/organization/${orgId}`, {}, 'GET')

    const currentPlanName = document.getElementById('currentPlanName')
    const currentPlanExpired = document.getElementById('currentPlanExpired')
    const currentPlanPrice = document.getElementById('currentPlanPrice')
    const currentPlanLevelInput = document.getElementById('currentPlanLevel')
    const currentPlanPriceValueInput = document.getElementById('currentPlanPriceValue')

    if (currentPlanName) currentPlanName.textContent = org.plan.name || ''
    const planExpiredAt =
      org.planExpiredAt === null ? 'Không giới hạn' : formatDate(org.planExpiredAt)
    if (currentPlanExpired) currentPlanExpired.textContent = planExpiredAt
    if (currentPlanPrice) currentPlanPrice.textContent = org.plan.priceMonth.toLocaleString() + ' đ'
    if (currentPlanLevelInput) currentPlanLevelInput.value = org.plan.level
    if (currentPlanPriceValueInput) currentPlanPriceValueInput.value = org.plan.priceMonth
  } catch (error) {
    console.error(error)
  }
}

function getOrganizationIdFromUrl() {
  const url = window.location.pathname.split('/')
  return url[url.length - 2]
}

function handlePlanChange(e) {
  const selected = e.target.options[e.target.selectedIndex]
  if (!selected || !selected.value) return

  const newLevel = Number(selected.dataset.level)
  const newPrice = Number(selected.dataset.price)

  const currentLevel = Number(document.getElementById('currentPlanLevel').value)
  const currentPrice = Number(document.getElementById('currentPlanPriceValue').value)

  if (newLevel === currentLevel) {
    renderSamePlan()
    return
  }

  if (newLevel > currentLevel) {
    renderUpgrade(newPrice)
    return
  }

  if (newLevel < currentLevel) {
    renderDowngrade(currentPrice - newPrice)
  }
}

function renderUpgrade(price) {
  const months = Number(document.getElementById('durationSelect').value)
  const amount = price * months

  document.getElementById('durationBox').classList.remove('d-none')
  document.getElementById('planActionText').textContent = 'Nâng cấp gói'
  document.getElementById('planAmountText').textContent = `Chi phí: ${amount.toLocaleString()} đ`

  setConfirmButton('upgrade', 'btn-primary')
}
function renderSamePlan() {
  document.getElementById('durationBox').classList.add('d-none')
  document.getElementById('planActionText').textContent = 'Bạn đang sử dụng gói này'
  document.getElementById('planAmountText').textContent = '---'

  disableConfirmButton()
}

function renderDowngrade(refund) {
  document.getElementById('durationBox').classList.add('d-none')
  document.getElementById('planActionText').textContent = 'Hạ gói (giữ nguyên thời hạn)'
  document.getElementById('planAmountText').textContent =
    `Hoàn vào ví: ${refund.toLocaleString()} đ`

  setConfirmButton('downgrade', 'btn-danger')
}

function handleDurationChange() {
  const btn = document.getElementById('confirmChangePlan')
  if (btn.dataset.action !== 'upgrade') return

  const select = document.getElementById('newPlanSelect')
  const selected = select.options[select.selectedIndex]
  if (!selected) return

  const price = Number(selected.dataset.price)
  const months = Number(this.value)

  document.getElementById('planAmountText').textContent =
    `Chi phí: ${(price * months).toLocaleString()} đ`
}

async function submitChangePlan() {
  const btn = document.getElementById('confirmChangePlan')
  const action = btn.dataset.action
  const planId = document.getElementById('newPlanSelect').value
  const durationEl = document.getElementById('durationSelect')
  const duration = action === 'upgrade' ? Number(durationEl?.value) : null
  const orgId = getOrganizationIdFromUrl()

  if (!action || !planId) return

  if (action === 'upgrade' && (!duration || duration < 1)) {
    toastr.error('Vui lòng chọn thời hạn gói')
    return
  }

  const payload = {
    orgId,
    planId,
    action,
    duration
  }

  try {
    const result = await ajax('/api/admin/org/change-plan', payload)
    if (result) {
      toastr.success('Thay đổi gói thành công!')
    }
  } catch (err) {
    console.error(err.message || 'Có lỗi xảy ra')
  }
}
function setConfirmButton(action, className) {
  const btn = document.getElementById('confirmChangePlan')
  btn.disabled = false
  btn.dataset.action = action
  btn.classList.remove('btn-primary', 'btn-danger')
  btn.classList.add(className)
}

function disableConfirmButton() {
  const btn = document.getElementById('confirmChangePlan')
  btn.disabled = true
  btn.dataset.action = ''
}
