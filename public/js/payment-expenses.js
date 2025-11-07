$(function () {
  let table
  let warehouses = []
  Promise.all([fetchData('inventory/warehouse/all')])
    .then(([whs]) => {
      warehouses = whs
      initDataTable() // gọi DataTable sau khi có danh sách kho
    })
    .catch((err) => {
      toastr.error('Không load được danh sách kho', err)
      initDataTable() // vẫn khởi tạo table nếu fetch thất bại
    })
  function initDataTable() {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(
      ($(window).height() - $('#PaymentExpensesTableBody').offset().top - 100) / 45
    )
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#PaymentExpensesTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: true,
      scrollX: true,
      order: [],
      ajax: {
        url: '/api/payment-expenses',
        method: 'GET',
        data: function (d) {
          return {
            ...d,
            warehouse: $('#warehouseFilter').val() || 'all'
          }
        }
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ phiếu chi mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu chi',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ phiếu chi)',
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
            `<input type="checkbox" class="paymentExpensesCheckbox" data-id="${row._id}">`
        },
        {
          data: 'code',
          title: 'Mã phiếu chi',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'date',
          title: 'Ngày chi',
          className: 'text-center',
          render: (data) => {
            const dt = new Date(data)
            return dt.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          }
        },
        {
          data: 'reason',
          title: 'Lý do chi',
          className: 'text-center',
          render: (data) => data || ''
        },
        {
          data: 'expenseAmount',
          title: 'Chi phí (đ)',
          className: 'text-center',
          render: (data) => {
            if (!data && data !== 0) return '0 ₫'
            return Number(data).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫'
          }
        },
        {
          data: 'warehouse.name',
          className: 'text-start px-1',
          title: 'Kho chi',
          render: (data, type, row) => {
            if (type === 'display') {
              return data ? `${row.warehouse.name} - ${row.warehouse.location}` : ''
            }
            return row.warehouse?.name || ''
          }
        },
        {
          data: 'createdBy',
          title: 'Người tạo',
          className: 'text-center',
          render: (data) => data || ''
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
        // Container right-group
        const rightGroup = $('.right-group')

        // HTML dropdown + nút
        const html = `
        <select id="warehouseFilter" class="form-select me-2" style="width: 200px;">
          <option value="all">Tất cả kho</option>
          ${warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')}
        </select>
        <button class="btn btn-outline-danger me-2" id="deletePaymentExpensesBtn">
          <i class="bi bi-trash"></i> Xóa
        </button>
        <button class="btn btn-outline-success" id="addPaymentExpensesBtn">
          <i class="bi bi-plus-circle"></i> Thêm
        </button>
      `

        rightGroup.html(html)
        rightGroup.addClass('d-flex align-items-center')

        // Khi đổi kho -> reload table
        $('#warehouseFilter').on('change', function () {
          table.ajax.reload()
        })

        // Event thêm
        $('#addPaymentExpensesBtn').on('click', () => {
          const selectedWarehouse = $('#warehouseFilter').val() // Lấy kho đang chọn
          const requestData = {
            warehouse: selectedWarehouse
          }

          createNewRecord('payment-expenses', requestData, (data) => {
            window.location.href = `/payment-expenses/${data.id}?mode=new`
          })
        })

        // Các event chi tiết, xóa, checkbox...
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/payment-expenses/${id}`
        })

        handlerDeleteEvent(
          '#PaymentExpensesTable',
          '#deletePaymentExpensesBtn',
          'paymentExpensesCheckbox',
          'payment-expenses'
        )
        initTableCheckboxEvents('#PaymentExpensesTable', 'paymentExpensesCheckbox')
      }
    })
  }
})
