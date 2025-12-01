$(function () {
  initCustomerTable()
  initCustomerEvents()
  customScrollbarInit()
})

function initCustomerTable() {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#customerTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) showList.push(numRows)
  showList.sort((a, b) => a - b)

  $('#customerTable').DataTable({
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
      infoFiltered: '(lọc từ tổng _MAX_ khách hàng)',
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
        render: (data) => `<span class="text w-100">${data ?? ''}</span>`
      },
      {
        data: 'phone',
        title: 'Điện thoại',
        render: (data) => `<span class="number w-100">${data ?? ''}</span>`
      },
      {
        data: 'totalPoints',
        title: 'Điểm tích lũy',
        render: (data) => `<span class="number w-100">${data ?? 0}</span>`
      },
      {
        data: 'totalOrders',
        title: 'Tổng đơn hàng',
        render: (data) => `<span class="number w-100">${data ?? 0}</span>`
      },
      {
        data: 'totalSpent',
        title: 'Tổng chi tiêu (đ)',
        render: (data) =>
          `<span class="number w-100">${data ? data.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>`
      },
      {
        data: 'lastOrderDate',
        title: 'Đơn hàng cuối',
        render: (data) => {
          if (!data) return ''
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
          return `<span class="number">${dateStr} ${timeStr}</span>`
        }
      },
      {
        data: null,
        title: '<i class="bi bi-pencil-square"></i>',
        className: 'text-center',
        orderable: false,
        render: (_, __, row) => `
          <button class="btn btn-sm btn-outline-primary editBtn" data-id="${row._id}">
            <i class="bi bi-pencil-square"></i>
          </button>`
      },
      {
        data: null,
        title: '<i class="bi bi-list-ul"></i>',
        className: 'text-center',
        orderable: false,
        render: (_, __, row) => `
          <button class="btn btn-sm btn-outline-info detailBtn" data-id="${row._id}">
            <i class="bi bi-list-ul"></i>
          </button>`
      }
    ],
    rowCallback: (row, data) => $(row).attr('data-id', data._id),
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap">
          <button class="btn btn-outline-danger me-2" id="deleteCustomerBtn">
            <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addCustomerBtn">
            <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })
}

// Khởi tạo sự kiện
function initCustomerEvents() {
  const csrfToken = $('#_csrf').val()

  // Thêm khách hàng
  showCustomerModal('addCustomerModal', '#addCustomerBtn')
  $('#addCustomerForm').on('submit', (e) => handleAddCustomer(e, csrfToken))

  // Sửa khách hàng
  $('#customerTable').on('click', '.editBtn', async function () {
    const id = $(this).closest('tr').data('id')

    try {
      const customer = await ajax(`/api/customer/${id}`, {}, 'GET')

      $('#updateCustomerId').val(id)
      $('#updateCustomerName').val(customer.name)
      $('#updateCustomerPhone').val(customer.phone)
      showModal('updateCustomerModal').show()
    } catch {
      toastr.error('Không tải được thông tin khách hàng')
    }
  })
  $('#updateCustomerForm').on('submit', (e) => handleUpdateCustomer(e, csrfToken))

  // Xóa khách hàng
  handlerDeleteEvent('#customerTable', '#deleteCustomerBtn', 'customerCheckbox', 'customer')
  initTableCheckboxEvents('#customerTable', 'customerCheckbox')

  $('#customerTable').on('click', '.detailBtn', async function () {
    const id = $(this).closest('tr').data('id')

    try {
      const result = await ajax(`/api/customer/${id}/points/history`, {}, 'GET')

      if (result) {
        showPointHistoryModal(result)
      }
    } catch (error) {
      toastr.error('Không thể tải lịch sử điểm')
    }
  })
}

// Hàm phụ trợ
function showCustomerModal(id, selector) {
  $('#customerTable_wrapper').on('click', selector, function () {
    const modal = showModal(id)
    modal.show()
  })
}

function handleAddCustomer(e, csrfToken) {
  e.preventDefault()
  const data = {
    name: $('#customerName').val().trim(),
    phone: $('#customerPhone').val().trim()
  }

  $.ajax({
    url: '/api/customer/create',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    headers: { 'x-csrf-token': csrfToken },
    success: (res) => {
      if (res.success) {
        toastr.remove()
        hideModal('addCustomerModal')
        toastr.success(res.message)
        resetForm('#addCustomerForm')
        reloadTable('#customerTable')
      } else toastr.error(res.message)
    },
    error: (xhr) => toastr.error(xhr.responseJSON?.message || 'Có lỗi xảy ra!')
  })
}

function handleUpdateCustomer(e, csrfToken) {
  e.preventDefault()
  const id = $('#updateCustomerId').val()
  const data = {
    name: $('#updateCustomerName').val().trim(),
    phone: $('#updateCustomerPhone').val().trim()
  }

  $.ajax({
    url: `/api/customer/update/${id}`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    headers: { 'x-csrf-token': csrfToken },
    success: (res) => {
      if (res.success) {
        toastr.remove()
        hideModal('updateCustomerModal')
        toastr.success(res.message)
        reloadTable('#customerTable')
      } else toastr.error(res.message)
    },
    error: (xhr) => toastr.error(xhr.responseJSON?.message || 'Lỗi khi cập nhật khách hàng')
  })
}

function resetForm(selector) {
  const form = $(selector)[0]
  if (form) form.reset()
}

function showPointHistoryModal(data) {
  const { customer, history } = data

  // Update modal title
  $('#pointHistoryModal .modal-title').html(
    `Lịch sử điểm - ${customer.name ? customer.name : customer.phone}`
  )

  $('.current-points').text(`
    Điểm hiện tại: ${customer.currentPoints}
    `)

  // Render history table
  const $tbody = $('#pointHistoryBody')
  $tbody.empty()

  if (history.length === 0) {
    $tbody.append(`
      <tr>
        <td colspan="4" class="text-center text-muted">Chưa có lịch sử giao dịch</td>
      </tr>
    `)
  } else {
    history.forEach((item) => {
      const typeText = {
        earn: '<span class="badge bg-success">Tích điểm</span>',
        redeem: '<span class="badge bg-danger">Dùng điểm</span>'
      }

      const pointsDisplay =
        item.points > 0
          ? `<span class="text-success">+${item.points}</span>`
          : `<span class="text-danger">${item.points}</span>`

      const date = formatDateTime(item.createdAt)

      $tbody.append(`
        <tr>
          <td class="p-2">${date}</td>
          <td class="p-2">${typeText[item.type]}</td>
          <td class="text-end p-2">${pointsDisplay}</td>
          <td class="p-2">${item.description}</td>
        </tr>
      `)
    })
  }

  $('#pointHistoryModal').modal('show')
}

function customScrollbarInit() {
  $('#pointHistoryModal .modal-body').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200, // giảm thời gian animation -> bớt kéo quá
    mouseWheel: {
      deltaFactor: 20, // giảm tốc độ wheel nếu quá nhanh
      preventDefault: true // tránh scroll container cha
    }
  })
}
