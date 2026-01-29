$(function () {
  let table
  let categories = []
  let taxes = []
  const csrfToken = $('#_csrf').val()

  Promise.all([fetchData('menu/category/active'), fetchData('taxes/active')])
    .then(([cats, taxList]) => {
      categories = cats
      taxes = taxList
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  // Render dataTable
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#menuTableBody').offset().top - 100) / 75)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#menuTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      // scrollX: true,
      order: [],
      ajax: {
        url: '/api/menu/get',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ thực đơn mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ thực đơn',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ thực đơn)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columnDefs: [{ width: '70px', target: 2 }],
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="menuCheckbox" data-id="${row._id}">`
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
          data: 'image',
          orderable: false,
          className: 'image-cell',
          render: (data) => {
            const imgSrc = data || ''
            const hasImage = imgSrc && imgSrc.trim() !== ''

            const containerClass = hasImage
              ? 'table-image-container'
              : 'table-image-container no-image'
            const imgClass = hasImage ? '' : 'no-image'
            const overlayClass = hasImage ? 'image-overlay has-image' : 'image-overlay no-image'

            const previewBtn = hasImage
              ? `<button type="button" class="btn btn-outline-light btn-sm me-1 preview-btn" title="Xem ảnh">
                   <i class="bi bi-eye"></i>
                 </button>`
              : ''

            const uploadBtnClass = hasImage ? 'btn-outline-light' : 'btn-outline-secondary'
            const uploadBtnTitle = hasImage ? 'Chọn ảnh mới' : 'Thêm ảnh'

            return `
              <div class="menu-image-container ${containerClass}">
                <img src="${imgSrc || '/assets/images/default.png'}" alt="Ảnh" class="menu-image ${imgClass}">
                <div class="${overlayClass}">
                  ${previewBtn}
                  <button type="button" class="btn ${uploadBtnClass} btn-sm upload-btn" title="${uploadBtnTitle}">
                    <i class="bi bi-${hasImage ? 'arrow-repeat' : 'upload'}"></i>
                  </button>
                </div>
              </div>
            `
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
          data: 'category',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedCategoryId = data?._id || ''
              const options = categories.map((cat) => {
                return `<option value="${cat._id}"${selectedCategoryId === cat._id ? ' selected' : ''}>${cat.name}</option>`
              })
              return `
                <select class="dataInput form-select form-select-sm" data-field="category" data-current="${selectedCategoryId}">
                  <option value="">— Chọn danh mục —</option>
                  ${options}
                </select>
              `
            }
            return data?.name || ''
          }
        },
        {
          data: 'price',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="number" class="dataInput text-center border-0 w-100 form-control" 
                        data-field="price" value="${data ?? 0}" min="0" step="0.1" placeholder="0">`
            }
            return data
          }
        },
        {
          data: 'tax',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedTaxId = data?._id || ''
              const options = taxes.map((tax) => {
                return `<option value="${tax._id}"${selectedTaxId === tax._id ? ' selected' : ''}>${tax.rate}%</option>`
              })
              return `
                <select class="dataInput form-select form-select-sm" data-field="tax" data-current="${selectedTaxId}">
                  ${options}
                </select>
              `
            }
            return data?.rate ? `${data.rate}%` : '0%'
          }
        },
        {
          data: 'description',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data ?? ''}">`
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
        }
      ],
      rowCallback: function (row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id)
      },
      drawCallback: function () {
        $('#menuTable select.dataInput[data-field="category"]').each(function () {
          initSelect2($(this), '— Chọn danh mục —')
        })

        $('#menuTable select.dataInput[data-field="tax"]').each(function () {
          initSelect2($(this), '— 0% —')
        })

        $('#menuTable img').each(function () {
          const $img = $(this)

          $img.off('error').off('load')

          $img.on('error', function () {
            $img.addClass('img-error')
          })

          $img.on('load', function () {
            $img.removeClass('img-error')
          })

          if (this.complete && this.naturalWidth === 0) {
            $img.addClass('img-error')
          }
        })
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deleteMenus">
            <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addMenu">
            <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })

    // =======================================================
    // EVENT HANDLER
    handlerAddEvent('#menuTable', '#addMenu', 'menu')
    handlerDeleteEvent('#menuTable', '#deleteMenus', 'menuCheckbox', 'menu')
    handlerUpdateEvent('#menuTable', 'menu')

    initTableCheckboxEvents('#menuTable', 'menuCheckbox')
  }

  let cropper
  let currentImgCell

  $('#menuTable').on('click', '.preview-btn', function (e) {
    e.stopPropagation()
    const $img = $(this).closest('.menu-image-container').find('img')
    const imgSrc = $img.attr('src')

    if (!imgSrc || imgSrc.includes('default.png') || imgSrc.trim() === '') {
      toastr.info('Chưa có ảnh để xem')
      return
    }

    if ($img.hasClass('img-error')) {
      toastr.remove()
      toastr.info('Ảnh bị lỗi, vui lòng sửa ảnh và thử lại sau')
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
              <img src="${imgSrc}" class="img-fluid vh-70">
            </div>
          </div>
        </div>
      </div>
    `

    // Remove existing preview modal and add new one
    $('#imagePreviewModal').remove()
    $('body').append(previewModal)

    const modal = showModal('imagePreviewModal')
    modal.show()

    $('#imagePreviewModal').on('hidden.bs.modal', function () {
      $(this).remove()
    })
  })

  $('#menuTable').on('click', '.upload-btn', function (e) {
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
          modalEl.addEventListener(
            'shown.bs.modal',
            () => {
              if (cropper) {
                cropper.destroy()
              }
              cropper = new Cropper(document.getElementById('imagePreview'), {
                viewMode: 1,
                autoCropArea: 1,
                responsive: true,
                background: true,
                center: true
              })
            },
            { once: true }
          )
        }
        reader.readAsDataURL(file)
      })
      .trigger('click')
  })

  $('#cropBtn').on('click', function () {
    if (!cropper) return
    const cropData = cropper.getData(true)
    const { mime, ext } = getBestFormat()

    cropper
      .getCroppedCanvas({
        width: Math.floor(cropData.width),
        height: Math.floor(cropData.height),
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      })
      .toBlob((blob) => {
        const formData = new FormData()
        formData.append('file', blob, `$cropped.${ext}`)

        // Upload file đã crop lên server
        $.ajax({
          url: '/api/upload',
          method: 'POST',
          data: formData,
          processData: false,
          contentType: false,
          headers: { 'x-csrf-token': csrfToken },
          success: (res) => {
            const imgUrl = '/' + res.file.path.replace(/\\/g, '/')
            const timestamp = new Date().getTime()
            // Update src ảnh trong table, thêm timestamp để bust cache
            currentImgCell.find('img').attr('src', `${imgUrl}?t=${timestamp}`)
            updateImageContainerAfterUpload(currentImgCell, imgUrl)
            // Cập nhật trường image của bản ghi
            const row = currentImgCell.closest('tr')
            const id = row.data('id')
            if (id) {
              $.ajax({
                url: `/api/menu/update/${id}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ image: imgUrl }),
                headers: { 'x-csrf-token': csrfToken },
                success: () => toastr.success('Cập nhật ảnh thành công'),
                error: () => toastr.error('Lỗi khi cập nhật ảnh')
              })
            }

            // Đóng modal và destroy cropper
            bootstrap.Modal.getInstance(document.getElementById('imageCropModal')).hide()
            cropper.destroy()
            cropper = null
          },
          error: () => toastr.error('Lỗi upload ảnh')
        })
      }, mime)
  })
})
