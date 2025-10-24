$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#planTransactionTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  initDataTable()

  function initDataTable() {
    table = $('#planTransactionTable').DataTable({
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
      order: [],
      ajax: {
        url: '/api/admin/plan-transactions',
        method: 'GET'
      },
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ bản ghi mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ bản ghi)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      lengthMenu: showList,
      pageLength: numRows,
      columns: [
        {
          data: 'organization',
          className: 'py-2',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.name || ''}</span>`
            }
            return data.name || ''
          }
        },
        {
          data: 'plan',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.name || ''}</span>`
            }
            return data.name || ''
          }
        },
        {
          data: 'mode',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data === 'month' ? 'Tháng' : 'Năm' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'amount',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.toLocaleString() + ' đ' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'discountAmount',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.toLocaleString() + ' đ' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'subtotal',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.toLocaleString() + ' đ' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'vat',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.toLocaleString() + ' đ' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'total',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text">${data.toLocaleString() + ' đ' || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'paidAt',
          render: (data, type, row) => {
            if (type === 'display') {
              const date = new Date(data)
              return `<span class="text">${date.toLocaleString() || ''}</span>`
            }
            return data || ''
          }
        },
        {
          data: 'expiredAt',
          render: (data, type, row) => {
            if (type === 'display') {
              const date = new Date(data)
              return `<span class="text">${date.toLocaleString() || ''}</span>`
            }
            return data || ''
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deleteCouponBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addCouponBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)

        $('.editBtn').on('click', function () {
          const couponId = $(this).data('id')
          window.location.href = `/coupon/${couponId}`
        })
      }
    })

    // Event handlers
    handlerAddEvent('#couponTable', '#addCouponBtn', 'admin/coupon')
    handlerDeleteEvent('#couponTable', '#deleteCouponBtn', 'couponCheckbox', 'admin/coupon')
    initTableCheckboxEvents('#couponTable', 'couponCheckbox')
    handlerUpdateEvent('#couponTable', 'admin/coupon')
  }
})
