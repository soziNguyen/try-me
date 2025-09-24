$(function () {
  const editableFields = ['code', 'name', 'phone', 'email', 'country', 'address', 'taxId']
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#supplierTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#supplierTable').DataTable({
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
    // scrollX: true,
    order: [],
    ajax: {
      url: '/api/inventory/suppliers',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ nhà cung cấp mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ nhà cung cấp',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ nhà cung cấp)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="supplierCheckbox" data-id="${row._id}">`
      },
      ...editableFields.map((field) => ({
        data: field,
        render: inputRenderer(field)
      })),
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
      {
        data: 'note',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="note" value="${data ?? ''}">`
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
      // const api = this.api()
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deleteSupplierBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addSupplierBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
      // $(window).on('resize', function () {
      //   api.columns.adjust()
      // })
    }
  })

  //====================================================================================
  // EVENT HANDLER
  handlerAddEvent('#supplierTable', '#addSupplierBtn', 'inventory/supplier')
  handlerDeleteEvent(
    '#supplierTable',
    '#deleteSupplierBtn',
    'supplierCheckbox',
    'inventory/supplier'
  )
  handlerUpdateEvent('#supplierTable', 'inventory/supplier')
  initTableCheckboxEvents('#supplierTable', 'supplierCheckbox')
})
