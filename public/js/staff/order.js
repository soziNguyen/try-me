// ======== Biến toàn cục ========
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

// ======== Event Listeners ========
// DOMLoaded:
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Lấy danh sách món ăn
    const foods = await ajax('/api/menu/get/active', {}, 'GET');
    if (!Array.isArray(foods)) {
      console.error('foods không phải là mảng:', foods);
      return;
    }

    renderMenu(foods);

    if (orderId) {
      const orderRes = await fetch(`/api/orders/${orderId}`);
      const orderData = await orderRes.json();
      if (orderRes.ok) {
        updateOrderUI(orderData);
      }
    } else {
      // Không có orderId -> hiện cảnh báo
      const warningDiv = document.getElementById("orderWarning");
      if (warningDiv) {
        warningDiv.innerHTML = `
          <div class="alert alert-warning mt-3">
            ⚠️ Vui lòng chọn bàn trước khi thao tác gọi món.
          </div>
        `;
      }
    }

  } catch (error) {
    console.error('Lỗi khi tải thực đơn:', error);
  }

  // Event delegation: xóa món
  const tbody = document.getElementById("orderItems");
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-item");
    if (btn) {
      const foodId = btn.dataset.id;
      removeItemFromOrder(foodId);
    }
  });

  // Event delegation: cập nhật số lượng món
  tbody.addEventListener("change", (e) => {
    const input = e.target.closest(".item-quantity");
    if (input) {
      const foodId = input.dataset.id;
      const newQuantity = parseInt(input.value, 10);
      if (newQuantity > 0) {
        updateItemQuantity(foodId, newQuantity);
      } else {
        input.value = 1;
      }
    }
  });

  // Nút hiển thị danh sách bàn 
  const viewTable = document.querySelector('.btn-select-table');
  viewTable.addEventListener('click', function () {
    const table = document.getElementById('tableGrid');
    getTables();
    table.classList.toggle('show');
  });
});

// Xử lý click chọn bàn trong bảng bàn
document.getElementById('tableGrid').addEventListener('click', async (e) => {
  const btnTable = e.target.closest('.table-button');
  if (!btnTable) return;

  const tableId = btnTable.getAttribute('data-table-id');
  const orderId = btnTable.getAttribute('data-order-id');
  const status = btnTable.getAttribute('data-status');

  console.log({ tableId, orderId, status });
  if (status === 'available') {
    if (confirm(`Bạn có muốn tạo order và gọi món cho bàn này không?`)) {
      try {
        const orderResult = await ajax('/api/orders', { tableId }, 'POST');
        if (orderResult && orderResult.orderId) {
          window.location.href = `/orders?orderId=${orderResult.orderId}`;
        } else {
          toastr.error('Không thể tạo order mới.');
        }
      } catch (err) {
        toastr.error('Lỗi khi tạo order: ' + err.message);
      }
    }
  } else if (status === 'occupied') {
    if (orderId) {
      window.location.href = `/orders?orderId=${orderId}`;
    } else {
      toastr.warning('Bàn này đang bận nhưng không tìm thấy order.');
    }
  } else {
    toastr.info('Trạng thái bàn chưa xác định.');
  }
});


// Lấy danh sách bàn và render
async function getTables() {
  try {
    const res = await ajax('/api/tables', {}, 'GET');
    if (res && Array.isArray(res.tables)) {
      renderTableList(res.tables);
    } else {
      document.getElementById("tableGrid").innerHTML = `<div>Không có bàn nào.</div>`;
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bàn:', error);
  }
}

// Render danh sách bàn lên giao diện
function renderTableList(tables = []) {
  const tableGrid = document.getElementById("tableGrid");

  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = `<div>Không có bàn nào.</div>`;
    return;
  }

  tableGrid.innerHTML = tables.map(table => {
    let btnClass = 'btn-secondary';
    if (table.status === 'available') btnClass = 'btn-success';
    else if (table.status === 'occupied') btnClass = 'btn-danger';

    const orderId = table.currentOrderId ? table.currentOrderId.toString() : '';

    return `
      <button 
        class="btn ${btnClass} m-1 table-button" 
        style="min-width: 80px; height: 60px; font-weight: 600;"
        data-table-id="${table._id}" 
        data-order-id="${orderId}"
        data-status="${table.status}"
      >
        ${table.name}
      </button>
    `;
  }).join("");
}

// Render thực đơn món ăn
function renderMenu(foods) {
  const menuDiv = document.getElementById('foodMenu');
  if (!menuDiv) {
    console.error('Không tìm thấy phần tử #foodMenu trong HTML');
    return;
  }

  menuDiv.innerHTML = foods.map(food => {
    let imgSrc = '/images/default-food.png';
    if (food.image) {
      if (food.image.startsWith('/') || food.image.startsWith('http')) {
        imgSrc = food.image;
      } else {
        imgSrc = '/uploads/' + food.image;
      }
    }

    const name = food.name || 'Không rõ tên';
    const price = typeof food.price === 'number' ? food.price : 0;
    const priceFormatted = price.toLocaleString();

    return `
      <div class="col">
        <div class="card shadow-sm">
          <img src="${imgSrc}" alt="${name}" class="card-img-top" style="object-fit: cover; height: 180px;">
          <div class="card-body">
            <h5 class="card-title">${name}</h5>
            <p class="card-text">Giá: ${priceFormatted} đ</p>
            <button class="btn btn-sm btn-outline-primary" onclick="addToOrder('${food._id}', '${name}', ${price})">
              <i class="bi bi-bag-check"></i> Thêm
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Cập nhật giao diện hóa đơn
function updateOrderUI(order) {
  const tbody = document.getElementById("orderItems");
  const totalAmountEl = document.getElementById("totalAmount");
  const titleEl = document.getElementById("orderTitle");

  if (order.tableId && order.tableId.name) {
    titleEl.textContent = `🧾 Hóa đơn bàn ${order.tableId.name} (${order.tableId.area})`;
  }

  tbody.innerHTML = "";
  let total = 0;

  for (const item of order.items) {
    const name = item.foodId.name || "Không rõ";
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    const amount = price * quantity;
    total += amount;

    const row = `
      <tr>
        <td>${name}</td>
        <td>
          <input 
            type="number" 
            class="border-0 item-quantity"
            min="1" 
            value="${quantity}" 
            style="width: 60px;" 
            data-id="${item.foodId._id}"
          />
        </td>
        <td>${price.toLocaleString()}đ</td>
        <td>${amount.toLocaleString()}đ</td>
        <td>
          <button class="btn btn-sm btn-outline-danger remove-item" data-id=${item.foodId._id}>
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", row);
  }

  totalAmountEl.textContent = `${total.toLocaleString()}đ`;

  // Thêm nút Thanh toán nếu chưa có
  let checkoutBtn = document.getElementById("checkoutBtn");
  if (!checkoutBtn) {
    const orderSummary = document.getElementById("orderSummary");
    const btnHTML = `
      <div class="text-end mt-3">
        <button class="btn btn-outline-success" id="checkoutBtn">
          <i class="bi bi-credit-card"></i> Thanh toán
        </button>
      </div>
    `;
    orderSummary.insertAdjacentHTML('beforeend', btnHTML);
  }
}


// ======== Hàm xử lý hành động thêm/xóa/sửa món ========

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