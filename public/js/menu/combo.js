'use strict'

$(function () {
  let table
  let menuItem = []
  let cropper = null
  let currentImageFile = null
  let croppedImageUrl = null
  let croppedImageFile = null

  Promise.all([fetchData('menu/get/active')])
    .then(([items]) => {
      menuItem = items
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
      initDataTable() // Vẫn khởi tạo tránh treo giao diện
    })

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() -
      ($('#comboTableBody').offset()
        ? $('#comboTableBody').offset().top
        : 200) -
      100) /
    71
  )
  if (!showList.includes(numRows) && numRows > 0) showList.push(numRows)
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#comboTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      scrollX: true,
      order: [],
      ajax: {
        url: '/api/menu/combos',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ combo mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ combo',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ combo)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows > 0 ? numRows : 10,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="comboCheckbox" data-id="${row._id}">`
        },
        {
          data: 'sku',
          render: (data, type, row) =>
            type === 'display' ? `<span>${data || ''}</span>` : data
        },
        {
          data: 'name',
          render: (data, type, row) =>
            type === 'display' ? `<span>${data || ''}</span>` : data
        },
        {
          data: 'image',
          orderable: false,
          className: 'image-cell text-center',
          render: (data) => {
            const imgSrc = data || ''
            return `<img src="${imgSrc}" alt="Ảnh" class="combo-image" width="70" height="70">`
          }
        },
        {
          data: 'items',
          className: 'text-start px-1',
          title: 'Nguyên liệu',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const names = items.map((it) => it.menuItem?.name).filter(Boolean)
            const uniqueNames = new Set(names)
            if (uniqueNames.size === 0) return ''
            const arr = [...uniqueNames]
            const firstThree = arr.slice(0, 3).join(', ')
            const more = arr.length > 3 ? '...' : ''
            return `<span title="${names.join('\n')}">${firstThree} ${more}</span>`
          }
        },
        {
          data: 'price',
          render: (data, type, row) => {
            if (type === 'display') {
              const price = parseFloat(data) || 0
              const formatted = price.toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
              })
              return `<span>${formatted}</span>`
            }
            return data
          }
        },
        {
          data: 'note',
          render: (data, type, row) =>
            type === 'display' ? `<span>${data || ''}</span>` : data
        },
        {
          data: 'createdBy',
          render: (data, type, row) =>
            type === 'display' ? `<span>${data || ''}</span>` : data
        },
        {
          data: 'createdAt',
          render: (data, type, row) => {
            if (type === 'display') {
              const dt = new Date(data)
              const dateStr = dt.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
              const timeStr = dt.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
              return `<span>${dateStr} ${timeStr}</span>`
            }
            return data
          }
        }
      ],
      columnDefs: [{ width: '70px', target: 3 }],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteComboBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addComboBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })

    // Ẩn form
    if ($('#comboFormContainer').hasClass('d-none')) {
      hideForm()
    } else {
      showForm()
    }

    // =======================================================
    // EVENT HANDLER chung
    handlerDeleteEvent(
      '#comboTable',
      '#deleteComboBtn',
      'comboCheckbox',
      'menu/combo'
    )
    initTableCheckboxEvents('#comboTable', 'comboCheckbox')

    // Add new combo
    $('#comboTable_wrapper').on('click', '#addComboBtn', function () {
      const $form = $('#comboForm')
      $('#comboFormContainer').removeClass('d-none')
      $form[0].reset()
      $('#itemTableBody').empty()
      $('#formTitle').text('Thêm Combo mới')
      $form.data('mode', 'create')
      $form.removeData('comboId')

      croppedImageUrl = null
      croppedImageFile = null
      currentImageFile = null
      updateImagePreview()

      showForm()
    })

    // Click row
    $('#comboTable tbody').on('click', 'tr', function (e) {
      if ($(e.target).is('input[type="checkbox"], tbody td:first-child')) return
      const data = table.row(this).data()
      if (!data) return

      const $form = $('#comboForm')
      $('#comboFormContainer').removeClass('d-none')
      $('#formTitle').text('Cập nhật Combo')

      // Gán dữ liệu vào form
      $form.find('[name="sku"]').val(data.sku || '')
      $form.find('[name="name"]').val(data.name || '')
      $form.find('[name="price"]').val(data.price || '')
      $form.find('[name="note"]').val(data.note || '')

      // Set image: url server
      croppedImageUrl = data.image || null
      croppedImageFile = null
      currentImageFile = null
      updateImagePreview()

      // Items
      const $itemBody = $('#itemTableBody')
      $itemBody.empty()
      if (Array.isArray(data.items)) {
        data.items.forEach((it) => {
          const options = menuItem
            .map(
              (o) => `
            <option value="${o._id}" ${o._id === it.menuItem?._id ? 'selected' : ''}>${o.name}</option>
          `
            )
            .join('')

          const $row = $(`
            <tr>
              <td>
                <select class="form-select" name="menuItem">
                  <option value="">— Chọn món —</option>
                  ${options}
                </select>
              </td>
              <td><input type="number" class="form-control" name="quantity" value="${it.quantity || 1}"></td>
              <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm removeItemRow">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `)
          $itemBody.append($row)
          initSelect2($row.find('select[name="menuItem"]'))
        })
      }

      $form.data('mode', 'update')
      $form.data('comboId', data._id)
      showForm()
    })

    // Khi chọn file ảnh — load vào modal crop
    $('#comboForm').on('change', 'input[name="image"]', function (e) {
      const file = e.target.files[0]
      if (file) {
        if (file.type.startsWith('image/')) {
          currentImageFile = file
          const reader = new FileReader()
          reader.onload = function (e) {
            $('#imagePreview').attr('src', e.target.result)
            $('#imageCropModal').modal('show')
          }
          reader.readAsDataURL(file)
        } else {
          toastr.error('Vui lòng chọn file ảnh')
          e.target.value = ''
        }
      }
    })

    // Khởi tạo cropper khi modal show
    $('#imageCropModal').on('shown.bs.modal', function () {
      const image = document.getElementById('imagePreview')
      if (cropper) {
        cropper.destroy()
      }
      cropper = new Cropper(image, {
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
        cropBoxMovable: true,
        cropBoxResizable: true
      })
    })

    // Destroy cropper khi đóng modal
    $('#imageCropModal').on('hidden.bs.modal', function () {
      if (cropper) {
        cropper.destroy()
        cropper = null
      }
    })

    // Crop
    $('#cropBtn').on('click', function () {
      if (cropper && currentImageFile) {
        const cropData = cropper.getData(true)
        const { mime, ext } = getBestFormat()

        cropper.getCroppedCanvas({
          width: Math.floor(cropData.width),
          height: Math.floor(cropData.height),
          fillColor: '--white',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        })
          .toBlob(function (blob) {
            const newName = currentImageFile.name.replace(/\.[^/.]+$/, `.${ext}`)
            const croppedFile = new File([blob], newName, {
              type: mime,
              lastModified: Date.now()
            })

            // lưu file tạm để upload 
            croppedImageFile = croppedFile

            const fr = new FileReader()
            fr.onload = function (ev) {
              croppedImageUrl = ev.target.result
              updateImagePreview()
              $('#imageCropModal').modal('hide')
            }
            fr.onerror = function () {
              $('#imageCropModal').modal('hide')
              toastr.error('Không thể xử lý ảnh để xem trước')
            }
            fr.readAsDataURL(blob)
          }, mime)
      }
    })

    // Submit form
    $('#comboForm').on('submit', async function (e) {
      e.preventDefault()
      const csrfToken = $('#_csrf').val()

      const $form = $(this)
      const mode = $form.data('mode')
      const comboId = $form.data('comboId')

      // Lấy dữ liệu form
      const sku = $form.find('[name="sku"]').val()
      const name = $form.find('[name="name"]').val()
      const price = parseFloat($form.find('[name="price"]').val())
      const note = $form.find('[name="note"]').val()
      let image = croppedImageUrl || ''

      // Lấy items
      const items = []
      $('#itemTableBody tr').each(function () {
        const menuItemId = $(this).find('[name="menuItem"]').val()
        const quantity = parseFloat($(this).find('[name="quantity"]').val())
        if (menuItemId && quantity > 0)
          items.push({ menuItem: menuItemId, quantity })
      })

      if (!name || !items.length || isNaN(price)) {
        toastr.error('Vui lòng điền đầy đủ thông tin')
        return
      }

      // Disable nút submit trong khi xử lý
      const $submitBtn = $form.find('button[type="submit"]')
      $submitBtn.prop('disabled', true).addClass('disabled')

      try {
        // Nếu có file tạm => upload trước
        if (croppedImageFile) {
          try {
            const uploadedPath = await uploadImageFile(croppedImageFile)
            if (uploadedPath) {
              image = uploadedPath
            }
            // reset file tạm
            croppedImageFile = null
            currentImageFile = null
            croppedImageUrl = image || null
          } catch (uploadErr) {
            toastr.error(uploadErr.message || 'Lỗi khi upload ảnh')
            $submitBtn.prop('disabled', false).removeClass('disabled')
            return
          }
        }

        // URL theo mode
        let url = '/api/menu/combo/create'
        if (mode === 'update') url = `/api/menu/combo/update/${comboId}`

        const payload = { sku, name, items, price, note, image }

        // Gửi tạo/cập nhật combo
        const res = await $.ajax({
          url,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(payload),
          headers: { 'x-csrf-token': csrfToken },
        })

        if (res.success) {
          toastr.success(res.message || 'Thành công')
          if (table) table.ajax.reload(null, false)
          $form[0].reset()
          $('#itemTableBody').empty()
          croppedImageUrl = null
          croppedImageFile = null
          currentImageFile = null
          updateImagePreview()
          hideForm()
        } else {
          toastr.error(res.message || 'Lỗi')
        }
      } catch (err) {
        toastr.error(err.responseJSON?.message || err.message || 'Lỗi server')
      } finally {
        $submitBtn.prop('disabled', false).removeClass('disabled')
      }
    })

    // Thêm dòng items
    $('#addItemRow').on('click', function () {
      const options = menuItem
        .map((o) => `<option value="${o._id}">${o.name}</option>`)
        .join('')
      const rowHtml = `
        <tr>
          <td>
            <select class="form-select" name="menuItem">
              <option value="">— Chọn món —</option>
              ${options}
            </select>
          </td>
          <td><input type="number" class="form-control" name="quantity" min="1" step="1" value="1"></td>
          <td class="text-center">
            <button type="button" class="btn btn-outline-danger btn-sm removeItemRow">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `
      const $row = $(rowHtml)
      $('#itemTableBody').append($row)
      initSelect2($row.find('select[name="menuItem"]'))
    })

    // Xóa item row
    $('#itemTableBody').on('click', '.removeItemRow', function () {
      $(this).closest('tr').remove()
    })
  }

  // Hủy/ẩn form
  $('#comboForm').on('click', '#btnCancel', function (e) {
    e.preventDefault()
    if ($('#comboFormContainer').hasClass('d-none')) {
      showForm()
    } else {
      hideForm()
    }
  })

  // Update preview image trong form
  function updateImagePreview() {
    const $imageContainer = $('#comboForm').find('.image-preview-container')
    if ($imageContainer.length === 0) {
      const $imageInput = $('#comboForm').find('input[name="image"]')
      $imageInput.after(`
        <div class="image-preview-container mt-2 d-none">
          <img class="preview-image image-square">
          <div class="mt-1">
            <button type="button" class="btn btn-outline-danger btn-sm remove-image">
              <i class="bi bi-trash"></i> Xóa ảnh
            </button>
          </div>
        </div>
      `)
    }

    const $container = $('#comboForm').find('.image-preview-container')
    const $previewImg = $container.find('.preview-image')

    if (croppedImageUrl) {
      $previewImg.attr('src', croppedImageUrl)
      $container.removeClass('d-none')
    } else {
      $previewImg.attr('src', '')
      $container.addClass('d-none')
    }
  }

  // Remove image handler — giải phóng objectURL nếu là blob và xóa file tạm
  $('#comboForm').on('click', '.remove-image', function () {
    croppedImageUrl = null
    croppedImageFile = null
    currentImageFile = null
    updateImagePreview()
    $('#comboForm').find('input[name="image"]').val('')
  })

  function uploadImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null)
      const formData = new FormData()
      formData.append('file', file)
      $.ajax({
        url: '/api/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
          if (response.file) {
            const path = '/' + response.file.path.replace(/\\/g, '/')
            resolve(path)
          } else {
            reject(new Error('Không nhận về file từ server'))
          }
        },
        error: function (xhr) {
          reject(new Error(xhr.responseJSON?.message || 'Lỗi upload'))
        }
      })
    })
  }

  // Hiển thị / ẩn form — đồng thời resize DataTable column đúng
  function showForm() {
    $('#tableContainer').removeClass('col-md-12').addClass('col-md-7')
    $('#formContainer').removeClass('d-none').addClass('col-md-5')
    $('#comboFormContainer').removeClass('d-none')

    setTimeout(() => {
      if (typeof table !== 'undefined' && table) {
        try {
          table.columns.adjust().draw(false)
        } catch (e) { }
      }
    }, 150)
  }

  function hideForm() {
    $('#tableContainer').removeClass('col-md-7').addClass('col-md-12')
    $('#comboFormContainer').addClass('d-none')
    $('#formContainer').addClass('d-none').removeClass('col-md-5')

    setTimeout(() => {
      if (typeof table !== 'undefined' && table) {
        try {
          table.columns.adjust().draw(false)
        } catch (e) { }
      }
    }, 150)
  }
})
