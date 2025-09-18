$(function () {
  let suppliers = []
  let ingredients = []
  let warehouses = []
  let units = []
  let stockEntryId = null
  let itemCounter = 0
  let stockEntry = null
  const disableStockEntrySave = setupSaveButtonWatcher(
    '#stockEntryForm',
    '#btn-save-entry'
  )
  const csrfToken = $('#_csrf').val()

  // Lấy stockEntryId từ URL
  const urlPath = window.location.pathname
  const matches = urlPath.match(/\/inventory\/stock-entry\/([^\/?#]+)/)
  if (matches) {
    stockEntryId = matches[1]
  }

  // Load dữ liệu ban đầu
  Promise.all([
    fetchData('inventory/supplier/all'),
    fetchData('inventory/ingredient/all'),
    fetchData('inventory/warehouse/all'),
    stockEntryId
      ? fetchData(`inventory/stock-entry/${stockEntryId}`)
      : Promise.resolve(null)
  ])
    .then(([sups, ings, whs, stockEntryRes]) => {
      suppliers = sups || []
      ingredients = ings || []
      warehouses = whs || []
      units = stockEntryRes?.units || []

      initForm()
      if (stockEntryRes) {
        stockEntry = stockEntryRes.stockEntry
        populateForm(stockEntry)
      } else {
        const currentUserName = '<%= currentUserName %>'
        const currentUserId = '<%= currentUserId %>'
        $('#createdBy').val(currentUserName).data('id', currentUserId)
      }
    })
    .catch((err) => {
      // console.error("Error loading initial data:", err)
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

    // Populate suppliers dropdown
    const supplierOptions = suppliers
      .map((sup) => `<option value="${sup._id}">${sup.name}</option>`)
      .join('')
    const $supplierSelect = $('#supplier').html(
      '<option value="" class="text-center">— Chọn nhà cung cấp —</option>' +
      supplierOptions
    )
    initSelect2($supplierSelect, '— Chọn nhà cung cấp —')

    // Populate warehouses dropdown (main warehouse select)
    const warehouseOptions = warehouses
      .map(
        (wh) => `<option value="${wh._id}">${wh.name} - ${wh.location}</option>`
      )
      .join('')
    const $warehouseSelected = $('#warehouse').html(
      '<option value="" class="text-center">— Chọn kho —</option>' +
      warehouseOptions
    )

    initSelect2($warehouseSelected, '— Chọn kho —')

    // Event handlers
    $('#addItemBtn').on('click', addNewItem)
    $('#stockEntryForm').on('submit', saveStockEntry)
    $('#btn-lock-entry').on('click', function () {
      showConfirmModal({
        title: 'Khóa phiếu',
        message:
          'Bạn có chắc chắn muốn khóa phiếu này? Sau khi khóa sẽ không thể chỉnh sửa hoặc xóa.',
        confirmed: 'Khóa',
        onConfirm: function () {
          $.ajax({
            url: `/api/inventory/stock-entry/lock/${stockEntryId}`,
            method: 'POST',
            headers: { 'x-csrf-token': csrfToken },
            beforeSend: function () {
              $('#btn-lock-entry').prop('disabled', true).text('Đang khóa...')
            },
            success(res) {
              if (res.success && res.data.isLocked) {
                toastr.success('Phiếu nhập đã được khóa thành công')
                $('#btn-lock-entry')
                  .prop('disabled', true)
                  .html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)

                $('#stockEntryForm')
                  .find('input, select, textarea, button')
                  .not('#btn-lock-entry, #btn-print')
                  .add('#btn-save-entry, #addItemBtn, #supplier, #warehouse')
                  .prop('disabled', true)
              } else {
                toastr.error(res.message || 'Có lỗi xảy ra')
                $('#btn-lock-entry').prop('disabled', false).text('Khóa phiếu')
              }
            },
            error(xhr) {
              const msg = xhr.responseJSON?.message || 'Lỗi hệ thống'
              toastr.error(msg)
              $('#btn-lock-entry').prop('disabled', false).text('Khóa phiếu')
            }
          })
        }
      })
    })

    // Auto calculate totals
    $(document).on(
      'input',
      'input[name*="[quantity]"], input[name*="[unitPrice]"]',
      calculateRowTotal
    )
    $(document).on('click', '.remove-item-btn', function () {
      const $row = $(this).closest('tr')
      const $tbody = $('#itemsTableBody')
      if ($tbody.find('tr').length <= 1) {
        toastr.warning('Phải có ít nhất 1 dòng để nhập liệu')
        return
      }
      $row.remove()
      calculateTotals()
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
        '<option value="" class="text-center">— Chọn nguyên liệu —</option>' +
        ingredientOptions
      )

    const $unitSelect = $(`select[name="items[${rowIndex}][unit]"]`)
    if ($unitSelect.length) {
      const unitOptions = units
        .map((u) => `<option value="${u}">${u}</option>`)
        .join('')

      $unitSelect
        .empty()
        .html(
          '<option value="" class="text-center">— Chọn —</option>' + unitOptions
        )
    }
  }

  function addNewItem() {
    const currentIndex = itemCounter
    const newRow = `
    <tr>
      <td>
        <select class="select2-ingredient" name="items[${currentIndex}][ingredient]">
          <option value="" class="text-center">— Chọn nguyên liệu —</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${currentIndex}][quantity]" min="0" step="0.1" placeholder="0">
      </td>
      <td>
        <select class="select2-units" name="items[${currentIndex}][unit]">
          <option value="" class="text-center">— Chọn —</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${currentIndex}][unitPrice]" min="0" step="0.1" placeholder="0">
      </td>
      <td>
        <input type="text" class="form-control form-control-sm" readonly placeholder="0">
      </td>
      <td class="text-center">
        <button type="button" class="btn btn-danger btn-sm remove-item-btn">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `
    $('#itemsTableBody').append(newRow)

    // populate dropdown options
    updateRowDropdowns(currentIndex)

    const $newSelect = $(`select[name="items[${currentIndex}][ingredient]"]`)
    initSelect2($newSelect, '— Chọn nguyên liệu —')

    const $unitSelect = $(`select[name="items[${currentIndex}][unit]"]`)
    initSelect2($unitSelect, '— Chọn —')

    itemCounter++
  }

  function calculateRowTotal() {
    const row = $(this).closest('tr')
    const quantity =
      parseFloat(row.find('input[name*="[quantity]"]').val()) || 0
    const unitPrice =
      parseFloat(row.find('input[name*="[unitPrice]"]').val()) || 0
    const total = quantity * unitPrice

    row
      .find('input[readonly]')
      .val(total ? total.toLocaleString('vi-VN') + ' ₫' : '0')
    calculateTotals()
  }

  function calculateTotals() {
    let subtotal = 0
    $('#itemsTableBody tr').each(function () {
      const quantity =
        parseFloat($(this).find('input[name*="[quantity]"]').val()) || 0
      const unitPrice =
        parseFloat($(this).find('input[name*="[unitPrice]"]').val()) || 0
      subtotal += quantity * unitPrice
    })

    const tax = Math.round(subtotal * 0.08) // 8%
    const total = subtotal + tax

    // Update giao diện
    $('#subtotalAmount').text(subtotal.toLocaleString('vi-VN') + ' ₫')
    $('#taxAmount').text(tax.toLocaleString('vi-VN') + ' ₫')
    $('#totalAmount').text(total.toLocaleString('vi-VN') + ' ₫')
  }

  function populateForm(stockEntry) {
    $('#code').val(stockEntry.code || '')
    $('#date').val(formatDate(stockEntry.date) || '')
    $('#supplier')
      .val(stockEntry.supplier?._id || '')
      .trigger('change')
    $('#warehouse')
      .val(stockEntry.warehouse?._id || '')
      .trigger('change')
    $('#createdBy')
      .val(stockEntry.createdBy?.name || stockEntry.createdBy?.username || '')
      .data('id', stockEntry.createdBy?._id)
    $('#note').val(stockEntry.note || '')

    if (stockEntry.items && stockEntry.items.length > 0) {
      // Clear existing rows
      $('#itemsTableBody').empty()

      stockEntry.items.forEach((item, index) => {
        const row = `
        <tr>
          <td>
            <select class="select2-ingredient" name="items[${index}][ingredient]">
              <option value="" class="text-center">— Chọn nguyên liệu —</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][quantity]" 
              min="0" step="0.1" value="${item.quantity || ''}" placeholder="0">
          </td>
          <td>
            <select class="select2-units" name="items[${index}][unit]">
              <option value="" class="text-center">— Chọn —</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][unitPrice]" 
              min="0" step="0.1" value="${item.unitPrice || ''}" placeholder="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" readonly value="${(item.total || 0).toLocaleString('vi-VN') + ' ₫'}" placeholder="0">
          </td>
          <td class="text-center">
            <button type="button" class="btn btn-danger btn-sm remove-item-btn">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
        `
        $('#itemsTableBody').append(row)

        updateRowDropdowns(index)

        const $sel = $(`select[name="items[${index}][ingredient]"]`)
        const ingredientVal = item.ingredient?._id || item.ingredient || ''
        $sel.val(ingredientVal).trigger('change')
        initSelect2($sel, '— Chọn nguyên liệu —')

        const $unit = $(`select[name="items[${index}][unit]"]`)
        const unitVal = item.unit?._id || item.unit || ''
        $unit.val(unitVal).trigger('change')
        initSelect2($unit, '— Chọn —')
      })

      itemCounter = stockEntry.items.length
      calculateTotals()
    }

    if (stockEntry?.isLocked) {
      $('#btn-lock-entry')
        .prop('disabled', true)
        .html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)

      $('#stockEntryForm')
        .find('input, select, textarea, button')
        .not('#btn-lock-entry, #btn-print')
        .add('#btn-save-entry, #addItemBtn, #supplier, #warehouse')
        .prop('disabled', true)
    }
  }

  function saveStockEntry(e) {
    e.preventDefault()

    const $rows = $('#itemsTableBody tr')
    const partialErrors = []

    // Kiểm tra từng dòng
    $rows.each(function (index) {
      const rowIndex = index + 1

      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = $(this).find('input[name*="[quantity]"]').val()
      const unit = $(this).find('select[name*="[unit]"]').val()
      const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()

      const hasAnyValue = ingredientId || quantity || unitPrice || unit
      const isComplete = ingredientId && quantity && unitPrice && unit

      if (hasAnyValue && !isComplete) {
        const missingFields = []
        if (!ingredientId) missingFields.push('nguyên liệu')
        if (!quantity) missingFields.push('số lượng')
        if (!unit) missingFields.push('đơn vị')
        if (!unitPrice) missingFields.push('đơn giá')

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
        const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()

        if (!ingredientId && !quantity && !unitPrice && !unit) {
          $(this).remove()
        }
      })
    }

    // Thu thập dữ liệu từ form
    const formData = new FormData(e.target)
    const stockEntryData = {
      code: formData.get('code'),
      date: formData.get('date'),
      supplier: formData.get('supplier'),
      warehouse: formData.get('warehouse'),
      note: formData.get('note'),
      items: []
    }

    if (!stockEntryId) {
      stockEntryData.createdBy =
        $('#createdBy').data('id') || '<%= currentUserId %>'
    }

    let subTotal = 0
    $('#itemsTableBody tr').each(function () {
      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = parseFloat(
        $(this).find('input[name*="[quantity]"]').val()
      )
      const unit = $(this).find('select[name*="[unit]"]').val()
      const unitPrice = parseFloat(
        $(this).find('input[name*="[unitPrice]"]').val()
      )

      if (ingredientId && quantity && unitPrice) {
        const itemTotal = quantity * unitPrice
        subTotal += itemTotal

        stockEntryData.items.push({
          ingredient: ingredientId,
          quantity,
          unit,
          unitPrice,
          total: itemTotal
        })
      }
    })

    if (!stockEntryData.supplier) {
      toastr.remove()
      toastr.error('Vui lòng chọn nhà cung cấp', 'Lỗi dữ liệu')
      return
    }

    if (!stockEntryData.warehouse) {
      toastr.remove()
      toastr.error('Vui lòng chọn kho', 'Lỗi dữ liệu')
      return
    }

    if (stockEntryData.items.length === 0) {
      toastr.remove()
      toastr.error('Phải có ít nhất 1 dòng nguyên liệu hợp lệ', 'Lỗi dữ liệu')
      return
    }

    // ===== TÍNH TỔNG =====
    const taxRate = 0.08
    const taxAmount = subTotal * taxRate
    const grandTotal = subTotal + taxAmount

    stockEntryData.subTotal = subTotal
    stockEntryData.taxRate = taxRate
    stockEntryData.taxAmount = taxAmount
    stockEntryData.grandTotal = grandTotal

    // Gửi AJAX
    const url = stockEntryId
      ? `/api/inventory/stock-entry/update/${stockEntryId}`
      : '/api/inventory/stock-entry/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(stockEntryData),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.remove()
          toastr.success(res.message || 'Lưu phiếu nhập thành công')
          disableStockEntrySave()
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
