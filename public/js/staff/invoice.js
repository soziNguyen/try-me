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
    document.getElementById('currentTime').textContent = `${now.toLocaleTimeString()} ${now.toLocaleDateString()}`;

    // Header
    document.getElementById('orderId').textContent = order._id;
    document.getElementById('orderDate').textContent = new Date(order.createdAt).toLocaleString();

    // Khách hàng và thu ngân
    document.getElementById('customerName').textContent = order.customerName || 'Khách lẻ';
    document.getElementById('cashier').textContent = order.cashier || 'Admin';

    // Danh sách món ăn
    const itemsContainer = document.getElementById('orderItems');
    itemsContainer.innerHTML = ''; 

    order.items.forEach(item => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="name">${item.foodId.name}</td>
        <td class="price">${formatCurrency(item.price)}</td>
        <td class="qty">${item.quantity}</td>
        <td class="total">${formatCurrency(item.price * item.quantity)}</td>
      `;
      itemsContainer.appendChild(tr);
    });

    document.getElementById('totalAmount').textContent = formatCurrency(order.totalAmount);
    document.getElementById('discount').textContent = formatCurrency(order.discount);
    document.getElementById('serviceCharge').textContent = formatCurrency(order.serviceCharge);
    document.getElementById('total').textContent = formatCurrency(order.total);
    document.getElementById('customerPaid').textContent = formatCurrency(order.customerPaid);
    document.getElementById('changeAmount').textContent = formatCurrency(order.changeAmount);
    window.print();

  } catch (error) {
    console.error('Lỗi lấy dữ liệu đơn hàng:', error);
    alert('Lỗi khi tải hóa đơn, vui lòng thử lại sau.');
  }
});
