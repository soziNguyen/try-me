$(function () {
  const csrfToken = $('#_csrf').val()
  const receiptId = window.location.pathname.split('/').pop()

  // === Elements ===
  const $btnBack = $('#btn-back')
  const $btnPrint = $('#btn-print')
  const $btnSave = $('#btn-save-receipt')

  // === Khởi tạo phiếu thu ===
  if (receiptId) {
    loadReceipt(receiptId)
  } else {
    initNewReceiptForm()
  }

  // === Functions ===
  function loadReceipt(id) {
    $.ajax({
      url: `/api/payment-receipts/${id}`,
      method: 'GET',
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success && res.data?.receipt) {
          populateReceiptForm(res.data.receipt)
        } else {
          toastr.error(res.message || 'Không thể load phiếu thu')
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi hệ thống')
      }
    })
  }

  function initNewReceiptForm() {
    $('#code').val(`RC-${Date.now()}`)
    $('#date').val(new Date().toLocaleDateString('vi-VN'))
    $('#warehouse').val($('#defaultWarehouse').val() || '')
    $('#createdBy').val($('#currentUser').text() || '')
  }

  function populateReceiptForm(receipt) {
    $('#code').val(receipt.code || '')
    $('#date').val(receipt.date ? formatDate(receipt.date) : '')
    $('#warehouse').val(receipt.warehouse?.name || '')
    $('#createdBy').val(receipt.createdBy?.username || '')
    $('#reason').val(receipt.reason || '')
    $('#receiptAmount').val(receipt.receiptAmount || '')
    $('#note').val(receipt.note || '')
    $('#submitter').val(receipt.submitter || '')
    $('#reviewer').val(receipt.reviewer || '')
  }

  function saveReceipt() {
    const receiptAmount = parseFloat($('#receiptAmount').val()) || 0

    if (receiptAmount <= 0) {
      toastr.warning('Số tiền phiếu thu phải lớn hơn 0')
      return
    }

    const payload = {
      code: $('#code').val(),
      date: $('#date').val(),
      warehouse: $('#warehouse').val(),
      reason: $('#reason').val(),
      note: $('#note').val(),
      receiptAmount,
      submitter: $('#submitter').val(),
      reviewer: $('#reviewer').val()
    }

    const url = receiptId
      ? `/api/payment-receipts/update/${receiptId}`
      : '/api/payment-receipts/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.success(res.message || 'Lưu phiếu thu thành công')
          $btnSave.prop('disabled', true).html('<i class="bi bi-check-circle me-2"></i>Đã lưu')
          setTimeout(() => (window.location.href = '/payment-receipts'), 1500)
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra khi lưu phiếu thu')
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
    window.location.href = '/payment-receipts'
  })

  $btnSave.on('click', (e) => {
    e.preventDefault()
    saveReceipt()
  })
})
