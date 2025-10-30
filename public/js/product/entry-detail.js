$(function () {
  let menuItems = []
  let combos = []
  let units = []
  let productEntryId = null
  let itemCounter = 0
  let productEntry = null
  const disableProductEntrySave = setupSaveButtonWatcher('#productEntryForm', '#btn-save-entry')
  const csrfToken = $('#_csrf').val()

  // Lấy productEntryId từ URL
  productEntryId = window.location.pathname.split('/').pop()

  // Load dữ liệu ban đầu
  Promise.all([
    fetchData('menu/get/active'),
    fetchData('menu/combos/active'),
    productEntryId ? fetchData(`product/entry/${productEntryId}`) : Promise.resolve(null)
  ])
    .then(([menuRes, comboRes, productEntryRes]) => {
      menuItems = menuRes || []
      combos = comboRes || []
      units = productEntryRes?.units || []

      initForm()
      if (productEntryRes) {
        productEntry = productEntryRes.productEntry

        populateForm(productEntry, productEntry.warehouse?.name)
      }
    })
    .catch((err) => {
      console.error('Error loading initial data:', err)
      toastr.error('Không thể load dữ liệu cần thiết')
    })

  function initForm() {
    if ($('#itemsTableBody tr').length === 0) {
      addNewItem()
    }

    $('.select2-product').each(function () {
      initSelect2($(this), '— Chọn sản phẩm —')
    })

    $('.select2-units').each(function () {
      initSelect2($(this), '— Chọn —')
    })

    // Event handlers
    $('#addItemBtn').on('click', addNewItem)
    $('#productEntryForm').on('submit', saveStockEntry)
    $('#btn-lock-entry').on('click', function () {
      showConfirmModal({
        title: 'Khóa phiếu',
        message:
          'Bạn có chắc chắn muốn khóa phiếu này? Sau khi khóa sẽ không thể chỉnh sửa hoặc xóa.',
        confirmed: 'Khóa',
        onConfirm: function () {
          $.ajax({
            url: `/api/product/entry/lock/${productEntryId}`,
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

                // Input và textarea: readonly
                $('#productEntryForm').find('input, textarea').prop('readonly', true)

                // Select và button: disabled
                $('#productEntryForm')
                  .find('select, button')
                  .not('#btn-lock-entry, #btn-print, #btn-back')
                  .add('#btn-save-entry, #addItemBtn')
                  .prop('disabled', true)
              } else {
                toastr.error(res.message || 'Có lỗi xảy ra')
                $('#btn-lock-entry')
                  .prop('disabled', false)
                  .html(`<i class="bi bi-lock me-1"></i>Khóa phiếu`)
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
    const $select = $(`select[name="items[${rowIndex}][product]"]`)

    // Tạo optgroup cho MenuItem
    const menuItemOptions = menuItems
      .map((item) => `<option value="${item._id}" data-type="MenuItem">${item.name}</option>`)
      .join('')

    // Tạo optgroup cho Combo
    const comboOptions = combos
      .map((combo) => `<option value="${combo._id}" data-type="Combo">${combo.name}</option>`)
      .join('')

    const allOptions = `
      <option value="" class="text-center">— Chọn sản phẩm —</option>
      <optgroup label="Món ăn">
        ${menuItemOptions}
      </optgroup>
      <optgroup label="Combo">
        ${comboOptions}
      </optgroup>
    `

    $select.empty().html(allOptions)

    const $unitSelect = $(`select[name="items[${rowIndex}][unit]"]`)
    if ($unitSelect.length) {
      const unitOptions = units.map((u) => `<option value="${u}">${u}</option>`).join('')

      $unitSelect
        .empty()
        .html('<option value="" class="text-center">— Chọn —</option>' + unitOptions)
    }
  }

  function addNewItem() {
    const currentIndex = itemCounter
    const newRow = `
    <tr>
      <td>
        <select class="select2-product" name="items[${currentIndex}][product]">
          <option value="" class="text-center">— Chọn sản phẩm —</option>
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

    const $newSelect = $(`select[name="items[${currentIndex}][product]"]`)
    initSelect2($newSelect, '— Chọn sản phẩm —')

    const $unitSelect = $(`select[name="items[${currentIndex}][unit]"]`)
    initSelect2($unitSelect, '— Chọn —')

    itemCounter++
  }

  function calculateRowTotal() {
    const row = $(this).closest('tr')
    const quantity = parseFloat(row.find('input[name*="[quantity]"]').val()) || 0
    const unitPrice = parseFloat(row.find('input[name*="[unitPrice]"]').val()) || 0
    const total = quantity * unitPrice

    row.find('input[readonly]').val(total ? total.toLocaleString('vi-VN') + ' ₫' : '0')
    calculateTotals()
  }

  function calculateTotals() {
    let subtotal = 0
    $('#itemsTableBody tr').each(function () {
      const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val()) || 0
      const unitPrice = parseFloat($(this).find('input[name*="[unitPrice]"]').val()) || 0
      subtotal += quantity * unitPrice
    })

    $('#totalAmount').text(subtotal.toLocaleString('vi-VN') + ' ₫')
  }

  function populateForm(productEntry, defaultWarehouse) {
    $('#code').val(productEntry.code || '')
    $('#date').val(formatDate(productEntry.date) || '')
    $('#supplier')
      .val(productEntry.supplier?._id || '')
      .trigger('change')
    $('#warehouse').val(defaultWarehouse)
    $('#createdBy')
      .val(productEntry.createdBy?.username || '')
      .data('id', productEntry.createdBy?._id)
    $('#note').val(productEntry.note || '')

    if (productEntry.items && productEntry.items.length > 0) {
      // Clear existing rows
      $('#itemsTableBody').empty()

      productEntry.items.forEach((item, index) => {
        const row = `
        <tr>
          <td>
            <select class="select2-product" name="items[${index}][product]">
              <option value="" class="text-center">— Chọn sản phẩm —</option>
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

        const $sel = $(`select[name="items[${index}][product]"]`)
        const productVal = item.product?._id || item.product || ''
        const productType = item.productType || 'MenuItem'

        // Set data-type attribute cho option được chọn
        $sel.find(`option[value="${productVal}"]`).attr('data-type', productType)
        $sel.val(productVal).trigger('change')
        initSelect2($sel, '— Chọn sản phẩm —')

        const $unit = $(`select[name="items[${index}][unit]"]`)
        const unitVal = item.unit?._id || item.unit || ''
        $unit.val(unitVal).trigger('change')
        initSelect2($unit, '— Chọn —')
      })

      itemCounter = productEntry.items.length
      calculateTotals()
    }

    if (productEntry?.isLocked) {
      $('#btn-lock-entry')
        .prop('disabled', true)
        .html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)

      // Input và textarea: thêm readonly
      $('#productEntryForm').find('input, textarea').prop('readonly', true)

      // Select và button: disable
      $('#productEntryForm')
        .find('select, button')
        .not('#btn-lock-entry, #btn-print, #btn-back')
        .add('#btn-save-entry, #addItemBtn')
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

      const productId = $(this).find('select[name*="[product]"]').val()
      const quantity = $(this).find('input[name*="[quantity]"]').val()
      const unit = $(this).find('select[name*="[unit]"]').val()
      const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()

      const hasAnyValue = productId || quantity || unitPrice || unit
      const isComplete = productId && quantity && unitPrice && unit

      if (hasAnyValue && !isComplete) {
        const missingFields = []
        if (!productId) missingFields.push('sản phẩm')
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
        const productId = $(this).find('select[name*="[product]"]').val()
        const quantity = $(this).find('input[name*="[quantity]"]').val()
        const unit = $(this).find('select[name*="[unit]"]').val()
        const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()

        if (!productId && !quantity && !unitPrice && !unit) {
          $(this).remove()
        }
      })
    }

    // Thu thập dữ liệu từ form
    const formData = new FormData(e.target)
    const productEntryData = {
      code: formData.get('code'),
      date: formData.get('date'),
      warehouse: formData.get('warehouse'),
      note: formData.get('note'),
      items: []
    }

    if (!productEntryId) {
      productEntryData.createdBy = $('#createdBy').data('id') || '<%= currentUserId %>'
    }

    let subTotal = 0
    $('#itemsTableBody tr').each(function () {
      const $select = $(this).find('select[name*="[product]"]')
      const productId = $select.val()
      const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val())
      const unit = $(this).find('select[name*="[unit]"]').val()
      const unitPrice = parseFloat($(this).find('input[name*="[unitPrice]"]').val())

      if (productId && quantity && unitPrice) {
        const itemTotal = quantity * unitPrice
        subTotal += itemTotal

        // Lấy productType từ data-type của option được chọn
        const productType = $select.find('option:selected').data('type') || 'MenuItem'

        productEntryData.items.push({
          productType,
          product: productId,
          quantity,
          unit,
          unitPrice,
          total: itemTotal
        })
      }
    })

    if (productEntryData.items.length === 0) {
      toastr.remove()
      toastr.error('Phải có ít nhất 1 dòng nguyên liệu hợp lệ', 'Lỗi dữ liệu')
      return
    }

    // Gửi AJAX
    const url = productEntryId
      ? `/api/product/entry/update/${productEntryId}`
      : '/api/product/entry/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(productEntryData),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.remove()
          toastr.success(res.message || 'Lưu phiếu nhập thành công')
          disableProductEntrySave()
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Có lỗi xảy ra khi lưu')
      }
    })
  }

  $('#btn-back').on('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    const url = window.location.pathname
    if (url.includes('product')) {
      window.location.href = '/product/entries'
    }
  })
})
