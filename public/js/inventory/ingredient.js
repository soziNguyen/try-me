$(function () {

  let table
  let units = []
  let categories = []

  Promise.all([
    fetchData('inventory/categories'),
  ])
    .then(([cats]) => {
      categories = cats
      initDataTable()
    })
    .catch(err => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  // Render dataTable
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#ingredientTableBody').offset().top - 120) / 70)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#ingredientTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [],
      ajax: {
        url: '/api/inventory/ingredient',
        method: 'GET',
        dataSrc: function (res) {
          if (!res.data) return []
          units = res.units || []
          return res.data
        }
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ nguyên liệu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ nguyên liệu',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ nguyên liệu)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="ingredientCheckbox" data-id="${row._id}">`
        },
        {
          data: 'image',
          orderable: false,
          className: 'image-cell',
          render: (data) => {
            const imgSrc = data || ''
            const hasImage = imgSrc && imgSrc.trim() !== ''
            const containerStyle = hasImage
              ? 'display: inline-block;'
              : 'display: inline-block; width: 70px; height: 70px; border: 2px dashed #dee2e6; border-radius: 8px;'
            const imgStyle = hasImage
              ? 'cursor: pointer; width: 70px; height: 70px; object-fit: cover; border-radius: 8px;'
              : 'cursor: pointer; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; opacity: 0.3;'
            const overlayStyle = hasImage
              ? 'background: rgba(0,0,0,0.7); opacity: 0; transition: opacity 0.3s;'
              : 'background: rgba(248,249,250,0.9); border: 1px dashed #6c757d; border-radius: 6px; opacity: 0; transition: opacity 0.3s;'

            const previewBtn = hasImage
              ? `<button type="button" class="btn btn-outline-light btn-sm me-1 preview-btn" title="Xem ảnh" style="--bs-btn-padding-y: 0.25rem; --bs-btn-padding-x: 0.4rem; --bs-btn-font-size: 0.75rem;">
                   <i class="bi bi-eye"></i>
                 </button>`
              : ''

            const uploadBtnClass = hasImage ? 'btn-outline-light' : 'btn-outline-secondary'
            const uploadBtnTitle = hasImage ? 'Chọn ảnh mới' : 'Thêm ảnh'

            return `
              <div class="ingredient-image-container position-relative" style="${containerStyle}">
                <img src="${imgSrc || '/assets/images/default.png'}" alt="Ảnh" class="ingredient-image" style="${imgStyle}">
                <div class="image-overlay position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                     style="${overlayStyle}">
                  ${previewBtn}
                  <button type="button" class="btn ${uploadBtnClass} btn-sm upload-btn" title="${uploadBtnTitle}" style="--bs-btn-padding-y: 0.25rem; --bs-btn-padding-x: 0.4rem; --bs-btn-font-size: 0.75rem;">
                    <i class="bi bi-${hasImage ? 'arrow-repeat' : 'upload'}"></i>
                  </button>
                </div>
              </div>
            `
          }
        },
        {
          data: 'sku',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="sku" value="${data ?? ''}">`
            }
            return data
          }
        },
        {
          data: 'name',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
            }
            return data
          }
        },
        {
          data: 'category._id',
          name: 'category.name',
          render: (data, type, row) => {
            if (type === 'display') {
              const opts = categories.map(cat => {
                const sel = cat._id === (row.category?._id) ? 'selected' : ''
                return `<option value="${cat._id}" ${sel}>${cat.name}</option>`
              }).join('')
              return `
                <select class="dataInput form-select form-select-sm" data-field="category" data-id="${row._id}">
                  <option value="">— Chọn danh mục —</option>
                  ${opts}
                </select>`
            }
            return row.category?.name ?? ''
          }
        },
        {
          data: 'stock',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class='number'>${data ?? ''}</span>`
            }
            return data
          }
        },
        {
          data: 'unit',
          render: (data, type, row) => {
            if (type === 'display') {
              const opts = units.map(unit => {
                const selected = unit === data ? 'selected' : ''
                return `<option value="${unit}" ${selected}>${unit}</option>`
              }).join('')
              return `
                <select class="dataInput form-select form-select-sm" data-field="unit" data-id="${row._id}">
                  <option value="">— Chọn đơn vị —</option>
                  ${opts}
                </select>`
            }
            return data
          }
        },
        {
          data: 'expirationDays',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="number" class="dataInput border-0 w-100 form-control number" data-field="expirationDays" value="${data ?? ''}">`
            }
            return data
          }
        },
        {
          data: 'isActive',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
            }
            return data
          }
        },
        {
          data: 'note',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="note" value="${data ?? ''}">`
            }
            return data
          }
        }
      ],
      rowCallback: function (row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id)
      },
      drawCallback: function (settings) {
        $('#ingredientTable select[data-field]').each(function () {
          const field = $(this).data('field')
          const placeholders = {
            category: '— Chọn danh mục —',
            unit: '— Chọn đơn vị —'
          }
          if (placeholders[field]) {
            $(this).select2({
              placeholder: placeholders[field],
              width: '100%'
            })
          }
        })

        $('#ingredientTable .ingredient-image-container').hover(
          function () {
            $(this).find('.image-overlay').css('opacity', '1')
          },
          function () {
            $(this).find('.image-overlay').css('opacity', '0')
          }
        )
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteIngredientBtn">
            <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addIngredientBtn">
            <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })

    // =======================================================
    // EVENT HANDLER
    handlerAddEvent('#ingredientTable', '#addIngredientBtn', 'inventory/ingredient')
    handlerDeleteEvent('#ingredientTable', '#deleteIngredientBtn', 'ingredientCheckbox', 'inventory/ingredient')
    handlerUpdateEvent('#ingredientTable', 'inventory/ingredient')

    initTableCheckboxEvents('#ingredientTable', 'ingredientCheckbox')
  }

  let cropper
  let currentImgCell

  // Function to update image container styling after image upload
  function updateImageContainerAfterUpload(imgCell, imgUrl) {
    const container = imgCell.find('.ingredient-image-container')
    const img = container.find('img')
    const overlay = container.find('.image-overlay')

    // Update container style to remove dashed border
    container.attr('style', 'display: inline-block;')

    // Update image style
    img.attr('style', 'cursor: pointer; width: 70px; height: 70px; object-fit: cover; border-radius: 8px;')

    // Update overlay style for images with content
    overlay.attr('style', 'background: rgba(0,0,0,0.7); opacity: 0; transition: opacity 0.3s;')

    // Update buttons in overlay
    const previewBtn = `<button type="button" class="btn btn-outline-light btn-sm me-1 preview-btn" title="Xem ảnh" style="--bs-btn-padding-y: 0.25rem; --bs-btn-padding-x: 0.4rem; --bs-btn-font-size: 0.75rem;">
                         <i class="bi bi-eye"></i>
                       </button>`
    const uploadBtn = `<button type="button" class="btn btn-outline-light btn-sm upload-btn" title="Chọn ảnh mới" style="--bs-btn-padding-y: 0.25rem; --bs-btn-padding-x: 0.4rem; --bs-btn-font-size: 0.75rem;">
                         <i class="bi bi-arrow-repeat"></i>
                       </button>`

    overlay.html(previewBtn + uploadBtn)
  }

  // Event handler preview btn
  $('#ingredientTable').on('click', '.preview-btn', function (e) {
    e.stopPropagation()
    const imgSrc = $(this).closest('.ingredient-image-container').find('img').attr('src')

    if (!imgSrc || imgSrc.includes('default.png') || imgSrc.trim() === '') {
      toastr.info('Chưa có ảnh để xem')
      return
    }

    // Tạo modal preview
    const previewModal = `
      <div class="modal fade" id="imagePreviewModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Xem ảnh</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
              <img src="${imgSrc}" class="img-fluid" style="max-height: 70vh;">
            </div>
          </div>
        </div>
      </div>
    `

    // Remove existing preview modal and add new one
    $('#imagePreviewModal').remove()
    $('body').append(previewModal)

    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'))
    modal.show()

    $('#imagePreviewModal').on('hidden.bs.modal', function () {
      $(this).remove()
    })
  })

  // Event handler cho upload button
  $('#ingredientTable').on('click', '.upload-btn', function (e) {
    e.stopPropagation()
    currentImgCell = $(this).closest('.image-cell')

    // Tạo input file ẩn và trigger chọn file
    $('<input type="file" accept="image/*">')
      .on('change', function (e) {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = function (event) {
          // Đổ ảnh vào img#imagePreview
          $('#imagePreview').attr('src', event.target.result)

          // Show modal
          const modalEl = document.getElementById('imageCropModal')
          const modal = new bootstrap.Modal(modalEl)
          modal.show()

          // Khi modal đã hiển thị hết animation, khởi tạo Cropper
          modalEl.addEventListener('shown.bs.modal', () => {
            if (cropper) {
              cropper.destroy()
            }
            cropper = new Cropper(
              document.getElementById('imagePreview'),
              {
                viewMode: 1,
                autoCropArea: 1,
              }
            )
          }, { once: true })
        }
        reader.readAsDataURL(file)
      })
      .trigger('click')
  })

  // Khi nhấn nút Crop & Save
  $('#cropBtn').on('click', function () {
    if (!cropper) return

    cropper.getCroppedCanvas().toBlob(blob => {
      const formData = new FormData()
      formData.append('file', blob, 'cropped.jpg')

      // Upload file đã crop lên server
      $.ajax({
        url: '/api/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: res => {
          const imgUrl = '/' + res.file.path.replace(/\\/g, '/')
          const timestamp = new Date().getTime()
          // Update src ảnh trong table, thêm timestamp để bust cache
          currentImgCell.find('img').attr('src', `${imgUrl}?t=${timestamp}`)

          // Update the container styling to reflect that it now has an image
          updateImageContainerAfterUpload(currentImgCell, imgUrl)

          // Cập nhật trường image của bản ghi
          const row = currentImgCell.closest('tr')
          const id = row.data('id')
          if (id) {
            $.ajax({
              url: `/api/inventory/ingredient/update/${id}`,
              method: 'POST',
              contentType: 'application/json',
              data: JSON.stringify({ image: imgUrl }),
              success: () => toastr.success('Cập nhật ảnh thành công'),
              error: () => toastr.error('Lỗi khi cập nhật ảnh'),
            })
          }

          // Đóng modal và destroy cropper
          bootstrap.Modal.getInstance(
            document.getElementById('imageCropModal')
          ).hide()
          cropper.destroy()
          cropper = null
        },
        error: () => toastr.error('Lỗi upload ảnh'),
      })
    }, 'image/jpeg')
  })
})