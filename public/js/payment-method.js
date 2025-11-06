$(function () {
  let showList = [10, 25, 50, 100]
  let receivingAccounts = []
  Promise.all([fetchData('receiving-account/active')])
    .then(([acc]) => {
      receivingAccounts = acc
    })
    .catch((err) => {})
  const numRows = Math.floor(
    ($(window).height() - $('#paymentMethodTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#paymentMethodTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    order: [],
    ajax: {
      url: '/api/payment-methods',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
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
    pageLength: numRows,
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
        data: 'name',
        title: 'Tên',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
          }
          return data
        }
      },
      {
        data: 'type',
        title: 'Loại hình',
        render: (data, type, row) => {
          if (type === 'display') {
            const options = {
              cash: 'Tiền mặt',
              bank: 'Chuyển khoản',
              card: 'Thẻ',
              'e-wallet': 'Ví điện tử'
            }

            let selectHtml = `<select class="dataInput type-select border-0 w-100 form-control" data-field="type">`
            for (const key in options) {
              const selected = data === key ? 'selected' : ''
              selectHtml += `<option value="${key}" ${selected}>${options[key]}</option>`
            }
            selectHtml += `</select>`

            return selectHtml
          }
          return data
        }
      },
      {
        data: 'description',
        title: 'Mô tả',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data ?? ''}">`
          }
          return data
        }
      },
      {
        data: 'receivingAccountId',
        title: 'Tài khoản nhận',
        render: (data, type, row) => {
          if (type === 'display') {
            if (['bank', 'e-wallet'].includes(row.type)) {
              let options = '<option value="">— Chọn tài khoản —</option>'
              receivingAccounts.forEach((acc) => {
                const selected = data?._id === acc._id ? 'selected' : ''
                options += `<option value="${acc._id}" ${selected}>${acc.name} - ${acc.bankName || acc.bankCode}</option>`
              })
              return `<select class="dataInput receiving-account-select border-0 w-100 form-control" data-field="receivingAccountId">${options}</select>`
            } else {
              return '<span class="text-muted form-control receiving-account-cell">Không áp dụng</span>'
            }
          }
          return data?.name || ''
        }
      },
      {
        data: 'isActive',
        title: 'Trạng thái',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
          }
          return data
        }
      }
    ],
    rowCallback: function (row, data) {
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deletePaymentMethodBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addPaymentMethodBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

  $('#paymentMethodTable').on('change', '.type-select', function () {
    const $row = $(this).closest('tr')
    const id = $row.data('id')
    const newType = $(this).val()
    const $cell = $row.find('td').eq(4)
    const csrfToken = $('#_csrf').val()

    if (['bank', 'e-wallet'].includes(newType)) {
      let options = '<option value="">— Chọn tài khoản —</option>'
      receivingAccounts.forEach((acc) => {
        options += `<option value="${acc._id}">${acc.name} - ${acc.bankName || acc.bankCode}</option>`
      })
      $cell.html(
        `<select class="dataInput receiving-account-select border-0 w-100 form-control" data-field="receivingAccountId">${options}</select>`
      )
      // gửi update chỉ cho type (receivingAccountId sẽ được set khi user chọn trong select)
      $.ajax({
        url: `/api/payment-method/update/${id}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ type: newType }),
        headers: { 'x-csrf-token': csrfToken }
      })
    } else {
      // chuyển sang không áp dụng => hiển thị và reset trên server
      $cell.html(
        '<span class="text-muted form-control receiving-account-cell">Không áp dụng</span>'
      )
      $.ajax({
        url: `/api/payment-method/update/${id}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ type: newType, receivingAccountId: null }),
        headers: { 'x-csrf-token': csrfToken }
      })
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#paymentMethodTable', '#addPaymentMethodBtn', 'payment-method')
  handlerDeleteEvent(
    '#paymentMethodTable',
    '#deletePaymentMethodBtn',
    'paymentMethodCheckbox',
    'payment-method'
  )
  handlerUpdateEvent('#paymentMethodTable', 'payment-method')
  initTableCheckboxEvents('#paymentMethodTable', 'paymentMethodCheckbox')
})
