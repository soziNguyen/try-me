$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#shiftTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  table = $('#shiftTable').DataTable({
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
    order: [],
    ajax: {
      url: '/api/shifts',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm ca làm việc',
      lengthMenu: `_MENU_ ca làm việc mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ ca làm việc',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ ca làm việc)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        title: '<input type="checkbox" id="selectAll">',
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="shiftCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        title: 'Tên ca',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data || ''}" placeholder="Nhập tên ca">`
          }
          return data
        }
      },
      {
        data: 'type',
        title: 'Loại ca',
        render: (data, type, row) => {
          if (type === 'display') {
            const shifts = ['day', 'night']
            const opts = shifts.map(
              (o) => `
                <option value="${o}" ${data === o ? 'selected' : ''}>${o === 'day' ? 'Ca ngày' : 'Ca đêm'}</option>    
              `
            )
            return `
              <select class="form-select border-0 dataInput" data-field="type">
                  <option value="">— Chọn loại ca —</option>
                  ${opts}
              </select>
            `
          }
          return data
        }
      },
      {
        data: 'startTime',
        title: 'Giờ bắt đầu',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="time" class="dataInput border-0 form-control text-center" data-field="startTime" value="${data || ''}">`
          }
          return data
        }
      },
      {
        data: 'endTime',
        title: 'Giờ kết thúc',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="time" class="dataInput border-0 form-control text-center" data-field="endTime" value="${data || ''}">`
          }
          return data
        }
      },
      {
        data: 'note',
        title: 'Ghi chú',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="note" value="${data || ''}" placeholder="Nhập ghi chú">`
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
        <div class="btn-group flex-wrap">
          <button class="btn btn-outline-danger me-2" id="deleteShiftBtn">
            <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addShiftBtn">
            <i class="bi bi-plus-circle"></i> Thêm ca
          </button>
        </div>
      `)
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#shiftTable', '#addShiftBtn', 'shift')
  handlerDeleteEvent('#shiftTable', '#deleteShiftBtn', 'shiftCheckbox', 'shift')
  initTableCheckboxEvents('#shiftTable', 'shiftCheckbox')
  handlerUpdateEvent('#shiftTable', 'shift')
})
