$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#paymentMethodTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  initDataTable()

  function initDataTable() {
    $('#paymentMethodTable').DataTable({
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
      order: [[1, 'asc']], // sắp theo sortOrder
      ajax: {
        url: '/api/admin/payment-methods',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ bản ghi mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ bản ghi)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          title: '<input type="checkbox" id="selectAll">',
          render: (data, type, row) =>
            `<input type="checkbox" class="paymentMethodCheckbox" data-id="${row._id}">`
        },
        {
          data: 'sortOrder',
          title: 'Thứ tự',
          className: 'text-center',
          render: (data, type) =>
            type === 'display'
              ? `<input type="number" class="dataInput border-0 text-center form-control" data-field="sortOrder" value="${data ?? 0}">`
              : data
        },
        {
          data: 'name',
          title: 'Tên hiển thị',
          render: (data, type) =>
            type === 'display'
              ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
              : data
        },
        {
          data: 'code',
          title: 'Mã',
          render: (data, type) =>
            type === 'display'
              ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="code" value="${data ?? ''}" readonly>`
              : data
        },
        {
          data: 'description',
          title: 'Mô tả',
          render: (data, type) =>
            type === 'display'
              ? `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data ?? ''}">`
              : data
        },
        {
          data: 'isActive',
          title: 'Kích hoạt',
          className: 'text-center',
          render: (data, type, row) =>
            type === 'display'
              ? `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
              : data
        },
        {
          data: null,
          title: 'Cấu hình',
          className: 'text-center',
          orderable: false,
          render: (data, type, row) =>
            type === 'display'
              ? `<button class="btn btn-sm btn-outline-primary configBtn" data-id="${row._id}">
                  <i class="bi bi-gear"></i> Cấu hình
                </button>`
              : ''
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deletePaymentMethodBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addPaymentMethodBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })
  }

  handlerDeleteEvent(
    '#paymentMethodTable',
    '#deletePaymentMethodBtn',
    'paymentMethodCheckbox',
    'payment-method'
  )
  handlerUpdateEvent('#paymentMethodTable', 'admin')
  initTableCheckboxEvents('#paymentMethodTable', 'paymentMethodCheckbox')
})
