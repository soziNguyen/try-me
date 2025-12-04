document.addEventListener('DOMContentLoaded', async function () {
  await getSaleInfomation()
})

const getSaleInfomation = async () => {
  try {
    const result = await ajax('/api/order/report', {}, 'GET')
    if (result) {
      document.querySelector('.revenueToday').textContent = formatCurrencyToVnd(result.todayRevenue) // Doanh thu hôm nay (so với hôm qua)
      updateChangeIndicator('.revenueToday', result.todayRevenueChange)

      document.querySelector('.numOfOrderToday').textContent = result.todayOrders // Số đơn hôm nay (so với hôm qua)
      updateChangeIndicator('.numOfOrderToday', result.todayOrdersChange)

      document.querySelector('.bestSellerOrderToday').textContent = // Món bán chạy nhất
        result.topItemToday?.name || 'Chưa có'

      document.querySelector('.numOfBestMenuToday').textContent = result.topItemToday // Số lượng món bán chạy nhất
        ? `${result.topItemToday.totalQuantity} món`
        : '0'

      // Doanh thu tháng này (so với tháng trước)
      document.querySelector('.revenueThisMonth').textContent = formatCurrencyToVnd(
        result.thisMonthTotalRevenue
      )
      updateChangeIndicator('.revenueThisMonth', result.thisMonthRevenueChange)

      // Trạng thái đơn hàng
      document.querySelector('.orderCompleted').textContent = result.todayOrderStatus.completed
      document.querySelector('.orderPending').textContent = result.todayOrderStatus.pending
      document.querySelector('.orderCancelled').textContent = result.todayOrderStatus.cancelled

      // Thống kê nhanh
      document.querySelector('.avgOrderValue').textContent = formatCurrencyToVnd(
        result.todayStats.avgOrderValue
      )
      document.querySelector('.avgItemsPerOrder').textContent = Math.round(
        result.todayStats.avgItemsPerOrder
      )
      document.querySelector('.newCustomers').textContent = result.todayStats.newCustomers

      document.querySelector('.totalOrdersThisMonth').textContent =
        result.thisMonthStats.totalOrders
      document.querySelector('.newCustomersThisMonth').textContent =
        result.thisMonthStats.newCustomers
      document.querySelector('.bestSellerThisMonth').textContent =
        result.thisMonthStats.topItem.name

      renderRevenueChart(result.last7DaysRevenue)
      renderTop5Items(result.top5Items)
      renderRecentOrders(result.recentOrders)
      rowClick()
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// Helper function update % thay đổi
function updateChangeIndicator(selector, changePercent) {
  const card = document.querySelector(selector).closest('.card-body')
  const changeElement = card.querySelector('.card-change')

  if (!changeElement) return

  const percent = parseFloat(changePercent)
  const isPositive = percent >= 0
  const arrow = isPositive ? '▲' : '▼'
  const colorClass = isPositive ? 'text-success' : 'text-danger'

  changeElement.className = `card-change mt-2 fs-5 ${colorClass}`
  changeElement.textContent = `${Math.abs(percent)}% ${arrow}`
}

function renderRevenueChart(data) {
  const labels = data.map((item) => item.date)
  const revenues = data.map((item) => item.totalRevenue)

  const ctx = document.getElementById('chartRevenue7Days').getContext('2d')
  const isBar = labels.length < 3

  new Chart(ctx, {
    type: isBar ? 'bar' : 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Doanh thu (đ)',
          data: revenues,
          borderWidth: 3,
          tension: 0.3,
          borderColor: 'rgb(255, 0, 0)',
          backgroundColor: 'rgb(255, 0, 0)',
          ...(isBar && {
            barPercentage: 0.2, // Độ rộng bar so với category (0-1)
            categoryPercentage: 0.6 // Độ rộng category so với toàn bộ (0-1)
          })
        }
      ]
    },
    options: {
      animations: {
        y: {
          from: 300,
          duration: 2000, // 1 giây
          easing: 'easeOutQuart'
        }
      },
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString('vi-VN')
            }
          }
        }
      }
    }
  })
}

function renderTop5Items(items) {
  const list = document.querySelector('.top5ItemsList')
  if (!items || items.length === 0) {
    list.innerHTML = `<li class="list-group-item">Không có dữ liệu</li>`
    return
  }

  const maxQty = Math.max(...items.map((i) => i.totalQuantity))

  list.innerHTML = items
    .map((item) => {
      const percent = ((item.totalQuantity / maxQty) * 100).toFixed(0)

      return `
      <li class="list-group-item">
        <div class="d-flex justify-content-between mb-1">
          <span>${item.name}</span>
          <span class="fw-bold">${item.totalQuantity}</span>
        </div>

        <div class="progress">
          <div title="${item.totalQuantity}" class="progress-bar bg-primary bg-opacity-75" role="progressbar" 
               style="width: ${percent}%;" 
               aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
      </li>
      `
    })
    .join('')
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable')

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">Chưa có đơn hàng nào hôm nay</td>
      </tr>
    `
    return
  }

  tbody.innerHTML = orders
    .map((order) => {
      const statusBadge =
        {
          open: '<span class="badge bg-warning">Đang xử lý</span>',
          completed: '<span class="badge bg-success">Hoàn thành</span>',
          cancelled: '<span class="badge bg-danger">Đã hủy</span>'
        }[order.status] || '<span class="badge bg-secondary">Không rõ</span>'

      const timeAgo = getTimeAgo(new Date(order.createdAt))

      return `
      <tr class="cursor-pointer" data-id=${order._id}>
        <td class="p-2"><strong>#${order.code}</strong></td>
        <td class="p-2">
          ${
            order.isTakeaway
              ? '<i class="bi bi-bag text-primary"></i> Mang về'
              : `<i class="bi bi-grid-3x3-gap text-info"></i> ${order.tableName}`
          }
        </td>
        <td class="p-2"><small class="text-muted">${timeAgo}</small></td>
        <td class="text-center">${order.itemCount}</td>
        <td class="p-2 text-center  "><strong>${formatCurrencyToVnd(order.total)}</strong></td>
        <td class="p-2">${statusBadge}</td>
      </tr>
    `
    })
    .join('')
}

function rowClick() {
  const rows = document.querySelectorAll('#recentOrdersTable tr')
  rows.forEach((row) => {
    row.addEventListener('click', function () {
      const rowId = this.dataset.id
      if (rowId) {
        window.location.href = `/receipt/${rowId}?from=report`
      }
    })
  })
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // seconds

  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return date.toLocaleDateString('vi-VN')
}
