document.addEventListener('DOMContentLoaded', async () => {
  await fetchKitchenOrders()
})

async function fetchKitchenOrders() {
  try {
    const result = await ajax('/api/kitchen/orders', {}, 'GET')
  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
  }
}
