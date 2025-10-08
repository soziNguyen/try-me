$(function () {
  let ingredients = []
  let warehouses = []
  let table

  Promise.all([
    fetchData('inventory/ingredient/all'), // danh sách nguyên liệu
    fetchData('inventory/warehouse/all') // danh sách kho
  ])
    .then(([ings, whs]) => {
      ingredients = ings
      warehouses = whs
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  function initDataTable() {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(
      ($(window).height() - $('#stockTransferTableBody').offset().top - 100) / 45
    )
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#stockTransferTable').DataTable({
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
        url: '/api/inventory/stock-transfers',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ phiếu chuyển kho mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu chuyển kho',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ phiếu chuyển kho)',
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
            `<input type="checkbox" class="stockTransferCheckbox" data-id="${row._id}">`
        },
        {
          data: 'code',
          title: 'Mã phiếu chuyển kho',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'date',
          title: 'Ngày chuyển',
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
            return totalQty
          }
        },
        {
          data: 'items',
          className: 'text-center',
          title: 'Kho nguồn',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const fromWarehouses = items.map((item) => item.fromWarehouse?.name).filter(Boolean)

            const uniqueWarehouses = [...new Set(fromWarehouses)]

            if (uniqueWarehouses.length === 0) return ''

            const display = uniqueWarehouses.slice(0, 2).join(', ')
            const more = uniqueWarehouses.length > 2 ? '...' : ''

            return `<span title="${fromWarehouses.join('\n')}">${display} ${more}</span>`
          }
        },
        {
          data: 'items',
          className: 'text-center',
          title: 'Kho đích',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const toWarehouses = items.map((item) => item.toWarehouse?.name).filter(Boolean)

            const uniqueWarehouses = [...new Set(toWarehouses)]

            if (uniqueWarehouses.length === 0) return ''

            const display = uniqueWarehouses.slice(0, 2).join(', ')
            const more = uniqueWarehouses.length > 2 ? '...' : ''

            return `<span title="${toWarehouses.join('\n')}">${display} ${more}</span>`
          }
        },
        {
          data: 'createdBy',
          title: 'Người tạo',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'note',
          title: 'Ghi chú',
          className: 'text-center',
          render: (data) => {
            if (!data || data.length <= 20) return data || ''
            return `<span title="${data}">${data.substring(0, 20)}...</span>`
          }
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
            <button class="btn btn-outline-danger me-2" id="deleteStockTransferBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addStockTransferBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)

        // Event handler cho nút "Thêm"
        $('#addStockTransferBtn').on('click', () => {
          createNewRecord('inventory/stock-transfer', {}, (data) => {
            window.location.href = `/inventory/stock-transfer/${data.id}?mode=new`
          })
        })

        // Event handler cho nút "Chi tiết"
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/inventory/stock-transfer/${id}`
        })

        // CHỈ GIỮ LẠI DELETE VÀ CHECKBOX EVENTS
        handlerDeleteEvent(
          '#stockTransferTable',
          '#deleteStockTransferBtn',
          'stockTransferCheckbox',
          'inventory/stock-transfer'
        )
        initTableCheckboxEvents('#stockTransferTable', 'stockTransferCheckbox')
      }
    })
  }
})
