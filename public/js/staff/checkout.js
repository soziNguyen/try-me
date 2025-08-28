// Xử lý sự kiện click mở/ẩn chi tiết thanh toán, xử lý gợi ý tiền mặt
document.addEventListener('click', (e) => {
  const checkoutBtn = e.target.closest('#checkoutBtn');
  if (checkoutBtn) {
    const checkoutDetail = document.getElementById('checkoutDetail');
    if (!checkoutDetail) return;
    const tbody = document.getElementById('orderItems');
    if (!tbody || tbody.children.length === 0) {
      toastr.warning('Chưa có món nào trong hóa đơn!');
      return;
    }

    checkoutDetail.style.display = 'block';
    checkoutDetail.scrollIntoView({ behavior: 'smooth' });

    const totalAmountEl = document.getElementById('totalAmount');
    const totalPayableEl = document.getElementById('totalPayable');
    const customerPaidInput = document.getElementById('customerPaidInput');

    if (totalAmountEl && totalPayableEl && customerPaidInput) {
      const totalText = totalAmountEl.textContent.replace(/[^\d]/g, '');
      const totalNumber = Number(totalText) || 0;
      totalPayableEl.value = totalNumber.toLocaleString();
      customerPaidInput.value = '';

      // Khi mới mở, giá trị = 0, hiện nút gợi ý mệnh giá, ẩn gợi ý động
      showPriceSuggestions(true);
      clearDynamicSuggestions();
      updateChangeAmount();
    }
  }

  // Xử lý khi click nút gợi ý tiền mặt 
  if (e.target.classList.contains('cash-suggestion')) {
    const value = parseInt(e.target.dataset.value, 10);
    const input = document.getElementById('customerPaidInput');
    if (input) {
      input.value = value.toLocaleString();
      input.dispatchEvent(new Event('input'));
    }
  }

  // click nút hủy
  if (e.target.id === 'cancelCheckoutDetail') {
    document.getElementById('checkoutDetail').style.display = 'none';
  }
});

// sự kiện input trên ô nhập tiền
const customerPaidInput = document.getElementById('customerPaidInput');
if (customerPaidInput) {
  customerPaidInput.addEventListener('input', () => {
    let val = customerPaidInput.value.replace(/[^\d]/g, '');
    if (val === '') val = '0';

    customerPaidInput.value = Number(val).toLocaleString();

    if (val === '0') {
      showPriceSuggestions(true);
      clearDynamicSuggestions();
    } else {
      showPriceSuggestions(false);
      updateDynamicSuggestions(val);
    }

    updateChangeAmount();
  });
}

// Hàm hiển thị hoặc ẩn nút gợi ý mệnh giá và gợi ý động
function showPriceSuggestions(show) {
  const priceSuggestionDiv = document.querySelector('.price-suggestion');
  const dynamicSuggestionDiv = document.getElementById('dynamicSuggestions');
  if (!priceSuggestionDiv || !dynamicSuggestionDiv) return;

  if (show) {
    priceSuggestionDiv.classList.remove('d-none');
    dynamicSuggestionDiv.classList.add('d-none');
  } else {
    priceSuggestionDiv.classList.add('d-none');
    dynamicSuggestionDiv.classList.remove('d-none');
  }
}

// Hàm xóa và ẩn gợi ý mệnh giá động
function clearDynamicSuggestions() {
  const container = document.getElementById('dynamicSuggestions');
  if (container) {
    container.innerHTML = '';
    container.classList.add('d-none');
  }
}

// Hàm tính và cập nhật tiền thừa
function updateChangeAmount() {
  const totalPayableEl = document.getElementById('totalPayable');
  const customerPaidInput = document.getElementById('customerPaidInput');
  const changeAmountInput = document.getElementById('changeAmount');

  if (!totalPayableEl || !customerPaidInput || !changeAmountInput) return;

  const totalPayable = Number(totalPayableEl.value.replace(/[^\d]/g, '')) || 0;
  const customerPaid = Number(customerPaidInput.value.replace(/[^\d]/g, '')) || 0;
  const change = customerPaid - totalPayable;

  changeAmountInput.value = change > 0 ? change.toLocaleString() : '0';
}

// Hàm cập nhật các nút gợi ý tiền mặt động dựa trên giá trị nhập
function updateDynamicSuggestions(inputValue) {
  const container = document.getElementById('dynamicSuggestions');
  container.innerHTML = '';

  const rawValue = parseInt(inputValue.replace(/[^\d]/g, '') || '0', 10);
  if (!rawValue) {
    container.classList.add('d-none');
    return;
  }

  const maxValue = 1000000; // Giới hạn tối đa 1 triệu đồng
  const suggestions = [];
  const multiples = [1, 10, 100, 1000, 10000];

  for (let mul of multiples) {
    const val = rawValue * mul;
    if (val < 1000 || val > maxValue || suggestions.includes(val)) continue;
    suggestions.push(val);
  }

  suggestions.sort((a, b) => a - b);

  for (let val of suggestions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm cash-suggestion';
    btn.dataset.value = val;
    btn.textContent = val.toLocaleString('vi-VN');
    container.appendChild(btn);
  }

  if (suggestions.length > 0) {
    container.classList.remove('d-none');
  } else {
    container.classList.add('d-none');
  }
}

function syncCheckoutDetailTotal() {
  const totalAmountEl = document.getElementById('totalAmount');
  const totalPayableEl = document.getElementById('totalPayable');
  const customerPaidInput = document.getElementById('customerPaidInput');
  
  if (!totalAmountEl || !totalPayableEl) return;

  const totalText = totalAmountEl.textContent.replace(/[^\d]/g, '');
  const totalNumber = Number(totalText) || 0;

  totalPayableEl.value = totalNumber.toLocaleString();

  if (customerPaidInput) {
    customerPaidInput.value = '';
  }

  updateChangeAmount();
}





// ======== Các hàm xử lý thêm/xóa/sửa món ========

// Thêm món vào hóa đơn
async function addToOrder(foodId, foodName, price) {
  if (!orderId) {
    toastr.error("Không tìm thấy hóa đơn.");
    return;
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId, quantity: 1 })
    });
    const result = await res.json();
    if (!res.ok) {
      toastr.error(result.message || "Lỗi khi thêm món");
      return;
    }
    toastr.success(`Đã thêm ${foodName} vào hóa đơn`);
    updateOrderUI(result.data);
  } catch (err) {
    console.error("Lỗi khi thêm món:", err);
    toastr.error("Lỗi kết nối server");
  }
}

// Cập nhật số lượng món ăn trong hóa đơn
async function updateItemQuantity(foodId, newQuantity) {
  if (!orderId) {
    toastr.error("Không tìm thấy hóa đơn.");
    return;
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items/${foodId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId, quantity: Number(newQuantity) })
    });
    const result = await res.json();
    if (!res.ok) {
      toastr.error(result.message || "Lỗi khi cập nhật số lượng");
      return;
    }
    toastr.success("Cập nhật số lượng thành công");
    updateOrderUI(result.data);
  } catch (err) {
    console.error("Lỗi khi cập nhật số lượng:", err);
    toastr.error("Lỗi kết nối server");
  }
}

// Xóa món khỏi hóa đơn
async function removeItemFromOrder(foodId) {
  if (!orderId) {
    toastr.error("Không tìm thấy hóa đơn.");
    return;
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items/${foodId}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (!res.ok) {
      toastr.error(result.message || "Lỗi khi xóa món");
      return;
    }
    toastr.success("Đã xóa món khỏi hóa đơn");
    updateOrderUI(result.data);
  } catch (err) {
    console.error("Lỗi khi xóa món:", err);
    toastr.error("Lỗi kết nối server");
  }
}