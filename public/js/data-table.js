// Handle EventListener

function handlerAddEvent(tableSelector, btnSelector, module) {
  const $wrapper = $(`${tableSelector}_wrapper`)
  const table = $(tableSelector).DataTable()

  $wrapper.on('click', btnSelector, function () {
    const $btn = $(this).prop('disabled', true)

    $.ajax({
      url: `/api/${module}/create`,
      method: 'POST',
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

  $wrapper.on('click', btnSelector, function () {
    const $btn = $(this) // chưa disable ngay
    const selected = $wrapper.find(`.${checkboxClass}:checked`).map((_, el) => $(el).data('id')).get()

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
    if ($(e.target).is(`input[type=checkbox], img, input[type=text], input[type=number], select, button, span, .dataInput, i, td:nth-child(n+2)`)) return
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
  $.ajax({
    url: `/api/${module}/create`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
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

function showConfirmModal(options) {
  const settings = $.extend({
    title: 'Xác nhận',
    message: '',
    confirmed: '',
    onConfirm: null
  }, options)

  $('#confirmModalTitle').text(settings.title)
  $('#confirmModalOk').text(settings.confirmed || 'Xóa')
  $('#confirmModalBody').html(settings.message)

  const $okBtn = $('#confirmModalOk')
  $okBtn.off('click').on('click', function() {
    if (typeof settings.onConfirm === 'function') settings.onConfirm()
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'))
    modal.hide()
  })

  const modal = new bootstrap.Modal(document.getElementById('confirmModal'))
  modal.show()
}


function setupSaveButtonWatcher(formSelector, saveBtnSelector) {
  const $form = $(formSelector)
  const $saveBtn = $(saveBtnSelector)

  // Sau khi lưu thành công thì disable nút, đổi text thành "Đã lưu"
  function disableSave() {
    $saveBtn.prop("disabled", true).html('<i class="bi bi-check-circle me-2"></i>Đã lưu')
  }

  // Khi có thay đổi trong form thì bật lại nút
  function enableSave() {
    $saveBtn.prop("disabled", false).html('<i class="bi bi-check-circle me-2"></i>Lưu phiếu')
  }

  // Bất kỳ thay đổi nào trên input/select/textarea
  $form.on("input change", "input, select, textarea", enableSave)

  // Khi thêm dòng nguyên liệu
  $(document).on("click", `${formSelector} .addItemBtn`, enableSave)

  // Khi xóa dòng nguyên liệu
  $(document).on("click", `${formSelector} .remove-item-btn`, enableSave)

  // Trả về hàm disableSave để gọi ở success(res)
  return disableSave
}
