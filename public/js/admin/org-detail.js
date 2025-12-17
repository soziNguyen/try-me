$(function () {
  const orgId = window.location.pathname.split('/').pop()

  fillDataToForm(orgId)

  // Submit form
  $('#updateOrgForm').on('submit', function (e) {
    e.preventDefault()

    if (!this.checkValidity()) {
      this.reportValidity()
      return
    }

    const formData = {
      name: $('#orgName').val(),
      taxCode: $('#taxCode').val(),
      email: $('#orgEmail').val(),
      phone: $('#orgPhone').val(),
      plan: $('#orgPlan').val(),
      businessType: $('#businessType').val(),
      province: $('#orgProvince').val(),
      commune: $('#orgCommune').val(),
      street: $('#orgStreet').val(),
      isActive: $('#orgIsActive').is(':checked')
    }

    const submitBtn = $(this).find('button[type="submit"]')
    submitBtn
      .prop('disabled', true)
      .html('<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...')

    ajax(`/api/organization/update/${orgId}`, formData)
      .then((result) => {
        if (result) {
          toastr.remove()
          toastr.success('Cập nhật thông tin tổ chức thành công!')
          submitBtn
            .prop('disabled', false)
            .html('<i class="bi bi-check-circle me-1"></i>Lưu thay đổi')
        } else {
          submitBtn
            .prop('disabled', false)
            .html('<i class="bi bi-check-circle me-1"></i>Lưu thay đổi')
        }
      })
      .catch((err) => {
        toastr.error(err.message || 'Cập nhật thất bại. Vui lòng thử lại!')
        submitBtn
          .prop('disabled', false)
          .html('<i class="bi bi-check-circle me-1"></i>Lưu thay đổi')
      })
  })

  // Event change province -> load communes
  $('#orgProvince').on('change', function () {
    const provinceId = $(this).val()
    if (provinceId) {
      listCommunes(provinceId)
    }
  })
})

function fillDataToForm(id) {
  fetchData(`organization/${id}`)
    .then((data) => getElements(data))
    .catch((err) => {
      console.error(err)
      toastr.error('Không thể tải thông tin tổ chức')
    })
}

function getElements(data) {
  $('#orgName').val(data.name)
  $('#taxCode').val(data.taxCode)
  $('#orgEmail').val(data.email)
  $('#orgPhone').val(data.phoneDisplay?.international)
  renderPlanBadge(data.plan, data.planExpiredAt)
  $('#businessType').val(data.businessType)
  $('#orgStreet').val(data.street)
  $('#orgIsActive').prop('checked', data.isActive)

  listAddress(data)
}

async function listAddress(data) {
  const provinceId = data.province || ''
  const communeId = data.commune || ''

  await listProvinces()
  $('#orgProvince').val(provinceId).trigger('change')

  await listCommunes(provinceId)
  $('#orgCommune').val(communeId).trigger('change')
}

function renderPlanBadge(plan, planExpiredAt) {
  const $badge = $('#orgPlanBadge')
  const $expired = $('#orgPlanExpired')

  if (!plan) {
    $badge.text('Không xác định').removeClass().addClass('badge fs-6 px-3 py-2 bg-secondary')

    $expired.text('')
    return
  }

  const planName = typeof plan === 'object' ? plan.name : plan

  const planClassMap = {
    FREE: 'bg-secondary',
    STARTER: 'bg-info',
    PRO: 'bg-dark',
    ENTERPRISE: 'bg-success'
  }

  const badgeClass = planClassMap[planName] || 'bg-dark'

  $badge.text(planName).removeClass().addClass(`badge fs-6 px-3 py-2 ${badgeClass}`)

  // ===== Expired time =====
  if (!planExpiredAt) {
    $expired.text('Không giới hạn')
    return
  }

  const expiredDate = new Date(planExpiredAt)
  const now = new Date()

  if (expiredDate < now) {
    $expired.html('<span class="text-danger">Đã hết hạn</span>')
  } else {
    const daysLeft = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24))

    $expired.html(`HSD: <strong>${formatDate(expiredDate)}</strong> · còn ${daysLeft} ngày`)
  }
}
