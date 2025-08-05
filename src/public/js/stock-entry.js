// public/js/stock-entry.js
$(function () {
  let suppliers = []
  let ingredients = []
  let warehouses = []
  let table

  Promise.all([
    fetchData('inventory/supplier/all'),  // danh sách nhà cung cấp
    fetchData('inventory/ingredient/all'),// danh sách nguyên liệu
    fetchData('inventory/warehouse/all')  // danh sách kho
  ])
  .then(([sups, ings, whs]) => {
    suppliers = sups
    ingredients = ings
    warehouses = whs
    initDataTable()
  })
  .catch(err => {
    toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
  })

  function initDataTable () {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#stockEntryTableBody').offset().top - 100) / 45)
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#stockEntryTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
             'l' + 'f' +
           '<"right-group d-flex align-items-center btn-group flex-wrap">' +
           '>' +
           'rt' +
           '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [],
      ajax: {
        url: '/api/inventory/stock-entries',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ phiếu nhập mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu nhập',
        infoFiltered: '(được lọc từ tổng _MAX_ phiếu nhập)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="stockEntryCheckbox" data-id="${row._id}">`
        },
        {
          data: 'code',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'date',
          className: 'text-center',
          render: (data) => {
            const dt = new Date(data)
            return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          }
        },
        {
          data: 'supplier.name',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'items',
          className: 'text-center',
          render: (items) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            return firstItem?.ingredient?.name || ''
          }
        },
        {
          data: 'items',
          className: 'text-center',
          render: (items) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            return firstItem?.quantity || ''
          }
        },
        {
          data: 'items',
          className: 'text-center',
          render: (items) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            return firstItem?.unitPrice || ''
          }
        },
        {
          data: 'items',
          className: 'text-center',
          render: (items) => {
            if (Array.isArray(items) && items.length && items[0].warehouse) {
              const { name = '', location = '' } = items[0].warehouse
              return `${name} ${location}`.trim()
            }
            return ''
          }
        },
        {
          data: 'note',
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
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteStockEntryBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addStockEntryBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
        
        // Event handler cho nút "Thêm"
        $('#addStockEntryBtn').on('click', () => {
          createNewRecord('inventory/stock-entry', {}, (data) => {
              window.location.href = `/inventory/stock-entry/${data.id}?mode=new`
          })
        })

        // Event handler cho nút "Chi tiết"
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/inventory/stock-entry/${id}`
        })
        
        // CHỈ GIỮ LẠI DELETE VÀ CHECKBOX EVENTS
        handlerDeleteEvent('#stockEntryTable', '#deleteStockEntryBtn', 'stockEntryCheckbox', 'stock-entry')
        initTableCheckboxEvents('#stockEntryTable', 'stockEntryCheckbox')
      }
    })
  }
})