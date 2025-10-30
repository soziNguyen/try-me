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
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="planCheckbox" data-id="${row._id}">`
        },
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
          data: 'duration',
          render: (data, type, row) => {
            if (type === 'display') {
              const mode = row.mode === 'month' ? 'tháng' : 'năm'
              const duration = `${data} ${mode}`
              return `<span class="text">${duration || ''}</span>`
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
        // {
        //   data: 'expiredAt',
        //   render: (data, type, row) => {
        //     if (type === 'display') {
        //       const date = new Date(data)
        //       return `<span class="text">${
        //         date.toLocaleString('vi-VN', {
        //           day: '2-digit',
        //           month: '2-digit',
        //           year: 'numeric'
        //         }) || ''
        //       }</span>`
        //     }
        //     return data || ''
        //   }
        // },
        {
          data: 'status',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              const status =
                data === 'pending'
                  ? `<span class="badge bg-warning py-2">Chờ xác nhận</span>`
                  : data === 'paid'
                    ? `<span class="badge bg-success py-2">Đã duyệt</span>`
                    : `<span class="badge bg-danger py-2">Đã hủy</span>`
              return status
            }
            return data || ''
          }
        },
        {
          data: null,
          orderable: false,
          searchable: false,
          render: (data, type, row) => {
            if (type === 'display') {
              if (row.status === 'pending') {
                return `
                  <div class="btn-group d-flex justify-content-center">
                    <button class="btn btn-sm btn-success btn-approve" title="Duyệt gói">
                      <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-cancel" title="Hủy giao dịch">
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                `
              } else {
                return `<span class="text-muted d-block text-center">—</span>`
              }
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
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deletePlanBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
          </div>
        `)
      }
    })
  }

  handlerDeleteEvent(
    '#planTransactionTable',
    '#deletePlanBtn',
    'planCheckbox',
    'admin/plan-transactions'
  )
  initTableCheckboxEvents('#planTransactionTable', 'planCheckbox')

  // Approve
  $('#planTransactionTable').on('click', '.btn-approve', async function () {
    const id = $(this).closest('tr').data('id')

    showConfirmModal({
      title: 'Xác nhận',
      message: 'Xác nhận duyệt gói này?',
      okBtnColor: 'success',
      confirmed: 'Xác nhận',
      onConfirm: async function () {
        const data = await ajax(`/api/admin/plan/${id}/approve`, {})
        if (data === 1) {
          toastr.success('Duyệt thành công')
          reloadTable('#planTransactionTable')
        }
      }
    })
  })

  // Cancel
  $('#planTransactionTable').on('click', '.btn-cancel', async function () {
    const id = $(this).closest('tr').data('id')

    showConfirmModal({
      title: 'Xác nhận hủy',
      message: 'Bạn có chắc muốn hủy giao dịch này?',
      okBtnColor: 'danger',
      confirmed: 'Xác nhận',
      onConfirm: async function () {
        const data = await ajax(`/api/admin/plan/${id}/cancel`, {})
        if (data) {
          toastr.success('Hủy giao dịch thành công')
          reloadTable('#planTransactionTable')
        }
      }
    })
  })
})
