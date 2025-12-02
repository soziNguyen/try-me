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
    }
  } catch (error) {}
}
