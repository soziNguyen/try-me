$(function () {
  let ingredients = []
  let warehouses = []
  let table

  // 1. Fetch danh sách nguyên liệu và kho
  Promise.all([fetchData('inventory/ingredient/all'), fetchData('inventory/warehouse/all')])
    .then(([ings, whs]) => {
      ingredients = ings
      warehouses = whs
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  function initDataTable() {
    // tính số dòng
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(
      ($(window).height() - $('#stockIssueTableBody').offset().top - 100) / 45
    )
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#stockIssueTable').DataTable({
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
        url: '/api/inventory/stock-issues',
        type: 'GET'
      },

      lengthMenu: [showList, showList],
      pageLength: numRows,

      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: '_MENU_ phiếu mỗi trang',
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ phiếu)',
        zeroRecords: 'Không tìm thấy kết quả',
        emptyTable: 'Chưa có dữ liệu'
      },

      columns: [
        // checkbox
        {
          data: null,
          orderable: false,
          title: '<input type="checkbox" id="selectAll">',
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="stockIssueCheckbox" data-id="${row._id}">`
        },
        // code
        {
          data: 'code',
          title: 'Mã xuất kho',
          className: 'text-center',
          render: (data) => data || ''
        },
        // date
        {
          data: 'date',
          title: 'Ngày xuất',
          className: 'text-center',
          render: (data) => {
            const dt = new Date(data)
            return dt.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          }
        },
        // reason
        {
          data: 'reason',
          title: 'Loại xuất kho',
          className: 'text-center',
          render: (data) => data || ''
        },
        // ingredient (first item)
        {
          data: 'items',
          className: 'text-start px-1',
          title: 'Nguyên liệu',
          render: (items, type, row) => {
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
        // quantity
        {
          data: 'items',
          className: 'text-center',
          title: 'Số lượng',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const totalQty = items.reduce((acc, cur) => acc + (cur.quantity || 0), 0)
            return totalQty
          }
        },
        // warehouse
        {
          data: 'warehouse.name',
          className: 'text-center',
          title: 'Kho nhập',
          render: (data) => data
        },
        {
          data: 'createdBy',
          title: 'Người tạo',
          className: 'text-center',
          render: (data) => data || ''
        },
        // note
        {
          data: 'note',
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
                </button>`
            }
            return ''
          }
        }
      ],
      rowCallback(row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete() {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deleteStockIssueBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addStockIssueBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)

        $('#addStockIssueBtn').on('click', () => {
          createNewRecord('inventory/stock-issue', {}, (data) => {
            window.location.href = `/inventory/stock-issue/${data.id}`
          })
        })

        $('.detail-btn').on('click', function () {
          const id = $(this).data('id')
          window.location.href = `/inventory/stock-issue/${id}`
        })
      }
    })

    // các handler
    handlerDeleteEvent(
      '#stockIssueTable',
      '#deleteStockIssueBtn',
      'stockIssueCheckbox',
      'inventory/stock-issue'
    )
    initTableCheckboxEvents('#stockIssueTable', 'stockIssueCheckbox')
  }
})
