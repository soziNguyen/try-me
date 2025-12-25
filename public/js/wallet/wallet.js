document.addEventListener('DOMContentLoaded', () => {
  const walletBalanceEl = document.getElementById('walletBalance')
  const topUpForm = document.getElementById('topUpForm')
  const transactionsTable = document.querySelector('#walletTransactions tbody')

  // Fetch wallet info
  async function loadWallet() {
    try {
      const result = await ajax('/api/wallet', {}, 'GET')
      if (result) {
        walletBalanceEl.textContent = `${result.wallet.balance.toLocaleString()} ${result.wallet.currency}`
        renderTransactions(result.transactions)
      }
    } catch (err) {
      console.error(err)
    }
  }

  function renderTransactions(transactions) {
    transactionsTable.innerHTML = ''

    const typeMap = {
      credit: 'Cộng tiền',
      debit: 'Trừ tiền'
    }

    const sourceMap = {
      upgrade: 'Nâng cấp gói',
      downgrade: 'Hạ cấp gói',
      manual: 'Nạp'
    }

    const statusMap = {
      pending: '<span class="badge text-info bg-info bg-opacity-10 p-2">Chờ xử lý</span>',
      completed:
        '<span class="badge text-success bg-success bg-opacity-10 p-2">Đã thanh toán</span>',
      failed: '<span class="badge text-secondary bg-secondary bg-opacity-10 p-2">Thất bại</span>',
      cancelled: '<span class="badge text-danger bg-danger bg-opacity-10 p-2">Hủy</span>'
    }

    transactions.forEach((tx) => {
      const tr = document.createElement('tr')

      tr.innerHTML = `
        <td class="py-2 ps-1">${new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
        <td class="py-2 ps-1">${typeMap[tx.type] || tx.type}</td>
        <td class="py-2 ps-1">
          ${tx.amount.toLocaleString('vi-VN')} ${tx.wallet.currency}
        </td>
        <td class="py-2 ps-1">${sourceMap[tx.source] || tx.source}</td>
        <td class="py-2 ps-1">${tx.balanceAfter.toLocaleString('vi-VN')}</td>
        <td class="py-2 ps-1">${statusMap[tx.status]}</td>
      `

      transactionsTable.appendChild(tr)
    })
  }

  // Handle top-up form submit
  topUpForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const amount = parseInt(document.getElementById('topUpAmount').value)

    if (amount <= 0 || !method) return alert('Vui lòng chọn phương thức và số tiền hợp lệ')

    try {
      const result = await ajax('/api/wallet/top-up', { amount })
      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl
      }
    } catch (err) {
      console.error(err)
    }
  })

  // Initial load
  loadWallet()
})
