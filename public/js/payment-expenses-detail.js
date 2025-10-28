$(function () {
  // === Biến và selector ===
  const csrfToken = $('#_csrf').val()
  let paymentExpenseId = window.location.pathname.split('/').pop()
  let paymentExpense = null
  let expenseItemCounter = 0

  const $btnBack = $('#btn-back')
  const $btnPrint = $('#btn-print')
  const $btnSave = $('#btn-save-expense')
  const $expenseItemsBody = $('#expenseItemsBody')

  // === Khởi tạo phiếu chi ===
  if (paymentExpenseId) {
    $.ajax({
      url: `/api/payment-expenses/${paymentExpenseId}`,
      method: 'GET',
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success && res.data?.productExpense) {
          paymentExpense = res.data.productExpense
          populatePaymentExpenseForm(paymentExpense)
        } else {
          toastr.error(res.message || 'Không thể load phiếu chi')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi hệ thống')
      }
    })
  } else {
    $('#code').val(`PC-${Date.now()}`)
    $('#date').val(new Date().toLocaleDateString('vi-VN'))
    $('#warehouse').val($('#defaultWarehouse').val() || '')
    $('#createdBy').val($('#currentUser').text() || '')
    addExpenseRow()
  }

  // === Hàm render row ===
  function createExpenseRow(item = {}) {
    const index = expenseItemCounter++
    return `
      <tr>
        <td><input type="text" class="form-control form-control-sm" name="expenseItems[${index}][productName]" value="${item.name || ''}" placeholder="Tên sản phẩm"></td>
        <td><input type="number" class="form-control form-control-sm" name="expenseItems[${index}][price]" value="${item.unitPrice || ''}" min="0" step="0.1" placeholder="0"></td>
        <td><input type="number" class="form-control form-control-sm" name="expenseItems[${index}][quantity]" value="${item.quantity || ''}" min="1" step="1" placeholder="0"></td>
        <td><input type="text" class="form-control form-control-sm" name="expenseItems[${index}][total]" value="${item.total || ''}" placeholder="0" readonly></td>
        <td class="text-center">
          <button type="button" class="btn btn-danger btn-sm remove-expense-item-btn"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `
  }

  function populatePaymentExpenseForm(expense) {
    $('#code').val(expense.code || '')
    $('#date').val(expense.date ? new Date(expense.date).toLocaleDateString('vi-VN') : '')
    $('#warehouse').val(expense.warehouse?.name || '')
    $('#createdBy').val(expense.createdBy?.username || '')
    $('#reason').val(expense.reason || '')

    $expenseItemsBody.empty()
    expenseItemCounter = 0

    if (expense.items?.length) {
      expense.items.forEach((item) => $expenseItemsBody.append(createExpenseRow(item)))
    } else {
      addExpenseRow()
    }
    calculateTotalExpense()
  }

  function addExpenseRow() {
    $expenseItemsBody.append(createExpenseRow())
  }

  function calculateTotalExpense() {
    let total = 0
    $expenseItemsBody.find('tr').each(function () {
      const price = parseFloat($(this).find('input[name*="[price]"]').val()) || 0
      const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val()) || 0
      total += price * quantity
    })
    $('#totalExpenseAmount').text(total.toLocaleString('vi-VN') + ' ₫')
  }

  // === Event handlers ===
  $btnBack.on('click', (e) => {
    e.preventDefault()
    window.location.href = '/payment-expenses'
  })
  $btnPrint.on('click', (e) => {
    e.preventDefault()
    window.print()
  })
  $btnSave.on('click', function (e) {
    e.preventDefault()

    const items = []
    $expenseItemsBody.find('tr').each(function () {
      const $row = $(this)
      const price = parseFloat($row.find('input[name*="[price]"]').val()) || 0
      const quantity = parseFloat($row.find('input[name*="[quantity]"]').val()) || 0
      items.push({
        name: $row.find('input[name*="[productName]"]').val(),
        unitPrice: price,
        quantity,
        total: price * quantity
      })
    })

    const payload = {
      code: $('#code').val(),
      date: $('#date').val(),
      warehouse: $('#warehouse').val(),
      createdBy: $('#createdBy').val(),
      reason: $('#reason').val(),
      items
    }

    const url = paymentExpenseId
      ? `/api/payment-expenses/update/${paymentExpenseId}`
      : '/api/payment-expenses/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.success(res.message || 'Lưu phiếu chi thành công')
          $btnSave.prop('disabled', true).html('<i class="bi bi-check-circle me-2"></i>Đã lưu')
          setTimeout(() => (window.location.href = '/payment-expenses'), 800)
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra khi lưu phiếu chi')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Có lỗi hệ thống')
      }
    })
  })

  $('#addExpenseItemBtn').on('click', addExpenseRow)

  $(document).on('click', '.remove-expense-item-btn', function () {
    if ($expenseItemsBody.find('tr').length <= 1) {
      toastr.warning('Phải có ít nhất 1 dòng chi!')
      return
    }
    $(this).closest('tr').remove()
    calculateTotalExpense()
  })

  $(document).on('input', 'input[name*="[price]"], input[name*="[quantity]"]', function () {
    const $row = $(this).closest('tr')
    const price = parseFloat($row.find('input[name*="[price]"]').val()) || 0
    const quantity = parseFloat($row.find('input[name*="[quantity]"]').val()) || 0
    $row.find('input[name*="[total]"]').val((price * quantity).toLocaleString('vi-VN'))
    calculateTotalExpense()
  })
})
//=======================
