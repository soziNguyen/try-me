// ========== PHẦN TỬ DOM ==========
const btnShowForm = document.getElementById('btnShowForm');      
const formAddTable = document.getElementById('formAddTable');    
const tableBody = document.getElementById("tableBody");   
const btnEditTable = document.getElementById("btnEditTable");
const btnAssignTable = document.getElementById("btnAssignTable");        

// ========== GÁN SỰ KIỆN ==========
function bindEvents() {
  btnShowForm.addEventListener('click', () => {
    const isHidden = formAddTable.classList.toggle('d-none');
    btnShowForm.textContent = isHidden ? '+ Thêm bàn' : 'Đóng';
  });

  // Sự kiện nhấn nút Cập nhật
  btnEditTable.addEventListener("click", () => {
    const selected = document.querySelectorAll(".tableCheckbox:checked");

    if (selected.length === 0) {
      toastr.warning("Vui lòng chọn 1 bàn để cập nhật.");
      return;
    }
    if (selected.length > 1) {
      toastr.warning("Chỉ được chọn 1 bàn để cập nhật.");
      return;
    }

    const tableId = selected[0].dataset.id;
    updateTable(tableId);  
  });

  // Sự kiện submit form Thêm bàn
  formAddTable.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const name = document.getElementById('name').value.trim();
    const status = document.getElementById('status').value;
    const capacity = document.getElementById('capacity').value;
    const area = document.getElementById('area').value.trim();

    try {
      const data = await ajax('/api/tables/create', { name, status, capacity, area });

      if (!data) return;
      toastr.success('Thêm bàn thành công!');
      formAddTable.reset();
      formAddTable.classList.add('d-none');
      btnShowForm.textContent = '+ Thêm bàn';
    await getTables();
    } catch (error) {
      toastr.error(error.message); 
    }
  });

            // XAC NHAN
  document.getElementById('btnConfirmAssignTable').addEventListener('click', async function () {
    const tableId = this.getAttribute('data-id');
    if (!tableId) {
      toastr.warning("Không tìm thấy bàn để giao.");
      return;
    }
    try {
      const table = await ajax(`/api/tables/${tableId}`, {}, "GET");
      // Kiểm tra trạng thái bàn
      if (table.status === "occupied") {
        toastr.warning("Bàn đã có khách. Không thể giao bàn.");
        return;
      }
      // Cập nhật trạng thái bàn
      const result = await ajax(`/api/tables/update/${tableId}`, {
        status: "occupied",
        checkInTime: new Date().toISOString() //TIME
      }, "PUT");
      if (result) {
        await getTables();
        const assignModalElement = document.getElementById('assignTableModal');
        const assignModal = bootstrap.Modal.getInstance(assignModalElement);
        assignModal.hide();
        toastr.success("Giao bàn thành công!");
      }
    } catch (err) {
      toastr.error("Lỗi khi giao bàn: " + err.message);
    }
  });

}


// ========== CHƯƠNG TRÌNH CHÍNH ==========
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();      
  await getTables(); 
  setInterval(updateSeatedTimes, 1000);
  paginationHandle((page, limit) => {
  getTables(page);
  });
});


// ========== LẤY DỮ LIỆU TỪ SERVER ==========
let tableData = [];
let currentPage = 1;
const limit = 8;

async function getTables(page = 1) {
  try {
    currentPage = page;
    const res = await ajax(`/api/tables?page=${page}&limit=${limit}`, {}, "GET");

    if (res) {
      const { tables, pagination } = res;

      tableData = tables;
      renderTableList(tables);
      document.getElementById('pagination').innerHTML = renderPagination(pagination);
    }
  } catch (error) {
    toastr.error(error.message);
  }
}


// ========== STATUS COLOR ==========
function getBgClassByStatus(status) {
  if (status === "available") return "my-orange text-white";       
  return "bg-secondary";                              
}
// ========== HIỂN THỊ DANH SÁCH BÀN ==========
function renderTableList(tables = []) {
  const tableGrid = document.getElementById("tableGrid");

  if (!Array.isArray(tables) || tables.length === 0) {
    tableGrid.innerHTML = `<div class="col-12 text-center">Không có bàn nào.</div>`;
    return;
  }

tableGrid.innerHTML = tables.map(table =>{ 
   const bgClass = getBgClassByStatus(table.status);
  return `
  <div class="col">
    <div class="table-card card h-100 ${bgClass} shadow-sm border rounded-3 p-3 position-relative">
      <input type="checkbox" class="tableCheckbox form-check-input position-absolute top-0 end-0 m-2 d-none" data-id="${table._id}" />
      <div class="text-center mt-4">
        <h5 class="mb-3"> 👩‍🍳 ${table.name}</h5>
        <div><strong>Trạng thái:</strong> ${table.status === "available" ? "Trống" : "Có khách"}</div>
        <div><strong>Số Lượng Người:</strong> ${table.capacity || "-"}</div>
        <div><strong>Khu vực:</strong> ${table.area || "-"}</div>
        ${table.status === "occupied" && table.checkInTime ? `
        <div><strong>Giờ vào:</strong> ${new Date(table.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div><strong>Đã ngồi:</strong> <span class="seated-time" data-checkin="${table.checkInTime}" data-id="${table._id}">Đang tính...</span></div>
      ` : ""}
        ${table.status === "available" ? `
          <button class ="btnAssignTable btn btn-warning btn-sm mt-2 fw-bold shadow-sm">
            <i class="bi bi-clock me-1"></i> Giao bàn
          </button>` : ""}
        ${table.status === "occupied" ? `
          <button class="btnOrderFood btn btn-success btn-sm mt-2 fw-bold shadow-sm" data-id="${table._id}">
            <i class="bi bi-clipboard-check me-1"></i> Gọi món
          </button>
      ` : ""}
      </div>
    </div>
  </div>
  `;
}).join("");


  document.querySelectorAll('.table-card').forEach(card => {
    card.addEventListener('click', function (e) {
      if (
      e.target.classList.contains('tableCheckbox') ||
      e.target.closest('button')
    ) return;
      const checkbox = this.querySelector('.tableCheckbox');
      checkbox.checked = !checkbox.checked;
      this.classList.toggle('opacity-50', checkbox.checked);
    });
  });
  
  // BẮT SỰ KIỆN NÚT GIAO BÀN
    document.querySelectorAll('.btnAssignTable').forEach(button => {
      button.addEventListener('click', function (e) {
        e.stopPropagation();

        const card = this.closest('.table-card');
        const tableName = card.querySelector('h5').textContent.trim();
        const capacityText = card.querySelector('div:nth-child(3)').textContent.trim();
        const areaText = card.querySelector('div:nth-child(4)').textContent.trim();

        // GÁN THÔNG TIN VÀO MODAL
        document.getElementById('assign-table-question').textContent = `Bạn có chắc chắn muốn giao bàn "${tableName}" không?`;
        document.getElementById('assign-table-name').textContent = tableName;
        document.getElementById('assign-table-capacity').textContent = capacityText.replace("Số Lượng Người:", "").trim();
        document.getElementById('assign-table-area').textContent = areaText.replace("Khu vực:", "").trim();

        // Lưu ID bàn để xử lý sau khi xác nhận
        const tableId = card.querySelector('.tableCheckbox').getAttribute('data-id');
        document.getElementById('btnConfirmAssignTable').setAttribute('data-id', tableId);

        // HIỂN THỊ MODAL
        const assignModal = new bootstrap.Modal(document.getElementById('assignTableModal'));
        assignModal.show();
      });
    });

      // NÚT GỌI MÓN
      document.addEventListener("click", function (e) {
      if (e.target.classList.contains("btnOrderFood")) {
        const tableId = e.target.getAttribute("data-id");
        if (tableId) {
          window.location.href = `/orders?tableId=${tableId}`;
        }
      }
    });
}

        // TIME ĐÃ NGỒI
function updateSeatedTimes() {
  const elements = document.querySelectorAll('.seated-time');

  elements.forEach(el => {
    const checkInTime = new Date(el.dataset.checkin);
    const now = new Date();

    const diffMs = now - checkInTime;
    const diffSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    let timeStr = "";
    if (hours > 0) {
      timeStr = `${hours} giờ ${minutes} phút ${seconds} giây`;
    } else if (minutes > 0) {
      timeStr = `${minutes} phút ${seconds} giây`;
    } else {
      timeStr = `${seconds} giây`;
    }

    el.textContent = timeStr;
  });
}

// ========== HÀM HỖ TRỢ ==========
function getSelectedTableIds() {
  const checkboxes = document.querySelectorAll('.tableCheckbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id); 
  return ids;
}


// ========== UPDATE ==========
async function updateTable(tableId) {
  try {
    const updateTableModalElement = document.getElementById("updateTableModal");
    if (!updateTableModalElement) {
      toastr.error("Update table modal not found.");
      return;
    }

    const table = await ajax(`/api/tables/${tableId}`, {}, "GET");

    // Điền dữ liệu vào form
    document.getElementById("update-name").value = table.name || "";
    document.getElementById("update-status").value = table.status || "available";
    document.getElementById("update-capacity").value = table.capacity || "";
    document.getElementById("update-area").value = table.area || "";

    // Hiển thị modal
    const updateTableModal = new bootstrap.Modal(updateTableModalElement);
    updateTableModal.show();

    // Reset nút để tránh trùng sự kiện
    const oldBtn = document.getElementById("btnUpdateTable");
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.replaceWith(newBtn);

    // Gán sự kiện nút cập nhật
    newBtn.addEventListener("click", async function () {
      const name = document.getElementById("update-name").value.trim();
      const status = document.getElementById("update-status").value;
      const capacity = document.getElementById("update-capacity").value;
      const area = document.getElementById("update-area").value;

      // Kiểm tra đơn giản
      if (!name) {
        toastr.warning("Vui lòng nhập tên bàn");
        return;
      }

      const dataUpdate = {
        name,
        status,
        capacity: capacity ? Number(capacity) : undefined,
        area,
      };

      try {
        const result = await ajax(`/api/tables/update/${tableId}`, dataUpdate, "PUT");
        if (result) {
          toastr.success("Cập nhật thành công");
          updateTableModal.hide();
          await getTables(); 
        }
      } catch (err) {
        toastr.error(err.message);
      }
    });
  } catch (err) {
    toastr.error(err.message);
  }
}


// ========== DELETE ==========
document.getElementById("btnDeleteTable")?.addEventListener("click", deleteTables);
async function deleteTables() {
  const selectedTableIds = [...document.querySelectorAll(".tableCheckbox:checked")].map(cb => cb.dataset.id);

  if (selectedTableIds.length === 0) {
    toastr.warning("Vui lòng chọn ít nhất 1 bàn để xóa.");
    return;
  }

  const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa ${selectedTableIds.length} bàn này?`);
  if (!confirmDelete) return;

  try {
    const result = await ajax("/api/tables/delete", {
      tableIds: selectedTableIds,
    });

    if (result) {
      toastr.success("Đã xóa bàn thành công!");
      await getTables(); 

    const selectAll = document.getElementById("selectAllTable");
    if (selectAll) {
      selectAll.checked = false;
    }
  }
  } catch (error) {
    toastr.error(error.message);
  }
}
