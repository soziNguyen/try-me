document.addEventListener('DOMContentLoaded', async function () {
  await getSaleInfomation()
})

const getSaleInfomation = async () => {
  try {
    const result = await ajax('/api/order/report', {}, 'GET')
    if (result) {
      document.querySelector('.revenueToday').textContent = formatCurrencyToVnd(result.todayRevenue)
      document.querySelector('.numOfOrderToday').textContent = result.todayOrders
      document.querySelector('.bestSellerOrderToday').textContent = result.topItemToday.name
      document.querySelector('.revenueThisMonth').textContent = formatCurrencyToVnd(
        result.thisMonthTotalRevenue
      )

      renderRevenueChart(result.last7DaysRevenue)
      renderTop5Items(result.top5Items)
    }
  } catch (error) {}
}

function renderRevenueChart(data) {
  const labels = data.map((item) => item.date)
  const revenues = data.map((item) => item.totalRevenue)

  const ctx = document.getElementById('chartRevenue7Days').getContext('2d')

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Doanh thu (đ)',
          data: revenues,
          borderWidth: 3,
          tension: 0.3,
          borderColor: 'rgb(255, 0, 0)',
          backgroundColor: 'rgb(255, 0, 0)'
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

  // Lấy số lượng cao nhất để tính %
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
