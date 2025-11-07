$(function () {
  // KHAI BÁO BIẾN
  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $monthGroup = $('#monthGroup')
  const $monthSelect = $('#monthSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $tbody = $('#tax-data')
  const $warehouseFilter = $('#warehouseFilter')

  let warehouses = []

  // HÀM HỖ TRỢ
  const formatDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const formatNumber = (num) => num.toLocaleString('vi-VN')

  function fetchWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $warehouseFilter.html('<option value="all" selected>Tất cả kho</option>' + html)
      })
      .catch((err) => console.error('Không load được danh sách kho', err))
  }

  // SET NGÀY THEO KỲ
  function setDateInputs(type, value) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    if (type === 'all') {
      $reportType.val('all')
      $startDate.val('')
      $endDate.val('')
      $quarterGroup.hide()
      $monthGroup.hide()
    } else if (type === 'month') {
      $quarterGroup.hide()
      $monthGroup.show()
      const month = value ? value - 1 : today.getMonth()
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0)
      $monthSelect.val(month + 1)
    } else if (type === 'quarter') {
      $monthGroup.hide()
      $quarterGroup.show()
      const currentQuarter = Math.floor(today.getMonth() / 3) + 1
      const q = value || currentQuarter
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, endMonth + 1, 0)
      $quarterSelect.val(q)
    } else if (type === 'custom') {
      $quarterGroup.hide()
      $monthGroup.hide()
      startDate = $startDate.val() ? new Date($startDate.val()) : null
      endDate = $endDate.val() ? new Date($endDate.val()) : null
    }

    if (startDate && endDate) {
      $startDate.val(formatDate(startDate))
      $endDate.val(formatDate(endDate))
    }

    loadTaxSummary($startDate.val() || null, $endDate.val() || null)
  }

  // LOAD DỮ LIỆU
  async function loadTaxSummary(startDate, endDate) {
    $tbody.html('<tr><td colspan="4" class="text-center">Đang tải...</td></tr>')

    try {
      let url = '/api/orders/get'
      const query = {}

      if (startDate) query.startDate = startDate
      if (endDate) query.endDate = endDate

      const warehouse = $warehouseFilter.val()
      if (warehouse && warehouse !== 'all') query.warehouse = warehouse

      if (Object.keys(query).length) url += `?${new URLSearchParams(query).toString()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const result = await res.json()
      $tbody.empty()

      if (result.summary && result.summary.totalAmount > 0) {
        const { totalBeforeTax, totalAmount } = result.summary
        const vat = totalAmount - totalBeforeTax
        const period = startDate && endDate ? `${startDate} - ${endDate}` : 'Tất cả'

        $tbody.append(`
          <tr>
            <td class="text-center px-3 py-2">${period}</td>
            <td class="text-center px-3 py-2">${formatNumber(totalBeforeTax)}</td>
            <td class="text-center px-3 py-2">${formatNumber(vat)}</td>
            <td class="text-center px-3 py-2">${formatNumber(totalAmount)}</td>
          </tr>
        `)
      } else {
        $tbody.html('<tr><td colspan="4" class="text-center">Không có dữ liệu</td></tr>')
      }
    } catch (err) {
      console.error('Lỗi load báo cáo thuế:', err)
      $tbody.html(
        '<tr><td colspan="4" class="text-center text-danger">Không thể tải dữ liệu</td></tr>'
      )
    }
  }

  // EVENT HANDLERS
  $reportType.on('change', () => setDateInputs($reportType.val(), null))
  $quarterSelect.on('change', () => setDateInputs('quarter', parseInt($quarterSelect.val())))
  $monthSelect.on('change', () => setDateInputs('month', parseInt($monthSelect.val())))

  $('#filterDateBtn').on('click', () => {
    const start = $startDate.val()
    const end = $endDate.val()
    if (new Date(end) < new Date(start)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }
    loadTaxSummary(start, end)
  })

  $warehouseFilter.on('change', () => {
    const start = $startDate.val() || null
    const end = $endDate.val() || null
    loadTaxSummary(start, end)
  })

  $('#viewInvoiceBtn').on('click', () => (window.location.href = '/payment-receipts'))

  // KHỞI CHẠY
  $quarterGroup.hide()
  $monthGroup.hide()
  fetchWarehouses().then(() => setDateInputs('all', null))
})
