$(function () {
  let warehouses = []
  let table
  let currentStartDate = moment()
  let currentEndDate = moment()

  // ==================== DATE RANGE PICKER ====================
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
        },
        opens: 'left',
        drops: 'down'
      },
      cb
    )

    cb(currentStartDate, currentEndDate)

    $('#reportrange').on('apply.daterangepicker', function (ev, picker) {
      currentStartDate = picker.startDate
      currentEndDate = picker.endDate
      cb(picker.startDate, picker.endDate)
    })
  }

  // Khởi tạo date range picker
  initDateRangePicker()

  // Load danh sách kho trước khi khởi tạo DataTable
  Promise.all([fetchData('inventory/warehouse/all')])
    .then(([whs]) => {
      warehouses = whs
      populateWarehouseDropdown()
      initDataTable()
      loadStockReport()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  // Populate warehouse dropdown
  function populateWarehouseDropdown() {
    const options = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
    $('#warehouseFilterMain').append(options)
  }

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#stockReportTable').offset().top - 100) / 45)
  if (!showList.includes(numRows)) showList.push(numRows)
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#stockReportTable').DataTable({
      dom:
        '<"row mb-3"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 text-end"f>>' +
        '<"row"<"col-sm-12"tr>>' +
        '<"row mt-3"<"col-sm-12 bottom-bar d-flex justify-content-between"ip>>',
      // serverSide: true,
      // processing: true,
      order: [[0, 'asc']],
      pageLength: 10,
      responsive: true,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm nguyên liệu...',
        lengthMenu: '_MENU_ bản ghi mỗi trang',
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(lọc từ _MAX_ bản ghi)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Chưa có dữ liệu. Vui lòng chọn thời gian và nhấn "Xem báo cáo"',
        loadingRecords: 'Đang tải...'
      },
      columns: [
        {
          data: 'ingredient',
          title: 'Nguyên liệu',
          className: 'py-2',
          render: (data) => `<span class="text">${data ?? ''}</span>`
        },
        {
          data: 'category',
          title: 'Nhóm',
          className: 'py-2',
          render: (data) => `<span class="text badge bg-secondary">${data ?? ''}</span>`
        },
        {
          data: 'unit',
          title: 'ĐVT',
          className: 'text-center py-2',
          render: (data) => `<span class="text">${data ?? ''}</span>`
        },
        {
          data: 'beginningQty',
          title: 'Tồn đầu',
          className: 'text-end py-2',
          render: (data) => `<span class="number">${formatNumber(data)}</span>`
        },
        {
          data: 'receivedQty',
          title: 'Nhập',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            return val > 0
              ? `<span class="number text-success fw-semibold">+${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'issuedQty',
          title: 'Xuất',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            return val > 0
              ? `<span class="number text-danger fw-semibold">-${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'transferredInQty',
          title: 'Chuyển đến',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            return val > 0
              ? `<span class="number text-success fw-semibold">+${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'transferredOutQty',
          title: 'Chuyển đi',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            return val > 0
              ? `<span class="number text-danger fw-semibold">-${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'endingQty',
          title: 'Tồn cuối',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            const colorClass = val > 0 ? 'text-primary' : val < 0 ? 'text-danger' : ''
            return `<span class="number fw-bold ${colorClass}">${formatted}</span>`
          }
        }
      ]
    })
  }

  // Calculate and display summary
  function updateSummary(data) {
    let totalReceived = 0
    let totalIssued = 0
    let totalTransferred = 0
    let totalEnding = 0

    data.forEach((row) => {
      totalReceived += row.receivedQty || 0
      totalIssued += row.issuedQty || 0
      totalTransferred += (row.transferredInQty || 0) + (row.transferredOutQty || 0)
      totalEnding += row.endingQty || 0
    })

    $('#totalReceived').text(formatNumber(totalReceived))
    $('#totalIssued').text(formatNumber(totalIssued))
    $('#totalTransferred').text(formatNumber(totalTransferred))
    $('#totalEnding').text(formatNumber(totalEnding))
    $('#summaryCards').removeClass('d-none')
  }

  // Load stock report
  async function loadStockReport() {
    const from = currentStartDate.format('YYYY-MM-DD')
    const to = currentEndDate.format('YYYY-MM-DD')
    const warehouse = $('#warehouseFilterMain').val()

    const params = { from, to }

    if (warehouse && warehouse !== 'all') {
      params.warehouse = warehouse
    }

    const btnOriginalHtml = $('#btnLoad').html()
    $('#btnLoad')
      .prop('disabled', true)
      .html('<span class="spinner-border spinner-border-sm me-2"></span>Đang tải...')

    try {
      const result = await ajax('/api/reports/stock/ingredients', params, 'GET')

      if (result && Array.isArray(result)) {
        table.clear().rows.add(result).draw()
        updateSummary(result)

        if (result.length === 0) {
          toastr.info('Không có dữ liệu trong khoảng thời gian đã chọn')
          $('#summaryCards').addClass('d-none')
        } else {
          toastr.success(`Đã tải ${result.length} nguyên liệu`)
        }
      }
    } catch (err) {
      $('#summaryCards').addClass('d-none')
    } finally {
      $('#btnLoad').prop('disabled', false).html(btnOriginalHtml)
    }
  }

  // Event handlers
  $('#btnLoad').on('click', loadStockReport)
  $('#warehouseFilterMain').on('change', loadStockReport)
})
