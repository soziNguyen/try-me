$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#tableTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#tableTable').DataTable({
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
    // scrollX: true,
    order: [],
    ajax: {
      url: '/api/tables/get',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ bàn mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bàn',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ bàn)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="tableCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control text" data-field="name" value="${data ?? ''}"}>`
          }
          return data
        }
      },
      {
        data: 'status',
        className: 'text-center',
        render: (data, type, row) => {
          const tableStatus = ['available', 'occupied']

          if (type === 'display') {
            const opts = tableStatus
              .map((t) => {
                return `<option value=${t} ${t === data ? 'selected' : ''}>${t === 'available' ? 'Còn trống' : 'Đang sử dụng'}</option>`
              })
              .join('')
            return `
          <select class="dataInput form-control" data-field="status" data-id="${row._id}">
            ${opts}
          </select>`
          }
          return data
        }
      },
      {
        data: 'capacity',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control number" data-field="capacity" value="${data ?? ''}"}>`
          }
          return data
        }
      },
      {
        data: 'area',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control text" data-field="area" value="${data ?? ''}"}>`
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
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deleteTableBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addTableBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#tableTable', '#addTableBtn', 'tables')
  handlerDeleteEvent('#tableTable', '#deleteTableBtn', 'tableCheckbox', 'tables')
  handlerUpdateEvent('#tableTable', 'tables')
  initTableCheckboxEvents('#tableTable', 'tableCheckbox')
})
