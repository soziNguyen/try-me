document.addEventListener('DOMContentLoaded', async () => {
  const orderId = document.getElementById('orderIdInput').value;

  function formatCurrency(num) {
    return Number(num).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  }

  try {
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) throw new Error('Không tìm thấy đơn hàng');

    const order = await response.json();

    const now = new Date();

    // Header
    document.getElementById('orderId').textContent = order._id;
    document.getElementById('orderDate').textContent = new Date(order.createdAt).toLocaleString();

    // Khách hàng và thu ngân
    document.getElementById('customerName').textContent = order.customerName || 'Khách lẻ';
    const orderTypeEl = document.getElementById('orderType');
      if (order.isTakeaway) {
        orderTypeEl.textContent = 'Mang về';
      } else if (order.tableId && order.tableId.name) {
        orderTypeEl.textContent = `Bàn ${order.tableId.name} - ${order.tableId.area}`;
      } else {
        orderTypeEl.textContent = 'Không xác định';
      }

    // Danh sách món ăn
    const itemsContainer = document.getElementById('orderItems');
    itemsContainer.innerHTML = ''; 

    order.items.forEach((item,index) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="stt">${index + 1}</td>
        <td class="name">${item.foodId.name}</td>
        <td class="price">${formatCurrency(item.price)}</td>
        <td class="qty">${item.quantity}</td>
        <td class="total text-end">${formatCurrency(item.price * item.quantity)}</td>
      `;
      itemsContainer.appendChild(tr);
    });

    document.getElementById('totalAmount').textContent = formatCurrency(order.totalAmount);
    document.getElementById('discount').textContent = formatCurrency(order.discount);
    document.getElementById('serviceCharge').textContent = formatCurrency(order.serviceCharge);
    const vatRate = order.vatRate || (document.getElementById('vatInput')?.value || 0);
    document.getElementById('vatAmount').textContent = vatRate + ' %';
    document.getElementById('total').textContent = formatCurrency(order.total);
    document.getElementById('customerPaid').textContent = formatCurrency(order.customerPaid);
    document.getElementById('changeAmount').textContent = formatCurrency(order.changeAmount);
    window.print();

  } catch (error) {
    console.error('Lỗi lấy dữ liệu đơn hàng:', error);
    alert('Lỗi khi tải hóa đơn, vui lòng thử lại sau.');
  }
});
