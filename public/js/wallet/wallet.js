document.addEventListener('DOMContentLoaded', () => {
  const walletBalanceEl = document.getElementById('walletBalance')
  const topUpForm = document.getElementById('topUpForm')
  const transactionsTable = document.querySelector('#walletTransactions tbody')
  const paymentMethodSelect = document.getElementById('paymentMethod')
  const topUpModalEl = document.getElementById('topUpModal')
  const topUpModal = new bootstrap.Modal(topUpModalEl)

  async function loadPaymentMethods() {
    try {
      const result = await ajax('/api/admin/payment-method/active', {}, 'GET')
      if (result) {
        paymentMethodSelect.innerHTML = ''
        result.forEach((method) => {
          const option = document.createElement('option')
          option.value = method.code
          option.textContent = method.name
          paymentMethodSelect.appendChild(option)
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Fetch wallet info
  async function loadWallet() {
    try {
      const result = await ajax('/api/wallet', {}, 'GET')
      if (result) {
        walletBalanceEl.textContent = `${result.wallet.balance.toLocaleString()} ${result.wallet.currency}`
        renderTransactions(result.transactions)
        console.log(result)
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
      pending: '<span class="badge bg-warning text-dark">Chờ xử lý</span>',
      completed: '<span class="badge bg-success">Hoàn thành</span>',
      failed: '<span class="badge bg-danger">Thất bại</span>'
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
    const method = paymentMethodSelect.value

    if (amount <= 0 || !method) return alert('Vui lòng chọn phương thức và số tiền hợp lệ')

    try {
      const result = await ajax('/api/wallet/top-up', { amount, method })
      if (result) {
        toastr.success('Gửi yêu cầu nạp tiền thành công')
        topUpModal.hide()
        loadWallet()
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra!')
    }
  })

  // Initial load
  loadPaymentMethods()
  loadWallet()
})
