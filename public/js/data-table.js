// Handle EventListener

function handlerAddEvent(tableSelector, btnSelector, module) {
  const $wrapper = $(`${tableSelector}_wrapper`)
  const table = $(tableSelector).DataTable()
  const csrfToken = $('#_csrf').val()

  $wrapper.on('click', btnSelector, function () {
    const $btn = $(this).prop('disabled', true)

    $.ajax({
      url: `/api/${module}/create`,
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        toastr.remove()
        if (res.success) {
          toastr.success(res.message)
          table.ajax.reload(null, false)
          $wrapper.find('#selectAll').prop('checked', false)
        } else {
          toastr.error(res.message)
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi')
      },
      complete() {
        $btn.prop('disabled', false)
      }
    })
  })
}

function handlerDeleteEvent(tableSelector, btnSelector, checkboxClass, module) {
  const $wrapper = $(`${tableSelector}_wrapper`)
  const table = $(tableSelector).DataTable()
  const csrfToken = $('#_csrf').val()

  $wrapper.on('click', btnSelector, function () {
    const $btn = $(this) // chưa disable ngay
    const selected = $wrapper
      .find(`.${checkboxClass}:checked`)
      .map((_, el) => $(el).data('id'))
      .get()

    if (!selected.length) {
      toastr.remove()
      toastr.warning('Không có bản ghi nào được chọn để xóa')
      return
    }

    showConfirmModal({
      title: 'Xóa các mục đã chọn',
      message: `Bạn có chắc chắn muốn xóa <strong>${selected.length}</strong> bản ghi không?`,
      onConfirm: function () {
        $btn.prop('disabled', true) // disable khi user confirm
        $.ajax({
          url: `/api/${module}/deletes`,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ ids: selected }),
          headers: { 'x-csrf-token': csrfToken },
          success(res) {
            if (res.success) {
              toastr.remove()
              toastr.success(res.message)
              table.ajax.reload(null, false)
              $wrapper.find('#selectAll').prop('checked', false)
            } else {
              toastr.error(res.message)
            }
          },
          error(xhr) {
            toastr.remove()
            toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
          },
          complete() {
            $btn.prop('disabled', false)
          }
        })
      }
    })
  })
}

function handlerUpdateEvent(tableSelector, module, transform) {
  const $table = $(tableSelector)
  $table.on('change', '.dataInput', function () {
    const id = $(this).closest('tr').data('id')
    const field = $(this).data('field')
    let value = $(this).is(':checkbox') ? $(this).is(':checked') : $(this).val()
    const csrfToken = $('#_csrf').val()

    if (typeof value === 'string') {
      value = value.trim()
    }

    if (!field || id === null) return

    let payload = { [field]: value }

    if (typeof transform === 'function') {
      payload = transform(id, field, value)
    }

    $.ajax({
      url: `/api/${module}/update/${id}`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: { 'x-csrf-token': csrfToken },
      success: function (res) {
        toastr.remove()
        if (res.success) {
          toastr.success(res.message)
        } else {
          toastr.error(res.message)
        }
      },
      error: function (xhr) {
        toastr.remove()
        toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
      }
    })
  })
}

function initTableCheckboxEvents(tableSelector, checkboxClass) {
  const $table = $(tableSelector)
  const $wrapper = $(`${tableSelector}_wrapper`)
  const $selectAll = $wrapper.find('#selectAll')

  // Click 'tr' event
  $table.on('click', 'tbody tr', function (e) {
    if (
      $(e.target).is(`
      input[type=checkbox], img, input[type=text], input[type=number], select, button, span, .dataInput, i, td:nth-child(n+2)
      `) ||
      $(e.target).closest('.image-cell').length
    )
      return
    const checkbox = $(this).find(`.${checkboxClass}`)
    checkbox.prop('checked', !checkbox.prop('checked')).trigger('change')
  })

  // Select All checkbox
  $selectAll.on('change', function () {
    $table.find(`.${checkboxClass}`).prop('checked', this.checked)
  })

  // Click outside selectAll
  $table.on('click', 'thead th:first-child', function (e) {
    if ($(e.target).is('input[type=checkbox]')) return
    if ($selectAll.length) {
      $selectAll.prop('checked', !$selectAll.prop('checked')).trigger('change')
    }
  })

  // Sync Select All
  $table.on('change', `.${checkboxClass}`, function () {
    const all = $table.find(`.${checkboxClass}`).length
    const checked = $table.find(`.${checkboxClass}:checked`).length
    $selectAll.prop('checked', all > 0 && all === checked)
  })
}

// Render Input DataTable
const inputRenderer = (field) => {
  return (data, type, row) => {
    if (type === 'display') {
      return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="${field}" value="${data || ''}">`
    }
    return data
  }
}

// GET DATA AJAX
function getData(module, suffix = '', callback) {
  if (typeof suffix === 'function') {
    callback = suffix
    suffix = ''
  }

  $.ajax({
    url: `/api/${module}${suffix ? `/${suffix}` : ''}`,
    method: 'GET',
    success: function (res) {
      if (res.success && typeof callback === 'function') {
        callback(res.data)
      } else {
        toastr.error('Không tải được dữ liệu')
      }
    },
    error: function (xhr) {
      toastr.error(xhr.responseJSON?.message)
    }
  })
}

// Multi Fetch Data
function fetchData(endpoint) {
  return new Promise((resolve, reject) => {
    getData(endpoint, function (data) {
      if (data) resolve(data)
      else reject(new Error('Không thể tải dữ liệu'))
    })
  })
}

// Create New Record
function createNewRecord(module, data, callback) {
  const csrfToken = $('#_csrf').val()
  $.ajax({
    url: `/api/${module}/create`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    headers: { 'x-csrf-token': csrfToken },
    success: function (res) {
      if (res.success && typeof callback === 'function') {
        callback(res.data)
      } else {
        toastr.error(res.message || 'Không thể tạo bản ghi mới')
      }
    },
    error: function (xhr) {
      toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
    }
  })
}

function setupBackButton(btnSelector = '#btn-back') {
  const btn = document.querySelector(btnSelector)
  if (!btn) return

  const from = new URLSearchParams(window.location.search).get('from')
  if (from === 'history') {
    btn.href = '/inventory/stock-histories'
    return
  }

  const path = window.location.pathname
  if (path.includes('/stock-entry/')) {
    btn.href = '/inventory/stock-entries'
  } else if (path.includes('/stock-issue/')) {
    btn.href = '/inventory/stock-issues'
  } else if (path.includes('/stock-transfer/')) {
    btn.href = '/inventory/stock-transfers'
  }
}

/**
 * Hiển thị modal xác nhận (Confirm Modal).
 *
 * @param {Object} options - Các tùy chọn cấu hình cho modal.
 * @param {string} [options.title='Xác nhận'] - Tiêu đề của modal.
 * @param {string} [options.message=''] - Nội dung hiển thị trong modal.
 * @param {string} [options.confirmed='Xóa'] - Nội dung nút xác nhận (OK button).
 * @param {Function|null} [options.onConfirm=null] - Callback sẽ được gọi khi người dùng bấm nút xác nhận.
 *
 * @example
 * showConfirmModal({
 *   title: 'Xóa bản ghi',
 *   message: 'Bạn có chắc chắn muốn xóa bản ghi này?',
 *   confirmed: 'Đồng ý',
 *   onConfirm: function () {
 *     // Logic xóa ở đây
 *   }
 * })
 */

function showConfirmModal(options) {
  const settings = $.extend(
    {
      title: 'Xác nhận',
      message: '',
      confirmed: '',
      onConfirm: null
    },
    options
  )

  $('#confirmModalTitle').text(settings.title)
  $('#confirmModalOk').text(settings.confirmed || 'Xóa')
  $('#confirmModalBody').html(settings.message)

  const $okBtn = $('#confirmModalOk')
  $okBtn.off('click').on('click', function () {
    if (typeof settings.onConfirm === 'function') settings.onConfirm()
    const modal = bootstrap.Modal.getInstance(
      document.getElementById('confirmModal')
    )
    modal.hide()
  })

  const modal = new bootstrap.Modal(document.getElementById('confirmModal'))
  modal.show()
}

/**
 * Cập nhật giao diện container chứa ảnh sau khi upload thành công
 * @param {jQuery} imgCell - Ô (cell) trong bảng chứa phần tử ảnh
 * @param {string} imgUrl - URL ảnh mới sau khi upload
 */
function updateImageContainerAfterUpload(imgCell, imgUrl) {
  // Lấy phần tử container chứa ảnh bên trong ô
  const container = imgCell.find('.table-image-container')

  // Lấy thẻ <img> trong container
  const img = container.find('img')

  // Lấy lớp overlay (lớp phủ) trên ảnh để hiển thị các nút thao tác
  const overlay = container.find('.image-overlay')

  // Bỏ class "no-image" nếu trước đó là trạng thái chưa có ảnh
  container.removeClass('no-image')
  img.removeClass('no-image')
  overlay.removeClass('no-image').addClass('has-image')

  // Cập nhật đường dẫn ảnh mới hoặc dùng ảnh mặc định nếu không có URL
  img.attr('src', imgUrl || '/assets/images/default.png')

  // Tạo nút xem ảnh (preview)
  const previewBtn = `
      <button type="button" class="btn btn-outline-light btn-sm me-1 preview-btn" title="Xem ảnh">
        <i class="bi bi-eye"></i>
      </button>`

  // Tạo nút chọn lại ảnh (upload mới)
  const uploadBtn = `
      <button type="button" class="btn btn-outline-light btn-sm upload-btn" title="Chọn ảnh mới">
        <i class="bi bi-arrow-repeat"></i>
      </button>`

  // Gắn 2 nút vào overlay (nút xem ảnh + nút chọn lại ảnh)
  overlay.html(previewBtn + uploadBtn)
}

/**
 * Thiết lập "watcher" cho nút Lưu:
 * - Khi form có thay đổi => bật nút Lưu
 * - Khi lưu thành công => disable nút, đổi text thành "Đã lưu"
 *
 * @param {string} formSelector - Selector của form cần theo dõi
 * @param {string} saveBtnSelector - Selector của nút Lưu
 * @returns {function} Hàm disableSave để gọi khi lưu thành công
 */
function setupSaveButtonWatcher(formSelector, saveBtnSelector) {
  const $form = $(formSelector) // Lấy form theo selector
  const $saveBtn = $(saveBtnSelector) // Lấy nút Lưu theo selector

  // Hàm disableSave: dùng khi lưu thành công
  // - Disable nút Lưu
  // - Đổi text thành "Đã lưu"
  function disableSave() {
    $saveBtn
      .prop('disabled', true)
      .html('<i class="bi bi-check-circle me-2"></i>Đã lưu')
  }

  // Hàm enableSave: dùng khi có thay đổi dữ liệu
  // - Bật lại nút Lưu
  // - Đổi text về "Lưu phiếu"
  function enableSave() {
    $saveBtn
      .prop('disabled', false)
      .html('<i class="bi bi-check-circle me-2"></i>Lưu phiếu')
  }

  // Lắng nghe sự kiện thay đổi dữ liệu trong form
  // Bất kỳ input, select hoặc textarea nào thay đổi => enableSave
  $form.on('input change', 'input, select, textarea', enableSave)

  // Khi click nút "Thêm dòng nguyên liệu" => bật nút Lưu
  $(document).on('click', `${formSelector} .addItemBtn`, enableSave)

  // Khi click nút "Xóa dòng nguyên liệu" => bật nút Lưu
  $(document).on('click', `${formSelector} .remove-item-btn`, enableSave)

  // Trả về hàm disableSave để có thể gọi sau khi lưu thành công
  return disableSave
}
