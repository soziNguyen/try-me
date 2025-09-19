document.addEventListener('DOMContentLoaded', async () => {
  const orderId = document.getElementById('orderIdInput').value

  let provinceLists = []
  let communeLists = []

  // === Load full_address.json ===
  async function loadAddressData() {
    try {
      const res = await fetch('/data/full_address.json')
      const data = await res.json()
      if (data.error === 0 && data.data) {
        provinceLists = data.data
        communeLists = provinceLists.flatMap(p => p.data2 || [])
      }
    } catch (err) {
      console.error('Lỗi load full_address.json:', err)
    }
  }

  // === Map code → tên tỉnh/xã ===
  function getAddressName(street, communeCode, provinceCode) {
    const province = provinceLists.find(p => String(p.id) === String(provinceCode))
    const commune = communeLists.find(c => String(c.id) === String(communeCode))

    const provinceName = province?.name || ''
    const communeName = commune?.name || ''

    return `${street || ''}${communeName ? ', ' + communeName : ''}${provinceName ? ', ' + provinceName : ''}`
  }

  // === Format tiền ===
  function formatCurrency(num) {
    return Number(num || 0).toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND'
    })
  }

  // === Format DateTime ===
  function formatDateTime(dateStr) {
    const d = new Date(dateStr)
    if (isNaN(d)) return ''
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
  }

  try {
    // Bắt buộc load địa chỉ trước
    await loadAddressData()

    // Lấy dữ liệu order
    const response = await fetch(`/api/orders/${orderId}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: Không tìm thấy đơn hàng`)

    const result = await response.json()
    const order = result.data || result

    // === HEADER ===
    document.getElementById('orderId').textContent = order.code
    document.getElementById('orderDate').textContent = formatDateTime(order.createdAt)

    // Địa chỉ cửa hàng
    const storeAddress = getAddressName(
      order.organization?.street,
      order.organization?.commune,
      order.organization?.province
    )
    document.querySelector('.org-address').textContent = storeAddress

    // Khách hàng
    const customerInfo = order.customerId
      ? `${order.customerId.name?.trim()}${order.customerId.phone ? ' - ' + order.customerId.phone?.trim() : ''}`
      : 'Khách lẻ'
    document.getElementById('customerInfo').textContent = customerInfo

    // Loại hóa đơn
    const orderTypeEl = document.getElementById('orderType')
    if (order.isTakeaway) {
      orderTypeEl.textContent = 'Mang về'
    } else if (order.tableId?.name) {
      orderTypeEl.textContent = `Bàn ${order.tableId.name} - ${order.tableId.area || ''}`
    } else {
      orderTypeEl.textContent = 'Không xác định'
    }

    // === DANH SÁCH MÓN ĂN ===
    const itemsContainer = document.getElementById('orderItems')
    itemsContainer.innerHTML = ''
    if (order.items?.length) {
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
    }

    // === TỔNG HỢP ===
    const totalDiscount = (order.discount || 0) + (order.pointsDiscount || 0)

    document.getElementById('totalAmount').textContent = formatCurrency(order.totalAmount)
    document.getElementById('discount').textContent = formatCurrency(order.discount)
    document.getElementById('pointsDiscount').textContent = formatCurrency(order.pointsDiscount)
    document.getElementById('totalDiscount').textContent = formatCurrency(totalDiscount)
    document.getElementById('serviceCharge').textContent = formatCurrency(order.serviceCharge)

    const vatAmount = Math.round(
      (order.totalAmount - totalDiscount + (order.serviceCharge || 0)) *
      ((order.vatRate || 0) / 100)
    )
    const vatRateText = order.vatRate ? `${order.vatRate}%` : '0%'
    document.getElementById('vatAmount').textContent = `${vatRateText} (${formatCurrency(vatAmount)})`

    document.getElementById('total').textContent = formatCurrency(order.total)
    document.getElementById('customerPaid').textContent = formatCurrency(order.customerPaid)
    document.getElementById('changeAmount').textContent = formatCurrency(order.changeAmount)
    document.getElementById('totalInWords').textContent = numberToVietnameseWords(order.total)

    // === TÀI KHOẢN NHẬN ===
    const receivingAccountEl = document.getElementById('receivingAccountInfo')
    const receivingAccount = order.paymentMethodId?.receivingAccountId
    if (receivingAccount) {
      receivingAccountEl.innerHTML = `
        <p><strong>Ngân hàng:</strong> ${receivingAccount.bankName || '--'}</p>
        <p><strong>Số tài khoản:</strong> ${receivingAccount.accountNumber || '--'}</p>
        <p><strong>Chủ tài khoản:</strong> ${receivingAccount.name || '--'}</p>
      `
    } else {
      receivingAccountEl.innerHTML = ''
    }

    // === QR CODE ===
    const qrContainer = document.getElementById('qrCodeContainer')
    if (order.qrCode?.trim()) {
      const img = new Image()
      img.onload = () => {
        qrContainer.innerHTML = `<img src="${order.qrCode}" alt="QR Code thanh toán" class="qr-code" />`
      }
      img.onerror = () => {
        qrContainer.innerHTML = '<p>Không thể tải QR Code</p>'
      }
      img.src = order.qrCode
    } else {
      qrContainer.innerHTML = ''
    }

    // In sau khi render xong
    if (window.location.href.includes('print')) {
      setTimeout(() => window.print(), 500)
    }

  } catch (error) {
    console.error('Lỗi lấy dữ liệu đơn hàng:', error)
  }
})
