// ========== GLOBAL ==========
const btnShowForm = document.getElementById('btnShowForm');
const formAddTable = document.getElementById('formAddTable');
const form = document.getElementById('formAddTable');
const tableBody = document.getElementById("tableBody");

// ========== SỰ KIỆN KHI TRANG LOAD ==========
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Gán sự kiện toggle form
  btnShowForm.addEventListener('click', () => {
    formAddTable.classList.toggle('d-none');
    btnShowForm.textContent = formAddTable.classList.contains('d-none')
      ? '+ Add table'
      : 'Close';
  });

  // 2. Gán sự kiện submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const status = document.getElementById('status').value;
    const capacity = document.getElementById('capacity').value;
    const area = document.getElementById('area').value.trim();

    try {
      const data = await ajax('/api/tables', { name, status, capacity, area });

      if (!data) return;
      toastr.success('Thêm bàn thành công!');
      location.reload();
    } catch (error) {
      toastr.error(error.message);
    }
  });

  // 3. Load danh sách bàn khi trang load
  await getTables();
});

// ========== AJAX FUNCTION ==========
async function ajax(url, data = {}, method = 'POST') {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Có lỗi xảy ra');
  }
  return await res.json();
}

// ========== LẤY DANH SÁCH BÀN ==========
async function getTables() {
  try {
    const tables = await ajax("/api/tables", {}, "GET");
    if (tables) {
      renderTableList(tables);
    }
  } catch (error) {
    toastr.error(error.message);
  }
}

// ========== HIỂN THỊ DANH SÁCH BÀN ==========
function renderTableList(tables = []) {
  if (!Array.isArray(tables) || tables.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Không có bàn nào.</td></tr>`;
    return;
  }

  tableBody.innerHTML = tables.map(table => `
    <tr>
      <td>${table.name}</td>
      <td>${table.status === "available" ? "Trống" : "Có khách"}</td>
      <td>${table.capacity || "-"}</td>
      <td>${table.area || "-"}</td>
    </tr>
  `).join("");
}
