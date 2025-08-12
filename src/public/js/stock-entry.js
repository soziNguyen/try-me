// public/js/stock-entry.js
$(function () {
  let ingredients = []
  let warehouses = []
  let table

  Promise.all([
    fetchData('inventory/ingredient/all'),// danh sách nguyên liệu
    fetchData('inventory/warehouse/all')  // danh sách kho
  ])
  .then(([ings, whs]) => {
    ingredients = ings
    warehouses = whs
    initDataTable()
  })
  .catch(err => {
    toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
  })

  function initDataTable () {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#stockEntryTableBody').offset().top - 100) / 45)
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#stockEntryTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
             'l' + 'f' +
           '<"right-group d-flex align-items-center btn-group flex-wrap">' +
           '>' +
           'rt' +
           '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [],
      ajax: {
        url: '/api/inventory/stock-entries',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ phiếu nhập mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu nhập',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ phiếu nhập)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: null,
          title: '<input type="checkbox" id="selectAll">',
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="stockEntryCheckbox" data-id="${row._id}">`
        },
        {
          data: 'code',
          title: 'Mã phiếu nhập',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'date',
          title: 'Ngày nhập',
          className: 'text-center',
          render: (data) => {
            const dt = new Date(data)
            return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          }
        },
        {
          data: 'supplier.name',
          title: 'Nhà cung cấp',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'items',
          className: 'text-start px-1',
          title: 'Nguyên liệu',
          render: items => {
            if (!Array.isArray(items) || items.length === 0) return '';
            const names = items.map(it => it.ingredient?.name).filter(Boolean);
            const uniqueNames = new Set(names);
            
            if (uniqueNames.size === 0) return '';
            const nameLengths = [...uniqueNames]
            const firstThree = nameLengths.slice(0, 3).join(', ');
            const more = nameLengths.length > 3 ? '...' : ''
            return `<span title="${names.join('\n')}">${firstThree} ${more}</span>`;
          }
        },
        {
          data: 'items',
          className: 'text-center',
          title: 'Số lượng',
          render: (items) => {
            if (!Array.isArray(items) || items.length === 0) return ''
            const totalQty = items.reduce((acc, cur) => acc + (cur.quantity || 0), 0)
            return totalQty
          }
        },
        {
          data: 'items',
          title: 'Giá TB (₫)',
          className: 'text-center',
          render: items => {
            if (!Array.isArray(items) || items.length === 0) return '';
            const prices = items.map(it => it.unitPrice || 0);
            const sum = prices.reduce((s, p) => s + p, 0);
            const avg = sum / prices.length;
            // Format theo vi-VN
            return avg.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';
          }
        },
        {
          data: 'warehouse.name',
          className: 'text-center',
          title: 'Kho nhập',
          render: data => data
        },        
        {
          data: 'note',
          title: 'Ghi chú',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: null,
          orderable: false,
          className: 'text-center',
          width: '100px',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <button class="btn btn-sm btn-outline-primary my-1 detail-btn" 
                        data-id="${row._id}" 
                        title="Xem chi tiết">
                  <i class="bi bi-eye"></i> Chi tiết
                </button>`
            }
            return ''
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteStockEntryBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addStockEntryBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
        
        // Event handler cho nút "Thêm"
        $('#addStockEntryBtn').on('click', () => {
          createNewRecord('inventory/stock-entry', {}, (data) => {
              window.location.href = `/inventory/stock-entry/${data.id}?mode=new`
          })
        })

        // Event handler cho nút "Chi tiết"
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/inventory/stock-entry/${id}`
        })
        
        // CHỈ GIỮ LẠI DELETE VÀ CHECKBOX EVENTS
        handlerDeleteEvent('#stockEntryTable', '#deleteStockEntryBtn', 'stockEntryCheckbox', 'inventory/stock-entry')
        initTableCheckboxEvents('#stockEntryTable', 'stockEntryCheckbox')
      }
    })
  }
})