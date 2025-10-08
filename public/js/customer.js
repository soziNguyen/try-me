$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#customerTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#customerTable').DataTable({
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
      url: '/api/customers',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ khách hàng mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ khách hàng',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ khách hàng)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: 'name',
        title: 'Tên',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="text w-100">${data ?? ''}</span>`
          }
          return data
        }
      },
      {
        data: 'phone',
        title: 'Điện thoại',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? ''}</span>`
          }
          return data
        }
      },
      {
        data: 'totalPoints',
        title: 'Điểm tích lũy',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? 0}</span>`
          }
          return data
        }
      },
      {
        data: 'totalOrders',
        title: 'Tổng đơn hàng',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? 0}</span>`
          }
          return data
        }
      },
      {
        data: 'totalSpent',
        title: 'Tổng chi tiêu (đ)',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ? data.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>`
          }
          return data ?? 0
        }
      },
      {
        data: 'lastOrderDate',
        title: 'Đơn hàng cuối',
        render: (data, type, row) => {
          if (type === 'display') {
            const dt = new Date(data)
            const dateStr = dt.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
            const timeStr = dt.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
            return `<span class="number">${dateStr} ${timeStr}</span>`
          }
          return data
        }
      }
    ],
    rowCallback: function (row, data) {
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    }
  })
})
