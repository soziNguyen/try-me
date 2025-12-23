$(function () {
  initDateRangePicker()
  fetchAdminDashboardStats()

  $filterBtn.on('click', function () {
    fetchAdminDashboardStats({
      startDate: currentStartDate.format('YYYY-MM-DD'),
      endDate: currentEndDate.format('YYYY-MM-DD')
    })
  })

  const kycRequestTable = $('#kycRequestTable')
  kycRequestTable.on('click', 'tr', function () {
    const id = $(this).data('id')
    window.location.href = `/organization/${id}`
  })
})

const $filterBtn = $('#filterDateBtn')
const btnOriginalHtml = $filterBtn.html()

function fetchAdminDashboardStats(params = {}) {
  $filterBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>')

  $.ajax({
    url: '/api/admin/summary',
    method: 'GET',
    data: params,
    success: function (data) {
      renderData(data)
      renderRecentOrders(data.data.recentOrder)
      renderRevenueChart(data.data.revenueChart)
      renderKycTable(data.data.kycRequest)
      renderOrderStatusChart(data.data.orderStatusChart)
    },
    complete: function () {
      $filterBtn.prop('disabled', false).html(btnOriginalHtml)
    }
  })
}

function renderData(data) {
  const totalOrgs = $('.totalOrganizations')
  const totalUsers = $('.totalUsers')
  const totalSubAdmins = $('.totalSubAdmins')
  const activeOrganizations = $('.activeOrganizations')
  if (totalOrgs) totalOrgs.text(data.data.totalOrganizations)
  if (totalUsers) totalUsers.text(data.data.totalUsers)
  if (totalSubAdmins) totalSubAdmins.text(data.data.totalEmployees)
  if (activeOrganizations) activeOrganizations.text(data.data.activeOrganizations)
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

function renderKycTable(data) {
  const tbody = document.getElementById('kycRequestTable')

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">Chưa có đơn hàng</td>
      </tr>
    `
    return
  }

  tbody.innerHTML = data
    .map((kyc) => {
      const statusBadge =
        {
          pending: '<span class="badge bg-warning">Chờ xác minh</span>',
          verified: '<span class="badge bg-success">Đã xác minh</span>',
          rejected: '<span class="badge bg-danger">Từ chối</span>'
        }[kyc.verificationStatus] || '<span class="badge bg-secondary">Không rõ</span>'

      return `
      <tr data-id="${kyc.organizationId}" class="cursor-pointer">
        <td class="p-2"><strong>${kyc.organizationName}</strong></td>
        <td class="p-2">${kyc.fullName}</td>
        <td class="p-2">${kyc.cccd}</td>
        <td class="p-2">${formatDateTime(kyc.kycRequestedAt)}</td>
        <td class="p-2">${statusBadge}</td>
      </tr>
    `
    })
    .join('')
}

let revenueChart = null

function renderRevenueChart(raw) {
  const chartData = {
    labels: raw.map((i) => i._id),
    datasets: [
      {
        data: raw.map((i) => i.total)
      }
    ]
  }

  const ctx = document.getElementById('chartRevenue')

  if (revenueChart) revenueChart.destroy()

  revenueChart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrencyToVnd(ctx.raw)}`
          }
        }
      }
    }
  })
}

let orderStatusChart = null
const ORDER_STATUS_VI = {
  paid: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  cancelled: 'Đã hủy'
}

function renderOrderStatusChart(raw) {
  const chartData = {
    labels: raw.map((i) => ORDER_STATUS_VI[i._id] || i._id),
    datasets: [
      {
        data: raw.map((i) => i.total)
      }
    ]
  }

  const ctx = document.getElementById('chartQuantity')

  if (orderStatusChart) orderStatusChart.destroy()

  orderStatusChart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `${ctx.label}: ${ctx.raw} đơn`
            }
          }
        }
      }
    }
  })
}

// DATE RANGE PICKER
let currentStartDate = moment().startOf('month')
let currentEndDate = moment()

function initDateRangePicker() {
  function cb(start, end) {
    $('#reportrange span').html(start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY'))
    currentStartDate = start
    currentEndDate = end
  }

  $('#reportrange').daterangepicker(
    {
      startDate: currentStartDate,
      endDate: currentEndDate,
      locale: {
        format: 'DD/MM/YYYY',
        separator: ' - ',
        applyLabel: 'Áp dụng',
        cancelLabel: 'Hủy',
        fromLabel: 'Từ',
        toLabel: 'Đến',
        customRangeLabel: 'Tùy chỉnh',
        daysOfWeek: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        monthNames: [
          'Tháng 1',
          'Tháng 2',
          'Tháng 3',
          'Tháng 4',
          'Tháng 5',
          'Tháng 6',
          'Tháng 7',
          'Tháng 8',
          'Tháng 9',
          'Tháng 10',
          'Tháng 11',
          'Tháng 12'
        ],
        firstDay: 1
      },
      ranges: {
        'Hôm nay': [moment(), moment()],
        'Hôm qua': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        '7 ngày qua': [moment().subtract(6, 'days'), moment()],
        '30 ngày qua': [moment().subtract(29, 'days'), moment()],
        'Tháng này': [moment().startOf('month'), moment().endOf('month')],
        'Tháng trước': [
          moment().subtract(1, 'month').startOf('month'),
          moment().subtract(1, 'month').endOf('month')
        ],
        'Quý này': [moment().startOf('quarter'), moment().endOf('quarter')],
        'Quý trước': [
          moment().subtract(1, 'quarter').startOf('quarter'),
          moment().subtract(1, 'quarter').endOf('quarter')
        ]
      }
    },
    cb
  )

  cb(currentStartDate, currentEndDate)

  // Lắng nghe sự kiện apply
  $('#reportrange').on('apply.daterangepicker', function (ev, picker) {
    currentStartDate = picker.startDate
    currentEndDate = picker.endDate
    cb(picker.startDate, picker.endDate)
  })
}
