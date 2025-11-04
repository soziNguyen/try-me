$(function () {
  let warehouses = []
  const csrfToken = $('#_csrf').val() || ''

  // Load danh sách kho trước khi khởi tạo DataTable
  Promise.all([fetchData('inventory/warehouse/all')])
    .then(([whs]) => {
      warehouses = whs
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#ingredientStockTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) showList.push(numRows)
  showList.sort((a, b) => a - b)

  function initDataTable() {
    const table = $('#ingredientStockTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
        'l' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        'f' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      ajax: {
        url: '/api/inventory/ingredient-stock',
        type: 'POST', // dùng POST để truyền body JSON
        contentType: 'application/json',
        headers: { 'x-csrf-token': csrfToken },
        data: function (d) {
          return JSON.stringify({
            ...d,
            warehouse: $('#warehouseFilter').val() || 'all'
          })
        }
      },
      order: [[3, 'desc']],
      columns: [
        {
          data: null,
          orderable: false,
          searchable: false,
          render: (data, type, row, meta) =>
            `<span class="number">${meta.row + meta.settings._iDisplayStart + 1}</span>`
        },
        {
          data: 'ingredient.name',
          render: (data, type, row) => `<span class="text">${row.ingredient?.name || ''}</span>`
        },
        {
          data: 'warehouse.name',
          className: 'text-start px-1',
          render: (data, type, row) => {
            if (type === 'display') {
              return data ? `<span>${row.warehouse.name} - ${row.warehouse.location}</span>` : ''
            }
            return row.warehouse.name
          }
        },
        {
          data: 'quantity',
          render: (data) => `<span class="number">${data}</span>`
        },
        {
          data: 'ingredient.unit',
          render: (data, type, row) => `<span class="text">${row.ingredient?.unit || ''}</span>`
        },
        {
          data: 'supplier.name',
          render: (data, type, row) => {
            if (row.supplier?.name) {
              return `<span class="badge bg-success">${row.supplier.name}</span>`
            }
            return `<span class="badge bg-info">Chuyển kho</span>`
          }
        }
      ],
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ nguyên liệu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ nguyên liệu',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ nguyên liệu)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      initComplete: function () {
        const selectHtml = `
          <select id="warehouseFilter" class="form-select">
            <option value="all">Tất cả kho</option>
            ${warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')}
          </select>
        `
        $('.right-group').html(selectHtml)

        // Khi đổi kho -> reload bảng
        $('#warehouseFilter').on('change', function () {
          table.ajax.reload()
        })
      }
    })
  }
})
