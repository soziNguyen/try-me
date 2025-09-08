// ======== Biến toàn cục ========
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

// ======== Event Listeners ========

// DOMContentLoaded: khởi tạo menu, order, bắt sự kiện xóa, cập nhật số lượng món, hiện bảng bàn
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const foods = await ajax('/api/menu/get/active', {}, 'GET');
    if (!Array.isArray(foods)) {
      console.error('foods không phải là mảng:', foods);
      return;
    }

    // Gán và hiển thị menu
    allFoods = foods;
    renderMenu(allFoods);

    // Hiển thị danh mục
    const categories = extractCategories(allFoods);
    renderCategories(categories);

    // Nếu đã có orderId → load đơn hàng
    if (orderId) {
      const orderRes = await fetch(`/api/orders/${orderId}`);
      const orderData = await orderRes.json();
      if (orderRes.ok) {
        updateOrderUI(orderData);
      }
    } else {
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

  // Xử lý sự kiện xóa món, cập nhật số lượng món 
  const tbody = document.getElementById("orderItems");
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-item");
    if (btn) {
      removeItemFromOrder(btn.dataset.id);
    }
  });
  tbody.addEventListener("change", (e) => {
    const input = e.target.closest(".item-quantity");
    if (input) {
      const newQuantity = parseInt(input.value, 10);
      if (newQuantity > 0) {
        updateItemQuantity(input.dataset.id, newQuantity);
      } else {
        input.value = 1;
      }
    }
  });

  // Nút hiển thị danh sách bàn
  const viewTable = document.querySelector('.btn-select-table');
  viewTable.addEventListener('click', () => {
    const table = document.getElementById('tableGrid');
    getTables();
    table.classList.toggle('show');
  });
});


// Xử lý click chọn bàn trong bảng bàn (bao gồm nút "Mang Về" và bàn bình thường)
document.getElementById('tableGrid').addEventListener('click', async (e) => {
  const btnTable = e.target.closest('.table-button');
  if (!btnTable) return;

  // Xử lý "Mang Về"
  if (btnTable.hasAttribute('data-mang-ve')) {
    try {
      const orderResult = await ajax('/api/orders', { tableId: null, isTakeaway: true }, 'POST');

      if (orderResult && orderResult.orderId) {
        if (orderResult.isNewOrder) {
          if (!confirm(`Bạn có muốn tạo order mang về không?`)) return;
        }
        toastr.success('Order mang về đã được tạo thành công!');
        window.location.href = `/orders?orderId=${orderResult.orderId}`;
      } else {
        toastr.error('Không thể tạo hoặc lấy order mang về.');
      }
    } catch (err) {
      toastr.error('Lỗi khi xử lý order mang về: ' + err.message);
    }
    return;
  }

  // Bàn bình thường
  const tableId = btnTable.getAttribute('data-table-id');
  const orderId = btnTable.getAttribute('data-order-id');
  const status = btnTable.getAttribute('data-status');

  if (status === 'available') {
    if (confirm(`Bạn có muốn tạo order và gọi món cho bàn này không?`)) {
      try {
        const orderResult = await ajax('/api/orders', { tableId }, 'POST');
        if (orderResult && orderResult.orderId) {
          toastr.success('Order cho bàn đã được tạo thành công!');
          setTimeout(() => {
            window.location.href = `/orders?orderId=${orderResult.orderId}`;
          }, 500);
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



// ======== Các hàm lấy dữ liệu và render UI ========

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

  // Nút "Mang Về"
  let html = `
    <button 
      class="btn btn-warning m-1 table-button" 
      style="min-width: 110px; height: 60px; font-weight: 600;"
      data-mang-ve="true"
    >
      <i class="bi bi-bag"></i> Mang Về
    </button>
  `;

  html += tables.map(table => {
    let btnClass = 'btn-secondary';
    if (table.status === 'available') btnClass = 'btn-success';
    else if (table.status === 'occupied') btnClass = 'btn-danger';

    const orderId = table.currentOrderId ? table.currentOrderId.toString() : '';

    return `
      <button 
        class="btn ${btnClass} m-1 table-button" 
        style="min-width: 110px; height: 60px; font-weight: 600;"
        data-table-id="${table._id}" 
        data-order-id="${orderId}"
        data-status="${table.status}"
      >
        ${table.name}
      </button>
    `;
  }).join("");

  tableGrid.innerHTML = html;
}

// categories
let allFoods = [];
function extractCategories(foods) {
  const categories = [];
  const names = new Set();

  for (const food of foods) {
    const catName = food.category?.name;
    if (catName && !names.has(catName)) {
      categories.push(catName);
      names.add(catName);
    }
  }

  return categories;
}

function renderCategories(categories) {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  categoryList.innerHTML = `
    <button class="btn btn-outline-primary" onclick="renderMenu(allFoods)">Tất cả</button>
    ${categories.map(cate => `
      <button class="btn btn-outline-secondary" onclick="filterMenuByCategory('${cate}')">
        ${cate}
      </button>
    `).join('')}
  `;
}

function filterMenuByCategory(categoryName) {
  const filtered = allFoods.filter(food => food.category?.name === categoryName);
  renderMenu(filtered);
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
      imgSrc = (food.image.startsWith('/') || food.image.startsWith('http'))
        ? food.image
        : '/uploads/' + food.image;
    }

    const name = food.name || 'Không rõ tên';
    const price = typeof food.price === 'number' ? food.price : 0;
    const priceFormatted = price.toLocaleString();

    return `
      <div class="col">
        <div class="card shadow-sm h-100 rounded-3">
          <img src="${imgSrc}" alt="${name}" class="card-img-top" style="object-fit: cover; height: 180px;">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title fw-semibold">${name}</h5>
            <p class="card-text text-danger fw-bold fs-5 flex-grow-1">Giá: ${priceFormatted} đ</p>
            <button class="btn btn-primary btn-sm rounded-pill px-3 mt-auto" onclick="addToOrder('${food._id}', '${name}', ${price})">
              <i class="bi bi-bag-plus"></i> Thêm
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

  if (order.isTakeaway) {
    titleEl.textContent = '🧾 Hóa đơn mang về';
  } else if (order.tableId && order.tableId.name) {
    titleEl.textContent = `🧾 Hóa đơn bàn ${order.tableId.name} (${order.tableId.area})`;
  } else {
    titleEl.textContent = '🧾 Hóa đơn';
  }

  tbody.innerHTML = "";

  for (const item of order.items) {
    const name = item.foodId.name || "Không rõ";
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    const amount = price * quantity;

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
        <td>${price.toLocaleString()}</td>
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

  const total = calculateTotalAmount(order.items);
  totalAmountEl.textContent = `${total.toLocaleString()}đ`;

  // Thêm nút Thanh toán nếu chưa có
  if (!document.getElementById("checkoutBtn")) {
    const orderSummary = document.getElementById("orderSummary");
    const btnHTML = `
      <div class="text-end mt-3">
        <button class="btn btn-outline-success" id="checkoutBtn">
          <i class="bi bi-credit-card"></i> CHI TIẾT HÓA ĐƠN
        </button>
      </div>
    `;
    orderSummary.insertAdjacentHTML('beforeend', btnHTML);
  }
  syncCheckoutDetailTotal();
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

getCombos()
let combos = []
// Lấy danh sách combo
async function getCombos () {
  try {
    const result = await ajax('/api/menu/combos/active', {}, 'GET')
    if (!result) {
      console.error('Lấy danh sách combo thất bại')
    }
    combos = result
  } catch (error) {
    console.error('Lỗi server', error)
  }
}

// ===== GÁN orderId VÀO window.currentOrderId =====
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  if (orderId) {
    window.currentOrderId = orderId;
    console.log('Order hiện tại:', window.currentOrderId);
  }
});