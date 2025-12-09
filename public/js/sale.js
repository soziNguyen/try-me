$(function () {
  // Biến DOM
  const $filterBtn = $('#filterDateBtn')
  const $warehouseFilter = $('#warehouseFilter')

  let warehouses = []
  let menuChart = null
  let quantityChart = null

  // DATE RANGE PICKER
  let currentStartDate = moment().subtract(29, 'days')
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

  function loadWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $warehouseFilter.append(html)
      })
      .catch((err) => console.error('Không load được danh sách kho', err))
  }

  // Hàm định dạng tiền tệ
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫'
  }

  const btnOriginalHtml = $filterBtn.html()

  // Hàm load dữ liệu
  function loadSummary() {
    $filterBtn
      .prop('disabled', true)
      .html('<span class="spinner-border spinner-border-sm me-2"></span>Đang tải...')
    const sDate = currentStartDate.format('YYYY-MM-DD')
    const eDate = currentEndDate.format('YYYY-MM-DD')
    const wh = $warehouseFilter.val() || 'all'

    Promise.all([
      $.get('/api/orders/get', { startDate: sDate, endDate: eDate, warehouse: wh }),
      $.get('/api/orders/getTopItems', {
        startDate: sDate,
        endDate: eDate,
        warehouse: wh,
        returnAll: 'true'
      })
    ])
      .then(([summaryRes, allItemsRes]) => {
        const summary = summaryRes.summary || {}
        $('#summary-total-revenue').text(formatCurrency(summary.totalAmount))
        $('#summary-total-orders').text(summary.totalOrders || 0)
        $('#summary-total-items').text(summary.totalItems || 0)
        $('#summary-total-combos').text(summary.totalCombos || 0)

        // Vẽ biểu đồ với tất cả dữ liệu
        const allItems = allItemsRes.data || []

        requestAnimationFrame(() => {
          setTimeout(() => {
            renderMenuChart(allItems)
            renderQuantityChart(allItems)
            $filterBtn.prop('disabled', false).html(btnOriginalHtml)
          }, 150)
        })
      })
      .catch((err) => {
        console.error('Lấy dữ liệu thất bại', err)
      })
  }

  // Hàm tạo màu dựa trên tên sản phẩm
  function getColorForProduct(productName, allProducts) {
    const index = allProducts.indexOf(productName)
    const hue = (index * 360) / allProducts.length
    return `hsla(${hue}, 70%, 60%, 0.8)`
  }

  // Hàm vẽ biểu đồ tròn doanh thu
  function renderMenuChart(items) {
    if (menuChart) {
      menuChart.destroy()
      menuChart = null
    }

    if (!items || items.length === 0) return

    const canvas = document.getElementById('chartMenu')
    if (!canvas) return

    const parent = canvas.parentElement

    // SET SIZE CỐ ĐỊNH
    const width = parent.offsetWidth
    const height = parent.offsetHeight
    canvas.width = width
    canvas.height = height
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const labels = items.map((item) => item.product.name)
    const revenues = items.map((item) => item.totalRevenue)

    const ctx = canvas.getContext('2d')
    const allProductNames = items.map((item) => item.product.name)
    const colors = labels.map((name) => getColorForProduct(name, allProductNames))

    menuChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: revenues,
            backgroundColor: colors,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: 'easeOutQuart',
          delay: (context) => {
            return context.dataIndex * 50
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Doanh thu: ${formatCurrency(context.parsed)}`
              }
            }
          }
        }
      }
    })
  }

  // Hàm vẽ biểu đồ cột số lượng
  function renderQuantityChart(items) {
    if (quantityChart) {
      quantityChart.destroy()
      quantityChart = null
    }

    if (!items || items.length === 0) return

    const canvas = document.getElementById('chartQuantity')
    if (!canvas) return

    const parent = canvas.parentElement

    const width = parent.offsetWidth
    const height = parent.offsetHeight
    canvas.width = width
    canvas.height = height
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const sortedItems = [...items].sort((a, b) => b.quantitySold - a.quantitySold)

    const labels = sortedItems.map((item) => item.product.name)
    const quantities = sortedItems.map((item) => item.quantitySold)

    const ctx = canvas.getContext('2d')

    const allProductNames = items.map((item) => item.product.name)
    const colors = labels.map((name) => getColorForProduct(name, allProductNames))

    quantityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Số lượng đã bán',
            data: quantities,
            backgroundColor: colors,
            borderColor: colors.map((color) => color.replace('0.8', '1')),
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        indexAxis: 'y',
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart',
          delay: (context) => {
            return context.dataIndex * 50
          },
          x: {
            type: 'number',
            easing: 'easeOutElastic',
            duration: 1500,
            from: 0
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Số lượng: ${context.parsed.x} món`
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    })
  }

  // Sự kiện
  $filterBtn.on('click', function () {
    loadSummary()
  })

  $warehouseFilter.on('change', function () {
    loadSummary()
  })

  // Khởi chạy
  initDateRangePicker()

  loadWarehouses().then(() => {
    loadSummary()
  })
})
