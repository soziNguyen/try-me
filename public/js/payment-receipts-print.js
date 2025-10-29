$(function () {
  const printData = JSON.parse(localStorage.getItem('printData'))
  if (!printData) return alert('Không có dữ liệu để in!')

  const { summary, startDate, endDate, tableData } = printData

  // Điền thông tin tổng hợp
  $('#print-total-orders').text(summary.totalOrders)
  $('#print-total-amount').text(summary.totalAmount)

  const dateText =
    startDate && endDate
      ? `${startDate} → ${endDate}`
      : startDate
        ? `Từ ${startDate}`
        : endDate
          ? `Đến ${endDate}`
          : 'Tất cả'
  $('#print-filter-date').text(dateText)

  // Điền dữ liệu table
  const tbody = $('#print-receipt-body')
  tbody.empty()

  tableData.forEach(({ table, customer, items = [], total, updatedAt }) => {
    const tableName = table?.name || 'Mang về'
    const customerName = customer?.name || ''
    const itemText = items.length
      ? items
          .map((i) => i.foodName || i.comboName)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') + (items.length > 3 ? ` +${items.length - 3} món` : '')
      : '0 món'
    const totalText = Number(total || 0).toLocaleString('vi-VN')
    const timeText = new Date(updatedAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    tbody.append(`
      <tr>
        <td>${tableName}</td>
        <td>${customerName}</td>
        <td>${itemText}</td>
        <td>${totalText}</td>
        <td>${timeText}</td>
      </tr>
    `)
  })

  window.print()
})
