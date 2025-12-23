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

    if ($('#fullName').length) {
      formData.profile = {
        fullName: $('#fullName').val(),
        cccd: $('#cccd').val(),
        email: $('#ownerEmail').val(),
        phone: $('#ownerPhone').val(),
        province: $('#ownerProvince').val(),
        commune: $('#ownerCommune').val(),
        street: $('#ownerStreet').val()
      }
    }

    if ($('#verificationNote').length) {
      if (!formData.profile) {
        formData.profile = {}
      }
      formData.profile.verificationNote = $('#verificationNote').val()
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
          fillDataToForm(orgId)
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

  // View mặt trước
  $('#viewCccdFront').on('click', function () {
    viewImage('#cccdFrontPreview', 'Ảnh mặt trước CCCD')
  })

  // View mặt sau
  $('#viewCccdBack').on('click', function () {
    viewImage('#cccdBackPreview', 'Ảnh mặt sau CCCD')
  })

  $('#verificationStatus').on('change', async function () {
    const newStatus = $(this).val()
    const statusText = $(this).find('option:selected').text()

    toggleRejectedNote(newStatus)

    showConfirmModal({
      title: 'Xác nhận',
      okBtnColor: newStatus === 'rejected' ? 'danger' : 'primary',
      message: `Bạn có chắc muốn đổi trạng thái thành "${statusText}"?`,
      confirmed: 'Xác nhận',
      onConfirm: async () => {
        try {
          const result = await ajax(`/api/profile/${orgId}/verify`, {
            verificationStatus: newStatus
          })
          if (result) {
            toastr.success('Cập nhật trạng thái thành công')
            fillDataToForm(orgId)
          }
        } catch (error) {
          console.error(error)
          toastr.error('Có lỗi xảy ra khi cập nhật')
          fillDataToForm(orgId)
        }
      }
    })
  })
})

function toggleRejectedNote(status) {
  if (status === 'rejected') {
    $('#rejectedNoteWrapper').removeClass('d-none')
  } else {
    $('#rejectedNoteWrapper').addClass('d-none')
    $('#verificationNote').val('')
  }
}

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
  $('#verificationStatus').val(data.profile.verificationStatus)
  updateVerificationBadge(data.profile.verificationStatus)

  if (data.profile.cccdImages?.front) {
    $('#cccdFrontPreview').attr('src', data.profile.cccdImages.front).removeClass('d-none')
    $('#cccdFrontPlaceholder').addClass('d-none')
  } else {
    $('#cccdFrontPreview').addClass('d-none')
    $('#cccdFrontPlaceholder').removeClass('d-none')
  }

  if (data.profile.cccdImages?.back) {
    $('#cccdBackPreview').attr('src', data.profile.cccdImages.back).removeClass('d-none')
    $('#cccdBackPlaceholder').addClass('d-none')
  } else {
    $('#cccdBackPreview').addClass('d-none')
    $('#cccdBackPlaceholder').removeClass('d-none')
  }

  toggleRejectedNote(data.profile.verificationStatus)

  if (data.profile.verificationStatus === 'rejected') {
    $('#verificationNote').val(data.profile.verificationNote || '')
  }

  if (data.accountType === 'enterprise') {
    const profile = data.profile
    $('#fullName').val(profile.fullName)
    $('#cccd').val(profile.cccd)
    $('#ownerEmail').val(profile.email)
    $('#ownerPhone').val(profile.phone)
    $('#ownerStreet').val(profile.street)
  }

  listAddress(data)
}

async function listAddress(data) {
  const provinceId = data.province || ''
  const communeId = data.commune || ''

  await listProvinces()
  $('#orgProvince').val(provinceId).trigger('change')

  await listCommunes(provinceId)
  $('#orgCommune').val(communeId).trigger('change')

  if (data.accountType === 'enterprise') {
    const profileProvinceId = data.profile.province || ''
    const profileCommuneId = data.profile.commune || ''

    await listProvinces('#ownerProvince')
    $('#ownerProvince').val(profileProvinceId).trigger('change')

    await listCommunes(profileProvinceId, '#ownerCommune')
    $('#ownerCommune').val(profileCommuneId).trigger('change')
  }
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

function viewImage(previewSelector, title = 'Xem ảnh CCCD') {
  const src = $(previewSelector).attr('src')

  if (!src) {
    toastr.remove()
    toastr.info('Chưa có ảnh để xem')
    return
  }

  $('#imageViewModalImg').attr('src', src)
  $('#imageViewModal .modal-title').text(title)

  new bootstrap.Modal('#imageViewModal').show()
}

function updateVerificationBadge(status) {
  const badge = $('#verificationStatusBadge')

  switch (status) {
    case 'pending':
      badge.removeClass().addClass('badge bg-warning text-dark').text('Chờ xác minh')
      break
    case 'verified':
      badge.removeClass().addClass('badge bg-success').text('Xác minh')
      break
    case 'rejected':
      badge.removeClass().addClass('badge bg-danger').text('Từ chối')
      break
    default:
      badge.removeClass().addClass('badge bg-secondary').text('Chưa xác định')
  }
}
