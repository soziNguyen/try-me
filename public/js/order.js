// Lấy orderId từ URL (ví dụ: ?orderId=1234)
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

if (!orderId) {
  alert("Không tìm thấy hóa đơn. Vui lòng giao bàn trước khi gọi món.");
  window.location.href = '/tables';
}


document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Gọi API lấy danh sách món ăn
    const res = await fetch('/api/foods');
    const data = await res.json();
    const foods = data.foods || data.data || data;
    if (!Array.isArray(foods)) {
      console.error('foods không phải là mảng:', foods);
      return;
    }

    // Hiển thị thực đơn món ăn 
    renderMenu(foods);

    if (orderId) {
      const orderRes = await fetch(`/api/orders/${orderId}`);
      const orderData = await orderRes.json();
      if (orderRes.ok) {
        updateOrderUI(orderData);
      }
    }

  } catch (error) {
    console.error('Lỗi khi tải thực đơn:', error);
  }
});

// Hàm tạo giao diện danh sách món ăn
function renderMenu(foods) {
  const menuDiv = document.getElementById('foodMenu');
  menuDiv.innerHTML = foods.map(food => {
    let imgSrc = '/images/default-food.png';
    if (food.image) {
      if (food.image.startsWith('/') || food.image.startsWith('http')) {
        imgSrc = food.image;
      } else {
        imgSrc = '/uploads/' + food.image;
      }
    }
    return `
      <div class="col">
        <div class="card shadow-sm">
          <img src="${imgSrc}" alt="${food.name}" class="card-img-top" style="object-fit: cover; height: 180px;">
          <div class="card-body">
            <h5 class="card-title">${food.name}</h5>
            <p class="card-text">Giá: ${food.price.toLocaleString()}đ</p>
            <!-- Nút thêm món, gọi hàm addToOrder khi click -->
            <button class="btn btn-sm btn-primary" onclick="addToOrder('${food._id}', '${food.name}', ${food.price})">
              [+] Thêm
            </button>
          </div>
        </div>
      </div>
    `;
  }).join(''); 
}

// Hàm thêm món vào hóa đơn
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

// Hàm cập nhật giao diện phần hóa đơn bên phải màn hình
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
            min="1" 
            value="${quantity}" 
            style="width: 60px;" 
            onchange="updateItemQuantity('${item.foodId._id}', this.value)"
          />
        </td>
        <td>${price.toLocaleString()}đ</td>
        <td>${amount.toLocaleString()}đ</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="removeItemFromOrder('${item.foodId._id}')">Xóa</button>
        </td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", row);
  }

  // Hiển thị tổng tiền hóa đơn
  totalAmountEl.textContent = `${total.toLocaleString()}đ`;
}


async function updateItemQuantity(foodId, newQuantity) {
  if (!orderId) {
    toastr.error("Không tìm thấy hóa đơn.");
    return;
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/items/update`, {
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