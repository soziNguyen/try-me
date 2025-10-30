$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#paymentMethodTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) showList.push(numRows)
  showList.sort((a, b) => a - b)

  const table = $('#paymentMethodTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    order: [[1, 'asc']],
    ajax: { url: '/api/admin/payment-methods', method: 'GET' },
    lengthMenu: [showList, showList],
    pageLength: numRows,
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ bản ghi mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ bản ghi)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    columnDefs: [{ width: '180px', targets: 4 }],
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        title: '<input type="checkbox" id="selectAll">',
        render: (data, type, row) =>
          `<input type="checkbox" class="paymentMethodCheckbox" data-id="${row._id}">`
      },
      {
        data: 'sortOrder',
        title: 'Thứ tự',
        className: 'text-center',
        render: (data, type) =>
          type === 'display'
            ? `<input type="number" class="dataInput border-0 text-center form-control" data-field="sortOrder" value="${data ?? 0}">`
            : data
      },
      {
        data: 'name',
        title: 'Tên hiển thị',
        render: (data, type) =>
          type === 'display'
            ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
            : data
      },
      {
        data: 'code',
        title: 'Mã',
        render: (data, type) =>
          type === 'display'
            ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="code" value="${data ?? ''}" readonly>`
            : data
      },
      {
        data: 'description',
        title: 'Mô tả',
        render: (data, type) => {
          if (type === 'display') {
            const text = data && data.length > 0 ? data : ''
            const shortText = text.length > 13 ? text.substring(0, 13) + '...' : text
            return `<span type="text" class="dataInput border-0 w-100 form-control" data-field="description">${shortText}</span>`
          }
          return data
        }
      },
      {
        data: 'icon',
        title: 'Icon',
        render: (data, type) =>
          type === 'display'
            ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="icon" value="${data ?? 'bi-credit-card'}">`
            : data
      },
      {
        data: 'isActive',
        title: 'Kích hoạt',
        className: 'text-center',
        render: (data, type, row) =>
          type === 'display'
            ? `<input type="checkbox" class="form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
            : data
      },
      {
        data: null,
        title: 'Thao tác',
        className: 'text-center',
        orderable: false,
        render: (data, type, row) =>
          type === 'display'
            ? `<button class="btn btn-sm btn-outline-primary updateBtn" data-id="${row._id}">
                <i class="bi bi-pencil-square"></i>
              </button>`
            : ''
      }
    ],
    rowCallback: (row, data) => $(row).attr('data-id', data._id),
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deletePaymentMethodBtn"><i class="bi bi-trash"></i> Xóa</button>
          <button class="btn btn-outline-success" id="addPaymentMethodBtn"><i class="bi bi-plus-circle"></i> Thêm</button>
        </div>
      `)

      $('#addPaymentMethodBtn').on('click', function () {
        $('#paymentMethodModalLabel').text('Thêm phương thức thanh toán')
        $('#paymentMethodForm')[0].reset()
        $('#paymentMethodId').val('')
        $('#pmCode').prop('readonly', false)
        new bootstrap.Modal(document.getElementById('paymentMethodModal')).show()
      })
    }
  })

  handlerDeleteEvent(
    '#paymentMethodTable',
    '#deletePaymentMethodBtn',
    'paymentMethodCheckbox',
    'payment-method'
  )
  handlerUpdateEvent('#paymentMethodTable', 'admin/payment-method')
  initTableCheckboxEvents('#paymentMethodTable', 'paymentMethodCheckbox')

  const csrfToken = $('#_csrf').val()

  // Nút cập nhật
  $('#paymentMethodTable').on('click', '.updateBtn', function () {
    const id = $(this).closest('tr').data('id')
    fetch(`/api/admin/payment-method/${id}`)
      .then((res) => res.json())
      .then((res) => {
        const pm = res.data
        $('#paymentMethodModalLabel').text('Cập nhật phương thức thanh toán')
        $('#paymentMethodId').val(pm._id)
        $('#pmName').val(pm.name)
        $('#pmCode').val(pm.code).prop('readonly', true)
        $('#pmDescription').val(pm.description)
        $('#pmIcon').val(pm.icon)
        $('#pmSortOrder').val(pm.sortOrder)
        $('#pmIsActive').prop('checked', pm.isActive)
        $('#pmBankCode').val(pm.bankInfo?.bankCode || '')
        $('#pmBankName').val(pm.bankInfo?.bankName || '')
        $('#pmAccountNumber').val(pm.bankInfo?.accountNumber || '')
        $('#pmAccountName').val(pm.bankInfo?.accountName || '')
        $('#pmBranchName').val(pm.bankInfo?.branchName || '')
        $('#pmConfig').val(JSON.stringify(pm.config || {}, null, 2))
        new bootstrap.Modal(document.getElementById('paymentMethodModal')).show()
      })
  })

  // Submit form
  $('#paymentMethodForm').on('submit', function (e) {
    e.preventDefault()
    const id = $('#paymentMethodId').val()
    const bankInfo = {
      bankCode: $('#pmBankCode').val(),
      bankName: $('#pmBankName').val(),
      accountNumber: $('#pmAccountNumber').val(),
      accountName: $('#pmAccountName').val(),
      branchName: $('#pmBranchName').val()
    }

    const payload = {
      name: $('#pmName').val(),
      code: $('#pmCode').val(),
      description: $('#pmDescription').val(),
      icon: $('#pmIcon').val(),
      sortOrder: +$('#pmSortOrder').val(),
      isActive: $('#pmIsActive').is(':checked'),
      bankInfo: Object.values(bankInfo).some((v) => v) ? bankInfo : null,
      config: {}
    }

    try {
      payload.config = JSON.parse($('#pmConfig').val() || '{}')
    } catch (err) {
      return toastr.error('Cấu hình JSON không hợp lệ')
    }

    const url = id ? `/api/admin/payment-method/update/${id}` : '/api/admin/payment-method/create'

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          toastr.success(res.message)
          bootstrap.Modal.getInstance(document.getElementById('paymentMethodModal')).hide()
          table.ajax.reload()
        } else toastr.error(res.message)
      })
  })
})
