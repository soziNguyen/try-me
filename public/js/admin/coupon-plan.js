$(function () {
  let table
  let allPlans = []

  Promise.all([fetchData('admin/plan/active')])
    .then(([plans]) => {
      allPlans = plans
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#couponTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function initDataTable() {
    table = $('#couponTable').DataTable({
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
      order: [[10, 'desc']], // Sort by createdAt (column index 10) descending
      ajax: {
        url: '/api/admin/coupons',
        method: 'GET'
      },
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm mã giảm giá',
        lengthMenu: `_MENU_ mã giảm giá mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ mã giảm giá',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ mã giảm giá)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng',
        processing:
          '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div>'
      },
      lengthMenu: showList,
      pageLength: numRows,
      columnDefs: [{ width: '200px', targets: 4 }],
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="couponCheckbox" data-id="${row._id}">`
        },
        {
          data: 'code',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput form-control w-100 border-0" data-field="code" value="${data || ''}" placeholder="Mã giảm giá">`
            }
            return data || ''
          }
        },
        {
          data: 'discountType',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <select class="dataInput form-select border-0" data-field="discountType">
                    <option value="">— Chọn loại —</option>
                    <option value="percent" ${data === 'percent' ? 'selected' : ''}>Phần trăm</option>
                    <option value="amount" ${data === 'amount' ? 'selected' : ''}>Tiền cố định</option>
                </select>
              `
            }
            return data === 'percent' ? 'Phần trăm' : data === 'amount' ? 'Tiền cố định' : ''
          }
        },
        {
          data: 'discountValue',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="number" 
                    class="dataInput number form-control w-100 border-0" 
                    placeholder="Giá trị"
                    data-field="discountValue" 
                    value="${data !== null && data !== undefined ? data : ''}"
                    min="0"
                    step="0.01"
                >
              `
            }
            return data !== null && data !== undefined ? data : ''
          }
        },
        {
          data: 'applicablePlans',
          orderable: false,
          render: (data, type, row) => {
            // Khi hiển thị (display/export)
            if (Array.isArray(data) && data.length > 0) {
              return data.map((p) => `<span class="text">${p.name}</span>`).join('<br>')
            }
            return `<span class="text">Tất cả các gói</span>`
          }
        },
        {
          data: 'startDate',
          className: 'text-center',
          render: (data, type) => {
            if (type === 'display') {
              const val = data ? new Date(data).toISOString().split('T')[0] : ''
              return `
                <input type="date" 
                  class="dataInput form-control border-0 text-center"
                  data-field="startDate"
                  value="${val}"
                >
              `
            }
            return data ? new Date(data).toLocaleDateString('vi-VN') : ''
          }
        },
        {
          data: 'endDate',
          className: 'text-center',
          render: (data, type) => {
            if (type === 'display') {
              const val = data ? new Date(data).toISOString().split('T')[0] : ''
              return `
                <input type="date" 
                  class="dataInput form-control border-0 text-center"
                  data-field="endDate"
                  value="${val}"
                >
              `
            }
            return data ? new Date(data).toLocaleDateString('vi-VN') : ''
          }
        },

        {
          data: 'usageLimit',
          className: 'text-center',
          render: (data, type) => {
            if (type === 'display') {
              return data !== null && data !== undefined
                ? `<span>${data}</span>`
                : `<span class="text-muted">0</span>`
            }
            return data !== null && data !== undefined ? data : 'Không giới hạn'
          }
        },
        {
          data: 'usedCount',
          className: 'text-center',
          render: (data, type) => {
            if (type === 'display') {
              return `<span>${data || 0}</span>`
            }
            return data || 0
          }
        },
        {
          data: 'description',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="text" 
                    class="dataInput form-control w-100 border-0" 
                    placeholder="Mô tả" 
                    data-field="description"
                    value="${data || ''}"
                >
              `
            }
            return data || ''
          }
        },
        {
          data: 'isActive',
          className: 'text-center',
          orderable: false,
          render: (data, type) => {
            if (type === 'display') {
              return `
                <div class="d-flex justify-content-center">
                  <input type="checkbox" class="dataInput form-check-input" 
                    data-field="isActive" ${data ? 'checked' : ''}
                    role="switch"
                  >
                </div>
              `
            }
            return data ? 'Hoạt động' : 'Không hoạt động'
          }
        },
        {
          data: null,
          className: 'text-center',
          orderable: false,
          render: (_, __, row) => `
            <button class="btn btn-sm btn-primary me-1 editBtn" data-id="${row._id}">
              <i class="bi bi-pencil-square"></i>
            </button>
            `
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
