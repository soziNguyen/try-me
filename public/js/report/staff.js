$(function () {
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
        },
        opens: 'left',
        drops: 'down'
      },
      cb
    )

    // Hiển thị giá trị ban đầu
    cb(currentStartDate, currentEndDate)

    // Lắng nghe sự kiện apply
    $('#reportrange').on('apply.daterangepicker', function (ev, picker) {
      currentStartDate = picker.startDate
      currentEndDate = picker.endDate
      cb(picker.startDate, picker.endDate)
    })
  }

  function loadReport() {
    const fromDate = currentStartDate.format('YYYY-MM-DD')
    const toDate = currentEndDate.format('YYYY-MM-DD')

    // Disable button và hiển thị loading
    const $btnFilter = $('#btnFilter')
    $btnFilter
      .prop('disabled', true)
      .html('<i class="spinner-border spinner-border-sm me-2"></i>Đang tải...')

    $.get(`/api/users/summary?from=${fromDate}&to=${toDate}`, function (res) {
      if (!res.success) {
        toastr.error(res.message)
        return
      }

      // Tổng quan
      $('#totalOrders').text(res.data.totals.totalOrders)
      $('#totalRevenue').text(res.data.totals.totalRevenue.toLocaleString() + '₫')
      $('#totalAmount').text(res.data.totals.totalAmount.toLocaleString() + '₫')

      // Render bảng nhân viên
      const tbody = $('#staffReportTable tbody')
      tbody.empty()

      // Biến tính tổng
      let sumOrders = 0
      let sumRevenue = 0
      let sumDiscount = 0
      let sumFee = 0
      let sumVat = 0
      let sumNet = 0

      res.data.staffs.forEach((st) => {
        sumOrders += st.totalOrders || 0
        sumRevenue += st.totalRevenue || 0
        sumDiscount += st.totalDiscountAll || 0
        sumFee += st.totalServiceCharge || 0
        sumVat += st.totalVat || 0
        sumNet += st.netRevenue || 0

        tbody.append(`
          <tr>
            <td class="py-3 px-4">${st.name}</td>
            <td class="py-3 px-4 text-center">${st.totalOrders}</td>
            <td class="py-3 px-4 text-end">${st.totalRevenue.toLocaleString()}₫</td>
            <td class="py-3 px-4 text-end">${(st.totalDiscountAll || 0).toLocaleString()}₫</td>
            <td class="py-3 px-4 text-end">${(st.totalServiceCharge || 0).toLocaleString()}₫</td>
            <td class="py-3 px-4 text-end">${(st.totalVat || 0).toLocaleString()}₫</td>
            <td class="py-3 px-4 text-end fw-semibold">${(st.netRevenue || 0).toLocaleString()}₫</td>
            <td class="py-3 px-4 text-end text-muted">${(st.avgOrderValue || 0).toLocaleString()}₫</td>
          </tr>
        `)
      })

      // Tính giá trị trung bình/đơn
      const avgPerOrder = sumOrders > 0 ? Math.round(sumNet / sumOrders) : 0

      // Cập nhật dòng tổng trong footer
      $('#footerTotalOrders').text(sumOrders)
      $('#footerTotalRevenue').text(sumRevenue.toLocaleString() + '₫')
      $('#footerTotalDiscount').text(sumDiscount.toLocaleString() + '₫')
      $('#footerTotalFee').text(sumFee.toLocaleString() + '₫')
      $('#footerTotalVAT').text(sumVat.toLocaleString() + '₫')
      $('#footerNetRevenue').text(sumNet.toLocaleString() + '₫')
      $('#footerAvgPerOrder').text(avgPerOrder.toLocaleString() + '₫')
    })
      .fail(function (err) {
        console.error('Lỗi khi tải báo cáo:', err)
        toastr.error('Không thể tải báo cáo. Vui lòng thử lại!')
      })
      .always(function () {
        // Reset button về trạng thái ban đầu
        $btnFilter.prop('disabled', false).html('<i class="bi bi-funnel me-2"></i>Áp dụng lọc')
      })
  }

  // ==================== SỰ KIỆN ====================
  $('#btnFilter').on('click', function () {
    loadReport()
  })

  // ==================== KHỞI TẠO ====================
  // Khởi tạo Date Range Picker
  initDateRangePicker()

  loadReport()
})
