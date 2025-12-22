const orgId = document.getElementById('currentOrgId').value
const orgInfo = document.querySelector('.org-info')
const accountType = document.getElementById('accountType').value
let cropper
let isLoadingOrgData = false // cờ để tránh update lúc load

async function fetchWarehouses(selectedId = '') {
  try {
    const res = await fetch('/api/inventory/warehouse/all')
    const data = await res.json()

    if (data.success) {
      const select = document.getElementById('orgWarehouse')
      select.innerHTML = '<option value="">— Tất cả —</option>'
      data.data.forEach((w) => {
        const opt = document.createElement('option')
        opt.value = w._id
        opt.textContent = w.name
        if (w._id === selectedId) opt.selected = true
        select.appendChild(opt)
      })
    } else {
      toastr.error(data.message || 'Không lấy được danh sách kho')
    }
  } catch (err) {
    console.error('Lỗi khi lấy danh sách kho:', err)
  }
}

async function fetchOrgDetail() {
  try {
    isLoadingOrgData = true
    const res = await fetch(`/api/organization/${orgId}`)
    const data = await res.json()

    if (data.success) {
      const org = data.data
      const profile = org.profile || {}

      await fetchWarehouses(org.defaultWarehouse?._id)

      $('#taxCode').val(org.taxCode || '')
      $('#orgName').val(org.name || '')
      $('#orgEmail').val(org.email || '')
      $('#orgPhone').val(org.phoneDisplay?.international || '')
      $('#orgStreet').val(org.street || '')
      $('#orgLogoPreview').attr('src', org.logo || '/assets/images/default.png')

      const imgPreview = document.getElementById('orgLogoPreview')
      const overlay = document.querySelector('.org-logo-overlay')

      if (org.logo) {
        imgPreview.classList.remove('no-image')
        overlay.classList.add('has-image')
        overlay.classList.remove('no-image')
      } else {
        imgPreview.classList.add('no-image')
        overlay.classList.add('no-image')
        overlay.classList.remove('has-image')
      }

      const provinceId = org.province || ''
      const communeId = org.commune || ''

      await listProvinces()
      $('#orgProvince').val(provinceId).trigger('change')

      await listCommunes(provinceId)
      $('#orgCommune').val(communeId).trigger('change')

      if (accountType === 'enterprise') {
        $('#fullName').val(profile.fullName || '')
        $('#cccd').val(profile.cccd || '')
        $('#email').val(profile.email || '')
        $('#phone').val(profile.phone || '')
        $('#province').val(profile.province || '')
        $('#commune').val(profile.commune || '')
        $('#street').val(profile.street || '')

        const profileProvinceId = profile.province || ''
        const profileCommuneId = profile.commune || ''

        await listProvinces('#province')
        $('#province').val(profileProvinceId).trigger('change')

        await listCommunes(profileProvinceId, '#commune')
        $('#commune').val(profileCommuneId).trigger('change')
      }

      const verificationMap = {
        pending: {
          text: 'Chờ xác nhận',
          class: 'bg-warning text-dark',
          icon: 'bi-hourglass-split'
        },
        verified: {
          text: 'Đã xác minh',
          class: 'bg-success',
          icon: 'bi-check-circle'
        },
        rejected: {
          text: 'Bị từ chối',
          class: 'bg-danger',
          icon: 'bi-x-circle'
        }
      }

      const s = verificationMap[profile.verificationStatus]

      $('#verificationBadge')
        .html(`<i class="bi ${s.icon} me-1"></i>${s.text}`)
        .removeClass('bg-warning bg-success bg-danger bg-secondary text-dark')
        .addClass(s.class)

      if (profile.cccdImages?.front) {
        $('#cccdFrontPreview').attr('src', profile.cccdImages.front).removeClass('d-none')
        $('#cccdFrontPlaceholder').addClass('d-none')
      } else {
        $('#cccdFrontPreview').addClass('d-none')
        $('#cccdFrontPlaceholder').removeClass('d-none')
      }

      // CCCD BACK
      if (profile.cccdImages?.back) {
        $('#cccdBackPreview').attr('src', profile.cccdImages.back).removeClass('d-none')
        $('#cccdBackPlaceholder').addClass('d-none')
      } else {
        $('#cccdBackPreview').addClass('d-none')
        $('#cccdBackPlaceholder').removeClass('d-none')
      }

      // Verification note (nếu bị reject)
      if (profile.verificationStatus === 'rejected') {
        $('#verificationNote').text(profile.verificationNote || '')
        $('#verificationNoteContainer').removeClass('d-none')
      } else {
        $('#verificationNoteContainer').addClass('d-none')
      }
    } else {
      toastr.error(data.message || 'Không lấy được thông tin tổ chức')
    }
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu tổ chức:', err)
  } finally {
    isLoadingOrgData = false
  }
}

// ================== Auto update field ==================
async function updateOrgField(field, value) {
  const csrfToken = document.getElementById('_csrf')?.value
  const payload = { [field]: value }

  if (field === 'phone') {
    payload.phone = value ? value.replace(/[\s\.\-]/g, '') : ''
  }

  try {
    const res = await fetch(`/api/organization/update/${orgId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.success) {
      toastr.remove()
      toastr.success(data.message)
      if (field === 'phone' && data.data?.phoneDisplay?.international) {
        $('#orgPhone').val(data.data.phoneDisplay.international)
      }
    } else {
      toastr.error(data.message || `Lỗi cập nhật ${field}`)
    }
  } catch (err) {
    console.error('Lỗi updateOrgField:', err)
    toastr.error(err.message || `Lỗi khi cập nhật ${field}`)
  }
}

// ================== Hàm tạo canvas tròn ==================
function createCircularCanvas(sourceCanvas, size = 400) {
  const circularCanvas = document.createElement('canvas')
  const ctx = circularCanvas.getContext('2d')
  circularCanvas.width = size
  circularCanvas.height = size

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(sourceCanvas, 0, 0, size, size)
  return circularCanvas
}

// ================== Document ready ==================
$(document).ready(function () {
  if (!orgInfo) return

  fetchOrgDetail()

  // ------------------- Field change handlers -------------------
  $(document).on('change', '.org-update', function () {
    if (isLoadingOrgData) return

    const field = $(this).data('field')
    let value = $(this).val()

    // Xử lý riêng cho phone
    if (field === 'phone') {
      value = value ? value.replace(/[\s\.\-]/g, '') : ''
    }

    // Xử lý riêng cho province
    if (field === 'province') {
      const provinceId = value
      if (provinceId) listCommunes(provinceId)
      else {
        $('#orgCommune')
          .empty()
          .append('<option value="">— Chọn Xã/ Phường —</option>')
          .prop('disabled', true)
        initSelect2($('#orgCommune'), '— Chọn Xã/ Phường —')
      }
    }

    updateOrgField(field, value)
  })

  // ------------------- Xem ảnh -------------------
  $('.preview-btn').on('click', () => {
    const imgSrc = $('#orgLogoPreview').attr('src')
    if (!imgSrc || imgSrc.includes('default.png')) return toastr.info('Chưa có ảnh để xem')

    const modalHtml = `
      <div class="modal fade" id="imagePreviewModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Xem ảnh</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
              <img src="${imgSrc}" class="img-fluid rounded-circle">
            </div>
          </div>
        </div>
      </div>`
    $('body').append(modalHtml)
    const modal = showModal('imagePreviewModal')
    modal.show()
    $('#imagePreviewModal').on('hidden.bs.modal', (e) => e.target.remove())
  })

  // ------------------- Upload + Crop -------------------
  $('.upload-btn').on('click', () => {
    const input = $('<input type="file" accept="image/*" />')
    input.on('change', (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        $('#imagePreview').attr('src', event.target.result)
        const modal = showModal('imageCropModal')
        modal.show()

        $('#imageCropModal').on('shown.bs.modal', () => {
          if (cropper) cropper.destroy()
          cropper = new Cropper(document.getElementById('imagePreview'), {
            viewMode: 1,
            autoCropArea: 1,
            aspectRatio: 1,
            dragMode: 'move',
            cropBoxResizable: true,
            cropBoxMovable: true,
            scalable: true,
            zoomable: true,
            center: true
          })
        })
      }
      reader.readAsDataURL(file)
    })
    input.click()
  })

  $('#cropBtn').on('click', () => {
    const csrfToken = document.getElementById('_csrf')?.value
    if (!cropper) return
    const { mime, ext } = getBestFormat()
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 })
    const circularCanvas = createCircularCanvas(canvas, 400)

    // Hiển thị preview ngay và loại bỏ overlay
    const imgPreview = document.getElementById('orgLogoPreview')
    imgPreview.src = circularCanvas.toDataURL('image/png')
    imgPreview.classList.remove('no-image')

    const overlay = document.querySelector('.org-logo-overlay')
    overlay.classList.remove('no-image', 'has-image')
    imgPreview.src = circularCanvas.toDataURL(mime)

    // Upload ảnh tròn
    circularCanvas.toBlob((blob) => {
      const formData = new FormData()
      formData.append('file', blob, `logo.${ext}`)

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.file?.path) throw new Error('Upload ảnh thất bại')
          const imgUrl = '/' + data.file.path.replace(/\\/g, '/')
          return fetch(`/api/organization/update/${orgId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
            body: JSON.stringify({ logo: imgUrl })
          })
        })
        .then((res) => res.json())
        .then((resp) => {
          if (resp.success) toastr.success('Cập nhật ảnh thành công')
          else toastr.error(resp.message || 'Lỗi cập nhật tổ chức')
        })
        .catch((err) => toastr.error(err.message))
        .finally(() => {
          const modal = bootstrap.Modal.getInstance(document.getElementById('imageCropModal'))
          if (modal) modal.hide()
          if (cropper) {
            cropper.destroy()
            cropper = null
          }
        })
    }, mime)
  })

  $('#uploadCccdFront').on('click', () => $('#cccdFrontInput').click())
  $('#uploadCccdBack').on('click', () => $('#cccdBackInput').click())

  $('#cccdFrontInput').on('change', function () {
    handleCccdChange(this, 'front', '#cccdFrontPreview', '#cccdFrontPlaceholder')
  })

  $('#cccdBackInput').on('change', function () {
    handleCccdChange(this, 'back', '#cccdBackPreview', '#cccdBackPlaceholder')
  })

  function handleCccdChange(input, side, previewSelector, placeholderSelector) {
    const file = input.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toastr.error('Vui lòng chọn file ảnh')
      input.value = ''
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => {
      $(previewSelector).attr('src', e.target.result).removeClass('d-none')
      $(placeholderSelector).addClass('d-none')
    }
    reader.readAsDataURL(file)

    uploadAndUpdateCccd(file, side)
  }

  async function uploadAndUpdateCccd(file, side) {
    const csrfToken = document.getElementById('_csrf')?.value

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData
      })

      const uploadData = await uploadRes.json()
      if (!uploadData.success) throw new Error(uploadData.error)

      const updateRes = await fetch('/api/profile/update-cccd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          side,
          url: uploadData.file.url
        })
      })

      const updateData = await updateRes.json()
      if (!updateData.success) throw new Error(updateData.message)

      toastr.success(`Đã tải lên CCCD mặt ${side === 'front' ? 'trước' : 'sau'}`)
    } catch (err) {
      console.error(err)
      toastr.error(err.message || 'Upload CCCD thất bại')
    }
  }
})
