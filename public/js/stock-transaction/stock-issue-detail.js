$(function () {
  let ingredients = []
  let stockIssueId = null
  let units = []
  let itemCounter = 1
  let stockIssue = null
  const disableStockIssueSave = setupSaveButtonWatcher('#stockIssueForm', '#btn-save-issue')
  const csrfToken = $('#_csrf').val()

  // Lấy stockIssueId từ URL
  const urlPath = window.location.pathname.split('/').pop()
  if (urlPath) {
    stockIssueId = urlPath
  }

  // Load dữ liệu ban đầu
  Promise.all([
    fetchData('inventory/ingredient/all'),
    stockIssueId ? fetchData(`inventory/stock-issue/${stockIssueId}`) : Promise.resolve(null)
  ])
    .then(([ings, stockIssueRes]) => {
      ingredients = ings
      units = stockIssueRes.units

      initForm()
      if (stockIssueRes) {
        stockIssue = stockIssueRes.stockIssue
        populateForm(stockIssue, stockIssue.warehouse?.name)
      }
    })
    .catch((err) => {
      toastr.error('Không thể load dữ liệu cần thiết')
    })

  function initForm() {
    if ($('#itemsTableBody tr').length === 0) {
      addNewItem()
    }

    $('.select2-ingredient').each(function () {
      initSelect2($(this), '— Chọn nguyên liệu —')
    })

    $('.select2-units').each(function () {
      initSelect2($(this), '— Chọn —')
    })

    // Event handlers
    $('#addItemBtn').on('click', addNewItem)
    $('#stockIssueForm').on('submit', saveStockIssue)

    $('#btn-lock-issue').on('click', function () {
      showConfirmModal({
        title: 'Khóa phiếu',
        message:
          'Bạn có chắc chắn muốn khóa phiếu này? Sau khi khóa sẽ không thể chỉnh sửa hoặc xóa.',
        confirmed: 'Khóa',
        onConfirm: function () {
          $.ajax({
            url: `/api/inventory/stock-issue/lock/${stockIssueId}`,
            method: 'POST',
            headers: { 'x-csrf-token': csrfToken },
            beforeSend: function () {
              $('#btn-lock-issue').prop('disabled', true).text('Đang khóa...')
            },
            success(res) {
              if (res.success && res.data.isLocked) {
                toastr.success('Phiếu xuất đã được khóa thành công')
                $('#btn-lock-issue')
                  .prop('disabled', true)
                  .html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)

                $('#stockIssueForm')
                  .find('input, select, textarea, button')
                  .not('#btn-lock-issue, #btn-print')
                  .add('#btn-save-issue, #addItemBtn')
                  .prop('disabled', true)
              } else {
                toastr.error(res.message || 'Có lỗi xảy ra')
                $('#btn-lock-issue').prop('disabled', false).text('Khóa phiếu')
              }
            },
            error(xhr) {
              const msg = xhr.responseJSON?.message || 'Lỗi hệ thống'
              toastr.error(msg)
              $('#btn-lock-issue').prop('disabled', false).text('Khóa phiếu')
            }
          })
        }
      })
    })

    // Remove item handler
    $(document).on('click', '.remove-item-btn', function () {
      const $row = $(this).closest('tr')
      const $tbody = $('#itemsTableBody')
      if ($tbody.find('tr').length <= 1) {
        toastr.warning('Phải có ít nhất 1 dòng để nhập liệu')
        return
      }
      $row.remove()
    })
  }

  function updateRowDropdowns(rowIndex) {
    const $select = $(`select[name="items[${rowIndex}][ingredient]"]`)

    const ingredientOptions = ingredients
      .map((ing) => `<option value="${ing._id}">${ing.name}</option>`)
      .join('')

    $select
      .empty()
      .html(
        '<option value="" class="text-center">— Chọn nguyên liệu —</option>' + ingredientOptions
      )

    const $unitSelect = $(`select[name="items[${rowIndex}][unit]"]`)
    if ($unitSelect.length) {
      const unitOptions = units.map((u) => `<option value="${u}">${u}</option>`).join('')

      $unitSelect
        .empty()
        .html('<option value="" class="text-center">— Chọn —</option>' + unitOptions)
    }
  }

  function addNewItem() {
    const newRow = `
    <tr>
      <td>
        <select class="select2-ingredient" name="items[${itemCounter}][ingredient]">
          <option value="" class="text-center">— Chọn nguyên liệu —</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][quantity]" min="0" step="1" placeholder="0">
      </td>
      <td>
        <select class="select2-units" name="items[${itemCounter}][unit]">
          <option value="" class="text-center">— Chọn —</option>
        </select>
      </td>
      <td class="text-center">
        <button type="button" class="btn btn-danger btn-sm remove-item-btn">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `
    $('#itemsTableBody').append(newRow)

    // Update dropdown options và init Select2
    const currentRowIndex = itemCounter
    updateRowDropdowns(currentRowIndex)

    const $newSelect = $(`select[name="items[${currentRowIndex}][ingredient]"]`)
    initSelect2($newSelect, '— Chọn nguyên liệu —')

    const $unitSelect = $(`select[name="items[${currentRowIndex}][unit]"]`)
    initSelect2($unitSelect, '— Chọn —')

    itemCounter++
  }

  function populateForm(stockIssue, defaultWarehouse) {
    $('#code').val(stockIssue.code || '')
    $('#date').val(formatDate(stockIssue.date) || '')
    $('#reason').val(stockIssue.reason || '')
    $('#warehouse')
      .val(defaultWarehouse || '')
      .trigger('change')
    $('#createdBy')
      .val(stockIssue.createdBy?.username || '')
      .data('id', stockIssue.createdBy?._id)
    $('#note').val(stockIssue.note || '')

    if (stockIssue.items && stockIssue.items.length > 0) {
      // Clear existing rows
      $('#itemsTableBody').empty()

      stockIssue.items.forEach((item, index) => {
        const row = `
        <tr>
          <td>
            <select class="select2-ingredient" name="items[${index}][ingredient]">
              <option value="" class="text-center">— Chọn nguyên liệu —</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][quantity]" 
              min="0" step="1" value="${item.quantity || ''}" placeholder="0">
          </td>
          <td>
            <select class="select2-units" name="items[${index}][unit]">
              <option value="" class="text-center">— Chọn —</option>
            </select>
          </td>
          <td class="text-center">
            <button type="button" class="btn btn-danger btn-sm remove-item-btn">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
        `
        $('#itemsTableBody').append(row)

        // Update dropdown options và set value
        updateRowDropdowns(index)

        const $sel = $(`select[name="items[${index}][ingredient]"]`)
        $sel.val(item.ingredient?._id || '')
        initSelect2($sel, '— Chọn nguyên liệu —')

        const $unit = $(`select[name="items[${index}][unit]"]`)
        $unit.val(item.unit || '')
        initSelect2($unit, '— Chọn —')
      })

      itemCounter = stockIssue.items.length
    }

    if (stockIssue?.isLocked) {
      $('#btn-lock-issue')
        .prop('disabled', true)
        .html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)

      $('#stockIssueForm')
        .find('input, select, textarea, button')
        .not('#btn-lock-issue, #btn-print')
        .add('#btn-save-issue, #addItemBtn')
        .prop('disabled', true)
    }
  }

  function saveStockIssue(e) {
    e.preventDefault()
    const csrfToken = $('#_csrf').val()

    // Kiểm tra kho đã chọn chưa
    const warehouseId = $('#warehouse').val()
    if (!warehouseId) {
      toastr.error('Vui lòng chọn kho xuất', 'Lỗi dữ liệu')
      return
    }

    const $rows = $('#itemsTableBody tr')
    const partialErrors = []

    // Kiểm tra từng dòng
    $rows.each(function (index) {
      const rowIndex = index + 1

      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = $(this).find('input[name*="[quantity]"]').val()
      const unit = $(this).find('select[name*="[unit]"]').val()

      const hasAnyValue = ingredientId || quantity
      const isComplete = ingredientId && quantity && parseFloat(quantity) > 0

      if (hasAnyValue && !isComplete) {
        const missingFields = []
        if (!ingredientId) missingFields.push('nguyên liệu')
        if (!quantity || parseFloat(quantity) <= 0) missingFields.push('số lượng hợp lệ')
        if (!unit) missingFields.push('đơn vị')

        partialErrors.push(`Dòng ${rowIndex} thiếu ${missingFields.join(', ')}`)
      }
    })

    // Nếu có lỗi dữ liệu từng dòng thì báo lỗi và dừng lại
    if (partialErrors.length) {
      toastr.error(partialErrors.join('<br/>'), 'Lỗi dữ liệu')
      return
    }

    // Loại bỏ những dòng hoàn toàn trống (nếu có nhiều hơn 1 dòng)
    if ($rows.length > 1) {
      $rows.each(function () {
        const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
        const quantity = $(this).find('input[name*="[quantity]"]').val()
        const unit = $(this).find('select[name*="[unit]"]').val()

        if (!ingredientId && !quantity && !unit) {
          $(this).remove()
        }
      })
    }

    // Thu thập dữ liệu từ form
    const formData = new FormData(this)
    const stockIssueData = {
      code: formData.get('code'),
      date: formData.get('date'),
      warehouse: warehouseId,
      reason: formData.get('reason'),
      note: formData.get('note'),
      items: []
    }

    if (!stockIssueId) {
      stockIssueData.createdBy = $('#createdBy').data('id') || '<%= currentUserId %>'
    }

    $('#itemsTableBody tr').each(function () {
      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val())
      const unit = $(this).find('select[name*="[unit]"]').val()

      if (ingredientId && quantity > 0 && unit) {
        stockIssueData.items.push({
          ingredient: ingredientId,
          quantity: quantity,
          unit: unit
        })
      }
    })

    if (!stockIssueData.reason) {
      toastr.remove()
      toastr.error('Vui lòng nhập lý do xuất kho', 'Lỗi dữ liệu')
      return
    }

    if (stockIssueData.items.length === 0) {
      toastr.remove()
      toastr.error('Phải có ít nhất 1 dòng nguyên liệu hợp lệ', 'Lỗi dữ liệu')
      return
    }

    // Gửi AJAX
    const url = stockIssueId
      ? `/api/inventory/stock-issue/update/${stockIssueId}`
      : '/api/inventory/stock-issue/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(stockIssueData),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.remove()
          toastr.success(res.message || 'Lưu phiếu xuất thành công')
          disableStockIssueSave()
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Có lỗi xảy ra khi lưu')
      }
    })
  }
  setupBackButton()
})
