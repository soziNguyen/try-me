$(function () {
  // KHAI BÁO BIẾN

  // Điều khiển bộ lọc
  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $monthGroup = $('#monthGroup')
  const $monthSelect = $('#monthSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $warehouseFilter = $('#warehouseFilter')

  // Các bảng dữ liệu
  const $taxTbody = $('#tax-data')
  const $expenseTbody = $('#expense-data')
  const $receiptsTbody = $('#receipts-data')

  let warehouses = []

  // HÀM TIỆN ÍCH

  const formatDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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

  // XỬ LÝ BỘ LỌC NGÀY

  function setDateInputs(type, value) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    switch (type) {
      case 'all':
        $reportType.val('all')
        $startDate.val('')
        $endDate.val('')
        $quarterGroup.hide()
        $monthGroup.hide()
        break

      case 'month':
        $quarterGroup.hide()
        $monthGroup.show()
        const month = value ? value - 1 : today.getMonth()
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0)
        $monthSelect.val(month + 1)
        break

      case 'quarter':
        $monthGroup.hide()
        $quarterGroup.show()
        const currentQuarter = Math.floor(today.getMonth() / 3) + 1
        const q = value || currentQuarter
        const startMonth = (q - 1) * 3
        const endMonth = startMonth + 2
        startDate = new Date(year, startMonth, 1)
        endDate = new Date(year, endMonth + 1, 0)
        $quarterSelect.val(q)
        break

      case 'custom':
        $quarterGroup.hide()
        $monthGroup.hide()
        startDate = $startDate.val() ? new Date($startDate.val()) : null
        endDate = $endDate.val() ? new Date($endDate.val()) : null
        break
    }

    if (startDate && endDate) {
      $startDate.val(formatDate(startDate))
      $endDate.val(formatDate(endDate))
    }

    loadAllTables($startDate.val() || null, $endDate.val() || null)
  }

  function loadAllTables(startDate, endDate) {
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

  $reportType.on('change', () => setDateInputs($reportType.val(), null))
  $quarterSelect.on('change', () => setDateInputs('quarter', parseInt($quarterSelect.val())))
  $monthSelect.on('change', () => setDateInputs('month', parseInt($monthSelect.val())))

  $('#filterDateBtn').on('click', () => {
    const start = $startDate.val()
    const end = $endDate.val()

    if (end && start && new Date(end) < new Date(start)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }

    loadAllTables(start, end)
  })

  $warehouseFilter.on('change', () => {
    const start = $startDate.val() || null
    const end = $endDate.val() || null
    loadAllTables(start, end)
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

  $quarterGroup.hide()
  $monthGroup.hide()
  fetchWarehouses().then(() => setDateInputs('all', null))
})
