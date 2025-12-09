$(function () {
  const $filterBtn = $('#filterDateBtn')
  const $warehouseFilter = $('#warehouseFilter')

  let table,
    warehouses = []
  const stocksData = {},
    salesData = {}

  function formatNumber(val = 0, color = '', isPositive = false, isNegative = false) {
    const formatted = val.toLocaleString('vi-VN')
    if (isPositive && val > 0)
      return `<span class="number text-${color} fw-semibold">+${formatted}</span>`
    if (isNegative) return `<span class="number text-${color} fw-semibold">-${formatted}</span>`
    return `<span class="number">${formatted}</span>`
  }

  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function loadWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        $warehouseFilter.append(
          warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        )
      })
      .catch((err) => {
        console.error('Không load được danh sách kho', err)
        toastr.error('Không load được danh sách kho')
      })
  }

  function fetchStocksData() {
    const params = { start: 0, length: 9999, warehouse: $warehouseFilter.val() || 'all' }
    params.startDate = currentStartDate.format('YYYY-MM-DD')
    params.endDate = currentEndDate.format('YYYY-MM-DD')

    return $.ajax({ url: '/api/product/stocks', method: 'GET', data: params }).then((response) => {
      if (response.totalQuantity !== undefined)
        $('#totalEnding').text(response.totalQuantity.toLocaleString('vi-VN'))
      Object.keys(stocksData).forEach((key) => delete stocksData[key])
      ;(response.data || []).forEach((stock) => {
        const itemId = stock.item?._id || stock.product?._id || stock.combo?._id
        if (itemId) stocksData[itemId] = (stocksData[itemId] || 0) + (stock.quantity || 0)
      })
      return response
    })
  }

  function fetchSalesData() {
    const params = { warehouse: $warehouseFilter.val() || 'all', returnAll: 'true' }
    params.startDate = currentStartDate.format('YYYY-MM-DD')
    params.endDate = currentEndDate.format('YYYY-MM-DD')

    return $.ajax({ url: '/api/orders/getTopItems', method: 'GET', data: params })
      .then((response) => {
        if (response.totalSold !== undefined && $('#totalSold').length) {
          $('#totalSold').text(response.totalSold.toLocaleString('vi-VN'))
        }
        Object.keys(salesData).forEach((key) => delete salesData[key])
        ;(response.data || []).forEach((sale) => {
          if (sale.product?._id) salesData[sale.product._id] = sale.quantitySold || 0
        })
        return response
      })
      .catch((err) => {
        console.error('Lỗi khi lấy dữ liệu đã bán:', err)
        return { data: [], totalSold: 0 }
      })
  }

  function initDataTable() {
    const defaultPageLength = 15
    const lengthMenu = [10, 25, 50, 100]
    if (!lengthMenu.includes(defaultPageLength)) lengthMenu.push(defaultPageLength)
    lengthMenu.sort((a, b) => a - b)

    table = $('#product-dataTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap"l f>rt<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: true,
      scrollX: true,
      order: [],
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
      ajax: {
        url: '/api/product/entries?flatten=true',
        method: 'GET',
        data: (d) => {
          d.warehouse = $warehouseFilter.val() || 'all'
          d.startDate = currentStartDate.format('YYYY-MM-DD')
          d.endDate = currentEndDate.format('YYYY-MM-DD')
          return d
        },
        dataSrc: (json) => {
          if (json.totalReceived !== undefined) {
            $('#totalReceived').text(json.totalReceived.toLocaleString('vi-VN'))
          }
          return json.data
        }
      },
      columns: [
        {
          data: 'product',
          name: 'product.name',
          title: 'Tên sản phẩm',
          className: 'text-start fw-bold py-2 px-3',
          orderable: true,
          render: (data, type, row) => row.product?.name || ''
        },
        {
          data: 'quantity',
          name: 'quantity',
          title: 'Số Lượng Nhập',
          className: 'text-end py-2 px-3',
          orderable: true,
          render: (val) => formatNumber(val, 'success', true)
        },
        {
          data: null,
          name: 'sold',
          title: 'Đã bán',
          className: 'text-end py-2 px-3',
          orderable: false,
          render: (_, __, row) => {
            const sold = salesData[row.product?._id || row.productId] || 0
            return formatNumber(sold, 'danger', false, true)
          }
        },
        {
          data: 'stock',
          name: 'stock',
          title: 'Tồn kho',
          className: 'text-end py-2 px-3',
          orderable: true,
          render: (data, type, row) => {
            const stock = data ?? stocksData[row.product?._id || row.productId] ?? 0
            return type === 'sort' || type === 'type'
              ? stock
              : `<span class="number">${stock.toLocaleString('vi-VN')}</span>`
          }
        }
      ],
      rowCallback: (row, data) => $(row).attr('data-id', data._id)
    })
  }

  // ==================== DATE RANGE PICKER ====================
  let currentStartDate = moment().subtract(29, 'days')
  let currentEndDate = moment()

  function initDateRangePicker() {
    function cb(start, end) {
      $('#reportrange span').html(start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY'))
      currentStartDate = start
      currentEndDate = end
    }

    $('#reportrange').daterangepicker(
      {
        startDate: currentStartDate,
        endDate: currentEndDate,
        locale: {
          format: 'DD/MM/YYYY',
          separator: ' - ',
          applyLabel: 'Áp dụng',
          cancelLabel: 'Hủy',
          fromLabel: 'Từ',
          toLabel: 'Đến',
          customRangeLabel: 'Tùy chỉnh',
          daysOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
          monthNames: [
            'Tháng 1',
            'Tháng 2',
            'Tháng 3',
            'Tháng 4',
            'Tháng 5',
            'Tháng 6',
            'Tháng 7',
            'Tháng 8',
            'Tháng 9',
            'Tháng 10',
            'Tháng 11',
            'Tháng 12'
          ],
          firstDay: 1
        },
        ranges: {
          'Hôm nay': [moment(), moment()],
          'Hôm qua': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
          '7 ngày qua': [moment().subtract(6, 'days'), moment()],
          '30 ngày qua': [moment().subtract(29, 'days'), moment()],
          'Tháng này': [moment().startOf('month'), moment().endOf('month')],
          'Tháng trước': [
            moment().subtract(1, 'month').startOf('month'),
            moment().subtract(1, 'month').endOf('month')
          ],
          'Quý này': [moment().startOf('quarter'), moment().endOf('quarter')],
          'Quý trước': [
            moment().subtract(1, 'quarter').startOf('quarter'),
            moment().subtract(1, 'quarter').endOf('quarter')
          ]
        }
      },
      cb
    )

    cb(currentStartDate, currentEndDate)

    // Lắng nghe sự kiện apply
    $('#reportrange').on('apply.daterangepicker', function (ev, picker) {
      currentStartDate = picker.startDate
      currentEndDate = picker.endDate
      cb(picker.startDate, picker.endDate)
    })
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

  // ==================== SỰ KIỆN ====================
  $filterBtn.on('click', function () {
    reloadData()
  })

  $warehouseFilter.on('change', function () {
    reloadData()
  })

  // ==================== KHỞI TẠO ====================
  // Khởi tạo Date Range Picker trước
  initDateRangePicker()

  // Load dữ liệu ban đầu
  loadWarehouses()
    .then(() => Promise.all([fetchStocksData(), fetchSalesData()]))
    .then(() => initDataTable())
    .catch(() => {
      toastr.error('Không load được dữ liệu')
      initDataTable()
    })
})
