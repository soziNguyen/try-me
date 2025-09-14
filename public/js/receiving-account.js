$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#receivingAccountTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#receivingAccountTable').DataTable({
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
    order: [],
    ajax: {
      url: '/api/receiving-accounts',
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
        title: '<input type="checkbox" id="selectAllAccounts">',
        render: (data, type, row) =>
          `<input type="checkbox" class="receivingAccountCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        title: 'Tên tài khoản',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
          }
          return data
        }
      },
      {
        data: 'type',
        title: 'Loại',
        render: (data, type, row) => {
          if (type === 'display') {
            const options = {
              bank: 'Ngân hàng',
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
        data: 'accountNumber',
        title: 'Số tài khoản / ID ví',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="accountNumber" value="${data ?? ''}">`
          }
          return data
        }
      },
      {
        data: 'bankName',
        title: 'Tên ngân hàng',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="bankName" value="${data ?? ''}">`
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
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap">
          <button class="btn btn-outline-danger me-2" id="deleteReceivingAccountBtn">
            <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addReceivingAccountBtn">
            <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#receivingAccountTable', '#addReceivingAccountBtn', 'receiving-account')
  handlerDeleteEvent(
    '#receivingAccountTable',
    '#deleteReceivingAccountBtn',
    'receivingAccountCheckbox',
    'receiving-account'
  )
  handlerUpdateEvent('#receivingAccountTable', 'receiving-account')
  initTableCheckboxEvents('#receivingAccountTable', 'receivingAccountCheckbox')
})
