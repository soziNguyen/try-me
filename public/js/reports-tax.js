$(function () {
  //KHAI BÁO BIẾN

  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $tbody = $('#tax-data')

  /** Format ngày -> YYYY-MM-DD */
  const formatDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  /** Format số tiền theo locale Việt Nam */
  const formatNumber = (num) => num.toLocaleString('vi-VN')

  //HÀM SET NGÀY THEO KỲ
  function setDateInputs(type, quarter) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    // --- Hiển thị tất cả ---
    if (type === 'all') {
      $reportType.val('all')
      $startDate.val('')
      $endDate.val('')
      $quarterGroup.hide()
      loadTaxSummary(null, null)
      return
    }

    // --- Theo tháng hiện tại ---
    if (type === 'month') {
      startDate = new Date(year, today.getMonth(), 1)
      endDate = new Date(year, today.getMonth() + 1, 0)
      $quarterGroup.hide()
    }

    // --- Theo quý ---
    else if (type === 'quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3) + 1
      const q = quarter || currentQuarter
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2

      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, endMonth + 1, 0)

      $quarterGroup.show()
      $quarterSelect.val(q)
    }

    // --- Tùy chọn ngày ---
    else if (type === 'custom') {
      $quarterGroup.hide()
      if ($startDate.val() && $endDate.val()) {
        loadTaxSummary($startDate.val(), $endDate.val())
      }
      return
    }

    // --- Gán lại giá trị input & tải dữ liệu ---
    $startDate.val(formatDate(startDate))
    $endDate.val(formatDate(endDate))
    loadTaxSummary(formatDate(startDate), formatDate(endDate))
  }

  async function loadTaxSummary(startDate, endDate) {
    $tbody.html('<tr><td colspan="4" class="text-center">Đang tải...</td></tr>')

    try {
      // Chuẩn bị URL gọi API
      let url = '/api/orders/get'
      if (startDate && endDate) {
        const query = new URLSearchParams({ startDate, endDate })
        url += `?${query.toString()}`
      }

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

  // Thay đổi loại kỳ
  $reportType.on('change', function () {
    setDateInputs($(this).val(), null)
  })

  // Thay đổi quý
  $quarterSelect.on('change', function () {
    setDateInputs('quarter', parseInt($(this).val()))
  })

  // Lọc theo ngày tùy chọn
  $('#filterDateBtn').on('click', function () {
    const start = $startDate.val()
    const end = $endDate.val()

    // Kiểm tra hợp lệ
    if (new Date(end) < new Date(start)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }

    loadTaxSummary(start, end)
  })
  $('#viewInvoiceBtn').on('click', function () {
    window.location.href = '/payment-receipts'
  })

  //KHỞI CHẠY MẶC ĐỊNH
  $quarterGroup.hide()
  setDateInputs('all', null)
})
