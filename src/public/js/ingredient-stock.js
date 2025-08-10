$(function () {
    let showList = [10, 25, 50, 100];
    const numRows = Math.floor(($(window).height() - $('#ingredientStockTableBody').offset().top - 100) / 45);
    if (!showList.includes(numRows)) {
      showList.push(numRows);
    }
    showList.sort((a, b) => a - b);
  
    $('#ingredientStockTable').DataTable({
      serverSide: true,
      processing: true,
      ajax: {
        url: '/api/inventory/ingredient-stock',
        type: 'GET',
      },
      columns: [
        {
          data: null,
          orderable: false,
          searchable: false,
          render: (data, type, row, meta) =>
            `<span class="number">${meta.row + meta.settings._iDisplayStart + 1}</span>`,
        },
        {
          data: 'ingredient.name',
          render: (data, type, row) =>
            `<span class="text">${row.ingredient?.name || ''}</span>`,
        },
        {
          data: 'warehouse.name',
          render: (data, type, row) =>
            `<span class="text">${row.warehouse?.name || ''}</span>`,
        },
        {
          data: 'quantity',
          render: (data) => `<span class="number">${data}</span>`,
        },
        {
          data: 'ingredient.unit',
          render: (data, type, row) =>
            `<span class="text">${row.ingredient?.unit || ''}</span>`,
        },
        {
          data: 'supplier.name',
          render: (data, type, row) => {
            if (row.supplier?.name) {
              return `<span class="badge bg-success">${row.supplier.name}</span>`;
            }
            return `<span class="badge bg-info">Chuyển kho</span>`;
          },
        },
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
        emptyTable: 'Không có dữ liệu trong bảng',
      },
    });
  });
  