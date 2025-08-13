$(function () {
  let managers = []
  let table;

  Promise.all([
    fetchData('users')
  ])
  .then(([data]) => {
    managers = data
    initDataTable()
  })
  .catch(err => {
    toastr.error(err)
  })

  function initDataTable () {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#warehouseTableBody').offset().top - 100) / 45)
    if (!showList.includes(numRows)) {
        showList.push(numRows)
    }
    showList.sort((a, b) => a - b)
    
    table = $('#warehouseTable').DataTable({
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
      order: [],
      ajax: {
        url: '/api/inventory/warehouses',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ nhà kho mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ nhà kho',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ nhà kho)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) => `<input type="checkbox" class="warehouseCheckbox" data-id="${row._id}">`
        },
        {
          data: 'name',
          render: inputRenderer('name')
        },
        {
          data: 'location',
          render: inputRenderer('location')
        },
        {
          data: 'manager',
          name: 'manager.username',
          render: function (data, type, row) {
            if (type === 'display') {
              const opts = managers.map(man => {
                const sel = man._id === row.manager?._id ? 'selected' : ''
                return `<option value="${man._id}" ${sel}>${man.username}</option>`
              }).join('')

              return `
                <select class="dataInput form-select form-select-sm" data-field="manager" data-id="${row._id}">
                  <option value="">— Chọn quản lý —</option>
                  ${opts}
                </select>
              `
            }
            return data?.username || ''
          }
        },
        {
          data: 'isActive',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
            }
            return data
          }
        },
      ],
      rowCallback: function(row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteWarehouseBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addWarehouseBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })

    // EVENT HANDLERS
    handlerAddEvent('#warehouseTable', '#addWarehouseBtn', 'inventory/warehouse')
    handlerDeleteEvent('#warehouseTable', '#deleteWarehouseBtn', 'warehouseCheckbox', 'inventory/warehouse')
    handlerUpdateEvent('#warehouseTable', 'inventory/warehouse', (id, field, value) => {
      if (field === 'manager') {
        return { manager: value }
      }
      return { [field] : value }
    })
    initTableCheckboxEvents('#warehouseTable', 'warehouseCheckbox')
  }
})