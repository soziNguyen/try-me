document.addEventListener('DOMContentLoaded', async () => {
  const orderId = document.getElementById('orderIdInput').value

  function formatCurrency(num) {
    return Number(num || 0).toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND'
    })
  }

  try {
    const response = await fetch(`/api/orders/${orderId}`)
    if (!response.ok) throw new Error('Không tìm thấy đơn hàng')

    const order = await response.json()

    // Header
    document.getElementById('orderId').textContent = order._id
    document.getElementById('orderDate').textContent = new Date(order.createdAt).toLocaleString()

    // Khách hàng và thu ngân
    const customerInfo = `${order.customerId?.name.trim()} - ${order.customerId?.phone.trim()}`
    document.getElementById('customerInfo').textContent = customerInfo || 'Khách lẻ'

    const orderTypeEl = document.getElementById('orderType')
    if (order.isTakeaway) {
      orderTypeEl.textContent = 'Mang về'
    } else if (order.tableId?.name) {
      orderTypeEl.textContent = `Bàn ${order.tableId.name} - ${order.tableId.area || ''}`
    } else {
      orderTypeEl.textContent = 'Không xác định'
    }

    // Danh sách món ăn
    const itemsContainer = document.getElementById('orderItems')
    itemsContainer.innerHTML = ''
    order.items.forEach((item, index) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td class="stt">${index + 1}</td>
        <td class="name">${item.foodId?.name || item.comboId?.name || 'Không rõ'}</td>
        <td class="price">${formatCurrency(item.price)}</td>
        <td class="qty">${item.quantity}</td>
        <td class="total text-end">${formatCurrency(item.price * item.quantity)}</td>
      `
      itemsContainer.appendChild(tr)
    })

    // Tổng giảm
    const totalDiscount = (order.discount || 0) + (order.pointsDiscount || 0)

    // Tổng tiền & giảm
    document.getElementById('totalAmount').textContent = formatCurrency(order.totalAmount)
    document.getElementById('discount').textContent = formatCurrency(order.discount)
    document.getElementById('pointsDiscount').textContent = formatCurrency(order.pointsDiscount)
    document.getElementById('totalDiscount').textContent = formatCurrency(totalDiscount)
    document.getElementById('serviceCharge').textContent = formatCurrency(order.serviceCharge)

    // VAT
    const vatAmount = Math.round(
      (order.totalAmount - totalDiscount + order.serviceCharge) * (order.vatRate / 100)
    )
    const vatRateText = order.vatRate ? `${order.vatRate}%` : '0%'
    document.getElementById('vatAmount').textContent =
      `${vatRateText} (${formatCurrency(vatAmount)})`

    // Thành tiền & khách trả
    document.getElementById('total').textContent = formatCurrency(order.total)
    document.getElementById('customerPaid').textContent = formatCurrency(order.customerPaid)
    document.getElementById('changeAmount').textContent = formatCurrency(order.changeAmount)

    // Hiển thị QR nếu có
    if (order.qrCode) {
      const qrContainer = document.getElementById('qrCodeContainer')
      qrContainer.innerHTML = `<img src="${order.qrCode}" alt="QR Code thanh toán" style="width:150px; height:150px;" />`
    }

    // In hóa đơn
    window.print()
  } catch (error) {
    console.error('Lỗi lấy dữ liệu đơn hàng:', error)
    alert('Lỗi khi tải hóa đơn, vui lòng thử lại sau.')
  }
})
