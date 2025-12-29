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

  if (newLevel === currentLevel) {
    renderRenew(newPrice)
    return
  }

  if (newLevel > currentLevel) {
    renderUpgrade(newPrice)
    return
  }

  if (newLevel < currentLevel) {
    renderDowngrade()
  }
}

function renderUpgrade(price) {
  const TAX_RATE = 0.1
  const months = Number(document.getElementById('durationSelect').value)

  const baseAmount = price * months
  const taxAmount = Math.round(baseAmount * TAX_RATE)
  const totalAmount = baseAmount + taxAmount

  document.getElementById('durationBox').classList.remove('d-none')
  document.getElementById('planActionText').textContent = 'Nâng cấp gói'
  document.getElementById('planAmountText').textContent =
    `Chi phí: ${totalAmount.toLocaleString()} đ`

  setConfirmButton('upgrade', 'btn-primary')
}

function renderDowngrade() {
  document.getElementById('durationBox').classList.add('d-none')
  document.getElementById('planActionText').textContent = 'Hạ gói (giữ nguyên thời hạn)'

  setConfirmButton('downgrade', 'btn-danger')
}

function renderRenew(price) {
  const TAX_RATE = 0.1
  const months = Number(document.getElementById('durationSelect').value)

  const baseAmount = price * months
  const taxAmount = Math.round(baseAmount * TAX_RATE)
  const totalAmount = baseAmount + taxAmount

  document.getElementById('durationBox').classList.remove('d-none')
  document.getElementById('planActionText').textContent = 'Gia hạn gói'
  document.getElementById('planAmountText').textContent =
    `Chi phí: ${totalAmount.toLocaleString()} đ`

  setConfirmButton('renew', 'btn-success')
}

function handleDurationChange() {
  const btn = document.getElementById('confirmChangePlan')
  const action = btn.dataset.action

  // Chỉ upgrade và renew mới cần tính lại
  if (action !== 'upgrade' && action !== 'renew') return

  const select = document.getElementById('newPlanSelect')
  const selected = select.options[select.selectedIndex]
  if (!selected) return

  const price = Number(selected.dataset.price)
  const months = Number(this.value)

  const TAX_RATE = 0.1
  const baseAmount = price * months
  const taxAmount = Math.round(baseAmount * TAX_RATE)
  const totalAmount = baseAmount + taxAmount

  document.getElementById('planAmountText').textContent =
    `Chi phí: ${totalAmount.toLocaleString()} đ`
}

async function submitChangePlan() {
  const btn = document.getElementById('confirmChangePlan')
  const action = btn.dataset.action
  const planId = document.getElementById('newPlanSelect').value
  const durationEl = document.getElementById('durationSelect')
  const duration = action === 'upgrade' || action === 'renew' ? Number(durationEl?.value) : null

  const orgId = getOrganizationIdFromUrl()

  if (!action || !planId) return

  if ((action === 'upgrade' || action === 'renew') && (!duration || duration < 1)) {
    toastr.error('Vui lòng chọn thời hạn gói')
    return
  }

  const payload = {
    orgId,
    planId,
    action,
    duration
  }

  const type = action === 'upgrade' ? 'nâng cấp' : action === 'renew' ? 'gia hạn' : 'hạ cấp'

  showConfirmModal({
    title: 'Xác nhận',
    message: `Xác nhận ${type} gói ?`,
    confirmed: 'Xác nhận',
    okBtnColor: 'success',
    onConfirm: async function () {
      try {
        const result = await ajax('/api/admin/org/change-plan', payload)
        if (result) {
          toastr.success('Thay đổi gói thành công!')
          await getCurrentOrganizationPlan(orgId)

          const selectElement = document.getElementById('newPlanSelect')
          if (selectElement) {
            selectElement.selectedIndex = 0
          }

          // ẨN DURATION BOX VÀ DISABLE BUTTON
          document.getElementById('durationBox').classList.add('d-none')
          document.getElementById('planActionText').textContent = ''
          document.getElementById('planAmountText').textContent = ''
          disableConfirmButton()
        }
      } catch (err) {
        console.error(err.message || 'Có lỗi xảy ra')
      }
    }
  })
}
function setConfirmButton(action, className) {
  const btn = document.getElementById('confirmChangePlan')
  btn.disabled = false
  btn.dataset.action = action
  btn.classList.remove('btn-primary', 'btn-danger', 'btn-success')
  btn.classList.add(className)
}

function disableConfirmButton() {
  const btn = document.getElementById('confirmChangePlan')
  btn.disabled = true
  btn.dataset.action = ''
}
