$(function () {
  // --- Biến DOM ---
  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $monthGroup = $('#monthGroup')
  const $monthSelect = $('#monthSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $filterBtn = $('#filterDateBtn')

  let salesTable
  let warehouses = []

  function loadWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $('#warehouseFilter').append(html)
      })
      .catch((err) => console.error('Không load được danh sách kho', err))
  }
  // --- Hàm định dạng tiền tệ ---
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫'
  }

  // --- Helper map dữ liệu ---
  function mapItems(items, type) {
    return (items || []).map((item) => ({ ...item, type }))
  }

  // --- Hàm khởi tạo DataTable ---
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
          title: 'Tổng tiền của món',
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

  // --- Hàm format ngày YYYY-MM-DD ---
  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // --- Hàm set ngày theo bộ lọc ---
  function setDateInputs(type, value) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    if (type === 'all') {
      $monthGroup.hide()
      $quarterGroup.hide()
      $startDate.val('')
      $endDate.val('')
      loadSummary(null, null)
      return
    }

    if (type === 'month') {
      $monthGroup.show()
      $quarterGroup.hide()
      const month = value ? value - 1 : today.getMonth()
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0)
      $monthSelect.val(month + 1)
    } else if (type === 'quarter') {
      $monthGroup.hide()
      $quarterGroup.show()
      const q = value || Math.floor(today.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, endMonth + 1, 0)
      $quarterSelect.val(q)
    } else if (type === 'custom') {
      $monthGroup.hide()
      $quarterGroup.hide()
      if ($startDate.val() && $endDate.val()) {
        loadSummary($startDate.val(), $endDate.val())
      }
      return
    }

    $startDate.val(formatDate(startDate))
    $endDate.val(formatDate(endDate))
    loadSummary(formatDate(startDate), formatDate(endDate))
  }

  // --- Hàm load dữ liệu ---
  function loadSummary(startDate, endDate, warehouse) {
    const sDate = startDate !== undefined ? startDate : $startDate.val() || null
    const eDate = endDate !== undefined ? endDate : $endDate.val() || null
    const wh = warehouse !== undefined ? warehouse : $('#warehouseFilter').val() || 'all'

    Promise.all([
      $.get('/api/orders/get', { startDate: sDate, endDate: eDate, warehouse: wh }),
      $.get('/api/orders/getTopItems', { startDate: sDate, endDate: eDate, warehouse: wh })
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
            .add({ type: '-', name: 'Không tải được dữ liệu', quantity: '-', total: 0 })
            .draw()
        }
      })
  }

  // --- Sự kiện ---
  $reportType.on('change', function () {
    setDateInputs($(this).val(), null)
  })

  $monthSelect.on('change', function () {
    setDateInputs('month', parseInt($(this).val()))
  })

  $quarterSelect.on('change', function () {
    setDateInputs('quarter', parseInt($(this).val()))
  })

  $filterBtn.on('click', function () {
    const start = $startDate.val()
    const end = $endDate.val()
    if (start && end && new Date(end) < new Date(start)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }
    loadSummary(start, end)
  })
  $('#warehouseFilter').on('change', function () {
    loadSummary($startDate.val(), $endDate.val(), $(this).val())
  })

  loadWarehouses().then(() => {
    // Có thể load báo cáo mặc định ngay sau khi danh sách kho có sẵn
    loadSummary($startDate.val(), $endDate.val(), $('#warehouseFilter').val())
  })
  // --- Khởi chạy mặc định ---
  $monthGroup.hide()
  $quarterGroup.hide()
  $reportType.val('all')
  setDateInputs('all')
})
