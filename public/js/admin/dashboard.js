$(function () {
  fetchAdminDashboardStats()
})

function fetchAdminDashboardStats() {
  $.ajax({
    url: '/api/admin/summary',
    method: 'GET',
    success: function (data) {
      renderData(data)
      renderRecentOrders(data.data.recentOrder)
    }
  })
}

function renderData(data) {
  $('.totalOrganizations').text(data.data.totalOrganizations)
  $('.totalUsers').text(data.data.totalUsers)
  $('.totalSubAdmins').text(data.data.totalEmployees)
  $('.activeOrganizations').text(data.data.activeOrganizations)
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable')

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">Chưa có đơn hàng</td>
      </tr>
    `
    return
  }

  tbody.innerHTML = orders
    .map((order) => {
      const statusBadge =
        {
          pending: '<span class="badge bg-warning">Đang xử lý</span>',
          paid: '<span class="badge bg-success">Đã thanh toán</span>',
          cancelled: '<span class="badge bg-danger">Đã hủy</span>'
        }[order.status] || '<span class="badge bg-secondary">Không rõ</span>'

      const timeAgo = getTimeAgo(new Date(order.createdAt))
      const date = new Date(order.paidAt)
      const formatted = date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      return `
      <tr data-id=${order._id}>
        <td class="p-2"><strong>#${order.code}</strong></td>
        <td class="p-2">${timeAgo}</td>
        <td class="p-2">${order.organizationName}</td>
        <td class="p-2">${order.planName}</td>
        <td class="p-2">${order.duration} ${order.mode === 'month' ? 'Tháng' : 'Năm'}</td>
        <td class="p-2">${formatCurrencyToVnd(order.total)}</td>
        <td class="p-2">${!order.paidAt ? '<span class="fst-italic text-muted"><i class="bi bi-hourglass-split text-danger"></i> Chưa thanh toán</span>' : `<span class="text-success fw-semibold"><i class="bi bi-check-circle"></i> ${formatted}</span>`}</td>
        <td class="p-2">${statusBadge}</td>
      </tr>
    `
    })
    .join('')
}
