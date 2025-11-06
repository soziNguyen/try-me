$(function () {
  // Hàm định dạng tiền tệ
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫'
  }

  // Helper map dữ liệu với loại
  function mapItems(items, type) {
    return (items || []).map((item) => ({ ...item, type }))
  }

  // Khởi tạo DataTable
  let salesTable

  function initSalesDataTable() {
    salesTable = $('#sales-dataTable').DataTable({
      serverSide: false,
      processing: true,
      autoWidth: true,
      scrollX: true,
      ordering: false,
      columns: [
        { data: 'type', title: 'Loại', className: 'px-3 py-2' },
        { data: 'name', title: 'Tên', className: 'px-3 py-2', render: (data) => data || '-' },
        {
          data: 'quantity',
          title: 'Số lượng',
          className: 'text-center px-3 py-2',
          render: (data) => data || 0
        },
        {
          data: 'total',
          title: 'Tổng tiền',
          className: 'text-center px-3 py-2',
          render: (data) => formatCurrency(data)
        }
      ],
      rowCallback: (row, data) => {
        if (data.type.includes('bán chậm')) $(row).addClass('table-warning')
        else if (data.type.includes('bán chạy')) $(row).addClass('table-info')
      },
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm món, combo...',
        lengthMenu: '_MENU_ bản ghi',
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(lọc từ _MAX_ bản ghi)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Chưa có dữ liệu. Vui lòng chọn thời gian và nhấn "Xem báo cáo"',
        loadingRecords: 'Đang tải...'
      }
    })
  }

  // Load dữ liệu và hiển thị
  function loadSummary() {
    const startDate = $('#startDate').val()
    const endDate = $('#endDate').val()

    Promise.all([
      $.get('/api/orders/get', { startDate, endDate }),
      $.get('/api/orders/getTopItems', { startDate, endDate })
    ])
      .then(([summaryRes, topItemsRes]) => {
        const summary = summaryRes.summary || {}
        $('#summary-total-revenue').text(formatCurrency(summary.totalAmount))
        $('#summary-total-orders').text(summary.totalOrders || 0)
        $('#summary-total-items').text(summary.totalItems || 0)
        $('#summary-total-combos').text(summary.totalCombos || 0)

        const data = topItemsRes || {}
        const allRows = [
          ...mapItems(data.topSellingFoods, 'Món bán chạy'),
          ...mapItems(data.slowSellingFoods, 'Món bán chậm'),
          ...mapItems(data.topSellingCombos, 'Combo bán chạy'),
          ...mapItems(data.slowSellingCombos, 'Combo bán chậm')
        ]

        if (!salesTable) initSalesDataTable()

        salesTable.clear().rows.add(allRows).draw()
      })
      .catch((err) => {
        console.error('Lấy dữ liệu thất bại', err)
        if (salesTable) {
          salesTable.clear().draw()
          salesTable.row
            .add({
              type: '-',
              name: 'Không tải được dữ liệu',
              quantity: '-',
              total: 0
            })
            .draw()
        }
      })
  }

  // Khởi chạy
  loadSummary()
  $('#filterDateBtn').on('click', loadSummary)
})
