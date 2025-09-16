const orgId = document.getElementById('currentOrgId').value;
const orgInfo = document.querySelector('.org-info');
let cropper;

// ================== Lấy thông tin tổ chức ==================
async function fetchOrgDetail() {
  try {
    const res = await fetch(`/api/organization/${orgId}`);
    const data = await res.json();

    if (data.success) {
      const org = data.data;

      // Fill các field text
      $('#taxCode').val(org.taxCode || '');
      $('#orgName').val(org.name || '');
      $('#orgEmail').val(org.email || '');
      $('#orgPhone').val(org.phoneDisplay?.local || '');
      $('#orgStreet').val(org.street || '');
      $('#orgLogoPreview').attr('src', org.logo || '/assets/images/default.png');

      const provinceId = org.province || '';
      const communeId = org.commune || '';

      await listProvinces();
      $('#orgProvince').val(provinceId).trigger('change');

      await listCommunes(provinceId);
      $('#orgCommune').val(communeId).trigger('change');
    } else {
      toastr.error(data.message || 'Không lấy được thông tin tổ chức');
    }
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu tổ chức:', err);
  }
}

$(document).ready(function () {
  if (orgInfo) {
    fetchOrgDetail();

    $('#orgProvince').on('change', function () {
      const provinceId = $(this).val();
      if (provinceId) {
        listCommunes(provinceId);
      } else {
        $('#orgCommune')
          .empty()
          .append('<option value="">— Chọn Xã/ Phường —</option>')
          .prop('disabled', true);
        initSelect2($('#orgCommune'), '— Chọn Xã/ Phường —');
      }
    });
  }
});

// ================== Xem ảnh ==================
$('.preview-btn').on('click', () => {
  const imgSrc = $('#orgLogoPreview').attr('src')
  if (!imgSrc || imgSrc.includes('default.png')) {
    toastr.info('Chưa có ảnh để xem')
    return
  }

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
  $('#imagePreviewModal').on('hidden.bs.modal', e => e.target.remove())
})

// ================== Upload ảnh + Crop ==================
$('.upload-btn').on('click', () => {
  const input = $('<input type="file" accept="image/*" />')
  input.on('change', e => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = function (event) {
      $('#imagePreview').attr('src', event.target.result)
      const modal = new bootstrap.Modal(document.getElementById('imageCropModal'))
      modal.show()

      $('#imageCropModal').on('shown.bs.modal', () => {
        if (cropper) cropper.destroy()
        cropper = new Cropper(document.getElementById('imagePreview'), {
          viewMode: 1,
          autoCropArea: 1,
          aspectRatio: 1, // Giữ tỉ lệ 1:1
          ready() {
            // Bo tròn crop box
            const cropBox = this.cropper.cropBox
            cropBox.style.borderRadius = '50%'
            const face = this.cropper.face
            face.style.borderRadius = '50%'
          }
        })
      })
    }
    reader.readAsDataURL(file)
  })
  input.click()
})

// ================== Crop & Save ==================
$('#cropBtn').on('click', () => {
  const csrfToken = document.getElementById('_csrf')?.value;

  if (!cropper) return
  cropper.getCroppedCanvas({
    width: 400,
    height: 400
  }).toBlob(blob => {
    const formData = new FormData()
    formData.append('file', blob, 'logo.png')

    fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.file?.path) {
          const imgUrl = '/' + data.file.path.replace(/\\/g, '/')
          $('#orgLogoPreview').attr('src', imgUrl + '?t=' + Date.now())
          return fetch(`/api/organization/update/${orgId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ logo: imgUrl })
          })
        } else throw new Error('Upload ảnh thất bại')
      })
      .then(res => res.json())
      .then(resp => {
        if (resp.success) toastr.success('Cập nhật ảnh thành công')
        else toastr.error(resp.message || 'Lỗi cập nhật tổ chức')
      })
      .catch(err => toastr.error(err.message))
      .finally(() => {
        bootstrap.Modal.getInstance(document.getElementById('imageCropModal')).hide()
        cropper.destroy()
        cropper = null
      })
  }, 'image/png')
})