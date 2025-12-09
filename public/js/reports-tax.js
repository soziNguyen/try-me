$(function () {
  // KHAI BÁO BIẾN
  const $warehouseFilter = $('#warehouseFilter')
  const $filterBtn = $('#filterDateBtn')

  // Các bảng dữ liệu
  const $taxTbody = $('#tax-data')
  const $expenseTbody = $('#expense-data')
  const $receiptsTbody = $('#receipts-data')

  let warehouses = []

  // --- DATE RANGE PICKER ---
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

  // HÀM TIỆN ÍCH
  const formatNumber = (num) => num.toLocaleString('vi-VN')

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0)
  }

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // LẤY DỮ LIỆU
  function fetchWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $warehouseFilter.html('<option value="all" selected>Tất cả kho</option>' + html)
      })
      .catch((err) => console.error('Không load được danh sách kho', err))
  }

  function loadAllTables() {
    const startDate = currentStartDate.format('YYYY-MM-DD')
    const endDate = currentEndDate.format('YYYY-MM-DD')

    loadTaxSummary(startDate, endDate)
    loadExpenseSummary(startDate, endDate)
    loadReceiptsSummary(startDate, endDate)
    updateBalanceSummary(startDate, endDate)
  }

  // RENDER BẢNG DỮ LIỆU

  // Bảng hóa đơn
  async function loadTaxSummary(startDate, endDate) {
    $taxTbody.html('<tr><td colspan="4" class="text-center">Đang tải...</td></tr>')

    try {
      let url = '/api/orders/get'
      const query = {}

      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate

      const warehouse = $warehouseFilter.val()
      if (warehouse && warehouse !== 'all') query.warehouse = warehouse

      if (Object.keys(query).length) {
        url += `?${new URLSearchParams(query).toString()}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const result = await res.json()

      $taxTbody.empty()

      if (result.summary && result.summary.totalAmount > 0) {
        const { totalBeforeTax, totalAmount } = result.summary
        const vat = totalAmount - totalBeforeTax
        const period = startDate && endDate ? `${startDate} - ${endDate}` : 'Tất cả'

        $taxTbody.append(`
          <tr class="clickable-row cursor-pointer">
            <td class="text-center px-3 py-2">${period}</td>
            <td class="text-center px-3 py-2">${formatNumber(totalBeforeTax)}</td>
            <td class="text-center px-3 py-2">${formatNumber(vat)}</td>
            <td class="text-center px-3 py-2">${formatNumber(totalAmount)}</td>
          </tr>
        `)
      } else {
        $taxTbody.html('<tr><td colspan="4" class="text-center">Không có dữ liệu</td></tr>')
      }
    } catch (err) {
      console.error('Lỗi load báo cáo hóa đơn:', err)
      $taxTbody.html(
        '<tr><td colspan="4" class="text-center text-danger">Không thể tải dữ liệu</td></tr>'
      )
    }
  }

  // Bảng phiếu chi
  async function loadExpenseSummary(startDate, endDate) {
    $expenseTbody.html('<tr><td colspan="5" class="text-center">Đang tải...</td></tr>')

    try {
      let url = '/api/payment-expenses'
      const query = { start: 0, length: 10000 }

      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate

      const warehouse = $warehouseFilter.val()
      if (warehouse && warehouse !== 'all') query.warehouse = warehouse

      url += `?${new URLSearchParams(query).toString()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const result = await res.json()

      $expenseTbody.empty()

      if (result.data && result.data.length > 0) {
        result.data.forEach((item) => {
          $expenseTbody.append(`
            <tr class="expense-clickable-row cursor-pointer" data-id="${item._id}">
              <td class="text-center px-3 py-2">${item.code || 'N/A'}</td>
              <td class="text-center px-3 py-2">${formatDisplayDate(item.date)}</td>
              <td class="text-center px-3 py-2">${item.warehouse?.name || 'N/A'}</td>
              <td class="text-center px-3 py-2">1</td>
              <td class="text-center px-3 py-2">${formatCurrency(item.expenseAmount)}</td>
            </tr>
          `)
        })

        if (result.summary) {
          $expenseTbody.append(`
            <tr class="table-warning fw-bold">
              <td colspan="3" class="px-3 py-2">Tổng cộng:</td>
              <td class="text-center px-3 py-2">${result.summary.totalExpenses}</td>
              <td class="text-center px-3 py-2">${formatCurrency(result.summary.totalAmount)}</td>
            </tr>
          `)
        }
      } else {
        $expenseTbody.html('<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>')
      }
      const expenseScroll = $expenseTbody.closest('.table-scroll')[0]
      if (expenseScroll) {
        expenseScroll.scrollTop = expenseScroll.scrollHeight
      }
    } catch (err) {
      console.error('Lỗi load báo cáo phiếu chi:', err)
      $expenseTbody.html(
        '<tr><td colspan="5" class="text-center text-danger">Không thể tải dữ liệu</td></tr>'
      )
    }
  }

  // Bảng phiếu thu
  async function loadReceiptsSummary(startDate, endDate) {
    $receiptsTbody.html('<tr><td colspan="5" class="text-center">Đang tải...</td></tr>')

    try {
      let url = '/api/payment-receipts'
      const query = { start: 0, length: 10000 }

      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate

      const warehouse = $warehouseFilter.val()
      if (warehouse && warehouse !== 'all') query.warehouse = warehouse

      url += `?${new URLSearchParams(query).toString()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const result = await res.json()

      $receiptsTbody.empty()

      if (result.data && result.data.length > 0) {
        result.data.forEach((item) => {
          $receiptsTbody.append(`
            <tr class="receipt-clickable-row cursor-pointer" data-id="${item._id}">
              <td class="text-center px-3 py-2">${item.code || 'N/A'}</td>
              <td class="text-center px-3 py-2">${formatDisplayDate(item.date)}</td>
              <td class="text-center px-3 py-2">${item.warehouse?.name || 'N/A'}</td>
              <td class="text-center px-3 py-2">1</td>
              <td class="text-center px-3 py-2">${formatCurrency(item.receiptAmount)}</td>
            </tr>
          `)
        })

        if (result.summary) {
          $receiptsTbody.append(`
            <tr class="table-success fw-bold">
              <td colspan="3" class="px-3 py-2">Tổng cộng:</td>
              <td class="text-center px-3 py-2">${result.summary.totalReceipts}</td>
              <td class="text-center px-3 py-2">${formatCurrency(result.summary.totalAmount)}</td>
            </tr>
          `)
        }
      } else {
        $receiptsTbody.html('<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>')
      }
      const receiptsScroll = $receiptsTbody.closest('.table-scroll')[0]
      if (receiptsScroll) {
        receiptsScroll.scrollTop = receiptsScroll.scrollHeight
      }
    } catch (err) {
      console.error('Lỗi load báo cáo phiếu thu:', err)
      $receiptsTbody.html(
        '<tr><td colspan="5" class="text-center text-danger">Không thể tải dữ liệu</td></tr>'
      )
    }
  }

  async function updateBalanceSummary(startDate, endDate) {
    try {
      const query = { start: 0, length: 10000 }

      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate

      // Thêm filter warehouse
      const warehouse = $warehouseFilter.val()
      if (warehouse && warehouse !== 'all') {
        query.warehouse = warehouse
      }

      // Gọi cả 3 API: phiếu thu, phiếu chi, hóa đơn
      const [receiptsRes, expensesRes, ordersRes] = await Promise.all([
        fetch(`/api/payment-receipts?${new URLSearchParams(query)}`),
        fetch(`/api/payment-expenses?${new URLSearchParams(query)}`),
        fetch(`/api/orders/get?${new URLSearchParams(query)}`)
      ])

      const receiptsData = await receiptsRes.json()
      const expensesData = await expensesRes.json()
      const ordersData = await ordersRes.json()

      const totalReceiptsFromReceipts = receiptsData.summary?.totalAmount || 0

      const totalFromOrders = ordersData.summary?.totalAmount || 0

      // Tổng thu = Phiếu thu + Hóa đơn
      const totalReceipts = totalReceiptsFromReceipts + totalFromOrders

      // Tổng chi
      const totalExpenses = expensesData.summary?.totalAmount || 0

      // Kết quả
      const balance = totalReceipts - totalExpenses

      $('#total-receipts').text(formatCurrency(totalReceipts))
      $('#total-expenses').text(formatCurrency(totalExpenses))

      const $result = $('#result-balance')
      let color = balance >= 0 ? 'text-success' : 'text-danger'
      let text = balance >= 0 ? 'Lãi' : 'Lỗ'

      $result.html(`<span class="${color}">${text}: ${formatCurrency(Math.abs(balance))}</span>`)
    } catch (err) {
      console.error('Lỗi tính tổng thu chi:', err)
      $('#result-balance').html('<span class="text-danger">Không tính được</span>')
    }
  }

  // XỬ LÝ SỰ KIỆN
  $filterBtn.on('click', function () {
    loadAllTables()
  })

  $warehouseFilter.on('change', function () {
    loadAllTables()
  })

  $(document).on('click', '.clickable-row', function () {
    window.location.href = '/payment-receipts'
  })

  $(document).on('click', '.receipt-clickable-row', function () {
    const id = $(this).data('id')
    window.location.href = `/payment-receipts/${id}`
  })

  $(document).on('click', '.expense-clickable-row', function () {
    const id = $(this).data('id')
    window.location.href = `/payment-expenses/${id}`
  })

  // KHỞI TẠO
  initDateRangePicker()

  fetchWarehouses().then(() => {
    loadAllTables()
  })
})
