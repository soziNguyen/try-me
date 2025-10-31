$(function () {
  function loadSummary() {
    const startDate = $('#startDate').val()
    const endDate = $('#endDate').val()

    $.ajax({
      url: '/api/orders/get',
      method: 'GET',
      data: { startDate, endDate },
      success: function (res) {
        console.log(res)

        const summary = res.summary || {}

        $('#summary-total-revenue').text((summary.totalAmount || 0).toLocaleString('vi-VN') + '₫')
        $('#summary-total-orders').text(summary.totalOrders || 0)

        $('#summary-total-items').text(summary.totalItems || 0)
      },
      error: function (err) {
        console.error('Lấy tổng quan nhanh thất bại', err)
      }
    })
  }

  loadSummary()

  $('#filterDateBtn').on('click', function () {
    loadSummary()
  })
})
