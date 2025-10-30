document.addEventListener('DOMContentLoaded', async function () {
  await loadAddressData()
  await getTransactionPlanData(transactionId)
  await cancelPlan(transactionId)
})

let provinceLists = []
let communeLists = []
const url = window.location.pathname.split('/')
const transactionId = url[url.length - 2]

// Load dữ liệu tỉnh/xã
async function loadAddressData() {
  try {
    const res = await fetch('/data/full_address.json')
    const data = await res.json()
    if (data.error === 0 && data.data) {
      provinceLists = data.data
      communeLists = provinceLists.flatMap((p) => p.data2 || [])
    }
  } catch (err) {
    console.error('Lỗi load full_address.json:', err)
  }
}

// Lấy tên địa chỉ đầy đủ
function getAddressName(street, communeCode, provinceCode) {
  const province = provinceLists.find((p) => String(p.id) === String(provinceCode))
  const commune = communeLists.find((c) => String(c.id) === String(communeCode))
  const provinceName = province?.name || ''
  const communeName = commune?.name || ''
  return `${street || ''}${communeName ? ', ' + communeName : ''}${provinceName ? ', ' + provinceName : ''}`
}

// Định dạng tiền
function formatMoney(num) {
  if (isNaN(num)) return '0'
  return num.toLocaleString('vi-VN')
}

// Render dữ liệu hóa đơn
async function getTransactionPlanData(id) {
  const data = await ajax(`/api/admin/plan-transaction/${id}`, {}, 'GET')

  // Điền thông tin địa chỉ
  const el = document.querySelector('#address')
  if (el && data.organization) {
    const addr = getAddressName(
      data.organization.street,
      data.organization.commune,
      data.organization.province
    )
    el.textContent = addr || ''
  }

  // Render table
  const tbody = document.querySelector('table tbody')
  tbody.innerHTML = ''

  // Tạo 1 dòng duy nhất cho gói dịch vụ
  const row = document.createElement('tr')
  row.innerHTML = `
    <td class="text-center">1</td>
    <td class="px-2">Gói dịch vụ ${data.plan.name}</td>
    <td class="text-end px-2">${formatMoney(data.mode === 'year' ? data.plan.priceYear : data.plan.priceMonth)}</td>
    <td class="text-end px-2">1</td>
    <td class="text-end px-2">${data.duration} ${data.mode === 'year' ? 'năm' : 'tháng'}</td>
    <td class="text-end px-2">${formatMoney(data.amount)}</td>
  `
  tbody.appendChild(row)

  // Dòng cộng tiền
  const summaryRows = `
  <tr>
    <td colspan="5" class="text-end fw-semibold px-2">Giảm giá</td>
    <td class="text-end text-danger px-2">${data.discountAmount ? -formatMoney(data.discountAmount) : 0}</td>
  </tr>
  <tr>
    <td colspan="5" class="text-end fw-semibold px-2">Tạm tính</td>
    <td class="text-end px-2">${formatMoney(data.subtotal)}</td>
  </tr>
  <tr>
    <td colspan="5" class="text-end fw-semibold px-2">Thuế VAT (10%)</td>
    <td class="text-end px-2">${formatMoney(data.vat)}</td>
  </tr>
  <tr>
    <td colspan="5" class="text-end fw-bold px-2">Tổng cộng</td>
    <td class="text-end fw-bold px-2">${formatMoney(data.total)}</td>
  </tr>
  <tr class="fw-semibold">
    <td colspan="6" class="fst-italic px-2"><span class="fst-normal">Số tiền bằng chữ: </span>${numberToVietnameseWords(data.total)}</td>
  </tr>
`
  tbody.insertAdjacentHTML('beforeend', summaryRows)

  if (data.status === 'cancelled') {
    $('#btn-cancel-payment')
      .prop('disabled', true)
      .html('<i class="bi bi-x-circle-fill me-1"></i> Đã hủy')
  } else if (data.status === 'paid') {
    $('#btn-cancel-payment')
      .prop('disabled', true)
      .removeClass('btn-danger')
      .addClass('btn-success')
      .html('<i class="bi bi-check-circle-fill me-1"></i> Đã thanh toán')
  }
}

async function cancelPlan(id) {
  $('#btn-cancel-payment').on('click', async function () {
    const btn = $(this)
    try {
      showConfirmModal({
        title: 'Xác nhận hủy',
        message: 'Bạn có chắc muốn hủy giao dịch này?',
        okBtnColor: 'danger',
        confirmed: 'Xác nhận',
        onConfirm: async function () {
          const data = await ajax(`/api/admin/plan/${id}/cancel`, {})
          if (data) {
            toastr.success('Hủy giao dịch thành công')
            btn.prop('disabled', true).text('Đã hủy')
            $('#status-badge')
              .removeClass('bg-warning text-dark')
              .addClass('bg-danger text-white')
              .html('<i class="bi bi-x-circle"></i> Đã hủy')
          }
        }
      })
    } catch (error) {
      toastr.error(error.message || 'Không thể hủy giao dịch')
    }
  })
}
