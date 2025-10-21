$(function () {
  const planId = window.location.pathname.split('/').pop()
  // ========= Lấy chi tiết gói ==========
  $.getJSON(`/api/admin/plan/${planId}`, (data) => {
    if (data.success) {
      const plan = data.data
      $('#planId').val(plan._id)
      $('#code').val(plan.code)
      $('#name').val(plan.name)
      $('#monthlyPrice').val(plan.priceMonth)
      $('#annualPrice').val(plan.priceYear)
      $('#originalPrice').val(plan.originalPrice)
      $('#warehouseLimit').val(plan.warehouseLimit)
      $('#staffLimit').val(plan.staffLimit)
      $('#description').val(plan.description)
      $('#isActive').prop('checked', plan.isActive)
    } else {
      toastr.error(data.message || 'Lấy thông tin gói thất bại!')
    }
  })

  // ========= Lưu gói ==========
  $('#planForm').on('submit', async (e) => {
    e.preventDefault()
    const id = $('#planId').val()
    const payload = {
      code: $('#code').val(),
      name: $('#name').val(),
      priceMonth: +$('#monthlyPrice').val(),
      priceYear: +$('#annualPrice').val(),
      originalPrice: +$('#originalPrice').val(),
      warehouseLimit: $('#warehouseLimit').val() || null,
      staffLimit: $('#staffLimit').val() || null,
      description: $('#description').val(),
      isActive: $('#isActive').is(':checked')
    }

    const res = await ajax(`/api/admin/plan/update/${id}`, payload, 'PUT')
    if (res) {
      toastr.remove()
      toastr.success('Lưu gói thành công!')
      table.ajax.reload(null, false)
    }
  })
})
