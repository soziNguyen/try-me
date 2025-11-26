$(function () {
  // --- Biến DOM cho bộ lọc ---
  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $monthGroup = $('#monthGroup')
  const $monthSelect = $('#monthSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $filterBtn = $('#filterDateBtn')
  const $warehouseFilter = $('#warehouseFilter')

  let table
  const stocksData = {}
  const salesData = {} // 🔥 THÊM: Lưu dữ liệu đã bán
  let warehouses = []

  // Load danh sách kho
  function loadWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $warehouseFilter.append(html)
      })
      .catch((err) => {
        console.error('Không load được danh sách kho', err)
        toastr.error('Không load được danh sách kho')
      })
  }

  // Lấy dữ liệu tồn kho với filter
  function fetchStocksData() {
    const params = {
      start: 0,
      length: 9999,
      warehouse: $warehouseFilter.val() || 'all'
    }

    if ($startDate.val()) params.startDate = $startDate.val()
    if ($endDate.val()) params.endDate = $endDate.val()

    return $.ajax({
      url: '/api/product/stocks',
      method: 'GET',
      data: params
    }).then((response) => {
      if (response.totalQuantity !== undefined) {
        $('#totalEnding').text(response.totalQuantity.toLocaleString('vi-VN'))
      }

      // Reset stocksData
      Object.keys(stocksData).forEach((key) => delete stocksData[key])
      ;(response.data || []).forEach((stock) => {
        const itemId = stock.item?._id || stock.product?._id || stock.combo?._id
        if (!itemId) return
        stocksData[itemId] = (stocksData[itemId] || 0) + (stock.quantity || 0)
      })

      return response
    })
  }

  // Lấy dữ liệu đã bán
  function fetchSalesData() {
    const params = {
      warehouse: $warehouseFilter.val() || 'all',
      returnAll: 'true'
    }

    if ($startDate.val()) params.startDate = $startDate.val()
    if ($endDate.val()) params.endDate = $endDate.val()

    return $.ajax({
      url: '/api/orders/getTopItems',
      method: 'GET',
      data: params
    })
      .then((response) => {
        if (response.totalSold !== undefined && $('#totalSold').length) {
          $('#totalSold').text(response.totalSold.toLocaleString('vi-VN'))
        }

        Object.keys(salesData).forEach((key) => delete salesData[key])
        ;(response.data || []).forEach((sale) => {
          const productId = sale.product?._id
          if (!productId) return
          salesData[productId] = sale.quantitySold || 0
        })

        return response
      })
      .catch((err) => {
        console.error('Lỗi khi lấy dữ liệu đã bán:', err)
        return { data: [], totalSold: 0 }
      })
  }

  // Khởi tạo DataTable
  function initDataTable() {
    const defaultPageLength = 15
    const lengthMenu = [10, 25, 50, 100]
    if (!lengthMenu.includes(defaultPageLength)) lengthMenu.push(defaultPageLength)
    lengthMenu.sort((a, b) => a - b)

    table = $('#product-dataTable').DataTable({
      dom: `
        <"top-bar d-flex align-items-center justify-content-between flex-wrap"l f>
        rt
        <"bottom-bar d-flex justify-content-between mt-3"ip>
      `,
      serverSide: true,
      processing: true,
      autoWidth: true,
      scrollX: true,
      order: [],
      ajax: {
        url: '/api/product/entries?flatten=true',
        method: 'GET',
        data: function (d) {
          d.warehouse = $warehouseFilter.val() || 'all'
          if ($startDate.val()) d.startDate = $startDate.val()
          if ($endDate.val()) d.endDate = $endDate.val()
          return d
        },
        dataSrc: function (json) {
          const totalReceived = (json.data || []).reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          )
          $('#totalReceived').text(totalReceived.toLocaleString('vi-VN'))
          return json.data
        }
      },
      lengthMenu: [lengthMenu, lengthMenu],
      pageLength: defaultPageLength,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm sản phẩm...',
        lengthMenu: '_MENU_ sản phẩm mỗi trang',
        info: 'Hiển thị _START_ đến _END_ trên tổng _TOTAL_ sản phẩm',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(lọc từ _MAX_ sản phẩm)',
        zeroRecords: 'Không tìm thấy sản phẩm phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng',
        loadingRecords: 'Đang tải...'
      },
      columns: [
        {
          data: 'product',
          title: 'Tên sản phẩm',
          className: 'text-start fw-bold  py-2 px-3',
          render: (product) => product?.name || ''
        },
        {
          data: 'quantity',
          title: 'Số Lượng Nhập',
          className: 'text-end  py-2 px-3',
          render: (val) => formatNumber(val, 'success', true)
        },
        {
          data: null,
          title: 'Đã bán',
          className: 'text-end  py-2 px-3',
          render: (_, __, row) => {
            const productId = row.product?._id || row.productId
            const sold = salesData[productId] || 0
            return formatNumber(sold, 'danger', false, true)
          }
        },
        {
          data: null,
          title: 'Tồn kho',
          className: 'text-end  py-2 px-3',
          render: (_, __, row) => {
            const productId = row.product?._id || row.productId
            const stock = stocksData[productId] ?? (row.quantity || 0) - (row.sold || 0)
            return `<span class="number">${stock.toLocaleString('vi-VN')}</span>`
          }
        }
      ],
      rowCallback: (row, data) => $(row).attr('data-id', data._id)
    })
  }

  // Hàm format số
  function formatNumber(val = 0, color = '', isPositive = false, isNegative = false) {
    const formatted = val.toLocaleString('vi-VN')
    if (isPositive && val > 0)
      return `<span class="number text-${color} fw-semibold">+${formatted}</span>`
    if (isNegative) return `<span class="number text-${color} fw-semibold">-${formatted}</span>`
    return `<span class="number">${formatted}</span>`
  }

  // Hàm format ngày
  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Hàm set ngày theo bộ lọc
  function setDateInputs(type, value) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    if (type === 'all') {
      $monthGroup.hide()
      $quarterGroup.hide()
      $startDate.val('')
      $endDate.val('')
      reloadData()
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
        reloadData()
      }
      return
    }

    $startDate.val(formatDate(startDate))
    $endDate.val(formatDate(endDate))
    reloadData()
  }

  function reloadData() {
    Promise.all([fetchStocksData(), fetchSalesData()])
      .then(() => {
        if (table) {
          table.ajax.reload(null, false)
        }
      })
      .catch((err) => {
        console.error('Lỗi khi reload dữ liệu:', err)
        toastr.error('Không thể tải dữ liệu')
      })
  }

  // --- Sự kiện bộ lọc ---
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
      toastr.error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }
    reloadData()
  })

  $warehouseFilter.on('change', function () {
    reloadData()
  })

  loadWarehouses()
    .then(() => Promise.all([fetchStocksData(), fetchSalesData()]))
    .then(() => initDataTable())
    .catch(() => {
      toastr.error('Không load được dữ liệu')
      initDataTable()
    })

  // Thiết lập mặc định
  $monthGroup.hide()
  $quarterGroup.hide()
  $reportType.val('all')
})
