$(function () {
  let table
  let organizations = []
  const userRole = $('#userRole').val()
  const isAdmin = userRole === 'Admin'

  Promise.all([fetchData('organizations')])
    .then(([orgs]) => {
      organizations = orgs
      initDataTable()
    })
    .catch((error) => {
      console.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', error.message)
    })

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#auditLogsTableBody').offset().top - 120) / 50
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    const columns = []

    if (isAdmin) {
      columns.push({
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="logCheckbox" data-id="${row._id}">`
      })
    }

    // Thêm các cột còn lại
    columns.push(
      { data: 'time', className: 'p-2' },
      { data: 'userName', className: 'p-2' },
      { data: 'organizationName', className: 'p-2' },
      { data: 'description', className: 'p-2' },
      {
        data: 'status',
        className: 'p-2',
        render: (data, type, row) => {
          if (type === 'display') {
            return data === 'SUCCESS'
              ? `<span class="bg-success text-white badge p-2">Thành công</span>`
              : `<span class="bg-danger text-white badge p-2">Thất bại</span>`
          }
          return data ?? ''
        }
      }
    )

    table = $('#auditLogsTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap gap-3"' +
        'l' +
        '<"center-group d-flex align-items-center gap-2">f' +
        '<"delete-group">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      processing: true,
      serverSide: true,
      ajax: {
        url: '/api/admin/audit-logs',
        type: 'GET',
        data: function (d) {
          return {
            ...d,
            organization: $('#organizationFilter').val() || 'all'
          }
        }
      },
      order: [[isAdmin ? 1 : 0, 'desc']],
      lengthMenu: [showList, showList],
      pageLength: numRows,
      columnDefs: isAdmin ? [{ width: '180px', target: 1 }] : [{ width: '180px', target: 0 }],
      columns: columns,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm hoạt động',
        lengthMenu: `_MENU_ hoạt động mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ hoạt động',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ hoạt động)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        const selectHtml = `
          <select id="organizationFilter" class="form-select">
            <option value="all">Tất cả tổ chức</option>
            ${organizations.map((o) => `<option value="${o._id}">${o.name}</option>`).join('')}
          </select>
        `

        if (isAdmin) {
          const deleteBtn = `
            <button id="deleteLogBtn" class="btn btn-danger">
              <i class="bi bi-trash"></i> Xóa
            </button>
          `
          $('.delete-group').html(deleteBtn)
        }

        $('.center-group').html(selectHtml)

        $('#organizationFilter').on('change', function () {
          table.ajax.reload()
        })
      }
    })

    if (isAdmin) {
      initTableCheckboxEvents('#auditLogsTable', 'logCheckbox')
      handlerDeleteEvent('#auditLogsTable', '#deleteLogBtn', 'logCheckbox', 'admin/audit-logs')
    }
  }
})
