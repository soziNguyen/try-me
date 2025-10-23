$(function () {
  const orgId = window.location.pathname.split('/').pop()

  getPlans().then(() => {
    fillDataToForm(orgId)
  })

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
  $('#orgPlan').val(data.plan?._id || data.plan)
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

function getPlans() {
  return new Promise((resolve) => {
    $.getJSON('/api/admin/plan/active', function (data) {
      const $planSelect = $('#orgPlan')
      $planSelect.empty()
      const result = data.data

      if (result && result.length > 0) {
        result.forEach((plan) => {
          $planSelect.append(`<option value="${plan._id}">${plan.name}</option>`)
        })
      }

      resolve()
    })
  })
}
