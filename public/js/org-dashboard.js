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

      renderRevenueChart(result.last7DaysRevenue)
      renderTop5Items(result.top5Items)
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
  const isBar = labels.length < 2

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
            barPercentage: 0.5, // Độ rộng bar so với category (0-1)
            categoryPercentage: 0.6 // Độ rộng category so với toàn bộ (0-1)
          })
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
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
