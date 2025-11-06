$(function () {
  const today = new Date().toISOString().slice(0, 10)
  $('#fromDate').val(today)
  $('#toDate').val(today)

  function loadReport() {
    const fromDate = $('#fromDate').val()
    const toDate = $('#toDate').val()

    $.get(`/api/users/summary?from=${fromDate}&to=${toDate}`, function (res) {
      if (!res.success) return toastr.error(res.message)

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
  }

  $('#btnFilter').on('click', loadReport)

  loadReport() // load ban đầu
})
