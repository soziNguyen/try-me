$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#attendanceTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)
  initDataTable()

  function initDataTable() {
    table = $('#attendanceTable').DataTable({
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
        url: '/api/attendances',
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
          data: 'user.username',
          className: 'text-center',
          title: 'Nhân viên',
          render: (data, type, row) => data || ''
        },
        {
          data: 'date',
          className: 'text-center',
          title: 'Ngày làm việc',
          render: (data, type, row) => {
            if (type === 'display') {
              const dateValue = data ? new Date(data).toISOString().slice(0, 10) : ''
              return dateValue
            }
            return data
          }
        },
        {
          data: 'status',
          className: 'text-center',
          title: 'Trạng thái',
          render: (data, type, row) => {
            if (type === 'display') {
              return data === 'present'
                ? 'Có mặt'
                : data === 'absent'
                  ? 'Vắng mặt'
                  : data === 'late'
                    ? 'Đi muộn'
                    : 'Nghỉ phép'
            }
            return data || ''
          }
        },
        {
          data: 'sessions',
          className: 'text-center',
          title: 'Số ca',
          render: (sessions) => (Array.isArray(sessions) ? sessions.length : 0)
        },
        {
          data: 'totalDuration',
          className: 'text-center',
          title: 'Tổng giờ công',
          render: (val) => (val ? `${(val / 60).toFixed(1)}h` : '')
        },
        {
          data: 'note',
          className: 'text-center',
          title: 'Ghi chú',
          render: (data) => data || ''
        },
        {
          data: null,
          orderable: false,
          className: 'text-center',
          width: '100px',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <button class="btn btn-sm btn-outline-primary my-1 detail-btn" 
                        data-id="${row._id}" 
                        title="Xem chi tiết">
                  <i class="bi bi-eye"></i> Chi tiết
                </button>
              `
            }
            return ''
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.detail-btn').on('click', function () {
          const id = $(this).data('id')
          window.location.href = `/staff/attendance/${id}`
        })
      }
    })
  }
})
