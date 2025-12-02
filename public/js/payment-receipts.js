$(function () {
  let table
  let warehouses = []

  // 1. Lấy danh sách kho và khởi tạo bảng
  Promise.all([fetchData('inventory/warehouse/all')])
    .then(([whs]) => {
      warehouses = whs
      initDataTable()
      initOrderTable('all')
    })
    .catch((err) => {
      toastr.error('Không load được danh sách kho', err)
      initDataTable()
      initOrderTable('all')
    })

  // 2. Khởi tạo DataTable phiếu thu
  function initDataTable() {
    const showList = getPageLengthOptions()
    const numRows = getNumRows()

    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#receiptTable1').DataTable({
      dom: getDomStructure(),
      serverSide: true,
      processing: true,
      autoWidth: true,
      scrollX: true,
      order: [],
      ajax: {
        url: '/api/payment-receipts',
        method: 'GET',
        data: (d) => ({
          ...d,
          warehouse: $('#warehouseFilter').val() || 'all',
          startDate: $('#startDate').val() || '',
          endDate: $('#endDate').val() || ''
        })
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: getDataTableLanguage(),
      columns: getColumns(),
      rowCallback: (row, data) => $(row).attr('data-id', data._id),
      initComplete: setupTableControls
    })
  }

  // 3. Khởi tạo bảng đơn hàng
  function initOrderTable(warehouseId = 'all') {
    const startDate = $('#startDate').val() || ''
    const endDate = $('#endDate').val() || ''

    $.ajax({
      url: '/api/orders/get',
      method: 'GET',
      data: {
        warehouse: warehouseId,
        startDate: startDate,
        endDate: endDate
      },
      success: function (res) {
        const data = res.data || res
        const tbody = $('#receiptTableBody2')
        tbody.empty()

        if (!data.length) {
          tbody.append(
            `<tr><td colspan="8" class="text-center text-muted">Không có đơn hàng nào</td></tr>`
          )
        } else {
          data.forEach((order) => tbody.append(buildOrderRow(order)))
        }

        // Lấy tổng phiếu thu từ DataTable
        const totalOrders = res.summary?.totalAmount || 0
        let totalReceipts = 0

        // Tính tổng từ dữ liệu DataTable đã load
        if (table && table.ajax && table.ajax.json()) {
          const receiptsData = table.ajax.json()
          if (receiptsData && receiptsData.data) {
            totalReceipts = receiptsData.data.reduce((sum, item) => {
              return sum + (Number(item.receiptAmount) || 0)
            }, 0)
          }
        }

        const grandTotal = totalOrders + totalReceipts

        updateOrderSummary({
          totalOrders: res.summary?.totalOrders || 0,
          totalAmount: grandTotal
        })
      },
      error: function (xhr) {
        console.error('Lỗi tải đơn hàng:', xhr)
        toastr.error('Không thể tải danh sách đơn hàng')
      }
    })
  }

  function getNumRows() {
    return Math.floor(($(window).height() - $('#receiptTableBody1').offset().top - 100) / 45)
  }

  function getPageLengthOptions() {
    return [10, 25, 50, 100]
  }

  function getDomStructure() {
    return (
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>'
    )
  }

  function getDataTableLanguage() {
    return {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ phiếu thu mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu thu',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ phiếu thu)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    }
  }

  function getColumns() {
    return [
      {
        data: null,
        title: '<input type="checkbox" id="selectAll">',
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="paymentReceiptsCheckbox" data-id="${row._id}">`
      },
      {
        data: 'code',
        title: 'Mã phiếu thu',
        className: 'text-center',
        render: (data) => data || ''
      },
      {
        data: 'date',
        title: 'Ngày thu',
        className: 'text-center',
        render: (data) =>
          new Date(data).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
      },
      {
        data: 'createdBy',
        title: 'Người tạo',
        className: 'text-center',
        render: (data) => data || ''
      },
      {
        data: 'submitTer',
        title: 'Họ và tên người nộp',
        className: 'text-center',
        render: (data) => data || ''
      },
      {
        data: 'warehouse.name',
        title: 'Kho thu',
        className: 'text-start px-1',
        render: (data, type, row) => {
          const w = row.warehouse || {}
          return type === 'display'
            ? w.name
              ? `${w.name}${w.location ? ' - ' + w.location : ''}`
              : ''
            : w.name || ''
        }
      },
      {
        data: 'receiptAmount',
        title: 'Số tiền (đ)',
        className: 'text-center',
        render: (data) =>
          !data && data !== 0
            ? '0 ₫'
            : Number(data).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫'
      },
      {
        data: 'reason',
        title: 'Lý do thu',
        className: 'text-center',
        render: (data) => data || ''
      },
      { data: 'note', title: 'Ghi chú', className: 'text-center', render: (data) => data || '' },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        width: '100px',
        render: (data, type, row) => `
          <button class="btn btn-sm btn-outline-primary my-1 detail-btn"
                  data-id="${row._id}"
                  title="Xem chi tiết">
            <i class="bi bi-eye"></i> Chi tiết
          </button>`
      }
    ]
  }

  // 5. Setup controls và sự kiện
  function setupTableControls() {
    const rightGroup = $('.right-group')

    const html = `
    <select id="warehouseFilter" class="form-select me-2 w-200">
      <option value="all">Tất cả kho</option>
      ${warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')}
    </select>
    <button class="btn btn-outline-danger me-2" id="deletePaymentReceiptBtn">
      <i class="bi bi-trash"></i> Xóa
    </button>
    <button class="btn btn-outline-success" id="addPaymentReceiptBtn">
      <i class="bi bi-plus-circle"></i> Thêm
    </button>
  `

    rightGroup.html(html).addClass('d-flex align-items-center')

    $('#warehouseFilter').on('change', () => {
      const selectedWarehouse = $('#warehouseFilter').val() || 'all'
      table.ajax.reload()
      initOrderTable(selectedWarehouse)
    })

    $('#addPaymentReceiptBtn').on('click', () => {
      const selectedWarehouse = $('#warehouseFilter').val()
      createNewRecord('payment-receipts', { warehouse: selectedWarehouse }, (data) => {
        window.location.href = `/payment-receipts/${data.id}?mode=new`
      })
    })

    $(document).on('click', '.detail-btn', function () {
      window.location.href = `/payment-receipts/${$(this).data('id')}`
    })

    handlerDeleteEvent(
      '#receiptTable1',
      '#deletePaymentReceiptBtn',
      'paymentReceiptsCheckbox',
      'payment-receipts'
    )
    initTableCheckboxEvents('#receiptTable1', 'paymentReceiptsCheckbox')

    $('#filetdate').on('click', function (e) {
      e.stopPropagation()
    })

    $('#filterDateBtn').on('click', function () {
      const startDate = $('#startDate').val()
      const endDate = $('#endDate').val()

      if (new Date(startDate) > new Date(endDate)) {
        toastr.error('Ngày bắt đầu phải trước ngày kết thúc')
        return
      }

      // Reload cả 2 bảng
      table.ajax.reload()
      const selectedWarehouse = $('#warehouseFilter').val() || 'all'
      initOrderTable(selectedWarehouse)

      $('#toggleFilterBtn').dropdown('hide')

      toastr.success('Đã áp dụng bộ lọc ngày')
    })
  }

  // 6. Tiện ích bảng đơn hàng
  function updateOrderSummary(summary) {
    if (!summary) return
    $('#summary-total-orders').text(summary.totalOrders || 0)
    $('#summary-total-amount').text(Number(summary.totalAmount || 0).toLocaleString('vi-VN'))
  }

  function buildOrderRow(order) {
    const tableName = order.table?.name || 'Mang về'
    const customerName = order.customer?.name?.trim() || 'Khách lẻ'
    const totalPayable = Number(order.totalPayable || 0).toLocaleString('vi-VN')
    const vatRate = order.vatRate ?? 0
    const total = Number(order.total || 0).toLocaleString('vi-VN')

    // ---- XỬ LÝ ITEMS HIỂN THỊ
    const rawItems =
      order.items
        ?.map((i) =>
          i.foodName || i.comboName
            ? `${i.foodName || i.comboName}${i.quantity > 1 ? ` x${i.quantity}` : ''}`
            : ''
        )
        .filter(Boolean) || []

    let itemsList = rawItems.slice(0, 3).join(', ')
    if (rawItems.length > 3) {
      itemsList += ` +${rawItems.length - 3} món`
    }
    if (rawItems.length === 0) {
      itemsList = '0 món'
    }

    // ---- THỜI GIAN ----
    const time = order.updatedAt
      ? new Date(order.updatedAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : ''

    return `
    <tr>
      <td class="text-center px-2 py-2">${tableName}</td>
      <td class="text-center px-2 py-2">${customerName}</td>
      <td class="text-center px-2 py-2">${itemsList}</td>
      <td class="text-center px-2 py-2">${totalPayable}</td>
      <td class="text-center px-2 py-2">${vatRate} %</td>
      <td class="text-center px-2 py-2">${total}</td>
      <td class="text-center px-2 py-2">${time}</td>
      <td class="text-center px-2 py-2">
        <button class="btn btn-sm btn-outline-primary order-detail-btn" data-id="${order._id}">
          <i class="bi bi-eye"></i> Chi tiết
        </button>
      </td>
    </tr>
  `
  }

  // 7. Chi tiết đơn hàng
  $(document).on('click', '.order-detail-btn', function () {
    const id = $(this).data('id')
    window.location.href = `/receipt/${id}?from=payment-receipt`
  })
})
