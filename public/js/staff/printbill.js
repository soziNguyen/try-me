document.addEventListener('DOMContentLoaded', async () => {
  const orderId = document.getElementById('orderIdInput').value

  let provinceLists = []
  let communeLists = []
  let invoiceOptions = {}

  // === Load full_address.json ===
  async function loadAddressData() {
    try {
      const res = await fetch('/data/full_address.json')
      const data = await res.json()
      if (data.error === 0 && data.data) {
        provinceLists = data.data
        communeLists = provinceLists.flatMap((p) => p.data2 || [])
      }
    } catch (err) {
      console.error('Lỗi load full_address.json:', err)
    }
  }

  // === Map code → tên tỉnh/xã ===
  function getAddressName(street, communeCode, provinceCode) {
    const province = provinceLists.find((p) => String(p.id) === String(provinceCode))
    const commune = communeLists.find((c) => String(c.id) === String(communeCode))

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
    // 1. Load địa chỉ + invoiceOptions trước
    await loadAddressData()

    const invoiceRes = await fetch('/api/invoice/options')
    const invoiceData = await invoiceRes.json()
    if (invoiceData.success) invoiceOptions = invoiceData.data || {}

    // 2. Lấy dữ liệu order
    const response = await fetch(`/api/orders/${orderId}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: Không tìm thấy đơn hàng`)

    const result = await response.json()
    const order = result.data || result

    // 3. HEADER
    document.getElementById('orderId').textContent = order.code
    document.getElementById('orderDate').textContent = formatDateTime(order.createdAt)

    // === Lấy địa chỉ ưu tiên invoiceOptions trước ===
    if (!invoiceOptions.header) {
      const headerFallbackEl = document.getElementById('headerFallback')
      const street = order.organization?.street
      const commune = order.organization?.commune
      const province = order.organization?.province
      const storeAddress = getAddressName(street, commune, province)

      if (headerFallbackEl) {
        headerFallbackEl.innerHTML = `
          <p class="text-center"><strong>${order.organization?.name || 'RESTAURANT'}</strong></p>
          <p class="text-center"><strong>${storeAddress}</strong></p>
          <p class="text-center">${formatPhone(order.organization?.phone) || ''}</p>
        `
      }
    }

    // 4. Khách hàng
    const customerInfo = order.customerId
      ? `${order.customerId.name?.trim()}${order.customerId.phone ? ' - ' + order.customerId.phone?.trim() : ''}`
      : 'Khách lẻ'
    document.getElementById('customerInfo').textContent = customerInfo

    // 5. Loại hóa đơn
    const orderTypeEl = document.getElementById('orderType')
    if (order.isTakeaway) {
      orderTypeEl.textContent = 'Mang về'
    } else if (order.tableId?.name) {
      orderTypeEl.textContent = `Bàn ${order.tableId.name} - ${order.tableId.area || ''}`
    } else if (!order.tableId && !order.isTakeaway) {
      orderTypeEl.textContent = 'Hóa đơn trống'
    } else {
      orderTypeEl.textContent = 'Không xác định'
    }

    // 6. DANH SÁCH MÓN ĂN
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

    function formatCurrencyWithSign(amount, sign) {
      const formatted = formatCurrency(Math.abs(amount))
      return `${sign} ${formatted}`
    }

    // 7. Tổng hợp tiền
    const totalDiscount =
      (order.discount || 0) + (order.pointsDiscount || 0) + (order.extraDiscount || 0)

    document.getElementById('totalAmount').textContent = formatCurrency(order.totalAmount)
    document.getElementById('discount').textContent = formatCurrencyWithSign(
      order.discount || 0,
      order.discount > 0 ? '-' : ''
    )
    document.getElementById('pointsDiscount').textContent = formatCurrencyWithSign(
      order.pointsDiscount || 0,
      order.pointsDiscount > 0 ? '-' : ''
    )
    document.getElementById('serviceCharge').textContent = formatCurrencyWithSign(
      order.serviceCharge || 0,
      order.serviceCharge > 0 ? '+' : ''
    )

    document.getElementById('extraDiscount').textContent = formatCurrencyWithSign(
      order.extraDiscount || 0,
      order.extraDiscount > 0 ? '-' : ''
    )

    const vatAmount = Math.round(
      (order.totalAmount - totalDiscount + (order.serviceCharge || 0)) *
        ((order.vatRate || 0) / 100)
    )
    const vatRateText = order.vatRate ? `${order.vatRate}%` : '0%'
    document.getElementById('vatAmount').textContent =
      `${vatRateText} (${formatCurrencyWithSign(vatAmount, order.serviceCharge > 0 ? '+' : '')})`

    document.getElementById('total').textContent = formatCurrency(order.total)
    document.getElementById('customerPaid').textContent = formatCurrency(order.customerPaid)
    document.getElementById('changeAmount').textContent = formatCurrency(order.changeAmount)
    document.getElementById('totalInWords').textContent = numberToVietnameseWords(order.total)

    // 8. QR CODE
    await waitForQrToLoad(order)

    if (window.location.href.includes('print')) {
      window.print()
    }

    // 9. Back button
    const aElement = document.querySelector('.btn-back a')

    if (aElement) {
      aElement.addEventListener('click', function (e) {
        e.preventDefault() // chặn nhảy về "#"

        if (window.location.href.includes('receipt')) {
          window.location.href = '/receipts'
        } else {
          window.location.href = '/orders'
        }
      })
    }
  } catch (error) {
    console.error('Lỗi lấy dữ liệu đơn hàng:', error)
  }
})

async function waitForQrToLoad(order) {
  return new Promise((resolve) => {
    const qrContainer = document.getElementById('qrCodeContainer')

    if (!order.qrCode?.trim()) return resolve() // Không có QR thì resolve ngay

    const img = new Image()
    img.onload = () => {
      qrContainer.innerHTML = `<img src="${order.qrCode}" alt="QR Code thanh toán" class="qr-code" />`
      resolve()
    }
    img.onerror = () => {
      qrContainer.innerHTML = '<p>Không thể tải QR Code</p>'
      resolve()
    }
    img.src = order.qrCode
  })
}
