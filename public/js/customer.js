$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#customerTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  const table = $('#customerTable').DataTable({
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
    autoWidth: false,
    // scrollX: true,
    order: [],
    ajax: {
      url: '/api/customers',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ khách hàng mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ khách hàng',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ khách hàng)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        title: '<input type="checkbox" id="selectAll">',
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="customerCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        className: 'py-1',
        title: 'Tên',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="text w-100">${data ?? ''}</span>`
          }
          return data
        }
      },
      {
        data: 'phone',
        title: 'Điện thoại',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? ''}</span>`
          }
          return data
        }
      },
      {
        data: 'totalPoints',
        title: 'Điểm tích lũy',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? 0}</span>`
          }
          return data
        }
      },
      {
        data: 'totalOrders',
        title: 'Tổng đơn hàng',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ?? 0}</span>`
          }
          return data
        }
      },
      {
        data: 'totalSpent',
        title: 'Tổng chi tiêu (đ)',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<span class="number w-100">${data ? data.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>`
          }
          return data ?? 0
        }
      },
      {
        data: 'lastOrderDate',
        title: 'Đơn hàng cuối',
        render: (data, type, row) => {
          if (type === 'display') {
            if (data !== null) {
              const dt = new Date(data)
              const dateStr = dt.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
              const timeStr = dt.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
              const lastOrderDate = dateStr + ' ' + timeStr
              console.log(lastOrderDate)

              return `<span class="number">${lastOrderDate ?? ''}</span>`
            }
          }
          return data
        }
      }
    ],
    rowCallback: function (row, data) {
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(
        `
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteCustomerBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addCustomerBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `
      )
    }
  })

  // show modal
  addCustomerHandler()

  const csrfToken = $('#_csrf').val()
  const inputs = ['customerName', 'customerPhone']

  // submit form
  $('#addCustomerForm').on('submit', function (e) {
    e.preventDefault()
    const data = {
      name: $('#customerName').val(),
      phone: $('#customerPhone').val()
    }

    $.ajax({
      url: '/api/customers/create',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      headers: { 'x-csrf-token': csrfToken },
      success: function (res) {
        if (res.success) {
          toastr.remove()
          hideModal('addCustomerModal')
          toastr.success(res.message)

          //reset input
          inputs.forEach((id) => {
            const el = document.getElementById(id)
            if (el) el.value = ''
          })
          table.ajax.reload()
        }
      },
      error: function (xhr) {
        console.error(xhr.responseJSON?.message || 'Có lỗi xảy ra!!')
      }
    })
  })
  handlerDeleteEvent('#customerTable', '#deleteCustomerBtn', 'customerCheckbox', 'customer')
  initTableCheckboxEvents('#customerTable', 'customerCheckbox')
})

function addCustomerHandler() {
  $('#customerTable_wrapper').on('click', '#addCustomerBtn', function () {
    const modal = showModal('addCustomerModal')
    modal.show()
  })
}
