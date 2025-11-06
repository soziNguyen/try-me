$(function () {
  let table
  let users = []
  let shifts = []

  Promise.all([fetchData('users'), fetchData('shifts/get')])
    .then(([user, shift]) => {
      users = user.data
      shifts = shift
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#scheduleTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#scheduleTable').DataTable({
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
      order: [],
      ajax: {
        url: '/api/schedules',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm lịch làm việc',
        lengthMenu: `_MENU_ lịch làm việc mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ lịch làm việc',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ lịch làm việc)',
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
            `<input type="checkbox" class="scheduleCheckbox" data-id="${row._id}">`
        },
        {
          data: 'user',
          title: 'Nhân viên',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedUserId = row.user?._id || null
              const options = users
                .map(
                  (user) => `
                      <option value="${user._id}" ${user._id === selectedUserId ? 'selected' : ''}>${user.username}</option>
                    `
                )
                .join('')

              const emptyOption = selectedUserId
                ? ''
                : '<option value="" selected>— Chọn nhân viên —</option>'

              return `
                <select class="dataInput form-select border-0" data-field="user" data-schedule-id="${row._id}">
                    ${emptyOption}
                    ${options}
                </select>
              `
            }
            return row.user?.username || ''
          }
        },
        {
          data: 'shift',
          title: 'Ca làm',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedShiftId = row.shift?._id || null
              const options = shifts
                .map(
                  (shift) => `
                    <option value="${shift._id}" ${shift._id === selectedShiftId ? 'selected' : ''}>${shift.name}</option>
                  `
                )
                .join('')

              const emptyOption = selectedShiftId
                ? ''
                : '<option value="" selected>— Chọn ca làm —</option>'

              return `
                <select class="dataInput form-select border-0" data-field="shift" data-schedule-id="${row._id}">
                    ${emptyOption}
                    ${options}
                </select>
              `
            }
            return row.shift?.name || ''
          }
        },
        {
          data: 'date',
          title: 'Ngày',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              const dateValue = data ? new Date(data).toISOString().slice(0, 10) : ''
              return `
                <input type="date" class="dataInput border-0 form-control text-center" 
                  data-field="date" 
                  value="${dateValue}">
              `
            }
            return data
          }
        },
        {
          data: 'status',
          title: 'Trạng thái',
          render: (data, type, row) => {
            if (type === 'display') {
              const statuses = ['scheduled', 'confirmed', 'cancelled']
              const opts = statuses.map(
                (s) => `<option value="${s}" ${data === s ? 'selected' : ''}>
                  ${
                    s === 'confirmed'
                      ? 'Đã xác nhận'
                      : s === 'scheduled'
                        ? 'Chờ xác nhận'
                        : 'Đã hủy'
                  }
                  </option>
                `
              )
              return `
                <select class="form-select border-0 dataInput" data-field="status">
                  ${opts}
                </select>`
            }
            return data
          }
        },
        {
          data: 'note',
          title: 'Ghi chú',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="text" class="dataInput border-0 w-100 form-control" 
                  data-field="note" 
                  value="${data || ''}" 
                  placeholder="Nhập ghi chú">
              `
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
            <button class="btn btn-outline-danger me-2" id="deleteScheduleBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addScheduleBtn">
              <i class="bi bi-plus-circle"></i> Thêm lịch
            </button>
          </div>
        `)
      }
    })

    handlerAddEvent('#scheduleTable', '#addScheduleBtn', 'schedule')
    handlerDeleteEvent('#scheduleTable', '#deleteScheduleBtn', 'scheduleCheckbox', 'schedule')
    initTableCheckboxEvents('#scheduleTable', 'scheduleCheckbox')
    handlerUpdateEvent('#scheduleTable', 'schedule')
  }
})
