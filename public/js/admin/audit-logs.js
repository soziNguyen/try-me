$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#auditLogsTableBody').offset().top - 120) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }

  showList.sort((a, b) => a - b)
  $('#auditLogsTable').DataTable({
    processing: true,
    serverSide: true,
    ajax: {
      url: '/api/admin/audit-logs',
      dataSrc: 'data'
    },
    lengthMenu: [showList, showList],
    pageLength: numRows,
    columns: [
      { data: 'time', className: 'p-2' },
      { data: 'userName', className: 'p-2' },
      { data: 'organizationName', className: 'p-2' },
      { data: 'description', className: 'p-2' },
      {
        data: 'status',
        className: 'p-2',
        render: (data, type, row) => {
          console.log(row)
          if (type === 'display') {
            return data === 'SUCCESS'
              ? `<span class="bg-success text-white badge p-2">Thành công</span>`
              : `<span class="bg-danger text-white badge p-2">Thất bại</span>`
          }
          return data ?? ''
        }
      }
    ],
    order: [[0, 'desc']],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm hoạt động',
      lengthMenu: `_MENU_ hoạt động mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ hoạt động',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ hoạt động)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    }
  })
})
