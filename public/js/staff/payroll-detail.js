$(function () {
  let table
  let url = window.location.pathname.split('/')
  const payrollId = url[url.length - 1]

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#payrollDetailTable').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  if (payrollId) {
    fetch(`/api/payroll/${payrollId}`)
      .then((res) => res.json())
      .then((res) => {
        const payroll = res.data
        const details = payroll.details || []

        // Hiển thị tổng giờ & tổng lương
        $('#totalHours').text((payroll.totalWorkingMinutes / 60).toFixed(1))
        $('#totalSalary').text(payroll.totalSalary.toLocaleString('vi-VN') + ' đ')

        initDataTable(details)
      })
  }

  function initDataTable(details) {
    table = $('#payrollDetailTable').DataTable({
      data: details,
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      order: [],
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
      columns: [
        {
          data: null,
          className: 'text-center',
          render: (d, t, r, i) => i.row + 1 + i.settings._iDisplayStart
        },
        {
          data: 'attendance.date',
          className: 'text-center py-2',
          render: (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
        },
        {
          data: 'attendance.status',
          render: (s) => {
            if (s === 'present') return '<span class="text">Có mặt</span>'
            if (s === 'absent') return '<span class="text">Vắng</span>'
            if (s === 'late') return '<span class="text">Đi muộn</span>'
            return '<span class="text">Nghỉ phép</span>'
          }
        },
        {
          data: 'attendance.sessions',
          className: 'text-center',
          render: (s) => `<span class="number">${Array.isArray(s) ? s.length : 0}</span>`
        },
        {
          data: 'workingMinutes',
          className: 'text-center',
          render: (w) => `<span>${(w / 60).toFixed(1) + 'h' || 0}</span>`
        },
        {
          data: 'dailySalary',
          className: 'text-center',
          render: (s) => `<span>${s.toLocaleString('vi-VN') + ' đ'}</span>`
        },
        {
          data: 'attendance.note',
          className: 'text-center',
          render: (n) => `<span>${n || ''}</span>`
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data.attendance?._id)
      }
    })
  }
})
