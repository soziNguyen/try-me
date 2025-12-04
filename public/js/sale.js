$(function () {
  // --- Biến DOM ---
  const $reportType = $('#reportType')
  const $quarterGroup = $('#quarterGroup')
  const $quarterSelect = $('#quarterSelect')
  const $monthGroup = $('#monthGroup')
  const $monthSelect = $('#monthSelect')
  const $startDate = $('#startDate')
  const $endDate = $('#endDate')
  const $filterBtn = $('#filterDateBtn')

  let warehouses = []
  let menuChart = null
  let quantityChart = null

  function loadWarehouses() {
    return fetchData('inventory/warehouse/all')
      .then((res) => {
        warehouses = res || []
        const html = warehouses.map((w) => `<option value="${w._id}">${w.name}</option>`).join('')
        $('#warehouseFilter').append(html)
      })
      .catch((err) => console.error('Không load được danh sách kho', err))
  }

  // --- Hàm định dạng tiền tệ ---
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫'
  }

  // --- Hàm format ngày YYYY-MM-DD ---
  function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // --- Hàm set ngày theo bộ lọc ---
  function setDateInputs(type, value) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate
    const currentWarehouse = $('#warehouseFilter').val() || 'all'

    if (type === 'all') {
      $monthGroup.hide()
      $quarterGroup.hide()
      $startDate.val('')
      $endDate.val('')
      loadSummary(null, null, currentWarehouse)
      return
    }

    if (type === 'month') {
      $monthGroup.show()
      $quarterGroup.hide()
      const month = value ? value - 1 : today.getMonth()
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0)
      $monthSelect.val(month + 1)
    } else if (type === 'quarter') {
      $monthGroup.hide()
      $quarterGroup.show()
      const q = value || Math.floor(today.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, endMonth + 1, 0)
      $quarterSelect.val(q)
    } else if (type === 'custom') {
      $monthGroup.hide()
      $quarterGroup.hide()
      if ($startDate.val() && $endDate.val()) {
        loadSummary($startDate.val(), $endDate.val(), currentWarehouse)
      }
      return
    }

    $startDate.val(formatDate(startDate))
    $endDate.val(formatDate(endDate))
    loadSummary(formatDate(startDate), formatDate(endDate), currentWarehouse)
  }

  // --- Hàm load dữ liệu ---
  function loadSummary(startDate, endDate, warehouse) {
    const sDate = startDate !== undefined ? startDate : $startDate.val() || null
    const eDate = endDate !== undefined ? endDate : $endDate.val() || null
    const wh = warehouse !== undefined ? warehouse : $('#warehouseFilter').val() || 'all'

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
        renderMenuChart(allItems)
        renderQuantityChart(allItems)
      })
      .catch((err) => {
        console.error('Lấy dữ liệu thất bại', err)
      })
  }

  // --- Hàm tạo màu dựa trên tên sản phẩm (để đồng bộ màu) ---
  function getColorForProduct(productName, allProducts) {
    const index = allProducts.indexOf(productName)
    const hue = (index * 360) / allProducts.length
    return `hsla(${hue}, 70%, 60%, 0.8)`
  }

  // --- Hàm vẽ biểu đồ tròn doanh thu ---
  function renderMenuChart(items) {
    if (menuChart) {
      menuChart.destroy()
    }

    if (!items || items.length === 0) return

    const labels = items.map((item) => item.product.name)
    const revenues = items.map((item) => item.totalRevenue)

    const ctx = document.getElementById('chartMenu').getContext('2d')

    const colors = labels.map((name) => getColorForProduct(name, labels))

    menuChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Doanh thu (đ)',
            data: revenues,
            backgroundColor: colors,
            borderWidth: 2
          }
        ]
      },
      responsive: true,
      options: {
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeInOutQuart',
          delay: (context) => {
            return context.dataIndex * 100
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            align: 'center'
          }
        }
      }
    })
  }

  // --- Hàm vẽ biểu đồ cột số lượng ---
  function renderQuantityChart(items) {
    if (quantityChart) {
      quantityChart.destroy()
    }

    if (!items || items.length === 0) return

    // Sắp xếp theo số lượng giảm dần
    const sortedItems = [...items].sort((a, b) => b.quantitySold - a.quantitySold)

    const labels = sortedItems.map((item) => item.product.name)
    const quantities = sortedItems.map((item) => item.quantitySold)

    const ctx = document.getElementById('chartQuantity').getContext('2d')

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
        indexAxis: 'y',
        animation: {
          duration: 1000,
          easing: 'easeInOutBack',
          delay: (context) => {
            return context.dataIndex * 100
          },
          x: {
            type: 'number',
            easing: 'easeOutElastic',
            duration: 2800,
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

  // --- Sự kiện ---
  $reportType.on('change', function () {
    setDateInputs($(this).val(), null)
  })

  $monthSelect.on('change', function () {
    setDateInputs('month', parseInt($(this).val()))
  })

  $quarterSelect.on('change', function () {
    setDateInputs('quarter', parseInt($(this).val()))
  })

  $filterBtn.on('click', function () {
    const start = $startDate.val()
    const end = $endDate.val()
    if (start && end && new Date(end) < new Date(start)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu')
      return
    }
    loadSummary(start, end)
  })
  $('#warehouseFilter').on('change', function () {
    loadSummary($startDate.val(), $endDate.val(), $(this).val())
  })

  // --- Khởi chạy ---
  loadWarehouses().then(() => {
    // Có thể load báo cáo mặc định ngay sau khi danh sách kho có sẵn
    // loadSummary($startDate.val(), $endDate.val(), $('#warehouseFilter').val())
  })
  // --- Khởi chạy mặc định ---
  $monthGroup.hide()
  $quarterGroup.hide()
  $reportType.val('all')
  setDateInputs('all')
})
