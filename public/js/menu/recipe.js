$(function () {
  let menuItem = []

  Promise.all([fetchData('menu/get/active')])
    .then(([items]) => {
      menuItem = items
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  function initDataTable() {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#recipeTableBody').offset().top - 100) / 45)
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#recipeTable').DataTable({
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
      order: [],
      ajax: {
        url: '/api/menu/recipes',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ công thức mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ công thức',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ công thức)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: null,
          title: '<input type="checkbox" id="selectAll">',
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="recipeCheckbox" data-id="${row._id}">`
        },
        {
          data: 'menuItem',
          title: 'Tên món',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              return row.menuItem?.name ?? ''
            }
            return row.menuItem?.name ?? ''
          }
        },
        {
          data: 'items',
          className: 'text-start px-1',
          title: 'Nguyên liệu',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const names = items.map((it) => it.ingredient?.name).filter(Boolean)
            const uniqueNames = new Set(names)

            if (uniqueNames.size === 0) return ''
            const nameLengths = [...uniqueNames]
            const firstThree = nameLengths.slice(0, 3).join(', ')
            const more = nameLengths.length > 3 ? '...' : ''
            return `<span title="${names.join('\n')}">${firstThree} ${more}</span>`
          }
        },
        {
          data: 'items',
          className: 'text-center',
          title: 'Số lượng',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const totalQty = items.reduce((acc, cur) => acc + (cur.quantity || 0), 0)
            return totalQty.toFixed(2)
          }
        },
        {
          data: 'note',
          title: 'Ghi chú',
          className: 'text-center',
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
                  </button>`
            }
            return ''
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deleteRecipeBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addRecipeBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)

        // Event handler cho nút "Thêm"
        $('#addRecipeBtn').on('click', () => {
          createNewRecord('menu/recipe', {}, (data) => {
            window.location.href = `/menu/recipe/${data._id}?mode=new`
          })
        })

        // Event handler cho nút "Chi tiết"
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/menu/recipe/${id}`
        })

        // CHỈ GIỮ LẠI DELETE VÀ CHECKBOX EVENTS
        handlerDeleteEvent('#recipeTable', '#deleteRecipeBtn', 'recipeCheckbox', 'menu/recipe')
        initTableCheckboxEvents('#recipeTable', 'recipeCheckbox')
      }
    })
  }
})
