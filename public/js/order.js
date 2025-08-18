// ========== PHẦN TỬ DOM ==========
const tableGrid = document.getElementById('tableGrid');

// ========== SỰ KIỆN ==========
document.addEventListener('DOMContentLoaded', async () => {
  await getOccupiedTables(); 
});

// ========== GỌI API ==========
async function getOccupiedTables() {
  try {
    const res = await ajax(`/api/tables`, {}, "GET");

    if (res) {
      const { tables } = res;
      const occupiedTables = tables.filter(table => table.status === "occupied");

      renderTableList(occupiedTables);
    }
  } catch (error) {
    toastr.error(error.message);
  }
}

// ========== RENDER BÀN ==========
function renderTableList(tables = []) {
  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = `<div class="col-12 text-center">Không có bàn nào đang hoạt động.</div>`;
    return;
  }

  tableGrid.innerHTML = tables.map(table => {
    const bgClass = "bg-secondary"; 
    return `
    <div class="col">
      <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative">
        <div class="text-center mt-4">
          <h5 class="mb-3">👩‍🍳 ${table.name}</h5>
          <div><strong>Số Lượng Người:</strong> ${table.capacity || "-"}</div>
          <div><strong>Khu vực:</strong> ${table.area || "-"}</div>
          <button class="btnOrderFood btn btn-success btn-sm mt-2 fw-bold shadow-sm" data-order-id="${table.currentOrderId}">
            <i class="bi bi-clipboard-check me-1"></i> Gọi món
          </button>
        </div>
      </div>
    </div>
    `;
  }).join("");
}

// ========== BTN GỌI MÓN ==========
document.addEventListener('click', (e) => {
  const btnOrder = e.target.closest('.btnOrderFood');
  if (btnOrder) {
    const orderId = btnOrder.getAttribute('data-order-id');
    if (orderId) {
      window.location.href = `/orders?orderId=${orderId}`;
    } else {
      toastr.warning("Bàn chưa có hóa đơn, vui lòng giao bàn trước khi gọi món.");
    }
  }
});


