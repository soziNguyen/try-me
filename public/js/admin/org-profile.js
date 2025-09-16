const orgId = document.getElementById('currentOrgId').value
const orgInfo = document.querySelector('.org-info')
let cropper
let isLoadingOrgData = false // cờ để tránh update lúc load

async function fetchOrgDetail() {
  try {
    isLoadingOrgData = true
    const res = await fetch(`/api/organization/${orgId}`)
    const data = await res.json()

    if (data.success) {
      const org = data.data

      $('#taxCode').val(org.taxCode || '')
      $('#orgName').val(org.name || '')
      $('#orgEmail').val(org.email || '')
      $('#orgPhone').val(org.phoneDisplay?.local || '')
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
      toastr.success(data.message)
      if (field === 'phone' && data.data?.phoneDisplay?.local) {
        $('#orgPhone').val(data.data.phoneDisplay.local)
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
  $('#orgName').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('name', $('#orgName').val())
  })
  $('#orgEmail').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('email', $('#orgEmail').val())
  })
  $('#orgPhone').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('phone', $('#orgPhone').val())
  })
  $('#orgStreet').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('street', $('#orgStreet').val())
  })
  $('#orgProvince').on('change', function () {
    const provinceId = $(this).val()
    if (provinceId) listCommunes(provinceId)
    else {
      $('#orgCommune')
        .empty()
        .append('<option value="">— Chọn Xã/ Phường —</option>')
        .prop('disabled', true)
      initSelect2($('#orgCommune'), '— Chọn Xã/ Phường —')
    }
    if (!isLoadingOrgData) updateOrgField('province', provinceId)
  })
  $('#orgCommune').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('commune', $('#orgCommune').val())
  })
  $('#orgIsActive').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('isActive', $('#orgIsActive').is(':checked'))
  })
  $('#taxCode').on('change', () => {
    if (!isLoadingOrgData) updateOrgField('taxCode', $('#taxCode').val())
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
    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'))
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
        const modal = new bootstrap.Modal(document.getElementById('imageCropModal'))
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
})
