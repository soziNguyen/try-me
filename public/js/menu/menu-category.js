$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#menuCateTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  table = $('#menuCateTable').DataTable({
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
      url: '/api/menu/category/',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ danh mục thực đơn mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ danh mục thực đơn',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ thực đơn)',
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
          `<input type="checkbox" class="menuCateCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        title: 'Tên',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data || ''}">`
          }
          return data
        }
      },
      {
        data: 'description',
        title: 'Mô tả',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data}">`
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
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deleteMenuCategoryBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addMenuCategoryBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#menuCateTable', '#addMenuCategoryBtn', 'menu/category')
  handlerDeleteEvent(
    '#menuCateTable',
    '#deleteMenuCategoryBtn',
    'menuCateCheckbox',
    'menu/category'
  )
  handlerUpdateEvent('#menuCateTable', 'menu/category')

  initTableCheckboxEvents('#menuCateTable', 'menuCateCheckbox')
})
