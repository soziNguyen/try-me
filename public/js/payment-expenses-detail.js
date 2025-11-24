$(function () {
  const csrfToken = $('#_csrf').val()
  const paymentExpenseId = window.location.pathname.split('/').pop()

  // === Elements ===
  const $btnBack = $('#btn-back')
  const $btnPrint = $('#btn-print')
  const $btnSave = $('#btn-save-expense')

  // === Khởi tạo phiếu chi ===
  if (paymentExpenseId) {
    loadPaymentExpense(paymentExpenseId)
  } else {
    initNewExpenseForm()
  }

  // === Functions ===
  function loadPaymentExpense(id) {
    $.ajax({
      url: `/api/payment-expenses/${id}`,
      method: 'GET',
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success && res.data?.productExpense) {
          populatePaymentExpenseForm(res.data.productExpense)
        } else {
          toastr.error(res.message || 'Không thể load phiếu chi')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi hệ thống')
      }
    })
  }

  function initNewExpenseForm() {
    $('#code').val(`PC-${Date.now()}`)
    $('#date').val(new Date().toLocaleDateString('vi-VN'))
    $('#warehouse').val($('#defaultWarehouse').val() || '')
    $('#createdBy').val($('#currentUser').text() || '')
  }

  function populatePaymentExpenseForm(expense) {
    $('#code').val(expense.code || '')
    $('#date').val(expense.date ? new Date(expense.date).toLocaleDateString('vi-VN') : '')
    $('#warehouse').val(expense.warehouse?.name || '')
    $('#createdBy').val(expense.createdBy?.username || '')
    $('#reason').val(expense.reason || '')
    $('#expenseAmount').val(expense.expenseAmount || '')
    $('#note').val(expense.note || '')
    $('#receiver').val(expense.receiver || '')
    $('#reviewer').val(expense.reviewer || '')
  }

  function savePaymentExpense() {
    const expenseAmount = parseFloat($('#expenseAmount').val()) || 0

    if (expenseAmount <= 0) {
      toastr.warning('Số tiền phiếu chi phải lớn hơn 0')
      return
    }

    const payload = {
      code: $('#code').val(),
      date: $('#date').val(),
      warehouse: $('#warehouse').val(),
      reason: $('#reason').val(),
      note: $('#note').val(),
      expenseAmount,
      receiver: $('#receiver').val(),
      reviewer: $('#reviewer').val()
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
          setTimeout(() => (window.location.href = '/payment-expenses'), 1500)
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra khi lưu phiếu chi')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Có lỗi hệ thống')
      }
    })
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

  $btnSave.on('click', (e) => {
    e.preventDefault()
    savePaymentExpense()
  })
})
