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
          render: inputRenderer('code')
        },
        {
          data: 'date',
          render: (data) => {
            const dt = new Date(data)
            return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          }
        },
        {
          data: 'supplier._id',
          name: 'supplier.name',
          render: (data, type, row) => {
            if (type === 'display') {
              const opts = suppliers.map(sup => {
                const sel = sup._id === (row.supplier?._id) ? 'selected' : ''
                return `<option value="${sup._id}" ${sel}>${sup.name}</option>`
              }).join('')
              return `
                <select class="dataInput form-select form-select-sm" data-field="supplier" data-id="${row._id}">
                  <option value="">— Chọn nhà cung cấp —</option>
                  ${opts}
                </select>`
            }
            return row.supplier?.name ?? ''
          }
        },
        {
          data: 'items',
          render: (items, type, row) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            if (type === 'display') {
              const opts = ingredients.map(ing => {
                const sel = firstItem?.ingredient?._id === ing._id ? 'selected' : ''
                return `<option value="${ing._id}" ${sel}>${ing.name}</option>`
              }).join('')
              return `
                <select class="dataInput form-select form-select-sm" data-field="items.0.ingredient" data-id="${row._id}">
                  <option value="">— Chọn nguyên liệu —</option>
                  ${opts}
                </select>`
            }
            return firstItem?.ingredient?.name ?? ''
          }
        },
        {
          data: 'items',
          render: (items, type, row) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            if (type === 'display') {
              return `<input type="number" class="dataInput border-0 w-100 form-control"
                              data-field="items.0.quantity" value="${firstItem?.quantity ?? ''}">`
            }
            return firstItem?.quantity ?? ''
          }
        },
        {
          data: 'items',
          render: (items, type, row) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            if (type === 'display') {
              return `<input type="number" class="dataInput border-0 w-100 form-control"
                              data-field="items.0.unitPrice" value="${firstItem?.unitPrice ?? ''}">`
            }
            return firstItem?.unitPrice ?? ''
          }
        },
        {
          data: 'items',
          render: (items, type, row) => {
            const firstItem = Array.isArray(items) && items.length ? items[0] : null
            if (type === 'display') {
              const opts = warehouses.map(wh => {
                const sel = firstItem?.warehouse?._id === wh._id ? 'selected' : ''
                return `<option value="${wh._id}" ${sel}>${wh.name}</option>`
              }).join('')
              return `
                <select class="dataInput form-select form-select-sm" data-field="items.0.warehouse" data-id="${row._id}">
                  <option value="">— Chọn kho —</option>
                  ${opts}
                </select>`
            }
            return firstItem?.warehouse?.name ?? ''
          }
        },
        {
          data: 'note',
          render: inputRenderer('note')
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
      }
    })

    // Event handler
    handlerAddEvent('#stockEntryTable', '#addStockEntryBtn', 'stock-entries')
    handlerDeleteEvent('#stockEntryTable', '#deleteStockEntryBtn', 'stockEntryCheckbox', 'stock-entries')
    handlerUpdateEvent('#stockEntryTable', 'stock-entries')
    initTableCheckboxEvents('#stockEntryTable', 'stockEntryCheckbox')
  }
})
