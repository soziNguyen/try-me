// ========== PHẦN TỬ DOM ==========
const btnShowForm = document.getElementById('btnShowForm');      
const formAddTable = document.getElementById('formAddTable');    
const tableBody = document.getElementById("tableBody");   
const btnEditTable = document.getElementById("btnEditTable");        

// ========== GÁN SỰ KIỆN ==========
function bindEvents() {
  // Sự kiện bật/tắt form
  btnShowForm.addEventListener('click', () => {
    formAddTable.classList.toggle('d-none');
    btnShowForm.textContent = formAddTable.classList.contains('d-none')
      ? '+ Thêm bàn'
      : 'Đóng';
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
    updateTable(tableId);  // ✅ gọi hàm cập nhật tại đây
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
      location.reload();
    } catch (error) {
      toastr.error(error.message); 
    }
  });
}


// ========== CHƯƠNG TRÌNH CHÍNH ==========
document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();      
  await getTables(); 
});


// ========== LẤY DỮ LIỆU TỪ SERVER ==========
let tableData = []; 

async function getTables() {
  try {
    const tables = await ajax("/api/tables", {}, "GET");
    if (tables) {
      tableData = tables;
      renderTableList(tables); 

      // Gán sự kiện cho checkbox "Chọn tất cả"
      const selectAll = document.getElementById("selectAllTable");
      selectAll.checked = false;

      selectAll.addEventListener('change', function () {
        const isChecked = this.checked;
        document.querySelectorAll('.tableCheckbox').forEach(cb => {
          cb.checked = isChecked;
        });
      });
    }
  } catch (error) {
    toastr.error(error.message);
  }
}


// ========== HIỂN THỊ DANH SÁCH BÀN ==========
function renderTableList(tables = []) {
  if (!Array.isArray(tables) || tables.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Không có bàn nào.</td></tr>`;
    return;
  }

   //tạo dòng HTML tương ứng
  tableBody.innerHTML = tables.map(table => `
    <tr>
      <td class="text-center align-middle">
        <input type="checkbox" class="tableCheckbox" data-id="${table._id}" />
      </td>
      <td>${table.name}</td>
      <td>${table.status === "available" ? "Trống" : "Có khách"}</td>
      <td>${table.capacity || "-"}</td>
      <td>${table.area || "-"}</td>
    </tr>
  `).join("");
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

    // Gọi API lấy dữ liệu bàn theo id
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


    // DELETE TABLE
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
