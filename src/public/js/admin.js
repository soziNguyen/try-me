$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#userTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
      showList.push(numRows)
  }
  showList.sort((a, b) => a - b)
  
  const table = $('#userTable').DataTable({
    dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
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
      url: '/api/admin/users',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ người dùng mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ người dùng',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ người dùng)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) => `<input type="checkbox" class="userCheckbox" data-id="${row._id}">`
      },
      {
        data: 'username',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return data
        }
      },
      {
        data: 'email',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return data
        }
      },
      {
        data: 'role',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return data
        }
      },
      {
        data: 'organization',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return data
        }
      },
      {
        data: 'createdAt',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return new Date(data).toLocaleDateString('vi-VN')
        }
      },
      {
        data: 'updatedAt',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return new Date(data).toLocaleDateString('vi-VN')
        }
      },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) => {
          return `<button title="Cập nhật" class="btn btn-outline-primary updateUserBtn" data-id="${row._id}"><i class="bi bi-pencil-square"></i></button>`
        }
      }
    ],
    rowCallback: function(row, data) {
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap">
          <button class="btn btn-outline-danger me-2" id="deleteSupplierBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addSupplierBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

})