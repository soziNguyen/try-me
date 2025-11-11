$(function () {
  let warehouses = []
  let table

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
    ($(window).height() - $('#productStockTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#productStockTable').DataTable({
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
        url: '/api/product/stocks',
        type: 'GET',
        data: function (d) {
          return {
            ...d,
            warehouse: $('#warehouseFilter').val() || 'all'
          }
        }
      },
      order: [],
      columns: [
        {
          data: null,
          orderable: false,
          title: 'STT',
          searchable: false,
          render: (data, type, row, meta) =>
            `<span class="number">${meta.row + meta.settings._iDisplayStart + 1}</span>`
        },
        {
          data: 'item.name',
          title: 'Tên sản phẩm',
          render: (data, type, row) => {
            if (!row.item) return '<span class="text form-control text-muted">N/A</span>'

            // Hiển thị type badge
            const typeBadge =
              row.item.type === 'combo'
                ? '<span class="badge bg-primary ms-2">Combo</span>'
                : '<span class="badge bg-success ms-2">Món</span>'

            return `<span class="text form-control">${row.item.name}${typeBadge}</span>`
          }
        },
        {
          data: 'item.sku',
          title: 'Mã',
          render: (data) => (data ? `<span class="text">${data}</span>` : '')
        },
        {
          data: 'warehouse.name',
          title: 'Kho',
          render: (data, type, row) => {
            if (type === 'display' && row.warehouse) {
              const location = row.warehouse.location ? ` - ${row.warehouse.location}` : ''
              return `<span class="text">${row.warehouse.name}${location}</span>`
            }
            return row.warehouse?.name || ''
          }
        },
        {
          data: 'quantity',
          title: 'Số lượng',
          render: (data) => `<span class="number">${data || 0}</span>`
        }
      ],
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ sản phẩm mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ sản phẩm',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ sản phẩm)',
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
