$(function () {
    let ingredients = []
    let warehouses = []
    let table
  
    Promise.all([
      fetchData('inventory/ingredient/all'),
      fetchData('inventory/warehouse/all')
    ])
    .then(([ings, whs]) => {
      ingredients = ings
      warehouses = whs
      initDataTable()
    })
    .catch(err => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
  
    function initDataTable () {
      let showList = [10, 25, 50, 100]
      const numRows = Math.floor(($(window).height() - $('#stockMovementTableBody').offset().top - 100) / 45)
      if (!showList.includes(numRows)) showList.push(numRows)
      showList.sort((a, b) => a - b)
  
      table = $('#stockMovementTable').DataTable({
        dom: '<"top-bar d-flex justify-content-between mb-3"l f>' +
             'rt' +
             '<"bottom-bar d-flex justify-content-between mt-3"ip>',
        serverSide: true,
        processing: true,
        autoWidth: false,
        order: [],
        ajax: {
          url: '/api/inventory/stock-movements',
          method: 'GET'
        },
        lengthMenu: [showList, showList],
        pageLength: numRows,
        language: {
          search: '',
          searchPlaceholder: 'Tìm kiếm',
          lengthMenu: `_MENU_ phiếu dịch chuyển mỗi trang`,
          info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu',
          infoEmpty: 'Không có bản ghi nào',
          infoFiltered: '(lọc từ _MAX_ phiếu)',
          zeroRecords: 'Không tìm thấy',
          emptyTable: 'Không có dữ liệu'
        },
        columns: [
            {
              data: null,
              orderable: false,
              className: 'text-center',
              render: (data, type, row) =>
                `<input type="checkbox" class="stockMovementCheckbox" data-id="${row._id}">`
            },
            {
                data: 'date',
                render: (data) => {
                  const d = new Date(data)
                  return d.toLocaleDateString('vi-VN')
                }
            },
            {
                data: 'type',
                render: (data, type, row) => {
                  const types = ['Nhập kho', 'Xuất kho', 'Chuyển kho', 'Trả hàng']
                  const opts = types.map(t => {
                    const sel = t === row.type ? 'selected' : ''
                    return `<option value="${t}" ${sel}>${t}</option>`
                  }).join('')
                  return `
                    <select class="dataInput form-select form-select-sm" data-field="type" data-id="${row._id}">
                      <option value="">— Chọn loại —</option>
                      ${opts}
                    </select>`
                }
            },
            {
              data: 'fromWarehouse',
              render: (data, type, row) => {
                if (type === 'display') {
                  const opts = warehouses.map(wh => {
                    const sel = data?._id === wh._id ? 'selected' : ''
                    return `<option value="${wh._id}" ${sel}>${wh.name} - ${wh.location}</option>`
                  }).join('')
                  return `
                    <select class="dataInput form-select form-select-sm" data-field="fromWarehouse" data-id="${row._id}">
                      <option value="">— Chọn kho xuất —</option>
                      ${opts}
                    </select>`
                }
                return data?.name ?? ''
              }
            },
            {
              data: 'toWarehouse',
              render: (data, type, row) => {
                if (type === 'display') {
                  const opts = warehouses.map(wh => {
                    const sel = data?._id === wh._id ? 'selected' : ''
                    return `<option value="${wh._id}" ${sel}>${wh.name} - ${wh.location}</option>`
                  }).join('')
                  return `
                    <select class="dataInput form-select form-select-sm" data-field="toWarehouse" data-id="${row._id}">
                      <option value="">— Chọn kho nhận —</option>
                      ${opts}
                    </select>`
                }
                return data?.name ?? ''
              }
            },
            {
              data: 'quantity',
              render: (data, type, row) => {
                if (type === 'display') {
                  return `<input type="number" class="dataInput form-control text-end"
                                  data-field="quantity" value="${data ?? ''}">`
                }
                return data
              }
            },
            {
              data: 'unitPrice',
              render: (data, type, row) => {
                if (type === 'display') {
                  return `<input type="number" class="dataInput form-control text-end"
                                  data-field="unitPrice" value="${data ?? ''}">`
                }
                return data
              }
            },
            {
              data: 'type',
              render: (data, type, row) => {
                const types = ['Nhập kho', 'Xuất kho', 'Chuyển kho', 'Trả hàng']
                const opts = types.map(t => {
                  const sel = t === row.type ? 'selected' : ''
                  return `<option value="${t}" ${sel}>${t}</option>`
                }).join('')
                return `
                  <select class="dataInput form-select form-select-sm" data-field="type" data-id="${row._id}">
                    <option value="">— Chọn loại —</option>
                    ${opts}
                  </select>`
              }
            },
            {
              data: 'reference',
              render: (data) => data ?? ''
            },
            {
              data: 'note',
              render: inputRenderer('note')
            }
        ],
        rowCallback: function (row, data) {
          $(row).attr('data-id', data._id)
        },
        // initComplete: function () {
        //   $('.right-group').html(`
        //     <button class="btn btn-outline-danger me-2" id="deleteStockMovementBtn">
        //       <i class="bi bi-trash"></i> Xóa
        //     </button>
        //     <button class="btn btn-outline-success" id="addStockMovementBtn">
        //       <i class="bi bi-plus-circle"></i> Thêm
        //     </button>
        //   `)
        // }
      })
  
      // Event handler
      handlerAddEvent('#stockMovementTable', '#addStockMovementBtn', 'stock-movements')
      handlerDeleteEvent('#stockMovementTable', '#deleteStockMovementBtn', 'stockMovementCheckbox', 'stock-movements')
      handlerUpdateEvent('#stockMovementTable', 'stock-movements')
      initTableCheckboxEvents('#stockMovementTable', 'stockMovementCheckbox')
    }
  })
  