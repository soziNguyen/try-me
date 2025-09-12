$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#paymentMethodTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#paymentMethodTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    // scrollX: true,
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

            let selectHtml = `<select class="dataInput border-0 w-100 form-control" data-field="type">`
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
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      // const api = this.api()
      $('.right-group').html(`
        <div class="btn-group flex-wrap">
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
